<script setup lang="ts">
import { splitDuration } from '@/utils/ui/format'
import {
  OFFLINE_COUNTER_ANIM_MS,
  OFFLINE_GAIN_FLOAT_MS,
  OFFLINE_PAYOUT_DROP_MS,
  OFFLINE_PAYOUT_TICK_MS,
} from '@/config/constants'
import { ref, watch, computed } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { formatNumber } from '@/config/ui/numberFormat'
import { useOfflineCrossing } from '@/composables/ui/useOfflineCrossing'
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

/** Schriftstufen der Ertragszahl in cqw, nach Zeichenzahl — formatNumber liefert
 *  zwischen einem und acht Zeichen, und „2.97M" darf grösser stehen als „999.99No". */
const COUNT_CQW = [
  { upTo: 4, cqw: 24 },
  { upTo: 5, cqw: 21 },
  { upTo: 6, cqw: 18 },
  { upTo: 7, cqw: 16 },
  { upTo: Infinity, cqw: 14 },
]

const flavourText = ref(FLAVOUR_TEXTS[Math.floor(Math.random() * FLAVOUR_TEXTS.length)])
const displayCount = ref(0)
let animationId = 0
let fxTimer = 0
let gainSeq = 0

/** Einmalig gewürfelt: im Template stünde `Math.random()` in einem Ausdruck und
 *  liefe damit bei jedem Re-Render neu. */
const stars = Array.from({ length: STAR_COUNT }, () => ({
  x: `${Math.random() * 100}%`,
  y: `${Math.random() * 100}%`,
  s: `${0.5 + Math.random() * 1.2}px`,
  d: `${Math.random() * 4}s`,
  op: `${0.25 + Math.random() * 0.45}`,
}))

const crossing = useOfflineCrossing(() => gameStore.offlineChimes)

const hasEarnings = computed(() => gameStore.offlineChimes > 0)
/** 'pop' nach einem Chime-Tor, 'toll' nach dem Void — beides nur ein Ruck. */
const heroFx = ref<'pop' | 'toll' | ''>('')
const gains = ref<{ id: number; text: string }[]>([])

