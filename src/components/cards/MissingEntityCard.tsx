import { memo } from 'react';
import { AlertTriangle } from '../../icons';
import type { CardBaseProps } from '../../types/dashboard';

export interface MissingEntityCardProps extends Pick<
  CardBaseProps,
  'cardId' | 'dragProps' | 'controls' | 'cardStyle' | 't'
> {
  label?: string;
  missingEntityId?: string;
}

/**
 * Placeholder card shown in edit mode when an entity is missing or broken.
 */
const MissingEntityCard = memo(function MissingEntityCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  label,
  missingEntityId,
  t,
}: MissingEntityCardProps) {
  return (
    <div
      key={cardId}
      {...dragProps}
      className="touch-feedback relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[var(--status-error-border)] bg-[var(--card-bg)] p-4"
      style={cardStyle}
    >
      {controls}
      <AlertTriangle className="mb-2 h-8 w-8 text-[var(--status-error-fg)] opacity-80" />
      <p className="text-center text-xs font-bold tracking-widest text-[var(--status-error-fg)] uppercase">
        {label || t('common.missingEntity')}
      </p>
      <p className="mt-1 text-center text-[10px] tracking-widest text-[var(--status-error-fg)]/70 uppercase">
        {t('common.missingEntityId')}
      </p>
      <p className="mt-1 line-clamp-2 text-center font-mono text-[10px] break-all text-[var(--status-error-fg)]/80">
        {missingEntityId || cardId}
      </p>
    </div>
  );
});

export default MissingEntityCard;
