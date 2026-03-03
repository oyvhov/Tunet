import { GenericClimateCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

export function renderGenericClimateCard(
  cardId,
  dragProps,
  getControls,
  cardStyle,
  settingsKey,
  ctx
) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    callService,
    setActiveClimateEntityModal,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const entityId = settings.climateId;
  const entity = entityId ? entities[entityId] : null;

  if (!entity || !entityId) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: entityId || cardId,
      t,
    });
  }

  return (
    <GenericClimateCard
      key={cardId}
      cardId={cardId}
      entityId={entityId}
      entity={entity}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      onOpen={() => setActiveClimateEntityModal(entityId)}
      onSetTemperature={(temp) =>
        callService('climate', 'set_temperature', { entity_id: entityId, temperature: temp })
      }
      settings={settings}
      t={t}
    />
  );
}
