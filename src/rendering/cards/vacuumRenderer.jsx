import { VacuumCard } from '../../components';
import { getSettings } from '../helpers';

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
  const settings = getSettings(cardSettings, settingsKey, vacuumId);
  const entityId = settings.entityId || vacuumId;
  return (
    <VacuumCard
      key={vacuumId}
      vacuumId={vacuumId}
      entityId={entityId}
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
