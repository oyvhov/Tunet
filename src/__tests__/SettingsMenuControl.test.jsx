import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsMenuControl from '../layouts/SettingsMenuControl';

const makeProps = (overrides = {}) => ({
  setShowConfigModal: vi.fn(),
  setConfigTab: vi.fn(),
  setShowThemeSidebar: vi.fn(),
  setShowLayoutSidebar: vi.fn(),
  setShowHeaderEditModal: vi.fn(),
  onToggleEdit: vi.fn(),
  editMode: false,
  updateCount: 0,
  isMobile: true,
  t: (key) => key,
  ...overrides,
});

describe('SettingsMenuControl', () => {
  it('uses a 44px mobile trigger and keeps edit mode in the menu', () => {
    const props = makeProps();
    render(<SettingsMenuControl {...props} />);

    const trigger = screen.getByTestId('settings-dropdown-trigger');
    expect(trigger).toHaveClass('h-11', 'w-11');

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'menu.edit' }));

    expect(props.onToggleEdit).toHaveBeenCalledOnce();
  });

  it('opens system settings and preserves the update badge', () => {
    const props = makeProps({ updateCount: 3 });
    render(<SettingsMenuControl {...props} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    const badge = document.querySelector('[data-settings-update-badge]');
    expect(badge).toHaveClass('-top-2', '-right-2');
    expect(badge).not.toHaveClass('border-2');
    fireEvent.click(screen.getByTestId('settings-dropdown-trigger'));
    fireEvent.click(screen.getByTestId('settings-menu-system'));

    expect(props.setShowConfigModal).toHaveBeenCalledWith(true);
    expect(props.setConfigTab).toHaveBeenCalledWith('connection');
  });

  it('uses the larger fixed trigger for the floating mobile variant', () => {
    render(<SettingsMenuControl {...makeProps()} floating onAddCard={vi.fn()} />);

    expect(screen.getByTestId('settings-menu-control')).toHaveClass('fixed');
    expect(screen.getByTestId('settings-dropdown-trigger')).toHaveClass(
      'h-14',
      'w-14',
      'rounded-2xl',
      'bg-[var(--accent-color)]'
    );
    expect(screen.getByTestId('settings-dropdown-trigger')).not.toHaveClass('rounded-full');
  });

  it('turns the floating trigger into the Done action while editing', () => {
    const props = makeProps({ editMode: true });
    render(<SettingsMenuControl {...props} floating onAddCard={vi.fn()} />);

    const doneButton = screen.getByTestId('settings-dropdown-trigger');
    expect(doneButton).toHaveAccessibleName('nav.done');
    expect(doneButton).toHaveClass('rounded-2xl', 'bg-[var(--status-success-fg)]');
    expect(screen.queryByTestId('settings-mobile-done')).not.toBeInTheDocument();

    fireEvent.click(doneButton);
    expect(props.onToggleEdit).toHaveBeenCalledOnce();
  });
});
