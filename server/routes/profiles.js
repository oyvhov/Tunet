import { Router } from 'express';
import { randomUUID } from 'node:crypto';
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
const warnedWriteFailures = new Set();

const profilesRateLimiter = rateLimit({
  windowMs: Math.max(Number(process.env.PROFILES_RATE_LIMIT_WINDOW_MS) || 60_000, 1_000),
  max: Math.max(Number(process.env.PROFILES_RATE_LIMIT_MAX) || 120, 10),
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(profilesRateLimiter);

const safeParseJson = (raw, fallback = null) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const getRequestUserId = (req) => {
  const headerUserId = req.get('x-ha-user-id');
  if (typeof headerUserId === 'string' && headerUserId.trim()) return headerUserId.trim();
  return null;
};

const ensureRequestUser = (req, res) => {
  const requestUserId = getRequestUserId(req);
  if (!requestUserId) {
    res.status(401).json({ error: 'Missing x-ha-user-id header' });
    return null;
  }
  return requestUserId;
};

const parseStoredProfileData = (row, context) => {
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
  console.warn(`[profiles] Failed to produce encrypted payload in ${context}.`);
};

// List profiles for a HA user
router.get('/', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id } = req.query;
  if (!ha_user_id) {
    return res.status(400).json({ error: 'ha_user_id query parameter is required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const profiles = db.prepare(
    'SELECT id, ha_user_id, name, device_label, data, data_enc, created_at, updated_at FROM profiles WHERE ha_user_id = ? ORDER BY updated_at DESC'
  ).all(ha_user_id);

  // Parse data JSON for each profile
  const parsed = profiles.map(p => ({
    id: p.id,
    ha_user_id: p.ha_user_id,
    name: p.name,
    device_label: p.device_label,
    data: parseStoredProfileData(p, `profiles/list:${ha_user_id}:${p.id}`),
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  res.json(parsed);
});

// Get a single profile
router.get('/:id', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const profile = db.prepare(
    'SELECT id, ha_user_id, name, device_label, data, data_enc, created_at, updated_at FROM profiles WHERE id = ? AND ha_user_id = ?'
  ).get(req.params.id, requestUserId);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json({
    id: profile.id,
    ha_user_id: profile.ha_user_id,
    name: profile.name,
    device_label: profile.device_label,
    data: parseStoredProfileData(profile, `profiles/get:${requestUserId}:${req.params.id}`),
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  });
});

// Create a new profile
router.post('/', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id, name, device_label, data } = req.body;

  if (!ha_user_id || !name || !data) {
    return res.status(400).json({ error: 'ha_user_id, name, and data are required' });
  }
  if (ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const payload = JSON.stringify(data);
  const encryptedPayload = encryptDataText(payload);
  if (encryptedPayload === null) {
    warnEncryptionWriteFailure('create');
    if (isEncryptionWriteRequired()) {
      return res.status(503).json({ error: 'Encryption is required but unavailable' });
    }
  }
  const plainPayload = shouldPersistPlaintextData() ? payload : getEncryptedOnlyPlaintextStub();

  db.prepare(
    'INSERT INTO profiles (id, ha_user_id, name, device_label, data, data_enc, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, ha_user_id, name, device_label || null, plainPayload, encryptedPayload, now, now);

  res.status(201).json({ id, ha_user_id, name, device_label, data, created_at: now, updated_at: now });
});

// Update a profile
router.put('/:id', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const { ha_user_id, name, device_label, data } = req.body;
  if (ha_user_id && ha_user_id !== requestUserId) {
    return res.status(403).json({ error: 'Forbidden: user mismatch' });
  }

  const existing = db.prepare('SELECT id FROM profiles WHERE id = ? AND ha_user_id = ?').get(req.params.id, requestUserId);
  if (!existing) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const now = new Date().toISOString();
  const payload = data === undefined ? null : JSON.stringify(data);
  const encryptedPayload = payload === null ? null : encryptDataText(payload);
  if (payload !== null && encryptedPayload === null) {
    warnEncryptionWriteFailure('update');
    if (isEncryptionWriteRequired()) {
      return res.status(503).json({ error: 'Encryption is required but unavailable' });
    }
  }
  const plainPayload = payload === null
    ? null
    : (shouldPersistPlaintextData() ? payload : getEncryptedOnlyPlaintextStub());
  db.prepare(
    'UPDATE profiles SET name = CASE WHEN ? THEN ? ELSE name END, device_label = CASE WHEN ? THEN ? ELSE device_label END, data = CASE WHEN ? THEN ? ELSE data END, data_enc = CASE WHEN ? THEN ? ELSE data_enc END, updated_at = ? WHERE id = ? AND ha_user_id = ?'
  ).run(
    name !== undefined ? 1 : 0,
    name,
    device_label !== undefined ? 1 : 0,
    device_label,
    data !== undefined ? 1 : 0,
    plainPayload,
    data !== undefined ? 1 : 0,
    encryptedPayload,
    now,
    req.params.id,
    requestUserId
  );

  const updated = db.prepare(
    'SELECT id, ha_user_id, name, device_label, data, data_enc, created_at, updated_at FROM profiles WHERE id = ? AND ha_user_id = ?'
  ).get(req.params.id, requestUserId);

  res.json({
    id: updated.id,
    ha_user_id: updated.ha_user_id,
    name: updated.name,
    device_label: updated.device_label,
    data: parseStoredProfileData(updated, `profiles/update:${requestUserId}:${req.params.id}`),
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  });
});

// Delete a profile
router.delete('/:id', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const result = db.prepare('DELETE FROM profiles WHERE id = ? AND ha_user_id = ?').run(req.params.id, requestUserId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json({ success: true });
});

export default router;
