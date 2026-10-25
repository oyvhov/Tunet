import type { ReactNode } from 'react';

interface BatteryBarProps {
  variant?: 'glass' | 'solid' | 'outline';
  showNub?: boolean;
  isMobile?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Battery-shaped container for header content.
 * Pure presentational — pill shape with optional terminal nub.
 */
export default function BatteryBar({
  variant = 'glass',
  showNub = true,
  isMobile = false,
  className = '',
  children,
}: BatteryBarProps) {
  const variantClass =
    variant === 'solid'
      ? 'battery-bar--solid'
      : variant === 'outline'
        ? 'battery-bar--outline'
        : 'battery-bar--glass';

  return (
    <div
      className={`battery-bar ${variantClass} ${isMobile ? 'battery-bar--mobile' : ''} ${className}`}
    >
      <div className="battery-bar__body">{children}</div>
      {showNub && <div className="battery-bar__nub" />}
    </div>
  );
}
