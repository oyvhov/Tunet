import { MediaPlayerCard } from '../../components';
import { renderMissingEntityWhenReady } from '../helpers';

export function renderMediaPlayerCard(mpId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    customNames,
    getA,
    getEntityImageUrl,
    callService,
    isMediaActive,
    openMediaModal,
    cardSettings,
    t,
  } = ctx;
  if (!entities[mpId]) {
    return renderMissingEntityWhenReady(ctx, {
      cardId: mpId,
      dragProps,
      controls: getControls(mpId),
      cardStyle,
      missingEntityId: mpId,
      t,
    });
  }
  return (
    <MediaPlayerCard
      key={mpId}
      mpId={mpId}
      cardId={mpId}
      dragProps={dragProps}
      controls={getControls(mpId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      customNames={customNames}
      getA={getA}
      getEntityImageUrl={getEntityImageUrl}
      callService={callService}
      isMediaActive={isMediaActive}
      onOpen={openMediaModal}
      t={t}
      cardSettings={cardSettings}
      settingsKey={settingsKey}
    />
  );
}
