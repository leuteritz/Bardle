<template>
  <Transition name="travel-fade">
    <div v-if="show" class="travel-hud">
      <!-- Fortschrittsbalken oben -->
      <div class="hud-progress-track">
        <div class="hud-progress-fill" :style="{ width: progress + '%' }" />
      </div>

      <!-- Metriken -->
      <div class="hud-body">
        <!-- Zeit -->
        <div class="hud-metric">
          <span class="hud-icon">
            <!-- Sanduhr -->
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

        <!-- Trennlinie -->
        <div class="hud-divider" />

        <!-- Entfernung -->
        <div class="hud-metric">
          <span class="hud-icon">
            <!-- Kompass / Orb -->
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
          <span class="hud-value"> {{ lightYears }}<span class="hud-unit"> ly</span> </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useGalaxyStore } from '../../stores/galaxyStore'

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

/* ── Wrapper ── */
.travel-hud {
  position: fixed;
  top: calc(50% + 116px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9;
  pointer-events: none;

  width: 220px;
  background: rgba(8, 6, 2, 0.82);
  border: 1px solid rgba(120, 75, 28, 0.6);
  border-radius: 3px;
  overflow: hidden;
  backdrop-filter: blur(6px);

  /* sehr dezenter Glow-Puls */
  animation: hud-breathe 4s ease-in-out infinite;
}

@keyframes hud-breathe {
  0%,
  100% {
    box-shadow: 0 0 6px rgba(180, 120, 30, 0.18);
  }
  50% {
    box-shadow: 0 0 14px rgba(200, 145, 40, 0.32);
  }
}

/* ── Fortschrittsbalken ── */
.hud-progress-track {
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.04);
}
.hud-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7a4e1a, #d4a035, #ffe080, #d4a035, #7a4e1a);
  background-size: 250% auto;
  animation: bar-flow 3s linear infinite;
  transition: width 1s linear;
}
@keyframes bar-flow {
  0% {
    background-position: 0% center;
  }
  100% {
    background-position: 250% center;
  }
}

/* ── Body mit zwei Metriken ── */
.hud-body {
  display: flex;
  align-items: center;
  padding: 8px 14px;
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
}

.hud-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #dbb040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  text-shadow: 0 0 8px rgba(210, 165, 40, 0.4);
  line-height: 1;
}

.hud-unit {
  font-size: 0.6rem;
  font-weight: 400;
  color: #886020;
  letter-spacing: 0.06em;
}

/* ── Trennlinie ── */
.hud-divider {
  width: 1px;
  height: 22px;
  background: rgba(100, 60, 15, 0.5);
  flex-shrink: 0;
  margin: 0 8px;
}
</style>
