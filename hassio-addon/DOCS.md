# Tunet Dashboard

A modern, responsive dashboard for Home Assistant with glassmorphism design,
real-time entity updates, and drag-and-drop customisation.

## Getting Started

1. Install the add-on from the repository.
2. Start the add-on.
3. Open the **Tunet** panel in the sidebar.
4. On first launch you will see the onboarding screen.
5. Create a **Long-Lived Access Token** in your HA profile
   (click your username → scroll down → _Long-Lived Access Tokens_ → _Create Token_).
6. Paste the token and click **Test Connection**.
7. Once the test succeeds, click **Next** and finish the setup.

## Features

- **Real-time updates** via Home Assistant WebSocket API.
- **PIN Protection** for settings and edit mode.
- **Drag-and-drop** card layout with multiple pages.
- **Glassmorphism** UI with multiple themes.
- Cards for lights, climate, sensors, media, calendars, vacuums, covers, cameras, and more.
- Energy graphs, Nordpool pricing, weather forecasts.
- Works on desktop, tablet, and mobile.

## Updating

### Home Assistant Add-on update

1. Go to **Settings → Add-ons → Tunet**.
2. Click **Update** (when a new version is available).
3. Restart the add-on after update.
4. Hard-refresh browser (`Ctrl+Shift+R`) if old UI is still cached.

### If update is not shown yet

- Open your add-on repository settings and click **Reload**.
- Ensure you are using the latest repository branch/revision.
- Check add-on logs after restart.

### Add-on shows new version but UI still looks old

- Symptom: Home Assistant reports a newer add-on version, but the dashboard still shows an older app build.
- Cause: stale cached image layers from previous builds can keep old frontend assets.
- Fix:
  1.  Update to the latest add-on release.
  2.  Stop the add-on.
  3.  Use **Rebuild** once, then start again.
  4.  Hard-refresh browser (`Ctrl+Shift+R`).

Tunet add-on builds are now version-resolved from release tags before falling back to `main`, which prevents this mismatch in normal updates.

## Troubleshooting

### "Connection failed" after entering the token

- Make sure the URL is correct (e.g., `http://homeassistant.local:8123`).
- Verify the token is valid — tokens can be revoked from the HA profile page.
- If your HA instance uses HTTPS, use `https://` in the URL.

### Dashboard is blank / white screen

- Press **Ctrl + Shift + R** to hard-refresh and bypass browser cache.
- Check the add-on **Log** tab for errors.

### Cards are not updating

- Ensure the WebSocket connection is active (green status bar at the top).
- Some entities may have slow update intervals — this is normal.

## Support

Report issues at <https://github.com/oyvhov/Tunet/issues>.
