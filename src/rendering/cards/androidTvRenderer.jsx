import { GenericAndroidTVCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

export function renderGenericAndroidTVCard(
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
    getA,
    getEntityImageUrl,
    setShowAndroidTVModal,
    callService,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const mediaPlayerId = settings.mediaPlayerId;
  const remoteId = settings.remoteId;
  const linkedMediaPlayers = settings.linkedMediaPlayers;

  if (!mediaPlayerId || !entities[mediaPlayerId]) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: mediaPlayerId || cardId,
      t,
    });
  }

  return (
    <GenericAndroidTVCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      entities={entities}
      mediaPlayerId={mediaPlayerId}
      remoteId={remoteId}
      linkedMediaPlayers={linkedMediaPlayers}
      size={settings.size}
      getA={getA}
      getEntityImageUrl={getEntityImageUrl}
      onOpen={() => setShowAndroidTVModal(cardId)}
      customNames={customNames}
      t={t}
      callService={callService}
    />
  );
}
