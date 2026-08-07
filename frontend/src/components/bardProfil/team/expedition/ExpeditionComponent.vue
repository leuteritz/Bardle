<script setup lang="ts">
/**
 * The expedition tab.
 *
 * Laid out as the loop it models, left to right: what is IN THE FIELD (and what
 * came back needing collecting) beside the CONTRACTS on offer, with the crew
 * roster underneath both. It used to be one narrow column of stacked sections in
 * a 900 px rail — mostly empty, and it hid the fact that collecting and sending
 * are two different halves of the same rhythm.
 *
 * The command bar on top carries the ledger: the rank, and how many more runs
 * buy the next one. That is the only progression the tab has, so it sits where
 * the eye lands first.
 */
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useActionToast } from '@/composables/ui/useActionToast'
import {
  EXPEDITION_LEDGER_RANKS,
  EXPEDITION_COLLECT_FLASH_MS,
  EXPEDITION_CHIME_POP_LIFETIME_MS,
  EXPEDITION_CHIME_POP_SPREAD_PX,
} from '@/config/constants'
import type { AvailableExpeditionSlot } from '@/types'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import ExpeditionContractCard from './ExpeditionContractCard.vue'
import ExpeditionFieldCard from './ExpeditionFieldCard.vue'
import ExpeditionRoster from './ExpeditionRoster.vue'

const expeditionStore = useExpeditionStore()
const { showToast } = useActionToast()

const now = ref(Date.now())
const isDev = import.meta.env.DEV
const collectFlashing = ref(false)

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// ── Field ───────────────────────────────────────────────────────────────────
const readyMissions = computed(() =>
  expeditionStore.activeExpeditions.filter((e) => e.status !== 'active'),
)
const runningMissions = computed(() =>
  expeditionStore.activeExpeditions.filter((e) => e.status === 'active'),
)
const readyCount = computed(() => readyMissions.value.length)
const activeCount = computed(() => expeditionStore.activeExpeditions.length)

// ── Ledger ──────────────────────────────────────────────────────────────────
const rank = computed(() => expeditionStore.ledgerRank)
const nextRank = computed(() => expeditionStore.nextLedgerRank)
/** Progress through the CURRENT rank band, so the bar never restarts at zero. */
const rankProgress = computed(() => {
  const next = nextRank.value
  if (!next) return 1
  const span = next.required - rank.value.required
  if (span <= 0) return 1
  return Math.min(1, (expeditionStore.ledgerCompleted - rank.value.required) / span)
})

const timeUntilNextSpawn = computed(() =>
  Math.max(0, expeditionStore.nextSpawnAt - now.value),
)
const offersFull = computed(
  () => expeditionStore.availableExpeditions.length >= expeditionStore.maxAvailableOffers,
)

// ── Actions ─────────────────────────────────────────────────────────────────
const canSendAll = computed(
  () =>
    expeditionStore.canStartExpedition &&
    expeditionStore.availableExpeditions.some((o) =>
      expeditionStore.crewFor(o).every((c) => !!c),
    ),
)

function sendExpedition(offer: AvailableExpeditionSlot) {
  const crew = expeditionStore.crewFor(offer)
  if (crew.some((c) => !c)) return
  const assigned = crew.map((name, i) => ({
    name: name as string,
    role: offer.requiredRoles[i],
  }))
  if (expeditionStore.startExpedition(offer.id, assigned)) {
    showToast(`${offer.name} started!`)
  }
}

function sendAll() {
  for (const offer of [...expeditionStore.availableExpeditions]) {
    if (!expeditionStore.canStartExpedition) break
    if (expeditionStore.crewFor(offer).every((c) => !!c)) sendExpedition(offer)
  }
}

function collectMission(id: string, toast = true) {
  const mission = expeditionStore.activeExpeditions.find((e) => e.id === id)
  const status = mission?.status
  const reward = mission?.reward ?? 0
  expeditionStore.collectExpedition(id)
  if (reward > 0) spawnChimePop(reward)
  if (toast) {
    showToast(status === 'success' ? 'Expedition rewards collected!' : 'Expedition completed.')
  }
}

function collectAll() {
  if (readyCount.value === 0) return
  for (const mission of [...readyMissions.value]) collectMission(mission.id, false)
  collectFlashing.value = true
  setTimeout(() => {
    collectFlashing.value = false
  }, EXPEDITION_COLLECT_FLASH_MS)
}

