import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Title block shared by the full-page views (batteries, lights, rooms). */
export default function PageHeader({
  title,
  subtitle,
  leading,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="min-w-0">
          <h2 className="text-2xl font-light tracking-widest text-[var(--text-primary)] uppercase">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
