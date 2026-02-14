# Changelog

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
