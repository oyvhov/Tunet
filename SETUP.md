# Tunet Dashboard — Setup Guide

> See also [README.md](README.md) for features and screenshots.

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20+ |
| npm | 9+ |
| Docker (optional) | 20+ |
| Home Assistant | Any recent version |

## Project Structure

```
tunet/
├── src/
│   ├── App.jsx              # Main dashboard component
│   ├── main.jsx             # React entry point
│   ├── components/          # cards/, charts/, effects/, pages/, sidebars/, ui/
│   ├── modals/              # All dialog modals
│   ├── contexts/            # React contexts (Config, HA, Pages)
│   ├── hooks/               # Custom hooks (profiles, theme, energy, etc.)
│   ├── services/            # HA WebSocket client, profile API, snapshots
│   ├── rendering/           # Card renderer dispatch + ModalOrchestrator
│   ├── i18n/                # Translations (en, nn)
│   ├── layouts/             # Header, StatusBar, EditToolbar
│   ├── config/              # Constants, defaults, themes, onboarding
│   ├── icons/               # Icon barrel exports + iconMap
│   ├── utils/               # Formatting, grid layout, drag-and-drop
│   └── styles/              # CSS (index, dashboard, animations)
├── server/
│   ├── index.js             # Express server (API + static files)
│   ├── db.js                # SQLite setup (profiles table)
│   └── routes/profiles.js   # Profiles CRUD API
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose config
└── vite.config.js           # Vite + dev proxy config
```

## Local Development

```bash
npm install

# Start frontend + backend together
npm run dev:all

# Or run separately:
npm run dev          # Vite frontend on :5173
npm run dev:server   # Express backend on :3002
```

The Vite dev server proxies `/api` requests to the backend automatically.

## Docker

### Docker Compose (recommended)

```bash
docker-compose up -d
```

Access at `http://localhost:5173`. Profile data is persisted in a Docker volume (`tunet-data`).

### Docker directly

```bash
docker build -t tunet-dashboard .
docker run -d -p 5173:80 -v tunet-data:/app/data --name tunet-dashboard tunet-dashboard
```

### Useful commands

```bash
docker logs tunet-dashboard       # View logs
docker stop tunet-dashboard       # Stop
docker start tunet-dashboard      # Start
docker rm tunet-dashboard         # Remove container
```

## Configuration

1. Open the dashboard in your browser
2. Click the **gear icon** to open System settings
3. Choose **OAuth2** (recommended) or **Token** authentication
4. Enter your Home Assistant URL (e.g. `https://homeassistant.local:8123`)
5. For token mode: paste a long-lived access token (HA → Profile → Security)

Dashboard layout is stored in `localStorage`. Profiles are stored server-side in SQLite.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `80` (Docker) / `3002` (dev) | Backend server port |
| `DATA_DIR` | `/app/data` | SQLite database directory |
| `NODE_ENV` | `production` | Environment mode |

## Troubleshooting

| Problem | Solution |
|---|---|
| Port in use | Change the port mapping in `docker-compose.yml` |
| Build fails | `docker system prune -a` then rebuild |
| Connection error | Check HA URL and token. Verify CORS if using external access |
| Profiles not saving | Check that the backend is running (`/api/health`) |

