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

  it('puts all controls in one row in the top right corner, where the status chip sits', () => {
    renderOverlay();
    const buttons = ['tooltip.reorderCard', 'tooltip.editCard', 'tooltip.removeCard'].map((name) =>
      screen.getByRole('button', { name })
    );
    const row = buttons[0].parentElement as HTMLElement;
    for (const button of buttons) expect(button.parentElement).toBe(row);
    expect(row).toHaveAttribute('data-edit-control');
    expect(row).toHaveClass('flex-row', 'top-3', 'right-3');
    expect(row.className).not.toMatch(/translate-y|top-1\/2|left-/);
  });

  it('keeps the row small and close to the edge on a one-row card', () => {
    renderOverlay({ settings: { size: 'small' } });
    const row = screen.getByRole('button', { name: 'tooltip.editCard' }).parentElement;
    expect(row).toHaveClass('top-1', 'right-1');
    for (const name of ['tooltip.reorderCard', 'tooltip.editCard', 'tooltip.removeCard']) {
      // Smaller to the eye, but the hit area still reaches above and below the row.
      expect(screen.getByRole('button', { name })).toHaveClass('p-1', 'before:-inset-y-2');
    }
  });

  it('gives the compact spacer handle a 44 px hit area beside the pencil', () => {
    renderOverlay({ editId: 'spacer_card_1', settings: { heightPx: 40 } });
    const handle = screen.getByRole('button', { name: 'tooltip.reorderCard' });
    expect(handle).toHaveClass('relative', 'before:absolute', 'before:-left-5.5');
    expect(handle).toHaveClass('before:-inset-y-2.75');
    expect(screen.getByRole('button', { name: 'tooltip.editCard' })).not.toHaveClass(
      'before:absolute'
    );
  });

  it('leaves the full-size handle without the extra hit area', () => {
    renderOverlay();
    expect(screen.getByRole('button', { name: 'tooltip.reorderCard' })).not.toHaveClass(
      'before:absolute'
    );
  });

  it('keeps the trash button as small as the others on a compact spacer', () => {
    renderOverlay({ editId: 'spacer_card_1', settings: { heightPx: 40 } });
    expect(screen.getByRole('button', { name: 'tooltip.removeCard' })).toHaveClass('p-1');
  });
});
