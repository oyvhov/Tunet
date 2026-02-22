# Changelog

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
