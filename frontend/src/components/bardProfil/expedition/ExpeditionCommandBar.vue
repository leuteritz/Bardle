<script setup lang="ts">
/**
 * Die Kopfleiste des Reiters — ein durchgehender Streifen, keine vier Kacheln.
 * Ihre Höhe ist GESETZT (`VOYAGE_COMMAND_BAR_H`): `.etc-bar` ist eine auto-Grid-
 * Zeile, was sie nimmt, nimmt sie der Bühne. Die Unterkante IST der Rangbalken.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useNotifyBadgeCount } from '@/composables/ui/useNotifyBadges'
import { formatMinuteClock, toRoman } from '@/utils/ui/format'
import { VOYAGE_COMMAND_BAR_H } from '@/config/constants'
import type { VoyageRailRow } from '@/types'
import ExpeditionFleetStrip from './ExpeditionFleetStrip.vue'

const props = defineProps<{
  now: number
  collectFlashing: boolean
  chartFocus: boolean
  selectedGalaxy: number
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

const readyCount = useNotifyBadgeCount('expedition')
const activeCount = computed(() => expeditionStore.activeExpeditions.length)

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

/** Was der nächste Rang aushändigt. Knapp — die Zeile misst 10 px. */
const nextRankReward = computed(() => {
  const next = nextRank.value
  if (!next) return ''
  const parts: string[] = []
  if (next.activeSlots > rank.value.activeSlots) {
    parts.push(`+${next.activeSlots - rank.value.activeSlots} field slot`)
  }
  if (next.offerSlots > rank.value.offerSlots) {
    parts.push(`+${next.offerSlots - rank.value.offerSlots} contract`)
  }
  const odds = Math.round((next.chanceBonus - rank.value.chanceBonus) * 100)
  if (odds > 0) parts.push(`+${odds}% odds`)
  return parts.join(' · ')
})

/** Der Rangname ist aus dem Bild gefallen — hier bleibt er lesbar. */
const rankTitle = computed(() => {
  const next = nextRank.value
  if (!next) {
    return `${rank.value.name} — highest rank reached, ${expeditionStore.ledgerCompleted} runs`
  }
  return (
    `${rank.value.name} — ${expeditionStore.ledgerCompleted} of ${next.required} runs ` +
    `toward Rank ${toRoman(next.tier)}: ${nextRankReward.value}`
  )
})

const timeUntilNextSpawn = computed(() => Math.max(0, expeditionStore.nextSpawnAt - props.now))
const offersFull = computed(
  () => expeditionStore.availableExpeditions.length >= expeditionStore.maxAvailableOffers,
)

const canSendAll = computed(
  () =>
    expeditionStore.canStartExpedition &&
    expeditionStore.availableExpeditions.some((o) =>
      expeditionStore.crewFor(o).every((c) => !!c),
    ),
)
</script>

