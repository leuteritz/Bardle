<template>
  <Teleport to="body">
    <Transition name="pause-fade">
      <div
        v-if="!windowFocused"
        class="pause-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        @click.self="unpause"
      >
        <!-- Cosmic star particles -->
        <div class="pause-particles" aria-hidden="true">
          <span v-for="i in 20" :key="i" class="particle" :style="particleStyle(i)" />
        </div>

        <div class="pause-card">
          <div class="card-top-glow" aria-hidden="true" />

          <!-- Title -->
          <div class="pause-header">
            <span class="pause-title">Paused</span>
            <span class="pause-hint">Click anywhere to resume</span>
          </div>

          <!-- HP Hero -->
          <div class="hp-block" :class="hpBlockClass">
            <div class="hp-top">
              <Icon icon="game-icons:hearts" width="16" height="16" class="hp-icon" style="color: #cc6050" aria-hidden="true" />
              <span class="hp-numbers">
                <span class="hp-current" :class="hpColor">{{
                  Math.round(playerStore.currentHP)
                }}</span>
                <span class="hp-sep">/</span>
                <span class="hp-max">{{ playerStore.maxHP }}</span>
              </span>
              <span class="hp-badge" :class="hpBadgeClass">{{ hpStatusText }}</span>
            </div>
            <div class="hp-bar-track">
              <div class="hp-bar-fill" :class="hpColor" :style="{ width: hpPercent + '%' }" />
              <div v-if="hpPercent <= 25" class="hp-danger-pulse" />
            </div>
          </div>

          <!-- Chimes -->
          <div class="chime-block">
            <div class="chime-icon-wrap">
              <img src="/img/BardAbilities/BardChime.png" alt="Chime" class="chime-img" />
            </div>
            <div class="chime-info">
              <span class="chime-label">Chimes while paused</span>
              <span class="chime-value">+{{ formatNumber(accumulatedChimes) }}</span>
            </div>
          </div>

          <!-- Notification badges -->
          <div v-if="hasNotifications" class="notif-row">
            <div
              v-if="gameStore.pendingAugmentSelections.length > 0"
              class="notif-pill notif-pill--gold"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
              Level-Up ×{{ gameStore.pendingAugmentSelections.length }}
            </div>
            <div v-if="pendingStars > 0" class="notif-pill notif-pill--green">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                />
              </svg>
              Stars ×{{ pendingStars }}
            </div>
            <div v-if="pauseKills > 0" class="notif-pill notif-pill--red">
              ☠ Kills ×{{ pauseKills }}
            </div>
            <div v-if="pauseMaterialEntries.length > 0" class="notif-pill notif-pill--teal">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                />
              </svg>
              {{ pauseMaterialEntries.length }} Materials
            </div>
          </div>

          <!-- Continue -->
          <button class="continue-btn" @click="unpause">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Continue
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useWindowFocus } from '@/composables/useWindowFocus'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { formatNumber } from '@/config/numberFormat'
import { MATERIALS } from '@/config/materials'

const { windowFocused } = useWindowFocus()
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
const playerStore = usePlayerStore()

const pendingStars = computed(() => galaxyStore.pendingResourceStars)
const hpPercent = computed(() => playerStore.hpPercent)

const hpColor = computed(() => {
  if (hpPercent.value > 50) return 'hp--green'
  if (hpPercent.value > 25) return 'hp--yellow'
  return 'hp--red'
})

const hpBlockClass = computed(() => {
  if (hpPercent.value <= 25) return 'hp-block--crit'
  return ''
})

const hpBadgeClass = computed(() => {
  if (hpPercent.value > 75) return 'hp-badge--great'
  if (hpPercent.value > 50) return 'hp-badge--good'
  if (hpPercent.value > 25) return 'hp-badge--warn'
  return 'hp-badge--crit'
})

const hpStatusText = computed(() => {
  if (hpPercent.value > 75) return 'GOOD'
  if (hpPercent.value > 50) return 'STABLE'
  if (hpPercent.value > 25) return 'WEAKENED'
  return 'CRITICAL'
})

const pauseStartChimes = ref(0)
const pauseTick = ref(0)
let pauseInterval: ReturnType<typeof setInterval> | null = null

