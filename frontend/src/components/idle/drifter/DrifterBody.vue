<template>
  <!-- Der Körper IST das Artwork. Was in der Zeit läuft, sind dünne DOM-Ebenen
       darüber — nur opacity und transform. -->
  <span
    class="dbody"
    :class="[`dbody--${def.body}`, { 'dbody--still': still }]"
    :style="tint"
    aria-hidden="true"
  >
    <span class="db-turn" :class="{ 'db-turn--live': live && turns }">
      <span class="db-core" :style="coreStyle">
        <span class="db-motion">
          <img class="db-art" :src="def.image" alt="" decoding="async" draggable="false" />

          <span v-if="sheen" class="db-sheen" :style="sheenStyle">
            <i class="db-sheen-band"></i>
          </span>

          <i v-if="def.body === 'chime'" class="db-fx db-glint" :style="fxStyle"></i>
          <i v-else-if="def.body === 'shard'" class="db-fx db-ember" :style="fxStyle"></i>
          <i v-else-if="def.body === 'probe'" class="db-fx db-strobe" :style="fxStyle"></i>
          <i v-else-if="def.body === 'surge'" class="db-fx db-roar" :style="fxStyle"></i>
          <i v-else-if="def.body === 'vortex'" class="db-fx db-flash" :style="fxStyle"></i>
          <template v-else-if="def.body === 'beacon'">
            <span class="db-beam" :style="lampStyle">
              <i class="db-lobe"></i>
              <i class="db-lobe db-lobe--b"></i>
            </span>
            <i class="db-fx db-lamp" :style="lampStyle"></i>
          </template>
          <template v-else-if="def.body === 'pulse'">
            <i class="db-fx db-shock" :style="fxStyle"></i>
            <i class="db-fx db-flash" :style="fxStyle"></i>
          </template>
          <i v-else-if="def.body === 'leviathan'" class="db-fx db-lume" :style="fxStyle"></i>
        </span>

        <i v-if="def.body === 'meep'" class="db-fx db-bubble" :style="fxStyle"></i>
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { hexToRgba } from '@/utils/ui/format'
import {
  DRIFTER_ART_POSE,
  DRIFTER_BEACON_LAMP_FRAC,
  DRIFTER_BEACON_LOBE_LEN,
} from '@/config/constants'
import type { DrifterDef } from '@/types'

const props = withDefaults(
  defineProps<{
    def: DrifterDef
    /** Motion amplitude of the rarity stage, 0..1. Lower means slower. */
    motion: number
    /** In flight: the turn is written per frame and earns `will-change`. */
    live?: boolean
    /** Holds the signature motion — for grids of previews. */
    still?: boolean
    /** Foil light across the artwork (rarity stage). */
    sheen?: boolean
  }>(),
  { live: false, still: false, sheen: false },
)

const pose = computed(() => DRIFTER_ART_POSE[props.def.body])
const turns = computed(() => pose.value.orient !== 'still')
const mo = computed(() => Math.max(0.2, props.motion))

const tint = computed(() => ({
  '--c': props.def.color,
  '--c-80': hexToRgba(props.def.color, 0.8),
  '--c-55': hexToRgba(props.def.color, 0.55),
  '--c-30': hexToRgba(props.def.color, 0.3),
  '--c-0': hexToRgba(props.def.color, 0),
  '--mo': `${mo.value}`,
}))

/** Im Flug sitzt der Kern auf der Körpermitte; als Porträt steht das ganze Bild
 *  eingepasst, sonst ragte der gemalte Schweif aus der Bühne. */
const artScale = computed(() => (props.live ? pose.value.scale : Math.min(1, pose.value.scale)))

const coreStyle = computed(() => {
  const core = props.live ? pose.value.core : { x: 0.5, y: 0.5 }
  const scale = artScale.value
  return {
    width: `${scale * 100}%`,
    height: `${scale * 100}%`,
    left: `${(50 - core.x * scale * 100).toFixed(2)}%`,
    top: `${(50 - core.y * scale * 100).toFixed(2)}%`,
    '--core-origin': `${core.x * 100}% ${core.y * 100}%`,
  }
})

const fxStyle = computed(() => ({
  left: `${pose.value.fx.x * 100}%`,
  top: `${pose.value.fx.y * 100}%`,
}))

