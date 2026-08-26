<script setup lang="ts">
/**
 * Was diese Galaxie gekostet hat — an der Unterkante der Karte, über die volle
 * Breite, gross genug, um es im Vorbeigehen zu lesen.
 *
 * Fünf Kennzahlen als gleichberechtigte Spalten, die Multiplikatoren über zwei
 * Spuren. `minmax(min-content, 1fr)` und keine geratenen Gewichte: den Bedarf
 * liest der Browser aus dem Inhalt, verteilt wird nur der Überschuss — auf 4K
 * sind das über 1400 px, und genau die werden zum Abstand zwischen den Zahlen.
 *
 * Der Query-Container sitzt HIER und nicht weiter oben: `.etc-atlas` ist schon
 * einer und misst 1240–2940 px, die Bühne aber nur 628–2176. Ohne eigenen
 * Container skalierte alles gegen den falschen Massstab.
 *
 * Die Höhe ist NICHT frei: sie wird der Fit-Box abgezogen, damit kein Hafen
 * darunter gerät (`VOYAGE_MAP_STATS_BAND_H`) — und weil die Spalten überstehen
 * dürfen, ohne dass ein `scrollHeight` es meldet, deckelt
 * `voyageBandFit.spec.ts` die Schriftgrössen dagegen.
 *
 * Seit dem Fleet-Band misst es 72 statt 96: die 24 px sind an die Kopfleiste
 * gegangen, damit deren Karten Crew-Portraits tragen. Alle Grössen hier sind
 * darauf neu gerechnet, nicht anteilig geschrumpft — die Uhr- und die
 * Kartografie-Spalte tragen drei Elemente und binden dabei.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { durationSegments } from '@/utils/ui/format'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  EXPEDITION_CHART_MAX,
  LANDMARK_FREED_CORE,
  MS_PER_SECOND,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_LABEL_MAX,
  VOYAGE_MAP_STATS_PAD_Y,
  VOYAGE_MAP_STATS_TICK_H_MAX,
  VOYAGE_MAP_STATS_SCRIM_H,
  VOYAGE_MAP_STATS_VALUE_MAX,
  VOYAGE_MAP_STATS_VALUE_MIN,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

const props = defineProps<{
  record: CompletedGalaxyRecord
  /** Schmale Bühne: die Multiplikator-Spalte entfällt. */
  compact: boolean
  /** Breite Bühne: die Spalte trägt auch Hazards und Seats. */
  wide: boolean
}>()

const chartStore = useExpeditionChartStore()

const rescued = computed(() => props.record.attemptResults.filter((r) => r === 'rescued').length)
const lost = computed(() => props.record.attemptResults.filter((r) => r === 'failed').length)

const clock = computed(() => durationSegments(props.record.durationSeconds * MS_PER_SECOND))
const freedOn = computed(() => new Date(props.record.completedAt).toLocaleDateString())

const progress = computed(() => chartStore.progressOf(props.record.galaxy))
const dest = computed(() => destinationFor(props.record))
const accent = computed(() => `rgb(${minimapAccentForTheme(props.record.themeIndex)})`)

/** Die ersten drei tragen die Rechnung, die letzten zwei den Zuschnitt. */
const mods = computed(() => {
  const d = dest.value
  const all = [
    {
      key: 'reward',
      icon: 'game-icons:windchimes',
      text: `×${d.rewardMult.toFixed(2)}`,
      hint: 'Reward',
    },
    {
      key: 'travel',
      icon: 'lucide:hourglass',
      text: `×${d.durationMult.toFixed(2)}`,
      hint: 'Travel time',
    },
    {
      key: 'power',
      icon: 'game-icons:mighty-force',
      text: `×${d.powerMult.toFixed(2)}`,
      hint: 'Crew power needed',
    },
    { key: 'hazard', icon: 'ph:warning-fill', text: `${d.hazardCount}`, hint: 'Hazards' },
    { key: 'seats', icon: 'game-icons:meeple-group', text: `${d.maxRoles}`, hint: 'Seats up to' },
  ]
  return props.wide ? all : all.slice(0, 3)
})

