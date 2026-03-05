# Tunet Dashboard — Copilot Instructions

## Big picture

- React 18 + Vite Home Assistant dashboard. Real‑time entity updates via `window.HAWS` WebSocket; all configuration persists to simple localStorage keys (no database).
- **Architecture**:
  - **Data/Config**: Managed in `src/contexts` (`ConfigContext`, `PageContext`, `HomeAssistantContext`, `AppUiContext`, `ModalContext`).
  - **UI Orchestration**: `src/App.jsx` handles main layout, grid rendering, modal visibility state, and drag-and-drop.
  - **Modals**: Rendered via `ModalOrchestrator` in `src/rendering/`, controlled locally via `useModalState()` hook.

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
  i18n/                   # Translation files (en.json, de.json, nb.json, nn.json, sv.json, zh.json)
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
  types/                  # TypeScript type definitions (dashboard.js)
  __tests__/              # Unit tests (vitest)

e2e/
  fixtures.js             # Playwright custom fixtures (mockHAConnection, authenticatedPage)
  oauth-flow.e2e.js       # 11 OAuth authentication flow tests
  drag-and-drop.e2e.js    # 11 drag & drop interaction tests
  modals.e2e.js           # 11 modal interaction tests
  README.md               # E2E test documentation

playwright.config.js      # Playwright configuration (Chromium + Firefox)
E2E_TESTS_SETUP.md        # Comprehensive E2E setup guide
```

## Patterns & conventions

- **Card Data**: Generic cards (e.g., `GenericClimateCard`) read entity IDs from `cardSettings[settingsKey]`.
- **Sizing**: `settings.size` is `'small'|'large'`. Toggle capability checked via `canToggleSize()`.
- **Hooks**: `useEnergyData(entity, now)` expects a single entity object.
- **Icons**: selection stored as string names; mapped via `src/icons/iconMap.js`.
- **i18n**: keys in `src/i18n/{en,de,nb,nn,sv,zh}.json`. Setup is manual (no i18next).
- **Units (Metric/Imperial)**:
  - Never hard-code units in UI logic.
  - Read Home Assistant unit preferences from `useHomeAssistantMeta()` (`haConfig`) and resolve final mode with `getEffectiveUnitMode(unitsMode, haConfig)`.
  - Use shared helpers from `src/utils/units` (`inferUnitKind`, `convertValueByKind`, `getDisplayUnitForKind`, `formatUnitValue`) for display values.
  - For numeric sensor/modal values, convert from entity unit to active HA mode before rendering.
- **Styling**:
  - **Modals**: Use `.popup-surface` for boxed content (lists, groups) inside modals. Avoid manual `bg-[var(--glass-bg)]` where `.popup-surface` works.
  - **Cards**: Keep minimal. No heavy borders.
  - **Glassmorphism**: heavily used via CSS variables (`--glass-bg`, `--glass-border`).

## Performance optimizations (March 2026)

- **React.memo()**: All 21 card components wrapped with `React.memo()` to prevent unnecessary re-renders. This includes:
  - AlarmCard, CalendarCard, CameraCard, CarCard, CoverCard, FanCard
  - GenericAndroidTVCard, GenericClimateCard, GenericEnergyCostCard, GenericNordpoolCard
  - LightCard, MediaCards, MissingEntityCard, PersonStatus, RoomCard, SensorCard
  - SpacerCard, StatusPill, TodoCard, VacuumCard, WeatherTempCard
  - When adding new card components, ensure they are wrapped with `React.memo()` to maintain consistency
- **Code stats**: 51,937 total lines of code (src: 50,391, server: 1,014, scripts: 532)
- **Code quality review** (March 2026): Overall 8.1/10 rating with strong architecture (9/10) and services (9/10)
  - Key improvement areas: E2E testing (now complete), bundle size tracking, API caching layer, design token documentation

## LocalStorage keys (prefix `tunet_*`)

- `tunet_pages_config` (layout), `tunet_card_settings` (entity mappings), `tunet_hidden_cards`, `tunet_theme`, `tunet_language`.

## Dev workflow

- `npm run dev` (Vite, port 5173)
- `npm run build` -> `dist/`
- `npm run lint` (ESLint validation)
- `npm test` (Vitest unit/integration tests)
- `npm run test:e2e` (Playwright E2E tests, headless)
- `npm run test:e2e:ui` (Playwright interactive mode—recommended for development)
- `npm run test:e2e:headed` (Playwright with visible browser)
- `docker-compose up`

## Testing infrastructure

**Vitest (Unit & Integration):**
- Located in `src/__tests__/` with 25+ test suites
- Run with `npm test`
- Covers core logic: cardUtils, gridLayout, i18n, themes, hooks, contexts

**Playwright E2E Tests (New—March 2026):**
- Located in `e2e/` directory with 33 test cases across 3 flows
- **OAuth Flow** (11 tests): onboarding, token management, validation, logout, redirect handling
- **Drag & Drop** (11 tests): edit mode, reordering, persistence, mobile support, cancellation
- **Modal Interactions** (11 tests): open/close, Escape key, theme/language switching, focus management
- Configuration: `playwright.config.js` (Chromium + Firefox, auto-starts dev server)
- Custom fixtures in `e2e/fixtures.js`:
  - `mockHAConnection`: Intercepts WebSocket, simulates HA protocol with mock entities
  - `authenticatedPage`: Pre-populates OAuth tokens and HA URL in localStorage
  - `context`: Auto-configures test environment
- Run locally with `npm run test:e2e:ui` (best for debugging)
- CI/CD ready with retry logic and HTML reporting
- See `E2E_TESTS_SETUP.md` for detailed guide and `e2e/README.md` for test descriptions

## Release notes quality

- Keep release notes short and natural.
- Avoid placeholder text such as `Release metadata sync.`.
- Mention major shipped features/fixes and add issue references when relevant (for example `(#96)`).

## Testing best practices

- **E2E Tests**: Before submitting critical flow changes (auth, drag-drop, modals), verify with E2E tests: `npm run test:e2e:ui`
- **Playwright fixtures**: Use pre-built fixtures in `e2e/fixtures.js` (`mockHAConnection`, `authenticatedPage`) for consistent test environment
- **WebSocket mocking**: All HA WebSocket connections are mocked in tests via `MockWebSocket` class; tests use synthetic entity data
- **Selectors**: E2E tests use flexible selectors with fallbacks to handle theme/DOM variations
- **Test data**: OAuth tokens and HA URLs are pre-populated in test fixtures; no need to hardcode credentials in tests

## Pitfalls to avoid

- **State split**: Don't put everything in `App.jsx`. Use contexts for data/config.
- **HA Connection**: Always check `if (!conn)` or `!connected` before making calls.
- **Hooks**: Don't change hook order.
- **Modals**: Ensure they have `popup-anim` class for entry animation.
- **Card components**: Ensure new card components are wrapped with `React.memo()` to maintain performance.
- **E2E Tests**: When modifying critical flows (OAuth, drag-drop, modals), update corresponding E2E tests in `e2e/` to maintain coverage.
