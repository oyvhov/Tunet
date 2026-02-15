import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePageRouting } from '../hooks/usePageRouting';

const routerState = vi.hoisted(() => ({
  location: { pathname: '/page/home' },
  params: { pageId: undefined },
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => routerState.location,
  useNavigate: () => routerState.navigate,
  useParams: () => routerState.params,
}));

describe('usePageRouting', () => {
  beforeEach(() => {
    localStorage.clear();
    routerState.location = { pathname: '/page/home' };
    routerState.params = { pageId: undefined };
    routerState.navigate.mockReset();
  });

  it('initializes from localStorage and navigates when path differs', () => {
    localStorage.setItem('tunet_active_page', 'kitchen');
    routerState.location = { pathname: '/page/home' };

    const { result } = renderHook(() => usePageRouting());

    expect(result.current.activePage).toBe('kitchen');
    expect(routerState.navigate).toHaveBeenCalledWith('/page/kitchen', { replace: true });
  });

  it('syncs route param to activePage and localStorage', async () => {
    routerState.params = { pageId: 'media' };
    routerState.location = { pathname: '/page/media' };

    const { result } = renderHook(() => usePageRouting());

    await waitFor(() => {
      expect(result.current.activePage).toBe('media');
    });
    expect(localStorage.getItem('tunet_active_page')).toBe('media');
  });

  it('setActivePage updates localStorage and navigates', () => {
    const { result } = renderHook(() => usePageRouting());

    act(() => {
      result.current.setActivePage('office');
    });

    expect(localStorage.getItem('tunet_active_page')).toBe('office');
    expect(routerState.navigate).toHaveBeenCalledWith('/page/office', { replace: true });
  });
});
