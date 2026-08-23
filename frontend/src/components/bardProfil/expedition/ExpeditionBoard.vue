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
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useNotifyBadgeCount } from '@/composables/ui/useNotifyBadges'
import { useHerald } from '@/composables/ui/useHerald'
import { toRoman } from '@/utils/ui/format'
import {
  EXPEDITION_COLLECT_FLASH_MS,
  EXPEDITION_CHIME_POP_LIFETIME_MS,
  EXPEDITION_CHIME_POP_SPREAD_PX,
} from '@/config/constants'
import type { AvailableExpeditionSlot } from '@/types'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import ExpeditionContractCard from './ExpeditionContractCard.vue'
import ExpeditionFieldCard from './ExpeditionFieldCard.vue'
import ExpeditionRoster from './ExpeditionRoster.vue'
import { gameNow } from '@/utils/game/gameClock'

const expeditionStore = useExpeditionStore()
const { announceReceipt } = useHerald()

const now = ref(gameNow())
const isDev = import.meta.env.DEV
const collectFlashing = ref(false)

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = gameNow()
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// ── Field ───────────────────────────────────────────────────────────────────
const readyMissions = computed(() => expeditionStore.readyExpeditions)
const runningMissions = computed(() =>
  expeditionStore.activeExpeditions.filter((e) => e.status === 'active'),
)
const readyCount = useNotifyBadgeCount('expedition')

// ── Kartenfokus ─────────────────────────────────────────────────────────────
// Ein Ziel auf der Sternenkarte hebt die Verträge dorthin hervor. Es FILTERT
// nicht — sonst verschwände die Auslage hinter einem Klick, den der Spieler
// vielleicht gar nicht als Filter gemeint hat.
const chartStore = useExpeditionChartStore()
const focusedGalaxy = computed(() => chartStore.selectedGalaxy)
const visibleOffers = computed(() => {
  const focus = focusedGalaxy.value
  if (!focus) return expeditionStore.availableExpeditions
  return [...expeditionStore.availableExpeditions].sort((a, b) => {
    const av = a.galaxy === focus ? 0 : 1
    const bv = b.galaxy === focus ? 0 : 1
    return av - bv
  })
})
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

/**
 * What the next rank actually hands over, in the player's terms.
 *
 * The rank names are flavour — "Pathwarden" tells nobody what it does. This
 * spells out the reward instead, so the number in the header is a goal rather
 * than a word to hover and guess at.
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
    announceReceipt({
      kind: 'expedition',
      eyebrow: 'DEPARTED',
      headline: offer.name,
      subline: assigned.map((a) => a.name).join(' · '),
      mergeKey: 'expedition/start',
    })
  }
}

// Fünf Starts in einer Schleife ergeben EINE Karte mit `×5` — die Verdichtung
// im Herold macht den früheren Unterdrückungs-Schalter überflüssig, den
// `collectMission` noch als zweiten Parameter trug.
function sendAll() {
  for (const offer of [...expeditionStore.availableExpeditions]) {
    if (!expeditionStore.canStartExpedition) break
    if (expeditionStore.crewFor(offer).every((c) => !!c)) sendExpedition(offer)
  }
}

function collectMission(id: string) {
  const mission = expeditionStore.activeExpeditions.find((e) => e.id === id)
  const status = mission?.status
  const reward = mission?.reward ?? 0
  expeditionStore.collectExpedition(id)
  if (reward > 0) spawnChimePop(reward)
  announceReceipt({
    kind: 'expedition',
    headline: status === 'success' ? 'Rewards collected' : 'Expedition completed',
    subline: mission?.name,
    delta: reward > 0 ? { value: reward, unit: 'chimes' } : undefined,
    // Derselbe Schlüssel wie im Badge-Tooltip: dieselbe Handlung an zwei
    // Oberflächen darf nicht zwei gleichlautende Karten ergeben.
    mergeKey: 'expedition/collect',
  })
}

function collectAll() {
  if (readyCount.value === 0) return
  for (const mission of [...readyMissions.value]) collectMission(mission.id)
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
    <!-- ══ Command bar ══════════════════════════════════════════
         One continuous strip, not four boxed tiles. The rank sits on the left
         as the header's own title, the readouts are separated by hairlines
         instead of frames, and the bar's bottom edge IS the rank progress — the
         line that closes the header doubles as the thing it measures. -->
    <header class="ec-bar">
      <!-- Says what it IS and what the next one GIVES. The rank name stays on as
           flavour behind the numeral, but nothing you need to hover to read. -->
      <div class="ec-rank">
        <Icon :icon="rank.icon" width="30" height="30" class="ec-rank-ico" />
        <div class="ec-rank-text">
          <div class="ec-rank-line">
            <span class="ec-rank-name">
              Expedition Rank {{ toRoman(rank.tier) }}
            </span>
            <span class="ec-rank-flavor">{{ rank.name }}</span>
          </div>
          <span class="ec-rank-goal">
            <template v-if="nextRank">
              {{ expeditionStore.ledgerCompleted }} / {{ nextRank.required }} runs
              <span class="ec-rank-arrow">→</span>
              <span class="ec-rank-reward">{{ nextRankReward }}</span>
            </template>
            <template v-else>
              Highest rank reached — {{ expeditionStore.ledgerCompleted }} runs
            </template>
          </span>
        </div>
      </div>

      <div class="ec-readouts">
        <div class="ec-read" :class="{ 'ec-read--live': activeCount > 0 }">
          <span class="ec-read-value">
            {{ activeCount }}<span class="ec-read-cap">/{{ expeditionStore.maxActiveExpeditions }}</span>
          </span>
          <span class="ec-read-label">In field</span>
        </div>

        <div class="ec-read" :class="{ 'ec-read--live': readyCount > 0 }">
          <span class="ec-read-value">{{ readyCount }}</span>
          <span class="ec-read-label">Ready</span>
        </div>

        <div class="ec-read">
          <span class="ec-read-value">
            {{ expeditionStore.availableExpeditions.length
            }}<span class="ec-read-cap">/{{ expeditionStore.maxAvailableOffers }}</span>
          </span>
          <span class="ec-read-label">Contracts</span>
        </div>

        <div class="ec-read" :class="{ 'ec-read--full': offersFull }">
          <span class="ec-read-value">{{
            offersFull ? 'FULL' : formatCountdown(timeUntilNextSpawn)
          }}</span>
          <span class="ec-read-label">Next offer</span>
        </div>
      </div>

      <button
        v-if="isDev"
        class="ec-admin"
        aria-label="Force spawn expedition (dev)"
        @click.stop="expeditionStore.forceSpawn()"
      >
        <Icon icon="ph:lightning-fill" width="12" height="12" />
        Spawn
      </button>

      <div class="ec-bar-progress">
        <div class="ec-bar-progress-fill" :style="{ transform: `scaleX(${rankProgress})` }" />
      </div>
    </header>

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
            <Icon icon="ph:treasure-chest-fill" width="15" height="15" />
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
            <Icon icon="ph:tent-fill" width="34" height="34" class="ec-empty-ico" />
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
            <Icon icon="ph:tent-fill" width="15" height="15" />
            Send all
          </button>
        </header>

        <div class="ec-col-body">
          <TransitionGroup name="ec-fly" tag="div" class="ec-stack">
            <ExpeditionContractCard
              v-for="offer in visibleOffers"
              :key="offer.id"
              :offer="offer"
              :now="now"
              :focused="focusedGalaxy === offer.galaxy"
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

/* ══ Command bar ══════════════════════════════════════════════
   No inner frames. The strip itself is the container; the rank titles it and
   the readouts are set off by hairlines only. A box around each figure read as
   four competing panels in a header that is one thought. */
