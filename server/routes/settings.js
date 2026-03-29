import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import {
  encryptDataText,
  getEncryptedOnlyPlaintextStub,
  isDataEncryptionEnabled,
  isEncryptionWriteRequired,
  resolveStoredDataText,
  shouldPersistPlaintextData,
} from '../utils/dataCrypto.js';

const router = Router();
const HISTORY_KEEP_LIMIT = Math.min(
  Math.max(Number(process.env.SETTINGS_HISTORY_KEEP_LIMIT) || 50, 5),
  500
);
const warnedWriteFailures = new Set();

const settingsRateLimiter = rateLimit({
  windowMs: Math.max(Number(process.env.SETTINGS_RATE_LIMIT_WINDOW_MS) || 60_000, 1_000),
  max: Math.max(Number(process.env.SETTINGS_RATE_LIMIT_MAX) || 180, 10),
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(settingsRateLimiter);

const safeParseJson = (raw, fallback = null) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const hasUsableBaseRevision = (value) => Number.isFinite(Number(value));

const ensureRequestUser = (req, res) => {
  const requestUserId = req.authenticatedHaUser?.id;
  if (!requestUserId) {
    res.status(401).json({ error: 'Missing authenticated Home Assistant user' });
    return null;
  }
  return requestUserId;
};

const resolveKeepLimit = (rawLimit) => {
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) return HISTORY_KEEP_LIMIT;
  return Math.min(Math.max(Math.trunc(parsed), 5), 500);
};

const normalizeDeviceLabel = (value) => {
  if (typeof value !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const trimmed = value.replace(/[\x00-\x1f\x7f]/g, '').trim();
  return trimmed ? trimmed.slice(0, 120) : null;
};

const parseStoredData = (row, context) => {
  const resolvedText = resolveStoredDataText({
    plainText: row?.data,
    encryptedText: row?.data_enc,
    context,
  });
  return safeParseJson(resolvedText, {});
};

const warnEncryptionWriteFailure = (context) => {
  if (!isDataEncryptionEnabled()) return;
  if (warnedWriteFailures.has(context)) return;
  warnedWriteFailures.add(context);
  console.warn(`[settings] Failed to produce encrypted payload in ${context}.`);
};

const pruneHistory = (database, haUserId, deviceId, keepLimitRaw) => {
  const keepLimit = resolveKeepLimit(keepLimitRaw);
  database
    .prepare(
    `DELETE FROM current_settings_history
     WHERE ha_user_id = ?
       AND device_id = ?
       AND revision NOT IN (
         SELECT revision FROM current_settings_history
         WHERE ha_user_id = ? AND device_id = ?
         ORDER BY revision DESC
         LIMIT ?
       )`
    )
    .run(haUserId, deviceId, haUserId, deviceId, keepLimit);
};

export const writeCurrentSettingsSnapshot = ({
  database = db,
  haUserId,
  deviceId,
  data,
  baseRevision,
  historyKeepLimit,
  deviceLabel,
  now = new Date().toISOString(),
}) => {
  const payload = JSON.stringify(data);
  const encryptedPayload = encryptDataText(payload);
  if (encryptedPayload === null) {
    warnEncryptionWriteFailure('put-current');
    if (isEncryptionWriteRequired()) {
      return {
        ok: false,
        status: 503,
        error: 'Encryption is required but unavailable',
      };
    }
  }

  const plainPayload = shouldPersistPlaintextData() ? payload : getEncryptedOnlyPlaintextStub();
  const requestedLabel = deviceLabel === undefined ? undefined : normalizeDeviceLabel(deviceLabel);

  const writeTransaction = database.transaction(() => {
    const existing = database
      .prepare(
        `SELECT revision, device_label FROM current_settings
         WHERE ha_user_id = ? AND device_id = ?`
      )
      .get(haUserId, deviceId);

    if (!existing) {
      database
        .prepare(
          `INSERT INTO current_settings (ha_user_id, device_id, device_label, data, data_enc, revision, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?)`
        )
        .run(haUserId, deviceId, requestedLabel ?? null, plainPayload, encryptedPayload, now);

      database
        .prepare(
          `INSERT OR REPLACE INTO current_settings_history (ha_user_id, device_id, revision, data, data_enc, updated_at)
           VALUES (?, ?, 1, ?, ?, ?)`
        )
        .run(haUserId, deviceId, plainPayload, encryptedPayload, now);

      pruneHistory(database, haUserId, deviceId, historyKeepLimit);

      return {
        ok: true,
        revision: 1,
        updated_at: now,
      };
    }

    if (!hasUsableBaseRevision(baseRevision)) {
      return {
        ok: false,
        status: 409,
        error: 'Revision conflict',
        revision: Number(existing.revision),
      };
    }

    const expectedRevision = Number(baseRevision);
    if (expectedRevision !== Number(existing.revision)) {
      return {
        ok: false,
        status: 409,
        error: 'Revision conflict',
        revision: Number(existing.revision),
      };
    }

    const nextRevision = Number(existing.revision) + 1;
    const resolvedLabel =
      deviceLabel === undefined ? existing.device_label || null : (requestedLabel ?? null);
    const updateInfo = database
      .prepare(
        `UPDATE current_settings
         SET data = ?, data_enc = ?, device_label = ?, revision = ?, updated_at = ?
         WHERE ha_user_id = ? AND device_id = ? AND revision = ?`
      )
      .run(
        plainPayload,
        encryptedPayload,
        resolvedLabel,
        nextRevision,
        now,
        haUserId,
        deviceId,
        expectedRevision
      );

    if (!Number(updateInfo?.changes || 0)) {
      const latest = database
        .prepare(
          `SELECT revision FROM current_settings
           WHERE ha_user_id = ? AND device_id = ?`
        )
        .get(haUserId, deviceId);

      return {
        ok: false,
        status: 409,
        error: 'Revision conflict',
        revision: Number(latest?.revision ?? existing.revision),
      };
    }

    database
      .prepare(
        `INSERT OR REPLACE INTO current_settings_history (ha_user_id, device_id, revision, data, data_enc, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(haUserId, deviceId, nextRevision, plainPayload, encryptedPayload, now);

    pruneHistory(database, haUserId, deviceId, historyKeepLimit);

    return {
      ok: true,
      revision: nextRevision,
      updated_at: now,
    };
  });

  return writeTransaction();
};

router.get('/current', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id, device_id, revision } = req.query;
  if (!ha_user_id || !device_id) {
    return res
      .status(400)
      .json({ error: 'ha_user_id and device_id query parameters are required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const row = revision
    ? db
        .prepare(
          `SELECT ha_user_id, device_id, data, data_enc, revision, updated_at, NULL AS device_label
       FROM current_settings_history
       WHERE ha_user_id = ? AND device_id = ? AND revision = ?`
        )
        .get(ha_user_id, device_id, Number(revision))
    : db
        .prepare(
          `SELECT ha_user_id, device_id, data, data_enc, revision, updated_at, device_label
       FROM current_settings
       WHERE ha_user_id = ? AND device_id = ?`
        )
        .get(ha_user_id, device_id);

  if (!row) return res.json(null);
  return res.json({
    ha_user_id: row.ha_user_id,
    device_id: row.device_id,
    data: parseStoredData(
      row,
      `settings/current:${ha_user_id}:${device_id}:${revision || 'latest'}`
    ),
    revision: row.revision,
    device_label: row.device_label || null,
    updated_at: row.updated_at,
  });
});

router.get('/history', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id, device_id, limit } = req.query;
  if (!ha_user_id || !device_id) {
    return res
      .status(400)
      .json({ error: 'ha_user_id and device_id query parameters are required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const rows = db
    .prepare(
      `SELECT revision, updated_at
     FROM current_settings_history
     WHERE ha_user_id = ? AND device_id = ?
     ORDER BY revision DESC
     LIMIT ?`
    )
    .all(ha_user_id, device_id, parsedLimit);

  return res.json(rows);
});

router.delete('/history', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id, device_id, keep_latest } = req.query;
  if (!ha_user_id || !device_id) {
    return res
      .status(400)
      .json({ error: 'ha_user_id and device_id query parameters are required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const keepLatest = keep_latest === undefined ? true : String(keep_latest) !== '0';

  if (keepLatest) {
    const latest = db
      .prepare(
        `SELECT revision
       FROM current_settings
       WHERE ha_user_id = ? AND device_id = ?`
      )
      .get(ha_user_id, device_id);

    if (!latest || !Number.isFinite(Number(latest.revision))) {
      const info = db
        .prepare(
          `DELETE FROM current_settings_history
         WHERE ha_user_id = ? AND device_id = ?`
        )
        .run(ha_user_id, device_id);
      return res.json({ success: true, deleted: Number(info?.changes || 0) });
    }

    const info = db
      .prepare(
        `DELETE FROM current_settings_history
       WHERE ha_user_id = ? AND device_id = ? AND revision != ?`
      )
      .run(ha_user_id, device_id, Number(latest.revision));

    return res.json({
      success: true,
      deleted: Number(info?.changes || 0),
      kept_revision: Number(latest.revision),
    });
  }

  const info = db
    .prepare(
      `DELETE FROM current_settings_history
     WHERE ha_user_id = ? AND device_id = ?`
    )
    .run(ha_user_id, device_id);

  return res.json({ success: true, deleted: Number(info?.changes || 0) });
});

router.get('/devices', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id } = req.query;
  if (!ha_user_id) {
    return res.status(400).json({ error: 'ha_user_id query parameter is required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const rows = db
    .prepare(
      `SELECT device_id, device_label, revision, updated_at
     FROM current_settings
     WHERE ha_user_id = ?
     ORDER BY updated_at DESC`
    )
    .all(ha_user_id);

  res.json(rows);
});

router.delete('/devices', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id, device_id } = req.query;
  if (!ha_user_id || !device_id) {
    return res
      .status(400)
      .json({ error: 'ha_user_id and device_id query parameters are required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const settingsDelete = db
    .prepare(
      `DELETE FROM current_settings
     WHERE ha_user_id = ? AND device_id = ?`
    )
    .run(ha_user_id, device_id);

  const historyDelete = db
    .prepare(
      `DELETE FROM current_settings_history
     WHERE ha_user_id = ? AND device_id = ?`
    )
    .run(ha_user_id, device_id);

  return res.json({
    success: true,
    deleted_current: Number(settingsDelete?.changes || 0),
    deleted_history: Number(historyDelete?.changes || 0),
  });
});

router.put('/devices/label', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id, device_id, device_label } = req.body;
  if (!ha_user_id || !device_id) {
    return res.status(400).json({ error: 'ha_user_id and device_id are required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const normalizedLabel = normalizeDeviceLabel(device_label);
  const info = db
    .prepare(
      `UPDATE current_settings
     SET device_label = ?, updated_at = datetime('now')
     WHERE ha_user_id = ? AND device_id = ?`
    )
    .run(normalizedLabel, ha_user_id, device_id);

  if (!Number(info?.changes || 0)) {
    return res.status(404).json({ error: 'Device not found' });
  }

  return res.json({
    success: true,
    ha_user_id,
    device_id,
    device_label: normalizedLabel,
  });
});

router.put('/current', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id, device_id, data, base_revision, history_keep_limit, device_label } = req.body;
  if (!ha_user_id || !device_id || !data) {
    return res.status(400).json({ error: 'ha_user_id, device_id and data are required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const result = writeCurrentSettingsSnapshot({
    database: db,
    haUserId: ha_user_id,
    deviceId: device_id,
    data,
    baseRevision: base_revision,
    historyKeepLimit: history_keep_limit,
    deviceLabel: device_label,
  });

  if (!result.ok) {
    return res.status(result.status).json({
      error: result.error,
      ...(Number.isFinite(Number(result.revision)) ? { revision: Number(result.revision) } : {}),
    });
  }

  return res.json({
    ha_user_id,
    device_id,
    revision: result.revision,
    updated_at: result.updated_at,
  });
});

router.post('/publish', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id, source_device_id, target_device_id, history_keep_limit } = req.body;
  if (!ha_user_id || !source_device_id) {
    return res.status(400).json({ error: 'ha_user_id and source_device_id are required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const source = db
    .prepare(
      `SELECT data, data_enc FROM current_settings
     WHERE ha_user_id = ? AND device_id = ?`
    )
    .get(ha_user_id, source_device_id);

  if (!source) {
    return res.status(404).json({ error: 'Source device config not found' });
  }

  const sourcePayload = resolveStoredDataText({
    plainText: source.data,
    encryptedText: source.data_enc,
    context: `settings/publish-source:${ha_user_id}:${source_device_id}`,
  });
  if (!sourcePayload) {
    return res.status(500).json({ error: 'Source device config is unreadable' });
  }
  const sourceEncryptedPayload = encryptDataText(sourcePayload);
  if (sourceEncryptedPayload === null) {
    warnEncryptionWriteFailure('publish:source');
    if (isEncryptionWriteRequired()) {
      return res.status(503).json({ error: 'Encryption is required but unavailable' });
    }
  }
  const sourcePlainPayload = shouldPersistPlaintextData()
    ? sourcePayload
    : getEncryptedOnlyPlaintextStub();

  const now = new Date().toISOString();

  const upsertTarget = (deviceId) => {
    const existing = db
      .prepare(
        `SELECT revision FROM current_settings
       WHERE ha_user_id = ? AND device_id = ?`
      )
      .get(ha_user_id, deviceId);

    if (!existing) {
      db.prepare(
        `INSERT INTO current_settings (ha_user_id, device_id, data, data_enc, revision, updated_at)
         VALUES (?, ?, ?, ?, 1, ?)`
      ).run(ha_user_id, deviceId, sourcePlainPayload, sourceEncryptedPayload, now);

      db.prepare(
        `INSERT OR REPLACE INTO current_settings_history (ha_user_id, device_id, revision, data, data_enc, updated_at)
         VALUES (?, ?, 1, ?, ?, ?)`
      ).run(ha_user_id, deviceId, sourcePlainPayload, sourceEncryptedPayload, now);
      pruneHistory(db, ha_user_id, deviceId, history_keep_limit);
      return 1;
    }

    const nextRevision = Number(existing.revision) + 1;
    db.prepare(
      `UPDATE current_settings
       SET data = ?, data_enc = ?, revision = ?, updated_at = ?
       WHERE ha_user_id = ? AND device_id = ?`
    ).run(sourcePlainPayload, sourceEncryptedPayload, nextRevision, now, ha_user_id, deviceId);

    db.prepare(
      `INSERT OR REPLACE INTO current_settings_history (ha_user_id, device_id, revision, data, data_enc, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(ha_user_id, deviceId, nextRevision, sourcePlainPayload, sourceEncryptedPayload, now);
    pruneHistory(db, ha_user_id, deviceId, history_keep_limit);
    return 1;
  };

  const targetIds = target_device_id
    ? [target_device_id]
    : db
        .prepare(
          `SELECT device_id FROM current_settings
         WHERE ha_user_id = ? AND device_id != ?`
        )
        .all(ha_user_id, source_device_id)
        .map((row) => row.device_id);

  const publishTargets = db.transaction((deviceIds) => {
    let affected = 0;
    deviceIds.forEach((deviceId) => {
      affected += upsertTarget(deviceId);
    });
    return affected;
  });

  try {
    const affected = publishTargets(targetIds);
    return res.json({ success: true, affected });
  } catch (error) {
    console.error('[settings] Failed to publish settings:', error);
    return res.status(500).json({ error: 'Failed to publish settings to target devices' });
  }
});

export default router;
