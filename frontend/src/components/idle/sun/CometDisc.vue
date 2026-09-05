<template>
  <div ref="host" class="comet-root" :style="vars">
    <div class="sun-slot comet-coma" data-layer="coma" />
    <div class="sun-slot comet-core" data-layer="core" />
    <div v-if="jetsShown" class="sun-slot comet-jets" data-layer="jets" />
    <div v-if="wake && detail >= 1" ref="wakeGroup" class="sun-wake-group" :class="{ paused: wakePaused }">
      <div
        v-for="i in SUN_WAKE_COPIES"
        :key="i"
        class="sun-slot comet-wake"
        data-layer="wake"
        :style="wakeStyle(i)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import {
  COMET_JET_MIN_STAGE,
  COMET_PHASE_DATA,
  SUN_COMET_WAKE_SEC,
  SUN_SPRITE_CROSSFADE_MS,
  SUN_WAKE_COPIES,
} from '@/config/constants'
import { mountSunSprites, sunBodyFor, sunSpriteDetail } from '@/utils/fx/sunBodySprite'
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

const wakePaused = computed(() => {
  if (!props.wake) return false
  const galaxyStore = useGalaxyStore()
  return galaxyStore.isRescueRotating || galaxyStore.starsBackgroundPaused
})

const vars = computed((): Record<string, string> => ({
  '--comet-d': `${props.diameter}px`,
  '--comet-tumble': COMET_PHASE_DATA.tumbleSec,
  '--comet-pulse': COMET_PHASE_DATA.pulseSpeed,
  '--sun-xfade': `${SUN_SPRITE_CROSSFADE_MS}ms`,
  '--sun-wake-sec': `${SUN_COMET_WAKE_SEC}s`,
}))

function wakeStyle(i: number): Record<string, string> {
  return { animationDelay: `${(-((i - 1) / SUN_WAKE_COPIES) * SUN_COMET_WAKE_SEC).toFixed(2)}s` }
}

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

/* Taumeln, keine volle Drehung — die eingebackene Lichtseite bleibt plausibel. */
.comet-core {
  --span: 1;
  animation: comet-tumble var(--comet-tumble, 14s) ease-in-out infinite alternate;
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

.sun-wake-group.paused .comet-wake {
  animation-play-state: paused;
}

.comet-wake {
  --span: 2;
  opacity: 0;
  animation: comet-wake-out var(--sun-wake-sec, 2s) ease-in infinite;
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

@keyframes comet-tumble {
  from {
    transform: rotate(-7deg) scale(1);
  }
  to {
    transform: rotate(9deg) scale(1.03);
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

@keyframes comet-wake-out {
  0% {
    transform: scale(1);
    opacity: 0;
  }
  15% {
    opacity: 0.9;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comet-coma,
  .comet-core,
  .comet-jets {
    animation: none;
  }

  .sun-wake-group {
    display: none;
  }
}
</style>
