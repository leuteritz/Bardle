<template>
  <!-- Ambient background comets on their own overlay canvas. Shared verbatim by
       the idle-orbit backdrop and the flat cosmic backdrop. Purely decorative:
       absolutely positioned, never intercepts pointer events. Hidden entirely
       when the viewer prefers reduced motion. -->
  <canvas
    ref="cometCanvas"
    class="bg-comets"
    :class="{ 'bg-comets--hidden': prefersReducedMotion }"
    aria-hidden="true"
  ></canvas>
</template>

<script setup lang="ts">
import { useBackgroundComets } from '@/composables/starBackground/useBackgroundComets'

const props = withDefaults(
  defineProps<{
    /** Freeze the loop while an opaque overlay covers the idle layer (bard tab
     *  or star-fight modal). The idle-orbit backdrop sits behind those overlays
     *  (true); the cosmic backdrop lives inside them (false). */
    pauseWhenIdleHidden?: boolean
    /** Spawn-intensity preset. 'cosmic' fires comets more often and in bigger
     *  bursts than the default 'orbit' backdrop. */
    variant?: 'orbit' | 'cosmic'
  }>(),
  { pauseWhenIdleHidden: false, variant: 'orbit' },
)

const { cometCanvas, prefersReducedMotion } = useBackgroundComets({
  pauseWhenIdleHidden: props.pauseWhenIdleHidden,
  variant: props.variant,
})
</script>

<style scoped>
.bg-comets {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.bg-comets--hidden {
  display: none;
}
</style>
