<script setup lang="ts">
/**
 * Eine befreite Galaxie in der Seitenleiste.
 *
 * Das Bild IST das Wiedererkennen — eine befreite Galaxie hat keinen Namen,
 * den man vor ihrer Form behält.
 *
 * **Die Zeile hat einen Zustand, und der ist der Kanal, den man überfliegt.**
 * Vorher stand alles, was eine Galaxie gerade trägt, in drei 10-px-Chips am Fuss
 * der Zeile — gleiche Farbe, gleiche Grösse, gleiche Stelle wie der Rest. Bei
 * zwanzig Galaxien musste man die Spalte LESEN. Jetzt tragen zwei Kanäle die
 * Auskunft, bevor man liest: die farbige Kante links und ein Zähler AUF der
 * Miniatur. Die Chips darunter bleiben für die Aufschlüsselung.
 *
 * Der Rang ist eindeutig: einsammelbar schlägt ausliegend schlägt unterwegs
 * schlägt still. Nur der einsammelbare Zustand atmet — pulste jede Zeile, die
 * irgendetwas trägt, flimmerte bei zwanzig Galaxien die halbe Spalte.
 *
 * `renderGalaxyThumb` und nicht das volle Standbild: die Zeile zeigt 96×60 px,
 * ein 640×400-PNG hier zu dekodieren kostete gemessen 241 ms beim
 * Wiedereinblenden des Reiters. Und es wird erst gezeichnet, wenn die Zeile ins
 * Sichtfeld kommt — der modulweite Cache macht es danach einmal je Sitzung.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLazyGalaxySnapshot } from '@/composables/ui/useLazyGalaxySnapshot'
import { toRoman } from '@/utils/ui/format'
import { voyageGalaxyState } from '@/utils/game/voyageFleet'
import {
  EXPEDITION_CHART_MAX,
  VOYAGE_RAIL_ROW_GAP,
  VOYAGE_RAIL_ROW_PAD_L,
  VOYAGE_RAIL_ROW_PAD_R,
  VOYAGE_RAIL_ROW_PAD_Y,
  VOYAGE_RAIL_STATE_BAR_PX,
  VOYAGE_RAIL_THUMB_H,
  VOYAGE_RAIL_THUMB_W,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyageRailRow } from '@/types'
import ExpeditionWaitBadge from './ExpeditionWaitBadge.vue'

const props = defineProps<{
  row: VoyageRailRow
  record: CompletedGalaxyRecord
  selected: boolean
}>()
const emit = defineEmits<{ select: [number] }>()

const { root, snapshot } = useLazyGalaxySnapshot(() => props.record, 'thumb')

const thumbW = `${VOYAGE_RAIL_THUMB_W}px`
const thumbH = `${VOYAGE_RAIL_THUMB_H}px`
const rowPad = `${VOYAGE_RAIL_ROW_PAD_Y}px ${VOYAGE_RAIL_ROW_PAD_R}px ${VOYAGE_RAIL_ROW_PAD_Y}px ${VOYAGE_RAIL_ROW_PAD_L}px`
const rowGap = `${VOYAGE_RAIL_ROW_GAP}px`
const stateBar = `${VOYAGE_RAIL_STATE_BAR_PX}px`

const chartPct = computed(() => props.row.charted / EXPEDITION_CHART_MAX)
/** Was auf den Spieler wartet — die eine Zahl, die der Zähler trägt. */
const waiting = computed(() => props.row.contracts + props.row.ready)

/** Einsammelbar > ausliegend > unterwegs > still. Ein Rang, eine Farbe —
 *  dieselbe Quelle, aus der auch das Fleet-Brett seinen Zustand zieht. */
const state = computed(() => voyageGalaxyState(props.row))

const title = computed(
  () =>
    `${props.row.name} — Galaxy ${props.row.galaxy} · ${props.row.contracts} contract(s), ` +
    `${props.row.inField} in the field, ${props.row.ready} ready to collect`,
)
</script>

<template>
  <button
    ref="root"
    class="egr"
    :class="[`egr--${row.tier}`, `egr--st-${state}`, { 'egr--on': selected }]"
    :data-galaxy="row.galaxy"
    :style="{ '--gx-accent': `rgb(${row.accent})` }"
    :aria-pressed="selected"
    :aria-label="title"
    :title="title"
    @click="emit('select', row.galaxy)"
  >
    <span class="egr-thumb">
      <img v-if="snapshot" :src="snapshot" class="egr-img" alt="" />
      <span v-else class="egr-img egr-img--holding" />

      <!-- Eigene Ebene mit statischem Schein; animiert wird nur ihre Deckkraft.
           Nur der einsammelbare Zustand atmet. -->
      <span v-if="state === 'ready'" class="egr-pulse" aria-hidden="true" />

      <span class="egr-no">{{ toRoman(row.galaxy) }}</span>
      <ExpeditionWaitBadge v-if="waiting" :count="waiting" :ready="state === 'ready'" />
      <span v-if="!row.seen" class="egr-new">NEW</span>
    </span>

    <span class="egr-body">
      <span class="egr-name">{{ row.name }}</span>
      <span class="egr-meta">
        <span v-if="row.contracts" class="egr-chip egr-chip--offer">
          <Icon icon="ph:scroll-fill" width="12" height="12" />
          {{ row.contracts }}
        </span>
        <span v-if="row.inField" class="egr-chip egr-chip--field">
          <Icon icon="game-icons:caravel" width="12" height="12" />
          {{ row.inField }}
        </span>
        <span v-if="row.ready" class="egr-chip egr-chip--ready">
          <Icon icon="ph:treasure-chest-fill" width="12" height="12" />
          {{ row.ready }}
        </span>
        <span class="egr-tier">{{ row.tier }}</span>
      </span>
      <span class="egr-chart" :title="`Charted ${row.charted} / ${EXPEDITION_CHART_MAX}`">
        <span class="egr-chart-fill" :style="{ transform: `scaleX(${chartPct})` }" />
      </span>
    </span>
  </button>
