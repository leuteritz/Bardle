<template>
  <Teleport to="body">
    <Transition name="pause-fade">
      <div
        v-if="!windowFocused"
        class="pause-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Spiel pausiert"
      >
        <!-- Ambient particles -->
        <div class="pause-particles">
          <span v-for="i in 12" :key="i" class="particle" :style="particleStyle(i)" />
        </div>

        <div class="pause-card">
          <!-- Ornate top border -->
          <div class="pause-ornament-top" />

          <!-- Corner decorations -->
          <div class="corner corner--tl" />
          <div class="corner corner--tr" />
          <div class="corner corner--bl" />
          <div class="corner corner--br" />

          <!-- Header -->
          <div class="pause-header">
            <div class="pause-header-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </div>
            <h2 class="pause-title">— Pausiert —</h2>
            <div class="pause-header-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </div>
          </div>

          <!-- Divider -->
          <div class="pause-divider">
            <div class="divider-line" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#c89040" stroke="none">
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              />
            </svg>
            <div class="divider-line" />
          </div>

          <!-- Body -->
          <div class="pause-body">
            <p class="pause-subtitle">✦ Klicke ins Spielfenster um fortzufahren ✦</p>

            <!-- Accumulated chimes -->
            <div class="chime-reward">
              <div class="chime-reward-glow" />
              <div class="chime-reward-icon">
                <img src="/img/BardAbilities/BardChime.png" alt="Chime" class="chime-img" />
              </div>
              <div class="chime-reward-text">
                <span class="chime-label">⟡ Gesammelte Chimes</span>
                <span class="chime-value">+{{ formatNumber(accumulatedChimes) }}</span>
                <span class="chime-sublabel">werden beim Weiterspielen gutgeschrieben</span>
              </div>
            </div>

            <!-- Pending level-ups -->
            <div
              v-if="gameStore.pendingAugmentSelections.length > 0"
              class="pause-info pause-info--levelup"
            >
              <div class="info-icon-wrap info-icon-wrap--gold">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </div>
              <span>{{
                gameStore.pendingAugmentSelections.length === 1
                  ? 'Level-Up wartet — wähle dein Augment!'
                  : `${gameStore.pendingAugmentSelections.length} Level-Ups warten auf dich!`
              }}</span>
              <div class="info-badge info-badge--gold">
                {{ gameStore.pendingAugmentSelections.length }}
              </div>
            </div>

            <!-- Bonus stars -->
            <div v-if="pendingStars > 0" class="pause-info pause-info--bonus">
              <div class="info-icon-wrap info-icon-wrap--green">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  />
                </svg>
              </div>
              <span>{{
                pendingStars === 1
                  ? 'Ein Bonus-Sternsystem wartet auf dich!'
                  : `${pendingStars} Bonus-Sternsysteme warten auf dich!`
              }}</span>
              <div class="info-badge info-badge--green">{{ pendingStars }}</div>
            </div>

            <!-- Champion ETA / Ready -->
            <div
              v-if="isChampionTraveling || isChampionReady"
              class="pause-info pause-info--eta"
              :class="{ 'pause-info--ready': isChampionReady }"
            >
              <div
                class="info-icon-wrap"
                :class="isChampionReady ? 'info-icon-wrap--gold' : 'info-icon-wrap--dim'"
              >
                <svg
                  v-if="isChampionTraveling"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <svg
                  v-else
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  />
                </svg>
              </div>
              <span v-if="isChampionTraveling"
                >Champion erreicht Stern in <strong>{{ pauseEtaStr }}</strong></span
              >
              <span v-else>Champion-Stern wartet — kehre ins Spiel zurück!</span>
            </div>

            <!-- Bottom divider -->
            <div class="pause-divider pause-divider--sm">
              <div class="divider-line" />
              <span class="divider-rune">⚔</span>
              <div class="divider-line" />
            </div>

            <!-- Unpause button -->
            <button class="pause-btn" @click="unpause">
              <span class="pause-btn-inner">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Weiterspielen
              </span>
              <div class="pause-btn-shine" />
            </button>
          </div>

          <!-- Ornate bottom border -->
          <div class="pause-ornament-bottom" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useWindowFocus } from '@/composables/useWindowFocus'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/config/numberFormat' // ← Pfad ggf. anpassen

const { windowFocused } = useWindowFocus()
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()

const pendingStars = computed(() => galaxyStore.pendingResourceStars)
const isChampionTraveling = computed(() => galaxyStore.championTravelState === 'traveling')
const isChampionReady = computed(() => galaxyStore.pendingChampionStar)

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

