import { CarCard } from '../../components';

export function renderCarCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    getS,
    getEntityImageUrl,
    setActiveCarModal,
    isMobile,
    t,
  } = ctx;
  return (
    <CarCard
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
      customIcons={customIcons}
      getS={getS}
      getEntityImageUrl={getEntityImageUrl}
      onOpen={() => {
        if (!editMode) setActiveCarModal(cardId);
      }}
      isMobile={isMobile}
      t={t}
    />
  );
}
