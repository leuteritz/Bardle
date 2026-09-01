<template>
  <!-- The flying object itself: ONE rastered sprite (utils/fx/drifterSprite.ts)
       that DrifterObject turns to the sun once per frame, plus the few things
       that move in TIME as thin DOM overlays — opacity and transform only.
       A drifter is a BODY IN THE SUN'S LIGHT, not a sign on the sky; the icon
       lives on in the HUD chips. -->
  <span
    class="dbody"
    :class="[`dbody--${kind}`, { 'dbody--spin': spins }]"
    :style="tint"
    aria-hidden="true"
  >
    <span class="db-turn" :class="{ 'db-turn--live': live && lit }">
      <span ref="spriteEl" class="db-sprite"></span>

      <i v-if="kind === 'chime'" class="db-fx db-glint" :style="glintStyle"></i>
      <i v-else-if="kind === 'shard'" class="db-fx db-ablate"></i>
      <i v-else-if="kind === 'meep'" class="db-fx db-bubble"></i>
      <i v-else-if="kind === 'probe'" class="db-fx db-strobe" :style="strobeStyle"></i>
      <i v-else-if="kind === 'surge'" class="db-fx db-roar"></i>
      <template v-else-if="kind === 'beacon'">
        <span class="db-beam" :style="lampStyle">
          <i class="db-lobe"></i>
          <i class="db-lobe db-lobe--b"></i>
        </span>
        <i class="db-fx db-lamp" :style="lampStyle"></i>
      </template>
      <i v-else-if="kind === 'pulse'" class="db-fx db-flash"></i>
      <i v-else-if="kind === 'leviathan'" class="db-fx db-lume"></i>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { hexToRgba } from '@/utils/ui/format'
import {
  DRIFTER_BEACON_LOBE_LEN,
  DRIFTER_BODY_LIT,
  DRIFTER_BODY_SPIN,
  DRIFTER_SPRITE_SPAN,
  DRIFTER_TUMBLE_MS,
} from '@/config/constants'
import type { DrifterBodyKind } from '@/types'
import {
  beaconLampAt,
  buildDrifterSprite,
  chimeGlintAt,
  drifterArtReady,
  onDrifterArtLoad,
  probeStrobeAt,
} from '@/utils/fx/drifterSprite'
import { blitSprite, clampSpriteDpr } from '@/utils/fx/spaceBody'

const props = withDefaults(
  defineProps<{
    kind: DrifterBodyKind
    /** The drifter's signature color — every overlay tints off this one value. */
    color: string
    /** Motion amplitude of the rarity stage, 0..1. Lower means slower. */
    motion: number
    /** Edge of the body in CSS px — the sprite is rastered at this size. */
    px: number
    /** Sprite detail of the rarity stage. */
    detail: 0 | 1 | 2
    /** In flight: the turn is written per frame and earns `will-change`. */
    live?: boolean
  }>(),
  { live: false },
)

const mo = computed(() => Math.max(0.2, props.motion))
const lit = computed(() => DRIFTER_BODY_LIT[props.kind])
const spins = computed(() => DRIFTER_BODY_SPIN[props.kind])

const tint = computed(() => ({
  '--c': props.color,
  '--c-80': hexToRgba(props.color, 0.8),
  '--c-55': hexToRgba(props.color, 0.55),
  '--c-30': hexToRgba(props.color, 0.3),
  '--c-0': hexToRgba(props.color, 0),
  '--mo': `${mo.value}`,
  '--tumble-ms': `${Math.round(DRIFTER_TUMBLE_MS / mo.value)}ms`,
  '--db-span': `${DRIFTER_SPRITE_SPAN}`,
}))

/** Ein Punkt des Sprites (relativ zur Körpermitte, px) als Lage im Turn-Rahmen. */
function anchorStyle(at: { x: number; y: number; rad: number }, rad = at.rad) {
  const span = props.px * DRIFTER_SPRITE_SPAN
  return {
    left: `${(((span / 2 + at.x) / span) * 100).toFixed(2)}%`,
    top: `${(((span / 2 + at.y) / span) * 100).toFixed(2)}%`,
    width: `${((rad * 2) / span) * 100}%`,
    height: `${((rad * 2) / span) * 100}%`,
  }
}

