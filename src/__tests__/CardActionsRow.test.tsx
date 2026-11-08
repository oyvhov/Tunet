import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CardActionsRow from '../modals/editCard/CardActionsRow';

const t = (key: string) => key;

const actions = {
  isHidden: false,
  canRemove: true,
  onToggleVisibility: vi.fn(),
  onDuplicate: vi.fn(),
  onRemove: vi.fn(),
};

describe('CardActionsRow', () => {
  it('leaves moving to the drag handle', () => {
    render(<CardActionsRow editId="light.kitchen" actions={actions} t={t} />);
    expect(screen.queryByRole('button', { name: 'tooltip.moveLeft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'tooltip.moveRight' })).not.toBeInTheDocument();
  });

  it('still offers hide, duplicate and remove', () => {
    render(<CardActionsRow editId="light.kitchen" actions={actions} t={t} />);
    expect(screen.getByRole('button', { name: 'tooltip.hideCard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tooltip.duplicateCard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tooltip.removeCard' })).toBeInTheDocument();
  });
});
