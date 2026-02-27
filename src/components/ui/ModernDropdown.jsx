import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ModernDropdown({
  label,
  icon: Icon,
  options,
  current,
  onChange,
  map,
  placeholder = 'Not selected',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (val) => (map && map[val] ? map[val] : val);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <p
        className="mb-3 ml-1 text-xs font-bold uppercase"
        style={{ color: 'rgba(107, 114, 128, 1)', letterSpacing: '0.2em' }}
      >
        {label}
      </p>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group popup-surface popup-surface-hover flex w-full items-center justify-between rounded-2xl px-6 py-4 transition-all"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-gray-400 transition-colors group-hover:text-[var(--accent-color)]" />
          <span
            className="text-xs font-bold tracking-widest uppercase italic"
            style={{ color: 'var(--text-secondary)' }}
          >
            {String(getLabel(current) || placeholder)}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-2xl border shadow-2xl"
          style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="max-h-48 overflow-y-auto">
            {(options || []).map((option) => (
              <button
                key={option}
                onClick={() => {
                  if (typeof onChange === 'function') onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full px-6 py-3 text-left text-xs font-bold tracking-widest uppercase transition-all ${current === option ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                style={{ backgroundColor: current === option ? 'var(--accent-bg)' : 'transparent' }}
              >
                {String(getLabel(option))}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
