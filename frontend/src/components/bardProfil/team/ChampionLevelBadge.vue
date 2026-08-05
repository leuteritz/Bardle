<script setup lang="ts">
/**
 * The level medallion a champion wears — one component for every place the
 * team tab prints a champion level (sigil node, ally satellite, details strip,
 * level panel). Its look escalates with the level through CHAMPION_REGALIA_STAGES:
 * a plain disc at level 1, a crowned and ray-lit medallion at the level cap.
 *
 * Everything is drawn in the champion's single identity colour — rank is told
 * through metal, geometry, brightness and motion, never through a second hue.
 *
 * Cost: only transform-animated layers, and the ornaments are dropped on small
 * badges, so a full board (5 nodes + 15 satellites) stays cheap to composite.
 */
import { computed } from 'vue'
import { regaliaStageFor, regaliaStageIndexFor } from '@/config/champions/championLevels'
import {
  CHAMPION_REGALIA_BASE_SIZE,
  CHAMPION_REGALIA_ORNAMENT_MIN_SIZE,
  CHAMPION_REGALIA_SHEEN_MS,
  CHAMPION_REGALIA_ORBIT_MS,
  CHAMPION_REGALIA_RAYS_MS,
  CHAMPION_REGALIA_FONT_RATIO,
  CHAMPION_REGALIA_STAGES,
} from '@/config/constants'
import { facetClipPath } from '@/utils/orbit/geometry'

const props = withDefaults(
  defineProps<{
    level: number
    /** The champion's identity colour — the whole medallion is drawn in it. */
    color: string
    /** Medallion diameter in px; every other measure scales off it. */
    size?: number
    /** Banked XP or an unspent perk — adds a ping, never a second colour. */
    attention?: boolean
  }>(),
  { size: CHAMPION_REGALIA_BASE_SIZE, attention: false },
)

const stage = computed(() => regaliaStageFor(props.level))
const stageIndex = computed(() => regaliaStageIndexFor(props.level))
const isApex = computed(() => stageIndex.value === CHAMPION_REGALIA_STAGES.length - 1)

/** Ornaments need room — on a 21px satellite they would only add noise. */
const ornate = computed(() => props.size >= CHAMPION_REGALIA_ORNAMENT_MIN_SIZE)

const showSheen = computed(() => stage.value.sheen)
const showDualSheen = computed(() => ornate.value && stage.value.sheenDual)
const showOrbit = computed(() => ornate.value && stage.value.orbit)
const showRays = computed(() => ornate.value && stage.value.rays)
const showCrown = computed(() => ornate.value && stage.value.crown)

const label = computed(() => `Level ${props.level} — ${stage.value.name}`)

/**
 * Percentages fed to color-mix and px values scaled from the authored base
 * size. Resolved here rather than in CSS so the stylesheet stays readable and
 * no nested calc() chains end up in a color-mix argument.
 */
const vars = computed(() => {
  const s = stage.value
  const k = props.size / CHAMPION_REGALIA_BASE_SIZE
  const px = (v: number) => `${Math.round(v * k * 100) / 100}px`
  return {
    '--rg-c': props.color,
    '--rg-size': `${props.size}px`,
    '--rg-rim': px(s.rim),
    '--rg-glow': px(s.glow),
    '--rg-glow-a': `${Math.round(s.glowAlpha * 100)}%`,
    // rim runs hottest, the numeral a touch cooler so the digits stay readable
    '--rg-heat': `${Math.round(s.heat * 100)}%`,
    '--rg-heat-soft': `${Math.round(s.heat * 72)}%`,
    '--rg-core': `${Math.round(14 + s.heat * 30)}%`,
    '--rg-font': `${Math.round(props.size * CHAMPION_REGALIA_FONT_RATIO)}px`,
    '--rg-facets': facetClipPath(s.facets),
    '--rg-sheen-ms': `${CHAMPION_REGALIA_SHEEN_MS}ms`,
    '--rg-orbit-ms': `${CHAMPION_REGALIA_ORBIT_MS}ms`,
    '--rg-rays-ms': `${CHAMPION_REGALIA_RAYS_MS}ms`,
  }
})
</script>

<template>
  <span
    class="rg"
    :class="[
      `rg--s${stageIndex}`,
      { 'rg--apex': isApex, 'rg--attention': attention, 'rg--ornate': ornate },
    ]"
    :style="vars"
    :title="label"
    :aria-label="label"
  >
    <span v-if="showRays" class="rg-rays" aria-hidden="true" />
    <span v-if="isApex" class="rg-corona" aria-hidden="true" />
    <span v-if="stage.facets > 0" class="rg-plate" aria-hidden="true" />
    <span class="rg-disc" aria-hidden="true" />
    <span v-if="showSheen" class="rg-sheen" aria-hidden="true" />
    <span v-if="showDualSheen" class="rg-sheen rg-sheen--rev" aria-hidden="true" />
    <span v-if="showOrbit" class="rg-orbit" aria-hidden="true"><i class="rg-spark" /></span>
    <span v-if="showCrown" class="rg-crown" aria-hidden="true" />
    <span v-if="attention" class="rg-ping" aria-hidden="true" />
    <span class="rg-num">{{ level }}</span>
  </span>
</template>

<style scoped>
.rg {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--rg-size);
  height: var(--rg-size);
  border-radius: 50%;
  line-height: 1;
  /* the disc carries the border — the wrapper must never add one */
  vertical-align: middle;
}
/* every layer but the numeral is decoration: the ornaments reach well past the
   disc (rays span ~2.2× its width) and must never swallow a click meant for
   whatever sits behind them */
.rg > *:not(.rg-num) {
  pointer-events: none;
}

