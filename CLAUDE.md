# Bard Idle Game — CLAUDE.md

## Instructions

Keep going until the job is completely solved before ending your turn.
If you're unsure about code or files, open them—do not hallucinate.
Plan thoroughly before every tool call and reflect on the outcome after.
Run `npm run test -- --run` from `frontend/` only when changes touch tested files — i.e. `src/stores/`, `src/composables/`, `src/config/`, `src/types/`, or `src/__tests__/`. Pure component/CSS/asset changes do not require a test run. Fix any failing tests before proceeding.

## Stil: Pixel-RPG Idle Game

Referenz-Komponente: `frontend/src/components/gameCenter/idle/ShopComponent.vue`
Bei Unklarheiten → diese Datei als visuelles Vorbild nehmen.

---

## Kern-Regeln

**Font:** `font-['MedievalSharp']` – global gesetzt, nicht wiederholen
**Radius:** max. `border-radius: 4-5px` – nie `rounded-xl` oder größer
**Hintergrund:** flache dunkle Farben (`#111008`, `#1c1c18`) – kein `backdrop-blur`
**Borders:** feste Hex-Werte – kein `border-white/[0.08]`
**Text:** direkte Farben – kein `bg-clip-text` / `text-transparent`
**Styles:** visuelle CSS immer in `<style scoped>` – Tailwind nur für Layout/Spacing
**Magic Numbers:** Alle numerischen Konstanten und wiederverwendete Strings gehören nach `src/config/constants.ts` – keine direkten Literale im Code.

---

## Immer verwenden

```css
/* Container / Modals → Holzrahmen */
border: 4px solid #7a4e20;
box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310;
background: #111008;

/* Goldlinie oben an jedem Modal */
height: 3px;
background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);

/* Header-Streifen */
background: #1e1006;
border-bottom: 3px solid #5c3310;

/* Kaufbar / Aktiv → Grün */
background: linear-gradient(to bottom, #52b830, #2e7a1a);
border: 1px solid #6ec040;

/* Stats / Gold-Akzente */
color: #e8c040;

/* Gesperrt */
opacity: 0.5;
filter: grayscale(55%);
cursor: not-allowed;

/* Scrollbar */
scrollbar-width: thin;
scrollbar-color: #5c3310 #111;

/* Tooltip */
background: #16140e;
border: 2px solid #5c3310;
border-radius: 4px;
box-shadow: 0 8px 24px rgba(0,0,0,0.85);
```

---

## Farben Referenz

```
#111008 → tiefstes Dunkel (Modal-BG)
#1a1008 → Content-Bereiche
#1c1c18 → Item-Zeilen
#1e1006 → Header
#141410 → Icon-Boxen
#7a4e20 → Holzrahmen
#e8c040 → Gold (Stats, Titles)
#52b830 → Grün oben (Button)
#2e7a1a → Grün unten (Button)
#cc6050 → Rot (Fehler, Reset)
```

---

## Nie verwenden

```
❌ backdrop-blur / backdrop-filter
❌ rounded-xl / rounded-2xl / rounded-3xl
❌ border-white/[0.08] → feste Hex-Farben
❌ from-emerald-900/30 → flache Farben
❌ text-transparent bg-clip-text → direkte Farben
❌ font-family in scoped CSS → global geerbt
❌ Tailwind für visuelle Styles → kein CSS in <style scoped>; immer ins Template das CSS
```

---

## Icons — Iconify / game-icons

**Alle Icons kommen ausschließlich aus dem `game-icons`-Set via Iconify.**

### Einbinden

```html
<!-- CDN (Templates / Static HTML) -->
<span class="iconify" data-icon="game-icons:musical-notes"></span>
<script src="https://code.iconify.design/3/3.1.1/iconify.min.js"></script>
```

```vue
<!-- Vue-Komponente (empfohlen) -->
<script setup>
import { Icon } from '@iconify/vue'
</script>

<template>
  <Icon icon="game-icons:musical-notes" width="24" height="24" />
</template>
```

### Regeln

1. **Kein Duplikat im Spiel** – Bevor ein neues Icon gewählt wird, prüfe alle bestehenden
   Komponenten. Wird ein Icon bereits verwendet, wähle ein anderes aus dem `game-icons`-Set.
