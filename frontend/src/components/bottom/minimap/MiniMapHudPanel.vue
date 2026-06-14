<template>
  <div v-if="!isRescuing" class="hud-panel">
    <!-- Row 1: icon + arrival value + time unit -->
    <div class="hud-arrival">
      <Icon icon="game-icons:sands-of-time" width="24" height="24" style="color: rgba(232, 192, 64, 0.55)" />
      <div class="hud-arrival-inner">
        <span class="hud-arrival-value">{{ countdown }}</span>
        <span class="hud-unit">{{ countdownUnit }}</span>
      </div>
    </div>

    <!-- Row 2: icon + value + unit pairs inline -->
    <template v-if="isTraveling">
      <div class="hud-secondary">
        <div class="hud-sm-metric">
          <Icon icon="game-icons:winged-leg" width="24" height="24" style="color: rgba(232, 192, 64, 0.4)" />
          <div class="hud-sm-val-unit">
            <span class="hud-sm-value">{{ speedDisplay }}</span>
            <span class="hud-sm-unit">LY/s</span>
          </div>
        </div>
        <div class="hud-sm-metric">
          <Icon icon="game-icons:radar-sweep" width="24" height="24" style="color: rgba(232, 192, 64, 0.4)" />
          <div class="hud-sm-val-unit">
            <span class="hud-sm-value">{{ remainingDistDisplay }}</span>
            <span class="hud-sm-unit">LY</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { CHAMPION_TRAVEL_BASE_LY, CHAMPION_TRAVEL_LY_PER_GALAXY } from '../../../config/constants'

export default defineComponent({
  name: 'MiniMapHudPanel',
  components: { Icon },
  setup() {
    const galaxyStore = useGalaxyStore()

    const isRescuing = computed(
      () =>
        galaxyStore.championTravelState === 'champion_available' ||
        galaxyStore.championTravelState === 'champion_spawned',
    )

    const countdown = computed(() => {
      const ms = galaxyStore.travelRemainingMs
      const s = Math.ceil(ms / 1000)
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      return `${m}:${String(sec).padStart(2, '0')}`
    })

    const countdownUnit = computed(() => {
      const s = Math.ceil(galaxyStore.travelRemainingMs / 1000)
      if (Math.floor(s / 3600) > 0) return 'h'
      if (Math.floor((s % 3600) / 60) > 0) return 'min'
      return 'sec'
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
      countdown,
      countdownUnit,
      isTraveling,
      speedDisplay,
      remainingDistDisplay,
    }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   HUD-Panel
   ═══════════════════════════════════════════════ */
.hud-panel {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  z-index: 10;
  pointer-events: none;
  user-select: none;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;

  padding: 2px 0;

  animation: hud-panel-fadein 0.4s ease both;
}

@keyframes hud-panel-fadein {
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
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.hud-arrival-inner {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 5px;
  font-size: 2.4rem;
  min-width: 7ch;
}

.hud-arrival-value {
  font-size: 2.4rem;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  line-height: 1.0;
  white-space: nowrap;
  text-shadow:
    0 2px 6px rgba(0, 0, 0, 0.95),
    0 0 20px rgba(232, 192, 64, 0.12);
}

.hud-secondary {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
}

.hud-sm-metric {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.hud-sm-val-unit {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 4px;
  font-size: 1.15rem;
  min-width: 4.5ch;
}

.hud-sm-value {
  font-size: 1.15rem;
  font-weight: 600;
  color: rgba(232, 192, 64, 0.78);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  line-height: 1.1;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.hud-unit {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(232, 192, 64, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
}

.hud-sm-unit {
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(232, 192, 64, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
}
</style>
