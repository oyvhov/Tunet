import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from '../layouts/DashboardLayout';

vi.mock('../layouts/Header', () => ({
  default: ({ children }) => <header data-testid="dashboard-header">{children}</header>,
}));

vi.mock('../layouts/StatusBar', () => ({
  default: () => <div data-testid="status-bar" />,
}));

vi.mock('../layouts/BackgroundLayer', () => ({
  default: () => <div data-testid="background-layer" />,
}));

vi.mock('../layouts/ConnectionBanner', () => ({
  default: () => <div data-testid="connection-banner" />,
}));

vi.mock('../layouts/DragOverlaySVG', () => ({
  default: () => <div data-testid="drag-overlay" />,
}));

vi.mock('../layouts/EditToolbar', () => ({
  default: ({ showSettingsMenu }) => (
    <div data-settings-visible={String(showSettingsMenu)} data-testid="edit-toolbar" />
  ),
}));

vi.mock('../layouts/SettingsMenuControl', () => ({
  default: ({ isMobile, floating }) => (
    <div
      data-floating={String(floating)}
      data-mobile={String(isMobile)}
      data-testid="settings-menu-control"
    />
  ),
}));

vi.mock('../components', () => ({
  PageNavigation: () => <nav data-testid="page-navigation" />,
}));

vi.mock('../rendering/DashboardGrid', () => ({
  default: () => (
    <section data-testid="dashboard-grid">
      <div data-dashboard-card="card-1" data-testid="dashboard-card" />
    </section>
  ),
}));

vi.mock('../components/ui/PinLockModal', () => ({
  default: () => <div data-testid="pin-lock-modal" />,
}));

const baseProps = {
  resolvedAppFontFamily: 'Inter, sans-serif',
  editMode: false,
  draggingId: null,
  touchPath: null,
  isMobile: false,
  gridColCount: 3,
  dynamicGridColumns: true,
  isCompactCards: false,
  now: new Date('2026-01-01T00:00:00Z'),
  resolvedHeaderTitle: 'Home',
  headerScale: 1,
  headerSettings: { showTitle: true, showClock: true, showDate: true },
  setShowHeaderEditModal: vi.fn(),
  t: (key) => key,
  sectionSpacing: { headerToStatus: 0, statusToNav: 0, navToGrid: 24 },
  cardsOnlyMode: false,
  updateCardsOnlyMode: vi.fn(),
  pagesConfig: { header: [] },
  pageSettings: {},
  personStatus: vi.fn(),
  requestSettingsAccess: vi.fn((callback) => callback()),
  setAddCardTargetPage: vi.fn(),
  setShowAddCardModal: vi.fn(),
  setConfigTab: vi.fn(),
  isSonosActive: vi.fn(() => false),
  isMediaActive: vi.fn(() => false),
  getA: vi.fn(),
  getEntityImageUrl: vi.fn(),
  pages: [{ id: 'home', label: 'Home' }],
  activePage: 'home',
  setActivePage: vi.fn(),
  setEditingPage: vi.fn(),
  guardedSetEditMode: vi.fn(),
  guardedSetShowAddCardModal: vi.fn(),
  guardedSetShowConfigModal: vi.fn(),
  guardedSetShowThemeSidebar: vi.fn(),
  guardedSetShowLayoutSidebar: vi.fn(),
  guardedSetShowHeaderEditModal: vi.fn(),
  connected: true,
  updateCount: 0,
  dashboardGridPage: {},
  dashboardGridMedia: {},
  dashboardGridGrid: {},
  dashboardGridCards: {},
  dashboardGridActions: {},
  showPinLockModal: false,
  closePinLockModal: vi.fn(),
  handlePinSubmit: vi.fn(),
  pinLockError: '',
};

function renderLayout(overrides = {}) {
  return render(<DashboardLayout {...baseProps} {...overrides} />);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('DashboardLayout cards-only mode', () => {
  it('renders dashboard chrome by default', () => {
    renderLayout();

    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByTestId('page-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('edit-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-menu-control')).not.toBeInTheDocument();
    expect(screen.getByTestId('edit-toolbar')).toHaveAttribute('data-settings-visible', 'true');
  });

  it('moves the settings control to a floating mobile action menu', () => {
    renderLayout({ isMobile: true });

    expect(screen.getByTestId('settings-menu-control')).toHaveAttribute('data-mobile', 'true');
    expect(screen.getByTestId('settings-menu-control')).toHaveAttribute('data-floating', 'true');
    expect(screen.queryByTestId('edit-toolbar')).not.toBeInTheDocument();
  });

  it('adds bottom clearance only on mobile', () => {
    const { rerender } = renderLayout({ isMobile: true });

    expect(screen.getByRole('main', { name: 'Dashboard' }).style.paddingBottom).toBe(
      'calc(7rem + env(safe-area-inset-bottom))'
    );

    rerender(<DashboardLayout {...baseProps} isMobile={false} />);

    expect(screen.getByRole('main', { name: 'Dashboard' }).style.paddingBottom).toBe('');
  });

  it('hides normal chrome but keeps cards and recovery surfaces available', () => {
    renderLayout({ cardsOnlyMode: true });

    expect(screen.queryByTestId('dashboard-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('status-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-navigation')).not.toBeInTheDocument();
    expect(screen.queryByTestId('edit-toolbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
    expect(screen.getByTestId('connection-banner')).toBeInTheDocument();
  });

  it('exits cards-only mode with Escape', () => {
    const updateCardsOnlyMode = vi.fn();

    renderLayout({ cardsOnlyMode: true, updateCardsOnlyMode });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(updateCardsOnlyMode).toHaveBeenCalledWith(false);
  });

  it('exits cards-only mode after a long press outside cards', () => {
    vi.useFakeTimers();
    const updateCardsOnlyMode = vi.fn();

    renderLayout({ cardsOnlyMode: true, updateCardsOnlyMode });

    fireEvent.pointerDown(screen.getByRole('main', { name: 'Dashboard' }), { button: 0 });
    act(() => vi.advanceTimersByTime(999));
    expect(updateCardsOnlyMode).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(updateCardsOnlyMode).toHaveBeenCalledWith(false);
  });

  it('does not exit cards-only mode when long-pressing a card', () => {
    vi.useFakeTimers();
    const updateCardsOnlyMode = vi.fn();

    renderLayout({ cardsOnlyMode: true, updateCardsOnlyMode });

    fireEvent.pointerDown(screen.getByTestId('dashboard-card'), { button: 0 });
    act(() => vi.advanceTimersByTime(1000));

    expect(updateCardsOnlyMode).not.toHaveBeenCalled();
  });
});
