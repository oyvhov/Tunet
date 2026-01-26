import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ICON_MAP } from '../iconMap';

const IconPicker = ({
  value,
  onSelect,
  onClear,
  t,
  maxHeightClass = 'max-h-60'
}) => {
  const [query, setQuery] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const scrollRef = useRef(null);
  const translate = t || ((key) => key);

  const COLUMN_COUNT = 6;
  const ROW_HEIGHT = 52;

  const iconKeys = useMemo(() => Object.keys(ICON_MAP).sort((a, b) => a.localeCompare(b)), []);
  const filteredKeys = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return iconKeys;
    return iconKeys.filter((key) => key.toLowerCase().includes(q));
  }, [iconKeys, query]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const updateHeight = () => {
      if (!scrollRef.current) return;
      setContainerHeight(scrollRef.current.clientHeight || 0);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

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

  return (
    <div className="space-y-3">
      <input
        type="text"
        className="w-full px-4 py-2 text-[var(--text-primary)] rounded-xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
        placeholder={translate('form.searchIcon')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {onClear && (
        <div className="grid grid-cols-6 gap-2">
          <button
            onClick={onClear}
            className={`p-3 rounded-xl flex items-center justify-center transition-all ${!value ? 'bg-blue-500/20 text-blue-400' : 'popup-surface popup-surface-hover text-gray-500'}`}
            title={translate('form.defaultIcon')}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      )}
      <div
        ref={scrollRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className={`grid grid-cols-6 gap-2 overflow-y-auto custom-scrollbar pr-2 ${maxHeightClass}`}
      >
        {filteredKeys.length === 0 ? (
          <div className="col-span-6 text-center text-xs text-[var(--text-secondary)] py-2">
            {translate('form.noIconsFound')}
          </div>
        ) : (
          <>
            {topSpacerHeight > 0 && <div className="col-span-6" style={{ height: topSpacerHeight }} />}
            {visibleKeys.map((iconName) => {
              const Icon = ICON_MAP[iconName];
              const isSelected = value === iconName;
              return (
                <button
                  key={iconName}
                  onClick={() => onSelect(iconName)}
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
  );
};

export default IconPicker;
