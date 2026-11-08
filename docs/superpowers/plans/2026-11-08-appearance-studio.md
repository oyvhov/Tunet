# Appearance Studio and Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner see their real dashboard while changing appearance, pick themes and fonts from visual tiles, and gather all appearance settings in one panel.

**Architecture:** A pure geometry function and a small hook write CSS variables on `<html>`, so the dashboard scales through CSS with no new props or re-renders. Galleries and the moved sections are new focused `.tsx` components used by the existing `.jsx` sidebars and `ConfigModal`.

**Tech Stack:** React, Vite, TypeScript, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-appearance-studio-design.md`

## Global Constraints

- New files in `src/` are `.ts`/`.tsx`. Do not convert existing `.jsx` files.
- No new state in `App.jsx`. No unrelated refactors, comments or type annotations.
- Colours come from theme tokens. `npm run lint:theme-colors` must pass.
- Every new i18n key exists with a real translation in all eight files: de, en, es, fr, nb, nn, sv, zh. Insert next to related keys, keep each file's order.
- No `tunet_*` storage key changes and no migration.
- Same tile language as `.sidebar-background-option`. No gloss, no glow.
- Run Vitest with `--maxWorkers=2`. Never run e2e against the proxy to port 3002 (see Task 7).
- Commit locally per task. Do not push.
- End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Rotating a tablet across 900 px with the panel open: shrink is removed or applied live, and the peek button appears or disappears.
- A background URL containing a quote or backslash: the page still renders and the style value stays a valid quoted `url()`.
- An existing user with `tunet_bg_mode=custom` and no URL: they see the normal theme background, with glows.
- Peek interrupted by pointer cancel or lost capture: the panel comes back, never stuck hidden.
- Closing the panel with Esc: dashboard transform and backdrop return to normal.

---

### Task 1: Live preview geometry, hook and CSS

**Files:**
- Create: `src/utils/studioPreview.ts`, `src/hooks/useStudioPreview.ts`
- Modify: `src/rendering/modalSlices/ModalSettingsSlice.jsx`, `src/components/sidebars/SidebarContainer.jsx:129-137`, `src/styles/sidebar.css`, `src/components/charts/SensorHistoryGraph.tsx:82`
- Test: `src/__tests__/studioPreview.test.ts`, `src/__tests__/useStudioPreview.test.ts`

**Interfaces:**
- Produces: `STUDIO_PANEL_WIDTH = 420`, `STUDIO_MIN_SHRINK_WIDTH = 900`, `STUDIO_CONTENT_MAX_WIDTH = 1600`; `getStudioPreviewGeometry(viewportWidth: number): { shrink: boolean; scale: number; shift: number }`; `useStudioPreview(open: boolean): void`.
- Produces on `<html>` while shrinking: attribute `data-studio-preview="shrink"`, style vars `--studio-scale`, `--studio-shift` (px), `--studio-backdrop-opacity: 0`.

- [ ] **Step 1: Write failing tests**

`getStudioPreviewGeometry`: 2560 → `{shrink:true, scale:1, shift:-210}`; 1920 → scale 0.9375; 1280 → scale 0.671875; 900 → scale `480/900`, shrink true; 899 → `{shrink:false, scale:1, shift:0}`.

`useStudioPreview` (set `window.innerWidth`, dispatch `resize`): at 1280 and `open=true` the attribute is `shrink` and `--studio-scale` is `0.671875`; resize to 800 removes attribute and vars; resize back restores them; rerender still `open=true` leaves them; `open=false` and unmount remove them.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/__tests__/studioPreview.test.ts src/__tests__/useStudioPreview.test.ts --maxWorkers=2`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`scale = min(1, (vw - 420) / min(vw, 1600))`, `shift = -210`. Hook uses `useEffect` keyed on `open`, adds a `resize` listener, cleans up.

In `ModalSettingsSlice` call `useStudioPreview(showThemeSidebar || showLayoutSidebar || showHeaderEditModal)` after the `modals` destructure.

