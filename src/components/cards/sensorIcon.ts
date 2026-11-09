import {
  Activity,
  AlertTriangle,
  Battery,
  BatteryCharging,
  Clock,
  CloudRain,
  Coins,
  DoorOpen,
  Droplets,
  Eye,
  Flame,
  Hash,
  Lightbulb,
  ListChecks,
  Lock,
  Play,
  Plug,
  Power,
  Snowflake,
  Sun,
  Thermometer,
  ToggleRight,
  UserCheck,
  Wifi,
  Wind,
  Workflow,
  Zap,
  getIconComponent,
} from '../../icons';
import type { IconComponent } from '../../icons/iconMap';

const DEFAULT_SENSOR_ICONS: Record<string, IconComponent> = {
  sensor: Activity,
  input_number: Hash,
  input_boolean: ToggleRight,
  switch: Power,
  select: ListChecks,
  input_select: ListChecks,
  automation: Workflow,
  script: Play,
};

const DEVICE_CLASS_ICONS: Record<string, IconComponent> = {
  battery: Battery,
  battery_charging: BatteryCharging,
  temperature: Thermometer,
  heat: Thermometer,
  cold: Snowflake,
  humidity: Droplets,
  moisture: Droplets,
  water: Droplets,
  power: Zap,
  energy: Zap,
  current: Zap,
  voltage: Zap,
  apparent_power: Zap,
  reactive_power: Zap,
  power_factor: Zap,
  illuminance: Sun,
  light: Lightbulb,
  motion: Eye,
  occupancy: UserCheck,
  presence: UserCheck,
  door: DoorOpen,
  garage_door: DoorOpen,
  opening: DoorOpen,
  window: DoorOpen,
  gas: Flame,
  smoke: Flame,
  carbon_dioxide: Wind,
  carbon_monoxide: Wind,
  aqi: Wind,
  pm1: Wind,
  pm10: Wind,
  pm25: Wind,
  volatile_organic_compounds: Wind,
  wind_speed: Wind,
  precipitation: CloudRain,
  precipitation_intensity: CloudRain,
  lock: Lock,
  plug: Plug,
  outlet: Plug,
  connectivity: Wifi,
  signal_strength: Wifi,
  monetary: Coins,
  duration: Clock,
  timestamp: Clock,
  problem: AlertTriangle,
  safety: AlertTriangle,
  tamper: AlertTriangle,
};

export function resolveSensorIcon(
  entityId?: string | null,
  customIcon?: string | null,
  entity?: { attributes?: { icon?: unknown; device_class?: unknown } } | null
): IconComponent {
  const deviceClass = entity?.attributes?.device_class;
  const fallback =
    (typeof deviceClass === 'string' && DEVICE_CLASS_ICONS[deviceClass]) ||
    DEFAULT_SENSOR_ICONS[entityId?.split('.')[0] ?? ''] ||
    Activity;
  const iconName = customIcon || (entity?.attributes?.icon as string | undefined);
  return iconName ? getIconComponent(iconName) || fallback : fallback;
}