const pauseEtaStr = computed(() => {
  void pauseTick.value
  if (!isChampionTraveling.value) return ''
  const elapsed = Date.now() - galaxyStore.championTravelStartTime
  const remaining = Math.max(0, galaxyStore.championTravelDurationMs - elapsed)
  const s = Math.ceil(remaining / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
})

function unpause() {
  window.focus()
}

function particleStyle(i: number): Record<string, string> {
  const angle = (i / 12) * 360
  const dist = 180 + ((i * 17) % 120)
  const size = 2 + (i % 4)
  const delay = ((i * 0.4) % 3).toFixed(1)
  const duration = (4 + (i % 4)).toFixed(1)
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
/* ─── Overlay ──────────────────────────────────────────────────────────── */
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    ellipse at center,
    rgba(30, 15, 0, 0.88) 0%,
    rgba(0, 0, 0, 0.92) 100%
  );
}

/* ─── Floating particles ───────────────────────────────────────────────── */
.pause-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, #e8c04088 0%, transparent 70%);
  animation: particle-float var(--duration, 5s) ease-in-out var(--delay, 0s) infinite alternate;
  opacity: 0.4;
}

@keyframes particle-float {
  0% {
    transform: translateY(0px) scale(1);
    opacity: 0.25;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-22px) scale(1.3);
    opacity: 0.15;
  }
}

/* ─── Card ─────────────────────────────────────────────────────────────── */
.pause-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 420px;
  max-width: 520px;
  width: 100%;
  background: radial-gradient(ellipse at top, #1e1206 0%, #0e0904 60%), #0e0904;
  border: 3px solid #7a4e20;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 0 30px rgba(200, 144, 64, 0.07),
    0 0 60px rgba(200, 144, 64, 0.15),
    0 32px 80px rgba(0, 0, 0, 0.9);
  border-radius: 6px;
  overflow: hidden;
}

/* ─── Corner decorations ───────────────────────────────────────────────── */
.corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border-color: #c89040;
  border-style: solid;
  z-index: 2;
}
.corner--tl {
  top: 6px;
  left: 6px;
  border-width: 2px 0 0 2px;
}
.corner--tr {
  top: 6px;
  right: 6px;
  border-width: 2px 2px 0 0;
}
.corner--bl {
  bottom: 6px;
  left: 6px;
  border-width: 0 0 2px 2px;
}
.corner--br {
  bottom: 6px;
  right: 6px;
  border-width: 0 2px 2px 0;
}

/* ─── Ornament bars ────────────────────────────────────────────────────── */
.pause-ornament-top {
  height: 6px;
  flex-shrink: 0;
  background: linear-gradient(to right, #3e1a06, #c89040, #f0d060, #e8c040, #c89040, #3e1a06);
}

.pause-ornament-bottom {
  height: 6px;
  flex-shrink: 0;
  background: linear-gradient(to right, #3e1a06, #7a4e20, #c89040, #7a4e20, #3e1a06);
  opacity: 0.7;
}

/* ─── Header ───────────────────────────────────────────────────────────── */
.pause-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 18px 32px 14px;
  background: linear-gradient(to bottom, #1e1208, #111008);
  border-bottom: 2px solid #5c3310;
  color: #e8c040;
}

.pause-header-icon {
  color: rgba(200, 144, 64, 0.6);
  flex-shrink: 0;
}

.pause-title {
  font-size: 1.6rem;
  color: #f0d060;
  margin: 0;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-shadow:
    0 0 20px rgba(240, 208, 96, 0.55),
    0 0 40px rgba(200, 144, 64, 0.25);
}

/* ─── Divider ──────────────────────────────────────────────────────────── */
.pause-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 24px;
  margin: 2px 0;
}
.pause-divider--sm {
  margin: 4px 0 0;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #7a4e2088, #c8904044, #7a4e2088, transparent);
}
.divider-rune {
  font-size: 1rem;
  color: rgba(200, 144, 64, 0.45);
}

/* ─── Body ─────────────────────────────────────────────────────────────── */
.pause-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 28px 22px;
}

.pause-subtitle {
  font-size: 0.9rem;
  color: rgba(200, 185, 140, 0.55);
  margin: 0;
  text-align: center;
  letter-spacing: 0.06em;
}