function formatDuration(totalSeconds: number): string {
  const { hours: h, minutes: m, seconds: s } = splitDuration(totalSeconds)
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

const formattedDuration = computed(() => formatDuration(gameStore.offlineSeconds))

/** Der Zwilling, der die Breite hält — die Zahl zappelt sonst beim Hochzählen,
 *  MedievalSharp hat keine Tabellenziffern. */
const countGhost = computed(() =>
  crossing.restingPayouts.value
    .map(formatNumber)
    .reduce((widest, text) => (text.length > widest.length ? text : widest), '0'),
)
const countText = computed(() => formatNumber(displayCount.value))
const countCqw = computed(
  () => COUNT_CQW.find((step) => countGhost.value.length <= step.upTo)?.cqw ?? 14,
)

const multLabel = computed(() => `×${crossing.multiplier.value.toFixed(2)}`)

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function animateCount(target: number, duration: number) {
  cancelAnimationFrame(animationId)
  const from = displayCount.value
  const delta = target - from
  const start = performance.now()
  function step(now: number) {
    const progress = Math.min((now - start) / duration, 1)
    displayCount.value = Math.floor(from + easeOutCubic(progress) * delta)
    if (progress < 1) animationId = requestAnimationFrame(step)
    else displayCount.value = target
  }
  animationId = requestAnimationFrame(step)
}

// Rein visueller Nachlauf: der Rückruf fasst nur lokalen Zustand an, nie den
// Store — deshalb echte Zeit statt gameTimeout().
function flashHero(kind: 'pop' | 'toll') {
  clearTimeout(fxTimer)
  heroFx.value = ''
  requestAnimationFrame(() => {
    heroFx.value = kind
    fxTimer = window.setTimeout(() => {
      heroFx.value = ''
    }, OFFLINE_GAIN_FLOAT_MS)
  })
}

function pushGain(pct: number) {
  const id = ++gainSeq
  gains.value.push({ id, text: `+${pct}%` })
  window.setTimeout(() => {
    gains.value = gains.value.filter((g) => g.id !== id)
  }, OFFLINE_GAIN_FLOAT_MS)
}

/** Die Ertragszahl IST das Spielfeedback: sie steigt mit jedem Tor und fällt am Void. */
watch(
  () => crossing.multiplier.value,
  (now, before) => {
    if (now === before) return
    const up = now > before
    animateCount(crossing.payout.value, up ? OFFLINE_PAYOUT_TICK_MS : OFFLINE_PAYOUT_DROP_MS)
    flashHero(up ? 'pop' : 'toll')
    if (up) pushGain(Math.round((now - before) * 100))
  },
)

watch(
  () => gameStore.showOfflineModal,
  (visible) => {
    if (visible) {
      flavourText.value = FLAVOUR_TEXTS[Math.floor(Math.random() * FLAVOUR_TEXTS.length)]
      crossing.reset()
      gains.value = []
      heroFx.value = ''
      displayCount.value = 0
      animateCount(gameStore.offlineChimes, OFFLINE_COUNTER_ANIM_MS)
    } else {
      cancelAnimationFrame(animationId)
      clearTimeout(fxTimer)
      crossing.dispose()
      displayCount.value = 0
      gains.value = []
      heroFx.value = ''
    }
  },
  { immediate: true },
)

function claim(multiplier: number) {
  cancelAnimationFrame(animationId)
  clearTimeout(fxTimer)
  crossing.dispose()
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
              <span class="away-t">
                Away for <span class="away-value">{{ formattedDuration }}</span>
              </span>
            </div>

            <div class="count-wrap" :style="`--count-cqw:${countCqw}`">
              <span
                v-if="hasEarnings"
                class="count-halo"
                :class="{ 'count-halo--toll': crossing.outcome.value === 'void' }"
                aria-hidden="true"
              />

              <div class="count-stack">
                <span class="count-ghost" aria-hidden="true">{{ countGhost }}</span>
                <span
                  class="count-live"
                  :class="{
                    'count-live--zero': !hasEarnings,
                    'count-live--toll': crossing.outcome.value === 'void',
                    'count-live--pop': heroFx === 'pop',
                    'count-live--shake': heroFx === 'toll',
                  }"
                >
                  {{ countText }}
                </span>
              </div>

              <span
                v-for="gain in gains"
                :key="gain.id"
                class="count-gain"
                aria-hidden="true"
                >{{ gain.text }}</span
              >
            </div>

            <div v-if="hasEarnings" class="count-sub">
              <span class="sub-base">base {{ formatNumber(gameStore.offlineChimes) }}</span>
              <span class="sub-dot">&middot;</span>
              <span class="sub-mult" :class="{ 'sub-mult--on': crossing.opened.value > 0 }">
                {{ multLabel }} banked
              </span>
              <span v-if="crossing.gainPct.value > 0" class="sub-chip">
                +{{ crossing.gainPct.value }}%
              </span>
            </div>
            <div v-else class="count-sub count-sub--empty">No chimes were kept</div>

            <p class="flavour">
              {{ hasEarnings ? flavourText : 'Build shrines for idle income' }}
            </p>
          </div>

          <OfflineCrossing v-if="hasEarnings" :game="crossing" @claim="claim(crossing.multiplier.value)" />

          <div v-else class="fallback-foot">
            <button class="claim-btn" type="button" @click="claim(1)">
              <span class="claim-t">Continue</span>
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
  background: rgba(0, 0, 0, 0.88);
}

/* ── Modal shell ───────────────────────────────────────── */
.offline-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(840px, 94vw);
  max-height: 94vh;
  overflow-y: auto;
  /* Die Ertragszahl und die Tore messen gegen DIESEN Rahmen, nie gegen den
     Viewport — auf 4K wüchse die Zahl sonst aus dem Fenster. */
  container-type: inline-size;
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
  padding: 30px 40px 20px;
  gap: 6px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.away-eyebrow {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  font-size: 0.76rem;
  color: rgba(200, 185, 140, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

.away-eyebrow::before,
.away-eyebrow::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #5c3310, transparent);
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
  width: 470px;
  height: 205px;
  margin: -102px 0 0 -235px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(232, 192, 64, 0.4) 0%, transparent 68%);
  pointer-events: none;
  animation: count-breathe 2.4s ease-in-out infinite alternate;
}