// ── Chime pops ──────────────────────────────────────────────────────────────
const chimePops = ref<Array<{ id: number; amount: number; dx: number }>>([])
let popSeq = 0
function spawnChimePop(amount: number) {
  if (amount <= 0) return
  const id = ++popSeq
  const dx = Math.round((Math.random() - 0.5) * EXPEDITION_CHIME_POP_SPREAD_PX)
  chimePops.value.push({ id, amount, dx })
  setTimeout(() => {
    chimePops.value = chimePops.value.filter((p) => p.id !== id)
  }, EXPEDITION_CHIME_POP_LIFETIME_MS)
}

function formatCountdown(ms: number): string {
  const secs = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="ec-panel">
    <!-- ══ Command bar ══════════════════════════════════════════ -->
    <div class="ec-bar">
      <div class="ec-ledger" :title="`${expeditionStore.ledgerCompleted} expeditions resolved`">
        <Icon :icon="rank.icon" width="26" height="26" class="ec-ledger-ico" />
        <div class="ec-ledger-text">
          <span class="ec-ledger-name">{{ rank.name }}</span>
          <span class="ec-ledger-sub">
            <template v-if="nextRank">
              {{ expeditionStore.ledgerCompleted }} / {{ nextRank.required }} to
              {{ nextRank.name }}
            </template>
            <template v-else>Ledger complete — {{ expeditionStore.ledgerCompleted }} runs</template>
          </span>
          <div class="ec-ledger-track">
            <div class="ec-ledger-fill" :style="{ transform: `scaleX(${rankProgress})` }" />
          </div>
        </div>
        <div class="ec-ledger-pips">
          <span
            v-for="r in EXPEDITION_LEDGER_RANKS"
            :key="r.tier"
            class="ec-pip"
            :class="{ 'ec-pip--on': expeditionStore.ledgerCompleted >= r.required }"
            :title="`${r.name} — ${r.activeSlots} active, ${r.offerSlots} offers`"
          />
        </div>
      </div>

      <div class="ec-stat" :class="{ 'ec-stat--live': activeCount > 0 }">
        <span class="ec-stat-value">{{ activeCount }}/{{ expeditionStore.maxActiveExpeditions }}</span>
        <span class="ec-stat-label">In field</span>
      </div>

      <div class="ec-stat">
        <span class="ec-stat-value">
          {{ expeditionStore.availableExpeditions.length }}/{{ expeditionStore.maxAvailableOffers }}
        </span>
        <span class="ec-stat-label">Contracts</span>
      </div>

      <div class="ec-stat" :class="{ 'ec-stat--full': offersFull }">
        <span class="ec-stat-value">{{
          offersFull ? 'FULL' : formatCountdown(timeUntilNextSpawn)
        }}</span>
        <span class="ec-stat-label">Next offer</span>
      </div>

      <button
        v-if="isDev"
        class="ec-admin"
        aria-label="Force spawn expedition (dev)"
        @click.stop="expeditionStore.forceSpawn()"
      >
        <Icon icon="game-icons:lightning-arc" width="12" height="12" />
        Spawn
      </button>
    </div>

    <!-- ══ Two columns ══════════════════════════════════════════ -->
    <div class="ec-columns">
      <!-- ── In the field ──────────────────────────────────────── -->
      <section class="ec-col ec-col--field">
        <header class="ec-col-head ec-col-head--field">
          <Icon icon="game-icons:campfire" width="20" height="20" class="ec-col-ico" />
          <span class="ec-col-title">In the field</span>
          <span class="ec-col-count">{{ activeCount }}</span>
          <button
            class="ec-bulk ec-bulk--collect"
            :class="{
              'is-ready': readyCount > 0,
              'is-flashing': collectFlashing,
              'is-muted': readyCount === 0,
            }"
            :disabled="readyCount === 0"
            aria-label="Collect all completed expeditions"
            @click.stop="collectAll"
          >
            <Icon icon="game-icons:chest" width="15" height="15" />
            Collect all
            <RpgNotifyBadge :count="readyCount" label="Expedition rewards ready" />
          </button>
        </header>

        <div class="ec-col-body">
          <TransitionGroup name="ec-fly" tag="div" class="ec-stack">
            <ExpeditionFieldCard
              v-for="m in readyMissions"
              :key="m.id"
              :mission="m"
              :now="now"
              @collect="collectMission"
            />
            <ExpeditionFieldCard
              v-for="m in runningMissions"
              :key="m.id"
              :mission="m"
              :now="now"
              @collect="collectMission"
            />
          </TransitionGroup>

          <div v-if="activeCount === 0" class="ec-empty">
            <Icon icon="game-icons:camping-tent" width="34" height="34" class="ec-empty-ico" />
            <span class="ec-empty-title">Nobody is out there</span>
            <span class="ec-empty-sub">Send a crew from the contracts beside this</span>
          </div>
        </div>
      </section>

      <!-- ── Contracts ─────────────────────────────────────────── -->
      <section class="ec-col ec-col--offers">
        <header class="ec-col-head ec-col-head--offers">
          <Icon icon="game-icons:rolled-cloth" width="20" height="20" class="ec-col-ico" />
          <span class="ec-col-title">Contracts</span>
          <span class="ec-col-count">{{ expeditionStore.availableExpeditions.length }}</span>
          <button
            class="ec-bulk ec-bulk--send"
            :class="{ 'is-muted': !canSendAll }"
            :disabled="!canSendAll"
            aria-label="Send every crewed contract"
            @click.stop="sendAll"
          >
            <Icon icon="game-icons:camping-tent" width="15" height="15" />
            Send all
          </button>
        </header>

        <div class="ec-col-body">
          <TransitionGroup name="ec-fly" tag="div" class="ec-stack">
            <ExpeditionContractCard
              v-for="offer in expeditionStore.availableExpeditions"
              :key="offer.id"
              :offer="offer"
              :now="now"
              @send="sendExpedition"
            />
          </TransitionGroup>

          <div v-if="!expeditionStore.availableExpeditions.length" class="ec-empty">
            <Icon icon="game-icons:rolled-cloth" width="34" height="34" class="ec-empty-ico" />
            <span class="ec-empty-title">The board is empty</span>
            <span class="ec-empty-sub">Next contract in {{ formatCountdown(timeUntilNextSpawn) }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- ══ Crew roster ══════════════════════════════════════════ -->
    <ExpeditionRoster />

    <!-- Floating collect feedback -->
    <div class="ec-pops" aria-hidden="true">
      <span
        v-for="pop in chimePops"
        :key="pop.id"
        class="ec-pop"
        :style="{ '--pop-dx': pop.dx + 'px' }"
      >
        +{{ $formatNumber(pop.amount) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.ec-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* ══ Command bar ══════════════════════════════════════════════ */
.ec-bar {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 9px 12px;
  background: #16100a;
  border-bottom: 2px solid #5c3310;
}
.ec-ledger {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.ec-ledger-ico {
  color: #e8c040;
  flex-shrink: 0;
}
.ec-ledger-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ec-ledger-name {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e8c040;
  line-height: 1;
}
.ec-ledger-sub {
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.6);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-ledger-track {
  height: 4px;
  background: #111008;
  border-radius: 2px;
  overflow: hidden;
}
.ec-ledger-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #c89040, #e8c060);
  transition: transform 0.4s ease;
}
.ec-ledger-pips {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}
.ec-pip {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #241408;
  border: 1px solid #3e200a;
}
.ec-pip--on {
  background: #e8c040;
  border-color: #c89040;
}

.ec-stat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  flex-shrink: 0;
  min-width: 76px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.ec-stat-value {
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ec-stat-label {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
  line-height: 1;
}
.ec-stat--live {
  border-color: rgba(100, 220, 180, 0.35);
  background: rgba(100, 220, 180, 0.06);
}
.ec-stat--live .ec-stat-value {
  color: #a0f0d0;
}
.ec-stat--full {
  border-color: #5c3310;
  background: rgba(200, 144, 64, 0.1);
}
.ec-stat--full .ec-stat-value {
  color: #e8c040;
}

.ec-admin {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 0 11px;
  background: #1c1008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(200, 144, 64, 0.55);
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.ec-admin:hover {
  color: #e8c040;
  border-color: #c89040;
}

/* ══ Columns ══════════════════════════════════════════════════ */
.ec-columns {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
  padding: 12px 12px 10px;
  overflow: hidden;
}
.ec-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  gap: 9px;
}
/* Even halves. The two hold the same number of cards at every ledger rank, and
   a contract needs the width more than the field does — its breakdown lines put
   a label and a figure on one row. */
.ec-col--field,
.ec-col--offers {
  flex: 1;
}

.ec-col-head {
  --sec-c: #e8c040;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px 8px;
  flex-shrink: 0;
}
.ec-col-head::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--sec-c),
    color-mix(in srgb, var(--sec-c) 35%, transparent) 55%,
    transparent
  );
}
.ec-col-head--field {
  --sec-c: #64dcb4;
}
.ec-col-head--field .ec-col-ico,
.ec-col-head--field .ec-col-title {
  color: #a0f0d0;
}
.ec-col-head--offers .ec-col-ico,
.ec-col-head--offers .ec-col-title {
  color: #e8c040;
}
.ec-col-ico {
  flex-shrink: 0;
}
.ec-col-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1;
}
.ec-col-count {
  font-size: 12px;
  font-weight: 700;
  color: rgba(230, 220, 196, 0.45);
  font-variant-numeric: tabular-nums;
}

