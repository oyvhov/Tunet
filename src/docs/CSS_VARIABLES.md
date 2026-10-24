# CSS Variables Reference

This file is the source of truth for theme tokens used by Tunet Dashboard.

## Where tokens are defined

- Theme definitions: `src/config/themes.ts`
- Applied at runtime: `src/contexts/ConfigContext.jsx`
- Global defaults/aliases: `src/styles/index.css`

## Naming rules

- Use semantic names: `--category-role-state`
- Prefer intent over color words in components
- New theme token keys must exist in all themes

## Core tokens

### Text

- `--text-primary`: Main readable text
- `--text-secondary`: Secondary labels and metadata
- `--text-muted`: Low emphasis text

### Surfaces

- `--bg-primary`: Main page background
- `--bg-secondary`: Secondary page background
- `--card-bg`: Card surface
- `--glass-bg`: Frosted/soft surface
- `--glass-bg-hover`: Hover state for glass surface
- `--modal-bg`: Modal base surface
- `--modal-surface`: Group/list surface inside modal

### Borders

- `--card-border`: Card border
- `--glass-border`: Neutral divider/border
- `--modal-border`: Modal border

### Accent

- `--accent-color`: Primary action color
- `--accent-bg`: Accent-tinted background

### Status tokens

- `--status-success-fg`, `--status-success-bg`, `--status-success-border`
- `--status-warning-fg`, `--status-warning-bg`, `--status-warning-border`
- `--status-error-fg`, `--status-error-bg`, `--status-error-border`
- `--status-info-fg`, `--status-info-bg`, `--status-info-border`

These status tokens are theme-aware and should replace hardcoded classes like `text-red-400` and `bg-red-500/10` in themed UI.

## Usage examples

```jsx
<div className="border border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-fg)]" />
```

```jsx
<span className="text-[var(--text-secondary)]" />
```

## Migration notes

- Legacy aliases still exist in `src/styles/index.css` for compatibility.
- Prefer status tokens for any success/warning/error/info UI.
- Avoid introducing new hardcoded `text-gray-*` or `bg-red-*` classes in themed components.
