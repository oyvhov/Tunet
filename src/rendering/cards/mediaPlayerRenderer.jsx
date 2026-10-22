import { MediaPlayerCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

export function renderMediaPlayerCard(mpId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    customNames,
    customIcons,
    getA,
    getEntityImageUrl,
    callService,
    isMediaActive,
    openMediaModal,
    cardSettings,
    isMobile,
    isFullWidthMobileCard,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, mpId);
  const entityId = settings.entityId || mpId;
  if (!entities[entityId]) {
    return renderMissingEntityWhenReady(ctx, {
      cardId: mpId,
      dragProps,
      controls: getControls(mpId),
      cardStyle,
      missingEntityId: entityId,
      t,
    });
  }
  return (
    <MediaPlayerCard
      key={mpId}
      mpId={entityId}
      cardId={mpId}
      dragProps={dragProps}
      controls={getControls(mpId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      getA={getA}
      getEntityImageUrl={getEntityImageUrl}
      callService={callService}
      isMediaActive={isMediaActive}
      onOpen={openMediaModal}
      isMobile={isMobile}
      isFullWidthMobile={isFullWidthMobileCard}
      t={t}
      cardSettings={cardSettings}
      settingsKey={settingsKey}
    />
  );
}
