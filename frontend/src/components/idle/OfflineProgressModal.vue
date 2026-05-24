<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/config/numberFormat'
import OfflineMinigame from './OfflineMinigame.vue'

const gameStore = useGameStore()

const FLAVOUR_TEXTS = [
  'The chimes rang on.',
  'Bard wandered. The cosmos worked.',
  'Even the stars kept time.',
  'The universe remembered you.',
  'Silence is never truly empty.',
]

const flavourText = ref(FLAVOUR_TEXTS[Math.floor(Math.random() * FLAVOUR_TEXTS.length)])
const displayCount = ref(0)
let animationId = 0
let minigameTimer = 0

type MinigamePhase = 'waiting' | 'playing' | 'won' | 'lost'
const minigamePhase = ref<MinigamePhase>('waiting')
const rewardMultiplier = ref<1 | 2>(1)

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

const formattedDuration = computed(() => formatDuration(gameStore.offlineSeconds))

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function startCounterAnimation(target: number) {
  cancelAnimationFrame(animationId)
  displayCount.value = 0
  const duration = 2000
  const start = performance.now()
  function step(now: number) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    displayCount.value = Math.floor(easeOutCubic(progress) * target)
    if (progress < 1) {
      animationId = requestAnimationFrame(step)
    } else {
      displayCount.value = target
    }
  }
  animationId = requestAnimationFrame(step)
}

watch(
  () => gameStore.showOfflineModal,
  (visible) => {
    if (visible) {
      flavourText.value = FLAVOUR_TEXTS[Math.floor(Math.random() * FLAVOUR_TEXTS.length)]
      startCounterAnimation(gameStore.offlineChimes)
      minigamePhase.value = 'waiting'
      rewardMultiplier.value = 1
      if (gameStore.offlineChimes > 0) {
        minigameTimer = window.setTimeout(() => {
          minigamePhase.value = 'playing'
        }, 2100)
      }
    } else {
      cancelAnimationFrame(animationId)
      clearTimeout(minigameTimer)
      displayCount.value = 0
      minigamePhase.value = 'waiting'
      rewardMultiplier.value = 1
    }
  },
  { immediate: true },
)

function onWin() {
  rewardMultiplier.value = 2
  minigamePhase.value = 'won'
}

function onSkip() {
  rewardMultiplier.value = 1
  minigamePhase.value = 'lost'
}

function claim() {
  cancelAnimationFrame(animationId)
  clearTimeout(minigameTimer)
  gameStore.claimOfflineReward(rewardMultiplier.value)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="offline-fade">
      <div v-if="gameStore.showOfflineModal" class="offline-overlay">
        <div class="offline-modal">
          <!-- Cosmic star particles -->
          <div class="stars" aria-hidden="true">
            <span
              v-for="n in 28"
              :key="n"
              class="star"
              :style="`--x:${Math.random() * 100}%;--y:${Math.random() * 100}%;--s:${0.5 + Math.random() * 1.2}px;--d:${Math.random() * 4}s;--op:${0.3 + Math.random() * 0.5}`"
            />
          </div>

          <!-- Hero: Chime count -->
          <div class="hero-section">
            <div class="chime-glyph" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="32" cy="52" rx="10" ry="3" fill="rgba(232,192,64,0.18)" />
                <path
                  d="M32 8C20 8 14 18 14 30c0 8 4 14 8 18h20c4-4 8-10 8-18C50 18 44 8 32 8z"
                  fill="url(#bg)"
                  stroke="#c89040"
                  stroke-width="1.5"
                />
                <path d="M28 56h8" stroke="#c89040" stroke-width="2" stroke-linecap="round" />
                <circle cx="32" cy="10" r="2.5" fill="#e8c040" />
                <defs>
                  <linearGradient
                    id="bg"
                    x1="32"
                    y1="8"
                    x2="32"
                    y2="56"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stop-color="#3a2008" />
                    <stop offset="100%" stop-color="#1a0e04" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div
              class="chime-count"
              :class="{ 'chime-count--zero': gameStore.offlineChimes === 0 }"
            >
              {{ formatNumber(displayCount) }}
            </div>

            <div v-if="gameStore.offlineChimes > 0" class="chime-sublabel">Chimes collected</div>
            <div v-else class="chime-sublabel chime-sublabel--hint">
              Build shrines for idle income
            </div>
          </div>

          <!-- Away duration -->
          <div class="away-row">
            <span class="away-label">Away for</span>
            <span class="away-value">{{ formattedDuration }}</span>
          </div>

          <!-- Flavour -->
          <p class="flavour">{{ flavourText }}</p>

          <!-- Minigame zone -->
          <Transition name="mg-slide">
            <div v-if="minigamePhase === 'playing'" class="minigame-zone">
              <OfflineMinigame @win="onWin" @skip="onSkip" />
            </div>
            <div v-else-if="minigamePhase === 'won'" class="result-badge result-badge--win">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Double reward!
            </div>
            <div v-else-if="minigamePhase === 'lost'" class="result-badge result-badge--lose">
              Normal reward
            </div>
          </Transition>

          <!-- Claim -->
          <div class="footer">
            <button
              class="claim-btn"
              :class="{
                'claim-btn--double': minigamePhase === 'won',
                'claim-btn--waiting': minigamePhase === 'playing',
              }"
              :disabled="minigamePhase === 'playing'"
              @click="claim"
            >
              <span v-if="minigamePhase === 'won'">Claim ×2</span>
              <span v-else-if="minigamePhase === 'playing'">Waiting…</span>
              <span v-else>Claim</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ──────────────────────────────────────────── */
.offline-overlay {
  position: fixed;
  inset: 0;
  z-index: 9997;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(3px);
}

