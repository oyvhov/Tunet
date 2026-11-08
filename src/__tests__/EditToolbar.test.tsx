import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditToolbar from '../layouts/EditToolbar';

const t = (key: string) => key;

const renderToolbar = () =>
  render(
    <EditToolbar
      editMode={false}
      setShowAddCardModal={vi.fn()}
      setShowConfigModal={vi.fn()}
      setConfigTab={vi.fn()}
      setShowThemeSidebar={vi.fn()}
      setShowLayoutSidebar={vi.fn()}
      setShowHeaderEditModal={vi.fn()}
      onToggleEdit={vi.fn()}
      connected
      updateCount={0}
      isMobile={false}
      t={t}
    />
  );

describe('EditToolbar touch targets', () => {
  // h-11 is 44 px. The -3 px margin keeps the footprint at the previous 38 px, so
  // the toolbar row and its neighbours do not move.
  const expectFullSizeWithOldFootprint = (button: HTMLElement) => {
    expect(button).toHaveClass('h-11', 'w-11', '-m-[3px]');
    expect(button).not.toHaveClass('p-2');
  };

  it('gives the edit button a 44 px target without changing its footprint', () => {
    renderToolbar();

    expectFullSizeWithOldFootprint(screen.getByRole('button', { name: 'menu.edit' }));
  });

  it('gives the settings button a 44 px target without changing its footprint', () => {
    renderToolbar();

    expectFullSizeWithOldFootprint(screen.getByTestId('settings-dropdown-trigger'));
  });
});
