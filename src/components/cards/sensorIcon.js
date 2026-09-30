import { Activity, Hash, ToggleRight, Power, ListChecks, getIconComponent } from '../../icons';

const DEFAULT_SENSOR_ICONS = {
  sensor: Activity,
  input_number: Hash,
  input_boolean: ToggleRight,
  switch: Power,
  select: ListChecks,
  input_select: ListChecks,
};

export function resolveSensorIcon(entityId, customIcon, entity) {
  const fallback = DEFAULT_SENSOR_ICONS[entityId?.split('.')[0]] || Activity;
  const iconName = customIcon || entity?.attributes?.icon;
  return iconName ? getIconComponent(iconName) || fallback : fallback;
}
