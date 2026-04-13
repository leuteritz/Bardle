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
    <p class="mg-hint">Triff die goldene Zone für doppelte Beute!</p>

    <div
      ref="trackRef"
      class="track"
      :class="{ 'track--locked': phase !== 'playing' }"
      tabindex="0"
      role="button"
      aria-label="Timing-Spiel: Klicke wenn der Balken in der grünen Zone ist"
      @click="lock"
    >
      <div class="zone" />
      <div
        ref="indicatorRef"
        class="indicator"
        :class="{
          'indicator--win': phase === 'result-win',
          'indicator--lose': phase === 'result-lose',
          'indicator--paused': phase !== 'playing',
        }"
      />

      <div v-if="phase === 'result-win'" class="result-overlay result-overlay--win">
        Perfekter Treffer! ×2
      </div>
      <div v-else-if="phase === 'result-lose'" class="result-overlay result-overlay--lose">
        Knapp vorbei.
      </div>
    </div>

    <div class="mg-footer">
      <span class="mg-timer" :class="{ 'mg-timer--urgent': timeLeft <= 3 }">
        {{ timeLeft }}s
      </span>
      <button
        v-if="phase === 'playing'"
        class="skip-btn"
        type="button"
        @click.stop="skip"
      >
        Überspringen → einfache Belohnung
      </button>
    </div>
  </div>
</template>

<style scoped>
.minigame-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.mg-hint {
  font-size: 0.75rem;
  color: rgba(200, 185, 140, 0.7);
  text-align: center;
  margin: 0;
  letter-spacing: 0.04em;
}

.track {
  position: relative;
  width: 100%;
  height: 52px;
  background: #1a1008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  outline: none;
  transition: border-color 0.15s;
}

.track:focus-visible {
  border-color: #e8c040;
}

.track--locked {
  cursor: default;
}

.zone {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 35%;
  width: 30%;
  background: rgba(82, 184, 48, 0.18);
  border: 1px solid #6ec040;
  border-radius: 3px;
}

.indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 6px;
  background: #e8c040;
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.6);
  animation: sweep 1.4s ease-in-out infinite alternate;
}

.indicator--paused {
  animation-play-state: paused;
}

.indicator--win {
  background: #6ec040;
  box-shadow: 0 0 12px rgba(110, 192, 64, 0.9);
}

.indicator--lose {
  background: #cc6050;
  box-shadow: 0 0 8px rgba(204, 96, 80, 0.6);
}

@keyframes sweep {
  from { left: 4px; }
  to   { left: calc(100% - 10px); }
}

.result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  border-radius: 3px;
}

.result-overlay--win {
  background: rgba(82, 184, 48, 0.2);
  color: #6ec040;
  text-shadow: 0 0 10px rgba(110, 192, 64, 0.7);
}

.result-overlay--lose {
  background: rgba(204, 96, 80, 0.12);
  color: #cc6050;
}

.mg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 36px;
}

.mg-timer {
  font-size: 0.75rem;
  color: rgba(200, 185, 140, 0.45);
  min-width: 24px;
  transition: color 0.3s;
}

.mg-timer--urgent {
  color: #cc6050;
}

.skip-btn {
  font-size: 0.72rem;
  color: rgba(200, 185, 140, 0.4);
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 4px;
  min-height: 44px;
  min-width: 44px;
  text-align: right;
  transition: color 0.15s;
  line-height: 1.3;
}

.skip-btn:hover {
  color: rgba(200, 185, 140, 0.7);
}

@media (prefers-reduced-motion: reduce) {
  .indicator {
    animation: none;
    left: 50%;
  }
}
</style>