watch(
  windowFocused,
  (focused) => {
    if (!focused) {
      gameStore.setPauseState(true)
      pauseStartChimes.value = gameStore.chimes
      pauseInterval = setInterval(() => {
        pauseTick.value++
      }, 1000)
    } else {
      gameStore.setPauseState(false)
      if (pauseInterval !== null) {
        clearInterval(pauseInterval)
        pauseInterval = null
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (pauseInterval !== null) clearInterval(pauseInterval)
})

const accumulatedChimes = computed(() => {
  void pauseTick.value
  return Math.max(0, gameStore.chimes - pauseStartChimes.value)
})

const pauseKills = computed(() => gameStore.pauseStats.kills)
const pauseMaterialEntries = computed(() =>
  Object.entries(gameStore.pauseStats.materialsEarned).map(([id, amount]) => {
    const mat = MATERIALS.find((m) => m.id === id)
    return { id, amount, name: mat?.name ?? id, image: mat?.image ?? null }
  }),
)

const hasNotifications = computed(
  () =>
    gameStore.pendingAugmentSelections.length > 0 ||
    pendingStars.value > 0 ||
    pauseKills.value > 0 ||
    pauseMaterialEntries.value.length > 0,
)

function unpause() {
  window.focus()
}

function particleStyle(i: number): Record<string, string> {
  const angle = (i / 20) * 360
  const dist = 160 + ((i * 23) % 160)
  const size = 2 + (i % 5)
  const delay = ((i * 0.35) % 3).toFixed(1)
  const duration = (3.5 + (i % 5)).toFixed(1)
  const x = Math.cos((angle * Math.PI) / 180) * dist
  const y = Math.sin((angle * Math.PI) / 180) * dist
  return {
    '--x': `${x}px`,
    '--y': `${y}px`,
    '--size': `${size}px`,
    '--delay': `${delay}s`,
    '--duration': `${duration}s`,
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  }
}
</script>

<style scoped>
/* ── Overlay ──────────────────────────────────────────── */
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    ellipse at 50% 30%,
    rgba(60, 20, 0, 0.68) 0%,
    rgba(0, 0, 0, 0.92) 70%
  );
  backdrop-filter: blur(4px);
}

/* ── Particles ────────────────────────────────────────── */
.pause-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, #e8c04099 0%, transparent 70%);
  animation: particle-float var(--duration, 5s) ease-in-out var(--delay, 0s) infinite alternate;
  opacity: 0.35;
}
@keyframes particle-float {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.2;
  }
  50% {
    opacity: 0.55;
  }
  100% {
    transform: translateY(-28px) scale(1.4);
    opacity: 0.1;
  }
}

/* ── Card ─────────────────────────────────────────────── */
.pause-card {
  position: relative;
  z-index: 1;
  width: min(400px, 92vw);
  background: #0d0a05;
  border: 1px solid rgba(200, 144, 64, 0.4);
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(92, 51, 16, 0.5),
    0 32px 80px rgba(0, 0, 0, 0.95),
    inset 0 1px 0 rgba(232, 192, 64, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 0 24px;
}

.card-top-glow {
  height: 4px;
  background: linear-gradient(
    to right,
    #2a0e00,
    #7a3a10,
    #c89040,
    #f0d060,
    #c89040,
    #7a3a10,
    #2a0e00
  );
  flex-shrink: 0;
}

/* ── Header ───────────────────────────────────────────── */
.pause-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 20px 24px 4px;
}
.pause-title {
  font-size: clamp(2rem, 8vw, 2.8rem);
  font-weight: 900;
  color: #f0d060;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-shadow:
    0 0 28px rgba(240, 208, 96, 0.55),
    0 0 60px rgba(200, 144, 64, 0.25);
  line-height: 1;
}
.pause-hint {
  font-size: 0.72rem;
  color: rgba(200, 185, 140, 0.38);
  letter-spacing: 0.08em;
  font-style: italic;
}

/* ── HP Block ─────────────────────────────────────────── */
.hp-block {
  margin: 0 20px;
  padding: 18px 20px 16px;
  background: #110c05;
  border: 1px solid rgba(200, 144, 64, 0.28);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}
.hp-block--crit {
  border-color: rgba(204, 96, 80, 0.55);
  box-shadow:
    0 0 20px rgba(204, 96, 80, 0.15),
    inset 0 0 20px rgba(204, 96, 80, 0.05);
  animation: crit-border-pulse 0.9s ease-in-out infinite alternate;
}
@keyframes crit-border-pulse {
  from {
    box-shadow: 0 0 12px rgba(204, 96, 80, 0.15);
  }
  to {
    box-shadow: 0 0 28px rgba(204, 96, 80, 0.35);
  }
}

.hp-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hp-icon {
  font-size: 1.1rem;
  animation: heartbeat 1.6s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  14% {
    transform: scale(1.22);
  }
  28% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.15);
  }
  56% {
    transform: scale(1);
  }
}

