# Hassen Dashboard — Copilot Instructions

## Big picture
- React 18 + Vite Home Assistant dashboard. Real‑time entity updates via `window.HAWS` WebSocket; all user changes persist to localStorage (no save button).
- State is centralized in [src/App.jsx](../src/App.jsx); do not split it unless explicitly requested.

## Core data flow
1. Read `ha_url`/`ha_token` from localStorage.
2. `createConnection()` + `subscribeEntities()` updates `entities` keyed by `entity_id`.
3. Cards read entity data, render, and persist user changes immediately.

## Key files & modules
- [src/App.jsx](../src/App.jsx): app orchestration, renderers, modals, drag/drop.
- [src/contexts](../src/contexts): `useConfig`, `usePages`, `useHomeAssistant` (barrel at [src/contexts/index.js](../src/contexts/index.js)).
- [src/services/haClient.js](../src/services/haClient.js): HA WebSocket helpers (barrel at [src/services/index.js](../src/services/index.js)).
- [src/modals](../src/modals): all modal components (barrel at [src/modals/index.js](../src/modals/index.js)).
- [src/components](../src/components): card components and UI primitives (barrel at [src/components/index.js](../src/components/index.js)).

## Patterns & conventions
- **Generic cards** read entity IDs from `cardSettings[settingsKey]` (e.g. `climateId`, `weatherId`, `mediaPlayerId`).
- **Sizing**: `settings.size` is `'small'|'large'` and toggled via `canToggleSize()`.
- **Hooks**: `useEnergyData(entity, now)` expects a single entity object (not the whole `entities`).
- **Icons**: store icon names in localStorage and map via [src/iconMap.js](../src/iconMap.js).
- **i18n**: keys live in [src/i18n/en.json](../src/i18n/en.json) and [src/i18n/nn.json](../src/i18n/nn.json) (barrel at [src/i18n/index.js](../src/i18n/index.js)).
- **UI**: keep car-mapping sensor boxes minimal (smaller padding, smaller radius, no flashy hover) across themes.

## LocalStorage keys (prefix `midttunet_*`)
- `midttunet_pages_config`, `midttunet_card_settings`, `midttunet_hidden_cards`, `midttunet_custom_names`, `midttunet_custom_icons`, `midttunet_grid_columns`, `midttunet_theme`, `midttunet_language`, `midttunet_inactivity_timeout`.

## Dev workflow
- `npm run dev` (Vite, port 5173), `npm run build`, `npm run postbuild`, `docker-compose up`.

## Pitfalls to avoid
- Don’t add a state library; keep localStorage + React state.
- Always guard HA calls with `if (!conn)`.
- Don’t change hook order (no early returns inside hooks).

## Notes
- Modals render inline (no portals) and are controlled by state in `App.jsx`.
