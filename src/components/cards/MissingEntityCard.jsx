import { AlertTriangle } from '../../icons';

/**
 * Placeholder card shown in edit mode when an entity is missing or broken.
 */
export default function MissingEntityCard({ cardId, dragProps, controls, cardStyle, label, missingEntityId, t }) {
  return (
    <div key={cardId} {...dragProps} className="touch-feedback relative rounded-3xl overflow-hidden bg-[var(--card-bg)] border border-dashed border-red-500/50 flex flex-col items-center justify-center p-4 h-full" style={cardStyle}>
      {controls}
      <AlertTriangle className="w-8 h-8 text-red-500 mb-2 opacity-80" />
      <p className="text-xs font-bold text-red-500 text-center uppercase tracking-widest">{label || t('common.missingEntity')}</p>
      <p className="text-[10px] text-red-400/70 text-center mt-1 uppercase tracking-widest">{t('common.missingEntityId')}</p>
      <p className="text-[10px] text-red-400/80 text-center mt-1 font-mono break-all line-clamp-2">{missingEntityId || cardId}</p>
    </div>
  );
}
