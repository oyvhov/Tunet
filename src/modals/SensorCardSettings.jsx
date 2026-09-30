import React, { useMemo } from 'react';
import IconPicker from '../components/ui/IconPicker';
import { Activity, Zap } from '../icons';
import SensorNumericStyle from './editCard/SensorNumericStyle';
import SensorServiceSettings from './editCard/SensorServiceSettings';
import {
  ChoiceChips,
  Disclosure,
  DropdownField,
  EntityField,
  Field,
  SettingsSection,
  TextField,
  ToggleRow,
} from './editCard/settingsControls';
import {
  resolveSensorCardConfig,
  SENSOR_ACTION_TYPES,
  SENSOR_LAYOUTS,
  SENSOR_STATUS_MODES,
} from '../utils/sensorCardConfig';

const EMPTY_OBJECT = {};
const TRIGGERS = ['button', 'icon', 'card'];
const POWER_TARGET_DOMAINS = [
  'input_boolean',
  'switch',
  'light',
  'automation',
  'climate',
  'fan',
  'media_player',
  'humidifier',
  'remote',
  'siren',
];
const APPEARANCE_KEYS = [
  'sensorLayout',
  'sensorVariant',
  'sensorMin',
  'sensorMinType',
  'sensorMinEntity',
  'sensorMax',
  'sensorMaxType',
  'sensorMaxEntity',
  'sensorValueMode',
  'sensorUseColorThresholds',
  'sensorColorThresholds',
  'showGraph',
];
const STATUS_DETAIL_KEYS = [
  'sensorStatusText',
  'sensorStatusEntityId',
  'sensorStatusAttribute',
  'scriptStatusText',
];
const STATUS_KEYS = ['sensorStatusMode', ...STATUS_DETAIL_KEYS, 'showStatus'];

const getActionTargetDomains = (type) => {
  if (type === 'scene' || type === 'script') return [type];
  if (type === 'press') return ['button', 'input_button'];
  if (['toggle', 'turn_on', 'turn_off'].includes(type)) return POWER_TARGET_DOMAINS;
  return null;
};

const hasValue = (value) => value !== undefined && value !== null && value !== '';

function isAppearanceCustomized(settings) {
  return (
    (hasValue(settings.sensorLayout) && settings.sensorLayout !== 'auto') ||
    (hasValue(settings.sensorVariant) && settings.sensorVariant !== 'default') ||
    settings.showGraph === false ||
    settings.sensorUseColorThresholds === false ||
    settings.sensorValueMode === 'percent' ||
    settings.sensorMinType === 'entity' ||
    settings.sensorMaxType === 'entity' ||
    ['sensorMin', 'sensorMax', 'sensorMinEntity', 'sensorMaxEntity', 'sensorColorThresholds'].some(
      (key) => hasValue(settings[key])
    )
  );
}

function isActionCustomized(action) {
  return Object.entries(action).some(([key, value]) => {
    if (!hasValue(value)) return false;
    if (key === 'type') return value !== 'auto';
    if (key === 'trigger') return value !== 'button';
    if (key === 'targetMode') return value !== 'entity';
    if (key === 'data') return Object.keys(value).length > 0;
    return true;
  });
}

