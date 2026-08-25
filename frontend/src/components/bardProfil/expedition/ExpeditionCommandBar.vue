<script setup lang="ts">
/**
 * Die Kopfleiste des Reiters — ein durchgehender Streifen, keine vier Kacheln.
 *
 * Der Rang steht links als eigener Titel, die Ablesungen sind nur durch
 * Haarlinien getrennt, und die Unterkante der Leiste IST der Rangfortschritt:
 * die Linie, die den Kopf abschliesst, misst zugleich, was sie abschliesst.
 *
 * Sammeln und Absenden liegen hier, weil es die Spaltenköpfe des alten Bretts
 * nicht mehr gibt, an denen sie hingen — und weil sie zu den Zahlen gehören,
 * die sie verändern.
 *
 * Darunter, in DERSELBEN Leiste, der Fleet-Streifen: die Ablesungen sagen „fünf
 * Verträge", er sagt WO. Ohne Umschalter — die Frage stellt sich beim Öffnen,
 * nicht auf Wunsch.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useNotifyBadgeCount } from '@/composables/ui/useNotifyBadges'
import { toRoman } from '@/utils/ui/format'
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

/**
 * Was der nächste Rang tatsächlich aushändigt, in den Worten des Spielers.
 * Die Rangnamen sind Beiwerk — „Pathwarden" sagt niemandem, was er kann.
 */
const nextRankReward = computed(() => {
  const next = nextRank.value
  if (!next) return ''
  const parts: string[] = []
  if (next.activeSlots > rank.value.activeSlots) {
    parts.push(`+${next.activeSlots - rank.value.activeSlots} expedition slot`)
  }
  if (next.offerSlots > rank.value.offerSlots) {
    parts.push(`+${next.offerSlots - rank.value.offerSlots} contract slot`)
  }
  const odds = Math.round((next.chanceBonus - rank.value.chanceBonus) * 100)
  if (odds > 0) parts.push(`+${odds}% odds`)
  return parts.join(' · ')
})

const timeUntilNextSpawn = computed(() =>
  Math.max(0, expeditionStore.nextSpawnAt - props.now),
)
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

function formatCountdown(ms: number): string {
  const secs = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}
</script>

<template>
  <header class="ecb">
    <div class="ecb-main">
      <div class="ecb-rank">
        <Icon :icon="rank.icon" width="28" height="28" class="ecb-rank-ico" />
        <div class="ecb-rank-text">
          <div class="ecb-rank-line">
            <span class="ecb-rank-name">Expedition Rank {{ toRoman(rank.tier) }}</span>
            <span class="ecb-rank-flavor">{{ rank.name }}</span>
          </div>
          <span class="ecb-rank-goal">
            <template v-if="nextRank">
              {{ expeditionStore.ledgerCompleted }} / {{ nextRank.required }} runs
              <span class="ecb-rank-arrow">→</span>
              <span class="ecb-rank-reward">{{ nextRankReward }}</span>
            </template>
            <template v-else>
              Highest rank reached — {{ expeditionStore.ledgerCompleted }} runs
            </template>
          </span>
        </div>
      </div>

      <div class="ecb-readouts">
        <div class="ecb-read" :class="{ 'ecb-read--live': activeCount > 0 }">
          <span class="ecb-read-value">
            {{ activeCount }}<span class="ecb-read-cap">/{{ expeditionStore.maxActiveExpeditions }}</span>
          </span>
          <span class="ecb-read-label">In field</span>
        </div>
        <div class="ecb-read" :class="{ 'ecb-read--live': readyCount > 0 }">
          <span class="ecb-read-value">{{ readyCount }}</span>
          <span class="ecb-read-label">Ready</span>
        </div>
        <div class="ecb-read">
          <span class="ecb-read-value">
            {{ expeditionStore.availableExpeditions.length
            }}<span class="ecb-read-cap">/{{ expeditionStore.maxAvailableOffers }}</span>
          </span>
          <span class="ecb-read-label">Contracts</span>
        </div>
        <div class="ecb-read" :class="{ 'ecb-read--full': offersFull }">
          <span class="ecb-read-value">
            {{ offersFull ? 'FULL' : formatCountdown(timeUntilNextSpawn) }}
          </span>
          <span class="ecb-read-label">Next offer</span>
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
          <Icon icon="ph:tent-fill" width="14" height="14" />
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
          <Icon icon="ph:treasure-chest-fill" width="14" height="14" />
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
          <Icon
            :icon="chartFocus ? 'lucide:minimize' : 'lucide:maximize'"
            width="14"
            height="14"
          />
          {{ chartFocus ? 'Exit focus' : 'Focus' }}
        </button>

        <button
          v-if="isDev"
          class="ecb-admin"
          aria-label="Force spawn expedition (dev)"
          @click.stop="expeditionStore.forceSpawn()"
        >
          <Icon icon="ph:lightning-fill" width="12" height="12" />
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
.ecb-main {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 14px 11px;
}

/* ── Rang: der Titel der Leiste ─────────────────────────────── */
.ecb-rank {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
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
  gap: 4px;
  min-width: 0;
}
.ecb-rank-line {
  display: flex;
  align-items: center;
  gap: 9px;
}
.ecb-rank-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  line-height: 1;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.3);
  white-space: nowrap;
}
.ecb-rank-flavor {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(200, 144, 64, 0.45);
  line-height: 1;
  white-space: nowrap;
}
.ecb-rank-goal {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
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
  align-items: flex-end;
  gap: 4px;
  min-width: 72px;
  padding: 2px 13px;
  border-left: 1px solid #402a12;
}
.ecb-read:first-child {
  border-left: 0;
}
.ecb-read-value {
  font-size: 17px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: color 0.2s;
}
.ecb-read-cap {
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.42);
}
.ecb-read-label {
  font-size: 9px;
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
.ecb-read--live .ecb-read-label {
  color: rgba(160, 240, 208, 0.6);
}
.ecb-read--full .ecb-read-value {
  color: #e8c040;
}

/* ── Sammeln und Absenden ───────────────────────────────────── */
.ecb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.ecb-bulk {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
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
.ecb-bulk--collect :deep(.rpg-notify-badge) {
  top: -6px;
  right: -6px;
}

.ecb-focus {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  background: transparent;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(200, 144, 64, 0.7);
  font-size: 11px;
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
  padding: 6px 10px;
  background: transparent;
  border: 1px solid #3e200a;
  border-radius: 4px;
  color: rgba(200, 144, 64, 0.5);
  font-size: 10.5px;
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
