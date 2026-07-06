<template>
  <div v-if="!isRescuing && !isWaiting && !isRotating" class="hud-top">
    <!-- top left: arrival countdown (travel only) -->
    <div v-if="isTraveling" class="hud-arrival">
      <div class="hud-arrival-row">
        <span class="hud-arrival-label">Arrival</span>
        <span class="hud-arrival-value">{{ countdown }}</span>
      </div>
      <div class="hud-metrics">
        <span class="hud-metric">{{ speedDisplay }} <span class="hud-metric-unit">LY/s</span></span>
        <span class="hud-metric-sep" />
        <span class="hud-metric">{{ remainingDistDisplay }} <span class="hud-metric-unit">LY</span></span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { CHAMPION_TRAVEL_BASE_LY, CHAMPION_TRAVEL_LY_PER_GALAXY } from '../../../config/constants'

export default defineComponent({
  name: 'MiniMapHudPanel',
  setup() {
    const galaxyStore = useGalaxyStore()

    const isRescuing = computed(
      () =>
        galaxyStore.championTravelState === 'champion_available' ||
        galaxyStore.championTravelState === 'champion_spawned',
    )

    const isWaiting = computed(() => galaxyStore.pendingRoleSelection)

    const isRotating = computed(() => galaxyStore.isRescueRotating)

    const countdown = computed(() => {
      const ms = galaxyStore.travelRemainingMs
      const s = Math.ceil(ms / 1000)
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      return `${m}:${String(sec).padStart(2, '0')}`
    })

    const isTraveling = computed(() => galaxyStore.championTravelState === 'traveling')

    const totalDistanceLY = computed(
      () =>
        CHAMPION_TRAVEL_BASE_LY + (galaxyStore.currentGalaxy - 1) * CHAMPION_TRAVEL_LY_PER_GALAXY,
    )

    const remainingDistanceLY = computed(
      () => totalDistanceLY.value * (1 - galaxyStore.travelProgressPercent / 100),
    )

    const speedLJperS = computed(() => {
      const remainingSec = galaxyStore.travelRemainingMs / 1000
      if (remainingSec < 0.5) return 0
      return remainingDistanceLY.value / remainingSec
    })

    const remainingDistDisplay = computed(() => {
      const v = remainingDistanceLY.value
      return v >= 100 ? `${Math.round(v)}` : `${v.toFixed(1)}`
    })

    const speedDisplay = computed(() => speedLJperS.value.toFixed(1))

    return {
      isRescuing,
      isWaiting,
      isRotating,
      countdown,
      isTraveling,
      speedDisplay,
      remainingDistDisplay,
    }
  },
})
</script>

<style scoped>
.hud-top {
  position: absolute;
  top: 16px;
  left: 20px;
  right: 24px;
  z-index: 10;
  pointer-events: none;
  user-select: none;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 10px;
  animation: hud-top-fadein 0.4s ease both;
}

@keyframes hud-top-fadein {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hud-arrival {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.hud-arrival-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.hud-arrival-label {
  font-size: 11px;
  letter-spacing: 0.18em;
  color: #8a6a30;
  text-transform: uppercase;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.hud-arrival-value {
  font-size: 26px;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow:
    0 2px 5px rgba(0, 0, 0, 0.95),
    0 0 16px rgba(232, 192, 64, 0.3);
}

.hud-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-metric {
  font-size: 11px;
  color: rgba(232, 192, 64, 0.72);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.hud-metric-unit {
  font-size: 9px;
  color: rgba(232, 192, 64, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hud-metric-sep {
  width: 1px;
  height: 10px;
  background: rgba(200, 144, 64, 0.35);
}
</style>
