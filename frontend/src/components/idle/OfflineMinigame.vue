<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  win: []
  skip: []
}>()

type Phase = 'playing' | 'result-win' | 'result-lose'

const GREEN_MIN = 35
const GREEN_MAX = 65
const COUNTDOWN_SECONDS = 8

const phase = ref<Phase>('playing')
const timeLeft = ref(COUNTDOWN_SECONDS)
const indicatorRef = ref<HTMLDivElement | null>(null)
const trackRef = ref<HTMLDivElement | null>(null)

let countdownId = 0

function getIndicatorPercent(): number {
  const indicator = indicatorRef.value
  const track = trackRef.value
  if (!indicator || !track) return 50

  const trackRect = track.getBoundingClientRect()
  const indicatorRect = indicator.getBoundingClientRect()
  const indicatorCenter = indicatorRect.left + indicatorRect.width / 2 - trackRect.left
  return (indicatorCenter / trackRect.width) * 100
}

function lock() {
  if (phase.value !== 'playing') return
  clearInterval(countdownId)

  const pos = getIndicatorPercent()
  const isWin = pos >= GREEN_MIN && pos <= GREEN_MAX

  phase.value = isWin ? 'result-win' : 'result-lose'

  setTimeout(() => {
    if (isWin) {
      emit('win')
    } else {
      emit('skip')
    }
  }, 800)
}

function skip() {
  if (phase.value !== 'playing') return
  clearInterval(countdownId)
  phase.value = 'result-lose'
  setTimeout(() => emit('skip'), 400)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault()
    lock()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  countdownId = window.setInterval(() => {
    timeLeft.value -= 1
    if (timeLeft.value <= 0) {
      clearInterval(countdownId)
      if (phase.value === 'playing') {
        phase.value = 'result-lose'
        setTimeout(() => emit('skip'), 400)
      }
    }
  }, 1000)
})

onUnmounted(() => {
  clearInterval(countdownId)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="minigame-wrap">
    <!-- Ambient spark particles -->
    <div class="sparks" aria-hidden="true">
      <span v-for="i in 8" :key="i" class="spark" :style="`--i:${i}`" />
    </div>

    <!-- Header -->
    <div class="mg-header">
      <span class="mg-icon">⚔️</span>
      <p class="mg-hint">Triff die goldene Zone für <strong>doppelte Beute!</strong></p>
      <span class="mg-icon">⚔️</span>
    </div>

    <!-- Track -->
    <div
      ref="trackRef"
      class="track"
      :class="{
        'track--locked': phase !== 'playing',
        'track--win': phase === 'result-win',
        'track--lose': phase === 'result-lose',
      }"
      tabindex="0"
      role="button"
      aria-label="Timing-Spiel: Klicke wenn der Balken in der grünen Zone ist"
      @click="lock"
    >
      <!-- Scanline overlay -->
      <div class="scanlines" aria-hidden="true" />

      <!-- Zone markers -->
      <div class="zone-label zone-label--left" aria-hidden="true">◀</div>
      <div class="zone" />
      <div class="zone-label zone-label--right" aria-hidden="true">▶</div>

      <!-- Tick marks -->
      <div class="ticks" aria-hidden="true">
        <span v-for="t in 20" :key="t" class="tick" :style="`left:${(t / 20) * 100}%`" />
      </div>

      <!-- The moving indicator -->
      <div
        ref="indicatorRef"
        class="indicator"
        :class="{
          'indicator--win': phase === 'result-win',
          'indicator--lose': phase === 'result-lose',
          'indicator--paused': phase !== 'playing',
        }"
      >
        <span class="indicator-glow" />
      </div>

      <!-- Result overlay -->
      <Transition name="result-fade">
        <div v-if="phase === 'result-win'" class="result-overlay result-overlay--win">
          <span class="result-icon">✦</span>
          Perfekter Treffer! ×2
          <span class="result-icon">✦</span>
        </div>
        <div v-else-if="phase === 'result-lose'" class="result-overlay result-overlay--lose">
          Knapp vorbei…
        </div>
      </Transition>
    </div>

    <!-- Footer -->
    <div class="mg-footer">
      <div class="mg-timer-wrap">
        <svg class="timer-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle class="timer-ring__bg" cx="18" cy="18" r="15" />
          <circle
            class="timer-ring__fill"
            cx="18"
            cy="18"
            r="15"
            :class="{ 'timer-ring__fill--urgent': timeLeft <= 3 }"
            :style="`stroke-dashoffset: ${94.25 - (timeLeft / COUNTDOWN_SECONDS) * 94.25}`"
          />
        </svg>
        <span class="mg-timer" :class="{ 'mg-timer--urgent': timeLeft <= 3 }">
          {{ timeLeft }}
        </span>
      </div>

      <button v-if="phase === 'playing'" class="skip-btn" type="button" @click.stop="skip">
        Überspringen
        <span class="skip-arrow">→</span>
        <span class="skip-sub">einfache Belohnung</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ─── Layout ──────────────────────────────────────────────── */
