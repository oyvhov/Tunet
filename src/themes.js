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
  }
};
