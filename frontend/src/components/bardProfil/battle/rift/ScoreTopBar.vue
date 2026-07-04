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
        <span class="stat"><img src="/img/dragon.png" alt="Drakes" class="stat-img" /> {{ battleStore.team1Drakes + battleStore.team1Barons }}</span>
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
        <span class="stat">{{ battleStore.team2Drakes + battleStore.team2Barons }} <img src="/img/dragon.png" alt="Drakes" class="stat-img" /></span>
        <span class="stat" title="Inhibitors destroyed">{{ battleStore.team2Inhibs }} <Icon icon="game-icons:floating-crystal" width="14" height="14" class="stat-icon stat-icon--inhib" /></span>
        <span class="stat" title="Turrets destroyed">{{ battleStore.team2Turrets }} <Icon icon="game-icons:watchtower" width="14" height="14" class="stat-icon" /></span>
      </div>
    </div>
  </div>

  <!-- Live victory momentum meter -->
  <div class="momentum-meter" :class="{ 'is-shifting': isShifting }">
    <div class="momentum-row">
      <div class="momentum-pct momentum-pct--blue" :class="{ 'is-dominant': bluePercent >= highThreshold }">
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
      <div class="momentum-pct momentum-pct--red" :class="{ 'is-dominant': bluePercent <= lowThreshold }">
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
  MOMENTUM_LOW_THRESHOLD,
  MOMENTUM_DELTA_CHIP_MS,
} from '@/config/constants'

const battleStore = useBattleStore()
const bluePercent = computed(() => Math.round(battleStore.liveWinMomentum * 100))
const highThreshold = MOMENTUM_HIGH_THRESHOLD * 100
const lowThreshold = MOMENTUM_LOW_THRESHOLD * 100

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
.score-bar {
  display: flex;
  align-items: stretch;
  height: 60px;
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
  gap: 14px;
  padding: 0 18px;
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
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.side-name--blue { color: #93c5fd; }
.side-name--red { color: #fca5a5; }

.side-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
  font-size: 14px;
  color: #8ab0e0;
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
  width: 17px;
  height: 17px;
  border-radius: 50%;
  object-fit: cover;
}

.center {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 22px;
  background: #0d0c08;
  border-left: 2px solid #3e200a;
  border-right: 2px solid #3e200a;
  flex-shrink: 0;
}

.kills {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  min-width: 44px;
  text-align: center;
}
.kills--blue { color: #93c5fd; }
.kills--red { color: #fca5a5; }

.timer-block {
  text-align: center;
}
.timer-eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  color: #6a5820;
}
.timer-value {
  font-size: 22px;
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
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 14px;
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
  width: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.momentum-pct--red {
  justify-content: flex-start;
}

.momentum-pct-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  transition: text-shadow 0.4s ease;
}
.momentum-pct--blue .momentum-pct-value {
  color: #93c5fd;
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.35);
}
.momentum-pct--red .momentum-pct-value {
  color: #fca5a5;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.35);
}
.momentum-pct--blue.is-dominant .momentum-pct-value {
  text-shadow:
    0 0 10px rgba(59, 130, 246, 0.9),
    0 0 24px rgba(59, 130, 246, 0.5);
}
.momentum-pct--red.is-dominant .momentum-pct-value {
  text-shadow:
    0 0 10px rgba(239, 68, 68, 0.9),
    0 0 24px rgba(239, 68, 68, 0.5);
}

.momentum-delta {
  position: absolute;
  top: 50%;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 6px rgba(0, 0, 0, 0.8);
  animation: momentum-delta-fade 1.2s ease-out forwards;
}
.momentum-delta--blue {
  left: 10px;
  color: #d9f7ea;
}
.momentum-delta--red {
  right: 10px;
  color: #ffe3e0;
}

@keyframes momentum-delta-fade {
  0% {
    opacity: 1;
    transform: translateY(calc(-50% + 3px));
  }
  60% {
    opacity: 1;
    transform: translateY(-50%);
  }
  100% {
    opacity: 0;
    transform: translateY(calc(-50% - 4px));
  }
}

.momentum-track {
  position: relative;
  flex: 1;
  height: 22px;
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
    box-shadow 0.4s ease;
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
  font-size: 18px;
  line-height: 1;
  color: #e8c040;
  text-shadow:
    0 0 6px rgba(232, 192, 64, 0.9),
    0 1px 2px rgba(0, 0, 0, 0.9);
  transition: left 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 2;
}
</style>