/* ── Modal shell ───────────────────────────────────────── */
.offline-modal {
  position: relative;
  width: min(420px, 94vw);
  background: #0d0a05;
  border: 1px solid rgba(200, 144, 64, 0.35);
  border-radius: 6px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(92, 51, 16, 0.5),
    0 32px 80px rgba(0, 0, 0, 0.95),
    inset 0 1px 0 rgba(232, 192, 64, 0.08);
  padding: 0 0 28px;
}

/* ── Cosmic stars ──────────────────────────────────────── */
.stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.star {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  background: #e8c040;
  opacity: var(--op);
  animation: twinkle var(--d) ease-in-out infinite alternate;
}

@keyframes twinkle {
  from {
    opacity: calc(var(--op) * 0.3);
    transform: scale(0.7);
  }
  to {
    opacity: var(--op);
    transform: scale(1.2);
  }
}

/* ── Hero section ──────────────────────────────────────── */
.hero-section {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 32px 20px;
  gap: 8px;
}

.chime-glyph {
  width: 52px;
  height: 52px;
  margin-bottom: 4px;
  filter: drop-shadow(0 0 12px rgba(232, 192, 64, 0.45));
}

.chime-count {
  font-size: clamp(3rem, 12vw, 4.5rem);
  font-weight: 900;
  color: #e8c040;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  animation: count-glow 2s ease-in-out infinite;
}

.chime-count--zero {
  color: rgba(200, 185, 140, 0.3);
  animation: none;
}

.chime-sublabel {
  font-size: 0.72rem;
  color: rgba(200, 185, 140, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.chime-sublabel--hint {
  font-style: italic;
  text-transform: none;
  letter-spacing: 0;
}

@keyframes count-glow {
  0%,
  100% {
    text-shadow: 0 0 20px rgba(232, 192, 64, 0.4);
  }
  50% {
    text-shadow:
      0 0 40px rgba(232, 192, 64, 0.75),
      0 0 80px rgba(232, 192, 64, 0.2);
  }
}

/* ── Away row ──────────────────────────────────────────── */
.away-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  padding: 0 32px 4px;
}

.away-label {
  font-size: 0.75rem;
  color: rgba(200, 185, 140, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.away-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: rgba(200, 160, 80, 0.8);
}

/* ── Flavour ───────────────────────────────────────────── */
.flavour {
  position: relative;
  z-index: 1;
  font-size: 0.78rem;
  color: rgba(200, 185, 140, 0.38);
  text-align: center;
  font-style: italic;
  padding: 0 40px;
  margin: 0 0 20px;
  max-width: 100%;
}

/* ── Minigame zone ─────────────────────────────────────── */
.minigame-zone {
  position: relative;
  z-index: 1;
  padding: 0 24px 4px;
}

.result-badge {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0 24px 4px;
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.result-badge--win {
  background: rgba(80, 192, 40, 0.1);
  border: 1px solid rgba(80, 192, 40, 0.3);
  color: #6ec040;
  text-shadow: 0 0 12px rgba(110, 192, 64, 0.6);
}

.result-badge--lose {
  background: rgba(200, 185, 140, 0.05);
  border: 1px solid rgba(200, 185, 140, 0.12);
  color: rgba(200, 185, 140, 0.45);
}

/* ── Footer / Claim ────────────────────────────────────── */
.footer {
  position: relative;
  z-index: 1;
  padding: 16px 24px 0;
}

.claim-btn {
  width: 100%;
  padding: 14px 0;
  border-radius: 4px;
  border: none;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    filter 0.15s ease,
    transform 0.1s ease;
  background: linear-gradient(to bottom, #4aaa28, #2a6814);
  color: #fff;
  box-shadow: 0 2px 16px rgba(42, 104, 20, 0.5);
}

.claim-btn:hover:not(:disabled) {
  filter: brightness(1.18);
  transform: translateY(-1px);
}

.claim-btn:active:not(:disabled) {
  filter: brightness(0.88);
  transform: translateY(0);
}

.claim-btn--double {
  background: linear-gradient(to bottom, #66cc38, #38a018);
  box-shadow:
    0 2px 20px rgba(80, 200, 40, 0.65),
    0 0 40px rgba(80, 200, 40, 0.2);
  animation: pulse-green 1.4s ease-in-out infinite;
}

@keyframes pulse-green {
  0%,
  100% {
    box-shadow:
      0 2px 20px rgba(80, 200, 40, 0.65),
      0 0 40px rgba(80, 200, 40, 0.2);
  }
  50% {
    box-shadow:
      0 2px 28px rgba(80, 200, 40, 0.9),
      0 0 60px rgba(80, 200, 40, 0.35);
  }
}

.claim-btn--waiting {
  opacity: 0.35;
  cursor: not-allowed;
  animation: none;
}

/* ── Minigame transition ───────────────────────────────── */
.mg-slide-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.mg-slide-leave-active {
  transition: opacity 0.2s ease;
}
.mg-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.mg-slide-leave-to {
  opacity: 0;
}

/* ── Modal entrance ────────────────────────────────────── */
.offline-fade-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.offline-fade-leave-active {
  transition: opacity 0.22s ease;
}
.offline-fade-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(12px);
}
.offline-fade-leave-to {
  opacity: 0;
}

/* ── Reduced motion ────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .star,
  .chime-count,
  .claim-btn--double {
    animation: none;
  }
  .claim-btn,
  .offline-fade-enter-active,
  .offline-fade-leave-active,
  .mg-slide-enter-active,
  .mg-slide-leave-active {
    transition: opacity 0.15s;
  }
}
</style>