2. **Set-Präfix immer angeben** – `game-icons:<name>`, nie nur `<name>`.
3. **Größe immer explizit** – `width` und `height` immer setzen (Standard: `24`).
4. **Farbe per CSS** – Nie `color`-Prop; stattdessen per `style="color: #e8c040"` oder
   eine CSS-Klasse in `<style scoped>`.
5. **Thematisch passend** – Wähle ein Icon, das semantisch zum Feature passt
   (z. B. `game-icons:gems` für Chimes, `game-icons:monster-skull` für Gegner).

### Icon-Suche

Verfügbare `game-icons`-Icons durchsuchen:
- **Iconify Design:** https://icon.ly/icones/game-icons (Filtermöglichkeit nach Set)
- **Direktsuche:** https://iconify.design/icon-sets/game-icons/

### Bereits verwendete Icons nachverfolgen

Eine aktuell vollständige Liste aller im Spiel verwendeten `game-icons`-Icons wird in
`frontend/src/config/constants.ts` als Kommentar gepflegt:

```ts
// USED_GAME_ICONS – diese Icons sind bereits im Spiel verbaut; keine Duplikate verwenden!
// game-icons:musical-notes  → Chimes / Hauptwährung
// game-icons:...            → weitere Icons hier ergänzen
```

Beim Hinzufügen eines neuen Icons: Eintrag in diesen Kommentarblock aufnehmen.

---

## Projektübersicht

League of Legends-themed browser idle clicker game. Single-page Vue 3 App, kein Backend,
Spielstand wird in localStorage gespeichert und beim Start automatisch geladen.

**Core Features:**

- Click-to-earn Chimes (Währung)
- Auto-Battle mit ELO/LP-System gegen LoL-Champions
- Champion-Orbit-Kampfsystem (Rollen: Top, Jungle, Mid, ADC, Support)
- Planet Rescue Events & Planet Boss Fights
- Expeditions-System (aktive Missionen mit Materialbelohnungen)
- Augment-System (Rarity-basierte Buffs per Level-Up)
- Galaxy-Progression mit Warp & Boss-Kämpfen
- Synergy-System (5 Typen: elemental/role-echo/lore-bond/full-orbit/rarity)
- Prestige-System (Universes)

---

## Tech-Stack

| Paket                | Version | Zweck                          |
| -------------------- | ------- | ------------------------------ |
| vue                  | ^3.5.17 | UI-Framework                   |
| pinia                | ^3.0.3  | State Management               |
| vue-router           | ^4.5.1  | installiert, **nicht genutzt** |
| @vue-flow/core       | ^1.48.2 | Flow-Diagramme                 |
| @vue-flow/background | ^1.3.2  | Flow-Hintergrund               |
| @vue-flow/controls   | ^1.1.3  | Flow-Controls                  |
| tailwindcss          | ^3.4.17 | CSS-Framework                  |
| typescript           | ~5.8.0  | Typisierung                    |
| vite                 | ^7.0.0  | Build-Tool                     |
| eslint               | ^9.29.0 | Linting                        |
| prettier             | 3.5.3   | Formatierung                   |
| vue-tsc              | ^2.2.10 | TypeScript-Check               |

---

## Projektstruktur