<template>
  <header class="ecb">
    <div class="ecb-main">
      <div class="ecb-rank" role="group" :aria-label="rankTitle" :title="rankTitle">
        <Icon :icon="rank.icon" width="26" height="26" class="ecb-rank-ico" />
        <div class="ecb-rank-text">
          <span class="ecb-rank-name">Rank {{ toRoman(rank.tier) }}</span>
          <span class="ecb-rank-goal">
            <template v-if="nextRank">
              {{ expeditionStore.ledgerCompleted }}/{{ nextRank.required }}
              <span class="ecb-rank-arrow">→</span>
              <span class="ecb-rank-reward">{{ nextRankReward }}</span>
            </template>
            <template v-else>{{ expeditionStore.ledgerCompleted }} runs · max rank</template>
          </span>
        </div>
      </div>

      <!-- Dieselben Glyphen wie die Zähler im Streifen darunter: eine Sprache. -->
      <div class="ecb-readouts">
        <div class="ecb-read" :class="{ 'ecb-read--live': activeCount > 0 }">
          <span class="ecb-read-value">
            <Icon icon="game-icons:caravel" width="18" height="18" class="ecb-read-ico" />
            {{ activeCount
            }}<span class="ecb-read-cap">/{{ expeditionStore.maxActiveExpeditions }}</span>
          </span>
          <span class="ecb-read-label">In field</span>
        </div>

        <div class="ecb-read ecb-read--wide">
          <span class="ecb-read-value">
            <Icon icon="ph:scroll-fill" width="18" height="18" class="ecb-read-ico" />
            {{ expeditionStore.availableExpeditions.length
            }}<span class="ecb-read-cap">/{{ expeditionStore.maxAvailableOffers }}</span>
            <span class="ecb-read-sub" :class="{ 'is-full': offersFull }">
              {{ offersFull ? 'FULL' : formatMinuteClock(timeUntilNextSpawn) }}
            </span>
          </span>
          <span class="ecb-read-label">Contracts</span>
        </div>
      </div>

      <div class="ecb-actions">
        <button
          class="ecb-bulk ecb-bulk--send"
          :class="{ 'is-muted': !canSendAll }"
          :disabled="!canSendAll"
          aria-label="Send every crewed contract"
          @click.stop="emit('send-all')"
        >
          <Icon icon="ph:tent-fill" width="15" height="15" />
          Send all
        </button>

        <button
          class="ecb-bulk ecb-bulk--collect"
          :class="{
            'is-ready': readyCount > 0,
            'is-flashing': collectFlashing,
            'is-muted': readyCount === 0,
          }"
          :disabled="readyCount === 0"
          aria-label="Collect all completed expeditions"
          @click.stop="emit('collect-all')"
        >
          <Icon icon="ph:treasure-chest-fill" width="15" height="15" />
          Collect all
          <RpgNotifyBadge :count="readyCount" label="Expedition rewards ready" />
        </button>

        <!-- Der eine Griff, der beide Ränder wegklappt. Escape holt sie zurück. -->
        <button
          class="ecb-focus"
          :class="{ 'is-on': chartFocus }"
          :aria-pressed="chartFocus"
          :aria-label="chartFocus ? 'Show rail and details' : 'Focus the chart'"
          @click.stop="emit('toggle-focus')"
        >
          <Icon :icon="chartFocus ? 'lucide:minimize' : 'lucide:maximize'" width="15" height="15" />
          {{ chartFocus ? 'Exit focus' : 'Focus' }}
        </button>

        <button
          v-if="isDev"
          class="ecb-admin"
          aria-label="Force spawn expedition (dev)"
          @click.stop="expeditionStore.forceSpawn()"
        >
          <Icon icon="ph:lightning-fill" width="13" height="13" />
          Spawn
        </button>
      </div>
    </div>

    <ExpeditionFleetStrip
      :rows="rows"
      :selected="selectedGalaxy"
      :now="now"
      @open="(galaxy, pinKey) => emit('open', galaxy, pinKey)"
    />

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
/* Gesetzte Höhe, kein Padding-Ergebnis — die Summe mit dem Streifen ist gebunden.
   KEIN overflow: die Notify-Plakette steht über der Buttonkante. */
.ecb-main {
  display: flex;
  align-items: center;
  gap: 14px;
  height: v-bind(mainH);
  padding: 0 14px;
}

/* ── Rang: der Titel der Leiste ─────────────────────────────── */
.ecb-rank {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  min-width: 0;
}
.ecb-rank-ico {
  flex-shrink: 0;
  color: #e8c040;
  filter: drop-shadow(0 0 10px rgba(232, 192, 64, 0.35));
}
.ecb-rank-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.ecb-rank-name {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  line-height: 1;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.3);
  white-space: nowrap;
}
.ecb-rank-goal {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.62);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
}
.ecb-rank-arrow {
  color: rgba(200, 144, 64, 0.35);
}
.ecb-rank-reward {
  color: #7ad0a0;
  font-weight: 800;
}

