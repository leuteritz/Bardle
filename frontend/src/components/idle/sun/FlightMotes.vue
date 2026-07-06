<template>
  <div
    class="flight-motes"
    :class="{ paused: flightPaused }"
    aria-hidden="true"
    :style="vars"
  >
    <div
      v-for="(l, i) in lines"
      :key="i"
      class="flight-line"
      :style="l"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import {
  COMET_PHASE_DATA,
  STAR_PHASE_DATA,
  FLIGHT_LINE_COUNT,
  FLIGHT_LINE_REACH_FACTOR,
  FLIGHT_LINE_STAGE_BONUS,
  FLIGHT_LINE_BASE_LEN_FACTOR,
  FLIGHT_LINE_THICKNESS,
  FLIGHT_LINE_GROW_SCALE,
} from '@/config/constants'

/**
 * Flight wake around the player's celestial body: the viewer sits behind the
 * player, who flies straight INTO the screen, so shed material comes at the
 * camera — rendered as speed LINES shooting radially outward, stretching as
 * they fly (parallax growth) and fading, same motion language as the
 * background starfield. Runs in every phase (comet and all sun phases),
 * tinted in the current phase color, and pauses whenever the flight itself
 * stops — rescue rotation, role selection and the whole champion-star orbit
 * window (star time bar), the same signals that halt the starfield.
 * Same placement contract as PhaseSunDisc/CometDisc: absolutely centered in
 * its parent, sized via the diameter prop.
 */
export default defineComponent({
  name: 'FlightMotes',
  props: {
    /** Disc diameter in px — lines spawn at its edge and fly outward. */
    diameter: { type: Number, required: true },
  },
  setup(props) {
    const solarStore = useSolarUpgradeStore()
    const galaxyStore = useGalaxyStore()

    /** All "background stands still" states: rescue camera rotation, role
     *  selection and the champion-star orbit window (star time bar). */
    const flightPaused = computed(
      () => galaxyStore.isRescueRotating || galaxyStore.starsBackgroundPaused,
    )

    const vars = computed((): Record<string, string> => {
      const isComet = solarStore.isCometState
      const stage = isComet ? solarStore.cometStage : solarStore.starPhase
      return {
        '--line-d': `${props.diameter}px`,
        '--line-color': isComet
          ? COMET_PHASE_DATA.glow
          : STAR_PHASE_DATA[solarStore.starPhase].phaseGlow,
        '--line-power': `${1 + stage * FLIGHT_LINE_STAGE_BONUS}`,
        '--line-start-r': `${props.diameter * 0.4}px`,
        '--line-grow': `${FLIGHT_LINE_GROW_SCALE}`,
        '--line-thick': `${FLIGHT_LINE_THICKNESS}px`,
      }
    })

    /** Deterministic per-line spread (no Math.random — stable across re-renders):
     *  golden-angle steps spread the lines evenly around the disc, each with its
     *  own radial reach, rhythm and phase offset. */
    const lines = computed((): Record<string, string>[] =>
      Array.from({ length: FLIGHT_LINE_COUNT }, (_, i) => {
        const reach =
          props.diameter * FLIGHT_LINE_REACH_FACTOR * (0.75 + (((i * 29) % 5) * 0.1))
        return {
          width: `${props.diameter * FLIGHT_LINE_BASE_LEN_FACTOR}px`,
          height: `${FLIGHT_LINE_THICKNESS}px`,
          '--a': `${i * 137.5}deg`,
          '--reach': `${reach}px`,
          animationDuration: `${1.4 + (i % 4) * 0.35}s`,
          animationDelay: `${-((i * 0.9) % 3)}s`,
        }
      }),
    )

    return { vars, lines, flightPaused }
  },
})
</script>

<style scoped>
.flight-motes {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--line-d, 120px);
  height: var(--line-d, 120px);
  transform: translate(-50%, -50%);
  pointer-events: none;
  /* progression-driven envelope — the line keyframe animates freely inside */
  opacity: calc(0.45 + 0.22 * var(--line-power, 1));
  transition: opacity 0.6s ease;
}

/* Flight stopped (star-system rescue rotation): the starfield stands still,
   so the wake must too — fade out and freeze mid-flight. */
.flight-motes.paused {
  opacity: 0;
}

.flight-motes.paused .flight-line {
  animation-play-state: paused;
}

/* Speed line shooting radially outward, stretching past the viewer.
   transform-origin left center: the left edge is the inner end at the disc,
   rotate() aims the line along its flight path, translateX() slides it out. */
.flight-line {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: calc(var(--line-thick, 2px) / -2);
  border-radius: 2px;
  background: linear-gradient(to left, var(--line-color, #e8c040), transparent);
  transform-origin: left center;
  opacity: 0;
  animation-name: flight-line-fly-out;
  /* ease-in = accelerating outward, matching the stars' norm² speed curve */
  animation-timing-function: ease-in;
  animation-iteration-count: infinite;
}

@keyframes flight-line-fly-out {
  0% {
    transform: rotate(var(--a, 0deg)) translateX(var(--line-start-r, 40px)) scaleX(0.3);
    opacity: 0;
  }
  12% {
    opacity: 0.9;
  }
  100% {
    transform: rotate(var(--a, 0deg)) translateX(var(--reach, 200px)) scaleX(var(--line-grow, 2.2));
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flight-line {
    animation: none;
  }
}
</style>
