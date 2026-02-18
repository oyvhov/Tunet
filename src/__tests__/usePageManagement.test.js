import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePageManagement } from '../hooks/usePageManagement';

// ── Defaults ─────────────────────────────────────────────────────────────
const t = (key) => {
  const map = {
    'page.newDefault': 'New Page',
    'sonos.pageName': 'Media',
    'confirm.deletePage': 'Delete this page?',
  };
  return map[key] ?? key;
};

const makeProps = (overrides = {}) => ({
  pagesConfig: { pages: ['home'], home: ['card1', 'card2'] },
  persistConfig: vi.fn(),
  pageSettings: {},
  persistPageSettings: vi.fn(),
  savePageSetting: vi.fn(),
  pageDefaults: {},
  activePage: 'home',
  setActivePage: vi.fn(),
  showAddPageModal: false,
  setShowAddPageModal: vi.fn(),
  showAddCardModal: false,
  setShowAddCardModal: vi.fn(),
  t,
  ...overrides,
});

// ═════════════════════════════════════════════════════════════════════════
// createPage
// ═════════════════════════════════════════════════════════════════════════
describe('usePageManagement › createPage', () => {
  it('creates a page with the provided label', () => {
    const props = makeProps({ showAddPageModal: true });
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.setNewPageLabel('Kitchen'));
    act(() => result.current.createPage());

    expect(props.persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: ['home', 'kitchen'],
        kitchen: [],
      }),
    );
    expect(props.savePageSetting).toHaveBeenCalledWith('kitchen', 'label', 'Kitchen');
    expect(props.setActivePage).toHaveBeenCalledWith('kitchen');
    expect(props.setShowAddPageModal).toHaveBeenCalledWith(false);
  });

  it('uses default label when name is empty', () => {
    const props = makeProps({ showAddPageModal: true });
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.createPage());

    expect(props.savePageSetting).toHaveBeenCalledWith(
      expect.any(String),
      'label',
      'New Page',
    );
  });

  it('deduplicates page IDs when slug already exists', () => {
    const props = makeProps({
      pagesConfig: { pages: ['home', 'kitchen'], home: [], kitchen: [] },
      showAddPageModal: true,
    });
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.setNewPageLabel('Kitchen'));
    act(() => result.current.createPage());

    expect(props.persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: ['home', 'kitchen', 'kitchen_2'],
      }),
    );
  });

  it('creates a standard page named Media without using media special page id', () => {
    const props = makeProps({ showAddPageModal: true });
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.setNewPageLabel('Media'));
    act(() => result.current.createPage());

    expect(props.persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: ['home', 'page_media'],
        page_media: [],
      }),
    );
    expect(props.savePageSetting).toHaveBeenCalledWith('page_media', 'label', 'Media');
    expect(props.setActivePage).toHaveBeenCalledWith('page_media');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// createMediaPage
// ═════════════════════════════════════════════════════════════════════════
describe('usePageManagement › createMediaPage', () => {
  it('creates a media page with the default Sonos label', () => {
    const props = makeProps();
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.createMediaPage());

    expect(props.persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: expect.arrayContaining(['media']),
      }),
    );
    expect(props.savePageSetting).toHaveBeenCalledWith('media', 'label', 'Media');
    expect(props.savePageSetting).toHaveBeenCalledWith('media', 'icon', 'Speaker');
    expect(props.savePageSetting).toHaveBeenCalledWith('media', 'type', 'media');
    expect(props.savePageSetting).toHaveBeenCalledWith('media', 'mediaIds', []);
    expect(props.setShowAddPageModal).toHaveBeenCalledWith(false);
  });

  it('increments label number when media page already exists', () => {
    const props = makeProps({
      pagesConfig: { pages: ['home', 'media'], home: [], media: [] },
      pageSettings: { media: { label: 'Media' } },
    });
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.createMediaPage());

    expect(props.savePageSetting).toHaveBeenCalledWith('media_2', 'label', 'Media 2');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// deletePage
// ═════════════════════════════════════════════════════════════════════════
describe('usePageManagement › deletePage', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('removes the page from config and settings', () => {
    const props = makeProps({
      pagesConfig: { pages: ['home', 'kitchen'], home: [], kitchen: ['c1'] },
      pageSettings: { kitchen: { label: 'Kitchen' } },
      activePage: 'kitchen',
    });
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.deletePage('kitchen'));

    expect(props.persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({ pages: ['home'] }),
    );
    expect(props.persistPageSettings).toHaveBeenCalledWith(
      expect.not.objectContaining({ kitchen: expect.anything() }),
    );
    expect(props.setActivePage).toHaveBeenCalledWith('home');
  });

  it('does nothing for the home page', () => {
    const props = makeProps();
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.deletePage('home'));

    expect(props.persistConfig).not.toHaveBeenCalled();
  });

  it('does nothing when user cancels confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const props = makeProps({
      pagesConfig: { pages: ['home', 'kitchen'], home: [], kitchen: [] },
    });
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.deletePage('kitchen'));

    expect(props.persistConfig).not.toHaveBeenCalled();
  });

  it('does nothing for null/undefined pageId', () => {
    const props = makeProps();
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.deletePage(null));
    act(() => result.current.deletePage(undefined));

    expect(props.persistConfig).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// removeCard
// ═════════════════════════════════════════════════════════════════════════
describe('usePageManagement › removeCard', () => {
  it('removes a card from the active page', () => {
    const props = makeProps({
      pagesConfig: { pages: ['home'], home: ['card1', 'card2', 'card3'] },
      activePage: 'home',
    });
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.removeCard('card2'));

    expect(props.persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({ home: ['card1', 'card3'] }),
    );
  });

  it('removes a card from the header list', () => {
    const props = makeProps({
      pagesConfig: { pages: ['home'], home: [], header: ['h1', 'h2'] },
    });
    const { result } = renderHook(() => usePageManagement(props));

    act(() => result.current.removeCard('h1', 'header'));

    expect(props.persistConfig).toHaveBeenCalledWith(
      expect.objectContaining({ header: ['h2'] }),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Form reset on modal open
// ═════════════════════════════════════════════════════════════════════════
describe('usePageManagement › modal form reset', () => {
  it('resets newPageLabel and newPageIcon when modal opens', () => {
    const props = makeProps({ showAddPageModal: false });
    const { result, rerender } = renderHook(
      (p) => usePageManagement(p),
      { initialProps: props },
    );

    // Set some values
    act(() => {
      result.current.setNewPageLabel('Temp');
      result.current.setNewPageIcon('Star');
    });
    expect(result.current.newPageLabel).toBe('Temp');

    // Open the modal
    rerender({ ...props, showAddPageModal: true });
    expect(result.current.newPageLabel).toBe('');
    expect(result.current.newPageIcon).toBeNull();
  });
});
