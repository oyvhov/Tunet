# Card Options Overview

Detailed overview of each card type, where it fits, and what can be configured.

## Screenshots

![Main dashboard](public/Main.png)

![Main dashboard alternative](public/1.Main.jpg)

> Tip: If you want per-card screenshots, add images under `public/cards/` and reference them in each section below.

## Shared options (most cards)

- **Size**: `small` or `large` (when supported by that card type).
- **Custom name**: override Home Assistant friendly name.
- **Custom icon**: choose icon from icon picker.
- **Visibility controls**: hide/show based on state rules.
- **Popup trigger**: open card popup automatically on configured conditions.

## Card-by-card options

### Sensor
<img width="1484" height="245" alt="image" src="https://github.com/user-attachments/assets/82c14294-4bbd-4b92-80c3-bde40215b1c1" />

- Entity selection (`sensor.*`, `binary_sensor.*`, plus supported helper domains).
- Visual variant support (for numeric sensors): line/graph and gauge-like variants.
- Optional range/threshold settings (where relevant).
- Optional icon/value display tuning.

### Light
<img width="757" height="238" alt="image" src="https://github.com/user-attachments/assets/1cea9824-5ce9-4998-b250-8ec4621b89a5" />
<img width="1842" height="687" alt="image" src="https://github.com/user-attachments/assets/d48b8c2c-b92a-4c32-9c9e-ceebe9ad6115" />

- Light entity selection.
- On-card quick controls (toggle/brightness shortcuts).
- Popup controls for brightness, color temperature, and RGB (depends on entity support).

### Climate
<img width="403" height="241" alt="image" src="https://github.com/user-attachments/assets/35b9d6fb-cf1c-4411-bd63-d46eb4e85a8d" />
<img width="1669" height="668" alt="image" src="https://github.com/user-attachments/assets/95fd5f98-b356-464f-b0d8-c3cabbb24652" />

- Climate entity selection.
- On-card target temperature +/- controls.
- HVAC action/status feedback.
- Fan and swing controls shown only when entity supports those features.

### Fan

- Fan entity selection.
- On-card speed and power controls.
- Popup support for oscillation/direction/presets (capability-aware).

### Cover
<img width="390" height="243" alt="image" src="https://github.com/user-attachments/assets/1916713d-7448-41a0-bf52-f03db48f0e77" />
<img width="1219" height="702" alt="image" src="https://github.com/user-attachments/assets/ac47e5ec-d66c-4e1c-b6f7-2fbcd851be42" />

- Cover entity selection.
- Position/tilt controls for supported entities.
- Device-class-aware labels (blind, shutter, garage, etc.).

### Vacuum
<img width="371" height="240" alt="image" src="https://github.com/user-attachments/assets/fa55736e-18ef-49ac-8944-365d937f20b4" />
<img width="1505" height="774" alt="image" src="https://github.com/user-attachments/assets/ddd3d31a-23cd-40d4-ae15-377c98031f7b" />

- Vacuum entity selection.
- State + quick actions (start/pause/return).
- Popup supports additional sensors/actions when exposed by integration.

### Camera

- Camera entity selection.
- Refresh mode and interval options.
- Stream engine selection (Auto/WebRTC/HA stream/Snapshot), with fallback behavior.

### Media
<img width="387" height="236" alt="image" src="https://github.com/user-attachments/assets/4edb4099-7fc4-4fcc-ae02-f48f45c73c1a" />
<img width="1481" height="968" alt="image" src="https://github.com/user-attachments/assets/c8531577-8bf2-4879-93bc-d2298d398f8c" />
<img width="2537" height="1214" alt="image" src="https://github.com/user-attachments/assets/df581cf8-716b-4702-b545-e6775c854afc" />

- Generic media-player focused flow.
- Best for Music Assistant playlist browsing.
- Uses selected `media_player` capabilities for browse/play support.

### SONOS

- Dedicated Sonos page/card mode.
- Group/ungroup workflows for selected Sonos players.
- Sonos Favorites browsing requires a Sonos `media_player`.

### Weather / Temp

- Weather entity + optional temperature source.
- Unit-aware rendering (follows configured unit mode/HA mode).
- Forecast/history visualization where data is available.

### Energy Cost

- Today + month entity mapping.
- Currency + display formatting options.

### Nordpool

- Nordpool sensor selection.
- Decimal precision and display formatting options.

### Room

- Build room card from Home Assistant area.
- Auto-suggested entities with optional manual mapping.
- Optional room visuals/toggles (e.g., icon watermark and status behaviors).

### Car

- Card-level mapping for EV-related sensors (battery/range/charging/temp/location).
- Optional custom image URL and per-sensor bindings.

### Person

- Person entity selection.
- Popup map + optional telemetry blocks (battery, speed, distance from home, etc.).

### Alarm

- Alarm entity selection.
- Arm/disarm actions, with PIN flow where required.
- Capability-aware action rendering from alarm integration.

### Calendar

- Calendar entity/list selection.
- Event rendering options from selected calendars.

### Todo

- To-do list entity selection.
- List item management in card/popup flow.

### Spacer

- Variant: `spacer` or `divider`.
- Layout/spacing behavior to structure dashboard sections.

## Notes for maintainers

- Keep this file in sync when adding new card settings in edit modals.
- If a card gains/removes options, update its section here in the same PR.
- Prefer capability-aware wording (`if supported by entity`) for integration-specific features.
