# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.15.2] — 2026-04-05

### Added
- New toggle in Header settings to show page pill labels on mobile (#112).

### Changed
- Edit button moved into the settings dropdown on mobile for a cleaner toolbar (#112).
- Sensor card large variant on mobile: name now renders on its own full-width row below the value, eliminating truncation (#112).
- Small sensor card gauge repositioned for better visual balance (#112).
- Haptic feedback now fires on pointer-up and is suppressed when the finger has scrolled, preventing unwanted vibration during scroll.


## [1.15.1] — 2026-04-05

### Fixed
- Downgraded eslint to v9 to fix add-on build failures caused by a peer dependency conflict (#128).


## [1.15.0] — 2026-04-05

### Added
- Battery page for monitoring all battery-powered device levels, low battery warnings, and offline tracking.
- Lights page with brightness and color controls for all light entities.
- Room Explorer page with enhanced controls and collapsible sections.
- Lava Lamp and Silk animated backgrounds.
- Toast notification system.
- PWA manifest and service worker shell.

### Changed
- Restyled page navigation pills and Add Page dropdown to match the Settings dropdown design.
- Restyled Add Page modal type tabs with icons matching the Add Card type pill design.
- Prefetch likely modals and cache build assets for faster interactions.
- Battery bar header, card material, density, and card scale options.
- Bumped dependency versions (picomatch, path-to-regexp, express-rate-limit, actions/checkout, action-gh-release).

### Fixed
- Alarm card crash in production and CSP image policy.

### Security
- Hashed access tokens in auth validation cache.
- Added CSP headers and reconnection UX with entity caching.
- Sanitized inputs, removed dead code, and hardened server routes.


## [1.14.9] — 2026-03-18

### Fixed
- Kept the Status Pills editor open while creating a new pill, so the right-side form no longer disappears during parent rerenders.


## [1.14.8] — 2026-03-16

### Changed
- Refined mobile sensor card layouts with denser spacing for toggle states, numeric headers, and compact control rows.

### Fixed
- Kept mobile sensor card titles, toggle controls, and gauge/donut/bar visuals inside the card bounds instead of overlapping or spilling out on narrow screens.


## [1.14.7] — 2026-03-10

### Added
### Fixed
- Preserved working OAuth API calls when proactive token refresh or auth-session bootstrap fails temporarily, so profile and settings requests fall back to the current token instead of surfacing a false backend outage.
- Prioritized genuine Home Assistant invalid-auth failures over later reachability errors when multiple backend validation URLs are tried, so expired tokens still return `401` and temporary network issues continue to return `503`.


## [1.14.6] — 2026-03-10

### Changed
- Improved the Updates panel layout so long update names wrap cleanly without pushing actions outside the card.

### Fixed
- Restored a clean typecheck pass by typing the API unauthorized error shape used by backend-authenticated requests.

### Security
- Restricted Supervisor ingress header trust to explicit add-on mode so standalone and generic proxy deployments no longer accept those headers by default.


## [1.14.5] — 2026-03-10

### Fixed
- Report clear error and prevent redirect loops when using an HTTP Home Assistant URL from an HTTPS dashboard (#108).


## [1.14.4] — 2026-03-09

### Fixed
- Prevent spurious logouts when the backend fails to connect to the Home Assistant URL (#106).


## [1.14.2] — 2026-03-09

### Changed
- Refreshed Home Assistant OAuth access tokens proactively for protected API calls and restored API auth from stored browser sessions during app bootstrap.

### Fixed
- Reduced repeated Home Assistant invalid-auth websocket attempts by caching rejected backend auth validations for stale tokens.
- Prevented long-running dashboards from hitting expired-session failures when settings and profile requests outlive the initial OAuth token.


## [1.14.1] — 2026-03-09

### Changed
- Restored persistent OAuth browser sessions so Home Assistant login survives closing and reopening the browser.

### Fixed
- Preserved same-browser OAuth reuse across tabs while keeping the active session cache in sync after new-tab hydration.


## [1.14.0] — 2026-03-09

### Changed
- Added internal and fallback Home Assistant URL handling for backend auth validation so protected API calls keep working in Docker and add-on deployments.
- Switched settings sync writes to revision-checked compare-and-swap updates and added immediate reconciliation after conflicts to prevent stale overwrites across tabs and devices.
- Stabilized Playwright auth/bootstrap setup and reduced flaky skips across OAuth, drag-and-drop, and modal coverage.

### Fixed
- Removed rate limiting from production asset delivery so lazy-loaded chunks no longer fail with `429` responses.
- Fixed Status Pills editor selection so clicking an already selected pill keeps the editor open.

### Security
- Hardened server-side Profiles and Settings authorization by validating Home Assistant identity on the backend instead of trusting a client-supplied user id.
- Limited OAuth token persistence to session storage and migrated old local cache entries into session scope to reduce long-lived credential exposure.

## [1.13.0] — 2026-03-05

### Added
- Added comprehensive Playwright E2E coverage for critical flows (initially 33 tests across OAuth, drag-and-drop, and modal interactions).
- Added E2E tooling and docs (`playwright.config.js`, `e2e/`, `E2E_TESTS_SETUP.md`) plus run scripts (`test:e2e`, `test:e2e:ui`, `test:e2e:headed`).

### Changed
- Wrapped all 21 dashboard card components with `React.memo()` to reduce unnecessary re-renders.
- Improved modal accessibility behavior by tightening focus handling in `AccessibleModalShell` (focus restore and open-state handling).
- Enhanced Person card UI with optional zone badge icon support and new editor toggle/translations.
- Added single-page UX option to hide the page pill outside edit mode while keeping it visible during edit mode.


## [1.12.3] — 2026-03-03

### Changed
- Improved Car/auto card popup layout by reducing map height to make room for dense sensor setups (#84).
- Fixed missing car charge-control actions in the popup when configured from Edit Card, including broader action-domain support (#84).


## [1.12.2] — 2026-03-03

### Changed
- Improved Climate card fan-speed display by normalizing fan-mode values across integrations, so non-auto modes no longer fall back to "AUTO" (#102).
- Improved Simplified Chinese translations for alarm/climate flows and corrected several machine-translated labels (#101).

## [1.12.1] — 2026-03-03

### Changed
- Improved Vacuum popup compatibility for mixed integrations with broader state-label handling and capability-aware controls.
- Added optional vacuum sensor-mapping labels/translations across supported locales.
- Removed the temporary Vacuum image-view toggle and kept the popup focused on controls and stats.


## [1.12.0] — 2026-03-02

### Changed
- **Breaking:** Split Media and SONOS into separate page types and separate card types.
- Added dedicated SONOS page creation flow and SONOS group card creation flow.
- Updated dashboard routing and card rendering so Media and SONOS are no longer treated as a single combined mode.
- Added Large Screen Media Modal improvements for a better desktop playback layout.
- Refined Room Modal visual hierarchy with unified column surfaces, improved media player row styling, and de-boxed Temp Overview rows.


## [Unreleased]

### Changed
- Mobile friendly cards - First batch: Alarm, Android TV, Car, Climate, Cover, Cost, Fan, Light, Media, Nordpool, Room, and Vacuum cards.

## [1.11.2] — 2026-03-01

### Changed
- Added Room Card door/window status support, including editor domain filter, main-entity selection, and per-card visibility toggle.
- Improved Room Card pill overflow behavior with progressive label collapse (status first, then all icon pills) to avoid third-line wrapping.
- Refined icon-only Cover/Door pill sizing so height and compact-mode transitions match the rest of the pill row.
- Fixed duplicate `vacuum.lastCleaned` translation keys in multiple locales (`en`, `nb`, `nn`, `sv`, `de`).


## [1.11.1] — 2026-03-01

### Changed

- Includes dashboard release `1.11.1`.
- Adds Simplified Chinese language support (#96).
- Adds room action buttons to the Vacuum popup for room cleaning (#85).
- Expands the Vacuum popup with more sensors (#85).

## [1.11.0] — 2026-02-28

### Changed

### Added

### Changed

- Improved Room Card visual system with responsive pill sizing, wrap-aware compact fallback, and cleaner borderless pill styling.
- Updated Room Card active-device counting to exclude lights from the active devices pill.
- Expanded Room Card editor options and defaults (including icon watermark toggle and persisted room display behaviors).
- Improved runtime resilience for stale lazy-loaded chunk hashes via server-side asset fallback mapping.
- Updated Room-related translations across supported locales.

## [1.9.0] — 2026-02-25

### Added

- Popup trigger automation in Edit Card with rule-based opening on false→true condition transitions.
- Per-trigger cooldown (minimum 10s) and optional auto-close timeout for trigger-opened popups.

### Changed

- Improved trigger stability with startup/redeploy suppression and first-observation baseline to avoid accidental opens.
- Refined Edit Card UX for Conditional Visibility and Popup Trigger with grouped dropdown-style logic sections.
- Updated light-popup trigger routing to resolve valid `light.*` entities more reliably.
- Updated translations for popup trigger controls and labels across supported locales.

## [1.8.1] — 2026-02-24

### Changed

- Release metadata sync.

## [1.8.0] — 2026-02-23

### Added

- Alarm Card (BETA) with dedicated `alarm_control_panel` support.
- Alarm details modal with action list and PIN confirmation flow.
- Quick-action PIN modal with touch-friendly keypad and explicit check-to-confirm UX.

### Changed

- Refined alarm state visuals with shield-based state icons and improved status styling.
- Updated alarm action layout to a simpler one-column interaction model.
- Shortened alarm-related i18n labels across supported languages for compact UI display.
- Improved runtime resilience for stale lazy-loaded chunks via client recovery and stricter HTML cache behavior.
- Kept app/add-on release metadata synchronized for lockstep versioning.

### Fixed

- Wrong PIN submission now clears PIN input fields for safer retry behavior.
- Alarm code requirement flow now better matches Home Assistant semantics (`code_arm_required` handling).

## [1.7.2] — 2026-02-23

### Changed

- Release metadata sync.

## [1.7.1] — 2026-02-23

### Added

- Added settings sync enhancements for multi-device workflows: revision-select load, publish to selected targets, known-device cleanup, and logical per-device naming.
- Added compact dashboard import/export actions directly in the saved profiles section.

### Changed

- Aligned Media Page volume controls with Media modal controls (step up/down, mute, and matching compact layout).
- Improved release hygiene with safe removal of verified unused barrel files/exports.

### Fixed

- Prevented transient “Missing entity” card flashes during page reload by delaying missing-entity rendering until entity sync has stabilized.

## [1.7.0] — 2026-02-22

### Added

- **Visual Overhaul**: Introduced "High-End Glass" aesthetic with refined gradients and glassmorphism.
- **Dynamic Typography**: Implemented a modern typographic scale with thin, elegant fonts for data display.
- **Micro-interactions**: Added subtle animations and hover effects to all interactive elements.
- **Smoother Charts**: Enhanced Sparklines and Weather Graphs with cubic bezier curves and improved gradients.
- **New Typography**: Updated all major data-heavy cards (Sensor, Climate, Energy, etc.) to use lighter font weights for a premium feel.
- **Documentation**: Comprehensive update to README features and card documentation.

### Changed

- Standardized typography hierarchy across all cards:
  - Large data values use `font-thin` / `text-4xl` or `text-5xl`.
  - Labels use `text-xs`, `uppercase`, `tracking-widest`, and `font-bold`.
- Adjusted Energy Cost card layout to bring values closer to their context lines.
- Refined gradients on chart components for better visual integration.

## [1.6.2] — 2026-02-21

### Added

- Added accent-highlighted selection styling across Add Card flows (card type chips, entity selections, and selected badges).

### Changed

- Updated Add Card and Add Page primary actions to use accent-colored CTA styling for clearer selection and confirmation.
- Improved Add Card modal visual consistency for selected states, including room, weather, Android TV, calendar, cost, nordpool, and spacer options.

### Fixed

- Fixed edit-overlay resize action to follow theme accent color instead of hardcoded purple.
- Resolved release-blocking lint `no-undef` issues (`sessionStorage`, `confirm`, `Blob`, and `HTMLInputElement` references).
- Refactored multiple modal/chart/card components to avoid conditional hook-order warnings in low-risk paths.

## [1.6.1] — 2026-02-21

### Fixed

- Fixed Person popup units not following HA configuration (Imperial/Metric switching) ([#66](https://github.com/oyvhov/Tunet/issues/66)).
- Fixed logic where lights always showed brightness ([#64](https://github.com/oyvhov/Tunet/issues/64)).

### Changed

- Redesigned Person popup to align with Car modal aesthetics (glassmorphism/rounded) ([#65](https://github.com/oyvhov/Tunet/issues/65)).
- Implemented strict sensor configuration for Person popups (no more unconfigured "ghost" sensors).
- Dynamic map layout in Person popup: map expands to full width when no sensors are present.
- Improved Editor experience for Person card: unrestricted entity selection and removed count badges.

## [1.6.0] — 2026-02-20

### Changed

- Added PIN-protected settings/edit lock flow, including touch-friendly numeric unlock popup and keyboard-focused PIN entry.
- Improved Person popup with larger responsive desktop layout and configurable info blocks (battery, last updated, telemetry, distance from home).
- Updated Person popup map behavior and desktop composition to prioritize map visibility while keeping info controls accessible.
- Added new Person edit settings for optional info visibility and zone emphasis.
- Made WeatherTemp graph color limits unit-aware in both card rendering and Edit Card slider when switching Metric/Imperial.

### Fixed

- Climate card and climate modal now correctly follow Home Assistant unit-system changes in `follow_ha` mode (Imperial ↔ Metric).
- Person popup last-updated timestamp formatting now renders consistently without locale punctuation artifacts.

## [1.5.1] — 2026-02-19

### Changed

- Improved camera handling with a more robust fallback chain (WebRTC → Home Assistant stream → snapshot) across card and modal flows.
- Added camera stream-engine configuration in the card editor and wired settings through modal orchestration.
- Updated Add Card/Add Page/Edit Card modal styling to remove bright blue accents in favor of the existing muted glass theme.

### Fixed

- Restored generic camera behavior to always attempt Home Assistant stream before snapshot fallback when direct stream support is unavailable.
- Added missing camera-related translation keys across supported locales.

## [1.5.0] — 2026-02-19

### Changed

- Release metadata sync.

## [1.4.0] — 2026-02-19

### Added

- New dedicated fan card with direct on-card controls for speed, oscillation, and direction.
- New fan details modal with strict Home Assistant feature-flag support for power, speed, oscillation, direction, and presets.
- Added fan card type support in Add Card flow and rendering registry.

### Changed

- Improved fan card layouts for both large and small sizes with cleaner climate-aligned typography and spacing.
- Added edit-modal option to disable fan icon animation (`fan.disableAnimation`).
- Updated icon exports/mapping for fan direction and oscillation interactions.

### Fixed

- Fixed fan card crash caused by undefined oscillation capability reference.
- Fixed fan card feature-bitmask mapping to match Home Assistant fan feature flags.
- Restored/ensured edit-mode resize support for fan cards.
- Restored on-card delete button visibility for fan cards in edit mode.
- Expanded fan i18n coverage and parity checks across supported locales.

## [1.3.3] — 2026-02-18

### Changed

- Release metadata sync.

## [1.3.2] — 2026-02-18

### Added

- Camera cards now support live stream preview with snapshot fallback, plus configurable auto-refresh modes (interval or motion-triggered) and motion sensor selection.
- Calendar cards gained Outlook-style week time-grid view enhancements with responsive layout and multi-column support.
- Add Card flow for Calendar now allows selecting calendar entities up front when creating a new calendar card.

### Changed

- Status Pills media/sonos data-source filtering UX now includes clearer included/excluded previews and compact list behavior for large player sets.
- Media and Sonos count display now uses badges for active playing-player counts.

### Fixed

- Media popup opened from pills now scopes to active media players only.
- Sonos pill defaults and migration handling now ensure clickable/count options behave consistently for new and existing pills.
- Calendar selection list in Add Card no longer flickers during live entity updates.
- Added missing German camera translation keys and improved motion refresh to trigger only on inactive→active state transitions.

## [1.3.1] — 2026-02-17

### Fixed

- Status Pills configurator: stabilized Icon and Data Source pickers to avoid layering/interaction regressions in the modal editor.
- Improved inline picker behavior with reliable outside-click close handling and consistent open/reset state.

### Changed

- Updated release metadata and synchronized application/add-on versioning to `1.3.1`.

## [1.3.0] — 2026-02-17

### Added

- Status Pills configurator enhancements: per-pill unit source (`Home Assistant` or custom override), conditional toggle support, and improved mobile editing flow.
- Real-time preview for Status Pills in the configurator using current pill settings.

### Changed

- Refined Status Pills configurator UX with improved left/right pane consistency, cleaner section grouping, and better large-list usability.
- Improved modal visual consistency to match other dashboard popups.

### Fixed

- Conditional visibility now resolves entity IDs reliably across card types, including mapped/special-card entity keys.
- Media group cards now correctly apply visibility conditions.
- Custom page named `lights` no longer disappears after refresh and now restores correctly from profiles.

## [1.2.1] — 2026-02-17

### Added

- Conditional card visibility builder in Edit Card modal with support for state, not-state, numeric, and attribute rules.
- Multi-rule visibility logic (AND/OR) with optional per-rule duration and entity targeting.

### Changed

- Unified visibility condition evaluation in shared utilities for cards and status pills.
- Added/updated translations for visibility configuration in English, Bokmål, Nynorsk, and Swedish.

### Fixed

- Card hide/show logic now consistently respects configured visibility conditions, including mapped entity IDs.

## [1.2.0] — 2026-02-17

### Added

- Sonos favorites browsing and play support from media browse results.
- Music Assistant browse integration for playlists and library choices.
- Cover artwork display mode for Media cards (selectable in Edit Card).

### Changed

- Media Page Sonos workflow with improved player selection, grouping, and media picker tabs.
- Improved responsive behavior for compact media controls and small vacuum cards.

### Fixed

- Media card settings wiring for artwork mode and edit modal visibility.
- Sonos detection and favorites fallback handling across media surfaces.

## [1.1.0] — 2026-02-16

### Changed

- **BREAKING**: Synchronized application and addon versions to move in lockstep
- Graduated from beta status to stable release
- Unified version numbering across all components

### Migration

- Both the application and Home Assistant addon now use the same version number
- This ensures consistency and easier tracking of releases

## [1.0.0-beta.19] — 2026-02-16

### Changed

- Release metadata sync.

## [1.0.0-beta.18] — 2026-02-16

### Changed

- Release metadata sync.

## [Unreleased]

### Added

- Spacer/Divider card type now supports full-width layout mode, heading alignment (left/center/right), and inline divider heading rendering.

### Changed

- Add Card modal now includes a working Spacer/Divider variant selector and applies the selected variant when adding.
- Divider defaults are now applied at creation (full row width, standard 40px height, centered heading alignment).
- Edit-mode overlay controls adapt better for low-height divider/spacer cards.

### Fixed

- Spacer/Divider card settings now persist correctly through Profiles snapshot save/load.
- Fixed Add Card variant state sync where Spacer/Divider selection could be overridden and always insert Divider.

## [1.0.0-beta.17] — 2026-02-15

### Changed

- Release metadata sync.

## [1.0.0-beta.16] — 2026-02-15

### Fixed

- Room card visibility toggles now correctly control lights, temperature, motion, humidity, and climate sections.
- Authentication now persists after closing/reopening the web app for both OAuth and long-lived token modes.

### Changed

- Optimized MDI icon loading by moving icon path lookup behind the backend API to reduce browser bundle weight.
- Improved edit-toolbar UX labels/icons and aligned translated connection/system labels across the UI.

## [1.0.0-beta.15] — 2026-02-15

### Fixed

- Profile loading now preserves and repairs page navigation data when profile snapshots are incomplete.
- Prevents dashboards from collapsing to only the Home tab after loading malformed/partial profiles.
- Home Assistant auth sessions now persist correctly after closing and reopening the web page (OAuth and long-lived token modes).

### Changed

- Added a small Profiles-tab summary message when fallback page recovery is applied during profile load.

## [1.0.0-beta.14] — 2026-02-15

### Added

- Home Assistant camera cards with live preview tiles and a dedicated popup stream/snapshot modal.
- Camera card type support in Add Card flow, renderer dispatch, modal orchestration, and card settings persistence.

### Changed

- Updated translations for camera-card labels and modal actions across English, Nynorsk, Bokmål, and Swedish.
- Expanded card utility coverage for camera card removability/visibility handling.

## [1.0.0-beta.13] — 2026-02-14

### Changed

- Release metadata sync.
- Responsive grid and compact-card layout improvements that resolve issue #13.

## [1.0.0-beta.12] — 2026-02-14

### Changed

- Release metadata sync.

## [1.0.0-beta.11] — 2026-02-14

### Changed

- Release metadata sync.

## [1.0.0-beta.10] — 2026-02-14

### Fixed

- Android TV card service calls now use the correct Home Assistant connection wrapper.
- Connection auth flow now respects selected auth method (OAuth vs token) without stale-token override.
- Temp-history staggered fetch timers are now cleaned up correctly on unmount/update.
- Add Card no longer allows mixed stale selections across card types.
- Android TV Add Card now uses the same footer add-action pattern as other card types.
- Header font selection now applies correctly from the saved settings key.
- Clock size at 100% now follows header text size baseline, and clock is aligned to heading row only.

## [1.0.0-beta.9] — 2026-02-14

### Added

- **Home Assistant Add-on support** with Ingress integration
- Add-on Dockerfile, config.yaml, build.json, run.sh, DOCS.md, CHANGELOG.md
- Repository manifest (repository.yaml) for HA add-on store
- Ingress URL auto-detection in ConfigContext (token-only onboarding for add-on users)
- X-Ingress-Path stripping middleware in Express server
- HashRouter for correct asset loading behind Ingress proxy
- Provider key remount to ensure fresh credentials after onboarding
- URL hash ↔ activePage sync for deep linking

### Changed

- Vite `base` set to `./` for relative asset paths
- `profileApi.js` uses relative `./api` base for Ingress compatibility
- ConfigModal hides URL/OAuth fields in Ingress mode
- `haClient.js` strips trailing `/api` to prevent double `/api/api/websocket`
- Docker container uses port 3002 by default
- REST history fetch allows optional token (Ingress uses session cookie)

### Removed

- Unused `createIngressAuth` helper
- `SKIP_POSTBUILD` guard in postbuild.js (Docker-not-found handled gracefully)
- Native build tool dependencies (python3, make, g++) from main Dockerfile

## [1.0.0-beta.8] — 2026-02-13

### Added

- Server-side profile storage with Express + SQLite backend
- Profiles tab in System modal: save, edit, load, delete dashboard profiles
- Start Blank Dashboard option with confirm dialog
- Logged-in HA user display in System connection tab
- Welcome screen shortcut to load a saved profile

### Changed

- Throttled entity updates for better render performance
- Light slider now works when light is off (sends turn_on with brightness)
- Refactored slider components: interaction when off, deprecation fixes

### Fixed

- Media player card registry signature mismatch
- SensorCard hook ordering
- Missing Plus icon import in App.jsx
- Various code review fixes (#3–#10)

## [1.0.0-beta.7] — 2026-02-13

### Added

- Blind/Cover card with visual slider (vertical + horizontal)
- On/Off toggle for "Return to Home" inactivity setting

### Changed

- Reorganized `src/components` into `cards/`, `charts/`, `effects/`, `pages/`, `sidebars/`, `ui/`
- Reorganized config, icons, styles, utils into dedicated folders with barrel exports

### Fixed

- Cover card horizontal drag direction
- Slider handle visibility at 0% and 100%

## [1.0.0-beta.6] — 2026-02-12

### Changed

- **Default Language**: Changed default language from Norwegian (nn) to English (en).

## [1.0.0-beta.5] — 2026-02-10

### Added

- **Sidebars**: New Theme, Layout, and Header sidebars with compact tab switching
- **Settings Menu**: Compact settings dropdown with quick access to sidebars
- **Todo**: Todo card type, todo modal, and Home Assistant todo helpers
- **Page Reorder**: Drag-and-drop page ordering in edit mode

### Changed

- **Header Editor**: Moved from modal to sidebar for live preview
- **Grid Spacing**: Split grid gap into horizontal and vertical controls
- **Slider Accent**: Default slider accent now follows theme accent color
- **Translations**: Added missing i18n keys for new controls

### Fixed

- **Nynorsk Labels**: Ensured header/layout tab labels fall back correctly

## [1.0.0-beta.4] — 2026-02-08

### Added

- **Header Editor Redesign**: Side-drawer modal with live dashboard preview (matches Layout tab pattern)
- **Font Customization**: Font weight (Thin/Light/Normal/Medium/Bold) selector
- **Letter Spacing Control**: Four-level letter spacing selector (Tight/Normal/Wide/Extra Wide)
- **Font Style Options**: Normal/Italic/UPPERCASE toggle controls
- **Clock Format Control**: 24-hour vs 12-hour (AM/PM) format selector
- **Clock & Date Size Sliders**: Independent size controls (0.5x–2.0x) for clock and date elements
- **Accordion Sections**: Header editor organized into Typography, Style, Clock, and Visibility sections
- **Reset Buttons**: Individual reset buttons for each modified setting

### Changed

- **Header Layout**: Restructured from absolute positioning to flex layout
  - Heading and clock now aligned at same Y coordinate (top)
  - Date positioned below heading, shares same left X coordinate
  - Improved responsive alignment and visual consistency
- **Font Selector**: Replaced ModernDropdown with compact 2-column grid (fits narrow drawer)
- **Drawer Background**: Use solid `--modal-bg` instead of `--card-bg` gradient (card transparency no longer affects drawer)
- **Header Editor**: Full-height side-drawer that slides from right edge

### Fixed

- **Card Transparency Independence**: Header editor drawer no longer affected by card transparency setting
- **i18n Synchronization**: Added missing keys to Norwegian translation file (nn.json)
- **M3Slider Touch**: Refined touch handling for better responsiveness

## [1.0.0-beta.3] — 2026-02-07

### Added

- ESLint v9 flat config (`eslint.config.js`)
- GitHub Actions CI pipeline (`.github/workflows/build.yml`)
- Internationalization (i18n) for all UI strings (English + Nynorsk)
- `.prettierrc` and `.editorconfig` for consistent formatting
- `CONTRIBUTING.md` with contribution guidelines
- `SETUP.md` with detailed project setup instructions
- Basic smoke tests with Vitest
- GitHub issue and PR templates

### Changed

- Renamed Docker container from `hassen-dashboard` to `tunet-dashboard`
- Removed deprecated `version` key from `docker-compose.yml`
- Translated all code comments from Norwegian to English
- Rewrote `SETUP.md` — removed personal paths, updated project structure
- Replaced personal device names in Android TV card with generic detection
- Extracted reusable components (`MissingEntityCard`, `ModalSuspense`, `CarCard`, `VacuumCard`, `LightCard`, `MediaCards`, `PersonStatus`)
- Extracted hooks (`useModals`, `useSmartTheme`, `useTempHistory`)
- Extracted utilities (`cardUtils`, `gridLayout`, `cardActions`, `nordpoolUtils`)
- Extracted `AddCardContent` modal and `dashboard.css`
- Moved constants to `src/constants.js`
- App.jsx reduced from ~3,555 to ~1,920 lines (−46%)

### Fixed

- Duplicate `FaWater` key in icon map
- Self-assignment no-ops in Android TV components
- Missing `resolveCarSettings` function after extraction
- React key warnings in list renderers

## [1.0.0-beta.2] — 2026-01-15

### Added

- Android TV linked media players support (Emby/Jellyfin integration)
- Edit card modal UI cleanup

## [1.0.0-beta.1] — 2026-01-10

### Added

- Initial public release
- React 18 + Vite dashboard for Home Assistant
- Real-time WebSocket entity updates via `window.HAWS`
- Glassmorphism theme system with 10+ themes
- Drag-and-drop card reordering
- Multi-page layout with custom pages
- Climate, light, media, calendar, weather, energy, and sensor cards
- Nordpool electricity price integration
- Car/EV dashboard card
- Status pills with conditional visibility
- Onboarding wizard for first-time setup
- Docker support with multi-stage build
