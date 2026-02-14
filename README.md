# Tunet Dashboard

A modern React dashboard for Home Assistant with real-time entity control, energy monitoring, and multi-device profile sync.

![Main Dashboard](public/1.Main.jpg)

## Features

- **30+ card types** — lights, climate, media, vacuum, covers, sensors, calendars, and more
- **Server-side profiles** — save/load dashboard layouts per HA user, sync across devices
- **Live entity updates** — real-time WebSocket connection to Home Assistant
- **OAuth2 & token auth** — browser login or long-lived access tokens
- **Dark/Light/Graphite themes** — with glassmorphism and weather effects
- **Multi-language** — English and Norwegian (Nynorsk)
- **Drag-and-drop layout** — resize, reorder, and customize cards
- **Multi-page dashboards** — organize cards across multiple pages
- **MDI icon support** — same naming as Home Assistant (`mdi:car-battery`)

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/oyvhov/tunet.git
cd tunet
docker compose up -d
```

Open `http://localhost:3002` and connect your Home Assistant instance.

### Local Development

```bash
git clone https://github.com/oyvhov/tunet.git
cd tunet
npm install
npm run dev:all
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3002/api`

### Ports

- Docker: `http://localhost:3002`
- Local dev UI (Vite): `http://localhost:5173`
- Local dev API (Express): `http://localhost:3002/api`

## Updating

### Docker Compose

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

### Docker (manual)

```bash
git pull
docker build --no-cache -t tunet-dashboard .
docker stop tunet-dashboard || true
docker rm tunet-dashboard || true
docker run -d -p 3002:3002 -v tunet-data:/app/data --name tunet-dashboard tunet-dashboard
```

### Source install

```bash
git pull
npm install
npm run build
npm run server
```

## Release Workflow (Maintainers)

1. Prepare synchronized versions/changelogs:

```bash
npm run release:prep -- --app-version 1.0.0-beta.11 --addon-version 1.0.8
```

2. Validate metadata consistency:

```bash
npm run release:check
```

3. Run full release sanity checks:

```bash
npm run release
```

The `release:check` step is also enforced in CI on `main` PRs/pushes.

See [SETUP.md](SETUP.md) for detailed setup and configuration.

## Light Control

![Light Control](public/7.Popup_lights.jpg)

## Technologies

- React 18 + Vite 7
- Tailwind CSS 4
- Express + SQLite (profile storage)
- Home Assistant WebSocket API
- Lucide Icons + MDI

## License

GNU General Public License v3.0 — See [LICENSE](LICENSE)

## Author

[oyvhov](https://github.com/oyvhov)
