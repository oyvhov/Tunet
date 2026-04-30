import { LockCard, MissingEntityCard } from '../../components';
import { getSettings } from '../helpers';

export function renderLockCard(lockId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities = {},
    conn,
    editMode,
    cardSettings = {},
    customNames,
    customIcons,
    getA,
    callService,
    setShowSensorInfoModal,
    isMobile,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, lockId);
  const entityId = lockId.startsWith('lock.') ? lockId : settings.lockId;
  const entity = entityId ? entities[entityId] : null;

  if (!entity || !entityId) {
    return (
      <MissingEntityCard
        key={lockId}
        cardId={lockId}
        dragProps={dragProps}
        controls={getControls(lockId)}
        cardStyle={cardStyle}
        missingEntityId={entityId || lockId}
        t={t}
      />
    );
  }

  return (
    <LockCard
      key={lockId}
      lockId={entityId}
      dragProps={dragProps}
      controls={getControls(lockId)}
      cardStyle={cardStyle}
      entities={entities}
      conn={conn}
      editMode={editMode}
      cardSettings={cardSettings}
      settingsKey={settingsKey}
      customNames={customNames}
      customIcons={customIcons}
      getA={getA}
      callService={callService}
      onOpen={() => setShowSensorInfoModal(entityId)}
      isMobile={isMobile}
      t={t}
    />
  );
}
