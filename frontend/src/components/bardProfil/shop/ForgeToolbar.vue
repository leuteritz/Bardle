<template>
  <!-- Die Leiste liegt IM FLUSS über dem Baum-Viewport, nicht schwebend darauf.
       Muster und Grund stehen an FORGE_YIELD_PLINTH_HEIGHT_PX: eine schwebende
       Karte lässt den Knoten darunter weiterlaufen, macht ihn aber unklickbar —
       und bei Standardzoom ragt die Bühne weit über ihre Zelle hinaus. -->
  <div class="ft-bar">
    <label class="ft-search" :class="{ 'ft-search--on': searchQuery !== '' }">
      <Icon :icon="FORGE_SEARCH_ICON" width="16" height="16" class="ft-search-ico" />
      <input
        v-model="searchQuery"
        type="search"
        class="ft-search-input"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
      />
      <!-- Wie viele der fünfundvierzig das Wort trifft — die einzige Rückmeldung
           zu einer Suche, die es sonst nirgends gäbe: ein Ring steht am
           markierten Chip, ein Suchwort an nichts. Ohne sie liest sich ein Baum,
           in dem kein Kreis mehr hell ist, wie ein Fehler.

           Sie steht INNEN und nicht als Marke daneben: gemessen drückte eine
           eigene Marke die Chipreihe auf Full HD, WUXGA und 2K in eine zweite
           Zeile und nahm dem Baum darunter bis zu 41px. Hier nimmt sie den Platz
           des Platzhalters, der bei getipptem Wort ohnehin weg ist. -->
      <span
        v-if="searchActive"
        class="ft-search-hits"
        :class="{ 'ft-search-hits--none': hitCount === 0 }"
        :title="hitsTitle"
      >
        {{ hitCount }}
      </span>
      <button
        v-if="searchQuery !== ''"
        class="ft-search-clear"
        aria-label="Clear search"
        @click="searchQuery = ''"
      >
        <Icon :icon="FORGE_SEARCH_CLEAR_ICON" width="14" height="14" />
      </button>
    </label>

    <!-- ══ Ringfilter mit Fortschrittsring ═══════════════════════════
         Der Ring zeigt AUSGEWACHSEN / GESAMT und rührt sich damit nur bei einem
         Kauf. Eine Zahl, die mit den tickenden Chimes hoch- und runterspringt,
         machte die Leiste unruhig, die als einzige immer im Bild steht. -->
    <nav class="ft-chips" aria-label="Filter upgrades by ring">
      <button
        v-for="chip in chips"
        :key="chip.tier"
        class="ft-chip"
        :class="{ 'ft-chip--on': activeTier === chip.tier }"
        :style="{ '--chip-c': chip.accent }"
        :title="chip.title"
        @click="activeTier = chip.tier"
      >
        <svg class="ft-chip-ring" :width="ringBox" :height="ringBox" :viewBox="ringViewBox">
          <circle
            :cx="FORGE_CHIP_RING_R + 2"
            :cy="FORGE_CHIP_RING_R + 2"
            :r="FORGE_CHIP_RING_R"
            fill="none"
            stroke="#2a1a08"
            stroke-width="3"
          />
          <circle
            :cx="FORGE_CHIP_RING_R + 2"
            :cy="FORGE_CHIP_RING_R + 2"
            :r="FORGE_CHIP_RING_R"
            fill="none"
            :stroke="chip.accent"
            stroke-width="3"
            stroke-linecap="round"
            :stroke-dasharray="FORGE_CHIP_RING_CIRCUMFERENCE"
            :stroke-dashoffset="ringOffset(chip.progress)"
            :transform="`rotate(-90 ${FORGE_CHIP_RING_R + 2} ${FORGE_CHIP_RING_R + 2})`"
          />
        </svg>
        <!-- Das Glyph tritt an die Stelle des Namens, sobald die Leiste eng
             wird. Es steht IMMER im Markup und wird nur ein- und ausgeblendet:
             sieben Motive beim Umschalten nachzuladen wäre ein sichtbares
             Aufflackern genau in dem Moment, in dem die Spalte ohnehin
             umbricht. -->
        <Icon
          class="ft-chip-glyph"
          :icon="chip.icon"
          :width="FORGE_CHIP_ICON_SIZE"
          :height="FORGE_CHIP_ICON_SIZE"
        />
        <span class="ft-chip-text">
          <span class="ft-chip-label">{{ chip.label }}</span>
          <span class="ft-chip-sub">{{ chip.sub }}</span>
        </span>
      </button>
    </nav>

    <span class="ft-spacer" />

    <button
      class="ft-buy-all"
      :disabled="readyCount === 0"
      :title="`${FORGE_BUY_ALL_LABEL} · ${readyCount}`"
      @click="handleBuyAll"
    >
      <Icon :icon="FORGE_BUY_ALL_ICON" width="15" height="15" />
      <!-- Der Wortlaut gibt in einer engen Baumspalte nach, die ZAHL nie: sie
           ist die Information, das Blitzsymbol trägt die Bedeutung. -->
      <span class="ft-buy-all-label">{{ FORGE_BUY_ALL_LABEL }} ·</span>
      {{ readyCount }}
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * Suchzeile, Ringfilter und Sammelkauf — die eine Leiste, die im Shop-Tab immer
 * im Bild steht.
 *
 * Sie sitzt über dem BAUM und siebt die Liste in der Spalte daneben; der
 * geteilte Zustand liegt deshalb in `useForgeFilter` (Herleitung dort).
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeUpgrades, forgeUpgradeBucket } from '@/composables/ui/useForgeUpgrades'
import { useForgeFilter } from '@/composables/ui/useForgeFilter'
import type { ForgeUpgradeTier } from '@/types'
import {
  FORGE_UPGRADE_GROUPS,
  FORGE_UPGRADE_FILTER_ALL_LABEL,
  FORGE_UPGRADE_FILTER_ALL_ICON,
  FORGE_CHIP_ICON_SIZE,
  FORGE_CHIP_RING_R,
  FORGE_CHIP_RING_CIRCUMFERENCE,
  FORGE_SEARCH_ICON,
  FORGE_SEARCH_CLEAR_ICON,
  FORGE_SEARCH_PLACEHOLDER,
  FORGE_COUNT_TOKEN,
  FORGE_BUY_ALL_LABEL,
  FORGE_BUY_ALL_ICON,
  FORGE_ENDLESS_SYMBOL,
  FORGE_SIFT_HITS_TITLE,
  FORGE_SIFT_NO_HITS_TITLE,
  FORGE_SIFT_TOTAL_TOKEN,
} from '@/config/constants'

