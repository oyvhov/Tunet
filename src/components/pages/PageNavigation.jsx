import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Plus, Edit2, ChevronDown } from '../../icons';
import { getIconComponent } from '../../icons';
import { useModalActions, usePages } from '../../contexts';

// ── Edit-mode page manager popover ──────────────────────────────────────

function PageManagerPopover({
  pages,
  activePage,
  setActivePage,
  setEditingPage,
  pageSettings,
  pagesConfig,
  persistConfig,
  setShowAddPageModal,
  onClose,
  t,
}) {
  const ref = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const pageOrder = pagesConfig?.pages || [];

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const movePage = (fromIndex, toIndex) => {
    if (!persistConfig || fromIndex === toIndex) return;
    const next = [...pageOrder];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    persistConfig({ ...pagesConfig, pages: next });
  };

  return (
    <div
      ref={ref}
      className={`absolute top-full left-0 z-50 mt-2 w-52 origin-top-left translate-y-0 scale-100 transform rounded-2xl border border-white/10 p-1.5 opacity-100 shadow-2xl transition-all duration-200`}
      style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(20px)' }}
    >
      <div className="max-h-72 space-y-0.5 overflow-y-auto">
        {pages.map((page, idx) => {
          const settings = pageSettings[page.id] || {};
          const label = settings.label || page.label;
          const isHidden = settings.hidden;
          const Icon = settings.icon ? getIconComponent(settings.icon) || page.icon : page.icon;
          const isActive = activePage === page.id;
          const isOver = overIdx === idx && dragIdx !== idx;

          return (
            <div
              key={page.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIdx(idx);
              }}
              onDragLeave={() => setOverIdx(null)}
              onDrop={() => {
                if (dragIdx !== null) movePage(dragIdx, idx);
                setDragIdx(null);
                setOverIdx(null);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setOverIdx(null);
              }}
              className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-white/10 ${
                isOver ? 'bg-[var(--accent-color)]/10' : ''
              } ${isHidden ? 'opacity-50' : ''}`}
            >
              <button
                type="button"
                onClick={() => {
                  setActivePage(page.id);
                  onClose();
                }}
                className="flex min-w-0 flex-1 items-center gap-2.5"
              >
                <div
                  className={`shrink-0 rounded-md p-1.5 transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                      : 'bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-semibold ${
                      isActive
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)] group-hover:text-white'
                    }`}
                  >
                    {label}
                  </p>
                  {isHidden && (
                    <p className="text-[9px] tracking-wider text-[var(--text-muted)] uppercase">
                      {t('nav.hidden') || 'Hidden'}
                    </p>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPage(page.id);
                  onClose();
                }}
                className="shrink-0 rounded-md p-1 text-[var(--accent-color)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10"
                title={t('nav.editPage') || 'Edit page'}
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mx-2 my-0.5 h-px bg-white/5" />

      <button
        type="button"
        onClick={() => {
          setShowAddPageModal(true);
          onClose();
        }}
        className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-white/10"
      >
        <div className="rounded-md bg-[var(--accent-bg)] p-1.5 text-[var(--accent-color)] transition-colors group-hover:bg-[var(--accent-color)] group-hover:text-white">
          <Plus className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-white">
          {t('nav.addPage')}
        </p>
      </button>
    </div>
  );
}

// ── Main navigation ─────────────────────────────────────────────────────

export const PAGE_NAV_STYLES = ['pill', 'segmented', 'underline', 'minimal', 'expand'];

export const PAGE_NAV_SIZES = ['sm', 'md', 'lg'];

// Size tokens read by the item classes below via CSS variables.
const NAV_SIZE_VARS = {
  sm: {
    '--nav-px': '0.875rem',
    '--nav-py': '0.4rem',
    '--nav-font': '11px',
    '--nav-icon': '0.875rem',
  },
  md: { '--nav-px': '1.25rem', '--nav-py': '0.625rem', '--nav-font': '12px', '--nav-icon': '1rem' },
  lg: { '--nav-px': '1.5rem', '--nav-py': '0.8rem', '--nav-font': '14px', '--nav-icon': '1.25rem' },
};

const SLIDING_NAV_STYLES = ['segmented', 'underline'];

const getNavItemClass = (navStyle, isActive, accent, sliding) => {
  const activeText = accent ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]';
  const idleText = 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]';
  const activeBg = accent ? 'bg-[var(--accent-bg)]' : 'bg-[var(--glass-bg-hover)]';
  switch (navStyle) {
    case 'segmented':
      return `rounded-full border px-[calc(var(--nav-px)*0.8)] py-[calc(var(--nav-py)*0.8)] ${
        isActive
          ? `${sliding ? 'border-transparent bg-transparent' : `border-[var(--glass-border)] ${activeBg}`} ${activeText}`
          : `border-transparent bg-transparent ${idleText}`
      }`;
    case 'underline':
      return `rounded-none border-0 px-1 py-[var(--nav-py)] ${isActive ? activeText : idleText}`;
    case 'minimal':
      return `rounded-xl border-0 px-2 py-[var(--nav-py)] ${
        isActive ? activeText : `${idleText} opacity-70 hover:opacity-100`
      }`;
    case 'expand':
      return `rounded-full border ${
        isActive
          ? `border-[var(--glass-border)] px-[var(--nav-px)] py-[var(--nav-py)] ${activeBg} ${activeText}`
          : `border-transparent bg-[var(--glass-bg)] p-[var(--nav-py)] ${idleText} hover:bg-[var(--glass-bg-hover)]`
      }`;
    default:
      return `rounded-2xl border px-3 py-2.5 sm:rounded-full sm:px-[var(--nav-px)] sm:py-[var(--nav-py)] ${
        isActive
          ? `border-[var(--glass-border)] ${activeBg} ${activeText}`
          : `border-transparent bg-[var(--glass-bg)] ${idleText} hover:bg-[var(--glass-bg-hover)]`
      }`;
  }
};

const NAV_TRACK_CLASS = {
  pill: 'gap-[calc(var(--nav-px)*0.6)]',
  segmented:
    'gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-1 sm:w-fit sm:flex-none',
  underline: 'gap-[calc(var(--nav-px)*1.1)] border-b border-[var(--glass-border)]',
  minimal: 'gap-[calc(var(--nav-px)*0.6)]',
  expand: 'gap-2',
};

/**
 * PageNavigation - Navigation component for switching between pages
 *
 * In view mode: horizontal scrollable pill bar.
 * In edit mode: horizontal pills + a pinned "Pages" button that opens
 *   a dropdown with all pages, drag-reorder, edit, and add-page.
 */
export default function PageNavigation({
  pages,
  activePage,
  setActivePage,
  editMode,
  setEditingPage,
  t,
}) {
  const { pagesConfig, persistConfig, pageSettings, headerSettings } = usePages();
  const { setShowAddPageModal } = useModalActions();
  const showLabelsOnMobile = headerSettings?.showPagePillLabelsOnMobile ?? false;
  const navStyle = PAGE_NAV_STYLES.includes(headerSettings?.navStyle)
    ? headerSettings.navStyle
    : 'pill';
  const navAccent = headerSettings?.navActiveAccent === true;
  const navShowIcons = headerSettings?.navShowIcons !== false;
  const navUppercase = headerSettings?.navUppercase === true;
  const navSize = PAGE_NAV_SIZES.includes(headerSettings?.navSize) ? headerSettings.navSize : 'md';
  const sliding = SLIDING_NAV_STYLES.includes(navStyle);
  const [dragOverId, setDragOverId] = useState(null);
  const [showManager, setShowManager] = useState(false);
  const pageOrder = pagesConfig?.pages || [];
  const isSinglePage = pages.length === 1;

  const toggleManager = useCallback(() => setShowManager((v) => !v), []);
  const closeManager = useCallback(() => setShowManager(false), []);

  // Close popover when leaving edit mode
  useEffect(() => {
    if (!editMode) setShowManager(false);
  }, [editMode]);

  const trackRef = useRef(null);
  const [indicator, setIndicator] = useState(null);
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!sliding || !track) {
      setIndicator(null);
      return undefined;
    }
    const update = () => {
      const active = track.querySelector('[aria-current="page"]');
      const next = active
        ? {
            left: active.offsetLeft,
            top: active.offsetTop,
            width: active.offsetWidth,
            height: active.offsetHeight,
          }
        : null;
      setIndicator((prev) =>
        prev &&
        next &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next
      );
    };
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => observer.disconnect();
  }, [sliding, activePage, pages, navSize, navShowIcons, navUppercase, editMode]);

  const movePage = (sourceId, targetId) => {
    if (!persistConfig) return;
    if (!sourceId || !targetId || sourceId === targetId) return;
    const nextPages = [...pageOrder];
    const fromIndex = nextPages.indexOf(sourceId);
    const toIndex = nextPages.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    nextPages.splice(fromIndex, 1);
    nextPages.splice(toIndex, 0, sourceId);
    persistConfig({ ...pagesConfig, pages: nextPages });
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {/* Scrollable page pills */}
      <div className="scrollbar-hide min-w-0 flex-1 overflow-x-auto pb-2">
        <div
          ref={trackRef}
          className={`relative flex min-w-0 items-center ${NAV_TRACK_CLASS[navStyle]}`}
          style={/** @type {import('react').CSSProperties} */ (NAV_SIZE_VARS[navSize])}
          data-nav-style={navStyle}
          data-nav-size={navSize}
        >
          {sliding && indicator && (
            <span
              aria-hidden="true"
              data-nav-indicator
              className={`pointer-events-none absolute left-0 transition-[transform,width,height] duration-300 ease-out motion-reduce:transition-none ${
                navStyle === 'underline'
                  ? `-bottom-px h-0.5 rounded-full ${navAccent ? 'bg-[var(--accent-color)]' : 'bg-[var(--text-primary)]'}`
                  : `rounded-full border border-[var(--glass-border)] ${navAccent ? 'bg-[var(--accent-bg)]' : 'bg-[var(--glass-bg-hover)]'}`
              }`}
              style={{
                width: indicator.width,
                transform: `translateX(${indicator.left}px)`,
                ...(navStyle === 'underline'
                  ? {}
                  : { top: indicator.top, height: indicator.height }),
              }}
            />
          )}
          {pages.map((page) => {
            const settings = pageSettings[page.id] || {};
            const label = settings.label || page.label;
            const isHidden = settings.hidden;
            const hideSinglePagePill = settings.hideSinglePagePill === true;
            const Icon = settings.icon ? getIconComponent(settings.icon) || page.icon : page.icon;
            const isDragOver = dragOverId === page.id;

            if (!editMode && isHidden) return null;
            if (!editMode && isSinglePage && hideSinglePagePill) return null;

            return (
              <button
                key={page.id}
                aria-label={label}
                draggable={editMode}
                onClick={() => (editMode ? setEditingPage(page.id) : setActivePage(page.id))}
                onDragStart={(event) => {
                  if (!editMode) return;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', page.id);
                }}
                onDragOver={(event) => {
                  if (!editMode) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setDragOverId(page.id);
                }}
                onDragLeave={() => {
                  if (!editMode) return;
                  setDragOverId(null);
                }}
                onDrop={(event) => {
                  if (!editMode) return;
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData('text/plain');
                  setDragOverId(null);
                  movePage(sourceId, page.id);
                }}
                onDragEnd={() => setDragOverId(null)}
                aria-current={activePage === page.id ? 'page' : undefined}
                className={`relative z-10 flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-[calc(var(--nav-icon)*0.5)] text-[length:var(--nav-font)] font-bold whitespace-nowrap transition-all duration-300 sm:min-h-0 sm:min-w-0 ${navUppercase ? 'tracking-widest uppercase' : 'tracking-wide'} ${getNavItemClass(navStyle, activePage === page.id, navAccent, sliding && indicator !== null)} ${editMode && isHidden ? 'scale-95 border-gray-500 opacity-50' : ''} ${editMode ? 'cursor-move' : ''} ${isDragOver ? 'border-[var(--accent-color)]' : ''}`}
              >
                {(navShowIcons || navStyle === 'expand') && (
                  <Icon
                    className={`h-5 w-5 shrink-0 sm:h-[var(--nav-icon)] sm:w-[var(--nav-icon)] ${editMode && isHidden ? 'animate-pulse' : ''}`}
                  />
                )}
                <span
                  className={
                    navStyle === 'expand' && activePage !== page.id
                      ? 'sr-only'
                      : showLabelsOnMobile || !navShowIcons
                        ? undefined
                        : 'hidden sm:inline'
                  }
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pinned edit-mode page manager trigger — always visible */}
      {editMode && (
        <div className="relative shrink-0 pb-2">
          <button
            type="button"
            onClick={toggleManager}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase transition-all sm:px-4 sm:py-2.5 sm:text-xs ${
              showManager
                ? 'border-[var(--accent-color)] bg-[var(--glass-bg-hover)] text-[var(--accent-color)]'
                : 'border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('nav.addPage')}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showManager ? 'rotate-180' : ''}`}
            />
          </button>

          {showManager && (
            <PageManagerPopover
              pages={pages}
              activePage={activePage}
              setActivePage={setActivePage}
              setEditingPage={setEditingPage}
              pageSettings={pageSettings}
              pagesConfig={pagesConfig}
              persistConfig={persistConfig}
              setShowAddPageModal={setShowAddPageModal}
              onClose={closeManager}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
}
