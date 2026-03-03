import { AlarmCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

export function renderAlarmCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    callService,
    setShowAlarmModal,
    setShowAlarmActionModal,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const entityId = settings.alarmId;
  const entity = entityId ? entities[entityId] : null;

  if (!entity || !entityId) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: entityId || cardId,
      t,
    });
  }

  const runAction = async (action, code) => {
    const actionToService = {
      arm_home: 'alarm_arm_home',
      arm_away: 'alarm_arm_away',
      arm_night: 'alarm_arm_night',
      arm_vacation: 'alarm_arm_vacation',
      arm_custom_bypass: 'alarm_arm_custom_bypass',
      disarm: 'alarm_disarm',
    };
    const service = actionToService[action];
    if (!service) return;
    const payload = { entity_id: entityId };
    if (typeof code === 'string' && code.trim()) {
      payload.code = code.trim();
    }
    await callService('alarm_control_panel', service, payload);
  };

  return (
    <AlarmCard
      key={cardId}
      cardId={cardId}
      entityId={entityId}
      entity={entity}
      settings={settings}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      onOpen={() => setShowAlarmModal(cardId)}
      onOpenAction={(actionKey) => setShowAlarmActionModal({ cardId, actionKey })}
      onAction={runAction}
      t={t}
    />
  );
}