In `SidebarContainer` set backdrop `opacity: open ? 'var(--studio-backdrop-opacity, 0.62)' : 0`.

In `sidebar.css`:

```css
#main-content {
  transform-origin: top center;
}

@media (prefers-reduced-motion: no-preference) and (update: fast) {
  #main-content {
    transition: transform 250ms ease;
  }
}

html[data-studio-preview] #main-content {
  transform: translateX(var(--studio-shift)) scale(var(--studio-scale));
}
```

In `SensorHistoryGraph` measure with `element.clientWidth`.

- [ ] **Step 4: Run tests, expect PASS, then commit**

Commit: `feat(appearance): shrink the dashboard beside the settings panel`

---

### Task 2: Peek button on narrow screens

**Files:**
- Modify: `src/components/sidebars/SidebarContainer.jsx`, `ThemeSidebar.jsx`, `LayoutSidebar.jsx`, `HeaderSidebar.jsx`, `src/styles/sidebar.css`, `src/i18n/*.json`
- Test: `src/__tests__/SidebarContainer.test.jsx`

**Interfaces:**
- Produces: `SidebarContainer` prop `peekLabel?: string`. Button `data-testid="sidebar-peek"` in wrapper `.tunet-sidebar__peek`, last child of the panel column. Panel attribute `data-peeking="true"` while held.
- i18n `settings.peekDashboard`: en View dashboard, nb Se dashbordet, nn Sjå dashbordet, sv Visa instrumentpanelen, de Dashboard ansehen, fr Voir le tableau de bord, es Ver el panel, zh 查看仪表盘.

- [ ] **Step 1: Write failing tests**

No button without `peekLabel`. `pointerDown` sets `data-peeking="true"` and backdrop opacity 0. `pointerUp`, `pointerCancel` and `lostPointerCapture` each clear it. Space `keyDown` sets it, `keyUp` and `blur` clear it. `contextMenu` is default-prevented.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/__tests__/SidebarContainer.test.jsx --maxWorkers=2`

- [ ] **Step 3: Implement**

`useState` for `peeking`; pointer-down calls `setPointerCapture?.(e.pointerId)`. Backdrop opacity is 0 while peeking. CSS: `.tunet-sidebar[data-peeking='true']` gets transparent background, border and shadow, and all column children except `.tunet-sidebar__peek` get `visibility: hidden`. `.tunet-sidebar__peek` is `display: none` at `min-width: 900px`; its button has `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`. Pass `peekLabel={t('settings.peekDashboard')}` from all three sidebars.

- [ ] **Step 4: Run tests and `npm run i18n:check`, expect PASS, then commit**

Commit: `feat(appearance): hold to view the dashboard on narrow screens`

---

### Task 3: Working custom image background

**Files:**
- Modify: `src/layouts/BackgroundLayer.jsx`, `src/contexts/ConfigContext.tsx:307-342`, `src/styles/index.css:68-76`, `src/components/sidebars/ThemeSidebar.jsx`
- Test: `src/__tests__/BackgroundLayer.test.jsx`

**Interfaces:**
- Produces: elements `data-testid="custom-background-image"` and `data-testid="custom-background-tone"`.
- Produces: `backgroundImageUrl(url: string): string` in `src/utils/studioPreview.ts`, returns `url(${JSON.stringify(url)})`.

- [ ] **Step 1: Write failing tests**

Extend the `useConfig` mock with `bgImage`. `custom` with `https://x/a.jpg`: image element's `backgroundImage` contains the URL, tone exists, no `.rounded-full` glow elements. `custom` with `''`: no image element, glows present. `backgroundImageUrl('a"b\\c')` equals `url("a\"b\\c")`.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/__tests__/BackgroundLayer.test.jsx --maxWorkers=2`

- [ ] **Step 3: Implement**

`BackgroundLayer`: new branch for `bgMode === 'custom' && bgImage` in the same fixed container: existing gradient, image div (`cover`, `center`), tone div with class `background-custom-tone`, no glows.

