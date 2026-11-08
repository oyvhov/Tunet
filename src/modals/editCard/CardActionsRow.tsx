import { memo } from 'react';
import { Copy, Eye, EyeOff, Maximize2, Minimize2, Trash2 } from '../../icons';
import Button from '../../components/ui/Button';
import {
  canResizeCard,
  getNextCardSize,
  isTripleSizeCard,
  type CardEditSettings,
} from '../../utils/cardEditActions';

export interface CardActions {
  isHidden: boolean;
  canRemove: boolean;
  onToggleVisibility: () => void;
  onDuplicate?: () => void;
  onRemove: () => void;
}

interface CardActionsRowProps {
  editId: string;
  settings?: CardEditSettings | null;
  actions: CardActions;
  onSaveSize?: (size: string) => void;
  t: (key: string) => string;
}

/** Hide, resize, copy and remove for the card being edited. */
function CardActionsRow({ editId, settings, actions, onSaveSize, t }: CardActionsRowProps) {
  const currentSize = settings?.size || 'large';
  const isSmall = currentSize === 'small';
  const showResize = Boolean(onSaveSize) && canResizeCard(editId, settings);
  const sizeLabel = isTripleSizeCard(editId)
    ? t('tooltip.cycleSize')
    : isSmall
      ? t('tooltip.largeSize')
      : t('tooltip.smallSize');

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="card-actions">
      <Button
        size="sm"
        icon={actions.isHidden ? <EyeOff /> : <Eye />}
        aria-pressed={actions.isHidden}
        onClick={actions.onToggleVisibility}
      >
        {actions.isHidden ? t('tooltip.showCard') : t('tooltip.hideCard')}
      </Button>
      {showResize && (
        <Button
          size="sm"
          icon={isSmall ? <Maximize2 /> : <Minimize2 />}
          onClick={() => onSaveSize?.(getNextCardSize(editId, currentSize))}
        >
          {sizeLabel}
        </Button>
      )}
      {actions.onDuplicate && (
        <Button size="sm" icon={<Copy />} onClick={actions.onDuplicate}>
          {t('tooltip.duplicateCard')}
        </Button>
      )}
      {actions.canRemove && (
        <Button size="sm" variant="destructive" icon={<Trash2 />} onClick={actions.onRemove}>
          {t('tooltip.removeCard')}
        </Button>
      )}
    </div>
  );
}

export default memo(CardActionsRow);