const bandH = `${VOYAGE_MAP_STATS_BAND_H}px`
const padY = `${VOYAGE_MAP_STATS_PAD_Y}px`
const scrimH = `${VOYAGE_MAP_STATS_SCRIM_H}px`
const valueMin = `${VOYAGE_MAP_STATS_VALUE_MIN}px`
const valueMax = `${VOYAGE_MAP_STATS_VALUE_MAX}px`
// Deckel, die `voyageBandFit.spec.ts` in dieselbe Hoehenbilanz einrechnet —
// darum von dort und nicht als Zahl im clamp.
const labelMax = `${VOYAGE_MAP_STATS_LABEL_MAX}px`
const tickHMax = `${VOYAGE_MAP_STATS_TICK_H_MAX}px`
/** Fuenf Kennzahlen je eine Spur, die Multiplikatoren zwei: gestapelt in einer
 *  Spur wurde die Spalte auf QHD 125 px hoch und ragte aus dem Band. */
const gridCols = computed(
  () => `repeat(${props.compact ? 5 : 7}, minmax(min-content, 1fr))`,
)

const summary = computed(
  () =>
    `${rescued.value} stars freed, ${lost.value} lost · charted ` +
    `${progress.value.charted} of ${EXPEDITION_CHART_MAX} · ` +
    `${progress.value.runs} voyages sent · freed ${freedOn.value}`,
)
</script>

<template>
  <div class="egsb" :style="{ '--egsb-accent': accent }">
    <span class="egsb-scrim" aria-hidden="true" />

    <div class="egsb-row" role="group" :aria-label="summary">
      <section class="egsb-col">
        <span class="egsb-val egsb-val--freed">{{ rescued }}</span>
        <span class="egsb-lbl">Freed</span>
      </section>

      <section class="egsb-col" :class="{ 'egsb-col--nil': !lost }">
        <span class="egsb-val egsb-val--lost">{{ lost }}</span>
        <span class="egsb-lbl">Lost</span>
      </section>

      <section class="egsb-col">
        <span class="egsb-clock">
          <span
            v-for="seg in clock"
            :key="seg.unit"
            class="egsb-seg"
            :class="{ 'egsb-seg--nil': seg.leadingZero }"
          >
            <span class="egsb-seg-n">{{ seg.value }}</span>
            <span class="egsb-seg-u">{{ seg.unit }}</span>
          </span>
        </span>
        <span class="egsb-lbl egsb-lbl--date">
          <Icon icon="lucide:calendar-days" class="egsb-ico egsb-ico--date" />
          {{ freedOn }}
        </span>
      </section>

      <section class="egsb-col">
        <span class="egsb-chart" aria-hidden="true">
          <span
            v-for="i in EXPEDITION_CHART_MAX"
            :key="i"
            class="egsb-tick"
            :class="{ 'is-on': i <= progress.charted }"
          />
        </span>
        <span class="egsb-val">{{ progress.charted }}/{{ EXPEDITION_CHART_MAX }}</span>
        <span class="egsb-lbl">Charted</span>
      </section>

      <section class="egsb-col">
        <span class="egsb-val">{{ progress.runs }}</span>
        <span class="egsb-lbl">Voyages</span>
      </section>

      <!-- Die einzige Spalte mit mehreren Zeilen: sie fächert mit der Breite von
           gestapelt zu nebeneinander auf. aria-label und kein title — das Band
           nimmt keine Zeigerereignisse entgegen. -->
      <section v-if="!compact" class="egsb-col egsb-col--mods">
        <span v-for="m in mods" :key="m.key" class="egsb-mod" :aria-label="`${m.hint} ${m.text}`">
          <Icon :icon="m.icon" class="egsb-ico" />
          {{ m.text }}
        </span>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Der Massstab für alle cqw darunter. Eigene Eigenschaften dieses Elements
   dürfen KEIN cqw benutzen — die lösen gegen den nächsten Vorfahr auf. */
.egsb {
  container-type: inline-size;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
}

/* Der Verlauf reicht höher als der Textblock und läuft transparent aus — er
   verdeckt nichts und bleibt deshalb aus der Fit-Box heraus. */
.egsb-scrim {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: v-bind(scrimH);
  background: linear-gradient(
    to top,
    rgba(8, 6, 3, 0.95),
    rgba(8, 6, 3, 0.82) 46%,
    rgba(8, 6, 3, 0)
  );
}

