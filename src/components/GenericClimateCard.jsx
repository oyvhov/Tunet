import ClimateCard from './ClimateCard';
import { ICON_MAP } from '../iconMap';

const isCoolingState = (entity) => {
  const action = entity?.attributes?.hvac_action;
  const state = entity?.state;
  return action === 'cooling' || state === 'cool';
};

const isHeatingState = (entity) => {
  const action = entity?.attributes?.hvac_action;
  const state = entity?.state;
  return action === 'heating' || state === 'heat';
};

export default function GenericClimateCard({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  onOpen,
  onSetTemperature,
  settings,
  t
}) {
  if (!entity || !entityId) return null;

  const isSmall = settings?.size === 'small';
  const currentTemp = entity.attributes?.current_temperature ?? '--';
  const targetTemp = entity.attributes?.temperature ?? '--';
  const fanMode = entity.attributes?.fan_mode ?? 'Auto';
  const fanModes = entity.attributes?.fan_modes || [];
  const showFan = Array.isArray(fanModes) && fanModes.length > 0;

  const name = customNames[cardId]
    || entity.attributes?.friendly_name
    || entityId;

  const Icon = customIcons[cardId] ? ICON_MAP[customIcons[cardId]] : null;

  return (
    <ClimateCard
      dragProps={dragProps}
      controls={controls}
      cardStyle={cardStyle}
      editMode={editMode}
      name={name}
      Icon={Icon}
      currentTemp={currentTemp}
      targetTemp={targetTemp}
      fanMode={fanMode}
      isCooling={isCoolingState(entity)}
      isHeating={isHeatingState(entity)}
      showFan={showFan}
      onOpen={onOpen}
      onSetTemperature={onSetTemperature}
      isSmall={isSmall}
      t={t}
    />
  );
}
