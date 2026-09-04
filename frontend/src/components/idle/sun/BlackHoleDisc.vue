<template>
  <div ref="host" class="bh-root" :style="vars">
    <!-- Polarjets — das Einzige, was die Scheibenebene verlässt. Ganz hinten. -->
    <div class="sun-slot bh-jets" data-layer="bhJets" />

    <!-- Gelinste Fernseite der Scheibe, über den Horizont gebogen -->
    <div class="sun-slot bh-halo" data-layer="bhHalo" />

    <!-- Akkretionsscheibe, ferne Hälfte (hinter dem Horizont) -->
    <div class="bh-tilt bh-tilt--far">
      <div class="sun-slot bh-disc" data-layer="bhDisc" />
      <div class="sun-slot bh-glaze" data-layer="bhGlaze" />
    </div>

    <!-- Ereignishorizont: das einzige Opake, plus Photonenring -->
    <div class="sun-slot bh-shadow" data-layer="bhShadow" />
    <div class="sun-slot bh-ring" data-layer="bhRing" />

    <!-- Nahe Hälfte — läuft VOR der Unterkante des Horizonts durch -->
    <div class="bh-tilt bh-tilt--near">
      <div class="sun-slot bh-disc" data-layer="bhDisc" />
      <div class="sun-slot bh-glaze" data-layer="bhGlaze" />
    </div>

    <!-- Trümmer, die auf derselben geneigten Ebene einspiralen -->
    <span class="bh-inspiral">
      <span v-for="i in inspiralCount" :key="i" class="bh-mote" :style="moteStyle(i)" />
    </span>

    <div v-if="wake && detail >= 1" class="sun-wake-group" :class="{ paused: wakePaused }">
      <div
        v-for="i in SUN_WAKE_COPIES"
        :key="i"
        class="sun-slot bh-wake"
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
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  BLACK_HOLE_DISC_TILT,
  BLACK_HOLE_DISC_SPIN_SEC,
  BLACK_HOLE_JET_PULSE_SEC,
  BLACK_HOLE_INSPIRAL_COUNT,
  BLACK_HOLE_INSPIRAL_SEC,
  SOLAR_SIGNATURE_BH_MOTE_GAIN,
  SOLAR_SIGNATURE_STAGES,
  SUN_SPRITE_CROSSFADE_MS,
  SUN_WAKE_COPIES,
  SUN_WAKE_SEC,
} from '@/config/constants'
import { mountSunSprites, sunBodyFor, sunSpriteDetail } from '@/utils/fx/sunBodySprite'

/**
 * Die Endphase: Pyre detoniert, übrig bleibt ein opaker Ereignishorizont in
 * einer geneigten, Doppler-verstärkten Akkretionsscheibe, darüber die
 * gelinste Fernseite derselben Scheibe. Thermisch: weiss → gold → glut.
 *
 * Der Horizont bleibt voll opak — der Planeten-Tab lässt einen Planeten
 * HINTER der Sonne vorbeiziehen. `container-type: size` bleibt nur für die
 * Motes, die in cqw laufen; alles Gemalte ist ein Sprite.
 */
const props = withDefaults(defineProps<{ diameter: number; wake?: boolean }>(), { wake: false })

const phase = STAR_PHASE_DATA[STAR_PHASE_FINAL_INDEX]
const inspiralCount = BLACK_HOLE_INSPIRAL_COUNT
const solarStore = useSolarUpgradeStore()
const host = ref<HTMLDivElement | null>(null)

const detail = computed(() => sunSpriteDetail(props.diameter))
const body = computed(() => sunBodyFor(solarStore, solarStore.solarSignature))

const wakePaused = computed(() => {
  if (!props.wake) return false
  const galaxyStore = useGalaxyStore()
  return galaxyStore.isRescueRotating || galaxyStore.starsBackgroundPaused
})

/** Die Trümmer wachsen mit der Klick-Achse — in der GRÖSSE, nie in der Zahl. */
const moteFactor = computed(
  () => 1 + (body.value.sig.spark / (SOLAR_SIGNATURE_STAGES.length - 1)) * SOLAR_SIGNATURE_BH_MOTE_GAIN,
)

