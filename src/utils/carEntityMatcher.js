const FIELD_ORDER = [
  'batteryId',
  'rangeId',
  'odometerId',
  'lastUpdatedId',
  'apiStatusId',
  'fuelLevelId',
  'locationId',
  'latitudeId',
  'longitudeId',
  'pluggedId',
  'chargingStateId',
  'chargingPowerId',
  'chargeRateId',
  'timeToFullId',
  'chargeEndTimeId',
  'climateId',
  'lockId',
  'ignitionSwitchId',
  'engineStatusId',
  'chargeLimitNumberId',
  'chargeLimitSelectId',
  'updateButtonId',
];

const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const hasAnyToken = (text, tokens) => tokens.some((token) => text.includes(token));

const CHARGE_CONTROL_INCLUDE_TOKENS = [
  'charge',
  'charging',
  'charger',
  'charger_connected',
  'plug',
  'evse',
  'lad',
  'lading',
  'lading',
  'ladetimer',
];

const CHARGE_CONTROL_EXCLUDE_TOKENS = [
  'restart',
  'reboot',
  'server',
  'bridge',
  'zigbee',
  'mqtt',
  'home assistant',
  'tagreader',
  'core',
  'wifi',
  'tilkopling',
  'tilkobling',
  'system',
];

function isChargeControlCandidate(text) {
  if (!hasAnyToken(text, CHARGE_CONTROL_INCLUDE_TOKENS)) return false;
  if (hasAnyToken(text, CHARGE_CONTROL_EXCLUDE_TOKENS)) return false;
  return true;
}

const parseNumeric = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

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
    const ranked = list
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aName = entities[a.id]?.attributes?.friendly_name || a.id;
        const bName = entities[b.id]?.attributes?.friendly_name || b.id;
        return aName.localeCompare(bName);
      })
      .map((entry) => entry.id);
    result[key] = ranked;
  }
  return result;
}

