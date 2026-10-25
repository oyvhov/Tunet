import { Activity, Hash, ToggleRight, Power, ListChecks, getIconComponent } from '../../icons';
import type { IconComponent } from '../../icons/iconMap';

const DEFAULT_SENSOR_ICONS: Record<string, IconComponent> = {
  sensor: Activity,
  input_number: Hash,
  input_boolean: ToggleRight,
  switch: Power,
  select: ListChecks,
  input_select: ListChecks,
};

export function resolveSensorIcon(
  entityId?: string | null,
  customIcon?: string | null,
  entity?: { attributes?: { icon?: unknown } } | null
): IconComponent {
  const fallback = DEFAULT_SENSOR_ICONS[entityId?.split('.')[0] ?? ''] || Activity;
  const iconName = customIcon || (entity?.attributes?.icon as string | undefined);
  return iconName ? getIconComponent(iconName) || fallback : fallback;
}