/* ── the disc itself — every stage has one, it only gets richer ── */
.rg-disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 32%,
    color-mix(in srgb, var(--rg-c) var(--rg-core), #1a130c),
    #0a0704 76%
  );
  border: var(--rg-rim) solid color-mix(in srgb, #fff var(--rg-heat), var(--rg-c));
  box-shadow:
    0 0 var(--rg-glow) color-mix(in srgb, var(--rg-c) var(--rg-glow-a), transparent),
    inset 0 1px 2px rgba(255, 255, 255, 0.14),
    0 2px 6px rgba(0, 0, 0, 0.7);
}
/* something is waiting on this champion — brighter core, same hue */
.rg--attention .rg-disc {
  background: radial-gradient(
    circle at 50% 32%,
    color-mix(in srgb, var(--rg-c) 42%, #1a130c),
    #0a0704 78%
  );
}

/* ── faceted plate (stage ≥ Tempered) — the medallion sits on cut metal ── */
.rg-plate {
  position: absolute;
  inset: calc(var(--rg-rim) * -2.1);
  clip-path: var(--rg-facets);
  background: color-mix(in srgb, var(--rg-c) 62%, #0a0704);
}
.rg-plate::after {
  content: '';
  position: absolute;
  inset: 1.5px;
  clip-path: var(--rg-facets);
  background: linear-gradient(
    155deg,
    color-mix(in srgb, var(--rg-c) 22%, #0a0704),
    #0a0704 58%,
    color-mix(in srgb, var(--rg-c) 14%, #0a0704)
  );
}
/* the apex plate turns slowly — five nodes at most, so it stays cheap */
.rg--apex .rg-plate {
  animation: rg-spin var(--rg-rays-ms) linear infinite reverse;
}

/* ── rim reflection (stage ≥ Sigil) ── */
.rg-sheen {
  position: absolute;
  inset: calc(var(--rg-rim) * -1.15);
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    color-mix(in srgb, #fff 60%, var(--rg-c)) 20deg,
    transparent 56deg,
    transparent 200deg,
    color-mix(in srgb, var(--rg-c) 85%, transparent) 224deg,
    transparent 262deg
  );
  -webkit-mask-image: radial-gradient(closest-side, transparent 74%, #000 84%, #000 100%);
  mask-image: radial-gradient(closest-side, transparent 74%, #000 84%, #000 100%);
  animation: rg-spin var(--rg-sheen-ms) linear infinite;
}
.rg-sheen--rev {
  inset: calc(var(--rg-rim) * -2.4);
  opacity: 0.6;
  animation-duration: calc(var(--rg-sheen-ms) * 1.7);
  animation-direction: reverse;
}

/* ── orbiting spark (stage ≥ Paragon) ── */
.rg-orbit {
  position: absolute;
  inset: calc(var(--rg-size) * -0.15);
  animation: rg-spin var(--rg-orbit-ms) linear infinite;
}
.rg-spark {
  position: absolute;
  left: 50%;
  top: 0;
  width: calc(var(--rg-size) * 0.14);
  height: calc(var(--rg-size) * 0.14);
  margin-left: calc(var(--rg-size) * -0.07);
  border-radius: 50%;
  background: color-mix(in srgb, #fff 62%, var(--rg-c));
  box-shadow: 0 0 calc(var(--rg-size) * 0.22) var(--rg-c);
}

/* ── crown (stage ≥ Sovereign) — three spikes on the top edge ── */
.rg-crown {
  position: absolute;
  left: 50%;
  top: calc(var(--rg-size) * -0.28);
  width: calc(var(--rg-size) * 0.54);
  height: calc(var(--rg-size) * 0.3);
  transform: translateX(-50%);
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, #fff 62%, var(--rg-c)),
    var(--rg-c) 70%,
    color-mix(in srgb, var(--rg-c) 70%, #0a0704)
  );
  clip-path: polygon(0% 100%, 0% 14%, 22% 58%, 50% 0%, 78% 58%, 100% 14%, 100% 100%);
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--rg-c) 65%, transparent));
}

/* ── apex only: rays behind the medallion and a breathing corona ── */
.rg-rays {
  position: absolute;
  inset: -58%;
  background: repeating-conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--rg-c) 70%, transparent) 0deg 2.5deg,
    transparent 2.5deg 18deg
  );
  -webkit-mask-image: radial-gradient(closest-side, transparent 40%, #000 56%, transparent 88%);
  mask-image: radial-gradient(closest-side, transparent 40%, #000 56%, transparent 88%);
  opacity: 0.55;
  animation: rg-spin var(--rg-rays-ms) linear infinite;
}
.rg-corona {
  position: absolute;
  inset: -24%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--rg-c) 40%, transparent) 38%,
    transparent 70%
  );
  animation: rg-breathe 3.4s ease-in-out infinite;
}

/* ── attention ping — expanding ring, transform/opacity only ── */
.rg-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: var(--rg-rim) solid var(--rg-c);
  animation: rg-ping 1.9s ease-out infinite;
}

/* ── the numeral ── */
.rg-num {
  position: relative;
  z-index: 2;
  font-size: var(--rg-font);
  font-weight: 800;
  color: color-mix(in srgb, #fff var(--rg-heat-soft), var(--rg-c));
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 calc(var(--rg-glow) * 0.4) color-mix(in srgb, var(--rg-c) 70%, transparent);
}
.rg--apex .rg-num {
  color: #fff;
}

@keyframes rg-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes rg-breathe {
  0%,
  100% {
    transform: scale(0.94);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.95;
  }
}
@keyframes rg-ping {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rg-rays,
  .rg-corona,
  .rg-sheen,
  .rg-orbit,
  .rg-ping,
  .rg--apex .rg-plate {
    animation: none !important;
  }
}
</style>
