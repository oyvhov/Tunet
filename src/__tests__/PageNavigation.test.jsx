import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PageNavigation from '../components/pages/PageNavigation';

const mockUsePages = vi.fn();
const mockUseModalActions = vi.fn();

vi.mock('../contexts', () => ({
  usePages: () => mockUsePages(),
  useModalActions: () => mockUseModalActions(),
}));

const MockIcon = (props) => <svg data-testid="mock-icon" {...props} />;

describe('PageNavigation on touch screens', () => {
  const renderManager = (pagesConfig = { pages: ['home', 'kitchen', 'attic'] }) => {
    const persistConfig = vi.fn();
    mockUsePages.mockReturnValue({ pagesConfig, persistConfig, pageSettings: {} });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });
    render(
      <PageNavigation
        pages={pagesConfig.pages.map((id) => ({ id, label: id, icon: MockIcon }))}
        activePage="home"
        setActivePage={vi.fn()}
        editMode
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );
    fireEvent.click(screen.getAllByText('nav.addPage')[0].closest('button'));
    return persistConfig;
  };

  it('shows the edit pencil without hover', () => {
    renderManager();

    expect(screen.getAllByTitle('nav.editPage').at(-1)).toHaveClass('touch:opacity-100');
  });

  it('moves a page up and down with buttons of at least 44 px', () => {
    const persistConfig = renderManager();

    const up = screen.getAllByRole('button', { name: 'nav.movePageUp' });
    const down = screen.getAllByRole('button', { name: 'nav.movePageDown' });
    expect(up[1]).toHaveClass('h-11', 'w-11');
    expect(up[0]).toBeDisabled();
    expect(down[2]).toBeDisabled();

    fireEvent.click(up[1]);
    expect(persistConfig).toHaveBeenLastCalledWith({ pages: ['kitchen', 'home', 'attic'] });

    fireEvent.click(down[1]);
    expect(persistConfig).toHaveBeenLastCalledWith({ pages: ['home', 'attic', 'kitchen'] });
  });
});

describe('PageNavigation tap handling', () => {
  const renderNav = (editMode) => {
    const setActivePage = vi.fn();
    const setEditingPage = vi.fn();
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home', 'lights'] },
      persistConfig: vi.fn(),
      pageSettings: {},
      headerSettings: { navSize: 'sm' },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });
    render(
      <PageNavigation
        pages={[
          { id: 'home', label: 'Home', icon: MockIcon },
          { id: 'lights', label: 'Lights', icon: MockIcon },
        ]}
        activePage="home"
        setActivePage={setActivePage}
        editMode={editMode}
        setEditingPage={setEditingPage}
        t={(k) => k}
      />
    );
    return { setActivePage, setEditingPage };
  };

  it('keeps a 44 px hit area when the pill is drawn smaller', () => {
    renderNav(false);

    expect(screen.getByRole('button', { name: 'Home' })).toHaveClass(
      'after:h-11',
      'after:min-w-11'
    );
  });

  it('leaves room in the scroller so the hit area is not clipped', () => {
    renderNav(false);

    const scroller = screen.getByRole('button', { name: 'Home' }).closest('.overflow-x-auto');
    expect(scroller).toHaveClass('-mt-2', 'pt-2');
  });

  it('goes to the tapped page in edit mode', () => {
    const { setActivePage, setEditingPage } = renderNav(true);

    fireEvent.click(screen.getByRole('button', { name: 'Lights' }));

    expect(setActivePage).toHaveBeenCalledWith('lights');
    expect(setEditingPage).not.toHaveBeenCalled();
  });

  it('offers one edit button for the current page in edit mode', () => {
    const { setActivePage, setEditingPage } = renderNav(true);

    const edit = screen.getByRole('button', { name: 'nav.editPage' });
    expect(edit).toHaveClass('after:h-11');
    fireEvent.click(edit);

    expect(setEditingPage).toHaveBeenCalledWith('home');
    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('shows no edit button outside edit mode', () => {
    renderNav(false);

    expect(screen.queryByRole('button', { name: 'nav.editPage' })).not.toBeInTheDocument();
  });
});

describe('PageNavigation', () => {
  it('hides single page pill outside edit mode when hideSinglePagePill is enabled', () => {
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home'] },
      persistConfig: vi.fn(),
      pageSettings: {
        home: { hideSinglePagePill: true },
      },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    render(
      <PageNavigation
        pages={[{ id: 'home', label: 'Home', icon: MockIcon }]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode={false}
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('still shows single page pill in edit mode when hideSinglePagePill is enabled', () => {
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home'] },
      persistConfig: vi.fn(),
      pageSettings: {
        home: { hideSinglePagePill: true },
      },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    render(
      <PageNavigation
        pages={[{ id: 'home', label: 'Home', icon: MockIcon }]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode={true}
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('uses a larger mobile page button and icon', () => {
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home'] },
      persistConfig: vi.fn(),
      pageSettings: {},
      headerSettings: { showPagePillLabelsOnMobile: true },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    render(
      <PageNavigation
        pages={[{ id: 'home', label: 'Home', icon: MockIcon }]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode={false}
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    const button = screen.getByRole('button', { name: 'Home' });
    expect(button).toHaveClass('min-h-11', 'min-w-11', 'px-3', 'py-2.5');
    expect(screen.getByTestId('mock-icon')).toHaveClass(
      'h-5',
      'w-5',
      'sm:h-[var(--nav-icon)]',
      'sm:w-[var(--nav-icon)]'
    );
  });

  it('applies the chosen nav style and hides inactive labels in expand mode', () => {
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home', 'lights'] },
      persistConfig: vi.fn(),
      pageSettings: {},
      headerSettings: { navStyle: 'expand', navActiveAccent: true },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    const { container } = render(
      <PageNavigation
        pages={[
          { id: 'home', label: 'Home', icon: MockIcon },
          { id: 'lights', label: 'Lights', icon: MockIcon },
        ]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode={false}
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    expect(container.querySelector('[data-nav-style="expand"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Home' }).className).toContain('accent-color');
    expect(screen.getByText('Lights')).toHaveClass('sr-only');
  });

  it('falls back to the pill style for unknown values', () => {
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home'] },
      persistConfig: vi.fn(),
      pageSettings: {},
      headerSettings: { navStyle: 'bogus' },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    const { container } = render(
      <PageNavigation
        pages={[{ id: 'home', label: 'Home', icon: MockIcon }]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode={false}
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    expect(container.querySelector('[data-nav-style="pill"]')).not.toBeNull();
    expect(container.querySelector('[data-nav-size="md"]')).not.toBeNull();
  });

  it('applies the chosen size and draws a sliding indicator for segmented tabs', () => {
    mockUsePages.mockReturnValue({
      pagesConfig: { pages: ['home', 'lights'] },
      persistConfig: vi.fn(),
      pageSettings: {},
      headerSettings: { navStyle: 'segmented', navSize: 'lg' },
    });
    mockUseModalActions.mockReturnValue({ setShowAddPageModal: vi.fn() });

    const { container } = render(
      <PageNavigation
        pages={[
          { id: 'home', label: 'Home', icon: MockIcon },
          { id: 'lights', label: 'Lights', icon: MockIcon },
        ]}
        activePage="home"
        setActivePage={vi.fn()}
        editMode={false}
        setEditingPage={vi.fn()}
        t={(k) => k}
      />
    );

    const track = container.querySelector('[data-nav-size="lg"]');
    expect(track).not.toBeNull();
    expect(track.style.getPropertyValue('--nav-font')).toBe('14px');
    expect(container.querySelector('[data-nav-indicator]')).not.toBeNull();
  });
});
