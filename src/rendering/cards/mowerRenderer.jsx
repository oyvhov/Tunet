import { MowerCard } from '../../components';
import { getSettings } from '../helpers';

export function renderMowerCard(mowerId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    getA,
    callService,
    setActiveMowerId,
    setShowMowerModal,
    isMobile,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, mowerId);
  const entityId = settings.entityId || mowerId;
  return (
    <MowerCard
      key={mowerId}
      mowerId={mowerId}
      entityId={entityId}
      dragProps={dragProps}
      controls={getControls(mowerId)}
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
        if (!editMode && setActiveMowerId && setShowMowerModal) {
          setActiveMowerId(entityId);
          setShowMowerModal(true);
        }
      }}
      isMobile={isMobile}
      t={t}
    />
  );
}