export function matchCarEntities(entities = {}) {
  const candidates = {};
  const chargeControlScores = new Map();
  const entries = Object.entries(entities || {});

  for (const [id, entity] of entries) {
    const domain = id.split('.')[0];
    const text = buildSearchText(id, entity);
    const unit = normalize(entity?.attributes?.unit_of_measurement);
    const deviceClass = normalize(entity?.attributes?.device_class);

    const hasLatAttr = parseNumeric(entity?.attributes?.latitude) !== null;
    const hasLonAttr = parseNumeric(entity?.attributes?.longitude) !== null;

    if (domain === 'device_tracker' && hasLatAttr && hasLonAttr) {
      addCandidate(candidates, 'locationId', id, 120);
    }

    if (domain === 'sensor' || domain === 'input_number') {
      if (
        deviceClass === 'battery' ||
        hasAnyToken(text, ['battery', 'soc', 'state_of_charge']) ||
        (unit === '%' && hasAnyToken(text, ['ev', 'car', 'vehicle']))
      ) {
        addCandidate(candidates, 'batteryId', id, deviceClass === 'battery' ? 140 : 100);
      }

      if (
        deviceClass === 'distance' ||
        hasAnyToken(text, ['range', 'remaining_range', 'driving_range']) ||
        ['km', 'mi', 'm'].includes(unit)
      ) {
        addCandidate(candidates, 'rangeId', id, deviceClass === 'distance' ? 120 : 85);
      }

      if (hasAnyToken(text, ['odometer', 'mileage', 'odo'])) {
        addCandidate(candidates, 'odometerId', id, 110);
      }

      if (
        hasAnyToken(text, ['last_update', 'last update', 'updated', 'api_status', 'api status'])
      ) {
        addCandidate(candidates, 'lastUpdatedId', id, 90);
      }

      if (hasAnyToken(text, ['api_status', 'api status', 'service_status', 'vehicle_status'])) {
        addCandidate(candidates, 'apiStatusId', id, 95);
      }

      if (hasAnyToken(text, ['fuel_level', 'fuel level', 'fuel', 'tank'])) {
        addCandidate(candidates, 'fuelLevelId', id, unit === '%' ? 95 : 70);
      }

      if (hasAnyToken(text, ['charging_state', 'charge_state', 'charging status'])) {
        addCandidate(candidates, 'chargingStateId', id, 120);
      } else if (deviceClass === 'battery_charging' || hasAnyToken(text, ['charging', 'charger'])) {
        addCandidate(candidates, 'chargingStateId', id, 85);
      }

      if (
        hasAnyToken(text, ['charging_power', 'charge_power', 'charger_power']) ||
        ((unit === 'kw' || unit === 'w') && hasAnyToken(text, ['charging', 'charger', 'ev']))
      ) {
        addCandidate(candidates, 'chargingPowerId', id, unit === 'kw' ? 110 : 90);
      }

      if (
        hasAnyToken(text, ['charge_rate', 'charging_rate', 'rate']) ||
        ['km/h', 'mi/h', 'mph'].includes(unit)
      ) {
        addCandidate(candidates, 'chargeRateId', id, 95);
      }

      if (hasAnyToken(text, ['time_to_full', 'time to full', 'remaining_time', 'charge_time'])) {
        addCandidate(candidates, 'timeToFullId', id, 100);
      }

      if (hasAnyToken(text, ['charge_end_time', 'charge end', 'ready_by', 'charge_complete'])) {
        addCandidate(candidates, 'chargeEndTimeId', id, 100);
      }

      if (hasAnyToken(text, ['latitude', 'lat']) || unit === '°') {
        addCandidate(candidates, 'latitudeId', id, 80);
      }

      if (hasAnyToken(text, ['longitude', 'lon', 'lng']) || unit === '°') {
        addCandidate(candidates, 'longitudeId', id, 80);
      }
    }

    if (domain === 'binary_sensor') {
      if (
        deviceClass === 'plug' ||
        hasAnyToken(text, ['plugged', 'plug', 'charger_connected', 'connected'])
      ) {
        addCandidate(candidates, 'pluggedId', id, deviceClass === 'plug' ? 120 : 90);
      }

      if (hasAnyToken(text, ['charging', 'charge'])) {
        addCandidate(candidates, 'chargingStateId', id, 80);
      }

      if (hasAnyToken(text, ['engine', 'ignition', 'motor'])) {
        addCandidate(candidates, 'engineStatusId', id, 95);
      }
    }

    if (domain === 'climate') {
      addCandidate(candidates, 'climateId', id, 120);
    }

    if (domain === 'lock') {
      addCandidate(candidates, 'lockId', id, 120);
    }

    if (domain === 'switch') {
      if (hasAnyToken(text, ['ignition', 'engine', 'vehicle_on'])) {
        addCandidate(candidates, 'ignitionSwitchId', id, 105);
      }
      if (isChargeControlCandidate(text)) {
        chargeControlScores.set(id, Math.max(chargeControlScores.get(id) || 0, 95));
      }
    }

    if (domain === 'button') {
      if (hasAnyToken(text, ['update', 'refresh', 'poll'])) {
        addCandidate(candidates, 'updateButtonId', id, 100);
      }
      if (isChargeControlCandidate(text)) {
        chargeControlScores.set(id, Math.max(chargeControlScores.get(id) || 0, 90));
      }
    }

    if (domain === 'input_button') {
      if (isChargeControlCandidate(text)) {
        chargeControlScores.set(id, Math.max(chargeControlScores.get(id) || 0, 90));
      }
    }

    if (domain === 'script') {
      if (isChargeControlCandidate(text)) {
        chargeControlScores.set(id, Math.max(chargeControlScores.get(id) || 0, 92));
      }
    }

    if (domain === 'number' && hasAnyToken(text, ['charge_limit', 'charge limit', 'soc limit'])) {
      addCandidate(candidates, 'chargeLimitNumberId', id, 110);
    }

    if (domain === 'select' && hasAnyToken(text, ['charge_limit', 'charge limit', 'soc limit'])) {
      addCandidate(candidates, 'chargeLimitSelectId', id, 110);
    }
  }

  const options = rankCandidates(candidates, entities);
  const suggested = {};
  for (const key of FIELD_ORDER) {
    suggested[key] = options[key]?.[0] || null;
  }

  const chargeControlIds = [...chargeControlScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  return {
    options,
    suggested,
    chargeControlIds,
  };
}