/* ─── Chime reward ─────────────────────────────────────────────────────── */
.chime-reward {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
  padding: 18px 20px;
  background: linear-gradient(135deg, #1a1008 0%, #140c04 100%);
  border: 2px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 0 20px rgba(200, 144, 64, 0.05);
  overflow: hidden;
}

.chime-reward-glow {
  position: absolute;
  top: -30px;
  right: -30px;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(232, 192, 64, 0.12) 0%, transparent 70%);
  pointer-events: none;
}

.chime-reward-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: #141008;
  border: 2px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 0 14px rgba(200, 144, 64, 0.2);
}

.chime-img {
  width: 42px;
  height: 42px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.4));
}

.chime-reward-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.chime-label {
  font-size: 0.78rem;
  color: rgba(200, 185, 140, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.chime-value {
  font-size: 1.9rem;
  font-weight: 700;
  color: #f0d060;
  text-shadow:
    0 0 16px rgba(240, 208, 96, 0.65),
    0 0 32px rgba(200, 144, 64, 0.3);
  line-height: 1;
  animation: chime-pulse 2.5s ease-in-out infinite;
}

@keyframes chime-pulse {
  0%,
  100% {
    text-shadow:
      0 0 16px rgba(240, 208, 96, 0.55),
      0 0 32px rgba(200, 144, 64, 0.25);
  }
  50% {
    text-shadow:
      0 0 24px rgba(240, 208, 96, 0.85),
      0 0 48px rgba(200, 144, 64, 0.45);
  }
}

.chime-sublabel {
  font-size: 0.75rem;
  color: rgba(200, 185, 140, 0.4);
}

/* ─── Info badges ──────────────────────────────────────────────────────── */
.pause-info {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 14px;
  border-radius: 5px;
  background: rgba(232, 192, 64, 0.04);
  border: 1px solid #5c3310;
  color: rgba(232, 192, 64, 0.5);
  font-size: 0.88rem;
}

.info-icon-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid currentColor;
}
.info-icon-wrap--gold {
  color: #e8c040;
  background: rgba(232, 192, 64, 0.1);
}
.info-icon-wrap--green {
  color: #52b830;
  background: rgba(82, 184, 48, 0.1);
}
.info-icon-wrap--dim {
  color: rgba(232, 192, 64, 0.4);
  background: rgba(232, 192, 64, 0.05);
}

.info-badge {
  margin-left: auto;
  flex-shrink: 0;
  min-width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0 6px;
}
.info-badge--gold {
  background: rgba(232, 192, 64, 0.15);
  color: #f0d060;
  border: 1px solid rgba(232, 192, 64, 0.35);
}
.info-badge--green {
  background: rgba(82, 184, 48, 0.15);
  color: #52b830;
  border: 1px solid rgba(82, 184, 48, 0.35);
}

.pause-info--levelup {
  background: rgba(232, 192, 64, 0.07);
  border-color: rgba(232, 192, 64, 0.35);
  color: #e8c040;
}

.pause-info--bonus {
  background: rgba(30, 140, 80, 0.07);
  border-color: rgba(82, 184, 48, 0.28);
  color: #52b830;
}

.pause-info--eta {
  background: rgba(232, 192, 64, 0.06);
  border-color: rgba(232, 192, 64, 0.22);
  color: rgba(232, 192, 64, 0.75);
}

.pause-info--ready {
  background: rgba(232, 192, 64, 0.11);
  border-color: rgba(232, 192, 64, 0.5);
  color: #f0d060;
  box-shadow: 0 0 12px rgba(240, 208, 96, 0.12);
}

/* ─── Button ───────────────────────────────────────────────────────────── */
.pause-btn {
  position: relative;
  margin-top: 2px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  overflow: hidden;
  border-radius: 5px;
  width: 100%;
  max-width: 240px;
}

.pause-btn-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 36px;
  background: linear-gradient(to bottom, #4aaa28, #2d7818);
  border: 2px solid #6ec040;
  border-radius: 5px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 4px 16px rgba(78, 168, 40, 0.3);
  transition:
    filter 120ms,
    transform 120ms;
  width: 100%;
}

.pause-btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.12), transparent);
  transform: skewX(-20deg);
  transition: left 400ms ease;
}

.pause-btn:hover .pause-btn-inner {
  filter: brightness(1.15);
  transform: translateY(-1px);
}
.pause-btn:hover .pause-btn-shine {
  left: 160%;
}
.pause-btn:active .pause-btn-inner {
  filter: brightness(0.9);
  transform: translateY(1px);
}

/* ─── Transitions ──────────────────────────────────────────────────────── */
.pause-fade-enter-active {
  transition:
    opacity 250ms ease,
    transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pause-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.pause-fade-enter-from,
.pause-fade-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>
