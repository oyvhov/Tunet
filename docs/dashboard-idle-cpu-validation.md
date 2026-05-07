# Dashboard Idle CPU Validation Log

Date: 2026-05-07
Branch: `fix/dashboard-idle-cpu`

## Summary

- Root cause addressed: default `theme` background no longer mounts animated aurora blob classes or full-window background canvases.
- Explicit animated backgrounds now throttle to about 30fps, cap canvas DPR, pause when hidden, and respect reduced-motion / slow-update devices.
- Weather card effects now use the same low-power motion gate and lower particle counts.
- Entity-update churn reduced by removing the full entity-map dependency from optimistic brightness cleanup and avoiding repeated smart-theme CSS writes.
- Docker healthcheck fixed from `localhost` to `127.0.0.1` after validation showed IPv4 loopback succeeds while `localhost` fails inside the container.

## Commands And Results

| Check                                                                                                                                                      | Result                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm test -- src/__tests__/BackgroundLayer.test.jsx src/__tests__/useDashboardEffects.test.js src/__tests__/useSmartTheme.test.js`                         | Passed: 3 files, 18 tests                                                          |
| `npm run lint`                                                                                                                                             | Passed                                                                             |
| `npm test`                                                                                                                                                 | Passed: 51 files, 407 tests                                                        |
| `npm run build`                                                                                                                                            | Passed; Vite emitted the existing large-chunk warning                              |
| `docker compose up -d --build`                                                                                                                             | Passed; production container started                                               |
| Host `/api/health` at `http://localhost:3002/api/health`                                                                                                   | Passed: `{ status: 'ok', version: '1.18.0' }`                                      |
| Docker-served DOM check at `http://localhost:3002`                                                                                                         | Passed: `bgMode=theme`, `animatedBlobCount=0`, `fullWindowBackgroundCanvasCount=0` |
| Docker-served E2E smoke: `PLAYWRIGHT_BASE_URL=http://localhost:3002 PLAYWRIGHT_SKIP_WEB_SERVER=1 npx playwright test e2e/modals.e2e.js --project=chromium` | Passed: 12 tests; final rerun completed in 6.6s                                    |
| Container health probe: `docker exec tunet-dashboard wget --quiet --tries=1 --spider http://127.0.0.1:3002/api/health`                                     | Passed                                                                             |
| Final Docker status/stats                                                                                                                                  | Healthy; CPU `0.04%`, memory `52.08MiB / 15.5GiB`                                  |

## Notes

- During the first Docker validation, the app served pages and host `/api/health` worked, but Docker reported `unhealthy`. The healthcheck command used `localhost`, which failed inside the container while `127.0.0.1` succeeded. The compose healthcheck now uses `127.0.0.1`.
- Full Vitest produced existing stderr from expected auth/settings failure-path tests and an existing React `act(...)` warning in `useEntityHelpers`; no tests failed.
- Host browser CPU and tablet temperature still need real-device observation, but the production Docker page now avoids the default continuous animation path that matched the reported idle CPU/heat symptoms.
