<template>
  <div class="bottom-connector" aria-hidden="true">
    <div class="bottom-connector-bg" />

    <div class="status-bar">
      <div class="stats-left">
        <div class="stat-item">
          <span class="stat-icon">♪</span>
          <span class="stat-label">CHIMES</span>
          <span class="stat-value" :class="{ flash: chimesFlash }">{{ fmtChimes }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-icon">⚡</span>
          <span class="stat-label">CPS</span>
          <span class="stat-value">{{ fmtCPS }}/s</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-icon">★</span>
          <span class="stat-label">LEVEL</span>
          <span class="stat-value">{{ level }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-icon">∞</span>
          <span class="stat-label">UNIVERSE</span>
          <span class="stat-value">U{{ currentUniverse }}</span>
        </div>
      </div>

      <div class="title-center">BARDLE</div>

      <div class="stats-right">
        <div class="stat-item">
          <span class="stat-icon">❤</span>
          <span class="stat-label">HP</span>
          <span class="stat-value" :class="{ 'hp-low': isLowHP }">{{ currentHP }}/{{ maxHP }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-icon">⚔</span>
          <span class="stat-label">RANK</span>
          <span class="stat-value">{{ rankLabel }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-icon">▲</span>
          <span class="stat-label">W/L</span>
          <span class="stat-value">{{ totalWins }}</span>
          <span class="stat-sep">/</span>
          <span class="stat-value loss">{{ totalLosses }}</span>
        </div>
        <div class="stat-divider" v-if="currentWinStreak > 0" />
        <div class="stat-item" v-if="currentWinStreak > 0">
          <span class="stat-icon">🔥</span>
          <span class="stat-label">STREAK</span>
          <span class="stat-value streak">{{ currentWinStreak }}W</span>
        </div>
      </div>
    </div>

    <svg
      class="bottom-connector-frame"
      viewBox="0 0 1200 24"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="bottomConnectorGoldGlow" x="-8%" y="-300%" width="116%" height="700%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="strongGlow" x="-20%" y="-500%" width="140%" height="1100%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="rgba(10,4,0,0.98)"
        stroke-width="7"
        stroke-linecap="round"
      />
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="#6b3e14"
        stroke-width="4"
        stroke-linecap="round"
      />
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="#c8900a"
        stroke-width="2.5"
        stroke-linecap="round"
        filter="url(#bottomConnectorGoldGlow)"
      />
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="rgba(255,215,60,0.95)"
        stroke-width="1.2"
        stroke-linecap="round"
        filter="url(#strongGlow)"
      />
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="rgba(255,245,180,0.35)"
        stroke-width="0.7"
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, getCurrentInstance } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useBattleStore } from '@/stores/battleStore'

const gameStore = useGameStore()
const playerStore = usePlayerStore()
const battleStore = useBattleStore()

const { chimes, chimesPerSecond, level, currentUniverse } = storeToRefs(gameStore)
const { currentHP, maxHP } = storeToRefs(playerStore)
const { currentRank, currentWinStreak, totalWins, totalLosses } = storeToRefs(battleStore)

const instance = getCurrentInstance()
const fmt = instance?.appContext.config.globalProperties.$formatNumber as
  | ((n: number) => string)
  | undefined

const fmtChimes = computed(() => (fmt ? fmt(chimes.value) : Math.floor(chimes.value).toString()))
const fmtCPS = computed(() => (fmt ? fmt(chimesPerSecond.value) : chimesPerSecond.value.toFixed(1)))

const rankLabel = computed(() => {
  const { tier, division } = currentRank.value
  if (tier === 'Master' || tier === 'Grandmaster' || tier === 'Challenger') return tier
  return `${tier} ${division}`
})

const isLowHP = computed(() => currentHP.value / maxHP.value < 0.25)

const chimesFlash = ref(false)
watch(chimes, (newVal, oldVal) => {
  if (newVal > oldVal) {
    chimesFlash.value = true
    setTimeout(() => (chimesFlash.value = false), 600)
  }
})
</script>

<style scoped>
.bottom-connector {
  position: fixed;
  left: 458px;
  right: 458px;
  bottom: 48px;
  height: 24px;
  z-index: 10001;
  pointer-events: none;
  overflow: visible;
}

.bottom-connector-bg {
  position: absolute;
  left: 0;
  right: 0;
  top: 9px;
  bottom: -80px;
  background: #1a0d04;
  z-index: 0;
}

.bottom-connector-frame {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 24px;
  overflow: visible;
  animation: connector-pulse-glow 3.5s ease-in-out infinite;
}

/*
  Geometrie:
  - .bottom-connector hat height: 24px
  - Goldlinie liegt bei top: 9px (Mitte des SVG y:12 scaled auf 24px height)
  - .bottom-connector-bg geht von top:9px bis bottom:-80px
    → brauner Bereich: 9px bis (24px + 80px) = 104px → 80px hoch unterhalb der Linie
  - Mitte des braunen Bereichs: 9px + 40px = 49px von Komponenten-Oberkante
  - status-bar height: 36px → top = 49px - 18px = 31px
    Laut Screenshot zu tief → Elemente erscheinen unterhalb der Linie.
    Fix: top: 13px positioniert die Bar direkt ab der Goldlinie nach unten,
    sodass die Inhalte knapp unter der Linie mittig im sichtbaren Bereich liegen.
*/
.status-bar {
  position: absolute;
  top: 25px;
  left: 0;
  right: 0;
  height: 36px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  pointer-events: none;
}

.title-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  color: #e8c040;
  font-size: 30px;
  letter-spacing: 10px;
  white-space: nowrap;
  text-shadow:
    0 0 2px #fffbe8,
    0 0 5px #ffe060,
    0 0 12px rgba(232, 192, 64, 1),
    0 0 24px rgba(210, 155, 30, 0.85),
    0 0 45px rgba(180, 120, 16, 0.6),
    0 0 80px rgba(140, 90, 10, 0.35);
  animation: title-flicker 6s ease-in-out infinite;
}

.stats-left,
.stats-right {
  display: flex;
  align-items: center;
  gap: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 18px;
}

.stat-divider {
  width: 1px;
  height: 18px;
  background: linear-gradient(
    to bottom,
    transparent,
    #5c3210 30%,
    #7a4818 50%,
    #5c3210 70%,
    transparent
  );
  flex-shrink: 0;
}

.stat-icon {
  font-size: 13px;
  color: #9a6830;
  line-height: 1;
  filter: drop-shadow(0 0 3px rgba(200, 140, 40, 0.7));
}

.stat-label {
  font-size: 9px;
  color: #6a4418;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  line-height: 1;
  margin-right: 1px;
}

.stat-value {
  font-size: 15px;
  color: #d4a838;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-shadow:
    0 0 4px rgba(220, 170, 50, 0.8),
    0 0 10px rgba(200, 140, 30, 0.5);
  transition:
    color 0.3s ease,
    text-shadow 0.3s ease;
}

.stat-sep {
  font-size: 12px;
  color: #5c3a14;
  line-height: 1;
}

.stat-value.flash {
  color: #60d838;
  text-shadow:
    0 0 6px rgba(80, 220, 50, 0.9),
    0 0 14px rgba(60, 200, 40, 0.6);
}

.stat-value.hp-low {
  color: #e06050;
  text-shadow:
    0 0 6px rgba(220, 80, 60, 0.9),
    0 0 14px rgba(180, 50, 40, 0.6);
  animation: hp-pulse 1s ease-in-out infinite;
}

.stat-value.loss {
  color: #a04848;
  text-shadow: 0 0 4px rgba(160, 60, 60, 0.6);
}

.stat-value.streak {
  color: #f0d040;
  text-shadow:
    0 0 5px rgba(255, 210, 50, 0.9),
    0 0 12px rgba(230, 170, 30, 0.65);
}

@keyframes connector-pulse-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 8px rgba(180, 130, 28, 0.5)) drop-shadow(0 0 3px rgba(90, 58, 10, 0.7));
  }
  50% {
    filter: drop-shadow(0 0 20px rgba(220, 170, 45, 0.8))
      drop-shadow(0 0 8px rgba(140, 95, 18, 0.85)) drop-shadow(0 0 35px rgba(180, 130, 28, 0.4));
  }
}

@keyframes title-flicker {
  0%,
  92%,
  100% {
    opacity: 1;
  }
  94% {
    opacity: 0.85;
  }
  96% {
    opacity: 1;
  }
  98% {
    opacity: 0.9;
  }
}

@keyframes hp-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.65;
  }
}
</style>
