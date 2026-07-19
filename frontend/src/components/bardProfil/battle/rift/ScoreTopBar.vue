<template>
  <div
    class="score-bar score-bar--clickable"
    title="View career stats"
    @click="battleStore.isViewingLanding = true"
  >
    <!-- Blue side -->
    <div class="side side--blue">
      <span class="side-name side-name--blue">BARD'S VANGUARD</span>
      <div class="side-stats">
        <span class="stat" title="Turrets destroyed"><Icon icon="game-icons:watchtower" width="14" height="14" class="stat-icon" /> {{ battleStore.team1Turrets }}</span>
        <span class="stat" title="Inhibitors destroyed"><Icon icon="game-icons:floating-crystal" width="14" height="14" class="stat-icon stat-icon--inhib" /> {{ battleStore.team1Inhibs }}</span>
        <span class="stat" title="Drakes secured"><img src="/img/dragon.png" alt="Drakes" class="stat-img" /> {{ battleStore.team1Drakes }}</span>
        <span class="stat" title="Barons secured"><img src="/img/baron.png" alt="Barons" class="stat-img" /> {{ battleStore.team1Barons }}</span>
        <span class="stat stat--gold">◈ {{ formatNumber(battleStore.team1Gold) }}</span>
        <span class="stat stat--level">Lv {{ battleStore.team1AvgLevel }}</span>
      </div>
    </div>

    <!-- Center: kills + timer -->
    <div class="center">
      <span class="kills kills--blue">{{ battleStore.team1Kills }}</span>
      <div class="timer-block">
        <div class="timer-eyebrow">GAME TIME</div>
        <div class="timer-value">{{ battleStore.formatTime(battleStore.battleTime) }}</div>
      </div>
      <span class="kills kills--red">{{ battleStore.team2Kills }}</span>
    </div>

    <!-- Red side -->
    <div class="side side--red">
      <span class="side-name side-name--red">CRIMSON PACT</span>
      <div class="side-stats side-stats--red">
        <span class="stat stat--level">Lv {{ battleStore.team2AvgLevel }}</span>
        <span class="stat stat--gold">{{ formatNumber(battleStore.team2Gold) }} ◈</span>
        <span class="stat" title="Barons secured">{{ battleStore.team2Barons }} <img src="/img/baron.png" alt="Barons" class="stat-img" /></span>
        <span class="stat" title="Drakes secured">{{ battleStore.team2Drakes }} <img src="/img/dragon.png" alt="Drakes" class="stat-img" /></span>
        <span class="stat" title="Inhibitors destroyed">{{ battleStore.team2Inhibs }} <Icon icon="game-icons:floating-crystal" width="14" height="14" class="stat-icon stat-icon--inhib" /></span>
        <span class="stat" title="Turrets destroyed">{{ battleStore.team2Turrets }} <Icon icon="game-icons:watchtower" width="14" height="14" class="stat-icon" /></span>
      </div>
    </div>
  </div>

  <!-- Live victory momentum meter — presentation escalates with dominance:
       neutral around 50/50, the leading team's side lights up in tiers -->
  <div class="momentum-meter" :class="meterClasses">
    <div class="momentum-row">
      <div class="momentum-pct momentum-pct--blue">
        <span class="momentum-pct-value">{{ bluePercent }}%</span>
      </div>
      <div class="momentum-track">
        <div class="momentum-fill momentum-fill--blue" :style="{ width: bluePercent + '%' }" />
        <div class="momentum-fill momentum-fill--red" :style="{ width: 100 - bluePercent + '%' }" />
        <div class="momentum-center-tick" />
        <span class="momentum-marker" :style="{ left: bluePercent + '%' }">◆</span>
        <span
          v-if="lastDelta > 0"
          :key="deltaKey"
          class="momentum-delta momentum-delta--blue"
        >▲ +{{ lastDelta }}%</span>
        <span
          v-if="lastDelta < 0"
          :key="deltaKey"
          class="momentum-delta momentum-delta--red"
        >▲ +{{ -lastDelta }}%</span>
      </div>
      <div class="momentum-pct momentum-pct--red">
        <span class="momentum-pct-value">{{ 100 - bluePercent }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { formatNumber } from '@/config/numberFormat'
import {
  MOMENTUM_HIGH_THRESHOLD,
  MOMENTUM_NEUTRAL_BAND,
  MOMENTUM_CRUSHING_THRESHOLD,
  MOMENTUM_DELTA_CHIP_MS,
} from '@/config/constants'

const battleStore = useBattleStore()
const bluePercent = computed(() => Math.round(battleStore.liveWinMomentum * 100))

/* Dominance tiers drive the meter's visual escalation:
   0 = neutral (within ±band of 50), 1 = leaning, 2 = dominant, 3 = crushing */
const leadPercent = computed(() => Math.max(bluePercent.value, 100 - bluePercent.value))
const leader = computed<'blue' | 'red' | null>(() => {
  if (leadPercent.value <= 50 + MOMENTUM_NEUTRAL_BAND * 100) return null
  return bluePercent.value > 50 ? 'blue' : 'red'
})
const dominanceTier = computed(() => {
  if (!leader.value) return 0
  if (leadPercent.value >= MOMENTUM_CRUSHING_THRESHOLD * 100) return 3
  if (leadPercent.value >= MOMENTUM_HIGH_THRESHOLD * 100) return 2
  return 1
})
const meterClasses = computed(() => ({
  'is-shifting': isShifting.value,
  [`lead-${leader.value}`]: leader.value !== null,
  [`tier-${dominanceTier.value}`]: dominanceTier.value > 0,
}))

const lastDelta = ref(0)
const deltaKey = ref(0)
const isShifting = ref(false)
let chipTimer: ReturnType<typeof setTimeout> | null = null

watch(bluePercent, (next, prev) => {
  const delta = next - prev
  if (delta === 0) return
  lastDelta.value = delta
  deltaKey.value += 1
  isShifting.value = true
  if (chipTimer) clearTimeout(chipTimer)
  chipTimer = setTimeout(() => {
    lastDelta.value = 0
    isShifting.value = false
  }, MOMENTUM_DELTA_CHIP_MS)
})
</script>

<style scoped>
/* Fluid sizing (cq units against .rift-board): the bar shrinks gently on small
   desktops and caps at the original design size on large ones. */
.score-bar {
  display: flex;
  align-items: stretch;
  height: clamp(36px, 6cqh, 48px);
  flex-shrink: 0;
  border-bottom: 2px solid #3e200a;
  background: #0d0c08;
}

.score-bar--clickable {
  cursor: pointer;
  transition: filter 0.15s;
}
.score-bar--clickable:hover {
  filter: brightness(1.25);
}

.side {
  flex: 1;
  display: flex;
  align-items: center;
  gap: clamp(8px, 1.2cqw, 14px);
  padding: 0 clamp(10px, 1.5cqw, 18px);
  min-width: 0;
}
.side--blue {
  background: linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.03));
}
.side--red {
  flex-direction: row-reverse;
  background: linear-gradient(to left, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.03));
}

