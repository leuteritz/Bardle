<script setup lang="ts">
/**
 * Die Bühne als Brett: alle befreiten Galaxien nebeneinander, statt einer Karte.
 *
 * Die Antwort auf „wo wartet gerade etwas" — der Zustandsrang ordnet, nicht die
 * Uhr: nach Ablaufzeit sortiert ordnete sich das Raster jede Sekunde unter dem
 * Zeiger um. Dringlichkeit trägt die Zeile.
 *
 * Stille Galaxien bekommen KEINE Karte und kein Bild. Die Markenzahl ist global
 * durch den Ledger-Rang gedeckelt (~10), zwanzig Galaxien wären sonst zu neun
 * Zehnteln leere Kacheln — und zwanzig gleichzeitig sichtbare Miniaturen wären
 * genau der Rasterschauer, den `useLazyGalaxySnapshot` fernhält.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { buildVoyageFleet } from '@/utils/game/voyageFleet'
import { formatMinuteClock, toRoman } from '@/utils/ui/format'
import { VOYAGE_FLEET_CARD_GAP, VOYAGE_FLEET_CARD_MIN_W } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { AvailableExpeditionSlot, VoyageRailRow } from '@/types'
import ExpeditionFleetCard from './ExpeditionFleetCard.vue'

const props = defineProps<{
  rows: VoyageRailRow[]
  records: CompletedGalaxyRecord[]
  selected: number
  now: number
}>()
const emit = defineEmits<{ open: [galaxy: number, pinKey: string | null] }>()

const expeditionStore = useExpeditionStore()

const cardMinW = `${VOYAGE_FLEET_CARD_MIN_W}px`
const cardGap = `${VOYAGE_FLEET_CARD_GAP}px`

/** Zeitfrei — feuert bei Spawn, Absenden, Auflösen, Einsammeln. Nicht im Takt. */
const board = computed(() =>
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

function recordFor(galaxy: number) {
  return props.records.find((r) => r.galaxy === galaxy)
}

const nextOffer = computed(() => formatMinuteClock(expeditionStore.nextSpawnAt - props.now))
</script>

<template>
  <div class="efb rpg-scrollbar">
    <div v-if="board.cards.length" class="efb-grid">
      <template v-for="card in board.cards" :key="card.galaxy">
        <ExpeditionFleetCard
          v-if="recordFor(card.galaxy)"
          :card="card"
          :record="recordFor(card.galaxy)!"
          :now="now"
          :selected="selected === card.galaxy"
          @open="(galaxy, pinKey) => emit('open', galaxy, pinKey)"
        />
      </template>
    </div>

    <p v-else class="efb-empty">
      <Icon icon="lucide:timer" width="16" height="16" />
      No contracts bound anywhere — the next one lands in {{ nextOffer }}
    </p>

    <section v-if="board.quiet.length" class="efb-quiet">
      <h4 class="efb-quiet-h">{{ board.quiet.length }} quiet reaches</h4>
      <ul class="efb-quiet-list">
        <li v-for="row in board.quiet" :key="row.galaxy">
          <button
            class="efb-quiet-chip"
            :class="`efb-quiet-chip--${row.tier}`"
            :title="`${row.name} — Galaxy ${row.galaxy}`"
            :aria-label="`${row.name}, Galaxy ${row.galaxy}, nothing bound here`"
            @click="emit('open', row.galaxy, null)"
          >
            <span class="efb-quiet-no">{{ toRoman(row.galaxy) }}</span>
            {{ row.name }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.efb {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: clip;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* `auto-fill` und nicht `auto-fit`: auf 4K zöge `auto-fit` vier Karten über acht
   Spuren auseinander. Leere Spuren bleiben stehen, die Karten behalten ihr Mass. */
.efb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(v-bind(cardMinW), 1fr));
  gap: v-bind(cardGap);
  align-content: start;
  align-items: start;
  justify-content: start;
}

.efb-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 14px;
  background: #1a1008;
  border: 1px solid #3e200a;
  border-radius: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.62);
  font-variant-numeric: tabular-nums;
}

.efb-quiet {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px 10px;
  background: #16120a;
  border: 1px solid #2c1a08;
  border-radius: 4px;
}
.efb-quiet-h {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.4);
}
.efb-quiet-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.efb-quiet-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 220px;
  padding: 0 7px;
  height: 22px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  font-size: 11.5px;
  color: rgba(230, 220, 196, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition:
    background 0.13s,
    color 0.13s;
}
.efb-quiet-chip:hover {
  background: #241f14;
  color: #e8dcc0;
}
.efb-quiet-chip:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}
.efb-quiet-no {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: rgba(200, 144, 64, 0.5);
}
.efb-quiet-chip--rare .efb-quiet-no {
  color: #7aa8e0;
}
.efb-quiet-chip--epic .efb-quiet-no {
  color: #c090e0;
}
</style>
