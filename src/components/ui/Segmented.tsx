import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface SegmentedOption<V extends string | number> {
  value: V;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

interface SegmentedProps<V extends string | number> {
  options: SegmentedOption<V>[];
  value: V | null | undefined;
  onChange: (value: NoInfer<V>) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  block?: boolean;
  className?: string;
  'data-testid'?: string;
}

/** One choice out of a few, with a single "selected" look everywhere. */
export default function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  block = false,
  className,
  ...rest
}: SegmentedProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !option.disabled);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key) || enabled.length === 0) return;
    event.preventDefault();
    const position = enabled.findIndex((entry) => entry.index === index);
    let next = position;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = (position + 1) % enabled.length;
    else next = (position - 1 + enabled.length) % enabled.length;
    const target = enabled[next];
    onChange(target.option.value);
    refs.current[target.index]?.focus();
  };

  const selectedIndex = options.findIndex((option) => option.value === value);
  const focusIndex = selectedIndex >= 0 ? selectedIndex : (enabled[0]?.index ?? 0);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={['ui-segmented', block ? 'ui-segmented--block' : '', className || '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.ariaLabel}
            tabIndex={index === focusIndex ? 0 : -1}
            disabled={option.disabled}
            className="ui-segmented__option"
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
