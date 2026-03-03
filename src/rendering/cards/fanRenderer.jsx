import { FanCard } from '../../components';

export function renderFanCard(fanId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    getA,
    callService,
    setShowFanModal,
    isMobile,
    t,
  } = ctx;
  return (
    <FanCard
      key={fanId}
      fanId={fanId}
      dragProps={dragProps}
      controls={getControls(fanId)}
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
        if (!editMode) setShowFanModal(fanId);
      }}
      isMobile={isMobile}
      t={t}
    />
  );
}
