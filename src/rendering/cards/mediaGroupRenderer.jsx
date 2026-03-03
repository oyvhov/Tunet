import { MediaGroupCard } from '../../components';

export function renderMediaGroupCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    getA,
    getEntityImageUrl,
    callService,
    isMediaActive,
    saveCardSetting,
    openMediaModal,
    t,
  } = ctx;
  return (
    <MediaGroupCard
      key={cardId}
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      cardSettings={cardSettings}
      settingsKey={settingsKey}
      customNames={customNames}
      getA={getA}
      getEntityImageUrl={getEntityImageUrl}
      callService={callService}
      isMediaActive={isMediaActive}
      saveCardSetting={saveCardSetting}
      onOpen={openMediaModal}
      t={t}
    />
  );
}