.hp-numbers {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex: 1;
}
.hp-current {
  font-size: clamp(1.8rem, 6vw, 2.4rem);
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  transition: color 0.4s ease;
}
.hp-sep {
  font-size: 1rem;
  color: rgba(200, 185, 140, 0.25);
}
.hp-max {
  font-size: 0.95rem;
  color: rgba(200, 185, 140, 0.4);
}
.hp-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 3px 8px;
  border-radius: 3px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.hp-badge--great {
  background: rgba(82, 184, 48, 0.15);
  color: #62d840;
  border: 1px solid rgba(82, 184, 48, 0.4);
}
.hp-badge--good {
  background: rgba(82, 184, 48, 0.1);
  color: #7ec050;
  border: 1px solid rgba(82, 184, 48, 0.25);
}
.hp-badge--warn {
  background: rgba(212, 160, 32, 0.15);
  color: #d4a020;
  border: 1px solid rgba(212, 160, 32, 0.35);
}
.hp-badge--crit {
  background: rgba(204, 96, 80, 0.18);
  color: #e05040;
  border: 1px solid rgba(204, 96, 80, 0.45);
  animation: crit-blink 0.9s step-start infinite;
}
@keyframes crit-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* HP Bar */
.hp-bar-track {
  position: relative;
  width: 100%;
  height: 14px;
  background: #060402;
  border: 1px solid rgba(62, 32, 10, 0.9);
  border-radius: 4px;
  overflow: hidden;
}
.hp-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition:
    width 600ms cubic-bezier(0.25, 1, 0.5, 1),
    background 600ms ease;
  position: relative;
}
.hp-bar-fill::after {
  content: '';
  position: absolute;
  inset: 2px 4px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.18), transparent);
  border-radius: 2px;
  pointer-events: none;
}
.hp-danger-pulse {
  position: absolute;
  inset: 0;
  background: rgba(204, 96, 80, 0.18);
  animation: danger-pulse 0.8s ease-in-out infinite alternate;
  z-index: 2;
  pointer-events: none;
}
@keyframes danger-pulse {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* HP color fills */
.hp--green {
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.45);
}
.hp--yellow {
  background: linear-gradient(to right, #7a5010, #d4a020);
  box-shadow: 0 0 8px rgba(212, 160, 32, 0.45);
}
.hp--red {
  background: linear-gradient(to right, #6a1a10, #cc6050);
  box-shadow: 0 0 8px rgba(204, 96, 80, 0.55);
}

/* HP current text colors */
.hp-current.hp--green {
  color: #62d840;
}
.hp-current.hp--yellow {
  color: #e8c040;
}
.hp-current.hp--red {
  color: #e06050;
}

/* ── Chime Block ──────────────────────────────────────── */
.chime-block {
  margin: 0 20px;
  padding: 16px 20px;
  background: #110c05;
  border: 1px solid rgba(200, 144, 64, 0.28);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.chime-icon-wrap {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0c0804;
  border: 1px solid rgba(200, 144, 64, 0.35);
  border-radius: 5px;
  box-shadow: 0 0 14px rgba(200, 144, 64, 0.18);
}
.chime-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.5));
}
.chime-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chime-label {
  font-size: 0.7rem;
  color: rgba(200, 185, 140, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.chime-value {
  font-size: clamp(1.6rem, 5vw, 2.2rem);
  font-weight: 900;
  color: #f0d060;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 20px rgba(240, 208, 96, 0.6),
    0 0 40px rgba(200, 144, 64, 0.25);
  animation: chime-glow 2.5s ease-in-out infinite;
}
@keyframes chime-glow {
  0%,
  100% {
    text-shadow:
      0 0 16px rgba(240, 208, 96, 0.5),
      0 0 32px rgba(200, 144, 64, 0.2);
  }
  50% {
    text-shadow:
      0 0 28px rgba(240, 208, 96, 0.85),
      0 0 56px rgba(200, 144, 64, 0.45);
  }
}

/* ── Notification pills ───────────────────────────────── */
.notif-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 0 20px;
}
.notif-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  border: 1px solid;
}
.notif-pill--gold {
  background: rgba(232, 192, 64, 0.1);
  border-color: rgba(232, 192, 64, 0.35);
  color: #e8c040;
}
.notif-pill--green {
  background: rgba(82, 184, 48, 0.1);
  border-color: rgba(82, 184, 48, 0.3);
  color: #62d840;
}
.notif-pill--red {
  background: rgba(204, 96, 80, 0.1);
  border-color: rgba(204, 96, 80, 0.35);
  color: #e06050;
}
.notif-pill--teal {
  background: rgba(64, 192, 180, 0.08);
  border-color: rgba(64, 192, 180, 0.28);
  color: #40c8be;
}

/* ── Continue Button ──────────────────────────────────── */
.continue-btn {
  margin: 4px 20px 0;
  padding: 13px 0;
  width: calc(100% - 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(to bottom, #4aaa28, #2d7818);
  border: 1px solid #6ec040;
  border-radius: 5px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 2px 16px rgba(78, 168, 40, 0.4);
  transition:
    filter 0.15s ease,
    transform 0.1s ease;
}
.continue-btn:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}
.continue-btn:active {
  filter: brightness(0.9);
  transform: translateY(0);
}

/* ── Transitions ──────────────────────────────────────── */
.pause-fade-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.pause-fade-leave-active {
  transition: opacity 0.18s ease;
}
.pause-fade-enter-from {
  opacity: 0;
  transform: scale(0.93) translateY(10px);
}
.pause-fade-leave-to {
  opacity: 0;
}

/* ── Reduced motion ───────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .particle,
  .hp-icon,
  .chime-value,
  .hp-danger-pulse,
  .hp-block--crit {
    animation: none;
  }
  .continue-btn,
  .pause-fade-enter-active,
  .pause-fade-leave-active {
    transition: opacity 0.15s;
  }
}
</style>
