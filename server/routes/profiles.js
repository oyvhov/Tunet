import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';

const router = Router();

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
    'SELECT id, ha_user_id, name, device_label, data, created_at, updated_at FROM profiles WHERE ha_user_id = ? ORDER BY updated_at DESC'
  ).all(ha_user_id);

  // Parse data JSON for each profile
  const parsed = profiles.map(p => ({
    ...p,
    data: JSON.parse(p.data),
  }));

  res.json(parsed);
});

// Get a single profile
router.get('/:id', (req, res) => {
  const requestUserId = ensureRequestUser(req, res);
  if (!requestUserId) return;

  const profile = db.prepare(
    'SELECT id, ha_user_id, name, device_label, data, created_at, updated_at FROM profiles WHERE id = ? AND ha_user_id = ?'
  ).get(req.params.id, requestUserId);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json({ ...profile, data: JSON.parse(profile.data) });
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

  db.prepare(
    'INSERT INTO profiles (id, ha_user_id, name, device_label, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, ha_user_id, name, device_label || null, JSON.stringify(data), now, now);

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
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (device_label !== undefined) { updates.push('device_label = ?'); params.push(device_label); }
  if (data !== undefined) { updates.push('data = ?'); params.push(JSON.stringify(data)); }
  updates.push('updated_at = ?'); params.push(now);
  params.push(req.params.id);

  db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(
    'SELECT id, ha_user_id, name, device_label, data, created_at, updated_at FROM profiles WHERE id = ? AND ha_user_id = ?'
  ).get(req.params.id, requestUserId);

  res.json({ ...updated, data: JSON.parse(updated.data) });
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