const vars = computed((): Record<string, string> => ({
  '--bh-d': `${props.diameter}px`,
  '--bh-core': phase.core,
  '--bh-glow': phase.phaseGlow,
  '--bh-tilt': `${BLACK_HOLE_DISC_TILT}`,
  '--bh-spin': `${BLACK_HOLE_DISC_SPIN_SEC}s`,
  '--bh-jet-pulse': `${BLACK_HOLE_JET_PULSE_SEC}s`,
  '--bh-inspiral': `${BLACK_HOLE_INSPIRAL_SEC}s`,
  '--bh-mote-f': `${moteFactor.value}`,
  '--sun-xfade': `${SUN_SPRITE_CROSSFADE_MS}ms`,
  '--sun-wake-sec': `${SUN_WAKE_SEC}s`,
}))

function moteStyle(index: number): Record<string, string> {
  const offset = ((index - 1) / inspiralCount) * BLACK_HOLE_INSPIRAL_SEC
  return { animationDelay: `${-offset}s` }
}

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
</script>

<style scoped>
.bh-root {
  position: absolute;
  top: 50%;
  left: 50%;
  container-type: size;
  width: var(--bh-d, 200px);
  height: var(--bh-d, 200px);
  transform: translate(-50%, -50%);
  transition:
    width 1.2s ease,
    height 1.2s ease;
  /* Schwerer, langsamer als ein brennender Stern — Masse, nicht Feuer. */
  animation: bh-breathe 7s ease-in-out infinite;
}

.bh-jets {
  --span: 1.2;
  z-index: 0;
  animation: bh-jet-pulse var(--bh-jet-pulse, 3.4s) ease-in-out infinite;
}

.bh-halo {
  --span: 1;
  z-index: 1;
}

/* Die Ebene ist ein auf Y gestauchter Vollkreis; die Scheibe dreht darin als
   runde Grafik — Compositor-Arbeit statt animierter Verlauf. Zwei Hälften,
   geclippt um den Horizont. */
.bh-tilt {
  position: absolute;
  inset: 0;
  transform: scaleY(var(--bh-tilt, 0.58));
  pointer-events: none;
}

.bh-tilt--far {
  z-index: 2;
  clip-path: inset(0 0 50% 0);
}

.bh-tilt--near {
  z-index: 4;
  clip-path: inset(50% 0 0 0);
}

.bh-disc {
  --span: 1;
  animation: bh-spin var(--bh-spin, 16s) linear infinite;
}

/* Doppler und heisser Innenrand stehen im Bildraum — sie drehen nicht mit. */
.bh-glaze {
  --span: 1;
}

.bh-shadow {
  --span: 0.8;
  z-index: 3;
}

.bh-ring {
  --span: 0.5;
  z-index: 3;
  animation: bh-ring-pulse 2.6s ease-in-out infinite;
}

.bh-inspiral {
  position: absolute;
  inset: 0;
  z-index: 5;
  transform: scaleY(var(--bh-tilt, 0.58));
  pointer-events: none;
}

.bh-mote {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(1.2cqw * var(--bh-mote-f, 1));
  height: calc(1.2cqw * var(--bh-mote-f, 1));
  border-radius: 50%;
  background: var(--bh-core, #ffffff);
  box-shadow: 0 0 calc(2cqw * var(--bh-mote-f, 1)) var(--bh-glow, #ffd08a);
  animation: bh-inspiral var(--bh-inspiral, 5.5s) linear infinite;
}

.sun-wake-group {
  position: absolute;
  inset: 0;
  z-index: 6;
  transition: opacity 0.6s ease;
}

.sun-wake-group.paused {
  opacity: 0;
}

.sun-wake-group.paused .bh-wake {
  animation-play-state: paused;
}

.bh-wake {
  --span: 2;
  opacity: 0;
  animation: bh-wake-out var(--sun-wake-sec, 2.4s) ease-in infinite;
}

@keyframes bh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes bh-breathe {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.018);
  }
}

@keyframes bh-ring-pulse {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes bh-jet-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.92;
  }
}

@keyframes bh-wake-out {
  0% {
    transform: scale(1);
    opacity: 0;
  }
  15% {
    opacity: 0.8;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

/* Spiralt vom Scheibenrand bis zum Photonenring; > 360°, damit es ein Bogen ist. */
@keyframes bh-inspiral {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) translateX(46cqw) scale(1);
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  88% {
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) rotate(760deg) translateX(21cqw) scale(0.35);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bh-root,
  .bh-disc,
  .bh-ring,
  .bh-jets,
  .bh-mote {
    animation: none;
  }

  /* Ohne Spirale lägen die Motes alle in der Mitte. */
  .bh-inspiral,
  .sun-wake-group {
    display: none;
  }
}
</style>
