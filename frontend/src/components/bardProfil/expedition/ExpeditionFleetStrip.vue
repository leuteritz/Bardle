<script setup lang="ts">
/**
 * Die zweite Zeile der Kopfleiste: wo gerade etwas liegt, ohne eine Geste.
 *
 * Eine Pille je Galaxie MIT Inhalt, im Rang der Leistenzeile. Ein Klick springt
 * hin und wählt die Marke, die eine Handlung verlangt — das ist die erste
 * Roster-Zeile, weil der Builder einsammelbar vor ausliegend vor unterwegs legt.
 *
 * FESTE Höhe, auch leer: `.etc-bar` ist eine auto-Grid-Zeile, eine wachsende
 * Kopfleiste ändert die Bühnenhöhe und malt die Galaxie neu — bei einer Höhe an
 * der Vertragszahl bei jedem Spawn.
 *
 * Kein Standbild: der Streifen zöge Rasterläufe in den Kopf, jede Pille eine.
 * Ziffer und Name tragen das Wiedererkennen.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { buildVoyageFleet } from '@/utils/game/voyageFleet'
import { formatMinuteClock, toRoman } from '@/utils/ui/format'
import {
  VOYAGE_FLEET_PILL_GAP,
  VOYAGE_FLEET_PILL_H,
  VOYAGE_FLEET_PILL_MIN_W,
  VOYAGE_FLEET_STRIP_H,
} from '@/config/constants'
import type { AvailableExpeditionSlot, VoyageRailRow } from '@/types'

const props = defineProps<{ rows: VoyageRailRow[]; selected: number; now: number }>()
const emit = defineEmits<{ open: [galaxy: number, pinKey: string | null] }>()

const expeditionStore = useExpeditionStore()

const stripH = `${VOYAGE_FLEET_STRIP_H}px`
const pillMinW = `${VOYAGE_FLEET_PILL_MIN_W}px`
const pillGap = `${VOYAGE_FLEET_PILL_GAP}px`
const pillH = `${VOYAGE_FLEET_PILL_H}px`

/** Zeitfrei — feuert bei Spawn, Absenden, Auflösen, Einsammeln. Nicht im Takt. */
const pills = computed(() =>
  buildVoyageFleet(
    props.rows,
    expeditionStore.availableExpeditions,
    expeditionStore.activeExpeditions,
    {
      projectedReward: expeditionStore.projectedRewardFor,
      seatsFilled: (offer: AvailableExpeditionSlot) =>
        expeditionStore.crewFor(offer).filter(Boolean).length,
    },
  ),
)

const nextOffer = computed(() => formatMinuteClock(expeditionStore.nextSpawnAt - props.now))

function ariaFor(row: VoyageRailRow): string {
  return (
    `${row.name}, Galaxy ${row.galaxy}: ${row.contracts} contract(s), ` +
    `${row.inField} in the field, ${row.ready} ready to collect`
  )
}
</script>

<template>
  <div class="efs rpg-scrollbar">
    <template v-if="pills.length">
      <button
        v-for="pill in pills"
        :key="pill.galaxy"
        class="efs-pill"
        :class="[
          `efs-pill--${pill.state}`,
          `efs-pill--${pill.row.tier}`,
          { 'efs-pill--on': selected === pill.galaxy },
        ]"
        :style="{ '--gx-accent': `rgb(${pill.row.accent})` }"
        :aria-label="ariaFor(pill.row)"
        :title="ariaFor(pill.row)"
        @click="emit('open', pill.galaxy, pill.roster[0]?.pinKey ?? null)"
      >
        <!-- Eigene Ebene mit statischem Schein; animiert wird nur ihre Deckkraft.
             Nur der einsammelbare Zustand atmet. -->
        <span v-if="pill.state === 'ready'" class="efs-pulse" aria-hidden="true" />
        <span class="efs-top">
          <span class="efs-no">{{ toRoman(pill.galaxy) }}</span>
          <span class="efs-counts">
            <span v-if="pill.row.contracts" class="efs-c efs-c--offer">
              <Icon icon="ph:scroll-fill" width="10" height="10" />
              {{ pill.row.contracts }}
            </span>
            <span v-if="pill.row.inField" class="efs-c efs-c--field">
              <Icon icon="game-icons:caravel" width="10" height="10" />
              {{ pill.row.inField }}
            </span>
            <span v-if="pill.row.ready" class="efs-c efs-c--ready">
              <Icon icon="ph:treasure-chest-fill" width="10" height="10" />
              {{ pill.row.ready }}
            </span>
          </span>
        </span>
        <span class="efs-name">{{ pill.row.name }}</span>
      </button>
    </template>

    <p v-else class="efs-empty">
      <Icon icon="lucide:timer" width="13" height="13" />
      No contracts bound anywhere — the next one lands in {{ nextOffer }}
    </p>
  </div>