.ec-bar {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 11px 14px 12px;
  background: linear-gradient(180deg, #1b120a 0%, #16100a 100%);
  border-bottom: 2px solid #3e200a;
}

/* ── Rank: the header's title ─────────────────────────────── */
.ec-rank {
  display: flex;
  align-items: center;
  gap: 11px;
  flex: 1;
  min-width: 0;
}
/* Glow instead of a frame — the icon reads as an emblem, not a button. */
.ec-rank-ico {
  flex-shrink: 0;
  color: #e8c040;
  filter: drop-shadow(0 0 10px rgba(232, 192, 64, 0.35));
}
.ec-rank-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ec-rank-line {
  display: flex;
  align-items: center;
  gap: 9px;
}
.ec-rank-name {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  line-height: 1;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.3);
  white-space: nowrap;
}
/* Flavour only — set back far enough that it never competes with the rank. */
.ec-rank-flavor {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(200, 144, 64, 0.45);
  line-height: 1;
  white-space: nowrap;
}
.ec-rank-goal {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: rgba(200, 144, 64, 0.62);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
}
.ec-rank-arrow {
  color: rgba(200, 144, 64, 0.35);
}
/* The payoff, in the colour the tab uses for a gain. */
.ec-rank-reward {
  color: #7ad0a0;
  font-weight: 800;
}

/* ── Readouts: hairline-separated, never boxed ────────────── */
.ec-readouts {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
}
.ec-read {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  gap: 4px;
  min-width: 74px;
  padding: 2px 14px;
  border-left: 1px solid #402a12;
}
.ec-read:first-child {
  border-left: 0;
}
.ec-read-value {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: color 0.2s;
}
/* The cap is context, not the reading — it steps back so the count leads. */
.ec-read-cap {
  font-size: 13px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.42);
}
.ec-read-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
  line-height: 1;
  white-space: nowrap;
}
/* State lives in the figure's colour now that there is no border to carry it. */
.ec-read--live .ec-read-value {
  color: #a0f0d0;
}
.ec-read--live .ec-read-label {
  color: rgba(160, 240, 208, 0.6);
}
.ec-read--full .ec-read-value {
  color: #e8c040;
}

.ec-admin {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 6px 11px;
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
.ec-admin:hover {
  color: #e8c040;
  border-color: #c89040;
}

/* ── The bar's own bottom edge, doubling as the rank track ── */
.ec-bar-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  overflow: hidden;
  pointer-events: none;
}
.ec-bar-progress-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #c89040 45%, #e8c060);
  transition: transform 0.45s ease;
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
