<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const emit = defineEmits<{
  win: []
  skip: []
}>()

type Phase = 'playing' | 'result-win' | 'result-lose'

/* Geometry (SVG units, viewBox 0 0 280 280, center 140) */
const CENTER = 140
const MAX_R = 126
const BAND_MIN = 0.66
const BAND_MAX = 0.86
const PULSE_MS = 1700
const MAX_PULSES = 6

const phase = ref<Phase>('playing')
const t = ref(0)
const pulsesLeft = ref(MAX_PULSES)

let rafId = 0
let pulseStart = 0

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const waveRadius = computed(() => t.value * MAX_R)
const waveOpacity = computed(() => {
  if (t.value < 0.08) return t.value / 0.08
  return Math.max(0, 1 - Math.pow(t.value, 3) * 0.55)
})
const inBand = computed(() => t.value >= BAND_MIN && t.value <= BAND_MAX)

const bandInner = BAND_MIN * MAX_R
const bandOuter = BAND_MAX * MAX_R
const bandMid = (bandInner + bandOuter) / 2
const bandWidth = bandOuter - bandInner

function loop(now: number) {
  if (!pulseStart) pulseStart = now
  const elapsed = now - pulseStart
  if (elapsed >= PULSE_MS) {
    pulsesLeft.value -= 1
    if (pulsesLeft.value <= 0) {
      finish(false, 400)
      return
    }
    pulseStart = now
    t.value = 0
  } else {
    t.value = elapsed / PULSE_MS
  }
  rafId = requestAnimationFrame(loop)
}

function finish(won: boolean, delay: number) {
  cancelAnimationFrame(rafId)
  phase.value = won ? 'result-win' : 'result-lose'
  setTimeout(() => (won ? emit('win') : emit('skip')), delay)
}

function strike() {
  if (phase.value !== 'playing') return
  finish(inBand.value, inBand.value ? 800 : 600)
}

function skip() {
  if (phase.value !== 'playing') return
  finish(false, 300)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault()
    strike()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if (reducedMotion) {
    // Static wave inside the golden band: a click always succeeds.
    t.value = (BAND_MIN + BAND_MAX) / 2
  } else {
    rafId = requestAnimationFrame(loop)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="resonance">
    <p class="hint">
      Strike when the wave meets the <strong>golden ring</strong>
    </p>

    <button
      type="button"
      class="disc"
      :class="{
        'disc--win': phase === 'result-win',
        'disc--lose': phase === 'result-lose',
      }"
      :disabled="phase !== 'playing'"
      aria-label="Resonance game: press Space or click when the expanding wave crosses the golden ring"
      @click="strike"
    >
      <svg viewBox="0 0 280 280" class="disc-svg" aria-hidden="true">
        <!-- Backdrop disc -->
        <circle :cx="CENTER" :cy="CENTER" :r="MAX_R + 2" class="disc-bg" />

        <!-- Golden target band -->
        <circle
          :cx="CENTER"
          :cy="CENTER"
          :r="bandMid"
          class="band-fill"
          :class="{ 'band-fill--hot': inBand && phase === 'playing' }"
          :stroke-width="bandWidth"
        />
        <circle :cx="CENTER" :cy="CENTER" :r="bandInner" class="band-edge" />
        <circle :cx="CENTER" :cy="CENTER" :r="bandOuter" class="band-edge" />

        <!-- Expanding wave -->
        <circle
          :cx="CENTER"
          :cy="CENTER"
          :r="Math.max(waveRadius, 1)"
          class="wave"
          :class="{
            'wave--win': phase === 'result-win',
            'wave--lose': phase === 'result-lose',
          }"
          :style="{ opacity: phase === 'playing' ? waveOpacity : 1 }"
        />

        <!-- Center chime -->
        <g class="chime" transform="translate(116, 114) scale(0.75)">
          <path
            d="M32 8C20 8 14 18 14 30c0 8 4 14 8 18h20c4-4 8-10 8-18C50 18 44 8 32 8z"
            class="chime-body"
          />
          <path d="M28 56h8" class="chime-stroke" />
          <circle cx="32" cy="10" r="2.5" class="chime-top" />
        </g>
      </svg>

      <!-- Result overlay -->
      <Transition name="result-fade">
        <div v-if="phase === 'result-win'" class="result result--win">
          <span class="result-big">×2</span>
          <span class="result-sub">Perfect resonance</span>
        </div>
        <div v-else-if="phase === 'result-lose'" class="result result--lose">
          <span class="result-sub">Out of tune…</span>
        </div>
      </Transition>
    </button>

    <div class="footer">
      <div class="pulses" aria-label="Remaining waves">
        <span
          v-for="n in MAX_PULSES"
          :key="n"
          class="pulse-dot"
          :class="{ 'pulse-dot--spent': n > pulsesLeft }"
        />
      </div>
      <button v-if="phase === 'playing'" class="skip-btn" type="button" @click.stop="skip">
        Skip — standard reward
      </button>
    </div>
  </div>