.ec-bulk {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  position: relative;
  overflow: visible;
  white-space: nowrap;
  transition:
    box-shadow 0.15s,
    opacity 0.15s;
}
.ec-bulk.is-muted {
  opacity: 0.36;
  cursor: not-allowed;
}
.ec-bulk--send {
  background: linear-gradient(to bottom, #7a5c20, #5c3e10);
  border: 1px solid #c9a84c;
  color: #e8c040;
}
.ec-bulk--send:not(.is-muted):hover {
  box-shadow: 0 0 12px rgba(201, 168, 76, 0.4);
}
.ec-bulk--collect {
  background: linear-gradient(to bottom, #2a5c3a, #1a3c24);
  border: 1px solid rgba(100, 220, 180, 0.3);
  color: rgba(100, 220, 180, 0.6);
}
.ec-bulk--collect.is-ready {
  background: linear-gradient(to bottom, #2e7a4e, #1e5433);
  border-color: #64dcb4;
  color: #a0f0d0;
}
.ec-bulk--collect.is-ready:hover {
  box-shadow: 0 0 16px rgba(100, 220, 180, 0.5);
}
.ec-bulk--collect.is-flashing {
  animation: ec-flash 0.55s ease forwards;
}
.ec-bulk:not(.is-muted):active {
  transform: scale(0.96);
}
@keyframes ec-flash {
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
.ec-bulk--collect :deep(.rpg-notify-badge) {
  top: -6px;
  right: -6px;
}

.ec-col-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* the picker pops out of a card and must not be clipped horizontally */
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.ec-col-body::-webkit-scrollbar {
  width: 4px;
}
.ec-col-body::-webkit-scrollbar-track {
  background: #111;
}
.ec-col-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}
.ec-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Empty states ─────────────────────────────────────────── */
.ec-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 46px 12px;
  text-align: center;
}
.ec-empty-ico {
  color: rgba(200, 144, 64, 0.24);
}
.ec-empty-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.45);
}
.ec-empty-sub {
  font-size: 12px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.35);
  font-variant-numeric: tabular-nums;
}

/* ── Card transitions ─────────────────────────────────────── */
.ec-fly-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.ec-fly-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.ec-fly-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}
.ec-fly-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.9);
}

/* ── Chime pops ───────────────────────────────────────────── */
.ec-pops {
  position: absolute;
  top: 62px;
  left: 30%;
  z-index: 30;
  pointer-events: none;
}
.ec-pop {
  position: absolute;
  left: 50%;
  bottom: 0;
  font-size: 18px;
  font-weight: 900;
  color: #e8c040;
  white-space: nowrap;
  -webkit-text-stroke: 1.5px #3e200a;
  text-shadow:
    0 0 6px #e8c040,
    0 0 14px #c89040,
    0 0 28px rgba(232, 192, 64, 0.5);
  animation: ec-pop-float 0.85s ease-out forwards;
}
@keyframes ec-pop-float {
  0% {
    opacity: 0;
    transform: translateX(calc(-50% + var(--pop-dx, 0px))) translateY(0) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateX(calc(-50% + var(--pop-dx, 0px))) translateY(-12px) scale(1.12);
  }
  100% {
    opacity: 0;
    transform: translateX(calc(-50% + var(--pop-dx, 0px))) translateY(-58px) scale(0.9);
  }
}
</style>
