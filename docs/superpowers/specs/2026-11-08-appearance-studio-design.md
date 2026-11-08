# Utsjånad-studio og galleri (Tunet 2.0, steg 1)

Status: til godkjenning. Gjeld `main` på v1.26.0. Grein: `codex/appearance-studio`.

Bakgrunn og heile 2.0-forslaget: [artefakten «Tunet 2.0 Utsjånad»](https://claude.ai/artifact/73DjkgDE2ZoZM4Mjx3xbjz).

## Kvifor

Eigaren er ikkje nøgd med tema og utsjånad. I dag:

- Eit mørkt slør (ca. 62 % av `--modal-backdrop`) dekkjer dashbordet når panelet er ope, så du ser dårleg det du endrar.
- Tema er ein tekstmeny. Du må velje før du ser kva du får.
- Innstillingar for utsjånaden ligg spreidde. Kortstil ligg under Oppsett, medan Språk, Eining, PIN-lås og «Attende til Heim» ligg under Utsjånad utan å ha noko med utsjånad å gjere.
- Bakgrunnsvalet «Eige bilete» finst i koden, men er ikkje mogleg å velje.

Steg 1 endrar korleis du **vel** utsjånad, ikkje korleis Tunet ser ut. Einaste unntak er at «Eige bilete» no faktisk verkar.

## Mål

1. Du ser dine eigne kort endre seg medan du justerer.
2. Tema og skrift blir valde frå ruter som viser resultatet.
3. Alt som handlar om utsjånad, ligg i Utsjånad, og ingenting anna ligg der.
4. Ingen mister noko. Alle lagra innstillingar held fram som før.

## Ikkje med i dette steget

Nye tema (Fjord, Skifer, Morgon), aksentveljar, temamotor, automatisk lys/mørk, himmel-bakgrunn, nattmodus, biletopplasting, blur og mørkleggings-slider for bilete, kontrastvakt og «Looks». Dei høyrer til steg 2–4. Smart-temaet oppfører seg som før.

## Det som ikkje må skje

- Lagra `tunet_*`-verdiar forsvinn eller må migrerast.
- Blank, glød eller eigne «spesialskjermar». Studioet brukar same rute- og panelspråk som bakgrunnsrutene i dag.
- Kortoppsettet endrar seg eller kort hoppar når panelet opnar.
- Dashbordet blir tregare eller flimrar på veggnettbrettet (Galaxy Tab har hatt flimmer før).
- Du trykkjer på eit kort og slår på eit lys ved eit uhell medan panelet er ope.

## Slik skal det verke

### 1. Direkte førehandsvising

Gjeld alle tre fanene i panelet (Utsjånad, Oppsett, Topptekst), elles ville dashbordet hoppe når du byter fane.

**Skjerm 900 px eller breiare: dashbordet krympar.**

- Panelet opnar som i dag på høgre side (420 px).
- `#main-content` får `transform: translateX(-210px) scale(s)` med `transform-origin: top center`, der `s = min(1, (vw - 420) / min(vw, 1600))`. Då fyller dashbordet nøyaktig plassen til venstre for panelet. På svært breie skjermar er `s = 1`, og dashbordet berre flyttar seg.
- Eksempel: 1920 px gir `s ≈ 0,94`, 1280 px gir `s ≈ 0,67`, 900 px gir `s ≈ 0,53`.
- Kortoppsettet blir ikkje rekna om. Det er nøyaktig same side, berre mindre.
- Bakgrunnen (`BackgroundLayer`) blir ikkje skalert og fyller heile skjermen.
- Sløret blir usynleg, men blir liggjande. Klikk utanfor panelet lukkar framleis, kort kan ikkje trykkjast på, og rulling med hjul eller finger går gjennom til dashbordet.
- Rørsla tek om lag 250 ms. Med `prefers-reduced-motion` eller `(update: slow)` skjer ho utan overgang, same reglar som `useLowPowerMotion`.
- Sidehøgda blir ikkje justert, så det kan bli tomrom nedst medan panelet er ope. Det er akseptert.

**Skjerm smalare enn 900 px: «Sjå»-knapp.**

- Panelet og sløret er som i dag, og panelet tek heile breidda under 480 px.
- Ein knapp «Sjå dashbordet» ligg nedst i panelet. Så lenge du held han inne, blir panelet og sløret usynlege, og berre knappen står att. Slepp du, kjem panelet tilbake med alle val urørte.
- Knappen må tole lang trykk på nettbrett: peikaren blir fanga, og tekstmarkering og sprettmeny er slått av. Han fungerer òg med mellomrom-tasten.

**Teknisk.** Ein liten hook (`useStudioPreview`, TSX/TS) skriv CSS-variablar og eit `data-`-attributt på `document.documentElement`, slik temaene alt gjer. CSS gjer resten. Dashbordet får ingen nye props og teiknar seg ikkje om. Hooken blir kalla frå `ModalSettingsSlice`, som alltid er montert, med `showThemeSidebar || showLayoutSidebar || showHeaderEditModal`. Då blir det ikkje hopp mellom fanene, sjølv om panela blir lasta på nytt. Han lyttar på vindaugsstorleik og ryddar etter seg når panelet lukkar. Reknestykket blir ein eigen rein funksjon som kan testast.

Ingenting endrar seg for fokus og tilgjenge: `aria-modal`, fokusfella og Esc er som før.

### 2. Temagalleri

- Erstattar temamenyen, øvst i Utsjånad.
- Seks ruter i tre kolonner, i rekkjefølgja til `Object.keys(themes)`: Smart, Mørk, Lys, Grafitt, Ametyst, Flat.
- Kvar rute er ei lita teikning laga berre av tokens frå `themes[key].colors`: bakgrunnsgradient (`--bg-gradient-from/to`), to småkort (`--card-bg`, `--card-border`), tekststrekar (`--text-primary/secondary`) og eit aksentmerke (`--accent-color`). Ingen harde fargar.
- Smart-ruta har eit lite auto-merke, slik at ho skil seg frå dei faste.
- Vald rute og knappeoppførsel er som bakgrunnsrutene: `<button aria-pressed>` med `is-active`-stil. Temanamnet er det tilgjengelege namnet.
- Alle namn går gjennom `t()`. I dag vantar `graphite`, `amethyst` og `flat` omsetjing, og Smart er hardkoda.

### 3. Bakgrunn

Som i dag, men `custom` («Eige bilete») kjem inn i rutene som sjuande val. URL-feltet finst alt i koden. Ruta viser biletet når det er sett.

**Biletet må òg faktisk kome fram.** I dag legg `ConfigContext` det på `body`, men rotelementet i `DashboardLayout` og den heildekkjande gradienten i `BackgroundLayer` dekkjer det, så det blir aldri synleg. Det skal rettast slik:

- `BackgroundLayer.jsx` får ei eiga grein for `bgMode === 'custom'` med bilete sett: vanleg temagradient nedst, biletet oppå (`cover`, sentrert) og ein mørk tone på 35 % øvst. Ingen fargeglødar over biletet.
- Ei ødelagd lenkje gjer då ingen skade. Du ser temabakgrunnen med tonen.
- Utan bilete sett er bakgrunnen som for «Følg tema».
- Koden som legg biletet på `body`, og `custom-bg-active`-overlegget i `index.css` blir fjerna dersom ingenting anna brukar dei, så biletet ikkje blir teikna dobbelt.

### 4. Kortstil

- Heile «Kortstil»-delen flyttar frå `LayoutSidebar` til Utsjånad, med dei same sju kontrollane: materiale, tettleik, kortskala, hjørneradius, gjennomsikt, kantsynlegheit og kortfarge.
- Same `tunet_*`-nøklar og setjarar, så ingen migrering.
- Ny fil `src/components/sidebars/CardStyleSection.tsx`. `ModalSettingsSlice` sender propsa til `ThemeSidebar` i staden for `LayoutSidebar`.
- Ope trekkspel som standard.

### 5. Skrift

Skriftmenyen blir erstatta av ruter med «Aa» i skrifta og namnet under. Sju val som i dag. Alle skriftene blir alt lasta i `index.html`, så rutene treng inga ekstra lasting.

**Rekkjefølgje i Utsjånad:** Tema, Bakgrunn, Kortstil, Skrift. Overskrifta «Grunnstil» fell bort.

### 6. System › Generelt

- Ny fane `general` i System-vindauget, rett etter Tilkobling. Må òg inn i `supportedTabs`.
- Innhald, flytt frå `ThemeSidebar` med same logikk: Språk, Eining-system, Innstillingslås og Åtferd («Attende til Heim» med slider).
- Ny fil `src/modals/GeneralSettingsTab.tsx`. `ConfigModal.jsx` har alt `language` og `inactivityTimeout` som props. Resten kjem frå `useConfig()`.
- PIN-dialogen for å slå av låsen flyttar med. Esc i dialogen skal berre lukke dialogen, ikkje System-vindauget.
- Nedst i Utsjånad kjem ei lenkjerad, «Språk, eining og lås», som lukkar panelet og opnar System på Generelt. Dei som leitar der tinga låg, finn dei då.

## Krav frå prosjektet

- Nye filer i `src/` er `.ts`/`.tsx`. Dei store `.jsx`-filene blir ikkje konverterte i dette arbeidet.
- Ingen ny state i `App.jsx`.
- Fargar kjem frå tema-tokens. `npm run lint:theme-colors` skal vere grønn.
- Alle åtte språkfilene (de, en, es, fr, nb, nn, sv, zh) får ekte omsetjingar av nye nøklar: `theme.contextual`, `theme.graphite`, `theme.amethyst`, `theme.flat`, `system.tabGeneral`, og tekstane til «Sjå»-knappen og lenkjeraden.
- Ingen urelaterte refaktoreringar.

## Testing

**Vitest**

- Reknestykket for skala: 2560, 1920, 1280, 900 og under 900 px.
- `useStudioPreview` set og fjernar attributt og variablar, og står urørt ved fanebyte.
- Galleriet viser seks ruter, og trykk kallar `setCurrentTheme`.
- Generelt viser språk, eining, lås og åtferd.
- `BackgroundLayer` viser biletet med tone og utan glødar for `custom`, og fell tilbake til temabakgrunnen utan bilete.

**Playwright (`e2e/modals.e2e.js`)**

- Oppdater `should change theme` (ruter i staden for meny), `should change language` (no i System › Generelt) og `supports keyboard theme selection` (Tab + Enter på ei rute).
- Nytt: på breitt vindauge får `#main-content` transform og sløret er usynleg, og begge går tilbake ved lukking.
- Nytt: på 390 px er panelet framleis 390 breitt, og held du «Sjå», blir panelet usynleg og kjem tilbake.
- Nytt: Kortstil finst i Utsjånad og ikkje i Oppsett.

**Ferdig når** `npm run lint`, `lint:theme-colors`, `typecheck`, `test` og format-sjekken er grøne, og Chromium-e2e og bundle-grensa er grøne i CI. Lokal e2e går mot det ekte huset, så der stolar vi på CI. I tillegg skal utsjånaden sjekkast med augo på 1920, 1280, 900, 800 og 390 px. Før samanslåing prøver eigaren krympinga på Galaxy Tab S7+, sidan verken CI eller skjermbreidder fangar opp hakking der.

## Kven bestemte kva

**Eigaren:** Steg 1 er «Studio og galleri». Førehandsvisinga skal vere at dashbordet krympar. «Eige bilete» skal verke alt i dette steget.

**Claude si vurdering, kan endrast:**

- Galleriet har berre dei seks tema som finst i dag.
- Språk, Eining, Lås og Åtferd får den nye fana «Generelt», sidan System ikkje har «Innstillingar».
- Bilete blir vist med mørk tone på 35 % og utan fargeglødar.
- Grensa for krymping er 900 px. Nettbrett på høgkant får «Sjå»-knappen.
- Krympinga gjeld alle tre fanene.
- Hakkar krympinga på Galaxy Tab, blir animasjonen først slått av på berøringsskjerm. Hjelper ikkje det, får berøringsskjerm «Sjå»-knappen i staden.
- Sløret blir usynleg, men blir liggjande, så klikk utanfor framleis lukkar.
- Ei lenkjerad frå Utsjånad til Generelt.
- Kortstil er ope som standard.

**Overlate til byggjaren:**

- Nøyaktig utsjånad og storleik på miniatyrane, innanfor stilen til bakgrunnsrutene.
- Kolonnetal på skriftrutene.
- Kva ikon `custom` skal ha.
- `SensorHistoryGraph` måler breidda si med `getBoundingClientRect` ved montering, som gir skalert verdi dersom grafen blir montert medan panelet er ope. Byt til `clientWidth` om det slår inn. Andre stader der slike mål blir brukte, skjer det ved interaksjon, som sløret blokkerer.
