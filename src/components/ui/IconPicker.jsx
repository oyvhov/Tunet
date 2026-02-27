import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getAllIconKeys, getIconComponent, preloadMdiIcons } from '../../icons';

export default function IconPicker({ value, onSelect, onClear, t, maxHeightClass = 'max-h-72' }) {
  const [query, setQuery] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [open, setOpen] = useState(false);
  const [mdiLoadedVersion, setMdiLoadedVersion] = useState(0);
  const scrollRef = useRef(null);
  const translate = t || ((key) => key);

  const COLUMN_COUNT = 6;
  const ROW_HEIGHT = 52;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    preloadMdiIcons()
      .then(() => {
        if (!cancelled) setMdiLoadedVersion((prev) => prev + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const iconKeys = useMemo(() => {
    void mdiLoadedVersion;
    return getAllIconKeys()
      .slice()
      .sort((a, b) => a.localeCompare(b));
  }, [mdiLoadedVersion]);
  const filteredKeys = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return iconKeys;
    return iconKeys.filter((key) => key.toLowerCase().includes(q));
  }, [iconKeys, query]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    const updateHeight = () => {
      if (!scrollRef.current) return;
      setContainerHeight(scrollRef.current.clientHeight || 0);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [query]);

  const totalRows = Math.ceil(filteredKeys.length / COLUMN_COUNT);
  const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2;
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
  const endRow = Math.min(totalRows, startRow + visibleRowCount);
  const startIndex = startRow * COLUMN_COUNT;
  const endIndex = endRow * COLUMN_COUNT;
  const visibleKeys = filteredKeys.slice(startIndex, endIndex);
  const topSpacerHeight = startRow * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow) * ROW_HEIGHT);

  const SelectedIcon = value ? getIconComponent(value) : RefreshCw;
  const selectedLabel = value || '';

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="popup-surface flex w-full items-center justify-between rounded-2xl px-4 py-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${value ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
          >
            <SelectedIcon className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {translate('form.chooseIcon')}
            </span>
            {selectedLabel && (
              <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                {selectedLabel}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {open ? translate('common.cancel') : translate('form.searchIcon')}
        </span>
      </button>

      {open && (
        <div className="space-y-3">
          <input
            type="text"
            className="popup-surface w-full rounded-xl px-4 py-2 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
            placeholder={translate('form.searchIcon')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {onClear && (
            <button
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className={`w-full rounded-xl px-3 py-2 text-xs font-bold tracking-widest uppercase ${!value ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
              title={translate('form.defaultIcon')}
            >
              {translate('form.defaultIcon')}
            </button>
          )}
          <div
            ref={scrollRef}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            className={`custom-scrollbar grid h-60 grid-cols-5 content-start items-start gap-2 overflow-y-auto pr-2 sm:h-72 sm:grid-cols-6 ${maxHeightClass}`}
          >
            {filteredKeys.length === 0 ? (
              <div className="col-span-6 py-2 text-center text-xs text-[var(--text-secondary)]">
                {translate('form.noIconsFound')}
              </div>
            ) : (
              <>
                {topSpacerHeight > 0 && (
                  <div className="col-span-6" style={{ height: topSpacerHeight }} />
                )}
                {visibleKeys.map((iconName) => {
                  const Icon = getIconComponent(iconName);
                  if (!Icon) return null;
                  const isSelected = value === iconName;
                  return (
                    <button
                      key={iconName}
                      onClick={() => {
                        onSelect(iconName);
                        setOpen(false);
                      }}
                      className={`flex items-center justify-center rounded-xl p-3 transition-all ${isSelected ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'popup-surface popup-surface-hover text-gray-500'}`}
                      title={iconName}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
                {bottomSpacerHeight > 0 && (
                  <div className="col-span-6" style={{ height: bottomSpacerHeight }} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
