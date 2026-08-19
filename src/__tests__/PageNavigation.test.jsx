import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PageNavigation from '../components/pages/PageNavigation';

const mockUsePages = vi.fn();
const mockUseModalActions = vi.fn();

vi.mock('../contexts', () => ({
  usePages: () => mockUsePages(),
  useModalActions: () => mockUseModalActions(),
}));

const MockIcon = (props) => <svg data-testid="mock-icon" {...props} />;

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
    expect(screen.getByTestId('mock-icon')).toHaveClass('h-5', 'w-5', 'sm:h-4', 'sm:w-4');
  });
});
