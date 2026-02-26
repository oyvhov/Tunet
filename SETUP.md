# Tunet Dashboard — Setup Guide

> See also [README.md](README.md) for features and screenshots.

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20+ |
| npm | 9+ |
| Docker (optional) | 20+ |
| Home Assistant | Recent (2023.8+) |

## Project Structure

```
tunet/
├── src/
│   ├── App.jsx              # Main dashboard component
│   ├── main.jsx             # React entry point
│   ├── components/          # cards/, charts/, effects/, pages/, sidebars/, ui/
│   ├── modals/              # All dialog modals
│   ├── contexts/            # React contexts (Config, HA, Pages)
│   ├── hooks/               # Custom hooks (profiles, theme, energy, etc.)
│   ├── services/            # HA WebSocket client, profile API, snapshots
│   ├── rendering/           # Card renderer dispatch + ModalOrchestrator
│   ├── i18n/                # Translations (en, nb, nn, sv, de)
│   ├── layouts/             # Header, StatusBar, EditToolbar, overlays
│   ├── config/              # Constants, defaults, themes, onboarding
│   ├── icons/               # Icon barrel exports + iconMap
│   ├── utils/               # Formatting, grid layout, drag-and-drop, units
│   └── styles/              # CSS (index, dashboard, animations)
├── server/
│   ├── index.js             # Express server (API + static files)
│   ├── db.js                # SQLite setup (profiles table)
│   └── routes/              # profiles/, icons/ APIs
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose config
└── vite.config.js           # Vite + dev proxy config
```

## Local Development

```bash
npm install

# Start frontend + backend together (Vite + Express)
npm run dev:all

# Or run separately
npm run dev          # Vite frontend on :5173 (proxies /api to :3002)
npm run dev:server   # Express backend on :3002

# Quality gates
npm test             # Vitest unit tests
npm run lint         # ESLint
```

## Docker

### Docker Compose (recommended)

```bash
docker compose up -d
```

Access at `http://localhost:3002`. Profile data is persisted in a Docker volume (`tunet-data`).

Verify:

```bash
docker logs tunet-dashboard
# expect: Tunet backend running on port 3002

curl http://localhost:3002/api/health
# expect: {"status":"ok",...}
```

### Docker directly

```bash
docker build -t tunet-dashboard .
docker run -d -p 3002:3002 -v tunet-data:/app/data --name tunet-dashboard tunet-dashboard
```

### Useful commands

```bash
docker logs tunet-dashboard       # View logs
docker stop tunet-dashboard       # Stop
docker start tunet-dashboard      # Start
docker rm tunet-dashboard         # Remove container
```

## Configuration

1. Open the dashboard in your browser (defaults to `http://localhost:5173` in dev, `http://localhost:3002` in Docker).
2. Click the **gear icon** to open System settings.
3. Choose **OAuth2** (recommended) or **Token** authentication.
4. Enter your Home Assistant URL without `/api` (e.g. `https://homeassistant.local:8123`).
5. Token mode: paste a long-lived access token (HA → Profile → Security).
6. Optional: set a fallback URL for token mode if you expose HA internally/externally.

Where data lives:
- Dashboard/layout/theme/language: browser `localStorage` (`tunet_*` keys) by default; can also be saved/restored via Profiles (server-side) per HA user.
- HA credentials: `ha_url`, `ha_token` (or OAuth tokens) stored locally.
- Profiles: server-side SQLite (`server/db.js`, default `data/` dir).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3002` | Backend server port |
| `DATA_DIR` | `/app/data` | SQLite database directory |
| `NODE_ENV` | `production` | Environment mode |
| `VITE_PORT` | `5173` | Vite dev server port (dev only) |
| `VITE_PROXY_TARGET` | `http://localhost:3002` | API proxy target (dev) |
| `TUNET_ENCRYPTION_MODE` | `off` | Data-at-rest mode for server snapshots/profiles: `off`, `dual`, `enc_only` |
| `TUNET_DATA_KEY` | _(unset)_ | Secret used for encryption when mode is `dual` or `enc_only` |

### Data-at-rest encryption rollout (safe migration)

- `off`: legacy behavior (plaintext DB storage only).
- `dual`: writes plaintext + encrypted data, reads encrypted first then falls back to plaintext.
- `enc_only`: keeps encrypted-first reads and still falls back to plaintext for compatibility during migration.

Recommended rollout to avoid data loss:
1. Set `TUNET_ENCRYPTION_MODE=dual` with a strong `TUNET_DATA_KEY`.
2. Keep `dual` for at least one full release cycle.
3. Move to `enc_only` only after confirming all rows/devices are migrated.

## Troubleshooting

| Problem | Solution |
|---|---|
| Port in use | Change the port mapping in `docker-compose.yml` |
| Build fails | Ensure Docker has enough memory. Try `docker system prune -a` then rebuild |
| Native module error | The Dockerfile installs build tools automatically. If building locally, ensure `python3`, `make`, and `g++` are available |
| Connection error | Check HA URL (no trailing `/api`) and token. For external origins ensure HA `cors_allowed_origins` includes your host |
| Profiles not saving | Check that the backend is running (`/api/health`) |
| History/CORS issues | Prefer WebSocket history; otherwise allow your origin in HA `cors_allowed_origins` |

## Release Workflow (Maintainers)

1. Prepare synchronized versions/changelogs:

```bash
npm run release:prep -- --version 1.0.0-beta.18
```

2. Validate metadata consistency:

```bash
npm run release:check
```

3. Run full release sanity checks:

```bash
npm run release
```

The `release:check` step is also enforced in CI on `main` PRs/pushes.

