# Tunet Dashboard

A modern React dashboard for home automation and energy monitoring with Home Assistant integration.


## Features

### Dashboard Controls
- Climate & heating control
- Energy consumption tracking with real-time pricing
- Vehicle status monitoring (generic car cards with entity mapping)
- Lighting control with color/warmth adjustment
- Door sensors & presence detection
- Vacuum cleaner control
- Media player control (Sonos, Jellyfin, Emby, NRK, Android TV)
- Presence & person status
- Calendar integration
- Customizable dashboard layout & header
- Dark/Light/Graphite theme
- Multi-language (English, Nynorsk)
- MDI icon support (same naming as Home Assistant, e.g. `mdi:car-battery`)

### Card Types
You can add various card types to customize your dashboard:
- **Sensor** - Display any numeric or text sensor with history
- **Light** - Control lights with brightness, color, and warmth
- **Climate** - Manage heat pump or AC with temperature targeting
- **Vacuum** - Control robot vacuum with suction and mop settings
- **Media Player** - Play/pause music, control volume on any media player
- **Sonos** - Dedicated Sonos player management with grouping
- **Weather** - Display weather with 12h forecast and temperature graph
- **Cost/Energy** - Track daily and monthly power costs
- **Nordpool** - Monitor spot prices (requires Nordpool sensor)
- **Calendar** - Show upcoming calendar events
- **Automation** - Toggle automations and scripts
- **Android TV** - Media control for Android TV devices
- **Toggle** - Quick switch for lights, automations, scripts

## Main Dashboard

![Main Dashboard](public/1.Main.jpg)

## Quick Start

### Prerequisites

- Node.js 18+
- Home Assistant instance with API token

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/oyvhov/tunet.git
   cd tunet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open dashboard**
   - Access at `http://localhost:5173`
   - Go to Settings and add your Home Assistant URL and token

5. **Configure entities** (optional)
   - Use edit mode in the dashboard to add cards dynamically
   - Car cards use entity mapping via the UI configuration

### Docker Installation

Alternatively, run with Docker:

1. **Clone the repository** (if not already done)
   ```bash
   git clone https://github.com/oyvhov/tunet.git
   cd tunet
   ```

2. **Build and run with Docker Compose**
   ```bash
   docker-compose up
   ```

3. **Access dashboard**
   - Open `http://localhost:5173`
   - Go to Settings and add your Home Assistant URL and token

## Configuration

1. Open dashboard settings
2. Add Home Assistant URL and token
3. Customize layout in edit mode

## Build & Deploy

```bash
npm run build
```

Docker:

```bash
docker-compose up
```

## Light Control

![Light Control](public/7.Popup_lights.jpg)

## Technologies

- React 18
- Vite 7
- Tailwind CSS
- Lucide Icons + MDI
- Home Assistant API

## Project Structure

```
src/
 App.jsx              # Main component
 components/          # UI cards & widgets
 modals/              # Dialog modals
 contexts/            # React contexts (Config, HA, Pages)
 hooks/               # Custom hooks
 services/            # HA WebSocket client
 i18n/                # Translations (en, nn)
 layouts/             # Header, StatusBar
```

See [SETUP.md](SETUP.md) for the full project structure and detailed setup instructions.

## License

GNU General Public License v3.0 - See [LICENSE](LICENSE) for details

## Author

[oyvhov](https://github.com/oyvhov)
