import { Moon, Sun } from 'lucide-react';

export const themes = {
  dark: {
    label: 'Mørk',
    icon: Moon,
    colors: {
      '--bg-primary': '#02040a',
      '--bg-secondary': '#0d0d0f',
      '--bg-gradient-from': '#0f172a',
      '--bg-gradient-to': '#0a0a0c',
      '--text-primary': '#ffffff',
      '--text-secondary': '#9ca3af', // gray-400
      '--text-muted': 'rgba(156, 163, 175, 0.6)',
      '--card-bg': 'rgba(15, 23, 42, 0.6)',
      '--card-border': 'rgba(255, 255, 255, 0.04)',
      '--glass-bg': 'rgba(255, 255, 255, 0.05)',
      '--glass-bg-hover': 'rgba(255, 255, 255, 0.1)',
      '--glass-border': 'rgba(255, 255, 255, 0.1)',
      '--modal-bg': '#0d0d0f',
      '--modal-backdrop': 'rgba(0,0,0,0.7)',
      '--accent-color': '#3b82f6', // blue-500
      '--accent-bg': 'rgba(59, 130, 246, 0.1)',
    }
  },
  light: {
    label: 'Lys',
    icon: Sun,
    colors: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8fafc',
      '--bg-gradient-from': '#f1f5f9',
      '--bg-gradient-to': '#ffffff',
      '--text-primary': '#020617',
      '--text-secondary': '#475569',
      '--text-muted': '#94a3b8',
      '--card-bg': '#ffffff',
      '--card-border': '#e2e8f0',
      '--glass-bg': '#f1f5f9',
      '--glass-bg-hover': '#e2e8f0',
      '--glass-border': '#cbd5e1',
      '--modal-bg': '#ffffff',
      '--modal-backdrop': 'rgba(0,0,0,0.2)',
      '--accent-color': '#2563eb', // blue-600
      '--accent-bg': '#eff6ff',
    }
  },
  graphite: {
    label: 'Grafitt',
    icon: Moon,
    colors: {
      '--bg-primary': '#0f1014',
      '--bg-secondary': '#18181f',
      '--bg-gradient-from': '#18181f',
      '--bg-gradient-to': '#0a0a0c',
      '--text-primary': '#e4e4e7',
      '--text-secondary': '#a1a1aa',
      '--text-muted': '#52525b',
      '--card-bg': '#18181f',
      '--card-border': '#27272a',
      '--glass-bg': 'rgba(24, 24, 31, 0.6)',
      '--glass-bg-hover': 'rgba(39, 39, 42, 0.6)',
      '--glass-border': 'rgba(255, 255, 255, 0.08)',
      '--modal-bg': '#0f1014',
      '--modal-backdrop': 'rgba(0,0,0,0.85)',
      '--accent-color': '#22d3ee', // cyan-400
      '--accent-bg': 'rgba(34, 211, 238, 0.1)',
    }
  },
  amethyst: {
    label: 'Ametyst',
    icon: Moon,
    colors: {
      '--bg-primary': '#1e1b2e', // Deep purple/slate
      '--bg-secondary': '#2d2a42', // Lighter purple
      '--bg-gradient-from': '#2d2a42',
      '--bg-gradient-to': '#13111c',
      '--text-primary': '#f3e8ff', // lilac white
      '--text-secondary': '#d8b4fe', // light purple
      '--text-muted': '#7e6c8f',
      '--card-bg': 'rgba(45, 42, 66, 0.6)',
      '--card-border': 'rgba(216, 180, 254, 0.15)',
      '--glass-bg': 'rgba(45, 42, 66, 0.4)',
      '--glass-bg-hover': 'rgba(216, 180, 254, 0.08)',
      '--glass-border': 'rgba(216, 180, 254, 0.2)',
      '--modal-bg': '#1e1b2e',
      '--modal-backdrop': 'rgba(19, 17, 28, 0.9)',
      '--accent-color': '#d946ef', // fuchsia-500
      '--accent-bg': 'rgba(217, 70, 239, 0.15)',
    }
  },
  flat: {
    label: 'Flat',
    icon: Moon,
    colors: {
      '--bg-primary': '#0b0f14',
      '--bg-secondary': '#0d1117',
      '--bg-gradient-from': '#0b0f14',
      '--bg-gradient-to': '#0b0f14',
      '--text-primary': '#f3f4f6',
      '--text-secondary': '#9ca3af',
      '--text-muted': 'rgba(156, 163, 175, 0.65)',
      '--card-bg': '#0f141b',
      '--card-border': 'transparent',
      '--glass-bg': '#10161e',
      '--glass-bg-hover': '#121a24',
      '--glass-border': 'transparent',
      '--modal-bg': '#0f141b',
      '--modal-backdrop': 'rgba(0,0,0,0.7)',
      '--accent-color': '#38bdf8', // sky-400
      '--accent-bg': 'rgba(56, 189, 248, 0.12)',
      '--accent-strong': '#0ea5e9',
      '--accent-soft': 'rgba(14, 165, 233, 0.18)',

      '--success-color': '#22c55e',
      '--success-bg': 'rgba(34, 197, 94, 0.12)',
      '--warning-color': '#f59e0b',
      '--warning-bg': 'rgba(245, 158, 11, 0.12)',
      '--danger-color': '#ef4444',
      '--danger-bg': 'rgba(239, 68, 68, 0.12)',
      '--info-color': '#38bdf8',
      '--info-bg': 'rgba(56, 189, 248, 0.12)',

      '--selection-bg': 'rgba(56, 189, 248, 0.25)',
      '--selection-text': '#f8fafc',

      // Extra flat theme tokens
      '--surface-1': '#0f141b',
      '--surface-2': '#0c1118',
      '--surface-3': '#0b0f14',
      '--divider': 'transparent',
      '--shadow-soft': 'none',
      '--shadow-hard': 'none',
      '--focus-ring': '0 0 0 2px rgba(56, 189, 248, 0.35)',
      '--chip-bg': '#0e131a',
      '--chip-border': 'transparent',
      '--chip-text': '#cbd5f5',
      '--input-bg': '#0c1218',
      '--input-border': 'transparent',
      '--input-text': '#e5e7eb',
      '--input-placeholder': '#6b7280',
      '--ring': 'rgba(56, 189, 248, 0.35)',
      '--ring-strong': 'rgba(56, 189, 248, 0.6)',
      '--chart-1': '#38bdf8',
      '--chart-2': '#22c55e',
      '--chart-3': '#a855f7',
      '--chart-4': '#f59e0b',
      '--chart-5': '#ef4444'
    }
  }
};
