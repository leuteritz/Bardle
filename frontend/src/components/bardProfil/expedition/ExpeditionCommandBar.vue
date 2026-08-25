<script setup lang="ts">
/**
 * Die Kopfleiste des Reiters — EIN durchgehendes Band, keine zwei Zeilen mehr.
 * Ihre Höhe ist GESETZT (`VOYAGE_COMMAND_BAR_H`): `.etc-bar` ist eine auto-Grid-
 * Zeile, was sie nimmt, nimmt sie der Bühne. Die Unterkante IST der Rangbalken.
 *
 * Drei Zonen aus einem Budget: Rangsäule · Kartenspur · Aktionssäule. Die Spur
 * trägt eine Karte je EXPEDITION — was läuft, mit wem, und was startbereit ist.
 * Die Zahlen-Ablesungen davor („In field 2/3", „Contracts 4/5") sind ersatzlos
 * entfallen: beides zählt man an den Karten ab.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useNotifyBadgeCount } from '@/composables/ui/useNotifyBadges'
import { buildVoyageFleetCards } from '@/utils/game/voyageFleet'
import { formatMinuteClock, toRoman } from '@/utils/ui/format'
import {
  VOYAGE_COMMAND_BAR_H,
  VOYAGE_FLEET_ASIDE_W,
  VOYAGE_FLEET_BAND_GAP,
  VOYAGE_FLEET_BAND_PAD_X,
  VOYAGE_FLEET_RANK_W,
} from '@/config/constants'
import type { VoyageRailRow } from '@/types'
import ExpeditionFleetLane from './ExpeditionFleetLane.vue'

const props = defineProps<{
  now: number
  collectFlashing: boolean
  chartFocus: boolean
  selectedKey: string | null
  rows: VoyageRailRow[]
}>()
const emit = defineEmits<{
  'collect-all': []
  'send-all': []
  'toggle-focus': []
  open: [galaxy: number, pinKey: string | null]
}>()

const expeditionStore = useExpeditionStore()
const isDev = import.meta.env.DEV

const mainH = `${VOYAGE_COMMAND_BAR_H}px`
const rankW = `${VOYAGE_FLEET_RANK_W}px`
const asideW = `${VOYAGE_FLEET_ASIDE_W}px`
const bandPadX = `${VOYAGE_FLEET_BAND_PAD_X}px`
const bandGap = `${VOYAGE_FLEET_BAND_GAP}px`

const readyCount = useNotifyBadgeCount('expedition')

const rank = computed(() => expeditionStore.ledgerRank)
const nextRank = computed(() => expeditionStore.nextLedgerRank)

/** Fortschritt im LAUFENDEN Rangband, damit der Balken nie bei null neu ansetzt. */
const rankProgress = computed(() => {
  const next = nextRank.value
  if (!next) return 1
  const span = next.required - rank.value.required
  if (span <= 0) return 1
  return Math.min(1, (expeditionStore.ledgerCompleted - rank.value.required) / span)
})

/**
 * Was der nächste Rang aushändigt. Steht als Liste im Bild und NICHT nur im
 * `title` — es ist die einzige Stelle im Spiel, die es sagt, und hover-only wäre
 * sie für Tastatur unerreichbar.
 */
const nextRankRewards = computed(() => {
  const next = nextRank.value
  if (!next) return []
  const parts: string[] = []
  if (next.activeSlots > rank.value.activeSlots) {
    parts.push(`+${next.activeSlots - rank.value.activeSlots} field slot`)
  }
  if (next.offerSlots > rank.value.offerSlots) {
    parts.push(`+${next.offerSlots - rank.value.offerSlots} contract`)
  }
  const odds = Math.round((next.chanceBonus - rank.value.chanceBonus) * 100)
  if (odds > 0) parts.push(`+${odds}% odds`)
  return parts
})

/** Der Rangname ist aus dem Bild gefallen — hier bleibt er lesbar. */
const rankTitle = computed(() => {
  const next = nextRank.value
  if (!next) {
    return `${rank.value.name} — highest rank reached, ${expeditionStore.ledgerCompleted} runs`
  }
  return (
    `${rank.value.name} — ${expeditionStore.ledgerCompleted} of ${next.required} runs ` +
    `toward Rank ${toRoman(next.tier)}: ${nextRankRewards.value.join(' · ')}`
  )
})