.minigame-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 4px 0 2px;
  overflow: hidden;
}

/* ─── Ambient sparks ──────────────────────────────────────── */
.sparks {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.spark {
  position: absolute;
  bottom: 0;
  left: calc(var(--i) * 12% + 4%);
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #e8c040;
  opacity: 0;
  animation: sparkRise calc(2s + var(--i) * 0.3s) ease-in infinite;
  animation-delay: calc(var(--i) * 0.4s);
}

@keyframes sparkRise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  15% {
    opacity: 0.7;
  }
  80% {
    opacity: 0.2;
  }
  100% {
    transform: translateY(-60px) scale(0.3);
    opacity: 0;
  }
}

/* ─── Header ──────────────────────────────────────────────── */
.mg-header {
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1;
}

.mg-icon {
  font-size: 0.8rem;
  opacity: 0.6;
  animation: iconPulse 2s ease-in-out infinite alternate;
}

@keyframes iconPulse {
  from {
    opacity: 0.4;
    transform: scale(0.95);
  }
  to {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.mg-hint {
  font-size: 0.72rem;
  color: rgba(200, 185, 140, 0.65);
  text-align: center;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  z-index: 1;
}

.mg-hint strong {
  color: #e8c040;
  font-weight: 700;
}

/* ─── Track ───────────────────────────────────────────────── */
.track {
  position: relative;
  width: 100%;
  height: 56px;
  background: linear-gradient(180deg, #1e1308 0%, #140d05 100%);
  border: 1px solid #5c3310;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  box-shadow:
    inset 0 1px 0 rgba(232, 192, 64, 0.06),
    0 2px 12px rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.track:focus-visible {
  border-color: #e8c040;
  box-shadow: 0 0 0 2px rgba(232, 192, 64, 0.3);
}

.track--locked {
  cursor: default;
}

.track--win {
  border-color: #6ec040;
  box-shadow:
    0 0 16px rgba(110, 192, 64, 0.25),
    inset 0 0 20px rgba(110, 192, 64, 0.08);
  animation: trackWinPulse 0.6s ease-out;
}

.track--lose {
  border-color: #cc6050;
  box-shadow: 0 0 12px rgba(204, 96, 80, 0.2);
  animation: trackShake 0.35s ease-out;
}

@keyframes trackWinPulse {
  0% {
    box-shadow: 0 0 0px rgba(110, 192, 64, 0);
  }
  50% {
    box-shadow: 0 0 28px rgba(110, 192, 64, 0.45);
  }
  100% {
    box-shadow: 0 0 16px rgba(110, 192, 64, 0.25);
  }
}

@keyframes trackShake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-4px);
  }
  40% {
    transform: translateX(4px);
  }
  60% {
    transform: translateX(-3px);
  }
  80% {
    transform: translateX(2px);
  }
}

/* ─── Scanlines ───────────────────────────────────────────── */
.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.12) 3px,
    rgba(0, 0, 0, 0.12) 4px
  );
  pointer-events: none;
  z-index: 1;
}

/* ─── Ticks ───────────────────────────────────────────────── */
.ticks {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(92, 51, 16, 0.35);
}

/* ─── Zone ────────────────────────────────────────────────── */
.zone {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 35%;
  width: 30%;
  background: linear-gradient(180deg, rgba(110, 192, 64, 0.22) 0%, rgba(82, 184, 48, 0.12) 100%);
  border: 1px solid rgba(110, 192, 64, 0.55);
  border-radius: 3px;
  z-index: 3;
  box-shadow: inset 0 0 8px rgba(110, 192, 64, 0.1);
  animation: zonePulse 2.5s ease-in-out infinite alternate;
}

@keyframes zonePulse {
  from {
    border-color: rgba(110, 192, 64, 0.4);
    box-shadow: inset 0 0 6px rgba(110, 192, 64, 0.08);
  }
  to {
    border-color: rgba(110, 192, 64, 0.75);
    box-shadow: inset 0 0 14px rgba(110, 192, 64, 0.18);
  }
}

