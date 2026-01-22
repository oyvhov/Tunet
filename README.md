# 🏠 NoName Dashboard

A modern, responsive React dashboard application for home automation and energy monitoring, built with Vite and styled for optimal performance.

## 📋 Overview

NoName is a feature-rich home automation dashboard that integrates with smart home systems to provide real-time monitoring and control of:

- 🌡️ Climate and heating systems
- ⚡ Energy consumption and pricing
- 🚗 Vehicle status and battery levels
- 💡 Lighting control
- 🚪 Door sensors and presence detection
- 📊 Data visualization and analytics

## � Summary

NoName consolidates household telemetry and control into a single, easy-to-use dashboard. It aggregates data from smart meters, thermostats, EV chargers, and sensors to visualize consumption trends, optimize energy usage based on price signals, and provide quick access to device controls. The UI focuses on clarity and real-time updates so users can make informed decisions about energy and comfort.

## 🖼️ Screenshots & Features

### Main Dashboard
The central hub displays all key information at a glance with real-time updates.

![Main Dashboard](public/1.Main.jpg)

### Light page
Monitor and control your heating systems and heat pump settings for optimal comfort.

![Heating Systems](public/2.lights.jpg)

### Automation page
View and manage automations

![Automations](public/3.automations.jpg)

### Settings & Configuration
Customize dashboard preferences and device integrations to suit your needs.

![Settings](public/4.settings.jpg)

### Edit Dashboard
Personalize your dashboard layout by arranging and editing dashboard elements.

![Edit Dashboard](public/5.edit_main.jpg)

### Heat Pump popup
Detailed heat pump monitoring with popup interface for advanced settings.

![Heat Pump Popup](public/6.Popu_heatpump.jpg)

### Light Popup
Quick access lighting controls with preset options and brightness adjustment.

![Lights Popup](public/7.Popup_lights.jpg)

### Sonos 
Control your Sonos audio system directly from the dashboard.

![Sonos Control](public/8.Popup_Sonos.jpg)

### Grid View
Alternative grid-based view layout for organizing smart home devices.

![Grid View](public/9.GridView.jpg)

### Add New Devices
Simple interface to add new entities and devices to your smart home system.

![Add Entity](public/10.Add_entity.jpg)

### Add Lighting Zones
Configure and add new lighting zones for advanced lighting automation.

![Add Lighting](public/11.Add_light.jpg)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (or Docker Desktop for containerized setup)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/oyvhov/NoName.git
cd NoName
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start Vite development server with hot module replacement
- `npm run build` - Build for production with optimizations
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality

## 📦 Technologies

- **React 18** - UI library for building components
- **Vite 7** - Fast build tool and dev server
- **Lucide React** - Modern icon library
- **Tailwind CSS** - Utility-first CSS framework (styling)

## 🐳 Docker Support

The project includes Docker configuration for easy deployment:

```bash
docker-compose up
```

This will build and run the application in a Docker container.

## 📁 Project Structure

```
NoName/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # React entry point
│   └── ...              # Additional components
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── Dockerfile           # Docker image definition
├── docker-compose.yml   # Docker compose setup
└── README.md            # This file
```

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

Created by [oyvhov](https://github.com/oyvhov)
