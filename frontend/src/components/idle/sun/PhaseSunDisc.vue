<template>
  <!-- Endphase: der Stern ist kollabiert — das Schwarze Loch ersetzt die Scheibe. -->
  <BlackHoleDisc v-if="isCollapsed" :diameter="diameter" :wake="wake" />
  <div
    v-else
    ref="host"
    class="phase-sun-root"
    :class="{ 'phase-sun-root--still': !pulse }"
    :style="rootVars"
  >
    <div class="sun-slot sun-halo" data-layer="halo" />
    <div class="sun-slot sun-core" data-layer="core" />
    <template v-if="detail >= 2">
      <div class="sun-slot sun-surface sun-surface--a" data-layer="surfaceA" />
      <div class="sun-slot sun-surface sun-surface--b" data-layer="surfaceB" />
    </template>
    <div v-if="detail >= 1" class="sun-slot sun-corona" data-layer="corona" />
    <div v-if="detail >= 2" class="sun-slot sun-flare" data-layer="flare" :style="flareStyle" />
    <div v-if="wake && detail >= 1" ref="wakeGroup" class="sun-wake-group" :class="{ paused: wakePaused }">
      <div
        v-for="i in SUN_WAKE_COPIES"
        :key="i"
        class="sun-slot sun-wake"
        data-layer="wake"
        :style="wakeStyle(i)"
      />
    </div>
    <div ref="pulseEl" class="sig-pulse" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import {
  STAR_PHASE_DATA,
  SOLAR_SIGNATURE_PULSE_MS,
  SUN_CORONA_TURN_SEC,
  SUN_FLARE_CYCLE_SEC,
  SUN_SPRITE_CROSSFADE_MS,
  SUN_SURFACE_TURN_SEC_A,
  SUN_SURFACE_TURN_SEC_B,
  SUN_WAKE_COPIES,
  SUN_WAKE_SEC,
} from '@/config/constants'
import { SIGNATURE_AXIS_COLOR } from '@/utils/game/solarSignature'
import { mountSunSprites, sunBodyFor, sunSpriteDetail } from '@/utils/fx/sunBodySprite'
import { useWakeFollower } from '@/composables/orbit/useWakeFollower'
import { jitter } from '@/utils/fx/spaceBody'
import BlackHoleDisc from './BlackHoleDisc.vue'

/**
 * Die Plasmasonne — die eine Quelle ihrer Optik. Gerasterte Ebenen aus
 * `sunBodySprite.ts`, gestapelt als <img>; animiert werden nur transform und
 * opacity der Slots. Die Endphase ist kein Plasmakörper und geht an
 * BlackHoleDisc, damit jeder Konsument sie umsonst bekommt.
 */
const props = withDefaults(
  defineProps<{
    /** Box-Durchmesser in px — der autorisierte, nie die Bildschirmgrösse. */
    diameter: number
    /** Atmung von Kern und Halo (aus für ruhige Kontexte). */
    pulse?: boolean
    /** Der Flugkranz — nur die Orbit-Bühne setzt ihn. */
    wake?: boolean
  }>(),
  { pulse: true, wake: false },
)

const planetShopStore = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()
const host = ref<HTMLDivElement | null>(null)
const wakeGroup = ref<HTMLDivElement | null>(null)
useWakeFollower(wakeGroup, () => props.wake)
const pulseEl = ref<HTMLDivElement | null>(null)

const isCollapsed = computed(() => solarStore.isCollapsedStar)
const detail = computed(() => sunSpriteDetail(props.diameter))
const body = computed(() => sunBodyFor(solarStore, solarStore.solarSignature))

/** Hintergrund steht still (Rettungsschwenk, Rollenwahl, Champion-Stern) → der Kranz auch. */
const wakePaused = computed(() => {
  if (!props.wake) return false
  const galaxyStore = useGalaxyStore()
  return galaxyStore.isRescueRotating || galaxyStore.starsBackgroundPaused
})

const pulseColor = computed(() => {
  const axis = solarStore.signaturePulseAxis
  if (!axis) return STAR_PHASE_DATA[planetShopStore.currentSunStage]?.phaseGlow ?? '#ff8c42'
  return SIGNATURE_AXIS_COLOR[axis]
})