const timeUntilNextSpawn = computed(() => Math.max(0, expeditionStore.nextSpawnAt - props.now))
const offersFull = computed(
  () => expeditionStore.availableExpeditions.length >= expeditionStore.maxAvailableOffers,
)

const canSendAll = computed(
  () =>
    expeditionStore.canStartExpedition &&
    expeditionStore.availableExpeditions.some((o) => expeditionStore.crewFor(o).every((c) => !!c)),
)

/** ZEITFREI — die Uhr sieht nur die Karte, nie ihr Platz. */
const cards = computed(() =>
  buildVoyageFleetCards(
    props.rows,
    expeditionStore.availableExpeditions,
    expeditionStore.activeExpeditions,
    {
      projectedReward: expeditionStore.projectedRewardFor,
      seatsOf: (offer) => expeditionStore.crewFor(offer),
    },
  ),
)
</script>

<template>
  <header class="ecb">
    <div class="ecb-main">
      <div class="ecb-rank" role="group" :aria-label="rankTitle" :title="rankTitle">
        <Icon :icon="rank.icon" width="24" height="24" class="ecb-rank-ico" />
        <span class="ecb-rank-name">Rank {{ toRoman(rank.tier) }}</span>
        <span v-if="nextRank" class="ecb-rank-goal">
          {{ expeditionStore.ledgerCompleted }}/{{ nextRank.required }}
        </span>
        <span v-else class="ecb-rank-goal">{{ expeditionStore.ledgerCompleted }} runs</span>
        <span v-if="nextRank" class="ecb-rank-rewards">
          <span v-for="part in nextRankRewards" :key="part" class="ecb-rank-reward">{{ part }}</span>
        </span>
        <span v-else class="ecb-rank-rewards">
          <span class="ecb-rank-reward ecb-rank-reward--max">max rank</span>
        </span>
      </div>

      <ExpeditionFleetLane
        :cards="cards"
        :selected-key="selectedKey"
        :now="now"
        @open="(galaxy, pinKey) => emit('open', galaxy, pinKey)"
      />

      <div class="ecb-aside">
        <!-- Reservierte Zahlenbreite: sonst wandert die Säule, sobald 1:40 auf
             0:59 fällt. -->
        <div class="ecb-next" :class="{ 'is-full': offersFull }">
          <Icon :icon="offersFull ? 'ph:scroll-fill' : 'lucide:timer'" class="ecb-next-ico" />
          <span class="ecb-next-body">
            <span class="ecb-next-value">{{
              offersFull ? 'FULL' : formatMinuteClock(timeUntilNextSpawn)
            }}</span>
            <span class="ecb-next-label">Next contract</span>
          </span>
        </div>

        <div class="ecb-acts">
          <button
            class="ecb-act ecb-act--send"
            :class="{ 'is-muted': !canSendAll }"
            :disabled="!canSendAll"
            title="Send every crewed contract"
            aria-label="Send every crewed contract"
            @click.stop="emit('send-all')"
          >
            <Icon icon="ph:tent-fill" width="22" height="22" />
          </button>

          <button
            class="ecb-act ecb-act--collect"
            :class="{
              'is-ready': readyCount > 0,
              'is-flashing': collectFlashing,
              'is-muted': readyCount === 0,
            }"
            :disabled="readyCount === 0"
            title="Collect all completed expeditions"
            aria-label="Collect all completed expeditions"
            @click.stop="emit('collect-all')"
          >
            <Icon icon="ph:treasure-chest-fill" width="22" height="22" />
            <RpgNotifyBadge :count="readyCount" label="Expedition rewards ready" />
          </button>

          <!-- Der eine Griff, der beide Ränder wegklappt. Escape holt sie zurück. -->
          <button
            class="ecb-act ecb-act--focus"
            :class="{ 'is-on': chartFocus }"
            :aria-pressed="chartFocus"
            :title="chartFocus ? 'Show rail and details' : 'Focus the chart'"
            :aria-label="chartFocus ? 'Show rail and details' : 'Focus the chart'"
            @click.stop="emit('toggle-focus')"
          >
            <Icon :icon="chartFocus ? 'lucide:minimize' : 'lucide:maximize'" width="22" height="22" />
          </button>

          <button
            v-if="isDev"
            class="ecb-act ecb-act--admin"
            title="Force spawn expedition (dev)"
            aria-label="Force spawn expedition (dev)"
            @click.stop="expeditionStore.forceSpawn()"
          >
            <Icon icon="ph:lightning-fill" width="20" height="20" />
          </button>
        </div>
      </div>
    </div>

    <div class="ecb-progress">
      <div class="ecb-progress-fill" :style="{ transform: `scaleX(${rankProgress})` }" />
    </div>
  </header>