`index.css`: replace the `html.custom-bg-active body::before` rule with `.background-custom-tone { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.35); }`.

`ConfigContext`: delete the `custom` branch, the `custom-bg-active` handling and the body image cleanup, so `custom` falls to the theme branch.

`ThemeSidebar`: add `{ key: 'custom', icon: Link, label: t('settings.bgCustom') }` to `bgModes` after `gradient`. Preview style when `bgImage` is set: `backgroundImageUrl(bgImage)`, `cover`, `center`.

- [ ] **Step 4: Run tests, expect PASS, then commit**

Commit: `fix(background): show the custom image and offer it in the panel`

---

### Task 4: Move card style into Appearance

**Files:**
- Create: `src/components/sidebars/CardStyleSection.tsx`
- Modify: `src/components/sidebars/LayoutSidebar.jsx`, `ThemeSidebar.jsx`, `src/rendering/modalSlices/ModalSettingsSlice.jsx`
- Test: `src/__tests__/CardStyleSection.test.tsx`

**Interfaces:**
- Produces: default export `CardStyleSection(props: CardStyleSectionProps)` with `t: (key: string) => string` and value and setter pairs: `cardMaterial: string`, `density: string`, `cardBgColor: string` (setters take `string`), `cardScale`, `cardBorderRadius`, `cardTransparency`, `cardBorderOpacity` (numbers, setters take `number`). Accordion open state is internal, default open.

- [ ] **Step 1: Write failing tests**

