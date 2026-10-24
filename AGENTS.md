# AGENTS.md — Tunet Dashboard

## Big picture

- React 19 + Vite Home Assistant dashboard. Real-time entity updates via `window.HAWS` WebSocket; dashboard config persists mostly to `localStorage`, while auth/session state also uses browser storage for same-browser reuse.
- Express and better-sqlite3 in `server/` handle profiles, settings, and encrypted storage.
- **Architecture**:
  - **Data/Config**: Managed in `src/contexts` (`ConfigContext`, `PageContext`, `HomeAssistantContext`, `AppUiContext`, `ModalContext`). Keep global state here, not in `App.jsx`.
  - **UI Orchestration**: `src/App.jsx` handles main layout, grid rendering, modal visibility state, and drag-and-drop.
  - **Modals**: Rendered via `ModalOrchestrator` in `src/rendering/`, controlled locally via `useModalState()` hook.
  - **Cards**: Register new card types in `src/rendering/`.

## Core data flow

1. **Init**: Read browser-stored Home Assistant config/auth state (`ha_url`, token-mode credentials, OAuth cache) via context/services.
2. **Connection**: `createConnection()` + `subscribeEntities()` updates global `entities` object.
3. **Usage**: Components consume config/entities via hooks. User changes persist immediately to browser storage and optional server-side profiles/settings APIs.

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
  i18n/                   # Translation files (en.json, de.json, es.json, fr.json, nb.json, nn.json, sv.json, zh.json)
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
  oauth-flow.e2e.js       # OAuth authentication flow tests
  drag-and-drop.e2e.js    # Drag & drop interaction tests
  modals.e2e.js           # Modal interaction tests
  README.md               # E2E test documentation

playwright.config.js      # Playwright configuration (Chromium + Firefox)
```

## Patterns & conventions

- **Card Data**: Generic cards (e.g., `GenericClimateCard`) read entity IDs from `cardSettings[settingsKey]`.
- **Sizing**: `settings.size` is `'small'|'large'`. Toggle capability checked via `canToggleSize()`.
- **Hooks**: `useEnergyData(entity, now)` expects a single entity object.
- **Icons**: import from the `src/icons/` barrel. Store selections as string names, mapped via `src/icons/iconMap.js`.
- **i18n**: keys in `src/i18n/{en,de,es,fr,nb,nn,sv,zh}.json`. Setup is manual (no i18next).
- **Units (Metric/Imperial)**:
  - Never hard-code units in UI logic.
  - Read Home Assistant unit preferences from `useHomeAssistantMeta()` (`haConfig`) and resolve final mode with `getEffectiveUnitMode(unitsMode, haConfig)`.
  - Use shared helpers from `src/utils/units` (`inferUnitKind`, `convertValueByKind`, `getDisplayUnitForKind`, `formatUnitValue`) for display values.
  - For numeric sensor/modal values, convert from entity unit to active HA mode before rendering.
- **Styling**:
  - **Modals**: Use `.popup-surface` for boxed content (lists, groups) inside modals. Avoid manual `bg-[var(--glass-bg)]` where `.popup-surface` works.
  - **Cards**: Keep minimal. No heavy borders.
  - **Glassmorphism**: heavily used via CSS variables (`--glass-bg`, `--glass-border`).

## Card rendering

- Wrap every card component in React.memo() to prevent unnecessary re-renders.

## LocalStorage keys (prefix `tunet_*`)

- `tunet_pages_config` (layout), `tunet_card_settings` (entity mappings), `tunet_hidden_cards`, `tunet_theme`, `tunet_language`.

## Dev workflow

- `npm run dev` (Vite, port 5173)
- `npm run build` -> `dist/`
- `npm run lint` (ESLint validation, plus the TypeScript-migration JS baseline check)
- `npm run typecheck` (TypeScript 7: loose JS checks for `src/`, strict JSDoc for `server/`, strict for `.ts`/`.tsx`)
- `npm test` (Vitest unit/integration tests)
- `npm run test:e2e` (Playwright E2E tests, headless)
- `npm run test:e2e:ui` (Playwright interactive mode—recommended for development)
- `npm run test:e2e:headed` (Playwright with visible browser)
- `docker-compose up`

Always run `npm run lint` and `npm test` before declaring a code change done.

After every code change, run `npm run build` and verify that the Docker postbuild completes and
produces `hassen-app:latest`. Then run `docker compose up -d --force-recreate app` and verify that
`tunet-dashboard` is healthy and uses the new image. Do not hand off a local code change before
the rebuilt container is running.

## Testing infrastructure

**Vitest (Unit & Integration):**

- Located in `src/__tests__/` with 25+ test suites
- Run with `npm test`
- Covers core logic: cardUtils, gridLayout, i18n, themes, hooks, contexts

**Playwright E2E Tests (New—March 2026):**

- Located in `e2e/` directory with coverage for OAuth, drag-and-drop, and modal flows across Chromium and Firefox
- **OAuth Flow**: onboarding, token management, validation, logout, redirect handling
- **Drag & Drop**: edit mode, reordering, persistence, mobile support, cancellation
- **Modal Interactions**: open/close, Escape key, theme/language switching, focus management
- Configuration: `playwright.config.js` (Chromium + Firefox, auto-starts dev server)
- Custom fixtures in `e2e/fixtures.js`:
  - `mockHAConnection`: Intercepts WebSocket, simulates HA protocol with mock entities
  - `authenticatedPage`: Pre-populates browser auth state and HA URL for test setup
  - `context`: Auto-configures test environment
- Run locally with `npm run test:e2e:ui` (best for debugging)
- CI/CD ready with retry logic and HTML reporting
- See `e2e/README.md` for test setup and descriptions.

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

## TypeScript migration

- New source files in `src/` are `.ts`/`.tsx`. `npm run lint` fails on a new `.js`/`.jsx` file (`scripts/check-js-baseline.mjs`). When you convert a file, `git mv` it and remove it from `scripts/js-baseline.txt` (or run `node scripts/check-js-baseline.mjs --update`).
- `.ts`/`.tsx` files are typechecked in strict mode (`tsconfig.strict.json`). Existing JS keeps the loose `checkJs` setup (`tsconfig.typecheck.json`); `server/` is strict via JSDoc (`tsconfig.server.json`).
- Conversion PRs rename files and add types only: no behaviour changes or refactors, roughly 1,500 changed lines at most. No `any`, `@ts-ignore` or `@ts-expect-error` without a comment explaining why. Type React props explicitly, keep `React.memo()` on cards, and replace PropTypes with TypeScript props.
- Order: leaf modules (`utils`, `config`, `services`, `i18n`, `icons`), then `types`/contexts/hooks, then components, then modals (only when no feature work is touching them), then `server/` and tests.
- Toolchain: `typescript` is pinned to 6.0 because typescript-eslint needs the classic compiler API, which TypeScript 7 does not ship yet. Typechecking uses TypeScript 7 through the `typescript7` alias (`node node_modules/typescript7/bin/tsc`). Drop the alias once typescript-eslint supports TypeScript 7.

## Discipline

- Don't over-engineer. Make the requested change, nothing more. No drive-by refactors, no unsolicited docstrings/comments/type annotations on untouched code (TypeScript migration PRs are the exception; see above).
- Don't add error handling for impossible cases. Validate at boundaries only.
- Always check `if (!conn)` / `!connected` before HA calls.
- Don't change React hook order.
- Update E2E tests in `e2e/` when modifying critical flows (OAuth, drag-drop, modals).
- Release notes: short, natural, mention major shipped items, link issues like `(#96)`.

- Run broad semantic searches serially, not in parallel.
