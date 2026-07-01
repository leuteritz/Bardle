<template>
  <div class="phase-sun-disc" :class="{ 'phase-sun-disc--pulse': pulse }" :style="discVars" />
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { usePlanetShopStore } from '@/stores/planetShopStore'
import { STAR_PHASE_DATA } from '@/config/constants'

/**
 * Clean, phase-colored glowing sun disc — the single source of truth for the sun's
 * visual. A 1:1 port of the Planets/Shop tab sun (.ps-stage-sun / .shop-stage-sun),
 * driven entirely by the current solar phase so every phase change recolors it.
 */
export default defineComponent({
  name: 'PhaseSunDisc',
  props: {
    /** Disc diameter in px. */
    diameter: { type: Number, required: true },
    /** Toggle the breathing pulse (off for calm/static contexts). */
    pulse: { type: Boolean, default: true },
  },
  setup(props) {
    const planetShopStore = usePlanetShopStore()

    const discVars = computed((): Record<string, string> => {
      const phase = STAR_PHASE_DATA[planetShopStore.currentSunStage] ?? STAR_PHASE_DATA[0]
      return {
        '--phase-core': phase.core,
        '--phase-mid': phase.mid,
        '--phase-edge': phase.edge,
        '--phase-glow': phase.phaseGlow,
        '--pulse-speed': phase.pulseSpeed,
        '--disc-d': `${props.diameter}px`,
      }
    })

    return { discVars }
  },
})
</script>

<style scoped>
/* Disc — 1:1 mirror of PlanetSelectTabComponent .ps-stage-sun. Keep in sync. */
.phase-sun-disc {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--disc-d, 200px);
  height: var(--disc-d, 200px);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  transition: width 1.2s ease, height 1.2s ease;
  background:
    radial-gradient(
      circle at 42% 38%,
      color-mix(in srgb, white 92%, var(--phase-core, #fff)) 0%,
      transparent 22%
    ),
    radial-gradient(
      circle at 50% 50%,
      var(--phase-core, #fff0e0) 0%,
      var(--phase-mid, #ffd4a3) 34%,
      var(--phase-edge, #cc5500) 52%,
      color-mix(in srgb, var(--phase-edge, #cc5500) 45%, transparent) 70%,
      transparent 86%
    );
  box-shadow:
    0 0 90px color-mix(in srgb, var(--phase-glow, #ff8c42) 55%, transparent),
    0 0 180px color-mix(in srgb, var(--phase-glow, #ff8c42) 28%, transparent);
}

.phase-sun-disc--pulse {
  animation: phase-sun-pulse var(--pulse-speed, 5s) ease-in-out infinite;
}

@keyframes phase-sun-pulse {
  0%, 100% { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
}

@media (prefers-reduced-motion: reduce) {
  .phase-sun-disc--pulse {
    animation: none;
  }
}
</style>