</template>

<style scoped>
.ecb {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1b120a 0%, #16100a 100%);
  border-bottom: 3px solid #5c3310;
}
/* Gesetzte Höhe, kein Padding-Ergebnis — die Aussenhöhe ist gebunden.
   KEIN overflow: die Notify-Plakette steht über der Buttonkante. */
.ecb-main {
  display: flex;
  align-items: center;
  gap: v-bind(bandGap);
  height: v-bind(mainH);
  padding: 0 v-bind(bandPadX);
}

/* ── Rangsäule ──────────────────────────────────────────────── */
.ecb-rank {
  flex: 0 0 v-bind(rankW);
  width: v-bind(rankW);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 0;
}
.ecb-rank-ico {
  flex-shrink: 0;
  color: #e8c040;
  filter: drop-shadow(0 0 10px rgba(232, 192, 64, 0.35));
}
.ecb-rank-name {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e8c040;
  line-height: 1;
  white-space: nowrap;
}
.ecb-rank-goal {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: rgba(200, 144, 64, 0.62);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ecb-rank-rewards {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ecb-rank-reward {
  font-size: 9px;
  font-weight: 800;
  line-height: 1.15;
  color: #7ad0a0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecb-rank-reward--max {
  color: rgba(200, 144, 64, 0.55);
}

/* ── Aktionssäule ───────────────────────────────────────────── */
.ecb-aside {
  flex: 0 0 v-bind(asideW);
  width: v-bind(asideW);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.ecb-next {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  background: #16140e;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.ecb-next-ico {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: rgba(200, 144, 64, 0.7);
}
.ecb-next.is-full .ecb-next-ico {
  color: #e8c040;
}
.ecb-next-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ecb-next-value {
  /* Reserviert, damit die Säule nicht wandert. */
  min-width: 5ch;
  font-size: 19px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}
.ecb-next.is-full .ecb-next-value {
  color: #e8c040;
}
.ecb-next-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
  white-space: nowrap;
}

.ecb-acts {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ecb-act {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  overflow: visible;
  transition:
    background 0.16s ease,
    opacity 0.16s ease;
}
.ecb-act:active {
  transform: scale(0.96);
}
.ecb-act:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}
.ecb-act.is-muted {
  opacity: 0.36;
  cursor: not-allowed;
}
.ecb-act--send {
  color: #f0dca0;
  background: linear-gradient(to bottom, #7a5c20, #5c3e10);
  border: 1px solid #c9a84c;
}
.ecb-act--send:not(.is-muted):hover {
  background: linear-gradient(to bottom, #8e6c26, #6c4a14);
}
.ecb-act--collect {
  color: #b8e8cc;
  background: linear-gradient(to bottom, #2a5c3a, #1a3c24);
  border: 1px solid #3e7a52;
}
.ecb-act--collect.is-ready {
  color: #d8fff0;
  background: linear-gradient(to bottom, #2e7a4e, #1e5433);
  border-color: #64dcb4;
}
.ecb-act--collect.is-flashing {
  animation: ecb-flash 0.55s ease;
}
.ecb-act--focus {
  color: #c89040;
  background: transparent;
  border: 1px solid #5c3310;
}
.ecb-act--focus:hover {
  color: #e8c040;
  background: #1e1006;
}
.ecb-act--focus.is-on {
  color: #e8c040;
  background: #2a1c0a;
  border-color: #c89040;
}
.ecb-act--admin {
  width: 48px;
  color: rgba(200, 144, 64, 0.62);
  background: transparent;
  border: 1px dashed #3e200a;
}
.ecb-act--admin:hover {
  color: #e8c040;
}

@keyframes ecb-flash {
  0% {
    opacity: 1;
  }
  40% {
    opacity: 0.45;
  }
  100% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ecb-act--collect.is-flashing {
    animation: none;
  }
}

/* ── Rangbalken: die Unterkante der Leiste ──────────────────── */
.ecb-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 3px;
  overflow: hidden;
  pointer-events: none;
}
.ecb-progress-fill {
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #c89040 45%, #e8c060);
  transition: transform 0.45s ease;
}
</style>