.count-halo--toll {
  background: radial-gradient(ellipse, rgba(138, 111, 208, 0.4) 0%, transparent 68%);
}

@keyframes count-breathe {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}

/* Zwilling und Zahl teilen sich EIN Gridfeld: die Breite steht, der Wert läuft. */
.count-stack {
  position: relative;
  display: grid;
  font-size: clamp(2.8rem, calc(var(--count-cqw) * 1cqw), 11rem);
  line-height: 1;
  letter-spacing: -0.02em;
}

.count-ghost,
.count-live {
  grid-area: 1 / 1;
  text-align: center;
}

.count-ghost {
  visibility: hidden;
}

.count-live {
  color: #e8c040;
  text-shadow: 0 0 28px rgba(232, 192, 64, 0.42);
}

.count-live--zero {
  color: rgba(200, 185, 140, 0.3);
  text-shadow: none;
}

/* Harter Wechsel, keine Transition auf `color` — der Ruck läuft daneben. */
.count-live--toll {
  color: #8a6fd0;
  text-shadow: 0 0 28px rgba(138, 111, 208, 0.4);
}

.count-live--pop {
  animation: count-pop 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.count-live--shake {
  animation: count-shake 0.42s ease-out;
}

@keyframes count-pop {
  0% {
    transform: scale(1);
  }
  38% {
    transform: scale(1.09);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes count-shake {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-7px);
  }
  55% {
    transform: translateX(5px);
  }
  100% {
    transform: translateX(0);
  }
}

.count-gain {
  position: absolute;
  left: 50%;
  top: 0;
  font-size: 1.5rem;
  color: #e8c040;
  pointer-events: none;
  animation: gain-float 0.9s ease-out forwards;
}

@keyframes gain-float {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  30% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translate(-50%, -46px);
  }
}

/* ── Unterzeile ────────────────────────────────────────── */
.count-sub {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 4px;
  font-size: 0.82rem;
  color: rgba(200, 185, 140, 0.45);
}

.count-sub--empty {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.75rem;
}

.sub-dot {
  color: rgba(200, 185, 140, 0.24);
}

.sub-mult--on {
  color: rgba(232, 192, 64, 0.8);
}

.sub-chip {
  padding: 2px 8px 3px;
  border-radius: 4px;
  background: #23180a;
  border: 1px solid rgba(232, 192, 64, 0.4);
  color: #e8c040;
  font-size: 0.76rem;
}

/* ── Flavour ───────────────────────────────────────────── */
.flavour {
  position: relative;
  font-size: 0.82rem;
  color: rgba(200, 185, 140, 0.38);
  text-align: center;
  font-style: italic;
  margin: 4px 0 0;
}

/* ── Fußleiste ohne Ertrag ─────────────────────────────── */
.fallback-foot {
  position: relative;
  z-index: 1;
  padding: 18px 28px 22px;
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

/* ── Flacher Viewport ──────────────────────────────────── */
@media (max-height: 900px) {
  .hero-section {
    padding: 20px 40px 14px;
  }

  .count-stack {
    font-size: clamp(2.4rem, calc(var(--count-cqw) * 0.78cqw), 7.5rem);
  }

  .count-halo {
    height: 130px;
    margin-top: -65px;
  }
}

/* ── Reduced motion ────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .star,
  .count-halo,
  .count-live--pop,
  .count-live--shake,
  .count-gain {
    animation: none;
  }
  .count-gain {
    display: none;
  }
  .claim-btn,
  .offline-fade-enter-active,
  .offline-fade-leave-active {
    transition: opacity 0.15s;
  }
  .claim-btn:hover,
  .claim-btn:active {
    transform: none;
  }
}
</style>
