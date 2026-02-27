/**
 * SpacerCard – a layout utility card for visual separation.
 *
 * Variants:
 *   'spacer'  – transparent empty block (visual gap)
 *   'divider' – horizontal line separator
 */

const SpacerCard = ({
  cardId,
  dragProps,
  controls,
  cardStyle,
  cardSettings,
  settingsKey,
  editMode,
  className = '',
}) => {
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const variant = settings.variant || 'spacer';
  const heading = typeof settings.heading === 'string' ? settings.heading.trim() : '';
  const headingAlign = ['left', 'center', 'right'].includes(settings.headingAlign)
    ? settings.headingAlign
    : 'center';

  const editClass = editMode
    ? 'border border-dashed border-[var(--glass-border)] cursor-move bg-[var(--card-bg)]/30'
    : '';

  return (
    <div
      {...dragProps}
      className={`relative flex h-full items-center justify-center rounded-3xl transition-all duration-300 ${editClass} ${className}`}
      style={
        editMode
          ? cardStyle
          : { ...cardStyle, backgroundColor: 'transparent', borderColor: 'transparent' }
      }
    >
      {controls}

      {variant === 'divider' && (
        <div className="w-full">
          {heading ? (
            headingAlign === 'left' ? (
              <div className="flex w-full items-center gap-3 px-4">
                <span className="text-[10px] font-bold tracking-[0.2em] whitespace-nowrap text-[var(--text-secondary)] uppercase">
                  {heading}
                </span>
                <span className="h-px flex-1 bg-[var(--text-muted)] opacity-30" />
              </div>
            ) : headingAlign === 'right' ? (
              <div className="flex w-full items-center gap-3 px-4">
                <span className="h-px flex-1 bg-[var(--text-muted)] opacity-30" />
                <span className="text-[10px] font-bold tracking-[0.2em] whitespace-nowrap text-[var(--text-secondary)] uppercase">
                  {heading}
                </span>
              </div>
            ) : (
              <div className="flex w-full items-center gap-3">
                <span className="h-px flex-1 bg-[var(--text-muted)] opacity-30" />
                <span className="text-[10px] font-bold tracking-[0.2em] whitespace-nowrap text-[var(--text-secondary)] uppercase">
                  {heading}
                </span>
                <span className="h-px flex-1 bg-[var(--text-muted)] opacity-30" />
              </div>
            )
          ) : (
            <hr className="border-t border-[var(--text-muted)] opacity-30" />
          )}
        </div>
      )}
    </div>
  );
};

export default SpacerCard;
