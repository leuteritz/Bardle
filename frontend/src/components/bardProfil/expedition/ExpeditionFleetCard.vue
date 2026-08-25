<script setup lang="ts">
/**
 * Eine Galaxie auf dem Fleet-Brett: was sie trägt, gross genug zum Überfliegen.
 *
 * Die Miniatur steht auf GENAU `VOYAGE_RAIL_THUMB_W/H` — `thumbRenderScale()`
 * rechnet gegen diese Breite, jede andere Anzeigegrösse wäre ein zweiter Raster
 * statt eines Cache-Treffers mit der Leiste.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLazyGalaxySnapshot } from '@/composables/ui/useLazyGalaxySnapshot'
import { toRoman } from '@/utils/ui/format'
import {
  EXPEDITION_CHART_MAX,
  VOYAGE_FLEET_CARD_PAD,
  VOYAGE_RAIL_THUMB_H,
  VOYAGE_RAIL_THUMB_W,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyageFleetCard } from '@/types'
import ExpeditionRosterRow from './ExpeditionRosterRow.vue'
import ExpeditionWaitBadge from './ExpeditionWaitBadge.vue'

const props = defineProps<{
  card: VoyageFleetCard
  record: CompletedGalaxyRecord
  now: number
  selected: boolean
}>()
const emit = defineEmits<{ open: [galaxy: number, pinKey: string | null] }>()

const { root, snapshot } = useLazyGalaxySnapshot(() => props.record, 'thumb')

const pad = `${VOYAGE_FLEET_CARD_PAD}px`
const thumbW = `${VOYAGE_RAIL_THUMB_W}px`
const thumbH = `${VOYAGE_RAIL_THUMB_H}px`

const row = computed(() => props.card.row)
const waiting = computed(() => row.value.contracts + row.value.ready)
const chartPct = computed(() => row.value.charted / EXPEDITION_CHART_MAX)

const headAria = computed(
  () =>
    `${row.value.name} — Galaxy ${row.value.galaxy}: ${row.value.contracts} contract(s), ` +
    `${row.value.inField} in the field, ${row.value.ready} ready to collect`,
)
</script>

<template>
  <article
    ref="root"
    class="efc"
    :class="[`efc--${card.state}`, `efc--${row.tier}`, { 'efc--on': selected }]"
    :style="{ '--gx-accent': `rgb(${row.accent})` }"
  >
    <button class="efc-head" :aria-label="headAria" @click="emit('open', card.galaxy, null)">
      <span class="efc-thumb">
        <img v-if="snapshot" :src="snapshot" class="efc-img" alt="" />
        <span v-else class="efc-img efc-img--holding" />

        <!-- Eigene Ebene mit statischem Schein; animiert wird nur ihre Deckkraft.
             Nur der einsammelbare Zustand atmet, und nur EINMAL je Karte. -->
        <span v-if="card.state === 'ready'" class="efc-pulse" aria-hidden="true" />

        <span class="efc-no">{{ toRoman(row.galaxy) }}</span>
        <ExpeditionWaitBadge v-if="waiting" :count="waiting" :ready="card.state === 'ready'" />
        <span v-if="!row.seen" class="efc-new">NEW</span>
      </span>

      <span class="efc-title">
        <span class="efc-name">{{ row.name }}</span>
        <span class="efc-sub">
          <span class="efc-tier">{{ row.tier }}</span>
          <span class="efc-counts">
            <span v-if="row.contracts" class="efc-chip efc-chip--offer">
              <Icon icon="ph:scroll-fill" width="12" height="12" />
              {{ row.contracts }}
            </span>
            <span v-if="row.inField" class="efc-chip efc-chip--field">
              <Icon icon="game-icons:caravel" width="12" height="12" />
              {{ row.inField }}
            </span>
            <span v-if="row.ready" class="efc-chip efc-chip--ready">
              <Icon icon="ph:treasure-chest-fill" width="12" height="12" />
              {{ row.ready }}
            </span>
          </span>
        </span>
        <span class="efc-chart" :title="`Charted ${row.charted} / ${EXPEDITION_CHART_MAX}`">
          <span class="efc-chart-fill" :style="{ transform: `scaleX(${chartPct})` }" />
        </span>
      </span>
    </button>

    <ul class="efc-roster">
      <li v-for="r in card.roster" :key="r.pinKey">
        <ExpeditionRosterRow :row="r" :now="now" @select="emit('open', card.galaxy, $event)" />
      </li>
    </ul>
  </article>
</template>

<style scoped>
.efc {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: v-bind(pad);
  background: #1a1008;
  border: 1px solid #3e200a;
  /* Die linke Kante ist der ZUSTANDSKANAL — dieselbe Sprache wie die Leiste. */
  border-left: 3px solid transparent;
  border-radius: 4px;
}
.efc--ready {
  border-left-color: #64dcb4;
}
.efc--offer {
  border-left-color: #e8c040;
}
.efc--field {
  border-left-color: rgba(230, 220, 196, 0.4);
}
/* Drei Seiten einzeln, nie die Kurzform: sie nähme die linke Kante mit und die
   Auswahl löschte den Zustand, den sie anzeigt. */
.efc--on {
  border-top-color: color-mix(in srgb, var(--gx-accent, #e8c040) 55%, transparent);
  border-right-color: color-mix(in srgb, var(--gx-accent, #e8c040) 55%, transparent);
  border-bottom-color: color-mix(in srgb, var(--gx-accent, #e8c040) 55%, transparent);
}

.efc-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
}
.efc-head:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}

.efc-thumb {
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
.efc--ready .efc-thumb {
  border-color: rgba(100, 220, 180, 0.65);
}
.efc--offer .efc-thumb {
  border-color: rgba(232, 192, 64, 0.6);
}
.efc-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.efc-img--holding {
  background: #0b0806;
}

/* Statischer Schein, animierte Deckkraft — Performance-Regel 11. */
.efc-pulse {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  pointer-events: none;
  box-shadow: inset 0 0 14px 2px rgba(100, 220, 180, 0.5);
  animation: efc-breathe 2.4s ease-in-out infinite;
}
@keyframes efc-breathe {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

.efc-no {
  position: absolute;
  left: 4px;
  top: 1px;
  font-size: 13px;
  line-height: 1.1;
  color: #e8c040;
  text-shadow: 0 1px 3px #000;
}
.efc-new {
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

.efc-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.efc-name {
  font-size: 16px;
  line-height: 1.1;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.efc--on .efc-name {
  color: #fff4dc;
}
.efc-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.efc-tier {
  flex-shrink: 0;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.45);
}
.efc--rare .efc-tier {
  color: #7aa8e0;
}
.efc--epic .efc-tier {
  color: #c090e0;
}
.efc-counts {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.efc-chip {
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
.efc-chip--offer {
  color: #e8c040;
  border-color: rgba(200, 144, 64, 0.5);
}
.efc-chip--field {
  color: rgba(230, 220, 196, 0.7);
}
.efc-chip--ready {
  color: #a0f0d0;
  border-color: rgba(100, 220, 180, 0.5);
}

.efc-chart {
  display: block;
  height: 3px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(200, 164, 90, 0.14);
}
.efc-chart-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8c060);
  transition: transform 0.35s ease;
}

.efc-roster {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (prefers-reduced-motion: reduce) {
  .efc-pulse {
    animation: none;
    opacity: 0.7;
  }
}
</style>