.side-name {
  font-size: clamp(11px, 1.05cqw, 13px);
  font-weight: 700;
  letter-spacing: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* MedievalSharp metric fix — keep the whole bar row optically centered */
  transform: translateY(0.1em);
}
.side-name--blue { color: #93c5fd; }
.side-name--red { color: #fca5a5; }

.side-stats {
  display: flex;
  align-items: center;
  gap: clamp(7px, 1.1cqw, 14px);
  margin-left: auto;
  font-size: clamp(10px, 0.95cqw, 12px);
  color: #8ab0e0;
  /* MedievalSharp metric fix — keep the whole bar row optically centered */
  transform: translateY(0.1em);
}
.side-stats--red {
  margin-left: 0;
  margin-right: auto;
  color: #e0a0a0;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.stat--gold { color: #e8c040; }
.stat--level { color: #e8e2d0; }

.stat-icon { opacity: 0.8; }
.stat-icon--inhib { color: #e884d8; }
.stat-img {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  object-fit: cover;
}

.center {
  display: flex;
  align-items: center;
  gap: clamp(9px, 1.1cqw, 14px);
  padding: 0 clamp(12px, 1.7cqw, 22px);
  background: #0d0c08;
  border-left: 2px solid #3e200a;
  border-right: 2px solid #3e200a;
  flex-shrink: 0;
}

.kills {
  font-size: clamp(20px, 3.8cqh, 27px);
  font-weight: 700;
  line-height: 1;
  min-width: clamp(28px, 5cqh, 36px);
  text-align: center;
  /* Same MedievalSharp metric fix as the momentum values: digits render high
     in their em box, nudge down for equal space above and below */
  transform: translateY(0.1em);
}
.kills--blue { color: #93c5fd; }
.kills--red { color: #fca5a5; }

.timer-block {
  text-align: center;
}
.timer-eyebrow {
  font-size: 9px;
  letter-spacing: 2px;
  color: #6a5820;
}
.timer-value {
  font-size: clamp(14px, 2.5cqh, 18px);
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.5);
}

/* ── Victory momentum meter ── */
.momentum-meter {
  position: relative;
  flex-shrink: 0;
  height: clamp(22px, 4cqh, 30px);
  display: flex;
  align-items: center;
  padding: 0 clamp(10px, 1.2cqw, 14px);
  background:
    linear-gradient(to right, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0) 30%),
    linear-gradient(to left, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0) 30%),
    #0d0c08;
  border-bottom: 2px solid #3e200a;
}

.momentum-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.momentum-pct {
  width: clamp(38px, 6.6cqh, 50px);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.momentum-pct--red {
  justify-content: flex-start;
}

.momentum-pct-value {
  font-size: clamp(15px, 3cqh, 21px);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  /* MedievalSharp digits sit high in their em box — nudge down so the number
     is visually centered on the momentum track at every size.
     Scale factor grows with the leading team's dominance tier. */
  transform: translateY(0.1em) scale(var(--pct-scale, 1));
  transition:
    transform 0.5s ease,
    opacity 0.5s ease,
    color 0.4s ease,
    filter 0.5s ease,
    text-shadow 0.4s ease;
}
/* Scale away from the track so the growing number keeps its gap */
.momentum-pct--blue .momentum-pct-value {
  transform-origin: right center;
  color: #93c5fd;
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.35);
}
.momentum-pct--red .momentum-pct-value {
  transform-origin: left center;
  color: #fca5a5;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.35);
}

/* ── Dominance escalation: leading number grows + glows, trailing number fades ── */
.tier-1 .momentum-pct-value { --pct-scale: 1.06; }
.tier-2 .momentum-pct-value { --pct-scale: 1.14; }
.tier-3 .momentum-pct-value { --pct-scale: 1.24; }

.lead-blue .momentum-pct--blue .momentum-pct-value {
  text-shadow:
    0 0 10px rgba(59, 130, 246, 0.75),
    0 0 22px rgba(59, 130, 246, 0.4);
}
.lead-red .momentum-pct--red .momentum-pct-value {
  text-shadow:
    0 0 10px rgba(239, 68, 68, 0.75),
    0 0 22px rgba(239, 68, 68, 0.4);
}
.lead-blue.tier-3 .momentum-pct--blue .momentum-pct-value {
  color: #dbeafe;
  text-shadow:
    0 0 10px rgba(59, 130, 246, 1),
    0 0 26px rgba(59, 130, 246, 0.7);
  animation: momentum-value-pulse-blue 1.6s ease-in-out infinite;
}
.lead-red.tier-3 .momentum-pct--red .momentum-pct-value {
  color: #fee2e2;
  text-shadow:
    0 0 10px rgba(239, 68, 68, 1),
    0 0 26px rgba(239, 68, 68, 0.7);
  animation: momentum-value-pulse-red 1.6s ease-in-out infinite;
}
/* The trailing side steps back — dimmer and desaturated as the gap widens */
.lead-blue .momentum-pct--red .momentum-pct-value,
.lead-red .momentum-pct--blue .momentum-pct-value {
  --pct-scale: 1;
  opacity: 0.75;
}
.lead-blue.tier-2 .momentum-pct--red .momentum-pct-value,
.lead-red.tier-2 .momentum-pct--blue .momentum-pct-value {
  opacity: 0.55;
  filter: saturate(0.6);
}
.lead-blue.tier-3 .momentum-pct--red .momentum-pct-value,
.lead-red.tier-3 .momentum-pct--blue .momentum-pct-value {
  opacity: 0.4;
  filter: saturate(0.35);
}

@keyframes momentum-value-pulse-blue {
  50% {
    text-shadow:
      0 0 14px rgba(59, 130, 246, 1),
      0 0 36px rgba(59, 130, 246, 0.9);
  }
}
@keyframes momentum-value-pulse-red {
  50% {
    text-shadow:
      0 0 14px rgba(239, 68, 68, 1),
      0 0 36px rgba(239, 68, 68, 0.9);
  }
}

.momentum-delta {
  position: absolute;
  top: 50%;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.5px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
  animation: momentum-delta-fade 1.2s ease-out forwards;
}
.momentum-delta--blue {
  left: 10px;
  transform-origin: left center;
  color: #dbeafe;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(59, 130, 246, 0.9);
}
.momentum-delta--red {
  right: 10px;
  transform-origin: right center;
  color: #fee2e2;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(239, 68, 68, 0.9);
}

@keyframes momentum-delta-fade {
  0% {
    opacity: 0;
    transform: translateY(-50%) scale(1.3);
  }
  25% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
  60% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(calc(-50% - 4px)) scale(0.95);
  }
}

.momentum-track {
  position: relative;
  flex: 1;
  height: clamp(12px, 2.4cqh, 16px);
  display: flex;
  border: 1px solid #3e200a;
  border-radius: 4px;
  background: #16140e;
  overflow: visible;
}

.momentum-fill {
  height: 100%;
  transition:
    width 0.8s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.4s ease,
    filter 0.5s ease;
}
.momentum-fill--blue {
  background: linear-gradient(to right, #1d4ed8, #3b82f6);
  border-radius: 3px 0 0 3px;
  box-shadow: inset 0 1px 0 rgba(147, 197, 253, 0.4);
}
.momentum-fill--red {
  background: linear-gradient(to left, #b91c1c, #ef4444);
  border-radius: 0 3px 3px 0;
  box-shadow: inset 0 1px 0 rgba(252, 165, 165, 0.4);
}
.is-shifting .momentum-fill--blue {
  box-shadow:
    inset 0 1px 0 rgba(147, 197, 253, 0.4),
    0 0 12px rgba(59, 130, 246, 0.8);
}
.is-shifting .momentum-fill--red {
  box-shadow:
    inset 0 1px 0 rgba(252, 165, 165, 0.4),
    0 0 12px rgba(239, 68, 68, 0.8);
}

/* ── Dominance: the leading fill radiates, the trailing fill cools down ── */
.lead-blue.tier-1 .momentum-fill--blue {
  box-shadow:
    inset 0 1px 0 rgba(147, 197, 253, 0.4),
    0 0 8px rgba(59, 130, 246, 0.5);
}
.lead-red.tier-1 .momentum-fill--red {
  box-shadow:
    inset 0 1px 0 rgba(252, 165, 165, 0.4),
    0 0 8px rgba(239, 68, 68, 0.5);
}
.lead-blue.tier-2 .momentum-fill--blue {
  background: linear-gradient(to right, #2563eb, #60a5fa);
  box-shadow:
    inset 0 1px 0 rgba(191, 219, 254, 0.55),
    0 0 14px rgba(59, 130, 246, 0.75);
}
.lead-red.tier-2 .momentum-fill--red {
  background: linear-gradient(to left, #dc2626, #f87171);
  box-shadow:
    inset 0 1px 0 rgba(254, 202, 202, 0.55),
    0 0 14px rgba(239, 68, 68, 0.75);
}
/* Crushing: brightest gradient + light sweep across the leading fill */
.lead-blue.tier-3 .momentum-fill--blue {
  background:
    linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%)
      0 0 / 200% 100% no-repeat,
    linear-gradient(to right, #3b82f6, #93c5fd);
  box-shadow:
    inset 0 1px 0 rgba(219, 234, 254, 0.7),
    0 0 20px rgba(59, 130, 246, 0.95);
  animation: momentum-shimmer 1.8s linear infinite;
}
.lead-red.tier-3 .momentum-fill--red {
  background:
    linear-gradient(-110deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%)
      0 0 / 200% 100% no-repeat,
    linear-gradient(to left, #ef4444, #fca5a5);
  box-shadow:
    inset 0 1px 0 rgba(254, 226, 226, 0.7),
    0 0 20px rgba(239, 68, 68, 0.95);
  animation: momentum-shimmer 1.8s linear infinite;
}
.lead-blue .momentum-fill--red,
.lead-red .momentum-fill--blue {
  filter: saturate(0.75) brightness(0.85);
}
.lead-blue.tier-3 .momentum-fill--red,
.lead-red.tier-3 .momentum-fill--blue {
  filter: saturate(0.45) brightness(0.7);
}

@keyframes momentum-shimmer {
  to {
    background-position: 200% 0, 0 0;
  }
}

/* Crushing tier also haloes the whole track in the leading team's color */
.lead-blue.tier-3 .momentum-track {
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.35);
}
.lead-red.tier-3 .momentum-track {
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
}

/* Meter backdrop tilts toward the leading side once dominance is clear */
.momentum-meter.lead-blue.tier-2,
.momentum-meter.lead-blue.tier-3 {
  background:
    linear-gradient(to right, rgba(59, 130, 246, 0.28), rgba(59, 130, 246, 0) 45%),
    linear-gradient(to left, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0) 25%),
    #0d0c08;
}
.momentum-meter.lead-red.tier-2,
.momentum-meter.lead-red.tier-3 {
  background:
    linear-gradient(to left, rgba(239, 68, 68, 0.28), rgba(239, 68, 68, 0) 45%),
    linear-gradient(to right, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0) 25%),
    #0d0c08;
}

.momentum-center-tick {
  position: absolute;
  left: 50%;
  top: -3px;
  bottom: -3px;
  width: 2px;
  margin-left: -1px;
  background: #e8c040;
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.7);
  pointer-events: none;
  z-index: 1;
}

.momentum-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  line-height: 1;
  color: #e8c040;
  text-shadow:
    0 0 6px rgba(232, 192, 64, 0.9),
    0 1px 2px rgba(0, 0, 0, 0.9);
  transition: left 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 2;
}

@media (prefers-reduced-motion: reduce) {
  .momentum-pct-value,
  .momentum-fill {
    animation: none !important;
  }
}
</style>
