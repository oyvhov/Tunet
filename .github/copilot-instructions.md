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

### Generic Card System (Current Standard)
All cards now use a **generic configurable pattern**. Static/hardcoded cards have been consolidated:
- **GenericClimateCard** - Climate entity control with temperature + fan modes, size toggle
- **GenericEnergyCostCard** - Power sensor display with today + monthly statistics
- **GenericAndroidTVCard** - Media player + optional remote control
- **WeatherTempCard** - Weather display with configurable weather + temperature entities, includes MIN/MAX pills

Generic cards accept `settingsKey` and read entity IDs from `cardSettings[settingsKey]`:
```javascript
const settings = cardSettings[settingsKey] || {};
const entityId = settings.climateId;  // or weatherId, powerSensorId, etc.
const entity = entities[entityId];
```

Signature pattern:
```javascript
function GenericCard({ 
  cardId, dragProps, getControls, cardStyle, 
  settingsKey, cardSettings, entities, 
  editMode, t 
}) {
  // Read entity ID from cardSettings[settingsKey]
  // Render based on entity.state and attributes
}
```

Settings structure in `cardSettings`:
```javascript
{
  "climate_card_kitchen": { size: "large", climateId: "climate.stove" },
  "cost_card_power": { costSensorId: "sensor.current_power" },
  "weather_card_main": { weatherId: "weather.home", tempId: "sensor.outside_temp" },
  "androidtv_card_living": { mediaPlayerId: "media_player.android_tv", remoteId: "remote.android_tv" }
}
```

**Migration Note**: Old static cards (ShieldCard, ClimateCard, EnergyCostCard, WeatherCard) have been removed as of v1.4.0. Only generic versions are maintained.

### Card Sizing
Generic cards support configurable sizes via `settings.size`:
- **"small"** - Compact card for grid display (e.g., single-line climate with inline controls)
- **"large"** - Full-height card with expanded layout (e.g., climate card with separate modal for detailed settings)

Size is toggled via `canToggleSize()` and persists in `cardSettings[cardId].size`. Example:
```javascript
// In cardSettings
{ "climate_card_kitchen": { climateId: "climate.stove", size: "large" } }
// In card component
const isSmall = settings.size === 'small';
```

Not all cards support sizing - only those with `canToggleSize()` returning true (climate, cost, weather currently).

### Card Component Props
Cards passed by `renderGenericCard()` receive:
- `dragProps` - `{ onMouseDown, onTouchStart }` for drag-and-drop
- `getControls(cardId)` - Renders settings/edit buttons
- `cardStyle` - Inline styles from grid position calculation
- `cardSettings` - User-configured entity mappings
- `t` - i18n translation function

### Modal Pattern
Modals are inline in [src/App.jsx](src/App.jsx), controlled by state like `climateModalOpen`, `costModalOpen`. They render conditionally and use fixed positioning with backdrop. Example for setting climate targets or viewing extended energy stats.

### Custom Hooks
- [src/hooks/useEnergyData.js](src/hooks/useEnergyData.js) - Nordpool price array parsing with current price index. Signature: `useEnergyData(entity, now)` takes **single entity** object, returns `{ fullPriceData, currentPriceIndex, priceStats, currentPrice }`
- [src/hooks/useClimateInfo.js](src/hooks/useClimateInfo.js) - Climate entity state derivation (HVAC mode, current/target temp, preset mode)

## LocalStorage Schema

All keys use `midttunet_*` or `ha_*` prefix:
- `ha_url`, `ha_fallback_url`, `ha_token` - Connection credentials
- `midttunet_pages_config` - Page structure with card list per page:
  ```javascript
  {
    header: ['person.oyvind', 'person.tuva'],           // Header row entities
    pages: ['home', 'lights', 'automations'],           // Page names to display
    home: ['power', 'car', 'climate_card_kitchen'],     // Cards on home page
    lights: ['light.living', 'light.bedroom'],          // Cards on lights page
    automations: [                                        // Column structure
      { id: 'col0', title: 'Column 1', cards: [] },
      { id: 'col1', title: 'Column 2', cards: [] }
    ]
  }
  ```