.egsb-row {
  position: relative;
  display: grid;
  grid-template-columns: v-bind(gridCols);
  /* Die Labels liegen auf EINER Grundlinie — die Spalten sind verschieden hoch
     (Segmentleiste gegen Ziffer), zentriert saessen ihre Labels auf vier
     Hoehen. */
  align-items: end;
  height: v-bind(bandH);
  padding: v-bind(padY) clamp(12px, 1.5cqw, 30px);
  border-top: 1px solid rgba(122, 78, 32, 0.42);
}
/* Die Akzentkante der Galaxie — der einzige farbige Strich im Band. */
.egsb-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: -1px;
  width: 34%;
  height: 1px;
  background: linear-gradient(to right, var(--egsb-accent, #c89040), transparent);
}

.egsb-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  min-width: 0;
  padding: 0 clamp(7px, 1.1cqw, 18px);
}
/* Haarlinien statt Kästen. */
.egsb-col + .egsb-col {
  border-left: 1px solid rgba(122, 78, 32, 0.34);
}
/* Eine leere Kategorie bleibt STEHEN — die Reihe darf ihre Form nicht wechseln. */
.egsb-col--nil {
  opacity: 0.32;
}

.egsb-val {
  font-size: clamp(v-bind(valueMin), 5.4cqw, v-bind(valueMax));
  font-weight: 800;
  line-height: 0.94;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
/* Die Legende zur Marke: dieselbe Konstante wie ihr Kernfunke. Weiss ginge
   hier nicht — die Standardfarbe der Zahlen ist #ece0c0, ein weisser Wert waere
   von einer gewoehnlichen Zahl nicht zu unterscheiden. */
.egsb-val--freed {
  color: v-bind(LANDMARK_FREED_CORE);
}
.egsb-val--lost {
  color: #e08a7a;
}

.egsb-lbl {
  font-size: clamp(10px, 1.35cqw, v-bind(labelMax));
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.52);
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
/* Eigener, niedrigerer Deckel: mit der vollen Labelgrösse liefe die Zeit-Spalte
   auf 4K über die nutzbare Bandhöhe. */
.egsb-lbl--date {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(9px, 1.2cqw, v-bind(labelMax));
  letter-spacing: 0.03em;
  text-transform: none;
  color: rgba(200, 184, 144, 0.72);
  font-variant-numeric: tabular-nums;
}

/* ── Die Zeit ───────────────────────────────────────────────── */
.egsb-clock {
  display: flex;
  align-items: baseline;
  gap: clamp(6px, 0.9cqw, 14px);
}
.egsb-seg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  /* Reservierte Breite: eine Zahl, die eine Stelle gewinnt, verschiebt nichts. */
  min-width: 2.2ch;
}
.egsb-seg-n {
  font-size: clamp(16px, 2.2cqw, 21px);
  font-weight: 800;
  line-height: 1;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.egsb-seg-u {
  font-size: clamp(8px, 1cqw, 10px);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.egsb-seg--nil .egsb-seg-n {
  color: rgba(236, 224, 192, 0.3);
}

/* ── Kartografie ────────────────────────────────────────────── */
/* Fünf Segmente statt eines Balkens: bei einem Maximum von 5 ist die Stufe
   ablesbar, ein Füllstand nicht. */
.egsb-chart {
  display: flex;
  gap: 4px;
}
.egsb-tick {
  width: clamp(12px, 1.7cqw, 17px);
  height: clamp(5px, 0.6cqw, v-bind(tickHMax));
  border-radius: 2px;
  background: rgba(200, 164, 90, 0.16);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55);
  transition: background 0.3s ease;
}
.egsb-tick.is-on {
  background: linear-gradient(to bottom, #f0d080, #c89040);
}

/* ── Die Multiplikatoren ────────────────────────────────────── */
.egsb-col--mods {
  grid-column: span 2;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: flex-end;
  justify-content: center;
  gap: 4px clamp(10px, 1.3cqw, 24px);
}
.egsb-mod {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(13px, 1.7cqw, 18px);
  font-weight: 800;
  color: rgba(230, 220, 196, 0.72);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Weisses Glyph mit dunklem Hof: die kleinen Zeichen müssen sich auf JEDEM
   Galaxienbild absetzen. Statisch, nie animiert. Grösse per CSS und nicht als
   Attribut, damit sie mitwächst. */
.egsb-ico {
  flex-shrink: 0;
  width: clamp(12px, 1.6cqw, 17px);
  height: clamp(12px, 1.6cqw, 17px);
  color: #ffffff;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 1)) drop-shadow(0 1px 2px rgba(0, 0, 0, 1));
}
.egsb-ico--date {
  width: clamp(10px, 1.3cqw, 13px);
  height: clamp(10px, 1.3cqw, 13px);
}
</style>
