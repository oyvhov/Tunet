/**
 * Edit-mode overlay rendered on top of each card: the drag handle, the pencil
 * and the trash button. Everything else lives in the "Edit card" popup.
 */
import { memo } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Edit2, GripVertical, Trash2 } from '../../icons';

interface EditOverlaySettings {
  heightPx?: unknown;
}

interface EditOverlayProps {
  editId: string;
  settings?: EditOverlaySettings | null;
  canRemove?: boolean;
  onEdit: () => void;
  onRemove: () => void;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  t: (key: string) => string;
}

function EditOverlay({
  editId,
  settings,
  canRemove,
  onEdit,
  onRemove,
  dragHandleProps,
  t,
}: EditOverlayProps) {
  const isCompactSpacer =
    editId?.startsWith('spacer_card_') &&
    Number(settings?.heightPx || 0) > 0 &&
    Number(settings?.heightPx || 0) <= 56;
  const groupClass = isCompactSpacer
    ? 'top-1 right-1 flex-row gap-1'
    : 'top-1/2 right-2 -translate-y-1/2 flex-col gap-2';
  const buttonClass = `flex items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg transition-colors hover:bg-black/80 ${isCompactSpacer ? 'p-1' : 'p-2.5'}`;
  const iconClass = isCompactSpacer ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <>
      {canRemove && (
        // Three buttons do not fit down the side of a one-row card, so this one is a
        // corner badge, small enough to clear the icons. The pseudo-element keeps it tappable.
        <button
          type="button"
          data-edit-control
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 left-1 z-50 flex items-center justify-center rounded-full border border-white/20 bg-black/60 p-1 text-white shadow-lg transition-colors before:absolute before:-inset-2 hover:bg-red-500/80"
          title={t('tooltip.removeCard')}
          aria-label={t('tooltip.removeCard')}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      <div data-edit-control className={`absolute z-50 flex ${groupClass}`}>
        <button
          type="button"
          data-drag-handle
          {...dragHandleProps}
          style={{ touchAction: 'none' }}
          className={buttonClass}
          aria-label={t('tooltip.reorderCard') || 'Reorder card'}
          title={t('tooltip.reorderCard') || 'Reorder card'}
        >
          <GripVertical className={iconClass} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={buttonClass}
          title={t('tooltip.editCard')}
          aria-label={t('tooltip.editCard')}
        >
          <Edit2 className={iconClass} />
        </button>
      </div>
    </>
  );
}

export default memo(EditOverlay);