/** @param {any} props */
export default function SensorCardSettings({
  entityId,
  settingsKey,
  settings = EMPTY_OBJECT,
  entities = EMPTY_OBJECT,
  conn,
  connected,
  saveCardSetting,
  name,
  iconName,
  onNameChange,
  onIconChange,
  numericEntityOptions = [],
  t,
}) {
  const primaryId = settings.entityId || entityId;
  const primaryDomain = primaryId?.split('.')[0];
  const entity = entities[primaryId];
  const config = resolveSensorCardConfig(settings, entity, entities);
  const action = settings.sensorAction || EMPTY_OBJECT;
  const actionType = config.action.configuredType;
  const resolvedActionType = config.action.type;
  const hasAction = resolvedActionType !== 'none';
  const trigger = config.action.trigger;
  const statusMode =
    settings.showStatus === false
      ? 'hidden'
      : settings.sensorStatusMode ||
        (primaryDomain === 'script' && settings.scriptStatusText ? 'text' : 'auto');
  const allEntityIds = useMemo(
    () =>
      Object.keys(entities).sort((left, right) =>
        (entities[left]?.attributes?.friendly_name || left).localeCompare(
          entities[right]?.attributes?.friendly_name || right
        )
      ),
    [entities]
  );
  const save = (key, value) => saveCardSetting(settingsKey, key, value);
  const updateAction = (patch) => save('sensorAction', { ...action, ...patch });
  const resetFields = (keys) => keys.forEach((key) => save(key, null));
  const resetLabel = t('sensor.custom.reset');
  const label = (prefix, keys) =>
    Object.fromEntries(keys.map((key) => [key, t(`sensor.custom.${prefix}.${key}`)]));
  const chipOptions = (prefix, keys) =>
    keys.map((key) => ({ value: key, label: t(`sensor.custom.${prefix}.${key}`) }));

  const targetDomains = getActionTargetDomains(actionType);
  const actionTargets = targetDomains
    ? allEntityIds.filter((id) => targetDomains.includes(id.split('.')[0]))
    : allEntityIds;
  const statusEntity = entities[settings.sensorStatusEntityId || primaryId];

  const changeActionType = (type) => {
    const allowedDomains = getActionTargetDomains(type);
    const keepTarget =
      action.entityId &&
      (!allowedDomains || allowedDomains.includes(action.entityId.split('.')[0]));
    updateAction({
      type,
      entityId: keepTarget ? action.entityId : null,
      service: null,
      data: {},
      targetMode: 'entity',
    });
  };

  const contentCustomized =
    hasValue(settings.sensorSubtitle) ||
    settings.showName === false ||
    settings.showIcon === false ||
    hasValue(name) ||
    hasValue(iconName);
  const statusCustomized =
    settings.showStatus === false ||
    (hasValue(settings.sensorStatusMode) && settings.sensorStatusMode !== 'auto') ||
    STATUS_DETAIL_KEYS.some((key) => hasValue(settings[key]));
  const appearanceCustomized = isAppearanceCustomized(settings);
  const actionCustomized = isActionCustomized(action) || settings.showControls === false;
  const showControlsToggle =
    (hasAction && trigger === 'button') || primaryDomain === 'input_number';
  const automaticActionHint =
    actionType !== 'auto'
      ? undefined
      : hasAction
        ? t('sensor.custom.autoAction').replace(
            '{action}',
            t(`sensor.custom.actionType.${resolvedActionType}`)
          )
        : t('sensor.custom.noAutoAction');

  return (
    <div className="space-y-4" data-testid="sensor-card-settings">
      <SettingsSection
        title={t('sensor.custom.content')}
        resetLabel={resetLabel}
        onReset={
          contentCustomized
            ? () => {
                resetFields(['sensorSubtitle', 'showName', 'showIcon']);
                onNameChange?.('');
                onIconChange?.(null);
              }
            : undefined
        }
      >
        <EntityField
          label={t('sensor.custom.entity')}
          value={primaryId}
          options={allEntityIds}
          entities={entities}
          onChange={(id) => {
            if (id) save('entityId', id);
          }}
          t={t}
        />
        {onNameChange ? (
          <TextField
            label={t('form.name')}
            value={name}
            onChange={onNameChange}
            placeholder={entity?.attributes?.friendly_name || t('form.defaultName')}
          />
        ) : null}
        <TextField
          label={t('sensor.custom.subtitle')}
          value={settings.sensorSubtitle}
          onChange={(value) => save('sensorSubtitle', value || null)}
        />
        {onIconChange ? (
          <IconPicker
            value={iconName}
            onSelect={onIconChange}
            onClear={() => onIconChange(null)}
            t={t}
            maxHeightClass="max-h-48"
          />
        ) : null}
        <div className="space-y-1">
          <ToggleRow
            label={t('form.showName')}
            checked={settings.showName !== false}
            onChange={(value) => save('showName', value)}
          />
          <ToggleRow
            label={t('form.showIcon')}
            checked={settings.showIcon !== false}
            onChange={(value) => save('showIcon', value)}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('sensor.custom.status')}
        resetLabel={resetLabel}
        onReset={statusCustomized ? () => resetFields(STATUS_KEYS) : undefined}
      >
        <ChoiceChips
          label={t('sensor.custom.statusSource')}
          options={chipOptions('statusMode', SENSOR_STATUS_MODES)}
          value={statusMode}
          onChange={(mode) => {
            save('sensorStatusMode', mode);
            save('showStatus', true);
          }}
        />
        {statusMode === 'text' ? (
          <TextField
            label={t('sensor.custom.statusText')}
            value={settings.sensorStatusText ?? settings.scriptStatusText}
            onChange={(value) => {
              save('sensorStatusText', value || null);
              if (settings.scriptStatusText) save('scriptStatusText', null);
            }}
            placeholder={t('sensor.custom.automatic')}
          />
        ) : null}
        {['entity', 'attribute'].includes(statusMode) ? (
          <EntityField
            label={t('sensor.custom.statusEntity')}
            value={settings.sensorStatusEntityId || primaryId}
            options={allEntityIds}
            entities={entities}
            onChange={(id) => save('sensorStatusEntityId', id || null)}
            t={t}
          />
        ) : null}
        {statusMode === 'attribute' ? (
          <DropdownField
            icon={Activity}
            label={t('sensor.custom.attribute')}
            options={Object.keys(statusEntity?.attributes || {})}
            current={settings.sensorStatusAttribute || ''}
            onChange={(attribute) => save('sensorStatusAttribute', attribute)}
            t={t}
          />
        ) : null}
        {primaryDomain === 'scene' && statusMode === 'auto' ? (
          <p className="text-xs text-[var(--text-muted)]">{t('sensor.custom.sceneHint')}</p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title={t('sensor.custom.appearance')}
        resetLabel={resetLabel}
        onReset={appearanceCustomized ? () => resetFields(APPEARANCE_KEYS) : undefined}
      >
        <ChoiceChips
          label={t('sensor.custom.layout')}
          options={chipOptions('layout', SENSOR_LAYOUTS)}
          value={config.layout}
          onChange={(layout) => save('sensorLayout', layout)}
        />
        <SensorNumericStyle
          primaryId={primaryId}
          settings={settings}
          settingsKey={settingsKey}
          entities={entities}
          numericEntityOptions={numericEntityOptions}
          saveCardSetting={saveCardSetting}
          t={t}
        />
      </SettingsSection>

      <SettingsSection
        title={t('sensor.custom.action')}
        resetLabel={resetLabel}
        onReset={actionCustomized ? () => resetFields(['sensorAction', 'showControls']) : undefined}
      >
        <DropdownField
          icon={Zap}
          label={t('sensor.custom.actionType')}
          hint={automaticActionHint}
          options={SENSOR_ACTION_TYPES}
          current={actionType}
          map={label('actionType', SENSOR_ACTION_TYPES)}
          onChange={changeActionType}
          t={t}
        />
        {hasAction ? (
          <>
            {resolvedActionType !== 'service' ? (
              <EntityField
                label={t('sensor.custom.actionTarget')}
                value={action.entityId || primaryId}
                options={actionTargets}
                entities={entities}
                onChange={(id) => updateAction({ entityId: id || null })}
                t={t}
              />
            ) : null}
            <ChoiceChips
              label={t('sensor.custom.trigger')}
              options={chipOptions('trigger', TRIGGERS)}
              value={trigger}
              onChange={(value) => updateAction({ trigger: value })}
            />
            {resolvedActionType === 'service' ? (
              <SensorServiceSettings
                key={settingsKey}
                action={action}
                primaryId={primaryId}
                updateAction={updateAction}
                conn={conn}
                connected={connected}
                entities={entities}
                t={t}
              />
            ) : null}
            <TextField
              label={t('sensor.custom.buttonText')}
              value={action.label}
              onChange={(value) => updateAction({ label: value || null })}
              placeholder={t('sensor.custom.automatic')}
            />
            {resolvedActionType === 'toggle' || trigger !== 'card' ? (
              <Disclosure summary={t('sensor.custom.moreOptions')}>
                {resolvedActionType === 'toggle' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label={t('sensor.custom.labelOn')}
                      value={action.labelOn}
                      onChange={(value) => updateAction({ labelOn: value || null })}
                      placeholder={t('sensor.action.turnOff')}
                    />
                    <TextField
                      label={t('sensor.custom.labelOff')}
                      value={action.labelOff}
                      onChange={(value) => updateAction({ labelOff: value || null })}
                      placeholder={t('sensor.action.turnOn')}
                    />
                  </div>
                ) : null}
                {trigger !== 'card' ? (
                  <Field label={t('sensor.custom.actionIcon')}>
                    <IconPicker
                      value={action.icon || null}
                      onSelect={(icon) => updateAction({ icon })}
                      onClear={() => updateAction({ icon: null })}
                      t={t}
                      maxHeightClass="max-h-48"
                    />
                  </Field>
                ) : null}
              </Disclosure>
            ) : null}
          </>
        ) : null}
        {showControlsToggle ? (
          <ToggleRow
            label={t('sensor.custom.showControls')}
            hint={t('sensor.custom.showControlsHint')}
            checked={settings.showControls !== false}
            onChange={(value) => save('showControls', value)}
          />
        ) : null}
      </SettingsSection>
    </div>
  );
}
