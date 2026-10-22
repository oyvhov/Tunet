import { FanCard } from '../../components';
import { getSettings } from '../helpers';

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
  const settings = getSettings(cardSettings, settingsKey, fanId);
  const entityId = settings.entityId || fanId;
  return (
    <FanCard
      key={fanId}
      fanId={fanId}
      entityId={entityId}
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
        if (!editMode) setShowFanModal(entityId);
      }}
      isMobile={isMobile}
      t={t}
    />
  );
}