```
frontend/
  src/
    main.ts               # Entry-Point; importiert formatNumber aus config/numberFormat.ts,
                          # registriert $formatNumber als Vue-Global-Property, ruft loadGame()
                          # nach app.mount() auf, startet setInterval(saveGame, 5000),
                          # pausiert/reaktiviert Timer bei Tab-Wechsel (visibilitychange)
    App.vue               # Root-Layout; bindet alle Top-Level-Komponenten ein
    stores/               # Pinia Stores — Single Source of Truth
      gameStore.ts        # Haupt-Game-Loop (tick 1s): Chimes, Level, Abilities, Augments, Universe
      battleStore.ts      # Auto-Battle-System, LP/MMR, Team-Slots, Kill-Simulation
      shopStore.ts        # Gebäude/Upgrades kaufen, CPS-Berechnung
      cpsStore.ts         # CPS-Tracking über drei Perioden (1min/10min/1h)
      playerStore.ts      # Spieler-HP, Schaden empfangen/heilen
      sectionStore.ts     # Abschnitts-Navigation (10 Sections)
      augmentStore.ts     # Augment-Effekte aktivieren und auslesen
      planetShopStore.ts  # Planet-Slots kaufen, Rollen-Boni, Jungle-Buffs
      inventoryStore.ts   # Material-Inventar, Drop-Logik
      itemStore.ts        # Ausrüstungs-Items und deren Effekte
      synergyStore.ts     # Champion-Synergy-Boni (5 Typen)
      planetEventStore.ts # Planet-Rescue-Events, Spawn-Logik, Klick-Fortschritt
      planetBossStore.ts  # Boss-Kämpfe auf Planeten, HP/Enrage-System
      combatStore.ts      # Champion-Orbit-Kampfsystem, DPS-Berechnung
      roleBehaviorStore.ts# Rollen-Fähigkeiten (Shield, Curse, Burst, Heal)
      galaxyStore.ts      # Galaxy-Progression, Warp-System, Galaxy-Boss-Suche
      starGroupStore.ts   # Star-Gruppen-Verwaltung im Orbit-View
      missionStore.ts     # Mission-Fortschritt und CPS/CPC-Belohnungen
      expedetionStore.ts  # Expeditions-System (max. 3 aktiv) — Hinweis: Typo im Dateinamen
      uiStore.ts          # UI-Zustand (aktiver Tab, Modal-Flags)
    components/           # Vue-Komponenten (rein presentational)
      GameCenterComponent.vue  # Tab-Wrapper: Idle / Battle / Champion / Missions
      ... (weitere Komponenten pro Feature)
    composables/          # UI-Helpers + Persistence
      usePersistence.ts   # saveGame / loadGame / resetGame — localStorage Persistence
      useGalaxyTheme.ts   # Farbthemen pro Galaxy
      useRarityColors.ts  # Farben nach Augment-Rarität
      useEventLog.ts      # Live-Eventlog (max. 12 Einträge, AUTO_DISMISS nach 7s)
      useProjectileSystem.ts  # Projektil-Fluganimationen (Feind-Angriffe)
      usePlanetOrbit.ts   # Orbit-Positionsberechnungen für Planeten
      useOrbitScale.ts    # Orbit-Radius-Skalierung relativ zu Viewport
      useStarSystem.ts    # Star-Verwaltung und Spawn-Logik im Orbit-View
      useWindowFocus.ts   # Tab-Fokus-Erkennung für Offline-Progress
      useRenderingPaused.ts   # Canvas-Rendering pausieren wenn Tab inaktiv
      useNebulaTrigger.ts # Nebula-Erscheinungs-Trigger im Hintergrund
      starBackground/     # Hintergrundcanvas-Rendering (Subdir)
        index.ts          # Re-Export
        useStarBackground.ts  # Canvas-Composable (Sterne, Warp)
        galaxyRenderers.ts    # Galaxy-Transitions und Warp-Effekte
        nebulaRenderers.ts    # Nebula-Overlay-Rendering
        types.ts          # Lokale Typen für den Hintergrund-Canvas
    config/               # Statische Spieldaten und Konstanten (kein Backend)
      constants.ts        # Alle numerischen Spielkonstanten (zentral — Magic Numbers hierher)
      augments.ts         # Augment-Definitionen (Name, Rarity, Effekte)
      synergies.ts        # Synergy-Definitionen (5 Typen)
      sets.ts             # Set-Boni für Ausrüstungs-Kombinationen
      items.ts            # Ausrüstungs-Items (Slots, Boni)
      materials.ts        # Material-Definitionen (Drop-Quellen, Werte)
      universes.ts        # Universe/Prestige-Definitionen
      sections.ts         # Section-Daten (10 Sections mit Unlock-Bedingungen)
      expeditions.ts      # Expeditions-Konfiguration (Ziele, Dauer, Belohnungen)
      expedition.ts       # Expeditions-Hilfsfunktionen und Typen
      championRoles.ts    # Champion-Rollendaten (Top/Jungle/Mid/ADC/Support)
      championHomePlanets.ts  # Welcher Champion gehört zu welchem Planeten
      galaxyThemes.ts     # Farbthemen und visuelle Parameter je Galaxy
      numberFormat.ts     # Zahlenformatierungs-Konfiguration ($formatNumber)
      messages.ts         # Spielnachrichten, Chat-Texte für Battle-Simulation
      gameEventLogger.ts  # Event-Logger (logBattleStarted, logChampionDefeated, …)
      eventLogTypes.ts    # Typen und Enums für das Event-Log-System
      encyclopedia/       # In-Game-Lexikon (Subdir, 8 Kategoriedateien)
        index.ts
        buildingsAndUpgrades.ts
        materialsAndItems.ts
        augmentsAndBattle.ts
        planetsAndExpeditions.ts
        resourcesAndLeveling.ts
        universesAndConstants.ts
        types.ts
    types/
      index.ts            # Alle TypeScript-Interfaces zentral
    router/               # Vorhanden, aber leer — vue-router nicht genutzt
    assets/               # Statische Assets (Bilder, Sounds)
    utils/                # Hilfsfunktionen (logger, champions, bossNames, …)
```

