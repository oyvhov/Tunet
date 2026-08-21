# Weather card design QA

## Evidence

- Original card truth: the weather card in the current Tunet dashboard before this change.
- Selected forecast direction: `C:\Users\Øyvind\.codex\generated_images\01a02037-48fe-7930-99d7-d5de69743171\exec-4d2aa8d1-8df4-44bc-86bd-88b90097d9e9.png`.
- Rendered evidence: verified in the in-app Browser against the production component at desktop and mobile sizes; QA screenshots were kept outside the repository.
- Desktop viewport: 1280 × 720 CSS pixels at device scale factor 1; large card 350 × 216 and small card 350 × 100 CSS pixels.
- Mobile viewport: 390 × 700 CSS pixels at device scale factor 1; full-width card 358 × 184 and small full-width card 358 × 82 CSS pixels.
- State: dark theme. Current weather is the default; hourly and daily forecast states were opened and verified in every size.

## Comparison and intent

The original Tunet weather card remains the default presentation, including its weather graph, icon, temperature, typography, and established hierarchy. A horizontal swipe changes between the current view and a forecast state inspired by the selected concept. Inside that state, the same area switches between `Timar` and `Dagar`. The concept's divider and trend line are intentionally omitted, per the requested direction.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Large card: the original graph view is preserved; the forecast state fits four periods without clipping.
- Small card: the current view retains the graph and compact hierarchy; the forecast state fits two periods without overlap.
- Full-width mobile: horizontal content padding is increased independently of the narrow mobile card. The forecast header, controls, four periods, and bottom edge keep visible breathing room.
- Small full-width mobile: three periods fit beside the compact vertical `Timar`/`Dagar` switch.
- Typography and colors use the existing Tunet font, uppercase labels, weights, tracking, glass surfaces, borders, and neutral selected state.
- Existing Meteocons assets are retained at their natural aspect ratio.
- Hourly and daily values come from Home Assistant's separate forecast responses; legacy forecast arrays remain supported.

## Comparison history

- Rejected direction: the first implementation replaced the existing graph view with the forecast layout.
- Fix: restored the original card as the default and made forecast a separate, reversible state.
- Mobile P2: in the full-width mobile forecast, temperatures sat too close to the lower border.
- Fix: reduced only the mobile forecast header/icon density and forecast icon size, leaving clear bottom padding without changing desktop sizing.
- Interaction revision: removed the current/forecast buttons and replaced them with a two-direction swipe that follows the pointer, then completes with a short slide animation.
- Post-fix evidence: the final full-width and small full-width mobile checks show no clipping, overlap, or edge crowding.

## Primary interactions and console

- Swiping left opens the hourly forecast without opening the card modal.
- `Dagar` switches to daily forecast; `Timar` switches back.
- Swiping right returns to the original graph state.
- Card click behavior remains unchanged outside the nested controls.
- The two small neutral indicators show which of the two views is active without acting as buttons.
- All seven translations include hourly, daily, current, forecast, and the localized swipe hint.
- The final clean browser tab produced no console warnings or errors.

## Follow-up polish

- None required for this scope.

final result: passed
