<script setup lang="ts">
/**
 * Was diese Galaxie gekostet hat — an der Unterkante der Karte, gross genug,
 * um es im Vorbeigehen zu lesen.
 *
 * Drei Zonen, durch Haarlinien getrennt statt in Kästen: die Ernte, die Zeit,
 * der Hafen. Keine Frame-Schleife — alles hängt am Datensatz, der sich nur beim
 * Galaxiewechsel ändert.
 *
 * Die Höhe ist NICHT frei: sie wird der Fit-Box abgezogen, damit kein Hafen
 * darunter gerät. Siehe `VOYAGE_MAP_STATS_BAND_H`.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { durationSegments } from '@/utils/ui/format'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  EXPEDITION_CHART_MAX,
  MS_PER_SECOND,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_MAX_W,
  VOYAGE_MAP_STATS_SCRIM_H,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

const props = defineProps<{
  record: CompletedGalaxyRecord
  /** Schmale Bühne: die Multiplikatoren treten zurück. */
  compact: boolean
  /** Breite Bühne: alle fünf Chips statt der ersten drei. */
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
const scrimH = `${VOYAGE_MAP_STATS_SCRIM_H}px`
const maxW = `${VOYAGE_MAP_STATS_MAX_W}px`

const summary = computed(
  () =>
    `${rescued.value} stars freed, ${lost.value} lost · charted ` +
    `${progress.value.charted} of ${EXPEDITION_CHART_MAX} · ` +
    `${progress.value.runs} voyages sent · freed ${freedOn.value}`,
)
</script>

<template>
  <div class="egsb" :class="{ 'egsb--compact': compact }" :style="{ '--egsb-accent': accent }">
    <span class="egsb-scrim" aria-hidden="true" />

    <div class="egsb-row" role="group" :aria-label="summary">
      <!-- Die Ernte -->
      <section class="egsb-zone egsb-zone--yield">
        <span class="egsb-stat egsb-stat--freed">
          <span class="egsb-stat-n">{{ rescued }}</span>
          <span class="egsb-stat-l">Freed</span>
        </span>
        <span class="egsb-stat egsb-stat--lost" :class="{ 'egsb-stat--nil': !lost }">
          <span class="egsb-stat-n">{{ lost }}</span>
          <span class="egsb-stat-l">Lost</span>
        </span>
      </section>

      <!-- Die Zeit -->
      <section class="egsb-zone egsb-zone--time">
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
        <span class="egsb-freed">
          <Icon icon="lucide:calendar-days" width="13" height="13" class="egsb-ico" />
          {{ freedOn }}
        </span>
      </section>

      <!-- Der Hafen -->
      <section class="egsb-zone egsb-zone--port">
        <span class="egsb-port-top">
          <span class="egsb-chart">
            <span
              v-for="i in EXPEDITION_CHART_MAX"
              :key="i"
              class="egsb-tick"
              :class="{ 'is-on': i <= progress.charted }"
            />
          </span>
          <span class="egsb-read">
            <span class="egsb-read-n">{{ progress.charted }}/{{ EXPEDITION_CHART_MAX }}</span>
            <span class="egsb-read-l">Charted</span>
          </span>
          <span class="egsb-read">
            <span class="egsb-read-n">
              <Icon icon="game-icons:caravel" width="15" height="15" class="egsb-ico" />
              {{ progress.runs }}
            </span>
            <span class="egsb-read-l">Voyages</span>
          </span>
        </span>

        <span v-if="!compact" class="egsb-mods">
          <!-- aria-label und kein title: das Band nimmt keine Zeigerereignisse
               entgegen, ein Tooltip erschiene hier nie. -->
          <span v-for="m in mods" :key="m.key" class="egsb-mod" :aria-label="`${m.hint} ${m.text}`">
            <Icon :icon="m.icon" width="14" height="14" class="egsb-ico" />
            {{ m.text }}
          </span>
        </span>
      </section>
    </div>
  </div>
</template>

<style scoped>
.egsb {
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

/* Der Verlauf spannt voll, der INHALT nicht: auf 4K stuenden fuenf Cluster
   sonst quer ueber zwei Meter Bildschirm. */
.egsb-row {
  position: relative;
  display: flex;
  align-items: stretch;
  height: v-bind(bandH);
  max-width: v-bind(maxW);
  margin: 0 auto;
  padding: 0 14px;
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

.egsb-zone {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 0 16px;
}
/* Haarlinien statt Kästen. */
.egsb-zone + .egsb-zone {
  border-left: 1px solid rgba(122, 78, 32, 0.34);
}
.egsb-zone--yield {
  flex-direction: row;
  align-items: center;
  gap: 20px;
  padding-left: 0;
  flex-shrink: 0;
}
.egsb-zone--port {
  flex: 1;
  padding-right: 0;
}

/* ── Die Ernte ──────────────────────────────────────────────── */
.egsb-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 11px;
  border-left: 2px solid currentColor;
}
.egsb-stat--freed {
  color: #e8c040;
}
.egsb-stat--lost {
  color: #e08a7a;
}
/* Eine leere Kategorie bleibt STEHEN — die Zone darf ihre Form nicht wechseln. */
.egsb-stat--nil {
  opacity: 0.32;
}
.egsb-stat-n {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 0.94;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.egsb-stat-l {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.52);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* ── Die Zeit ───────────────────────────────────────────────── */
.egsb-clock {
  display: flex;
  align-items: baseline;
  gap: 10px;
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
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.egsb-seg-u {
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.egsb-seg--nil .egsb-seg-n {
  color: rgba(236, 224, 192, 0.3);
}
.egsb-freed {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: rgba(200, 184, 144, 0.72);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
}

/* ── Der Hafen ──────────────────────────────────────────────── */
.egsb-port-top {
  display: flex;
  align-items: center;
  gap: 14px;
}
/* Fünf Segmente statt eines Balkens: bei einem Maximum von 5 ist die Stufe
   ablesbar, ein Füllstand nicht. */
.egsb-chart {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.egsb-tick {
  width: 17px;
  height: 7px;
  border-radius: 2px;
  background: rgba(200, 164, 90, 0.16);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55);
  transition: background 0.3s ease;
}
.egsb-tick.is-on {
  background: linear-gradient(to bottom, #f0d080, #c89040);
}
.egsb-read {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}
.egsb-read-n {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.egsb-read-l {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.48);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.egsb-mods {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: nowrap;
  overflow: hidden;
}
.egsb-mod {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 800;
  color: rgba(230, 220, 196, 0.66);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
}

/* Weisses Glyph mit dunklem Hof: die kleinen Zeichen müssen sich auf JEDEM
   Galaxienbild absetzen. Statisch, nie animiert. */
.egsb-ico {
  flex-shrink: 0;
  color: #ffffff;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 1)) drop-shadow(0 1px 2px rgba(0, 0, 0, 1));
}

/* Schmale Bühne: die Zeit rückt zusammen, die Multiplikatoren sind schon weg. */
.egsb--compact .egsb-zone {
  padding: 0 14px;
}
.egsb--compact .egsb-zone--yield {
  gap: 18px;
}
.egsb--compact .egsb-clock {
  gap: 8px;
}
.egsb--compact .egsb-port-top {
  gap: 12px;
}
</style>
