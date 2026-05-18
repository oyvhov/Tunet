<div align="center">
  <h1>Tunet Dashboard</h1>
  <p>A modern, responsive, and highly customizable React dashboard for Home Assistant.</p>
  
  [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
</div>

<br />

<div align="center">
  <img src="public/Main.png" alt="Main Dashboard" width="800" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"/>
</div>

## ✨ Key Features

- **Rich Card Ecosystem:** Control lights, climate, media (with Android TV/Sonos support), covers, vacuums, alarms, and more.
- **Energy & Environment:** Native Nordpool electricity prices, energy cost tracking, weather animations, and EV monitoring.
- **Organization:** Integrated calendar, task lists, and comprehensive room/person summaries.
- **Drag & Drop:** Fully customizable masonry grid layout with PIN-protected settings.
- **Multi-Device Sync:** Server-side profiles allow saving and deploying layouts across multiple devices instantly.
- **Secure by Design:** Validated backend auth with optional data-at-rest encryption for your profiles.
- **Beautiful UI:** High-end glassmorphism design with dark/light modes and dynamic backgrounds.
- **Multilingual:** Native support for English, German, Norwegian (NB/NN), Swedish, and Simplified Chinese.

## 🚀 Installation

### Option 1: Home Assistant Add-on (Easiest)

Click the button below to add the Tunet repository directly to your Home Assistant instance, then install the add-on:

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Foyvhov%2Ftunet)

<details>
<summary>Manual Add-on Installation</summary>

1. Go to **Settings** → **Add-ons** → **Add-on Store**.
2. Click the three dots (top right) → **Repositories**.
3. Add `https://github.com/oyvhov/tunet`.
4. Find **Tunet Dashboard**, install, and start.

</details>

### Option 2: Docker Compose

```bash
git clone https://github.com/oyvhov/tunet.git
cd tunet
docker compose up -d
```

Open `http://localhost:3002` and connect your Home Assistant instance.

## 📖 Documentation

- [Setup & Troubleshooting](docs/SETUP.md)
- [Card Options & Previews](docs/CARD_OPTIONS.md)
- [Theme Variables](src/docs/CSS_VARIABLES.md)
- [Roadmap](docs/ROADMAP.md)

## 🛠️ Development

<details>
<summary>Click to view local development instructions</summary>

```bash
git clone https://github.com/oyvhov/tunet.git
cd tunet
npm install
npm run dev:all
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3002/api`

</details>

## 📄 License

This project is licensed under the GNU General Public License v3.0 — see the [LICENSE](LICENSE) file for details.

---
<div align="center">
  Created by <a href="https://github.com/oyvhov">oyvhov</a>
</div>
