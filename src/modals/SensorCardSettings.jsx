import React, { useMemo } from 'react';
import IconPicker from '../components/ui/IconPicker';
import { Activity, Zap } from '../icons';
import SensorNumericStyle, { canShowSensorNumericStyle } from './editCard/SensorNumericStyle';
import SensorServiceSettings from './editCard/SensorServiceSettings';
import {
  ChoiceChips,
  DropdownField,
  EntityField,
  SettingsSection,
  TextField,
  ToggleRow,
} from './editCard/settingsControls';
import {
  getSensorActionTargetDomains,
  resolveSensorCardConfig,
  SENSOR_ACTION_TYPES,
  SENSOR_STATUS_MODES,
} from '../utils/sensorCardConfig';

const EMPTY_OBJECT = {};
const TRIGGERS = ['button', 'icon', 'card'];
const APPEARANCE_KEYS = [
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

const supportsActionTarget = (type, entityId) => {
  const domains = getSensorActionTargetDomains(type);
  return !domains || domains.includes(entityId?.split('.')[0]);
};

const hasValue = (value) => value !== undefined && value !== null && value !== '';

function isAppearanceCustomized(settings) {
  return (
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

  const targetDomains = getSensorActionTargetDomains(actionType);
  const actionTargets = targetDomains
    ? allEntityIds.filter((id) => targetDomains.includes(id.split('.')[0]))
    : allEntityIds;
  const showActionTarget =
    !['auto', 'none', 'service'].includes(actionType) ||
    (actionType === 'auto' && hasValue(action.entityId));
  const actionTargetValue =
    action.entityId || (supportsActionTarget(actionType, primaryId) ? primaryId : '');
  const statusEntity = entities[settings.sensorStatusEntityId || primaryId];

  const changeActionType = (type) => {
    const keepTarget = action.entityId && supportsActionTarget(type, action.entityId);
    updateAction({
      type,
      entityId: keepTarget ? action.entityId : null,
      service: null,
      data: {},
      targetMode: 'entity',
    });
  };

  const contentCustomized =
    settings.showName === false ||
    settings.showIcon === false ||
    hasValue(name) ||
    hasValue(iconName);
  const statusCustomized =
    settings.showStatus === false ||
    (hasValue(settings.sensorStatusMode) && settings.sensorStatusMode !== 'auto') ||
    STATUS_DETAIL_KEYS.some((key) => hasValue(settings[key]));
  const appearanceCustomized = isAppearanceCustomized(settings);
  const showAppearance = canShowSensorNumericStyle(primaryId, settings, entities);
  const actionCustomized = isActionCustomized(action) || settings.showControls === false;
  const automaticActionLabel = t('sensor.custom.autoAction').replace(
    '{action}',
    t(`sensor.custom.actionType.${hasAction ? resolvedActionType : 'more-info'}`)
  );
  const actionTypeLabels = {
    ...label('actionType', SENSOR_ACTION_TYPES),
    auto: automaticActionLabel,
  };
  const triggerHint = trigger === 'button' ? undefined : t(`sensor.custom.triggerHint.${trigger}`);

  return (
    <div className="space-y-4" data-testid="sensor-card-settings">
      <SettingsSection
        title={t('sensor.custom.content')}
        resetLabel={resetLabel}
        onReset={
          contentCustomized
            ? () => {
                resetFields(['showName', 'showIcon']);
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

      {showAppearance ? (
        <SettingsSection
          title={t('sensor.custom.appearance')}
          resetLabel={resetLabel}
          onReset={appearanceCustomized ? () => resetFields(APPEARANCE_KEYS) : undefined}
        >
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
      ) : null}

      <SettingsSection
        title={t('sensor.custom.action')}
        resetLabel={resetLabel}
        onReset={actionCustomized ? () => resetFields(['sensorAction', 'showControls']) : undefined}
      >
        <DropdownField
          icon={Zap}
          label={t('sensor.custom.actionType')}
          options={SENSOR_ACTION_TYPES}
          current={actionType}
          map={actionTypeLabels}
          onChange={changeActionType}
          t={t}
        />
        {showActionTarget ? (
          <EntityField
            label={t('sensor.custom.actionTarget')}
            value={actionTargetValue}
            options={actionTargets}
            entities={entities}
            onChange={(id) => updateAction({ entityId: id || null })}
            t={t}
          />
        ) : null}
        {hasAction ? (
          <>
            <ChoiceChips
              label={t('sensor.custom.trigger')}
              hint={triggerHint}
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
              label={t(
                trigger === 'button' ? 'sensor.custom.buttonText' : 'sensor.custom.textOnCard'
              )}
              value={action.label}
              onChange={(value) => {
                const nextAction = { ...action, label: value || null };
                delete nextAction.labelOn;
                delete nextAction.labelOff;
                save('sensorAction', nextAction);
              }}
              placeholder={trigger === 'button' ? t('sensor.custom.automatic') : ''}
            />
          </>
        ) : null}
      </SettingsSection>
    </div>
  );
}
