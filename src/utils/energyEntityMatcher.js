const FIELD_ORDER = [
  'solarProductionInstantId',
  'gridInjectionInstantId',
  'gridConsumptionInstantId',
  'batteryInjectionInstantId',
  'batteryConsumptionInstantId',
  'batteryLevelId',
  'homeConsumptionInstantId',
  'solarProductionLifetimeId',
  'gridInjectionLifetimeId',
  'gridConsumptionLifetimeId',
  'batteryInjectionLifetimeId',
  'batteryConsumptionLifetimeId',
  'homeConsumptionLifetimeId',
];

const POWER_UNITS = ['w', 'kw', 'mw'];
const ENERGY_UNITS = ['wh', 'kwh', 'mwh'];

const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const hasAnyToken = (text, tokens) => tokens.some((token) => text.includes(token));

function buildSearchText(id, entity) {
  const friendlyName = normalize(entity?.attributes?.friendly_name);
  const objectId = normalize(id.split('.')[1] || '');
  const uniqueId = normalize(entity?.attributes?.unique_id);
  return `${normalize(id)} ${objectId} ${friendlyName} ${uniqueId}`;
}

function addCandidate(candidates, key, id, score) {
  if (!id || !Number.isFinite(score) || score <= 0) return;
  if (!candidates[key]) candidates[key] = [];
  const existing = candidates[key].find((entry) => entry.id === id);
  if (!existing) {
    candidates[key].push({ id, score });
    return;
  }
  existing.score = Math.max(existing.score, score);
}

function rankCandidates(candidates, entities) {
  const result = {};
  for (const key of FIELD_ORDER) {
    const list = Array.isArray(candidates[key]) ? candidates[key] : [];
    result[key] = list
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aName = entities[a.id]?.attributes?.friendly_name || a.id;
        const bName = entities[b.id]?.attributes?.friendly_name || b.id;
        return aName.localeCompare(bName);
      })
      .map((entry) => entry.id);
  }
  return result;
}

function classifyEnergyField(text, unit) {
  const isPower = POWER_UNITS.includes(unit);
  const isEnergy = ENERGY_UNITS.includes(unit);
  const isSolar = hasAnyToken(text, ['solar', 'pv', 'panel', 'photovoltaic']);
  const isGrid = hasAnyToken(text, ['grid', 'net', 'network', 'utility', 'mains']);
  const isBattery = hasAnyToken(text, ['battery', 'batt', 'storage', 'accu']);
  const isBatteryLevel = hasAnyToken(text, ['battery_level', 'battery level', 'state_of_charge', 'soc']);
  const isHome = hasAnyToken(text, ['home', 'house', 'load', 'consumption_maison', 'consumption maison']);
  const isImport = hasAnyToken(text, ['import', 'from_grid', 'consumption', 'consume', 'usage', 'draw']);
  const isExport = hasAnyToken(text, ['export', 'to_grid', 'injection', 'inject', 'feedin', 'feed_in']);
  const isCharge = hasAnyToken(text, ['charge', 'charging', 'to_battery', 'battery_in']);
  const isDischarge = hasAnyToken(text, ['discharge', 'discharging', 'from_battery', 'battery_out']);
  const isProduction = hasAnyToken(text, ['production', 'generated', 'generation', 'yield']);

  if (isPower && isSolar && isProduction) return 'solarProductionInstantId';
  if (isEnergy && isSolar && isProduction) return 'solarProductionLifetimeId';

  if (isPower && isGrid && isExport) return 'gridInjectionInstantId';
  if (isEnergy && isGrid && isExport) return 'gridInjectionLifetimeId';

  if (isPower && isGrid && isImport) return 'gridConsumptionInstantId';
  if (isEnergy && isGrid && isImport) return 'gridConsumptionLifetimeId';

  if (isPower && isBattery && isCharge) return 'batteryInjectionInstantId';
  if (isEnergy && isBattery && isCharge) return 'batteryInjectionLifetimeId';

  if (isPower && isBattery && isDischarge) return 'batteryConsumptionInstantId';
  if (isEnergy && isBattery && isDischarge) return 'batteryConsumptionLifetimeId';

  if (unit === '%' && isBattery && isBatteryLevel) return 'batteryLevelId';

  if (isPower && isHome && (isImport || hasAnyToken(text, ['consumption', 'usage', 'load']))) {
    return 'homeConsumptionInstantId';
  }
  if (isEnergy && isHome && (isImport || hasAnyToken(text, ['consumption', 'usage', 'load']))) {
    return 'homeConsumptionLifetimeId';
  }

  return null;
}

export function matchEnergyEntities(entities = {}) {
  const candidates = {};
  const entries = Object.entries(entities || {});

  for (const [id, entity] of entries) {
    const domain = id.split('.')[0];
    if (!['sensor', 'binary_sensor', 'number', 'input_number', 'weather'].includes(domain)) continue;

    const text = buildSearchText(id, entity);
    const unit = normalize(entity?.attributes?.unit_of_measurement);
    const field = classifyEnergyField(text, unit);
    if (!field) continue;

    let score = 80;
    if (POWER_UNITS.includes(unit) || ENERGY_UNITS.includes(unit)) score += 15;
    if (hasAnyToken(text, ['solar', 'grid', 'battery', 'home'])) score += 10;
    addCandidate(candidates, field, id, score);
  }

  const options = rankCandidates(candidates, entities);
  const suggested = {};
  for (const key of FIELD_ORDER) {
    suggested[key] = options[key]?.[0] || null;
  }

  return { options, suggested };
}