- `midttunet_card_settings` - Entity ID mappings for generic cards: `{ "climate_card_kitchen": { climateId: "climate.stove", size: "large" }, ... }`
- `midttunet_hidden_cards` - Array of hidden card IDs
- `midttunet_custom_names` - `{ cardId: customName }`
- `midttunet_custom_icons` - `{ cardId: iconName }`
- `midttunet_grid_columns` - Number (1-6) of grid columns per page
- `midttunet_theme` - `'dark'` | `'light'` | `'graphite'`
- `midttunet_language` - `'en'` | `'nn'` (Norwegian Nynorsk)
- `midttunet_inactivity_timeout` - Minutes before hiding UI

## Page Configuration

Default page structure is defined in [src/defaults.js](src/defaults.js):
```javascript
export const DEFAULT_PAGES_CONFIG = {
  header: ['person.oyvind', 'person.tuva'],           // Display presence entities at top
  pages: ['home'],                                     // Available page names
  home: ['power', 'car', 'media_player'],             // Card IDs on each page
  lights: [],                                         // Empty until user adds cards
  automations: [                                      // Column-based layout
    { id: 'col0', title: 'Kolonne 1', cards: [] },
    { id: 'col1', title: 'Kolonne 2', cards: [] }
  ]
};
```

- **header**: Array of entity_ids to display in top row (typically presence sensors)
- **pages**: Array of page names available in navigation
- **page object**: Either a flat array of card IDs (home, lights) or array of column objects (automations)
- **column objects**: `{ id: string, title: string, cards: [] }` for multi-column layouts

This is stored in localStorage as `midttunet_pages_config` and persists user changes (added pages, reordered cards).

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
Use nested dot notation. Keys are organized by domain and type:
- **Status keys**: `t('status.on')`, `t('status.off')`, `t('status.heat')`, `t('status.cool')`
- **Entity domains**: `t('binary.door.open')`, `t('climate.current')`, `t('climate.target')`
- **UI labels**: `t('menu.edit')`, `t('nav.addCard')`, `t('settings.theme')`
- **Add card types**: `t('addCard.climateCard')`, `t('addCard.weatherCard')`

Files: [src/i18n/en.json](src/i18n/en.json), [src/i18n/nn.json](src/i18n/nn.json).

Example structure:
```json
{
  "status.on": "On",
  "status.off": "Off",
  "climate.current": "Current",
  "climate.target": "Target",
  "menu.edit": "Edit",
  "addCard.climateCard": "Climate"
}
```

### Icon Mapping
Icons from `lucide-react` and `react-icons`. Map in [src/iconMap.js](src/iconMap.js) and [src/icons.js](src/icons.js). Use icon name strings, not components, in localStorage.

### Entity ID Structure
Format: `domain.object_id`. Domain determines card rendering behavior (e.g., `binary_sensor`, `climate`, `light`, `media_player`).

### Drag-and-Drop State
Stored in refs (`dragSourceRef`, `touchTargetRef`) to avoid re-renders during drag. Touch events use path tracking for visual feedback.

## Common Pitfalls

1. **Don't add state management libraries** - localStorage + React state is the pattern
2. **Entity IDs live in cardSettings** - Generic cards read entity IDs from `cardSettings[settingsKey]`, not hardcoded constants
3. **window.HAWS must load first** - Check `libLoaded` state before connecting
4. **localStorage writes are immediate** - No explicit save action needed
5. **App.jsx is intentionally large** - Do not split without explicit request
6. **Modals are not portal-based** - They render inline in [src/App.jsx](src/App.jsx) return statement
7. **useEnergyData takes single entity** - Pass `entities[entityId] || null`, not the entire entities object. Always check for null due to React hooks safety.
8. **All hooks must execute in consistent order** - Don't use early returns in hook implementations (violates React hooks rules)

## Testing
No test framework configured. Manual testing against a live Home Assistant instance required.