const { upgradeEntries, buyAllReady } = useForgeUpgrades()
const { searchQuery, activeTier, matchesForgeFilter } = useForgeFilter()

// ── Suchzeile ────────────────────────────────────────────────────────────────
const searchPlaceholder = computed(() =>
  FORGE_SEARCH_PLACEHOLDER.replace(FORGE_COUNT_TOKEN, String(upgradeEntries.value.length)),
)

// ── Fortschrittsring ─────────────────────────────────────────────────────────
/** Zwei Pixel Luft an jeder Seite, damit die 3px-Linie nicht am Kasten klebt. */
const ringBox = FORGE_CHIP_RING_R * 2 + 4
const ringViewBox = `0 0 ${ringBox} ${ringBox}`

/**
 * `stroke-dashoffset` auf einer Kreislinie — der von Performance-Regel 11
 * ausdrücklich erlaubte Weg. Ein `conic-gradient` rasterte bei fünf Chips fünf
 * Kästen neu, sobald sich ein Wert ändert.
 */
function ringOffset(progress: number): number {
  return FORGE_CHIP_RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)))
}

// ── Die acht Chips ───────────────────────────────────────────────────────────
interface RingChip {
  tier: ForgeUpgradeTier | 'all'
  label: string
  /** Motiv für die enge Leiste, in der der Name zurücktritt. */
  icon: string
  sub: string
  title: string
  accent: string
  progress: number
}

/**
 * Was ein Chip zählt, hängt am Ring:
 *
 *   • Gedeckelte Ringe (Strahlen, Zweige, Blätter) zeigen AUSGEWACHSEN / GESAMT.
 *     Das ist der Fortschritt, den man dort machen kann, und er ist endlich.
 *   • Ring 4 hat keine Höchststufe — „10 / 10 ausgewachsen" gäbe es dort nie.
 *     Gezählt wird deshalb, wie viele der zehn ÜBERHAUPT stehen, und die
 *     Beschriftung sagt „N ∞" statt „N / 10".
 */
