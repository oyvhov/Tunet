# Tunet Dashboard

A modern React dashboard for Home Assistant with real-time entity control, energy monitoring, and multi-device profile sync.

![Main Dashboard](public/1.Main.jpg)

## Features

- **30+ card types** — lights, climate, media, vacuum, covers, sensors, calendars, and more
- **Server-side profiles** — save/load dashboard layouts per HA user, sync across devices
- **Live entity updates** — real-time WebSocket connection to Home Assistant
- **OAuth2 & token auth** — browser login or long-lived access tokens
- **Dark/Light/Graphite themes** — with glassmorphism and weather effects
- **Multi-language** — English, German, Norwegian (Bokmål), Norwegian (Nynorsk), and Swedish
- **Drag-and-drop layout** — resize, reorder, and customize cards
- **Multi-page dashboards** — organize cards across multiple pages
- **MDI icon support** — same naming as Home Assistant (`mdi:car-battery`)

## Quick Start

### Home Assistant Add-on

1. Go to **Settings** -> **Add-ons** -> **Add-on Store** -> **Repositories** (three dots).
2. Add `https://github.com/oyvhov/tunet`.
3. Install **Tunet Dashboard**.
4. Configure and Start.

### Docker Compose (Recommended)

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

## Updating

See [SETUP.md](SETUP.md) for detailed setup, configuration, and troubleshooting.

## Technologies

- React 18 + Vite 7
- Tailwind CSS 4
- Express + SQLite (profile storage)
- Home Assistant WebSocket API
- Lucide Icons + MDI

## 🗺️ Roadmap

See our [ROADMAP.md](ROADMAP.md) for planned features and future development.

## License

GNU General Public License v3.0 — See [LICENSE](LICENSE)

## Author

[oyvhov](https://github.com/oyvhov)
