import { SensorCard } from '../../components';
import { Activity, Hash, ToggleRight, Power } from '../../icons';
import { getIconComponent } from '../../icons';
import { getSettings, renderMissingEntityWhenReady, withEditModeGuard } from '../helpers';

/**
 * @param {string} cardId
 * @param {Record<string, any>} dragProps
 * @param {(id: string) => any} getControls
 * @param {Record<string, any>} cardStyle
 * @param {string} settingsKey
 * @param {Record<string, any>} ctx
 */
export function renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    conn,
    cardSettings,
    customNames,
    customIcons,
    getA,
    callService,
    setShowSensorInfoModal,
    t,
  } = ctx;
  const entity = entities[cardId];

  if (!entity) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: cardId,
      t,
    });
  }

  const settings = getSettings(cardSettings, settingsKey, cardId);
  const name = customNames[cardId] || getA(cardId, 'friendly_name', cardId);
  const domain = cardId.split('.')[0];
  const defaultIcons = {
    sensor: Activity,
    input_number: Hash,
    input_boolean: ToggleRight,
    switch: Power,
    default: Activity,
  };
  const DefaultIcon = defaultIcons[domain] || defaultIcons.default;
  const sensorIconName = customIcons[cardId] || entity?.attributes?.icon;
  const Icon = sensorIconName ? getIconComponent(sensorIconName) || DefaultIcon : DefaultIcon;

  const handleControl = (action) => {
    if (domain === 'input_number') {
      if (action === 'increment') callService('input_number', 'increment', { entity_id: cardId });
      if (action === 'decrement') callService('input_number', 'decrement', { entity_id: cardId });
    }
    if (
      domain === 'input_boolean' ||
      domain === 'switch' ||
      domain === 'light' ||
      domain === 'automation'
    ) {
      if (action === 'toggle') callService(domain, 'toggle', { entity_id: cardId });
    }
    if (domain === 'script' || domain === 'scene') {
      if (action === 'turn_on') callService(domain, 'turn_on', { entity_id: cardId });
    }
  };

  return (
    <SensorCard
      key={cardId}
      entity={entity}
      entities={entities}
      conn={conn}
      settings={settings}
      dragProps={dragProps}
      cardStyle={cardStyle}
      editMode={editMode}
      controls={getControls(cardId)}
      Icon={Icon}
      name={name}
      t={t}
      onControl={handleControl}
      onOpen={withEditModeGuard(editMode, () => setShowSensorInfoModal(cardId))}
    />
  );
}
