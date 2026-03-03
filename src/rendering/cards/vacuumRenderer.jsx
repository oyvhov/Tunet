import { VacuumCard } from '../../components';

export function renderVacuumCard(vacuumId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    getA,
    callService,
    setActiveVacuumId,
    setShowVacuumModal,
    isMobile,
    t,
  } = ctx;
  return (
    <VacuumCard
      key={vacuumId}
      vacuumId={vacuumId}
      dragProps={dragProps}
      controls={getControls(vacuumId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      cardSettings={cardSettings}
      settingsKey={settingsKey}
      customNames={customNames}
      customIcons={customIcons}
      getA={getA}
      callService={callService}
      onOpen={() => {
        if (!editMode) {
          setActiveVacuumId(vacuumId);
          setShowVacuumModal(true);
        }
      }}
      isMobile={isMobile}
      t={t}
    />
  );
}
