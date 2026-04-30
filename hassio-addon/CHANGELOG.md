# Changelog

## 1.18.0

### Added
- Includes dashboard release `1.18.0`.
- Adds a Home Assistant Lock card with lock, unlock, and open/unlatch controls for `lock.*` entities (#148).

### Changed
- Registers Lock cards across dashboard add/edit/render flows.

### Fixed
- Handles Home Assistant `open`/`opening` lock states and code-protected lock actions.
- Retries settings-sync revision conflicts when the local device has unsynced changes.

**Full Changelog**: https://github.com/oyvhov/Tunet/compare/v1.17.0...v1.18.0

## 1.17.0

### Added
- Includes dashboard release `1.17.0`.
- Adds Cards-only dashboard mode for tablet/kiosk setups, hiding the header, status pills, page navigation, Settings, Add, and Edit controls while keeping dashboard cards visible (#149).
- To enable it, open Settings, go to Header, expand Visibility, and turn on **Show only cards**. To leave cards-only mode, press `Esc` on a keyboard or long-press an empty area of the dashboard.

### Changed
- Splits specialized dashboard pages into lazy-loaded chunks so the main app bundle stays under the CI size gate.

### Fixed
- Keeps critical recovery UI available in cards-only mode, including connection/auth warning surfaces, so users are not locked out of setup or troubleshooting.

**Full Changelog**: https://github.com/oyvhov/Tunet/compare/v1.16.2...v1.17.0

## 1.16.2

### Added
- Includes dashboard release `1.16.2`.
- Small release preview for the refreshed Status Pills feature.
- Adds new animation presets for Status Pills.

<p>
  <img src="https://raw.githubusercontent.com/oyvhov/Tunet/v1.16.2/public/release-assets/image.png" alt="Status Pills release preview" width="430" />
</p>

### Changed
- Refines Status Pills with animation presets, expanded color choices, clearer icon-only naming, and more predictable manual heading behavior.
- Reduces unnecessary profile/settings bootstrap work when profile prefetch is intentionally disabled.

### Fixed
- Keeps Status Pills heading and subtitle visibility settings stable across reopen and reload, and commits pending condition values when saving.
- Prevents newly added visible sensor and alarm pills from disappearing after save by requiring an entity selection before the pill can be saved.
- Improves Home Assistant backend auth logging and Docker fallback URL handling for easier connection troubleshooting.

**Full Changelog**: https://github.com/oyvhov/Tunet/compare/v1.16.1...v1.16.2

## 1.16.1

### Added
- Includes dashboard release `1.16.1`.

### Changed
- Improves localization verification by extending i18n parity checks to cover French.

### Fixed
- Restores full French UI activation by wiring `fr` into runtime translation mapping and language selectors.

## 1.16.0

### Added
- Includes dashboard release `1.16.0`.
- Adds support for mower cards and mower popup controls for `lawn_mower.*` entities.

### Changed
- Improves Media/Sonos page presentation with empty-state messaging, stronger action labels, and more resilient grouping behavior.

### Fixed
- Improves backend Home Assistant URL fallback handling for Docker-hosted setups, reducing profile/settings backend unavailable errors.

## 1.15.4

### Changed
- Includes dashboard release `1.15.4`.
- Adds sensor-card support for Home Assistant `select.*` and `input_select.*` entities (#135).

### Fixed
- Keeps styled sensor select dropdowns and related popup activity inside clean card bounds without noisy retry spam.

## 1.15.3

### Changed
- Includes dashboard release `1.15.3`.

### Fixed
- Restores missing Weather card condition icons by switching to a stable Meteocons CDN path (#134).

## 1.15.2

### Changed
- Edit button moved into the settings dropdown on mobile.
- Sensor card mobile layout improved: name no longer truncates on large cards.
- Haptic feedback suppressed during scroll gestures.

### Added
- Toggle to show/hide page pill labels on mobile (Header settings).

## 1.15.1

### Fixed
- Fixed add-on installation and update failures caused by a build dependency conflict (#128).

## 1.15.0

### Added
- Battery page, Lights page, and Room Explorer page for dedicated device management.
- Lava Lamp and Silk animated backgrounds.
- Toast notifications and PWA support.

### Changed
- Includes dashboard release `1.15.0`.
- Restyled page navigation, Add Page dropdown, and modal type tabs.

### Security
- Hashed auth tokens, added CSP headers, and hardened server routes.

## 1.14.9

### Changed
- Includes dashboard release `1.14.9`.

### Fixed
- Keeps the Status Pills editor open while creating a new pill so the add-on UI no longer drops the editor pane mid-edit.

## 1.14.8

### Changed
- Includes dashboard release `1.14.8`.

### Fixed
- Keeps mobile sensor card titles, controls, and range visuals inside compact card bounds on narrow screens.

## 1.14.7

### Changed
### Fixed
- Includes dashboard release `1.14.7`.
- Preserves working OAuth API calls when proactive refresh fails temporarily and keeps backend validation responses aligned with real auth failures versus reachability errors.

## 1.14.6

### Changed
- Includes dashboard release `1.14.6`.

### Fixed
- Keeps long update names inside the Updates panel layout instead of overflowing the action area.

### Security
- Restricts Supervisor ingress header trust to explicit add-on mode while preserving Home Assistant sidebar ingress access.

## 1.14.5

### Fixed
- Report clear error and prevent redirect loops when using an HTTP Home Assistant URL from an HTTPS dashboard (#108).

## 1.14.4

### Fixed
- Prevent spurious logouts when the backend fails to connect to the Home Assistant URL (#106).

## 1.14.3

### Changed
- Includes dashboard release `1.14.3`.
- Improves mobile-friendly layouts for core card types (Alarm, Android TV, Car, Climate, Cover, Cost, Fan, Light, Media, Nordpool, Room, and Vacuum).

## 1.14.2

### Changed
- Includes dashboard release `1.14.2`.
- Refreshes Home Assistant OAuth access tokens proactively for protected API calls and restores API auth from stored browser sessions during startup.

### Fixed
- Reduces repeated invalid-auth websocket validation attempts against Home Assistant when Docker or add-on requests reuse a stale token.

## 1.14.1

### Changed
- Includes dashboard release `1.14.1`.
- Restores persistent OAuth browser sessions so login survives closing and reopening the browser.

### Fixed
- Preserves same-browser OAuth reuse across tabs while keeping refreshed session tokens synchronized.

## 1.14.0

### Changed
- Includes dashboard release `1.14.0`.
- Restores Docker and add-on compatibility for protected backend calls with internal and fallback Home Assistant URL handling.
- Improves multi-device settings sync with revision-checked conflict handling and immediate reconciliation.

### Fixed
- Reduces lazy-loaded chunk failures by removing asset throttling.
- Fixes Status Pills editor behavior when reselecting the same pill.

### Security
- Hardens Profiles and Settings authorization by validating Home Assistant identity on the backend.
- Limits OAuth token persistence to the browser session.

## 1.13.0

- Includes dashboard release `1.13.0`.
- Adds Playwright E2E infrastructure (initially 33 tests) for OAuth, drag-and-drop, and modal flows.
- Improves dashboard runtime performance by memoizing all card components.
- Improves modal accessibility focus behavior and adds optional Person zone badge icon support.
- Adds option to hide page pill when only one page exists (outside edit mode).

## Unreleased

- Mobile friendly cards - First batch: Alarm, Android TV, Car, Climate, Cover, Cost, Fan, Light, Media, Nordpool, Room, and Vacuum cards.

## 1.12.3

- Includes dashboard release `1.12.3`.
- Improves Car/auto popup layout by reducing map height to leave room for more sensors on vehicles with dense telemetry (#84).
- Fixes missing car charge-control actions in popup flows configured from Edit Card, with broader control-domain support (#84).

## 1.12.2

- Includes dashboard release `1.12.2`.
- Improves Climate card fan-speed display by normalizing fan-mode values across integrations, preventing non-auto modes from showing as AUTO (#102).
- Improves Simplified Chinese translations for alarm/climate flows and corrects multiple machine-translated labels (#101).

## 1.12.1

- Includes dashboard release `1.12.1`.
- Improves Vacuum popup compatibility for mixed integrations (state labels and capability-aware controls).
- Adds vacuum sensor-mapping labels/translations across supported locales.
- Removes the temporary Vacuum image-view toggle and keeps the popup focused on controls and stats.

## 1.12.0

- Includes dashboard release `1.12.0`.
- **Breaking:** Splits Media and SONOS into separate page and card types.
- Adds dedicated SONOS page creation and SONOS group card creation flows.
- Updates dashboard routing/rendering so Media and SONOS are handled independently.
- Refines Room Modal visuals with cleaner media player rows and a flatter Temp Overview layout.

## 1.11.2

- Includes dashboard release `1.11.2`.
- Adds Room Card door/window status support, including editor domain filter, main-entity selection, and per-card visibility toggle.
- Improves Room Card pill overflow behavior with progressive label collapse and icon-only size consistency for Cover/Door pills.
- Fixes duplicate `vacuum.lastCleaned` translation keys across `en`, `nb`, `nn`, `sv`, and `de` locales.

## 1.11.1

- Includes dashboard release `1.11.1`.
- Adds Simplified Chinese language support (#96).
- Adds room action buttons to the Vacuum popup for room cleaning (#85).
- Expands the Vacuum popup with more sensors (#85).

## 1.11.0

- Includes dashboard release `1.11.0`.
- Adds Sensor card variants (`gauge`, `bar`, `donut`, `number`) with improved layout behavior for both large and small cards.
- Adds Sensor Edit Card options for range sources (value/entity), icon visibility toggle, and value display mode.
- Adds configurable three-step color thresholds for sensor chart variants, with optional disable fallback to blue accent mode.
- Improves PR formatting checks by validating changed files only, reducing unrelated baseline failures.
- Keeps app and add-on versions synchronized at `1.11.0`.

## 1.10.0

- Includes dashboard release `1.10.0`.
- Adds Room Card (BETA) enhancements: area-icon defaults, icon watermark toggle, and improved room popup controls.
- Adds bulk Room Card creation from Add Card flow (multi-room select/add).
- Adds support for filtering entities using labels (`#76`).
- Improves Room Card pill responsiveness and wrap behavior with cleaner borderless styling.
- Improves stale chunk recovery in production through server-side hashed asset fallback.
- Keeps app and add-on versions synchronized at `1.10.0`.

## 1.9.0

- Release metadata sync.

## 1.8.1

- Release metadata sync.

## 1.8.0

- Release metadata sync.

## 1.7.2

- Release metadata sync.

## 1.7.1

- Includes dashboard release `1.7.1`.
- Adds improved settings sync workflows (selected-target publish, revision load, device naming, and device cleanup).
- Adds compact dashboard import/export controls under saved profiles.
- Aligns Media Page volume controls with modal behavior.
- Reduces reload flicker by delaying temporary missing-entity placeholders during startup sync.
- Keeps app and add-on versions synchronized at `1.7.1`.

## 1.7.0

- Includes dashboard release `1.7.0`.
- **Major Visual Upgrade**: "High-End Glass" aesthetic with refined gradients and glassmorphism.
- **Dynamic Typography**: Modern thin fonts for data values and bolder labels.
- **Enhanced Charts**: Smoother sparklines and weather graphs with bezier curves.
- **Micro-interactions**: Subtle animations and hover effects throughout the interface.
- Keeps app and add-on versions synchronized at `1.7.0`.

## 1.6.2

- Includes dashboard release `1.6.2`.
- Updates Add Card and Add Page selection/CTA styling to use accent-highlighted selected states for better clarity.
- Fixes edit-overlay resize control color to follow theme accent color.
- Includes lint hardening updates required for release checks and CI stability.
- Keeps app and add-on versions synchronized at `1.6.2`.

## 1.6.1

- Release metadata sync.

## 1.6.0

- Includes dashboard release `1.6.0`.
- Adds settings/edit lock with PIN-protected unlock flow (touch keypad + keyboard entry support).
- Improves Person popup layout on desktop with larger map-focused presentation and configurable telemetry/info rows.
- Adds Person card edit options for last updated, GPS/speed/heading, distance from home, and zone emphasis.
- Fixes climate unit follow behavior so cards and modal correctly reflect Home Assistant metric/imperial changes.
- Makes WeatherTemp graph color limits follow active unit mode in both display and editor.
- Keeps app and add-on versions synchronized at `1.6.0`.

## 1.5.1

- Includes dashboard release `1.5.1`.
- Improves camera reliability with fallback from WebRTC to Home Assistant stream and snapshot.
- Adds camera stream-engine settings in card edit flow and related translation coverage updates.
- Updates modal styling consistency by replacing bright blue accents with the dashboard glass theme.
- Keeps app and add-on versions synchronized at `1.5.1`.

## 1.5.0

- Release metadata sync.

## 1.4.0

- Includes dashboard release `1.4.0`.
- Added dedicated fan card and fan modal with strict Home Assistant feature-flag handling.
- Added on-card fan controls for speed, oscillation, and direction with state-reflective icons.
- Added fan card support in Add Card flow and rendering pipeline.
- Added fan animation toggle in card edit settings and completed fan translation coverage.
- Restored on-card delete button visibility for fan cards in edit mode.
- Keeps app and add-on versions synchronized at `1.4.0`.

## 1.3.3

- Release metadata sync.

## 1.3.2

- Includes dashboard release `1.3.2`.
- Added camera card live-stream improvements with snapshot fallback, interval/motion refresh options, and motion-sensor-driven updates.
- Added Outlook-style calendar week time-grid enhancements with responsive multi-column layout improvements.
- Improved Status Pills media/sonos filtering and badge-based active-player count behavior.
- Added calendar entity selection in Add Card and fixed calendar add-list flicker.
- Keeps app and add-on versions synchronized at `1.3.2`.

## 1.3.1

- Includes dashboard release `1.3.1`.
- Fixed Status Pills configurator picker behavior for Icon and Data Source editing in the modal.
- Keeps app and add-on versions synchronized at `1.3.1`.

## 1.3.0

- Includes dashboard release `1.3.0`.
- Improved Status Pills configurator with unit source override, conditional controls, mobile-friendly editing, and cleaner UI.
- Fixed conditional visibility handling consistency across cards (including media groups and mapped entities).
- Fixed persistence/restore for custom page named `lights`.

## 1.2.1

- Includes dashboard release `1.2.1`.
- Added conditional card visibility configuration in Edit Card modal.
- Added advanced visibility rules (AND/OR, duration, and entity targeting).
- Improved visibility-condition handling consistency across cards and status pills.

## 1.2.0

- Includes dashboard release `1.2.0`.
- Added Sonos favorites browse/play and Music Assistant browse support.
- Added Cover artwork mode for Media cards.
- Includes Media Page Sonos enhancements and related bug fixes.

## 1.1.0

### Changed

- **BREAKING**: Synchronized application and addon versions to move in lockstep
- Graduated from beta status to stable release
- Unified version numbering across all components

### Migration

- Both the application and Home Assistant addon now use the same version number
- This ensures consistency and easier tracking of releases

## 1.0.16

- Release metadata sync.

## 1.0.15

- Release metadata sync.

## 1.0.14

- Release metadata sync.

## 1.0.13

- Includes dashboard release `1.0.0-beta.16`.
- Fixes session persistence so users do not need to reauthenticate after reopening the dashboard.
- Includes Room card visibility toggle fixes and reduced frontend icon bundle impact.

## 1.0.12

- Includes dashboard release `1.0.0-beta.15` with profile-load hardening for page navigation state.
- Fixes an issue where loading incomplete profile data could leave only the Home tab visible.
- Adds a small in-app summary when profile page data is repaired on load.

## 1.0.11

- Includes dashboard release `1.0.0-beta.14` with Home Assistant camera cards and popup stream/snapshot modal.
- Updated i18n coverage for camera card workflows to keep add-on UI translations consistent.

## 1.0.10

- Release metadata sync.

## 1.0.9

- Release metadata sync.

## 1.0.8

- Release metadata sync.

## 1.0.7

- Synced release metadata with dashboard beta.10 fixes.
- Added clearer update guidance for Docker, Add-on, and source installs.
- Updated add-on build source tracking to follow `main` branch.

## 1.0.6

- Simplified onboarding for add-on users (auto-detected URL, token-only auth).
- Added documentation, changelog, and improved add-on metadata.

## 1.0.5

- Cleaned up debug logging and unused code.

## 1.0.4

- Added build verification to diagnose Docker caching issues.

## 1.0.3

- Fixed Docker layer caching preventing new code from being deployed.

## 1.0.2

- Fixed double `/api/api/websocket` in WebSocket URL.

## 1.0.1

- Fixed token persistence across page reloads in Ingress mode.
- Added `HashRouter` for correct asset loading behind Ingress proxy.
- Switched Ingress auth from OAuth to Long-Lived Access Token.

## 1.0.0

- Initial add-on release.
- Ingress support for Home Assistant sidebar integration.