---

## Development-Workflow

```bash
# Aus dem frontend/-Verzeichnis:
npm run dev          # Vite Dev-Server starten
npm run build        # vue-tsc + vite build
npm run type-check   # vue-tsc (nur Type-Check, kein Build)
npm run lint         # ESLint mit --fix
npm run format       # Prettier
npm run test -- --run   # Vitest (einmalig, kein Watch)
npm run test:coverage   # Coverage-Report
```

---

## Architektur-Entscheidungen

**Stores = Single Source of Truth**
Alle Spieldaten leben in Pinia Stores. Komponenten lesen nur, mutieren nichts direkt.

**Komponenten = Purely Presentational**
Komponenten binden Store-Daten via `storeToRefs` oder computed, triggern nur Actions.

**Composables = UI-Helpers only (Ausnahme: usePersistence)**
Keine Business-Logik in Composables — nur UI-Berechnungen (Farben, Orbit, Canvas). Ausnahme:
`usePersistence.ts` enthält die Save/Load-Logik als zentrales Composable
(saveGame / loadGame / resetGame).

**config/ = Statische Spieldaten + Konstanten**
Kein API-Call, keine Datenbank. Alle Game-Balance-Werte liegen als TypeScript-Objekte in
`src/config/`. Numerische Konstanten zentral in `constants.ts` — keine Magic Numbers im
Store-/Composable-Code.

**types/ = Zentrales Typen-Verzeichnis**
Alle Interfaces in `src/types/index.ts`. Keine verteilten lokalen Typ-Definitionen.

**Game Loop**

- `gameStore.tick()` läuft jede Sekunde (Chimes, Ressourcen, Cooldowns)
- `battleStore` simuliert Kämpfe (45s Echtzeit, Kill-Schedule, LP/MMR)
- `combatStore` / `roleBehaviorStore` laufen frame-basiert (requestAnimationFrame)

---

## Bekannte Constraints

- **localStorage Persistence**: Spielstand wird alle 5s gespeichert (key: `'bard-idle-save'`).
  Reset via Button neben Bard-Portrait in `BardProfileMenu.vue`. Bei Tab-Wechsel wird sofort
  gespeichert.
- **chimesPerSecond**: Wird nach Load durch `shopStore` neu berechnet; `cpsStore` trackt die
  laufende Produktion über drei Zeitfenster (1min/10min/1h).
- **vue-router installiert, aber ungenutzt**: `src/router/` ist leer. Tab-Navigation ist manuell
  implementiert.
- **Tests**: Vitest mit 57 Tests in `src/__tests__/stores/`. `npm run test -- --run` und
  `npm run test:coverage` verfügbar.
- **Alle Spieldaten hardcoded**: Balance-Anpassungen nur in `src/config/`.
- **Globale Hilfsfunktion**: `$formatNumber` wird in `main.ts` als Vue-Global-Property
  registriert (Quelle: `config/numberFormat.ts`, kein Import nötig in Templates).
- **expedetionStore.ts**: Dateiname enthält einen Treibfehler (fehlendes 'i') — Import-Aliase
  verwenden `useExpeditionStore`.
