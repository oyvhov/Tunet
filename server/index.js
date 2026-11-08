import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import profilesRouter from './routes/profiles.js';
import iconsRouter from './routes/icons.js';
import settingsRouter from './routes/settings.js';
import { createHomeAssistantAuthMiddleware } from './haAuth.js';
import db, { startBackupSchedule } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3002', 10);
// Must stay under the 10 s docker stop waits before it sends SIGKILL.
const SHUTDOWN_TIMEOUT_MS = 5_000;

const resolveAppVersion = () => {
  const packageJsonPath = join(__dirname, '..', 'package.json');

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return pkg?.version || 'unknown';
  } catch {
    return 'unknown';
  }
};

export const createApp = ({
  appVersion = resolveAppVersion(),
  distPath = join(__dirname, '..', 'dist'),
  isProduction = process.env.NODE_ENV === 'production',
  database = db,
} = {}) => {
  const app = express();
  const homeAssistantAuth = createHomeAssistantAuthMiddleware();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.removeHeader('X-Powered-By');

    // --- Content-Security-Policy ---
    // Restricts which origins can load scripts, styles, images, etc.
    // "self" = same origin only; external CDNs are explicitly allowed.
    const csp = [
      "default-src 'self'",
      // Scripts: own bundle only (inline for Vite dev handled by nonce/hash in dev mode)
      "script-src 'self'",
      // Styles: own + Google Fonts + inline (Tailwind / dynamic styles)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: own + Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",
      // Images: own, HA instance (any origin – URL is user-configured), weather icons, media logos, map tiles, data/blob URIs
      "img-src 'self' data: blob: http: https: https://cdn.jsdelivr.net https://cdn.simpleicons.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org",
      // WebSocket connections to the user's HA instance (any origin, since URL is user-configured)
      "connect-src 'self' ws: wss: http: https:",
      // Leaflet map iframe
      'frame-src https://www.openstreetmap.org',
      // Block all object/embed/plugin
      "object-src 'none'",
      // Restrict base-uri to prevent base tag injection
      "base-uri 'self'",
      // Only allow forms to submit to same origin
      "form-action 'self'",
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
    next();
  });

  // Parse JSON bodies
  app.use(express.json({ limit: '2mb' }));

  const apiRateLimiter = rateLimit({
    windowMs: Math.max(Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60_000, 1_000),
    max: Math.max(Number(process.env.API_RATE_LIMIT_MAX) || 300, 10),
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', apiRateLimiter);

  // Ingress support — strip X-Ingress-Path prefix from request URL
  app.use((req, _res, next) => {
    const ingressPath = req.headers['x-ingress-path'];
    if (typeof ingressPath === 'string' && ingressPath && req.url.startsWith(ingressPath)) {
      req.url = req.url.slice(ingressPath.length) || '/';
    }
    next();
  });

  // API routes
  app.use('/api/profiles', homeAssistantAuth, profilesRouter);
  app.use('/api/icons', iconsRouter);
  app.use('/api/settings', homeAssistantAuth, settingsRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    try {
      database.prepare('SELECT 1').get();
      res.json({ status: 'ok', version: appVersion });
    } catch (error) {
      console.error('[server] Health check failed:', error);
      res.status(503).json({ status: 'error', version: appVersion });
    }
  });

  // Serve static frontend files in production
  if (isProduction) {
    if (existsSync(distPath)) {
      const assetsPath = join(distPath, 'assets');
      const indexHtmlPath = join(distPath, 'index.html');
      const indexHtml = existsSync(indexHtmlPath) ? readFileSync(indexHtmlPath, 'utf8') : null;

      /** @param {import('express').Response} res */
      const setNoCacheHeaders = (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      };

      /** @param {import('express').Response} res */
      const sendSpaIndex = (res) => {
        setNoCacheHeaders(res);
        if (indexHtml !== null) {
          return res.type('html').send(indexHtml);
        }
        return res.status(503).send('Frontend unavailable');
      };

      app.use(
        '/assets',
        express.static(assetsPath, {
          fallthrough: true,
          immutable: true,
          maxAge: '1y',
        })
      );

      app.use(
        express.static(distPath, {
          index: false,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
              setNoCacheHeaders(res);
            }
            if (filePath.endsWith('sw.js')) {
              setNoCacheHeaders(res);
              res.setHeader('Service-Worker-Allowed', '/');
            }
          },
        })
      );

      app.get('/index.html', (_req, res) => {
        sendSpaIndex(res);
      });

      // SPA fallback — serve index.html for all non-API routes
      app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        if (req.path.includes('.')) {
          return next();
        }
        sendSpaIndex(res);
      });
    } else {
      console.warn('[server] dist/ folder not found. Only API routes will be available.');
    }
  }

  return app;
};

/**
 * Stops the server cleanly on SIGTERM and SIGINT. Node as PID 1 ignores these without a handler,
 * which is why docker stop otherwise waits and SIGKILLs a database that was never closed.
 * @param {object} options
 * @param {import('http').Server} options.server
 * @param {Pick<import('better-sqlite3').Database, 'close'>} options.database
 * @param {() => void} options.stopBackups
 * @param {number} [options.timeoutMs]
 * @param {(code: number) => void} [options.exit]
 * @param {Pick<NodeJS.EventEmitter, 'on'>} [options.signalSource]
 */
export const installShutdownHandlers = ({
  server,
  database,
  stopBackups,
  timeoutMs = SHUTDOWN_TIMEOUT_MS,
  exit = process.exit,
  signalSource = process,
}) => {
  let stopping = false;
  let finished = false;

  /** @param {number} code */
  const finish = (code) => {
    if (finished) return;
    finished = true;
    try {
      database.close();
      exit(code);
    } catch (error) {
      console.error('[server] Closing the database failed:', error);
      exit(1);
    }
  };

  /** @param {string} signal */
  const shutdown = (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[server] ${signal} received, shutting down`);
    stopBackups();

    const forceTimer = setTimeout(() => {
      console.warn(`[server] Connections still open after ${timeoutMs} ms, closing them`);
      server.closeAllConnections();
      finish(1);
    }, timeoutMs);

    // server.close() only drops connections idle right now; one finishing a request stays keep-alive.
    const idleSweep = setInterval(() => server.closeIdleConnections(), 100);

    server.close((error) => {
      clearInterval(idleSweep);
      clearTimeout(forceTimer);
      finish(error ? 1 : 0);
    });
  };

  for (const signal of ['SIGTERM', 'SIGINT']) {
    signalSource.on(signal, () => shutdown(signal));
  }
};

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
const app = createApp();

if (isMainModule) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[server] Tunet backend running on port ${PORT} (${process.env.NODE_ENV === 'production' ? 'production' : 'development'})`
    );
  });
  installShutdownHandlers({ server, database: db, stopBackups: startBackupSchedule() });
}

export default app;
