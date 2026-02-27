import React from 'react';
import { HardDrive } from 'lucide-react';

export function EmbyLogo(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11,2L6,7L7,8L2,13L7,18L8,17L13,22L18,17L17,16L22,11L17,6L16,7L11,2M10,8.5L16,12L10,15.5V8.5Z" />
    </svg>
  );
}

export function JellyfinLogo(props) {
  return (
    <svg viewBox="0 0 512 512" {...props}>
      <defs>
        <linearGradient
          id="jellyfin-grad"
          x1="126.15"
          y1="219.32"
          x2="457.68"
          y2="410.73"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#aa5cc3" />
          <stop offset="100%" stopColor="#00a4dc" />
        </linearGradient>
      </defs>
      <path
        d="M190.56 329.07c8.63 17.3 122.4 17.12 130.93 0 8.52-17.1-47.9-119.78-65.46-119.8-17.57 0-74.1 102.5-65.47 119.8z"
        fill="url(#jellyfin-grad)"
      />
      <path
        d="M58.75 417.03c25.97 52.15 368.86 51.55 394.55 0S308.93 56.08 256.03 56.08c-52.92 0-223.25 308.8-197.28 360.95zm68.04-45.25c-17.02-34.17 94.6-236.5 129.26-236.5 34.67 0 146.1 202.7 129.26 236.5-16.83 33.8-241.5 34.17-258.52 0z"
        fill="url(#jellyfin-grad)"
      />
    </svg>
  );
}

export function NRKLogo(props) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
      {/* NRK logo - stylized N shape */}
      <path
        d="M 15 20 L 35 70 L 35 20 M 65 20 L 45 70 L 45 20 M 55 20 L 75 70 L 75 20"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function getServerInfo(id) {
  if (!id || typeof id !== 'string')
    return {
      name: 'Media',
      icon: HardDrive,
      color: 'text-gray-400',
      bg: 'bg-white/5',
      border: 'border-white/10',
    };
  if (id.includes('nrk'))
    return {
      name: 'NRK',
      icon: NRKLogo,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    };
  if (id.includes('jellyfin'))
    return {
      name: 'Jellyfin',
      icon: JellyfinLogo,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    };
  if (id.includes('emby'))
    return {
      name: 'Emby',
      icon: EmbyLogo,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    };
  return {
    name: 'Media',
    icon: HardDrive,
    color: 'text-gray-400',
    bg: 'bg-white/5',
    border: 'border-white/10',
  };
}
