<template>
  <div ref="host" class="comet-root" :style="vars">
    <div class="sun-slot comet-coma" data-layer="coma" />
    <div class="sun-slot comet-core" data-layer="core" />
    <!-- Der Fels dreht um die eigene Achse: Krater und Adern rollen als Band, der
         Terminator steht darüber (main.css trägt die Bandregeln). -->
    <div v-if="detail >= 1" class="sun-slot sun-band" data-layer="bandE" :style="bandVars" />
    <div v-if="detail >= 1" class="sun-slot comet-shade" data-layer="shade" />
    <div v-if="jetsShown" class="sun-slot comet-jets" data-layer="jets" />
    <div v-if="wake && detail >= 1" ref="wakeGroup" class="sun-wake-group" :class="{ paused: wakePaused }">
      <div
        v-for="i in SUN_WAKE_COPIES"
        :key="i"
        class="sun-slot sun-wake"
        data-layer="wake"
        :style="sunWakeCopyStyle(i, SUN_COMET_WAKE_GUST_SEC)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import {
  COMET_DISC_FILL,
  COMET_JET_MIN_STAGE,
  COMET_PHASE_DATA,
  SUN_BAND_MASK_EDGE,
  SUN_BAND_MASK_FULL,
  SUN_COMET_TURN_SEC,
  SUN_COMET_WAKE_GUST_SEC,
  SUN_SPRITE_CROSSFADE_MS,
  SUN_WAKE_COPIES,
  SUN_WAKE_GROW,
} from '@/config/constants'
import {
  mountSunSprites,
  sunBandVars,
  sunBodyFor,
  sunSpriteDetail,
  sunWakeCopyStyle,
} from '@/utils/fx/sunBodySprite'
import { useWakeFollower } from '@/composables/orbit/useWakeFollower'

/**
 * Der Herkunftskörper vor der Zündung: ein wandernder Fels mit Bard darin.
 * Jeder gezündete Kernstrahl (cometStage) lässt mehr Goldadern glühen; ab
 * COMET_JET_MIN_STAGE gast er aus. Derselbe Vertrag wie PhaseSunDisc —
 * absolut zentriert, Grösse aus `diameter`, der Fels füllt COMET_DISC_FILL.
 */
const props = withDefaults(defineProps<{ diameter: number; wake?: boolean }>(), { wake: false })

const solarStore = useSolarUpgradeStore()
const host = ref<HTMLDivElement | null>(null)
const wakeGroup = ref<HTMLDivElement | null>(null)
useWakeFollower(wakeGroup, () => props.wake)

const detail = computed(() => sunSpriteDetail(props.diameter))
const body = computed(() => sunBodyFor(solarStore, solarStore.solarSignature))
const jetsShown = computed(() => detail.value >= 2 && solarStore.cometStage >= COMET_JET_MIN_STAGE)
const bandVars = sunBandVars('bandE', 'comet')

const wakePaused = computed(() => {
  if (!props.wake) return false
  const galaxyStore = useGalaxyStore()
  return galaxyStore.isRescueRotating || galaxyStore.starsBackgroundPaused
})

const vars = computed((): Record<string, string> => ({
  '--comet-d': `${props.diameter}px`,
  '--comet-pulse': COMET_PHASE_DATA.pulseSpeed,
  '--sun-xfade': `${SUN_SPRITE_CROSSFADE_MS}ms`,
  '--sun-turn': `${SUN_COMET_TURN_SEC}s`,
  '--band-r': `${COMET_DISC_FILL}`,
  '--band-mask-full': `${SUN_BAND_MASK_FULL}`,
  '--band-mask-edge': `${SUN_BAND_MASK_EDGE}`,
  '--sun-wake-sec': `${SUN_COMET_WAKE_GUST_SEC}s`,
  '--wake-grow': `${SUN_WAKE_GROW}`,
}))

watch(
  [host, body, () => props.diameter, detail, () => props.wake],
  () => {
    const el = host.value
    if (!el) return
    mountSunSprites(el, body.value, {
      px: props.diameter,
      dpr: window.devicePixelRatio || 1,
      wake: props.wake,
    })
  },
  { flush: 'post', immediate: true },
)
</script>

<style scoped>
.comet-root {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--comet-d, 120px);
  height: var(--comet-d, 120px);
  transform: translate(-50%, -50%);
  transition:
    width 1.2s ease,
    height 1.2s ease;
}

.comet-coma {
  --span: 1.6;
  animation: comet-coma-breathe var(--comet-pulse, 6s) ease-in-out infinite;
}

.comet-core,
.comet-shade {
  --span: 1;
}

.comet-jets {
  --span: 1.8;
  animation: comet-jet-wobble 6s ease-in-out infinite alternate;
}

.sun-wake-group {
  position: absolute;
  inset: 0;
  transition: opacity 0.6s ease;
}

.sun-wake-group.paused {
  opacity: 0;
}

.sun-wake-group.paused .sun-wake {
  animation-play-state: paused;
}

@keyframes comet-coma-breathe {
  0%,
  100% {
    opacity: 0.86;
  }
  50% {
    opacity: 1;
  }
}

@keyframes comet-jet-wobble {
  from {
    transform: rotate(-4deg);
    opacity: 0.55;
  }
  to {
    transform: rotate(4deg);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comet-coma,
  .comet-jets {
    animation: none;
  }

  .sun-wake-group {
    display: none;
  }
}
</style>