</template>

<style scoped>
.efs {
  display: flex;
  align-items: center;
  gap: v-bind(pillGap);
  height: v-bind(stripH);
  min-height: v-bind(stripH);
  padding: 0 14px;
  border-top: 1px solid #402a12;
  background: #17100a;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.efs::-webkit-scrollbar {
  height: 4px;
}
.efs::-webkit-scrollbar-track {
  background: #111;
}
.efs::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.efs-pill {
  position: relative;
  flex: 0 1 auto;
  min-width: v-bind(pillMinW);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  height: v-bind(pillH);
  padding: 4px 6px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  /* Die linke Kante ist der ZUSTANDSKANAL — dieselbe Sprache wie in der Leiste. */
  border-left: 3px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.13s,
    border-color 0.13s;
}
.efs-pill--ready {
  border-left-color: #64dcb4;
}
.efs-pill--offer {
  border-left-color: #e8c040;
}
.efs-pill--field {
  border-left-color: rgba(230, 220, 196, 0.4);
}
.efs-pill:hover {
  background: #241f14;
}
.efs-pill:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}
/* Drei Seiten einzeln, nie die Kurzform: sie nähme die linke Kante mit und die
   Auswahl löschte den Zustand, den sie anzeigt. */
.efs-pill--on {
  background: color-mix(in srgb, var(--gx-accent, #e8c040) 20%, #12100a);
  border-top-color: color-mix(in srgb, var(--gx-accent, #e8c040) 55%, transparent);
  border-right-color: color-mix(in srgb, var(--gx-accent, #e8c040) 55%, transparent);
  border-bottom-color: color-mix(in srgb, var(--gx-accent, #e8c040) 55%, transparent);
}

/* Statischer Schein, animierte Deckkraft — Performance-Regel 11. */
.efs-pulse {
  position: absolute;
  inset: -1px;
  border-radius: 4px;
  pointer-events: none;
  box-shadow: inset 0 0 10px 1px rgba(100, 220, 180, 0.45);
  animation: efs-breathe 2.4s ease-in-out infinite;
}
@keyframes efs-breathe {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

/* Zeile 1 hat kein Ventil: Ziffer und Zähler schrumpfen beide nicht. */
.efs-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  overflow: hidden;
}
.efs-no {
  flex-shrink: 0;
  font-size: 13px;
  line-height: 1;
  color: #e8c040;
}
.efs-pill--rare .efs-no {
  color: #7aa8e0;
}
.efs-pill--epic .efs-no {
  color: #c090e0;
}

.efs-name {
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.15;
  font-weight: 700;
  color: rgba(230, 220, 196, 0.82);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.efs-pill--on .efs-name {
  color: #fff4dc;
}

.efs-counts {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  font-variant-numeric: tabular-nums;
}
.efs-c {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}
.efs-c--offer {
  color: #e8c040;
}
.efs-c--field {
  color: rgba(230, 220, 196, 0.65);
}
.efs-c--ready {
  color: #a0f0d0;
}

.efs-empty {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.45);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .efs-pulse {
    animation: none;
    opacity: 0.7;
  }
}
</style>
