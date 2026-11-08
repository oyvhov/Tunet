import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditOverlay from '../components/ui/EditOverlay';

const t = (key: string) => key;

const renderOverlay = (props = {}) => {
  const onRemove = vi.fn();
  const onCardClick = vi.fn();
  render(
    <div onClick={onCardClick}>
      <EditOverlay
        editId="light.kitchen"
        onEdit={vi.fn()}
        onRemove={onRemove}
        canRemove
        t={t}
        {...props}
      />
    </div>
  );
  return { onRemove, onCardClick };
};

describe('EditOverlay', () => {
  it('removes the card from the trash button without clicking the card', () => {
    const { onRemove, onCardClick } = renderOverlay();
    fireEvent.click(screen.getByRole('button', { name: 'tooltip.removeCard' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('marks its buttons as the only controls that work while editing', () => {
    renderOverlay();
    for (const name of ['tooltip.removeCard', 'tooltip.editCard', 'tooltip.reorderCard']) {
      expect(screen.getByRole('button', { name }).closest('[data-edit-control]')).not.toBeNull();
    }
  });

  it('has no trash button on a card that cannot be removed', () => {
    renderOverlay({ canRemove: false });
    expect(screen.queryByRole('button', { name: 'tooltip.removeCard' })).not.toBeInTheDocument();
  });

  it('keeps the handle and pencil beside the trash button', () => {
    renderOverlay();
    expect(screen.getByRole('button', { name: 'tooltip.reorderCard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tooltip.editCard' })).toBeInTheDocument();
  });

  it('keeps the trash button as small as the others on a compact spacer', () => {
    renderOverlay({ editId: 'spacer_card_1', settings: { heightPx: 40 } });
    expect(screen.getByRole('button', { name: 'tooltip.removeCard' })).toHaveClass('p-1');
  });
});
