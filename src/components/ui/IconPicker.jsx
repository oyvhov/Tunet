import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getAllIconKeys, getIconComponent, preloadMdiIcons } from '../../icons';

export default function IconPicker({
  value,
  onSelect,
  onClear,
  t,
  maxHeightClass = 'max-h-72'
}) {
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

  const iconKeys = useMemo(() => getAllIconKeys().slice().sort((a, b) => a.localeCompare(b)), [mdiLoadedVersion]);
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
        className="w-full px-4 py-3 rounded-2xl popup-surface flex items-center justify-between"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${value ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
            <SelectedIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">
              {translate('form.chooseIcon')}
            </span>
            {selectedLabel && (
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {selectedLabel}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
          {open ? translate('common.cancel') : translate('form.searchIcon')}
        </span>
      </button>

      {open && (
        <div className="space-y-3">
          <input
            type="text"
            className="w-full px-4 py-2 text-[var(--text-primary)] rounded-xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
            placeholder={translate('form.searchIcon')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {onClear && (
            <button
              onClick={() => { onClear(); setOpen(false); }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${!value ? 'bg-blue-500/20 text-blue-400' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
              title={translate('form.defaultIcon')}
            >
              {translate('form.defaultIcon')}
            </button>
          )}
          <div
            ref={scrollRef}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            className={`grid grid-cols-5 sm:grid-cols-6 gap-2 content-start items-start overflow-y-auto custom-scrollbar pr-2 h-60 sm:h-72 ${maxHeightClass}`}
          >
            {filteredKeys.length === 0 ? (
              <div className="col-span-6 text-center text-xs text-[var(--text-secondary)] py-2">
                {translate('form.noIconsFound')}
              </div>
            ) : (
              <>
                {topSpacerHeight > 0 && <div className="col-span-6" style={{ height: topSpacerHeight }} />}
                {visibleKeys.map((iconName) => {
                  const Icon = getIconComponent(iconName);
                  if (!Icon) return null;
                  const isSelected = value === iconName;
                  return (
                    <button
                      key={iconName}
                      onClick={() => { onSelect(iconName); setOpen(false); }}
                      className={`p-3 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'popup-surface popup-surface-hover text-gray-500'}`}
                      title={iconName}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
                {bottomSpacerHeight > 0 && <div className="col-span-6" style={{ height: bottomSpacerHeight }} />}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
