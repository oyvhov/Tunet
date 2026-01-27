# Hassen Dashboard - AI Coding Instructions

## Project Overview
A modern Home Assistant dashboard built with React 18 + Vite. Single-page application with drag-and-drop customization, real-time entity updates via WebSocket, and persistent configuration in localStorage.

## Architecture

### State Management Pattern
- **No state library**: All state lives in [src/App.jsx](src/App.jsx) (~4400 lines)
- **localStorage persistence**: All user preferences use `midttunet_*` prefix keys
- **Home Assistant connection**: Uses `window.HAWS` (loaded from CDN) for WebSocket API
- **Entity subscription**: Live updates via `subscribeEntities()` populate `entities` object keyed by entity_id

### Core Data Flow
1. App loads → check localStorage for `ha_url` + `ha_token`
2. Connect via `createConnection()` → subscribe to all entities
3. Entities object updates trigger React re-renders for affected cards
4. User changes persist immediately to localStorage (no save button)

### Key Files
- [src/App.jsx](src/App.jsx) - Entire app logic, routing, modals, drag-and-drop state
- [src/constants.js](src/constants.js) - Hardcoded entity IDs specific to this Home Assistant instance
- [src/services/haClient.js](src/services/haClient.js) - WebSocket API wrappers (history, statistics, forecasts, calendar)
- [src/dragAndDrop.js](src/dragAndDrop.js) - Touch/mouse drag handlers for card reordering
- [src/defaults.js](src/defaults.js) - Default page configuration structure
- [src/themes.js](src/themes.js) - CSS custom property definitions for dark/light/graphite themes

## Home Assistant Integration

### Connection Pattern
```javascript
const { createConnection, createLongLivedTokenAuth, subscribeEntities } = window.HAWS;
const auth = createLongLivedTokenAuth(url, token);
const conn = await createConnection({ auth });
subscribeEntities(conn, (entities) => setEntities(entities));
```

### Service Calls
Use [src/services/haClient.js](src/services/haClient.js) functions:
- `callService(conn, domain, service, service_data)` - Call any HA service
- `getHistory(conn, { start, end, entityId })` - Fetch historical entity states
- `getStatistics(conn, { start, end, statisticId, period })` - Get recorder statistics
- `getForecast(conn, { entityId, type })` - Weather forecast data
- `getCalendarEvents(conn, { start, end, entityIds })` - Calendar events

Always check `if (!conn)` before calling services.

## Component Patterns

### Card Components
All cards in [src/components/](src/components/) follow this signature:
```javascript
function CardComponent({ entity, conn, settings, dragProps, cardStyle, Icon, name, editMode, onOpen, t }) {
  // dragProps = { onMouseDown, onTouchStart } for drag-and-drop
  // cardStyle = inline styles from grid position calculation
  // t = translation function from i18n
}
```

Cards are **not** generic - they reference specific entity IDs from [src/constants.js](src/constants.js).

### Modal Pattern
Modals are inline in [src/App.jsx](src/App.jsx), controlled by state like `configOpen`, `sensorModalOpen`. They render conditionally and use fixed positioning with backdrop.

### Custom Hooks
- [src/hooks/useEnergyData.js](src/hooks/useEnergyData.js) - Nordpool price parsing with current index
- [src/hooks/useClimateInfo.js](src/hooks/useClimateInfo.js) - Climate entity state derivation

## LocalStorage Schema

All keys use `midttunet_*` or `ha_*` prefix:
- `ha_url`, `ha_fallback_url`, `ha_token` - Connection credentials
- `midttunet_pages_config` - Page structure: `{ header: [], pages: [], home: [], lights: [], automations: [] }`
- `midttunet_card_order` - Deprecated, migrated to pages_config
- `midttunet_hidden_cards` - Array of hidden card IDs
- `midttunet_custom_names` - `{ cardId: customName }`
- `midttunet_custom_icons` - `{ cardId: iconName }`
- `midttunet_grid_columns` - Number (1-6) of grid columns per page
- `midttunet_theme` - `'dark'` | `'light'` | `'graphite'`
- `midttunet_language` - `'en'` | `'nn'` (Norwegian Nynorsk)
- `midttunet_inactivity_timeout` - Minutes before hiding UI

## Development Workflow

### Running Locally
```powershell
npm install
npm run dev  # Vite dev server on port 5173
```

### Building for Production
```powershell
npm run build  # Outputs to dist/
npm run postbuild  # Runs scripts/postbuild.js
```

### Docker
```powershell
docker-compose up  # Builds and runs on port 5173
```

## Conventions

### Translation Keys
Use nested dot notation: `t('binary.door.open')`, `t('status.on')`. Files: [src/i18n/en.json](src/i18n/en.json), [src/i18n/nn.json](src/i18n/nn.json).

### Icon Mapping
Icons from `lucide-react` and `react-icons`. Map in [src/iconMap.js](src/iconMap.js) and [src/icons.js](src/icons.js). Use icon name strings, not components, in localStorage.

### Entity ID Structure
Format: `domain.object_id`. Domain determines card rendering behavior (e.g., `binary_sensor`, `climate`, `light`, `media_player`).

### Drag-and-Drop State
Stored in refs (`dragSourceRef`, `touchTargetRef`) to avoid re-renders during drag. Touch events use path tracking for visual feedback.

## Common Pitfalls

1. **Don't add state management libraries** - localStorage + React state is the pattern
2. **Entity IDs are hardcoded** - Change [src/constants.js](src/constants.js) for different HA instances
3. **window.HAWS must load first** - Check `libLoaded` state before connecting
4. **localStorage writes are immediate** - No explicit save action needed
5. **App.jsx is intentionally large** - Do not split without explicit request
6. **Modals are not portal-based** - They render inline in [src/App.jsx](src/App.jsx) return statement

## Testing
No test framework configured. Manual testing against a live Home Assistant instance required.