</template>

<style scoped>
.resonance {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.hint {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 185, 140, 0.55);
}

.hint strong {
  color: var(--rpg-gold, #e8c040);
  font-weight: 700;
}

/* ── Disc ─────────────────────────────────────────────── */
.disc {
  position: relative;
  width: min(280px, 62vw);
  aspect-ratio: 1;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.disc:focus-visible .disc-bg {
  stroke: var(--rpg-gold, #e8c040);
  stroke-width: 2;
}

.disc:disabled {
  cursor: default;
}

.disc-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.disc-bg {
  fill: #150e06;
  stroke: rgba(92, 51, 16, 0.7);
  stroke-width: 1;
}

/* ── Golden band ──────────────────────────────────────── */
.band-fill {
  fill: none;
  stroke: rgba(232, 192, 64, 0.09);
  transition: stroke 0.12s ease;
}

.band-fill--hot {
  stroke: rgba(232, 192, 64, 0.2);
}

.band-edge {
  fill: none;
  stroke: rgba(232, 192, 64, 0.45);
  stroke-width: 1;
  stroke-dasharray: 3 5;
  animation: band-breathe 2.4s ease-in-out infinite alternate;
}

@keyframes band-breathe {
  from {
    stroke: rgba(232, 192, 64, 0.3);
  }
  to {
    stroke: rgba(232, 192, 64, 0.65);
  }
}

/* ── Wave ─────────────────────────────────────────────── */
.wave {
  fill: none;
  stroke: var(--rpg-gold, #e8c040);
  stroke-width: 3;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.7));
}

.wave--win {
  stroke: var(--rpg-green-border, #6ec040);
  filter: drop-shadow(0 0 10px rgba(110, 192, 64, 0.9));
}

.wave--lose {
  stroke: var(--rpg-red, #cc6050);
  filter: drop-shadow(0 0 6px rgba(204, 96, 80, 0.7));
}

/* ── Chime glyph ──────────────────────────────────────── */
.chime-body {
  fill: #2a1808;
  stroke: var(--rpg-gold-dim, #c89040);
  stroke-width: 1.5;
}

.chime-stroke {
  stroke: var(--rpg-gold-dim, #c89040);
  stroke-width: 2;
  stroke-linecap: round;
}

.chime-top {
  fill: var(--rpg-gold, #e8c040);
}

.chime {
  filter: drop-shadow(0 0 10px rgba(232, 192, 64, 0.35));
}

/* ── Result feedback ──────────────────────────────────── */
.disc--win .disc-bg {
  stroke: rgba(110, 192, 64, 0.6);
}

.disc--lose .disc-bg {
  stroke: rgba(204, 96, 80, 0.5);
}

.disc--lose {
  animation: disc-shake 0.35s ease-out;
}

@keyframes disc-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  50% {
    transform: translateX(5px);
  }
  75% {
    transform: translateX(-3px);
  }
}

.result {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 50%;
  pointer-events: none;
}

.result--win {
  background: radial-gradient(circle, rgba(82, 184, 48, 0.22) 0%, transparent 70%);
  color: #7ee050;
  text-shadow: 0 0 16px rgba(110, 192, 64, 0.9);
}

.result--lose {
  background: radial-gradient(circle, rgba(204, 96, 80, 0.14) 0%, transparent 70%);
  color: #e07060;
  text-shadow: 0 0 8px rgba(204, 96, 80, 0.5);
}

.result-big {
  font-size: 2.6rem;
  font-weight: 900;
  line-height: 1;
}

.result-sub {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.result-fade-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.result-fade-enter-from {
  opacity: 0;
  transform: scale(0.92);
}

/* ── Footer ───────────────────────────────────────────── */
.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 52px;
}

.pulses {
  display: flex;
  gap: 7px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(232, 192, 64, 0.6);
  transition:
    background 0.3s,
    transform 0.3s;
}

.pulse-dot--spent {
  background: rgba(200, 185, 140, 0.15);
  transform: scale(0.7);
}

.skip-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: rgba(200, 185, 140, 0.35);
  cursor: pointer;
  transition: color 0.2s;
}

.skip-btn:hover {
  color: rgba(200, 185, 140, 0.65);
}

/* ── Reduced motion ───────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .band-edge {
    animation: none;
  }
  .disc--lose {
    animation: none;
  }
}
</style>
