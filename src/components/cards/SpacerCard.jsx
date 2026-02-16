/**
 * SpacerCard – a layout utility card for visual separation.
 *
 * Variants:
 *   'spacer'  – transparent empty block (visual gap)
 *   'divider' – horizontal line separator
 *   'title'   – section heading text
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
  const heading = settings.heading || '';

  const editClass = editMode
    ? 'border border-dashed border-[var(--glass-border)] cursor-move bg-[var(--card-bg)]/30'
    : '';

  return (
    <div
      {...dragProps}
      className={`relative rounded-3xl flex items-center justify-center h-full min-h-[2rem] transition-all duration-300 ${editClass} ${className}`}
      style={editMode ? cardStyle : { ...cardStyle, backgroundColor: 'transparent', borderColor: 'transparent' }}
    >
      {controls}

      {variant === 'divider' && (
        <div className="w-full px-6">
          <hr className="border-t border-[var(--glass-border)] opacity-40" />
        </div>
      )}

      {variant === 'title' && heading && (
        <div className="w-full px-4">
          <h3 className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)] opacity-60">
            {heading}
          </h3>
        </div>
      )}

      {variant === 'title' && !heading && editMode && (
        <div className="w-full px-4">
          <p className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)] opacity-30 italic">
            Set title in edit...
          </p>
        </div>
      )}
    </div>
  );
};

export default SpacerCard;