</template>

<style scoped>
/* Eine Karte im Rezept der Forge-Liste (`.fut-row`): eigene Fläche, eigener
   Rahmen, Radius 4. Randlos stand die Zeile zuvor auf der Leistenfläche und
   trennte sich nur durch ihren Hover. */
.egr {
  position: relative;
  display: flex;
  align-items: center;
  gap: v-bind(rowGap);
  width: 100%;
  /* Der Rollkasten ist eine Flex-Spalte: ohne das stauchen zwölf Zeilen sich
     gegenseitig, statt zu rollen — auf Full HD gemessen 45,2 px statt 76, und
     die Miniatur, die das Wiedererkennen TRÄGT, war darin unkenntlich. */
  flex-shrink: 0;
  /* Hergeleitet, nicht von `.fut-row` geliehen — siehe die Rechnung an
     VOYAGE_RAIL_ROW_PAD_L in `constants/economy.ts`. */
  padding: v-bind(rowPad);
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease;
}

/* Der ZUSTANDSKANAL, und zwar als eigene Ebene statt als `border-left`. Damit
   ist er vom Rahmen entkoppelt, den Hover und Auswahl färben — die Kurzform
   `border-color` löschte sonst genau die Auskunft, neben der sie steht, und
   `.egr--on` musste drei Seiten einzeln setzen. Dieselbe Trennung führt
   `.fut-row::before`. */
.egr::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: v-bind(stateBar);
  background: var(--st-c, transparent);
  pointer-events: none;
  z-index: 1;
}
.egr--st-ready {
  --st-c: #64dcb4;
}
.egr--st-offer {
  --st-c: #e8c040;
}
.egr--st-field {
  --st-c: rgba(230, 220, 196, 0.4);
}
.egr:hover {
  border-color: #7a4e20;
}
.egr--on {
  background: color-mix(in srgb, var(--gx-accent, #e8c040) 20%, #1c1c18);
  border-color: var(--gx-accent, #e8c040);
}
.egr:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}
/* Still heisst zurücktreten — die Miniatur bleibt hell, sie IST das Wiedererkennen. */
.egr--st-quiet .egr-name,
.egr--st-quiet .egr-tier {
  color: rgba(200, 144, 64, 0.42);
}

.egr-thumb {
  position: relative;
  flex-shrink: 0;
  display: block;
  width: v-bind(thumbW);
  height: v-bind(thumbH);
  overflow: hidden;
  border: 1px solid #6b5330;
  border-radius: 3px;
  background: #0b0806;
}
.egr--st-ready .egr-thumb {
  border-color: rgba(100, 220, 180, 0.65);
}
.egr--st-offer .egr-thumb {
  border-color: rgba(232, 192, 64, 0.6);
}
.egr-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.egr-img--holding {
  background: #0b0806;
}

/* Statischer Schein, animierte Deckkraft — Performance-Regel 11. */
.egr-pulse {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  pointer-events: none;
  box-shadow: inset 0 0 14px 2px rgba(100, 220, 180, 0.5);
  animation: egr-breathe 2.4s ease-in-out infinite;
}
@keyframes egr-breathe {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

.egr-no {
  position: absolute;
  left: 4px;
  top: 1px;
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 13px;
  line-height: 1.1;
  color: #e8c040;
  text-shadow: 0 1px 3px #000;
}

.egr-new {
  position: absolute;
  left: 3px;
  bottom: 2px;
  padding: 0 3px;
  border-radius: 2px;
  background: #52b830;
  color: #0b0806;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.egr-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.egr-name {
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 14px;
  line-height: 1.1;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.egr--on .egr-name {
  color: #fff4dc;
}

.egr-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
}
.egr-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 4px;
  border-radius: 3px;
  border: 1px solid #3e200a;
  font-size: 10.5px;
  font-weight: 800;
  line-height: 1.5;
}
.egr-chip--offer {
  color: #e8c040;
  border-color: rgba(200, 144, 64, 0.5);
}
.egr-chip--field {
  color: rgba(230, 220, 196, 0.7);
}
.egr-chip--ready {
  color: #a0f0d0;
  border-color: rgba(100, 220, 180, 0.5);
}
.egr-tier {
  margin-left: auto;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.4);
}
.egr--rare .egr-tier {
  color: #7aa8e0;
}
.egr--epic .egr-tier {
  color: #c090e0;
}

.egr-chart {
  display: block;
  height: 3px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(200, 164, 90, 0.14);
}
.egr-chart-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8c060);
  transition: transform 0.35s ease;
}

@media (prefers-reduced-motion: reduce) {
  .egr-pulse {
    animation: none;
    opacity: 0.7;
  }
}
</style>
