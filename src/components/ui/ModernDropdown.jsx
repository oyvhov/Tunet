import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const HIDDEN_PORTAL_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  visibility: 'hidden',
  pointerEvents: 'none',
};

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {any} props.icon
 * @param {string[]} props.options
 * @param {string} props.current
 * @param {Function} props.onChange
 * @param {Record<string, string>} [props.map]
 * @param {string} [props.placeholder]
 * @param {Function} [props.t]
 * @param {boolean} [props.labelHidden]
 * @param {'default'|'compact'} [props.variant]
 * @param {string} [props.wrapperClassName]
 * @param {string} [props.buttonClassName]
 * @param {string} [props.menuClassName]
 * @param {string} [props.optionClassName]
 * @param {string} [props.valueClassName]
 * @param {boolean} [props.menuPortal]
 * @param {'start'|'end'} [props.menuAlign]
 * @param {number} [props.menuMinWidth]
 * @param {number} [props.menuOffset]
 * @param {boolean} [props.stopPropagation]
 */
export default function ModernDropdown({
  label,
  icon: Icon,
  options,
  current,
  onChange,
  map,
  placeholder,
  t,
  labelHidden = false,
  variant = 'default',
  wrapperClassName = '',
  buttonClassName = '',
  menuClassName = '',
  optionClassName = '',
  valueClassName = '',
  menuPortal = false,
  menuAlign = 'start',
  menuMinWidth,
  menuOffset = 8,
  stopPropagation = false,
}) {
  const resolvedPlaceholder = placeholder || t?.('dropdown.noneSelected') || 'Not selected';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const listboxId = useId().replace(/:/g, '');
  const [portalStyle, setPortalStyle] = useState(HIDDEN_PORTAL_STYLE);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        (!menuPortal || !menuRef.current?.contains(event.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuPortal]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !menuPortal || typeof window === 'undefined') return undefined;

    const updatePosition = () => {
      const triggerRect = buttonRef.current?.getBoundingClientRect();
      if (!triggerRect) return;

      const viewportPadding = 8;
      const targetWidth = Math.max(menuMinWidth || 0, triggerRect.width);
      const maxWidth = Math.max(0, window.innerWidth - viewportPadding * 2);
      const resolvedWidth = Math.min(targetWidth, maxWidth);
      const menuHeight = menuRef.current?.offsetHeight || 0;

      let left = menuAlign === 'end' ? triggerRect.right - resolvedWidth : triggerRect.left;
      left = Math.min(
        Math.max(viewportPadding, left),
        Math.max(viewportPadding, window.innerWidth - resolvedWidth - viewportPadding)
      );

      let top = triggerRect.bottom + menuOffset;
      if (
        menuHeight > 0 &&
        top + menuHeight > window.innerHeight - viewportPadding &&
        triggerRect.top - menuOffset - menuHeight >= viewportPadding
      ) {
        top = triggerRect.top - menuHeight - menuOffset;
      }

      setPortalStyle({
        position: 'fixed',
        top,
        left,
        width: resolvedWidth,
        zIndex: 80,
        visibility: 'visible',
        pointerEvents: 'auto',
      });
    };

    updatePosition();
    const frameId = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      setPortalStyle(HIDDEN_PORTAL_STYLE);
    };
  }, [isOpen, menuPortal, menuAlign, menuMinWidth, menuOffset, options]);

  const getLabel = (val) => (map && map[val] ? map[val] : val);
  const selectedLabel = String(getLabel(current) || resolvedPlaceholder);
  const isCompact = variant === 'compact';
  const baseWrapperClass = isCompact ? 'relative' : 'relative w-full';
  const baseButtonClass = isCompact
    ? 'group popup-surface popup-surface-hover flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all'
    : 'group popup-surface popup-surface-hover flex w-full items-center justify-between rounded-2xl px-6 py-4 transition-all';
  const baseMenuClass = isCompact
    ? 'overflow-hidden rounded-xl border shadow-2xl'
    : 'overflow-hidden rounded-2xl border shadow-2xl';
  const baseOptionClass = isCompact
    ? 'w-full px-3 py-2.5 text-left text-[10px] font-bold tracking-widest uppercase transition-all'
    : 'w-full px-6 py-3 text-left text-xs font-bold tracking-widest uppercase transition-all';
  const baseValueClass = isCompact
    ? 'min-w-0 truncate text-[10px] font-bold tracking-widest uppercase'
    : 'min-w-0 truncate text-xs font-bold tracking-widest uppercase italic';
  const labelText = label || resolvedPlaceholder;

  const handleTriggerClick = (event) => {
    if (stopPropagation) event.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleStopPropagation = (event) => {
    if (stopPropagation) event.stopPropagation();
  };

  const menuContent = (
    <div
      ref={menuRef}
      role="listbox"
      id={listboxId}
      className={`${baseMenuClass} ${menuClassName}`.trim()}
      style={
        menuPortal
          ? {
              ...(portalStyle || HIDDEN_PORTAL_STYLE),
              backgroundColor: 'var(--modal-bg)',
              borderColor: 'var(--glass-border)',
            }
          : { backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)' }
      }
      onClick={handleStopPropagation}
      onMouseDown={handleStopPropagation}
      onPointerDown={handleStopPropagation}
    >
      <div className={isCompact ? 'max-h-56 overflow-y-auto' : 'max-h-48 overflow-y-auto'}>
        {(options || []).map((option) => (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={current === option}
            onClick={(event) => {
              if (stopPropagation) event.stopPropagation();
              if (typeof onChange === 'function') onChange(option);
              setIsOpen(false);
            }}
            onMouseDown={handleStopPropagation}
            onPointerDown={handleStopPropagation}
            className={`${baseOptionClass} ${current === option ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'} ${optionClassName}`.trim()}
            style={{ backgroundColor: current === option ? 'var(--accent-bg)' : 'transparent' }}
          >
            {String(getLabel(option))}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`${baseWrapperClass} ${wrapperClassName}`.trim()} ref={dropdownRef}>
      {!labelHidden && (
        <p
          className="mb-3 ml-1 text-xs font-bold uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.2em' }}
        >
          {label}
        </p>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleTriggerClick}
        onMouseDown={handleStopPropagation}
        onPointerDown={handleStopPropagation}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={`${labelText}: ${selectedLabel}`}
        className={`${baseButtonClass} ${buttonClassName}`.trim()}
      >
        <div
          className={`flex min-w-0 items-center ${Icon ? (isCompact ? 'gap-2' : 'gap-3') : 'gap-0'}`}
        >
          {Icon ? (
            <Icon
              className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} flex-shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-color)]`}
            />
          ) : null}
          <span
            className={`${baseValueClass} ${valueClassName}`.trim()}
            style={{ color: 'var(--text-secondary)' }}
          >
            {selectedLabel}
          </span>
        </div>
        <ChevronDown
          className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} flex-shrink-0 text-[var(--text-muted)] transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen &&
        (menuPortal && typeof document !== 'undefined' ? (
          createPortal(menuContent, document.body)
        ) : (
          <div className="absolute top-full left-0 z-50 mt-2 w-full">{menuContent}</div>
        ))}
    </div>
  );
}
