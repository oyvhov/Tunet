# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
