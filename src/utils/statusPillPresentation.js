export const DEFAULT_PILL_ANIMATION_PRESET = 'pulse-soft';

export const PILL_ANIMATION_PRESET_OPTIONS = [
  {
    id: 'none',
    labelKey: 'statusPills.animationNone',
    fallbackLabel: 'None',
  },
  {
    id: 'pulse-soft',
    labelKey: 'statusPills.animationPulseSoft',
    fallbackLabel: 'Pulse soft',
  },
  {
    id: 'pulse-medium',
    labelKey: 'statusPills.animationPulseMedium',
    fallbackLabel: 'Pulse medium',
  },
  {
    id: 'rotate-slow',
    labelKey: 'statusPills.animationRotateSlow',
    fallbackLabel: 'Rotate slow',
  },
  {
    id: 'rotate-medium-slow',
    labelKey: 'statusPills.animationRotateMediumSlow',
    fallbackLabel: 'Rotate medium slow',
  },
];

const PILL_ANIMATION_PRESET_IDS = new Set(PILL_ANIMATION_PRESET_OPTIONS.map((preset) => preset.id));

export const PILL_COLOR_PRESETS = [
  {
    id: 'accent',
    bg: 'color-mix(in srgb, var(--accent-color) 18%, transparent)',
    icon: 'text-[var(--accent-color)]',
    labelKey: 'statusPills.colorAccent',
    fallbackLabel: 'Accent',
  },
  {
    id: 'blue',
    bg: 'var(--status-info-bg)',
    icon: 'text-[var(--status-info-fg)]',
    labelKey: 'statusPills.colorBlue',
    fallbackLabel: 'Blue',
  },
  {
    id: 'cyan',
    bg: 'rgba(34, 211, 238, 0.18)',
    icon: 'text-cyan-400',
    labelKey: 'statusPills.colorCyan',
    fallbackLabel: 'Cyan',
  },
  {
    id: 'teal',
    bg: 'rgba(20, 184, 166, 0.18)',
    icon: 'text-teal-400',
    labelKey: 'statusPills.colorTeal',
    fallbackLabel: 'Teal',
  },
  {
    id: 'green',
    bg: 'var(--status-success-bg)',
    icon: 'text-[var(--status-success-fg)]',
    labelKey: 'statusPills.colorGreen',
    fallbackLabel: 'Green',
  },
  {
    id: 'emerald',
    bg: 'rgba(16, 185, 129, 0.18)',
    icon: 'text-emerald-400',
    labelKey: 'statusPills.colorEmerald',
    fallbackLabel: 'Emerald',
  },
  {
    id: 'lime',
    bg: 'rgba(132, 204, 22, 0.18)',
    icon: 'text-lime-400',
    labelKey: 'statusPills.colorLime',
    fallbackLabel: 'Lime',
  },
  {
    id: 'yellow',
    bg: 'var(--status-warning-bg)',
    icon: 'text-[var(--status-warning-fg)]',
    labelKey: 'statusPills.colorYellow',
    fallbackLabel: 'Yellow',
  },
  {
    id: 'amber',
    bg: 'rgba(245, 158, 11, 0.18)',
    icon: 'text-amber-400',
    labelKey: 'statusPills.colorAmber',
    fallbackLabel: 'Amber',
  },
  {
    id: 'orange',
    bg: 'rgba(249, 115, 22, 0.18)',
    icon: 'text-orange-400',
    labelKey: 'statusPills.colorOrange',
    fallbackLabel: 'Orange',
  },
  {
    id: 'red',
    bg: 'var(--status-error-bg)',
    icon: 'text-[var(--status-error-fg)]',
    labelKey: 'statusPills.colorRed',
    fallbackLabel: 'Red',
  },
  {
    id: 'rose',
    bg: 'rgba(244, 63, 94, 0.18)',
    icon: 'text-rose-400',
    labelKey: 'statusPills.colorRose',
    fallbackLabel: 'Rose',
  },
  {
    id: 'pink',
    bg: 'rgba(236, 72, 153, 0.18)',
    icon: 'text-pink-400',
    labelKey: 'statusPills.colorPink',
    fallbackLabel: 'Pink',
  },
  {
    id: 'purple',
    bg: 'rgba(168, 85, 247, 0.18)',
    icon: 'text-purple-400',
    labelKey: 'statusPills.colorPurple',
    fallbackLabel: 'Purple',
  },
  {
    id: 'indigo',
    bg: 'rgba(99, 102, 241, 0.18)',
    icon: 'text-indigo-400',
    labelKey: 'statusPills.colorIndigo',
    fallbackLabel: 'Indigo',
  },
  {
    id: 'neutral',
    bg: 'rgba(148, 163, 184, 0.18)',
    icon: 'text-slate-300',
    labelKey: 'statusPills.colorNeutral',
    fallbackLabel: 'Neutral',
  },
];

export function normalizePillAnimationPreset(pillOrPreset) {
  const rawPreset =
    typeof pillOrPreset === 'string' ? pillOrPreset : pillOrPreset?.animationPreset;

  if (typeof rawPreset === 'string' && PILL_ANIMATION_PRESET_IDS.has(rawPreset)) {
    return rawPreset;
  }

  if (typeof pillOrPreset === 'object' && pillOrPreset?.animated === false) {
    return 'none';
  }

  return DEFAULT_PILL_ANIMATION_PRESET;
}

export function getPillAnimationConfig(pillOrPreset, { active }) {
  const preset = normalizePillAnimationPreset(pillOrPreset);

  if (!active || preset === 'none') {
    return {
      preset,
      wrapperClass: '',
      wrapperStyle: undefined,
      iconClass: '',
      iconStyle: undefined,
    };
  }

  switch (preset) {
    case 'pulse-soft':
      return {
        preset,
        wrapperClass: 'animate-pulse',
        wrapperStyle: { animationDuration: '3.2s' },
        iconClass: '',
        iconStyle: undefined,
      };
    case 'pulse-medium':
      return {
        preset,
        wrapperClass: 'animate-pulse',
        wrapperStyle: { animationDuration: '2.2s' },
        iconClass: '',
        iconStyle: undefined,
      };
    case 'rotate-slow':
      return {
        preset,
        wrapperClass: '',
        wrapperStyle: undefined,
        iconClass: 'animate-spin',
        iconStyle: { animationDuration: '12s' },
      };
    case 'rotate-medium-slow':
      return {
        preset,
        wrapperClass: '',
        wrapperStyle: undefined,
        iconClass: 'animate-spin',
        iconStyle: { animationDuration: '8s' },
      };
    default:
      return {
        preset,
        wrapperClass: '',
        wrapperStyle: undefined,
        iconClass: '',
        iconStyle: undefined,
      };
  }
}