import { Router } from 'express';
import * as mdiIcons from '@mdi/js';

const router = Router();

const ICON_KEY_PATTERN = /^[a-z0-9-]+$/;

const kebabToMdiKey = (name) => {
  const camel = name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `mdi${camel}`;
};

const mdiPathByName = new Map(
  Object.entries(mdiIcons)
    .filter(([key, value]) => key.startsWith('mdi') && typeof value === 'string')
    .map(([key, value]) => {
      const kebab = key
        .replace(/^mdi/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();
      return [kebab, value];
    })
);

const mdiNames = Array.from(mdiPathByName.keys()).sort((a, b) => a.localeCompare(b));

router.get('/mdi', (req, res) => {
  const rawQuery = typeof req.query.q === 'string' ? req.query.q.toLowerCase().trim() : '';
  if (!rawQuery) {
    return res.json({ icons: mdiNames.map((name) => `mdi:${name}`) });
  }

  const filtered = mdiNames
    .filter((name) => name.includes(rawQuery))
    .slice(0, 500)
    .map((name) => `mdi:${name}`);

  return res.json({ icons: filtered });
});

router.get('/mdi/:name', (req, res) => {
  const rawName = String(req.params.name || '').toLowerCase().trim();
  if (!rawName || !ICON_KEY_PATTERN.test(rawName)) {
    return res.status(400).json({ error: 'Invalid icon name' });
  }

  const direct = mdiPathByName.get(rawName);
  if (direct) {
    return res.json({ name: `mdi:${rawName}`, path: direct });
  }

  const key = kebabToMdiKey(rawName);
  const path = mdiIcons[key];
  if (typeof path !== 'string') {
    return res.status(404).json({ error: 'Icon not found' });
  }

  mdiPathByName.set(rawName, path);
  return res.json({ name: `mdi:${rawName}`, path });
});

export default router;
