# Changelog

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
