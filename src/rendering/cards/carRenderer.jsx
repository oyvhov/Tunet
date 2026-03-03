import { CarCard } from '../../components';

export function renderCarCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    getS,
    getA,
    getEntityImageUrl,
    callService,
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
      getA={getA}
      getEntityImageUrl={getEntityImageUrl}
      callService={callService}
      onOpen={() => {
        if (!editMode) setActiveCarModal(cardId);
      }}
      isMobile={isMobile}
      t={t}
    />
  );
}
