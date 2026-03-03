# Card Options Overview

Practical guide to what each card is best for, what you can configure, and common setup pitfalls.

## Screenshots

![Main dashboard alternative](public/1.Main.jpg)

> Tip: If you want per-card screenshots, add images under `public/cards/` and reference them in each section below.

## Before you start

- Most cards support **custom name**, **custom icon**, and (when available) **small/large size**.
- Many cards can use **visibility rules** and **popup triggers**.
- Some controls only appear if your Home Assistant entity supports them (capability-aware UI).

## Media prerequisites (important)

- To browse playlists, use a **Music Assistant** `media_player`.
- To browse Sonos Favorites, use a **Sonos** `media_player`.
- If browsing looks empty, first verify you picked the right player type.

## Shared options (most cards)

- **Size**: `small` or `large` (when supported by that card type).
- **Custom name**: override Home Assistant friendly name.
- **Custom icon**: choose icon from icon picker.
- **Visibility controls**: hide/show based on state rules.
- **Popup trigger**: open card popup automatically on configured conditions.

## Card-by-card options

### Sensor

**Best for:** temperatures, power usage, and binary state entities.

<img width="1484" height="245" alt="image" src="https://github.com/user-attachments/assets/82c14294-4bbd-4b92-80c3-bde40215b1c1" />

- Entity selection (`sensor.*`, `binary_sensor.*`, plus supported helper domains).
- Visual variant support (for numeric sensors): line/graph and gauge-like variants.
- Optional range/threshold settings (where relevant).
- Optional icon/value display tuning.

### Light

**Best for:** quick room lighting control with rich popup controls.

<img width="757" height="238" alt="image" src="https://github.com/user-attachments/assets/1cea9824-5ce9-4998-b250-8ec4621b89a5" />

<img width="1842" height="687" alt="image" src="https://github.com/user-attachments/assets/d48b8c2c-b92a-4c32-9c9e-ceebe9ad6115" />

- Light entity selection.
- On-card quick controls (toggle/brightness shortcuts).
- Popup controls for brightness, color temperature, and RGB (depends on entity support).

### Climate

**Best for:** heat pumps, thermostats, and AC units.

<img width="403" height="241" alt="image" src="https://github.com/user-attachments/assets/35b9d6fb-cf1c-4411-bd63-d46eb4e85a8d" />

<img width="1669" height="668" alt="image" src="https://github.com/user-attachments/assets/95fd5f98-b356-464f-b0d8-c3cabbb24652" />

- Climate entity selection.
- On-card target temperature +/- controls.
- HVAC action/status feedback.
- Fan and swing controls shown only when entity supports those features.

### Fan

**Best for:** standalone fans and ventilation devices.

- Fan entity selection.
- On-card speed and power controls.
- Popup support for oscillation/direction/presets (capability-aware).

### Cover

**Best for:** blinds, shutters, garage doors, and gates.

<img width="390" height="243" alt="image" src="https://github.com/user-attachments/assets/1916713d-7448-41a0-bf52-f03db48f0e77" />

<img width="1219" height="702" alt="image" src="https://github.com/user-attachments/assets/ac47e5ec-d66c-4e1c-b6f7-2fbcd851be42" />

- Cover entity selection.
- Position/tilt controls for supported entities.
- Device-class-aware labels (blind, shutter, garage, etc.).

### Vacuum

**Best for:** robot vacuums and status-oriented cleaning controls.

<img width="371" height="240" alt="image" src="https://github.com/user-attachments/assets/fa55736e-18ef-49ac-8944-365d937f20b4" />

<img width="1505" height="774" alt="image" src="https://github.com/user-attachments/assets/ddd3d31a-23cd-40d4-ae15-377c98031f7b" />

- Vacuum entity selection.
- State + quick actions (start/pause/return).
- Popup supports additional sensors/actions when exposed by integration.

### Camera

**Best for:** doorbells and surveillance feeds.

- Camera entity selection.
- Refresh mode and interval options.
- Stream engine selection (HA stream/snapshot fallback), with fallback behavior.

### Media

**Best for:** generic media-player control and playlist browsing.

<img width="387" height="236" alt="image" src="https://github.com/user-attachments/assets/4edb4099-7fc4-4fcc-ae02-f48f45c73c1a" />

<img width="1481" height="968" alt="image" src="https://github.com/user-attachments/assets/c8531577-8bf2-4879-93bc-d2298d398f8c" />

<img width="2537" height="1214" alt="image" src="https://github.com/user-attachments/assets/df581cf8-716b-4702-b545-e6775c854afc" />

- Generic media-player focused flow.
- Best for Music Assistant playlist browsing.
- Uses selected `media_player` capabilities for browse/play support.

### SONOS

**Best for:** Sonos-focused pages and grouped playback control.

- Dedicated Sonos page/card mode.
- Group/ungroup workflows for selected Sonos players.
- Sonos Favorites browsing requires a Sonos `media_player`.

### Weather / Temp

**Best for:** quick weather context and temperature trends.

- Weather entity + optional temperature source.
- Unit-aware rendering (follows configured unit mode/HA mode).
- Forecast/history visualization where data is available.

### Energy Cost

**Best for:** daily/monthly spend overview.

- Today + month entity mapping.
- Currency + display formatting options.

### Nordpool

**Best for:** hourly electricity price monitoring.

- Nordpool sensor selection.
- Decimal precision and display formatting options.

### Room

**Best for:** compact room-level overview cards.

- Build room card from Home Assistant area.
- Auto-suggested entities with optional manual mapping.
- Optional room visuals/toggles (e.g., icon watermark and status behaviors).

### Car

**Best for:** EV/vehicle status dashboards.

- Card-level mapping for EV-related sensors (battery/range/charging/temp/location).
- Optional custom image URL and per-sensor bindings.

### Person

**Best for:** presence and map-first location overview.

- Person entity selection.
- Popup map + optional telemetry blocks (battery, speed, distance from home, etc.).

### Alarm

**Best for:** alarm panel actions with integration-safe capability rendering.

- Alarm entity selection.
- Arm/disarm actions, with PIN flow where required.
- Capability-aware action rendering from alarm integration.

### Calendar

**Best for:** upcoming events and agenda flows.

- Calendar entity/list selection.
- Event rendering options from selected calendars.

### Todo

**Best for:** Home Assistant to-do workflows.

- To-do list entity selection.
- List item management in card/popup flow.

### Spacer

**Best for:** visual spacing and section separation in dense layouts.

- Variant: `spacer` or `divider`.
- Layout/spacing behavior to structure dashboard sections.

## Quick troubleshooting

- **Control missing?** The selected entity likely does not expose that feature.
- **Playlist/Favorites empty?** Confirm player type (Music Assistant vs Sonos).
- **Unexpected units?** Check dashboard unit mode and Home Assistant unit settings.
- **Card feels crowded?** Use `large` size and add `Spacer` cards between sections.

## Notes for maintainers

- Keep this file in sync when adding new card settings in edit modals.
- If a card gains/removes options, update its section here in the same PR.
- Prefer capability-aware wording (`if supported by entity`) for integration-specific features.
