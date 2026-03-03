import { GenericNordpoolCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

export function renderNordpoolCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    saveCardSetting,
    setShowNordpoolModal,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const entity = entities[settings.nordpoolId];
  if (!entity) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: settings.nordpoolId || cardId,
      t,
    });
  }

  return (
    <GenericNordpoolCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      entity={entity}
      customNames={customNames}
      customIcons={customIcons}
      onOpen={() => setShowNordpoolModal(cardId)}
      settings={settings}
      saveCardSetting={saveCardSetting}
      t={t}
    />
  );
}
