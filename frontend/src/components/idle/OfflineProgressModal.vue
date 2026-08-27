<script setup lang="ts">
import { splitDuration } from '@/utils/ui/format'
import { OFFLINE_COUNTER_ANIM_MS, OFFLINE_CROSSING_START_DELAY_MS } from '@/config/constants'
import { ref, watch, computed } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { formatNumber } from '@/config/ui/numberFormat'
import OfflineCrossing from './OfflineCrossing.vue'

const gameStore = useGameStore()

const FLAVOUR_TEXTS = [
  'The chimes rang on.',
  'Bard wandered. The cosmos worked.',
  'Even the stars kept time.',
  'The universe remembered you.',
  'Silence is never truly empty.',
]

const STAR_COUNT = 20

const flavourText = ref(FLAVOUR_TEXTS[Math.floor(Math.random() * FLAVOUR_TEXTS.length)])
const displayCount = ref(0)
let animationId = 0
let crossingTimer = 0

/** Einmalig gewürfelt: im Template stünde `Math.random()` in einem Ausdruck und
 *  liefe damit bei jedem Re-Render neu. */
const stars = Array.from({ length: STAR_COUNT }, () => ({
  x: `${Math.random() * 100}%`,
  y: `${Math.random() * 100}%`,
  s: `${0.5 + Math.random() * 1.2}px`,
  d: `${Math.random() * 4}s`,
  op: `${0.25 + Math.random() * 0.45}`,
}))

const crossingVisible = ref(false)

function formatDuration(totalSeconds: number): string {
  const { hours: h, minutes: m, seconds: s } = splitDuration(totalSeconds)
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
  const duration = OFFLINE_COUNTER_ANIM_MS
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
      crossingVisible.value = false
      if (gameStore.offlineChimes > 0) {
        crossingTimer = window.setTimeout(() => {
          crossingVisible.value = true
        }, OFFLINE_CROSSING_START_DELAY_MS)
      }
    } else {
      cancelAnimationFrame(animationId)
      clearTimeout(crossingTimer)
      displayCount.value = 0
      crossingVisible.value = false
    }
  },
  { immediate: true },
)

function claim(multiplier: number) {
  cancelAnimationFrame(animationId)
  clearTimeout(crossingTimer)
  gameStore.claimOfflineReward(multiplier)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="offline-fade">
      <div v-if="gameStore.showOfflineModal" class="offline-overlay">
        <div class="offline-modal">

          <!-- Hero -->
          <div class="hero-section">
            <div class="stars" aria-hidden="true">
              <span
                v-for="(star, n) in stars"
                :key="n"
                class="star"
                :style="`--x:${star.x};--y:${star.y};--s:${star.s};--d:${star.d};--op:${star.op}`"
              />
            </div>

            <div class="away-eyebrow">
              Away for <span class="away-value">{{ formattedDuration }}</span>
            </div>

            <div class="count-wrap">
              <span v-if="gameStore.offlineChimes > 0" class="count-halo" aria-hidden="true" />
              <div
                class="chime-count"
                :class="{ 'chime-count--zero': gameStore.offlineChimes === 0 }"
              >
                {{ formatNumber(displayCount) }}
              </div>
            </div>

            <div v-if="gameStore.offlineChimes > 0" class="chime-sublabel">Chimes collected</div>
            <div v-else class="chime-sublabel chime-sublabel--hint">
              Build shrines for idle income
            </div>

            <p class="flavour">{{ flavourText }}</p>
          </div>

          <Transition name="mg-slide" mode="out-in">
            <OfflineCrossing
              v-if="crossingVisible"
              :chimes="gameStore.offlineChimes"
              @claim="claim"
            />
            <div v-else class="fallback-foot">
              <button class="claim-btn" type="button" @click="claim(1)">
                <span class="claim-t">Claim</span>
              </button>
            </div>
          </Transition>
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
  background: rgba(0, 0, 0, 0.88);
}

/* ── Modal shell ───────────────────────────────────────── */
.offline-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(600px, 94vw);
  max-height: 94vh;
  overflow-y: auto;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 24px 64px rgba(0, 0, 0, 0.9);
}

/* ── Cosmic stars ──────────────────────────────────────── */
.stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: clip;
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
  padding: 34px 40px 18px;
  gap: 8px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.away-eyebrow {
  position: relative;
  font-size: 0.75rem;
  color: rgba(200, 185, 140, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.away-value {
  color: rgba(200, 160, 80, 0.85);
}

.count-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Eigene Ebene mit statischem Schein — animiert wird nur ihre Deckkraft;
   ein `text-shadow`-Keyframe rastert jeden Frame die ganze Zeile neu. */
.count-halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 260px;
  height: 120px;
  margin: -60px 0 0 -130px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(232, 192, 64, 0.4) 0%, transparent 68%);
  pointer-events: none;
  animation: count-breathe 2.4s ease-in-out infinite alternate;
}

@keyframes count-breathe {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}

.chime-count {
  position: relative;
  font-size: clamp(3.2rem, 10vw, 5rem);
  color: #e8c040;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 24px rgba(232, 192, 64, 0.4);
}

.chime-count--zero {
  color: rgba(200, 185, 140, 0.3);
  text-shadow: none;
}

.chime-sublabel {
  position: relative;
  font-size: 0.75rem;
  color: rgba(200, 185, 140, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.chime-sublabel--hint {
  font-style: italic;
  text-transform: none;
  letter-spacing: 0;
}

/* ── Flavour ───────────────────────────────────────────── */
.flavour {
  position: relative;
  font-size: 0.8rem;
  color: rgba(200, 185, 140, 0.38);
  text-align: center;
  font-style: italic;
  margin: 2px 0 0;
}

/* ── Fallback-Fußleiste (kein Ertrag, oder vor den Toren) ── */
.fallback-foot {
  position: relative;
  z-index: 1;
  padding: 16px 24px 20px;
}

.claim-btn {
  width: 100%;
  padding: 15px 0;
  border-radius: 4px;
  border: 1px solid #6ec040;
  cursor: pointer;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #fff;
  box-shadow: 0 2px 16px rgba(42, 104, 20, 0.5);
  transition:
    filter 0.15s ease,
    transform 0.1s ease;
}

.claim-t {
  font-size: 1.05rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.claim-btn:hover {
  filter: brightness(1.18);
  transform: translateY(-1px);
}

.claim-btn:active {
  filter: brightness(0.88);
  transform: translateY(0);
}

/* ── Übergang zu den Toren ─────────────────────────────── */
.mg-slide-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.mg-slide-leave-active {
  transition: opacity 0.18s ease;
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
  .count-halo {
    animation: none;
  }
  .claim-btn,
  .offline-fade-enter-active,
  .offline-fade-leave-active,
  .mg-slide-enter-active,
  .mg-slide-leave-active {
    transition: opacity 0.15s;
  }
  .claim-btn:hover,
  .claim-btn:active {
    transform: none;
  }
}
</style>
