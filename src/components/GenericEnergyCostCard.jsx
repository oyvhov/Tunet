import EnergyCostCard from './EnergyCostCard';
import { Coins } from '../icons';
import { ICON_MAP } from '../iconMap';

const getEntityValue = (entity, decimals = 0) => {
  const state = entity?.state;
  if (!state || state === 'unavailable' || state === 'unknown') return '--';
  const value = parseFloat(state);
  if (Number.isFinite(value)) {
    return value.toFixed(decimals);
  }
  return state;
};

const formatMonthValue = (entity) => {
  const value = parseFloat(entity?.state);
  if (Number.isFinite(value)) return Math.round(value);
  return String(getEntityValue(entity));
};

export default function GenericEnergyCostCard({
  cardId,
  todayEntityId,
  monthEntityId,
  entities,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  decimals = 0,
  settings,
  t
}) {
  const isSmall = settings?.size === 'small';
  const todayEntity = todayEntityId ? entities[todayEntityId] : null;
  const monthEntity = monthEntityId ? entities[monthEntityId] : null;

  const name = customNames[cardId] || t('energyCost.title');
  const Icon = customIcons[cardId] ? ICON_MAP[customIcons[cardId]] : Coins;

  return (
    <EnergyCostCard
      dragProps={dragProps}
      controls={controls}
      cardStyle={cardStyle}
      editMode={editMode}
      name={name}
      Icon={Icon}
      todayValue={getEntityValue(todayEntity, decimals)}
      monthValue={formatMonthValue(monthEntity)}
      isSmall={isSmall}
      t={t}
    />
  );
}
