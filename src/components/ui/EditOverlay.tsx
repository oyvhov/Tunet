/**
 * Edit-mode overlay rendered on top of each card: the drag handle, the pencil
 * and the trash button. Everything else lives in the "Edit card" popup.
 */
import { memo } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Edit2, GripVertical, Trash2 } from '../../icons';

interface EditOverlaySettings {
  heightPx?: unknown;
  size?: unknown;
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
  const isOneRowCard = !isCompactSpacer && settings?.size === 'small';
  // One row in the status chip's corner, so the controls never cover the value or a slider.
  // A one-row card keeps them small and close to the edge; the extra height keeps them tappable.
  const groupClass = isCompactSpacer
    ? 'top-1 right-1'
    : isOneRowCard
      ? 'top-1 right-1 sm:top-1.5 sm:right-1.5'
      : 'top-3 right-3 sm:top-4 sm:right-4';
  const buttonClass = `flex items-center justify-center rounded-full transition-colors ${
    isCompactSpacer
      ? 'p-1'
      : isOneRowCard
        ? 'relative p-1 before:absolute before:-inset-y-2 before:inset-x-0 sm:p-1.5'
        : 'p-2 sm:p-2.5'
  }`;
  const iconClass = isCompactSpacer ? 'h-3 w-3' : isOneRowCard ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div
      data-edit-control
      className={`absolute z-50 flex flex-row items-center rounded-full border border-white/20 bg-black/80 text-white shadow-lg backdrop-blur-md ${groupClass}`}
    >
      <button
        type="button"
        data-drag-handle
        {...dragHandleProps}
        style={{ touchAction: 'none' }}
        // On a compact spacer the extra area grows away from the pencil beside it.
        className={
          isCompactSpacer
            ? `${buttonClass} relative before:absolute before:-inset-y-2.75 before:right-0 before:-left-5.5 hover:bg-white/20`
            : `${buttonClass} hover:bg-white/20`
        }
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
        className={`${buttonClass} hover:bg-white/20`}
        title={t('tooltip.editCard')}
        aria-label={t('tooltip.editCard')}
      >
        <Edit2 className={iconClass} />
      </button>
      {canRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`${buttonClass} hover:bg-red-500/80`}
          title={t('tooltip.removeCard')}
          aria-label={t('tooltip.removeCard')}
        >
          <Trash2 className={iconClass} />
        </button>
      )}
    </div>
  );
}

export default memo(EditOverlay);