const grownTotal = computed(
  () => upgradeEntries.value.filter((entry) => forgeUpgradeBucket(entry) === 'grown').length,
)

const chips = computed<RingChip[]>(() => {
  const all: RingChip = {
    tier: 'all',
    label: FORGE_UPGRADE_FILTER_ALL_LABEL,
    icon: FORGE_UPGRADE_FILTER_ALL_ICON,
    sub: `${grownTotal.value} grown`,
    title: 'Every ring',
    accent: '#e8c040',
    progress: upgradeEntries.value.length === 0 ? 0 : grownTotal.value / upgradeEntries.value.length,
  }

  const rings = FORGE_UPGRADE_GROUPS.map((group) => {
    const own = upgradeEntries.value.filter((entry) => entry.tier === group.tier)
    const endless = group.tier === 'bough'
    const done = own.filter((entry) =>
      endless ? entry.level > 0 : forgeUpgradeBucket(entry) === 'grown',
    ).length
    return {
      tier: group.tier as ForgeUpgradeTier,
      label: group.shortTitle,
      icon: group.icon,
      sub: endless ? `${done} ${FORGE_ENDLESS_SYMBOL}` : `${done} / ${own.length}`,
      title: `${group.title} — ${group.hint}`,
      accent: group.accent,
      progress: own.length === 0 ? 0 : done / own.length,
    }
  })

  return [all, ...rings]
})

// ── Trefferzähler im Suchfeld ────────────────────────────────────────────────
/**
 * Der Zähler erscheint am SUCHWORT, nicht an jedem Filter: ein gewählter Ring
 * steht am markierten Chip und trägt seine Knotenzahl in dessen Zweitzeile
 * bereits. Die Suche ist der einzige Filter ohne eigene Rückmeldung.
 *
 * Gezählt wird über `matchesForgeFilter` — dieselbe Funktion, nach der der Baum
 * links seine Knoten zurücknimmt und die Liste rechts ihre Zeilen auslässt, und
 * `upgradeEntries` ist dieselbe Menge, aus der beide lesen: die fünf Strahlen
 * und die vierzig Knoten des Katalogs, also genau die Kreise auf der Bühne.
 * Ein Ring bleibt dabei mitgezählt, wenn zusätzlich einer gewählt ist — die
 * Zahl sagt, was der Spieler SIEHT, nicht was das Wort allein träfe.
 */
const searchActive = computed(() => searchQuery.value.trim() !== '')

const hitCount = computed(() => upgradeEntries.value.filter(matchesForgeFilter).length)

const hitsTitle = computed(() =>
  hitCount.value === 0
    ? FORGE_SIFT_NO_HITS_TITLE
    : FORGE_SIFT_HITS_TITLE.replace(FORGE_COUNT_TOKEN, String(hitCount.value)).replace(
        FORGE_SIFT_TOTAL_TOKEN,
        String(upgradeEntries.value.length),
      ),
)

// ── Sammelkauf ───────────────────────────────────────────────────────────────
const readyCount = computed(() => upgradeEntries.value.filter((entry) => entry.canBuy).length)

function handleBuyAll(): void {
  buyAllReady()
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   LEISTE
   Dieselbe Kopfstreifen-Formel wie jeder Modal-Header im Projekt: getöntes
   Braun auf der flachen Basis, unten ein 2px-Saum.
══════════════════════════════════════════════════ */
.ft-bar {
  /* Gemessen wird die BAUMSPALTE, nicht das Fenster — sie ist je nach
     Auflösung 700 bis 3200px breit, während das Fenster nichts darüber sagt.
     Dasselbe Mittel wie bei den ehemaligen Reiter-Labels der Forge-Spalte. */
  container-type: inline-size;
  position: relative;
  z-index: 5;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #16120a;
  border-bottom: 2px solid #3e200a;
}

.ft-spacer {
  flex: 1;
  min-width: 4px;
}

/* ══════════════════════════════════════════════════
   SUCHE
══════════════════════════════════════════════════ */
.ft-search {
  flex: 0 1 236px;
  max-width: 260px;
  min-width: 132px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 4px;
  transition: border-color 0.15s ease;
}

.ft-search:focus-within,
.ft-search--on {
  border-color: #c89040;
}

.ft-search-ico {
  flex-shrink: 0;
  color: #c89040;
}

/* `appearance: none` nimmt Chrome sein eigenes Such-Kreuz weg — daneben stünde
   sonst ein zweites, das nicht zum Rest der Oberfläche passt. */
.ft-search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: #e8dcc0;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  appearance: none;
}