/* ── Ablesungen: nur Haarlinien, nie Kästen ─────────────────── */
.ecb-readouts {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
}
.ecb-read {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 3px;
  min-width: 92px;
  padding: 0 16px;
  border-left: 1px solid #402a12;
}
/* Der Countdown gehört in die Wertzeile — seine Breite ist reserviert, sonst
   wandert die ganze Reihe, sobald 1:40 auf 0:59 fällt. */
.ecb-read--wide {
  min-width: 158px;
}
.ecb-read-value {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: color 0.2s;
}
.ecb-read-ico {
  flex-shrink: 0;
  color: rgba(200, 144, 64, 0.7);
}
.ecb-read-cap {
  font-size: 17px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.42);
}
.ecb-read-sub {
  min-width: 5ch;
  font-size: 13px;
  font-weight: 800;
  color: rgba(200, 144, 64, 0.55);
}
.ecb-read-sub.is-full {
  color: #e8c040;
}
.ecb-read-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
  line-height: 1;
  white-space: nowrap;
}
.ecb-read--live .ecb-read-value {
  color: #a0f0d0;
}
.ecb-read--live .ecb-read-ico {
  color: rgba(160, 240, 208, 0.8);
}
.ecb-read--live .ecb-read-label {
  color: rgba(160, 240, 208, 0.6);
}

/* ── Sammeln und Absenden ───────────────────────────────────── */
.ecb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}
.ecb-bulk {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: visible;
  cursor: pointer;
  transition:
    box-shadow 0.15s,
    opacity 0.15s;
}
.ecb-bulk.is-muted {
  opacity: 0.36;
  cursor: not-allowed;
}
.ecb-bulk:not(.is-muted):active {
  transform: scale(0.96);
}
.ecb-bulk--send {
  background: linear-gradient(to bottom, #7a5c20, #5c3e10);
  border: 1px solid #c9a84c;
  color: #e8c040;
}
.ecb-bulk--send:not(.is-muted):hover {
  box-shadow: 0 0 12px rgba(201, 168, 76, 0.4);
}
.ecb-bulk--collect {
  background: linear-gradient(to bottom, #2a5c3a, #1a3c24);
  border: 1px solid rgba(100, 220, 180, 0.3);
  color: rgba(100, 220, 180, 0.6);
}
.ecb-bulk--collect.is-ready {
  background: linear-gradient(to bottom, #2e7a4e, #1e5433);
  border-color: #64dcb4;
  color: #a0f0d0;
}
.ecb-bulk--collect.is-ready:hover {
  box-shadow: 0 0 16px rgba(100, 220, 180, 0.5);
}
.ecb-bulk--collect.is-flashing {
  animation: ecb-flash 0.55s ease forwards;
}
@keyframes ecb-flash {
  0% {
    background: linear-gradient(to bottom, #2e7a4e, #1e5433);
  }
  30% {
    background: linear-gradient(to bottom, #52c890, #2e8a5a);
  }
  100% {
    background: linear-gradient(to bottom, #2e7a4e, #1e5433);
  }
}
/* Knapper als früher: der Knopf misst 34 in einer 43er Reihe, die Plakette muss
   INNERHALB der Leiste bleiben. */
.ecb-bulk--collect :deep(.rpg-notify-badge) {
  top: -4px;
  right: -5px;
}

.ecb-focus {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: transparent;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(200, 144, 64, 0.7);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s,
    background 0.12s;
}
.ecb-focus:hover {
  color: #e8c040;
  border-color: #c89040;
}
.ecb-focus.is-on {
  background: #2a1c0a;
  border-color: #c89040;
  color: #e8c040;
}

.ecb-admin {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 11px;
  background: transparent;
  border: 1px solid #3e200a;
  border-radius: 4px;
  color: rgba(200, 144, 64, 0.5);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.ecb-admin:hover {
  color: #e8c040;
  border-color: #c89040;
}

/* ── Die Unterkante der Leiste, zugleich die Rangspur ───────── */
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
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #c89040 45%, #e8c060);
  transition: transform 0.45s ease;
}
</style>