const lampStyle = computed(() => ({
  ...fxStyle.value,
  width: `${DRIFTER_BEACON_LAMP_FRAC * 100}%`,
  height: `${DRIFTER_BEACON_LAMP_FRAC * 100}%`,
  '--lobe-len': `${((DRIFTER_BEACON_LOBE_LEN / (DRIFTER_BEACON_LAMP_FRAC * artScale.value)) * 100).toFixed(0)}%`,
}))

const sheenStyle = computed(() => ({
  '-webkit-mask-image': `url("${props.def.image}")`,
  'mask-image': `url("${props.def.image}")`,
}))
</script>

<style scoped>
/* Only `transform` and `opacity` are ever animated. Durations divide by `--mo`:
   a common drifter moves slower as well as less. */
.dbody {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.db-turn {
  position: absolute;
  inset: 0;
}

.db-turn--live {
  will-change: transform;
}

.db-core {
  position: absolute;
  transform-origin: var(--core-origin);
}

.db-motion {
  position: absolute;
  inset: 0;
  transform-origin: var(--core-origin);
}

/* Preflight setzt max-width: 100 % und height: auto — beides staucht die Box. */
.db-art {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  image-rendering: high-quality;
  user-select: none;
}

/* ── Signaturbewegung je Motiv ── */
.dbody--chime .db-motion {
  animation: db-tumble calc(3800ms / var(--mo)) ease-in-out infinite alternate;
}
.dbody--shard .db-motion {
  animation: db-wobble calc(2400ms / var(--mo)) ease-in-out infinite alternate;
}
.dbody--meep .db-motion {
  animation: db-float calc(3400ms / var(--mo)) ease-in-out infinite alternate;
}
.dbody--probe .db-motion {
  animation: db-roll calc(5200ms / var(--mo)) ease-in-out infinite alternate;
}
.dbody--surge .db-motion {
  animation: db-heat calc(900ms / var(--mo)) ease-in-out infinite;
}
.dbody--vortex .db-core {
  animation: db-spin calc(20000ms / var(--mo)) linear infinite;
}
.dbody--vortex .db-motion {
  animation: db-heat calc(3000ms / var(--mo)) ease-in-out infinite;
}
.dbody--beacon .db-motion {
  animation: db-bob calc(3000ms / var(--mo)) ease-in-out infinite alternate;
}
.dbody--pulse .db-core {
  animation: db-spin calc(36000ms / var(--mo)) linear infinite;
}
.dbody--pulse .db-motion {
  animation: db-beat calc(1500ms / var(--mo)) ease-out infinite;
}
.dbody--leviathan .db-motion {
  animation: db-swim calc(5200ms / var(--mo)) ease-in-out infinite alternate;
}

@keyframes db-tumble {
  from {
    transform: translateY(-3%) rotate(-12deg);
  }
  to {
    transform: translateY(3%) rotate(12deg);
  }
}

@keyframes db-wobble {
  from {
    transform: rotate(-5deg);
  }
  to {
    transform: rotate(5deg);
  }
}

@keyframes db-float {
  from {
    transform: translateY(-5%) rotate(-4deg);
  }
  to {
    transform: translateY(5%) rotate(4deg);
  }
}

@keyframes db-roll {
  from {
    transform: translateY(-3%) rotate(-10deg);
  }
  to {
    transform: translateY(3%) rotate(10deg);
  }
}

@keyframes db-heat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.045);
  }
}

@keyframes db-bob {
  from {
    transform: translateY(-4%);
  }
  to {
    transform: translateY(4%);
  }
}

/* lub-dub: zwei Schläge, dann Ruhe. */
@keyframes db-beat {
  0%,
  40%,
  100% {
    transform: scale(1);
  }
  8% {
    transform: scale(1.08);
  }
  16% {
    transform: scale(0.99);
  }
  26% {
    transform: scale(1.05);
  }
}

@keyframes db-swim {
  from {
    transform: translateY(-2%) rotate(-2.5deg);
  }
  to {
    transform: translateY(2%) rotate(2.5deg);
  }
}

@keyframes db-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ── Foil-Sheen (rare+): das Band läuft nur über die Deckung des Artworks ── */
.db-sheen {
  position: absolute;
  inset: 0;
  overflow: hidden;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.db-sheen-band {
  position: absolute;
  top: -25%;
  left: 0;
  width: 45%;
  height: 150%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.5) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: translateX(-130%) rotate(18deg);
  animation: db-sheen calc(4600ms / var(--mo)) ease-in-out infinite;
}

