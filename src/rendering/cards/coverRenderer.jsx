import { CoverCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

export function renderCoverCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    callService,
    setShowCoverModal,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const entityId = settings.coverId;
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
    <CoverCard
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
      onOpen={() => setShowCoverModal(cardId)}
      callService={callService}
      settings={settings}
      t={t}
    />
  );
}
