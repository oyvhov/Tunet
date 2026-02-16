/**
 * Edit-mode overlay rendered on top of each card.
 * Contains move, edit, visibility, resize, delete buttons and the drag handle.
 *
 * Extracted from the inline `getControls` function in App.jsx.
 */
import { memo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  Maximize2,
  Minimize2,
  Trash2,
} from '../../icons';

/** Prefixes for cards that support size toggling. */
const RESIZABLE_PREFIXES = [
  'light_', 'light.', 'vacuum.', 'automation.', 'climate_card_',
  'cost_card_', 'weather_temp_', 'androidtv_card_', 'calendar_card_',
  'todo_card_', 'nordpool_card_', 'car_card_', 'cover_card_', 'spacer_card_',
];

/** Prefixes that cycle through 3 sizes (small → medium → large). */
const TRIPLE_SIZE_PREFIXES = ['calendar_card_', 'todo_card_'];

function canResize(editId, settings) {
  if (editId === 'car') return true;
  if (['entity', 'toggle', 'sensor'].includes(settings?.type)) return true;
  return RESIZABLE_PREFIXES.some(p => editId.startsWith(p));
}

function getNextSize(editId, currentSize) {
  if (TRIPLE_SIZE_PREFIXES.some(p => editId.startsWith(p))) {
    return currentSize === 'small' ? 'medium' : (currentSize === 'medium' ? 'large' : 'small');
  }
  return currentSize === 'small' ? 'large' : 'small';
}

function EditOverlay({
  _cardId,
  editId,
  _settingsKey,
  isHidden,
  currentSize,
  settings,
  canRemove,
  onMoveLeft,
  onMoveRight,
  onEdit,
  onToggleVisibility,
  onSaveSize,
  onRemove,
  dragHandleProps,
  t,
}) {
  const showResize = canResize(editId, settings);
  const isSmall = currentSize === 'small';
  const isTriple = TRIPLE_SIZE_PREFIXES.some(p => editId.startsWith(p));

  return (
    <>
      {/* Move buttons – top left */}
      <div className="absolute top-2 left-2 z-50 flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
          className="p-2 rounded-full transition-colors hover:bg-blue-500/80 text-white border border-white/20 shadow-lg bg-black/60"
          title={t('tooltip.moveLeft')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
          className="p-2 rounded-full transition-colors hover:bg-blue-500/80 text-white border border-white/20 shadow-lg bg-black/60"
          title={t('tooltip.moveRight')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Action buttons – top right */}
      <div className="absolute top-2 right-2 z-50 flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-2 rounded-full text-white border border-white/20 shadow-lg bg-black/60"
          title={t('tooltip.editCard')}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          className="p-2 rounded-full transition-colors hover:bg-white/20 text-white border border-white/20 shadow-lg"
          style={{ backgroundColor: isHidden ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0, 0, 0, 0.6)' }}
          title={isHidden ? t('tooltip.showCard') : t('tooltip.hideCard')}
        >
          {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        {showResize && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveSize(getNextSize(editId, currentSize));
            }}
            className="p-2 rounded-full transition-colors hover:bg-purple-500/80 text-white border border-white/20 shadow-lg"
            style={{ backgroundColor: isSmall ? 'rgba(168, 85, 247, 0.8)' : 'rgba(0, 0, 0, 0.6)' }}
            title={isTriple ? 'Bytt storleik' : (isSmall ? t('tooltip.largeSize') : t('tooltip.smallSize'))}
          >
            {isSmall ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        )}
        {canRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-2 rounded-full transition-colors hover:bg-red-500/80 text-white border border-white/20 shadow-lg bg-black/60"
            title={t('tooltip.removeCard')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Central drag handle */}
      <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
        <div
          data-drag-handle
          {...dragHandleProps}
          style={{ touchAction: 'none' }}
          className="flex items-center justify-center p-3 rounded-full bg-black/50 border border-white/10 text-white/80 shadow-lg pointer-events-auto"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      </div>
    </>
  );
}

export default memo(EditOverlay);
