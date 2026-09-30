import { SensorCard } from '../../components';
import { resolveSensorIcon } from '../../components/cards/sensorIcon';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

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
    isMobile,
    setShowSensorInfoModal,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const entityId = settings.entityId || cardId;
  const entity = entities[entityId];

  if (!entity) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: entityId,
      t,
    });
  }

  const name = customNames[cardId] || getA(entityId, 'friendly_name', entityId);
  const domain = entityId.split('.')[0];
  const Icon = resolveSensorIcon(entityId, customIcons[cardId], entity);

  const handleControl = (action, value) => {
    if (editMode || !conn) return;
    if (domain === 'input_number') {
      if (action === 'increment')
        return callService('input_number', 'increment', { entity_id: entityId });
      if (action === 'decrement')
        return callService('input_number', 'decrement', { entity_id: entityId });
    }
    if (
      domain === 'input_boolean' ||
      domain === 'switch' ||
      domain === 'light' ||
      domain === 'automation'
    ) {
      if (action === 'toggle') return callService(domain, 'toggle', { entity_id: entityId });
    }
    if (domain === 'script' || domain === 'scene') {
      if (action === 'turn_on') return callService(domain, 'turn_on', { entity_id: entityId });
    }
    if (domain === 'select' || domain === 'input_select') {
      if (action === 'select_option' && value) {
        return callService(domain, 'select_option', { entity_id: entityId, option: value });
      }
    }
  };

  return (
    <SensorCard
      key={cardId}
      entity={entity}
      entities={entities}
      conn={conn}
      callService={callService}
      settings={settings}
      dragProps={dragProps}
      cardStyle={cardStyle}
      editMode={editMode}
      controls={getControls(cardId)}
      Icon={Icon}
      name={name}
      isMobile={isMobile}
      t={t}
      onControl={handleControl}
      onOpen={(target) => {
        if (!editMode)
          setShowSensorInfoModal({
            entityId: typeof target === 'string' ? target : entityId,
            cardId,
          });
      }}
    />
  );
}