@keyframes db-sheen {
  0% {
    transform: translateX(-130%) rotate(18deg);
  }
  32%,
  100% {
    transform: translateX(330%) rotate(18deg);
  }
}

/* ── Zeit-Overlays an den Ankern der Pose ── */
.db-fx,
.db-beam {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.db-glint {
  width: 20%;
  height: 20%;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c-55) 45%, var(--c-0) 72%);
  animation: db-glint calc(2600ms / var(--mo)) ease-in-out infinite;
}

@keyframes db-glint {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0.35;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 1;
  }
}

.db-ember {
  width: 30%;
  height: 30%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--c-55) 0%, var(--c-0) 70%);
  animation: db-breathe calc(1900ms / var(--mo)) ease-in-out infinite;
}

.db-bubble {
  width: 108%;
  height: 108%;
  border-radius: 50%;
  border: 1px solid rgba(238, 244, 250, 0.35);
  background: radial-gradient(circle at 35% 30%, rgba(238, 244, 250, 0.16) 0%, rgba(238, 244, 250, 0) 42%);
  animation: db-bubble calc(3400ms / var(--mo)) ease-in-out infinite;
}

@keyframes db-bubble {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.98);
    opacity: 0.5;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.03);
    opacity: 0.9;
  }
}

.db-strobe {
  width: 11%;
  height: 11%;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c) 40%, var(--c-0) 75%);
  animation: db-strobe calc(2200ms / var(--mo)) linear infinite;
}

@keyframes db-strobe {
  0%,
  86% {
    opacity: 0.12;
  }
  88%,
  94% {
    opacity: 1;
  }
  96%,
  100% {
    opacity: 0.12;
  }
}

.db-roar {
  width: 34%;
  height: 34%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--c-55) 0%, var(--c-0) 70%);
  animation: db-flicker calc(700ms / var(--mo)) steps(3, end) infinite;
}

@keyframes db-flicker {
  0% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 0.35;
  }
}

.db-flash {
  width: 24%;
  height: 24%;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c-55) 40%, var(--c-0) 70%);
  animation: db-breathe calc(1500ms / var(--mo)) ease-in-out infinite;
}

/* Gradient statt Rand: ein skalierter Rand wäre am dünnsten, solange er sichtbar ist. */
.db-shock {
  width: 60%;
  height: 60%;
  border-radius: 50%;
  opacity: 0;
  background: radial-gradient(circle, var(--c-0) 55%, var(--c-55) 80%, #ffffff 88%, var(--c-0) 100%);
  animation: db-shock calc(1500ms / var(--mo)) ease-out infinite;
}

@keyframes db-shock {
  0% {
    transform: translate(-50%, -50%) scale(0.4);
    opacity: 0.9;
  }
  45%,
  100% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0;
  }
}

.db-beam {
  animation: db-beam calc(3800ms / var(--mo)) linear infinite;
}

@keyframes db-beam {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.db-lobe {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--lobe-len);
  height: 60%;
  transform-origin: 0 50%;
  transform: translateY(-50%);
  clip-path: polygon(0% 44%, 0% 56%, 100% 100%, 100% 0%);
  background: linear-gradient(90deg, var(--c-55) 0%, var(--c-30) 40%, var(--c-0) 100%);
}

.db-lobe--b {
  transform: translateY(-50%) rotate(180deg);
}

.db-lamp {
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c-80) 35%, var(--c-0) 70%);
  animation: db-breathe calc(1300ms / var(--mo)) ease-in-out infinite;
}

.db-lume {
  width: 22%;
  height: 16%;
  border-radius: 50%;
  opacity: 0;
  background: radial-gradient(ellipse, var(--c-55) 0%, var(--c-0) 70%);
  animation: db-lume calc(4200ms / var(--mo)) ease-in-out infinite;
}

@keyframes db-lume {
  0% {
    transform: translate(-190%, -50%);
    opacity: 0;
  }
  30%,
  70% {
    opacity: 0.85;
  }
  100% {
    transform: translate(90%, -50%);
    opacity: 0;
  }
}

@keyframes db-breathe {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.85);
    opacity: 0.45;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
}

.dbody--still * {
  animation: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .dbody * {
    animation: none !important;
  }
}
</style>