`t` returns the key. Labels `settings.cardMaterial`, `settings.density`, `settings.cardScale`, `settings.cardRadius`, `settings.transparency`, `settings.borderOpacity`, `settings.cardBackgroundColor` are visible without clicking. Clicking `settings.materialFlat` calls `setCardMaterial('flat')`. Typing `#zzz` in the colour field does not call `setCardBgColor`.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/__tests__/CardStyleSection.test.tsx --maxWorkers=2`

- [ ] **Step 3: Implement**

Move the accordion from `LayoutSidebar.jsx:493-797` and its helpers (`parseHexColor`, `effectiveCardColor`, `rgb`, `updateCardColorChannel`) unchanged in behaviour. Remove the `cards` section and the card props from `LayoutSidebar`. `ModalSettingsSlice` passes them to `ThemeSidebar`, which renders the section after Background.

- [ ] **Step 4: Run tests and typecheck, expect PASS, then commit**

Commit: `refactor(appearance): move card style into the appearance panel`

---

### Task 5: Theme and font galleries

**Files:**
- Create: `src/components/sidebars/ThemeGallery.tsx`, `src/components/sidebars/FontGallery.tsx`, `src/config/appFonts.ts`
- Modify: `src/components/sidebars/ThemeSidebar.jsx`, `src/App.jsx:137-150`, `src/styles/sidebar.css`, `src/i18n/*.json`
- Test: `src/__tests__/ThemeGallery.test.tsx`, `src/__tests__/FontGallery.test.tsx`

**Interfaces:**
- Produces: `ThemeGallery({ themes, currentTheme, onSelect, t })`, `themes: Record<string, { colors: Record<string, string> }>`, `onSelect: (key: string) => void`.
- Produces: `FontGallery({ current, onSelect })`.
- Produces: `APP_FONT_OPTIONS: string[]`, `APP_FONT_FAMILIES: Record<string, string>` (moved from `App.jsx`).
- i18n: `theme.contextual` en/nb/nn/sv/de Smart, fr Intelligent, es Inteligente, zh 智能. `theme.graphite` en Graphite, nb/nn Grafitt, sv Grafit, de Graphit, fr Graphite, es Grafito, zh 石墨. `theme.amethyst` en/de Amethyst, nb/nn Ametyst, sv Ametist, fr Améthyste, es Amatista, zh 紫水晶. `theme.flat` en/nb/nn Flat, sv Platt, de Flach, fr Plat, es Plano, zh 扁平.

- [ ] **Step 1: Write failing tests**

`ThemeGallery` with the real `themes` and `t` returning the key: six buttons in order `theme.contextual`, `theme.dark`, `theme.light`, `theme.graphite`, `theme.amethyst`, `theme.flat`; the current one has `aria-pressed="true"` and only that one; clicking `theme.light` calls `onSelect('light')`; a tile's preview style uses that theme's `--bg-gradient-from`.

`FontGallery`: seven buttons; `Roboto` tile sample has `fontFamily` from `APP_FONT_FAMILIES.Roboto`; clicking calls `onSelect('Roboto')`.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/__tests__/ThemeGallery.test.tsx src/__tests__/FontGallery.test.tsx --maxWorkers=2`

- [ ] **Step 3: Implement**

Reuse `.sidebar-background-grid`, `.sidebar-background-option`, `__preview`, `__label`, `is-active`. Preview: gradient from tokens, two mini cards (`--card-bg`, `--card-border`), text bars (`--text-primary`, `--text-secondary`), accent mark (`--accent-color`); `Sparkles` corner mark on `contextual`. Font tile: `Aa` in the family, name below, `sans` labelled `Sans-serif`.

`ThemeSidebar` order: Theme (`SidebarGroupHeader` with `settings.theme`), Background, Card style, Font (`settings.appFont`). Remove the theme and font dropdowns. `App.jsx` reads `APP_FONT_FAMILIES`.

- [ ] **Step 4: Run tests, `npm run i18n:check`, expect PASS, then commit**

Commit: `feat(appearance): pick themes and fonts from visual tiles`

---

### Task 6: System General tab

**Files:**
- Create: `src/modals/GeneralSettingsTab.tsx`
- Modify: `src/modals/ConfigModal.jsx:213-227,2307-2309`, `src/components/sidebars/ThemeSidebar.jsx`, `src/rendering/modalSlices/ModalSettingsSlice.jsx`, `src/styles/sidebar.css`, `src/i18n/*.json`
- Test: `src/__tests__/GeneralSettingsTab.test.tsx`

**Interfaces:**
- Produces: `GeneralSettingsTab({ t, language, setLanguage, inactivityTimeout, setInactivityTimeout })`.
- Produces: `ThemeSidebar` prop `onOpenGeneralSettings: () => void`; button `data-testid="appearance-general-link"`.
- i18n `system.tabGeneral`: en General, nb/nn Generelt, sv Allmänt, de Allgemein, fr Général, es General, zh 常规. `settings.moreGeneralSettings`: en Language, units and lock; nb Språk, enheter og lås; nn Språk, eining og lås; sv Språk, enheter och lås; de Sprache, Einheiten und Sperre; fr Langue, unités et verrouillage; es Idioma, unidades y bloqueo; zh 语言、单位和锁定.

- [ ] **Step 1: Write failing tests**

Mock `useConfig` from `../contexts` and `PinLockModal`. Labels `settings.language`, `settings.unitSystem`, `settings.lock.title`, `settings.behavior` are visible. Turning on `settings.inactivity` calls `setInactivityTimeout(60)` and writes `tunet_inactivity_timeout` as `60`. Mismatched PINs show `settings.lock.pinMismatch` and do not call `enableSettingsLock`.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/__tests__/GeneralSettingsTab.test.tsx --maxWorkers=2`

- [ ] **Step 3: Implement**

Move the language and unit dropdowns, lock accordion, PIN state and handlers, `PinLockModal` and behaviour block from `ThemeSidebar` with the same logic. Wrap each group in `.popup-surface` with a `modal-section-label` heading, inside the wrapper classes `renderConnectionTab` uses.

`ConfigModal`: add `{ key: 'general', icon: Settings, label: t('system.tabGeneral') }` after `connection`, add `general` to `supportedTabs`, render the tab.

`ThemeSidebar`: remove moved props, state and `handleSidebarClose`; add the link row last.

`ModalSettingsSlice`: stop passing language and inactivity to `ThemeSidebar`; pass `onOpenGeneralSettings` that closes the sidebar, calls `setConfigTab('general')` and `setShowConfigModal(true)`.

- [ ] **Step 4: Run tests, `npm run i18n:check`, typecheck, expect PASS, then commit**

Commit: `feat(system): add a General tab for language, units, lock and behaviour`

---

### Task 7: End-to-end tests

**Files:**
- Modify: `e2e/modals.e2e.js:754-766,1012-1040`
- Local only, excluded through `.git/info/exclude`: `vite.e2e-local.config.js`, `playwright.e2e-local.config.js`

- [ ] **Step 1: Create the local config**

`vite.e2e-local.config.js` imports `./vite.config.js` and points `server.proxy['/api'].target` at `http://127.0.0.1:9`. `playwright.e2e-local.config.js` spreads `playwright.config`, sets `workers: 1`, `baseURL` `http://localhost:5293`, and a `webServer` running `npx vite --config vite.e2e-local.config.js --port 5293 --strictPort`.

- [ ] **Step 2: Update existing tests**

`should change theme`: tile named `Light` is visible in the sidebar; clicking it sets `aria-pressed="true"` and `tunet_theme=light`.
`should change language`: in System, open the `General` tab, `Language` is visible.
`supports keyboard theme selection`: replace the dropdown steps with focusing the `Light` tile and pressing Enter; tile stays focused; keep the storage, `colorScheme`, screenshot and Esc assertions.

- [ ] **Step 3: Add new tests**

- `shrinks the dashboard beside the appearance panel`: at 1280 wide, `#main-content` computed `transform` is not `none`, backdrop computed opacity is `0`; after Esc, poll until `transform` is `none` and `data-studio-preview` is absent.
- `peeks at the dashboard on a narrow screen`: at 390 wide, panel width is 390; mouse down on `sidebar-peek` gives `data-peeking="true"`, mouse up removes it.
- `keeps card style in appearance only`: `Card Style` is visible in `theme-sidebar` and absent in `layout-sidebar`.
- `shows the custom background image`: choose `Custom image`, fill the URL with a data URI; `custom-background-image` is visible.
- `opens General from appearance`: click `appearance-general-link`; System is visible with `Language`.
- `escape in the disable-lock dialog keeps System open`: enable a lock with PIN `1234`, click disable, press Esc; PIN dialog is gone and System is still visible.

- [ ] **Step 4: Run and confirm**

Run: `npx playwright test --config playwright.e2e-local.config.js --project=chromium e2e/modals.e2e.js`
Expected: all pass. Delete `test-results/` and `playwright-report/` after.

- [ ] **Step 5: Commit** (only `e2e/modals.e2e.js`)

Commit: `test(e2e): cover the appearance studio and General tab`

---

### Task 8: Whole-branch verification

- [ ] **Step 1: Static gates**

Run: `npm run lint`, `npm run lint:theme-colors`, `npm run typecheck`. Expected: all exit 0.

- [ ] **Step 2: Unit tests**

Run: `npx vitest run --maxWorkers=2`. Expected: all pass.

- [ ] **Step 3: Format changed files**

Check each changed file with `tr -d '\r' < FILE | npx prettier --stdin-filepath FILE --check`. Fix and commit if needed.

- [ ] **Step 4: Build and bundle limit**

Run: `npx vite build` then `node scripts/check-bundle-size.mjs`. Expected: within limits.

- [ ] **Step 5: Full e2e, headless**

Run the Task 7 command without the file filter. Expected: all pass.

- [ ] **Step 6: Visual check, headless**

Temporary spec under the local config takes screenshots of the open panel at 1920, 1280, 900, 800 and 390 px. Inspect them, then delete the spec.

- [ ] **Step 7: Independent review of the branch against the spec, fix findings, re-run affected gates.**