.ft-search-input::-webkit-search-cancel-button {
  display: none;
}

.ft-search-input::placeholder {
  color: rgba(232, 220, 192, 0.35);
}

.ft-search-clear {
  flex-shrink: 0;
  display: flex;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(200, 144, 64, 0.6);
  cursor: pointer;
  transition: color 0.15s ease;
}

.ft-search-clear:hover {
  color: #e8c040;
}

/* ══════════════════════════════════════════════════
   RINGFILTER
   `flex-wrap` als Netz für die schmalste Baumspalte; auf jedem Desktop-Format
   des Projekts steht die Reihe einzeilig.
══════════════════════════════════════════════════ */
.ft-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.ft-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border: 1px solid #3e200a;
  border-radius: 4px;
  background: #111008;
  color: rgba(200, 144, 64, 0.7);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}

.ft-chip:hover:not(.ft-chip--on) {
  border-color: #5c3310;
  color: rgba(232, 192, 64, 0.9);
}

.ft-chip--on {
  background: #1e1408;
  border-color: var(--chip-c, #c89040);
  color: var(--chip-c, #e8c040);
}

.ft-chip-ring {
  flex-shrink: 0;
}

/* Ruhezustand: der Name trägt den Chip, das Glyph ist aus dem Fluss genommen.
   `display: none` statt `opacity: 0` — eine unsichtbare Fläche zählte in der
   Breitenrechnung mit, und genau die ist hier die knappe Grösse. */
.ft-chip-glyph {
  display: none;
  flex-shrink: 0;
  color: var(--chip-c, #c89040);
  opacity: 0.75;
}

.ft-chip--on .ft-chip-glyph {
  opacity: 1;
}

.ft-chip-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1;
  text-align: left;
}

.ft-chip-label {
  font-size: 11.5px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: currentColor;
}

.ft-chip-sub {
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.5);
  font-variant-numeric: tabular-nums;
}

/* Trefferzähler im Feld. Leiser als das Wort daneben — er ist eine Auskunft
   über die Suche, nicht ihr Inhalt. Feste Mindestbreite, damit der Sprung von
   „9" auf „10" das Kreuz rechts nicht verschiebt. */
.ft-search-hits {
  flex-shrink: 0;
  min-width: 15px;
  text-align: right;
  color: rgba(200, 144, 64, 0.75);
  font-size: 11.5px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* Kein Treffer ist kein Fehler, aber eine Sackgasse — und die trägt im Projekt
   durchgehend Rot. */
.ft-search-hits--none {
  color: #cc6050;
}

/* ══════════════════════════════════════════════════
   SAMMELKAUF
   Grün heißt im Projekt durchgehend „kaufbar/aktiv" — hier die gedämpfte
   Fassung davon, weil der Knopf dauerhaft danebensteht und nicht der lauteste
   Ton der Leiste sein darf.
══════════════════════════════════════════════════ */
.ft-buy-all {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border: 1px solid #4a8a28;
  border-radius: 4px;
  background: #16210c;
  color: #9fe062;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 900;
  letter-spacing: 0.04em;
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.ft-buy-all:hover:not(:disabled) {
  border-color: #6ec040;
  background: #1c2e10;
  color: #c0f090;
}

.ft-buy-all:disabled {
  border-color: #3a2a12;
  background: #16120a;
  color: rgba(232, 220, 192, 0.3);
  cursor: not-allowed;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .ft-bar {
    gap: 6px;
    padding: 6px 11px;
  }

  .ft-chip {
    gap: 6px;
    padding: 4px 8px;
  }

  .ft-buy-all {
    padding: 7px 11px;
  }
}

/* Schmale Baumspalte — in dieser Reihenfolge gibt nach, was am wenigsten sagt.
   Die Reihe darf NICHT umbrechen: eine zweite Zeile kostet 29px, und die
   fehlen dem Baum darunter auf genau dem Viewport, auf dem er ohnehin am
   flachsten steht. Gemessen bei Full HD (Baumspalte 663px innen), nicht
   geschätzt.

   1. Die Suche wird kürzer — ihr Platzhalter ist ohnehin nur eine Einladung.
   2. Die Zweitzeile der Chips fällt weg — der Fortschrittsring sagt dasselbe
      ohne Zahl, und die Zahl steht im `title`.
   3. Der Wortlaut des Sammelkaufs fällt weg — Blitz und Zahl bleiben.
   4. Der NAME der Chips fällt weg und ihr Motiv tritt an seine Stelle.

   Stufe 4 kam mit dem sechsten und siebten Ring dazu. Vorher standen sechs
   Chips in der Leiste, jetzt sind es acht, und acht Namen passen auf Full HD
   nicht mehr neben Suche und Sammelkauf. Ein Umbruch wäre die falsche Antwort:
   die zweite Zeile kostet 29px, und die fehlen dem Baum darunter auf genau dem
   Viewport, auf dem er ohnehin am flachsten steht. Ein Glyph in der Grösse
   seines Fortschrittsrings sagt dasselbe auf einem Fünftel der Breite, und der
   Name bleibt im `title`. */
/* Ab hier nimmt die Suche den RESTPLATZ statt einer festen Breite: bei einer
   festen 132px stand „Search 45 upgr" mitten im Wort abgeschnitten da. Der
   Zwischenraum tritt dafür auf eine reine Lücke zurück — er hat nichts zu
   zeigen, das Feld schon. */
@container (max-width: 1080px) {
  .ft-search {
    flex: 1 1 168px;
  }

  .ft-spacer {
    flex: 0 0 6px;
    min-width: 6px;
  }
}

@container (max-width: 900px) {
  .ft-bar {
    gap: 5px;
    padding-left: 10px;
    padding-right: 10px;
  }

  .ft-search {
    flex-basis: 140px;
    min-width: 118px;
    gap: 6px;
    padding: 7px 8px;
  }

  .ft-chips {
    gap: 4px;
  }

  .ft-chip {
    gap: 6px;
    padding: 4px 7px;
  }

  .ft-chip-sub {
    display: none;
  }

  /* Der Ring gibt noch einmal nach — aber nur so weit, dass das Motiv darin
     Platz behält (`FORGE_CHIP_ICON_SIZE` plus Strichstärke). Auf 16px, wie es
     hier vor der Icon-Stufe stand, liefe das Glyph über seine eigene Linie. */
  .ft-chip-ring {
    width: 27px;
    height: 27px;
  }

  .ft-chip-label {
    font-size: 10.5px;
    letter-spacing: 0.02em;
  }

  .ft-buy-all-label {
    display: none;
  }
}

/* Stufe 4 — der Name tritt zurück, und das Motiv rückt IN den Fortschrittsring.
   Die Schwelle liegt über der von Stufe 3, weil die Namen zuerst ausgehen.

   Gemessen (Playwright, Full HD, acht Chips): nebeneinander gestellt brauchen
   Ring und Motiv zusammen 435px und brechen damit um. Ineinander gelegt sind es
   364 — und der Chip liest sich zugleich besser, weil der Ring dann zeigt, was
   er misst, statt danebenzustehen. */
@container (max-width: 1180px) {
  .ft-chip {
    position: relative;
    gap: 0;
    padding: 4px 6px;
  }

  .ft-chip-text {
    display: none;
  }

  /* Der Ring wächst, damit das Motiv hineinpasst — statisch, kein Wert pro
     Frame: das SVG skaliert über seinen viewBox mit. */
  .ft-chip-ring {
    width: 30px;
    height: 30px;
  }

  .ft-chip-glyph {
    display: block;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
}

@container (max-width: 900px) {
  .ft-buy-all {
    gap: 6px;
    padding: 8px 10px;
  }
}
</style>
