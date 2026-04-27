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
});
