<template>
  <Transition name="travel-fade">
    <div v-if="show" class="travel-hud">
      <!-- Fortschrittsbalken -->
      <div class="hud-progress-track">
        <div class="hud-progress-fill" :style="{ width: progress + '%' }" />
      </div>

      <!-- Metriken -->
      <div class="hud-body">
        <!-- Zeit -->
        <div class="hud-metric">
          <span class="hud-icon">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M5 2h14M5 22h14M6 2v4l6 6-6 6v4M18 2v4l-6 6 6 6v4" />
            </svg>
          </span>
          <span class="hud-value">{{ countdown }}</span>
        </div>

        <div class="hud-divider" />

        <!-- Entfernung -->
        <div class="hud-metric">
          <span class="hud-icon">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </span>
          <span class="hud-value">{{ lightYears }}<span class="hud-unit"> ly</span></span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'

const TRAVEL_MAX_LY = 42.0

export default defineComponent({
  name: 'TravelHud',
  setup() {
    const galaxyStore = useGalaxyStore()

    const show = computed(
      () =>
        galaxyStore.championTravelState === 'traveling' &&
        !galaxyStore.pendingGalaxyBoss &&
        !galaxyStore.isComplete,
    )

    const progress = computed(() => galaxyStore.travelProgressPercent)

    const countdown = computed(() => {
      const ms = galaxyStore.travelRemainingMs
      const s = Math.ceil(ms / 1000)
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      return `${m}:${String(sec).padStart(2, '0')}`
    })

    const lightYears = computed(() => {
      const remaining = ((100 - galaxyStore.travelProgressPercent) / 100) * TRAVEL_MAX_LY
      return remaining.toFixed(1)
    })

    return { show, progress, countdown, lightYears }
  },
})
</script>

<style scoped>
/* ── Einblend-Animation ── */
.travel-fade-enter-active,
.travel-fade-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}
.travel-fade-enter-from,
.travel-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

/* ── Wrapper – kein Background, kein Border ── */
.travel-hud {
  position: fixed;
  top: calc(50% + 116px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9;
  pointer-events: none;
  width: 220px;
}

/* ── Fortschrittsbalken ── */
.hud-progress-track {
  width: 100%;
  height: 7px;
  border-radius: 1px;
  border-bottom: 1px solid rgba(80, 45, 8, 0.35); /* nur zarte Grundlinie */
  overflow: hidden;
  margin-bottom: 7px;
}

.hud-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7a4e1a, #d4a035, #ffe080, #d4a035, #7a4e1a);
  background-size: 250% auto;
  animation: bar-flow 3s linear infinite;
  transition: width 1s linear;
  box-shadow: 0 0 10px rgba(220, 165, 35, 0.65);
  position: relative;
}

/* Sheen auf dem Fortschrittsbalken */
.hud-progress-fill::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 0%, transparent 100%);
  pointer-events: none;
}

@keyframes bar-flow {
  0% {
    background-position: 0% center;
  }
  100% {
    background-position: 250% center;
  }
}

/* ── Body ── */
.hud-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}

/* ── Einzelne Metrik ── */
.hud-metric {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.hud-icon {
  color: #9a6e28;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 0 4px rgba(180, 120, 30, 0.6));
}

.hud-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  line-height: 1;
  text-shadow:
    0 0 12px rgba(220, 175, 40, 0.7),
    0 1px 2px rgba(0, 0, 0, 0.9);
}

.hud-unit {
  font-size: 0.6rem;
  font-weight: 400;
  color: #7a5820;
  letter-spacing: 0.06em;
}

/* ── Trennlinie ── */
.hud-divider {
  width: 1px;
  height: 20px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(120, 75, 18, 0.55) 30%,
    rgba(120, 75, 18, 0.55) 70%,
    transparent
  );
  flex-shrink: 0;
  margin: 0 10px;
}

@media (prefers-reduced-motion: reduce) {
  .hud-progress-fill {
    animation: none;
  }
}
</style>