.zone-label {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.55rem;
  color: rgba(110, 192, 64, 0.5);
  z-index: 4;
  pointer-events: none;
}

.zone-label--left {
  left: calc(35% - 10px);
}
.zone-label--right {
  left: calc(65% + 3px);
}

/* ─── Indicator ───────────────────────────────────────────── */
.indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  width: 5px;
  background: linear-gradient(180deg, #f0d060, #e8c040, #c8a030);
  border-radius: 3px;
  box-shadow:
    0 0 6px rgba(232, 192, 64, 0.7),
    0 0 14px rgba(232, 192, 64, 0.3);
  animation: sweep 1.4s ease-in-out infinite alternate;
  z-index: 5;
}

.indicator-glow {
  position: absolute;
  inset: -4px -6px;
  background: radial-gradient(ellipse, rgba(232, 192, 64, 0.35) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.indicator--paused {
  animation-play-state: paused;
}

.indicator--win {
  background: linear-gradient(180deg, #90e050, #6ec040, #50a030);
  box-shadow:
    0 0 10px rgba(110, 192, 64, 1),
    0 0 24px rgba(110, 192, 64, 0.5);
}

.indicator--lose {
  background: linear-gradient(180deg, #e07060, #cc6050, #a04030);
  box-shadow: 0 0 8px rgba(204, 96, 80, 0.8);
}

@keyframes sweep {
  from {
    left: 3px;
  }
  to {
    left: calc(100% - 8px);
  }
}

/* ─── Result overlay ──────────────────────────────────────── */
.result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 5px;
  z-index: 10;
}

.result-overlay--win {
  background: rgba(82, 184, 48, 0.18);
  color: #7ee050;
  text-shadow:
    0 0 12px rgba(110, 192, 64, 0.9),
    0 0 24px rgba(110, 192, 64, 0.4);
}

.result-overlay--lose {
  background: rgba(204, 96, 80, 0.12);
  color: #e07060;
  text-shadow: 0 0 8px rgba(204, 96, 80, 0.5);
}

.result-icon {
  font-size: 0.9rem;
  animation: starSpin 0.8s ease-out;
}

@keyframes starSpin {
  from {
    transform: rotate(-180deg) scale(0);
    opacity: 0;
  }
  to {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
}

.result-fade-enter-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.result-fade-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

/* ─── Footer ──────────────────────────────────────────────── */
.mg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 38px;
  z-index: 1;
}

/* ─── Timer ring ──────────────────────────────────────────── */
.mg-timer-wrap {
  position: relative;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
}

.timer-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.timer-ring__bg {
  fill: none;
  stroke: rgba(92, 51, 16, 0.4);
  stroke-width: 2.5;
}

.timer-ring__fill {
  fill: none;
  stroke: rgba(200, 185, 140, 0.45);
  stroke-width: 2.5;
  stroke-dasharray: 94.25;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  transition:
    stroke-dashoffset 1s linear,
    stroke 0.3s;
}

.timer-ring__fill--urgent {
  stroke: #cc6050;
  animation: urgentPulse 0.5s ease-in-out infinite alternate;
}

@keyframes urgentPulse {
  from {
    opacity: 0.7;
  }
  to {
    opacity: 1;
  }
}

.mg-timer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: rgba(200, 185, 140, 0.55);
  letter-spacing: 0;
  transition: color 0.3s;
}

.mg-timer--urgent {
  color: #cc6050;
}

/* ─── Skip button ─────────────────────────────────────────── */
.skip-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  font-size: 0.7rem;
  color: rgba(200, 185, 140, 0.35);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 4px;
  min-height: 44px;
  min-width: 44px;
  text-align: right;
  transition: color 0.2s;
  line-height: 1.3;
}

.skip-btn:hover {
  color: rgba(200, 185, 140, 0.65);
}

.skip-btn:hover .skip-arrow {
  transform: translateX(3px);
}

.skip-arrow {
  display: inline-block;
  transition: transform 0.2s ease;
}

.skip-sub {
  font-size: 0.6rem;
  color: rgba(200, 185, 140, 0.25);
  letter-spacing: 0.03em;
}

.skip-btn:hover .skip-sub {
  color: rgba(200, 185, 140, 0.45);
}

/* ─── Reduced motion ──────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .indicator {
    animation: none;
    left: 50%;
  }
  .spark,
  .zone,
  .mg-icon,
  .result-icon,
  .timer-ring__fill--urgent {
    animation: none;
  }
  .track--win,
  .track--lose {
    animation: none;
  }
}
</style>