const rootVars = computed((): Record<string, string> => {
  const phase = STAR_PHASE_DATA[planetShopStore.currentSunStage] ?? STAR_PHASE_DATA[0]
  return {
    '--disc-d': `${props.diameter}px`,
    '--phase-glow': phase.phaseGlow,
    '--pulse-speed': phase.pulseSpeed,
    '--sig-pulse-c': pulseColor.value,
    '--sig-pulse-ms': `${SOLAR_SIGNATURE_PULSE_MS}ms`,
    '--sun-xfade': `${SUN_SPRITE_CROSSFADE_MS}ms`,
    '--sun-turn-a': `${SUN_SURFACE_TURN_SEC_A}s`,
    '--sun-turn-b': `${SUN_SURFACE_TURN_SEC_B}s`,
    '--sun-corona-turn': `${SUN_CORONA_TURN_SEC}s`,
    '--sun-flare-sec': `${SUN_FLARE_CYCLE_SEC}s`,
    '--sun-wake-sec': `${SUN_WAKE_SEC}s`,
  }
})

/** Startversatz je Phase, sonst feuerte jede Sonne im selben Takt. */
const flareStyle = computed(() => ({
  animationDelay: `${-(jitter(body.value.stage, 7) * SUN_FLARE_CYCLE_SEC).toFixed(2)}s`,
}))

function wakeStyle(i: number): Record<string, string> {
  return { animationDelay: `${(-((i - 1) / SUN_WAKE_COPIES) * SUN_WAKE_SEC).toFixed(2)}s` }
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

/** Kaufblitz neu anstossen — über eine KLASSE, weil der Keyframe-Name in
 *  <style scoped> einen Suffix trägt; Reflow dazwischen, sonst fasst der
 *  Browser zwei Käufe zu „nichts geändert" zusammen. */
watch(
  () => solarStore.signaturePulseSeq,
  (seq) => {
    if (seq <= 0) return
    solarStore.ackSignaturePulse()
    const el = pulseEl.value
    if (!el) return
    el.classList.remove('sig-pulse--on')
    void el.offsetWidth
    el.classList.add('sig-pulse--on')
  },
)
</script>

<style scoped>
.phase-sun-root {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--disc-d, 200px);
  height: var(--disc-d, 200px);
  transform: translate(-50%, -50%);
  transition:
    width 1.2s ease,
    height 1.2s ease;
}

/* Reihenfolge = Ebenen-Haushalt: statische zuerst, animierte zuletzt. */
.sun-halo {
  --span: 2.6;
  animation: sun-halo-breathe calc(var(--pulse-speed, 5s) * 2) ease-in-out infinite;
}

.sun-core {
  --span: 1;
  animation: sun-core-breathe calc(var(--pulse-speed, 5s) * 2) ease-in-out infinite;
}

.phase-sun-root--still .sun-halo,
.phase-sun-root--still .sun-core {
  animation: none;
}

/* Zwei Konvektionsschichten, gegenläufig und so langsam, dass nichts als
   Drehung gelesen wird — nur als Leben auf der Oberfläche. */
.sun-surface {
  --span: 1;
  animation: sun-turn var(--sun-turn-a, 420s) linear infinite;
}

.sun-surface--b {
  animation-duration: var(--sun-turn-b, 560s);
  animation-direction: reverse;
}

.sun-corona {
  --span: 2.4;
  animation: sun-turn var(--sun-corona-turn, 180s) linear infinite;
}

.sun-flare {
  --span: 2.4;
  opacity: 0;
  animation: sun-flare-cycle var(--sun-flare-sec, 20s) ease-in-out infinite;
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

/* ease-in = nach aussen beschleunigend, wie die norm²-Kurve der Sterne. */
.sun-wake {
  --span: 2;
  opacity: 0;
  animation: sun-wake-out var(--sun-wake-sec, 2.4s) ease-in infinite;
}

.sig-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, var(--sig-pulse-c, #ff8c42) 55%, transparent) 0%,
    color-mix(in srgb, var(--sig-pulse-c, #ff8c42) 22%, transparent) 58%,
    transparent 78%
  );
  opacity: 0;
  pointer-events: none;
}

.sig-pulse--on {
  animation: sig-pulse-flare var(--sig-pulse-ms, 500ms) ease-out;
}

@keyframes sun-halo-breathe {
  0%,
  100% {
    opacity: 0.82;
  }
  50% {
    opacity: 1;
  }
}

@keyframes sun-core-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.025);
  }
}

@keyframes sun-turn {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes sun-flare-cycle {
  0%,
  84% {
    opacity: 0;
  }
  89% {
    opacity: 1;
  }
  95% {
    opacity: 0.55;
  }
  100% {
    opacity: 0;
  }
}

@keyframes sun-wake-out {
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

@keyframes sig-pulse-flare {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  28% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.22);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sun-halo,
  .sun-core,
  .sun-surface,
  .sun-corona,
  .sig-pulse--on {
    animation: none;
  }

  /* Ohne Keyframe stünden sie bei der Deckkraft ihres Starts. */
  .sun-flare,
  .sun-wake-group {
    display: none;
  }
}
</style>
