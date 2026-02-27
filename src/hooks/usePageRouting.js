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
    try {
      return localStorage.getItem('tunet_active_page') || 'home';
    } catch {
      return 'home';
    }
  });

  const setActivePage = useCallback((page) => {
    _setActivePage(page);
    try {
      localStorage.setItem('tunet_active_page', page);
    } catch {}
  }, []);

  useEffect(() => {
    if (!pageId) return;
    _setActivePage((prev) => {
      if (prev !== pageId) {
        try {
          localStorage.setItem('tunet_active_page', pageId);
        } catch {}
        return pageId;
      }
      return prev;
    });
  }, [pageId]);

  useEffect(() => {
    if (!activePage) return;
    const target = `/page/${activePage}`;
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [activePage, location.pathname, navigate]);

  return { activePage, setActivePage };
}
