import React from 'react';
import { ChevronDown, RotateCcw } from '../../icons';
import ModernDropdown from '../../components/ui/ModernDropdown';
import { SearchableSelect } from './CarMappingsSection';

export const FIELD_CLASS =
  'popup-surface w-full rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]';
const LABEL_CLASS = 'ml-1 block text-xs font-bold text-[var(--text-muted)] uppercase';
const HINT_CLASS = 'mt-1 ml-1 block text-[11px] text-[var(--text-muted)]';

/** @param {any} props */
export function SettingsSection({ title, description, resetLabel, onReset, children }) {
  const titleId = React.useId();
  return (
    <section aria-labelledby={titleId} className="popup-surface space-y-4 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4
            id={titleId}
            className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase"
          >
            {title}
          </h4>
          {description ? (
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{description}</p>
          ) : null}
        </div>
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            {resetLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** @param {any} props */
export function Field({ label, hint, htmlFor, labelId, children }) {
  const Label = htmlFor ? 'label' : 'p';
  return (
    <div>
      <Label id={labelId} htmlFor={htmlFor} className={LABEL_CLASS}>
        {label}
      </Label>
      <div className="mt-2">{children}</div>
      {hint ? <span className={HINT_CLASS}>{hint}</span> : null}
    </div>
  );
}

/** @param {any} props */
export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  ...rest
}) {
  const id = React.useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type={type}
        className={FIELD_CLASS}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        {...rest}
      />
    </Field>
  );
}

/** @param {any} props */
export function ToggleRow({ label, hint, checked, onChange }) {
  const labelId = React.useId();
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span id={labelId} className="block text-sm font-medium text-[var(--text-primary)]">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{hint}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-12 shrink-0 rounded-full border transition-colors ${checked ? 'border-transparent bg-[var(--accent-color)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]'}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-[var(--text-primary)] transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`}
        />
      </button>
    </label>
  );
}

/** @param {any} props */
export function ChoiceChips({ label, hint, options, value, onChange }) {
  const labelId = React.useId();
  return (
    <div role="group" aria-labelledby={labelId}>
      <Field label={label} hint={hint} labelId={labelId}>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(option.value)}
                className={`min-h-9 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${active ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

/** @param {any} props */
export function DropdownField({
  label,
  hint,
  icon,
  options,
  current,
  map,
  onChange,
  placeholder,
  t,
}) {
  const labelId = React.useId();
  return (
    <Field label={label} hint={hint} labelId={labelId}>
      <ModernDropdown
        icon={icon}
        label={label}
        labelHidden
        options={options}
        current={current}
        map={map}
        onChange={onChange}
        placeholder={placeholder}
        variant="compact"
        buttonClassName="rounded-2xl px-4 py-3"
        valueClassName="text-[11px]"
        menuPortal
        menuZIndex={130}
        t={t}
      />
    </Field>
  );
}

/** @param {any} props */
export function EntityField({ label, hint, value, options, entities, onChange, t }) {
  return (
    <div>
      <SearchableSelect
        label={label}
        labelClassName={LABEL_CLASS}
        value={value}
        options={options}
        entities={entities}
        onChange={onChange}
        placeholder={t('dropdown.noneSelected')}
        t={t}
      />
      {hint ? <span className={HINT_CLASS}>{hint}</span> : null}
    </div>
  );
}

/** @param {any} props */
export function Disclosure({ summary, children }) {
  return (
    <details className="group rounded-xl bg-[var(--glass-bg)] px-3 py-2">
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-2 space-y-4 pb-1">{children}</div>
    </details>
  );
}
