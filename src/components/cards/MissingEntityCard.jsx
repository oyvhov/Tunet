import { AlertTriangle } from '../../icons';

/**
 * Placeholder card shown in edit mode when an entity is missing or broken.
 */
export default function MissingEntityCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  label,
  missingEntityId,
  t,
}) {
  return (
    <div
      key={cardId}
      {...dragProps}
      className="touch-feedback relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-red-500/50 bg-[var(--card-bg)] p-4"
      style={cardStyle}
    >
      {controls}
      <AlertTriangle className="mb-2 h-8 w-8 text-red-500 opacity-80" />
      <p className="text-center text-xs font-bold tracking-widest text-red-500 uppercase">
        {label || t('common.missingEntity')}
      </p>
      <p className="mt-1 text-center text-[10px] tracking-widest text-red-400/70 uppercase">
        {t('common.missingEntityId')}
      </p>
      <p className="mt-1 line-clamp-2 text-center font-mono text-[10px] break-all text-red-400/80">
        {missingEntityId || cardId}
      </p>
    </div>
  );
}
