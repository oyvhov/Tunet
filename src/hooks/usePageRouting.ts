import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

/**
 * Keeps dashboard page state in sync with route params and localStorage.
 * Route shape: /page/:pageId
 */
export function usePageRouting() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pageId } = useParams();

  const [activePage, _setActivePage] = useState(() => {
    if (pageId) return pageId;
    try {
      return localStorage.getItem('tunet_active_page') || 'home';
    } catch {
      return 'home';
    }
  });

  const setActivePage = useCallback(
    (page: string) => {
      _setActivePage(page);
      try {
        localStorage.setItem('tunet_active_page', page);
      } catch {}
      navigate(`/page/${page}`, { replace: true });
    },
    [navigate]
  );

  useEffect(() => {
    if (!pageId) return;
    _setActivePage(pageId);
    try {
      localStorage.setItem('tunet_active_page', pageId);
    } catch {}
  }, [pageId]);

  useEffect(() => {
    if (!activePage || pageId) return;
    const target = `/page/${activePage}`;
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [activePage, pageId, location.pathname, navigate]);

  return { activePage, setActivePage };
}
