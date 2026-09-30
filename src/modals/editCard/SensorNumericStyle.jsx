import React from 'react';
import { SearchableSelect } from './CarMappingsSection';
import { ChoiceChips, FIELD_CLASS, ToggleRow } from './settingsControls';
import { canSensorUseNumericVariants, resolveSensorCardConfig } from '../../utils/sensorCardConfig';

const VARIANTS = ['default', 'number', 'gauge', 'bar', 'donut'];
const RANGE_VARIANTS = ['gauge', 'donut', 'bar'];
const DEFAULT_THRESHOLDS = [
  { limit: 20, color: 'red' },
  { limit: 60, color: 'amber' },
  { limit: 100, color: 'green' },
];
const THRESHOLD_COLORS = [
  { key: 'red', labelKey: 'sensor.colorRed', fallback: 'Red', swatch: 'var(--color-red-500)' },
  {
    key: 'amber',
    labelKey: 'sensor.colorAmber',
    fallback: 'Amber',
    swatch: 'var(--color-amber-400)',
  },
  {
    key: 'green',
    labelKey: 'sensor.colorGreen',
    fallback: 'Green',
    swatch: 'var(--color-green-400)',
  },
];
const SMALL_CHIP_CLASS = 'min-h-7 rounded-full px-2.5 py-1 text-xs font-bold transition-all';
const CHIP_ACTIVE = 'bg-[var(--accent-bg)] text-[var(--accent-color)]';
const CHIP_IDLE =
  'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]';

