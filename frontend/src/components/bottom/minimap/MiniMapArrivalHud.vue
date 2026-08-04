<template>
  <!-- Instrument row of the docked star system: how long the star still
       stands (top left, where the arrival countdown sat during the flight)
       and how many of its planets are still hostile (top right, where the
       rescue counter sits). Both slots are free while arrived, so the eye
       finds the numbers exactly where it left them. -->
  <div v-if="star" class="arrival-hud" aria-hidden="true">
    <div v-if="secsLeft !== null" class="ah-timer" :class="{ 'ah-timer--critical': isCritical }">
      <div class="ah-timer-row">
        <span v-ink-center class="ah-timer-label">Star</span>
        <span v-ink-center class="ah-timer-value" :style="{ color: timerColor }">
          {{ timerText }}
        </span>
      </div>
      <div class="ah-timer-track">
        <div
          class="ah-timer-fill"
          :style="{ transform: `scaleX(${timePct})`, background: timerColor }"
        />
      </div>
    </div>

    <div class="ah-planets">
      <div class="ah-planets-row">
        <Icon icon="game-icons:ringed-planet" width="28" height="28" class="ah-planets-icon" />
        <span class="ah-planets-value"
          >{{ activeCount }}<span class="ah-planets-sep">/</span>{{ totalCount }}</span
        >
      </div>
      <div class="ah-planets-label">Planets active</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useStarGroupStore } from '@/stores/starGroupStore'
import {
  HUD_COUNTDOWN_TICK_MS,
  MS_PER_SECOND,
  STAR_FIGHT_TIMER_CRITICAL_S,
  STAR_FIGHT_TIMER_WARNING_S,
} from '@/config/constants'

const starGroupStore = useStarGroupStore()

// Die Deadline im Store ist reaktiv, Date.now() nicht — ein Ticker treibt den
// Vergleich. Die Komponente existiert nur im Arrival-Zustand (v-if im Parent),
// der Timer läuft also nicht nebenher weiter.
const now = ref(Date.now())
let tickId: number | null = null

onMounted(() => {
  tickId = window.setInterval(() => {
    now.value = Date.now()
  }, HUD_COUNTDOWN_TICK_MS)
})

onUnmounted(() => {
  if (tickId !== null) window.clearInterval(tickId)
  tickId = null
})

const star = computed(
  () => starGroupStore.activeStars.find((s) => s.starType === 'champion') ?? null,
)

const secsLeft = computed<number | null>(() => {
  const s = star.value
  if (!s || s.spawnedAt === undefined || s.durationMs === undefined) return null
  return Math.max(0, Math.ceil((s.spawnedAt + s.durationMs - now.value) / MS_PER_SECOND))
})

/** Restanteil 0–1 für den Balken — feiner als die auf Sekunden gerundete Zahl. */
const timePct = computed(() => {
  const s = star.value
  if (!s || s.spawnedAt === undefined || s.durationMs === undefined) return 0
  return Math.max(0, Math.min(1, (s.spawnedAt + s.durationMs - now.value) / s.durationMs))
})

const timerText = computed(() => {
  const total = secsLeft.value ?? 0
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${String(sec).padStart(2, '0')}`
})

const isCritical = computed(
  () => secsLeft.value !== null && secsLeft.value <= STAR_FIGHT_TIMER_CRITICAL_S,
)

// Gleiche Ampel wie der Despawn-Ring im Star-Fight-HUD (useBossFightHud)
const timerColor = computed(() => {
  if (isCritical.value) return '#ff5040'
  if (secsLeft.value !== null && secsLeft.value <= STAR_FIGHT_TIMER_WARNING_S) return '#e8a030'
  return '#e8c040'
})

const totalCount = computed(() => star.value?.planetSlots.length ?? 0)
const activeCount = computed(
  () => star.value?.planetSlots.filter((p) => !p.cleared).length ?? 0,
)
</script>

<style scoped>
.arrival-hud {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  user-select: none;
  animation: arrival-hud-fadein 0.4s ease both;
}

@keyframes arrival-hud-fadein {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Star despawn timer (top left, same slot as the arrival countdown) ── */
.ah-timer {
  position: absolute;
  top: 16px;
  left: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.ah-timer-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.ah-timer-label {
  font-size: 14px;
  letter-spacing: 0.18em;
  color: #8a6a30;
  text-transform: uppercase;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.ah-timer-value {
  font-size: 34px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow:
    0 2px 5px rgba(0, 0, 0, 0.95),
    0 0 16px rgba(0, 0, 0, 0.5);
  transition: color 0.3s ease;
}

/* Nur opacity animiert — der Wert steht über dem laufenden Canvas */
.ah-timer--critical .ah-timer-value {
  animation: ah-timer-blink 0.8s ease-in-out infinite alternate;
}

@keyframes ah-timer-blink {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

.ah-timer-track {
  position: relative;
  width: 132px;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  background: #14100a;
  box-shadow: inset 0 0 0 1px #3e200a;
}

.ah-timer-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  border-radius: 3px;
  transition:
    transform 0.25s linear,
    background 0.3s ease;
}

/* ── Planet counter (top right, mirrors the rescue counter) ── */
.ah-planets {
  position: absolute;
  top: 16px;
  right: 42px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.ah-planets-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ah-planets-icon {
  color: #9fb4e8;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.9));
}

.ah-planets-value {
  font-size: 34px;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow:
    0 2px 5px rgba(0, 0, 0, 0.95),
    0 0 16px rgba(232, 192, 64, 0.3);
}

.ah-planets-sep {
  font-size: 24px;
  color: rgba(232, 192, 64, 0.55);
  margin: 0 3px;
}

.ah-planets-label {
  font-size: 17px;
  color: rgba(232, 192, 64, 0.72);
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

@media (prefers-reduced-motion: reduce) {
  .ah-timer--critical .ah-timer-value {
    animation: none;
  }
}
</style>