const glintStyle = computed(() => anchorStyle(chimeGlintAt(props.px / 2)))
const strobeStyle = computed(() => {
  const at = probeStrobeAt(props.px / 2)
  return anchorStyle(at, at.rad * 2.4)
})
const lampStyle = computed(() => {
  const at = beaconLampAt(props.px / 2)
  return {
    ...anchorStyle(at, at.rad * 3),
    '--lobe-len': `${(((props.px * DRIFTER_BEACON_LOBE_LEN) / (at.rad * 6)) * 100).toFixed(0)}%`,
  }
})

// ── Der Sprite ──────────────────────────────────────────────────────────────
// Geblittet, nicht eingehängt: derselbe Körper steht im Flug, auf der Karte und
// im Admin-Panel zugleich. Einmal je Mount und Grösse, nie im Frame.

const spriteEl = ref<HTMLElement | null>(null)
let unsubArt: (() => void) | null = null

function mountSprite(): void {
  const host = spriteEl.value
  if (!host) return
  blitSprite(
    host,
    buildDrifterSprite(
      props.kind,
      props.color,
      props.px,
      clampSpriteDpr(window.devicePixelRatio || 1),
      props.detail,
    ),
  )
  if (!drifterArtReady(props.kind) && !unsubArt) {
    unsubArt = onDrifterArtLoad(() => {
      unsubArt?.()
      unsubArt = null
      mountSprite()
    })
  }
}

onMounted(() => void nextTick(mountSprite))
watch(
  () => [props.kind, props.color, props.px, props.detail],
  () => void nextTick(mountSprite),
)
onUnmounted(() => {
  unsubArt?.()
  unsubArt = null
})
</script>

<style scoped>
/* Only `transform` and `opacity` are ever animated; every gradient is static and
   rastered once. Durations divide by `--mo`: a common drifter moves slower as
   well as less. */
.dbody {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* The turn frame is span-sized around the body and centred on it — the sun
   side is baked into the sprite, so turning this one element turns the light. */
.db-turn {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(100% * var(--db-span));
  height: calc(100% * var(--db-span));
  margin: calc(-50% * var(--db-span)) 0 0 calc(-50% * var(--db-span));
}

.db-turn--live {
  will-change: transform;
}

/* Self-luminous bodies carry no baked light and may spin freely. */
.dbody--spin .db-turn {
  animation: db-spin var(--tumble-ms) linear infinite;
}

.db-sprite {
  position: absolute;
  inset: 0;
}

.db-sprite :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.db-fx,
.db-beam {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* ── Errant Chime: der Glanzpunkt an der Spitze ── */
.db-glint {
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

/* ── Ember Shard: Ablation auf der Sonnenseite (links im Sprite-Raum) ── */
.db-ablate {
  top: 50%;
  left: 26%;
  width: 34%;
  height: 46%;
  border-radius: 50%;
  background: radial-gradient(ellipse at 40% 50%, var(--c-55) 0%, var(--c-0) 70%);
  animation: db-breathe calc(1900ms / var(--mo)) ease-in-out infinite;
}

/* ── Lost Meep: die Blase atmet ── */
.db-bubble {
  top: 50%;
  left: 50%;
  width: 66%;
  height: 66%;
  border-radius: 50%;
  border: 1px solid rgba(238, 244, 250, 0.35);
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

/* ── Salvage Probe: der Nav-Strobe, hart und kurz ── */
.db-strobe {
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

/* ── Coronal Surge: Flackern über dem ganzen Bogen ── */
.db-roar {
  top: 50%;
  left: 50%;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--c-30) 0%, var(--c-0) 70%);
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

/* ── Wayfarer's Beacon: rotierende Doppelkeule und Lampenpuls ── */
.db-beam {
  animation: db-spin calc(3800ms / var(--mo)) linear infinite;
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

/* ── Sundering Pulse: der Kern schlägt ── */
.db-flash {
  top: 50%;
  left: 50%;
  width: 40%;
  height: 40%;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c-55) 40%, var(--c-0) 70%);
  animation: db-breathe calc(900ms / var(--mo)) ease-in-out infinite;
}

/* ── Star Leviathan: Licht wandert unter der Haut ── */
.db-lume {
  top: 52%;
  left: 50%;
  width: 26%;
  height: 22%;
  border-radius: 50%;
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

@keyframes db-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dbody * {
    animation: none !important;
  }
}
</style>
