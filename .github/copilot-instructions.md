# Tunet Dashboard — Copilot Instructions

## Big picture
- React 18 + Vite Home Assistant dashboard. Real‑time entity updates via `window.HAWS` WebSocket; all configuration persists to simple localStorage keys (no database).
- **Architecture**:
  - **Data/Config**: Managed in `src/contexts` (`ConfigContext`, `PageContext`, `HomeAssistantContext`).
  - **UI Orchestration**: `src/App.jsx` handles main layout, modal visibility state, and drag-and-drop.
  - **Modals**: Rendered via `ModalOrchestrator` in `src/rendering/`, controlled by local state.

## Core data flow
1. **Init**: Read `ha_url`/`ha_token` from localStorage (via context).
2. **Connection**: `createConnection()` + `subscribeEntities()` updates global `entities` object.
3. **Usage**: Components consume config/entities via hooks. User changes persist immediately to localStorage.

## Project structure
```
src/
  App.jsx                 # Main layout, grid rendering, modal managers
  main.jsx                # Entry point + ErrorBoundary
  styles/                 # CSS (index.css, dashboard.css, animations.css)
  config/                 # Pure data: constants, defaults, themes, onboarding
  icons/                  # Icon barrel (lucide re-exports + iconMap registry)
  utils/                  # Pure logic: formatting, cardUtils, gridLayout, dragAndDrop, logger
  contexts/               # Global state (ConfigContext, PageContext, HomeAssistantContext)
  hooks/                  # Custom React hooks
  services/               # HA WebSocket client, card actions, OAuth, Nordpool utils
  i18n/                   # Translation files (en.json, nn.json)
  layouts/                # Header, StatusBar
  components/
    cards/                # Dashboard card widgets (SensorCard, LightCard, etc.)
    charts/               # Graphs & data viz (SparkLine, WeatherGraph, etc.)
    sidebars/             # Sidebar panels (Theme, Layout, Header)
    ui/                   # Shared primitives (M3Slider, IconPicker, ModernDropdown, etc.)
    pages/                # Full-page views (MediaPage, PageNavigation)
    effects/              # Visual effects (AuroraBackground, WeatherEffects)
  modals/                 # All dialogs (edit settings, device controls)
  rendering/              # Card renderer dispatch + ModalOrchestrator
  __tests__/              # Unit tests (vitest)
```

## Patterns & conventions
- **Card Data**: Generic cards (e.g., `GenericClimateCard`) read entity IDs from `cardSettings[settingsKey]`.
- **Sizing**: `settings.size` is `'small'|'large'`. Toggle capability checked via `canToggleSize()`.
- **Hooks**: `useEnergyData(entity, now)` expects a single entity object.
- **Icons**: selection stored as string names; mapped via `src/icons/iconMap.js`.
- **i18n**: keys in `src/i18n/{en,nn}.json`. Setup is manual (no i18next).
- **Units (Metric/Imperial)**:
  - Never hard-code units in UI logic.
  - Read Home Assistant unit preferences from `useHomeAssistantMeta()` (`haConfig`) and resolve final mode with `getEffectiveUnitMode(unitsMode, haConfig)`.
  - Use shared helpers from `src/utils/units` (`inferUnitKind`, `convertValueByKind`, `getDisplayUnitForKind`, `formatUnitValue`) for display values.
  - For numeric sensor/modal values, convert from entity unit to active HA mode before rendering.
- **Styling**:
  - **Modals**: Use `.popup-surface` for boxed content (lists, groups) inside modals. Avoid manual `bg-[var(--glass-bg)]` where `.popup-surface` works.
  - **Cards**: Keep minimal. No heavy borders.
  - **Glassmorphism**: heavily used via CSS variables (`--glass-bg`, `--glass-border`).

## LocalStorage keys (prefix `tunet_*`)
- `tunet_pages_config` (layout), `tunet_card_settings` (entity mappings), `tunet_hidden_cards`, `tunet_theme`, `tunet_language`.

## Dev workflow
- `npm run dev` (Vite, port 5173)
- `npm run build` -> `dist/`
- `docker-compose up`

## Pitfalls to avoid
- **State split**: Don't put everything in `App.jsx`. Use contexts for data/config.
- **HA Connection**: Always check `if (!conn)` or `!connected` before making calls.
- **Hooks**: Don't change hook order.
- **Modals**: Ensure they have `popup-anim` class for entry animation.