/** @param {any} props */
function RangeBound({ label, prefix, settings, entityOptions, entities, save, t }) {
  const typeKey = `${prefix}Type`;
  const entityKey = `${prefix}Entity`;
  const type = settings[typeKey] === 'entity' ? 'entity' : 'value';
  const inputId = React.useId();
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={type === 'value' ? inputId : undefined}
          className="ml-1 text-xs font-bold text-[var(--text-muted)] uppercase"
        >
          {label}
        </label>
        <div role="group" aria-label={label} className="flex gap-1">
          {[
            { value: 'value', label: '#' },
            { value: 'entity', label: t('sensor.entity') || 'Entity' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={type === option.value}
              onClick={() => {
                save(typeKey, option.value);
                if (option.value === 'value') save(entityKey, null);
              }}
              className={`${SMALL_CHIP_CLASS} ${type === option.value ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2">
        {type === 'value' ? (
          <input
            id={inputId}
            type="number"
            className={FIELD_CLASS}
            placeholder={prefix === 'sensorMin' ? '0' : '100'}
            value={settings[prefix] ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              save(prefix, value === '' ? null : parseFloat(value));
            }}
          />
        ) : (
          <SearchableSelect
            label={label}
            labelClassName="sr-only"
            value={settings[entityKey] || ''}
            options={entityOptions}
            entities={entities}
            onChange={(id) => save(entityKey, id || null)}
            placeholder={t('sensor.selectEntity') || 'Select...'}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

function getNumericStyleContext(primaryId, settings, entities) {
  const primaryEntity = entities[primaryId];
  const config = resolveSensorCardConfig(settings, primaryEntity, entities);
  const entity = ['entity', 'attribute'].includes(config.statusMode)
    ? config.statusEntity
    : primaryEntity;
  const state =
    config.statusMode === 'attribute'
      ? entity?.attributes?.[config.statusAttribute]
      : entity?.state;
  const isNumeric =
    config.statusMode !== 'text' &&
    config.statusMode !== 'hidden' &&
    (typeof state === 'string'
      ? /^\s*-?\d+(\.\d+)?\s*$/.test(state)
      : typeof state === 'number' && Number.isFinite(state));
  return {
    config,
    entity,
    available: isNumeric && canSensorUseNumericVariants(config, entity, primaryEntity),
  };
}

export function canShowSensorNumericStyle(primaryId, settings, entities) {
  return getNumericStyleContext(primaryId, settings, entities).available;
}

/** @param {any} props */
export default function SensorNumericStyle({
  primaryId,
  settings,
  settingsKey,
  entities,
  numericEntityOptions,
  saveCardSetting,
  t,
}) {
  const save = (key, value) => saveCardSetting(settingsKey, key, value);
  const { config, entity, available } = getNumericStyleContext(primaryId, settings, entities);
  if (!available) return null;
  const domain = entity?.entity_id?.split('.')[0];

  const variant = VARIANTS.includes(settings.sensorVariant) ? settings.sensorVariant : 'default';
  const canGraph = domain !== 'input_number' && config.statusMode !== 'attribute';
  const valueMode = settings.sensorValueMode === 'percent' ? 'percent' : 'actual';
  const useColorThresholds = settings.sensorUseColorThresholds !== false;
  const thresholds =
    Array.isArray(settings.sensorColorThresholds) && settings.sensorColorThresholds.length === 3
      ? settings.sensorColorThresholds.map((entry, index) => ({
          limit: Number.isFinite(parseFloat(entry?.limit))
            ? parseFloat(entry?.limit)
            : DEFAULT_THRESHOLDS[index].limit,
          color: entry?.color || DEFAULT_THRESHOLDS[index].color,
        }))
      : DEFAULT_THRESHOLDS;
  const saveThreshold = (index, patch) =>
    save(
      'sensorColorThresholds',
      thresholds.map((entry, itemIndex) => (itemIndex === index ? { ...entry, ...patch } : entry))
    );

  return (
    <>
      <ChoiceChips
        label={t('sensor.variant') || 'Card style'}
        options={VARIANTS.map((key) => ({
          value: key,
          label: t(`sensor.variant${key[0].toUpperCase()}${key.slice(1)}`) || key,
        }))}
        value={variant}
        onChange={(value) => save('sensorVariant', value)}
      />

      {canGraph && variant === 'default' ? (
        <ToggleRow
          label={t('form.showGraph')}
          hint={t('form.graphHint')}
          checked={settings.showGraph !== false}
          onChange={(value) => save('showGraph', value)}
        />
      ) : null}

      {RANGE_VARIANTS.includes(variant) ? (
        <div className="space-y-4 rounded-xl bg-[var(--glass-bg)] p-3">
          <RangeBound
            label={t('sensor.minValue') || 'Min'}
            prefix="sensorMin"
            settings={settings}
            entityOptions={numericEntityOptions}
            entities={entities}
            save={save}
            t={t}
          />
          <RangeBound
            label={t('sensor.maxValue') || 'Max'}
            prefix="sensorMax"
            settings={settings}
            entityOptions={numericEntityOptions}
            entities={entities}
            save={save}
            t={t}
          />
          <ChoiceChips
            label={t('sensor.valueDisplay') || 'Value display'}
            options={[
              { value: 'actual', label: t('sensor.valueActual') || 'Actual value' },
              { value: 'percent', label: t('sensor.valuePercent') || '% of range' },
            ]}
            value={valueMode}
            onChange={(value) => save('sensorValueMode', value)}
          />
          <ToggleRow
            label={t('sensor.colorThresholds') || 'Color thresholds'}
            hint={
              useColorThresholds
                ? t('sensor.colorThresholdsHint') || 'Set max value for each color step'
                : t('sensor.colorThresholdsOffHint') ||
                  'Thresholds are disabled. Chart uses blue accent color.'
            }
            checked={useColorThresholds}
            onChange={(value) => save('sensorUseColorThresholds', value)}
          />
          {useColorThresholds ? (
            <div className="space-y-2">
              {thresholds.map((threshold, index) => (
                <div
                  key={`sensor-threshold-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--modal-bg)] p-2"
                >
                  <span className="w-12 shrink-0 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                    {`${t('sensor.step') || 'Step'} ${index + 1}`}
                  </span>
                  <input
                    type="number"
                    aria-label={`${t('sensor.step') || 'Step'} ${index + 1}`}
                    value={threshold.limit ?? ''}
                    onChange={(event) =>
                      saveThreshold(index, {
                        limit: event.target.value === '' ? null : parseFloat(event.target.value),
                      })
                    }
                    className="w-20 min-w-0 rounded-lg bg-[var(--glass-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {THRESHOLD_COLORS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={threshold.color === option.key}
                        onClick={() => saveThreshold(index, { color: option.key })}
                        className={`flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase transition-all ${threshold.color === option.key ? CHIP_ACTIVE : CHIP_IDLE}`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: option.swatch }}
                        />
                        {t(option.labelKey) || option.fallback}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
