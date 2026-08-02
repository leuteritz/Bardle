<template>
  <!-- The flying object itself, drawn entirely in CSS — no icon, no image.
       Every drifter type gets its own silhouette so a shard, a probe and a
       leviathan are told apart at a glance, mid-flight, from across the
       screen. The icon lives on in the HUD (info card, buff chip, herald). -->
  <span class="dbody" :class="`dbody--${kind}`" :style="tint" aria-hidden="true">
    <!-- Errant Chime — a spinning gem inside a ringing halo, two motes circling. -->
    <template v-if="kind === 'chime'">
      <span class="ch-halo"></span>
      <span class="ch-orbit">
        <i class="ch-mote"></i>
        <i class="ch-mote ch-mote--b"></i>
      </span>
      <span class="ch-gem"></span>
    </template>

    <!-- Ember Shard — a splinter of burning rock, trailing its own embers. -->
    <template v-else-if="kind === 'shard'">
      <span class="sh-echo"></span>
      <span class="sh-main"></span>
      <span class="sh-ember"></span>
      <span class="sh-ember sh-ember--b"></span>
    </template>

    <!-- Lost Meep — round, wide-eyed, antenna bobbing as it tumbles along. -->
    <template v-else-if="kind === 'meep'">
      <span class="mp-antenna"><i class="mp-bulb"></i></span>
      <span class="mp-shell">
        <i class="mp-eye"></i>
        <i class="mp-eye mp-eye--r"></i>
      </span>
    </template>

    <!-- Salvage Probe — panelled hull, dashed scanner ring, sweeping scan line. -->
    <template v-else-if="kind === 'probe'">
      <span class="pb-ring"></span>
      <span class="pb-panel"></span>
      <span class="pb-panel pb-panel--r"></span>
      <span class="pb-hull"><i class="pb-scan"></i></span>
      <span class="pb-led"></span>
    </template>

    <!-- Coronal Surge — a flaring core throwing off three staggered shockwaves. -->
    <template v-else-if="kind === 'surge'">
      <span class="sg-wave"></span>
      <span class="sg-wave sg-wave--b"></span>
      <span class="sg-wave sg-wave--c"></span>
      <span class="sg-flare">
        <i class="sg-beam"></i>
        <i class="sg-beam sg-beam--b"></i>
      </span>
      <span class="sg-core"></span>
    </template>

    <!-- Rift Echo — three tilted rings turning at odds around a dark eye. -->
    <template v-else-if="kind === 'vortex'">
      <span class="vx-ring vx-ring--a"></span>
      <span class="vx-ring vx-ring--b"></span>
      <span class="vx-ring vx-ring--c"></span>
      <span class="vx-core"></span>
    </template>

    <!-- Wayfarer's Beacon — a lighthouse lens: turning light cone, signal ping. -->
    <template v-else-if="kind === 'beacon'">
      <span class="bc-sweep"></span>
      <span class="bc-ring"></span>
      <span class="bc-housing"></span>
      <span class="bc-lens"></span>
    </template>

    <!-- Star Leviathan — the big one: hull, beating fluke, steering fin. -->
    <template v-else>
      <span class="lv-tail"></span>
      <span class="lv-hull">
        <i class="lv-back"></i>
        <i class="lv-eye"></i>
      </span>
      <span class="lv-fin"></span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { hexToRgba } from '@/utils/format'
import type { DrifterBodyKind } from '@/types'

const props = defineProps<{
  kind: DrifterBodyKind
  /** The drifter's signature color — every layer tints off this one value. */
  color: string
}>()

// Alpha steps of the signature color, resolved once per drifter. These never
// change during a flight, so a container variable is free here — the per-frame
// values (position, heading) stay inline on the elements that move.
const tint = computed(() => ({
  '--c': props.color,
  '--c-80': hexToRgba(props.color, 0.8),
  '--c-55': hexToRgba(props.color, 0.55),
  '--c-30': hexToRgba(props.color, 0.3),
  '--c-12': hexToRgba(props.color, 0.12),
  '--c-0': hexToRgba(props.color, 0),
}))
</script>

<style scoped>
/* ── Shared frame ──────────────────────────────────────────────────────────
   Every part is sized off `--u` = 1 % of the body edge, so the same markup
   reads correctly at 44px (Ember Shard) and at 128px (Star Leviathan) without
   a second set of numbers. Percentages carry widths and offsets, `--u` carries
   line weights, which percentages cannot express.

   Performance: only `transform` and `opacity` are ever animated. Gradients,
   borders and the two small shadows below are STATIC — they are rastered once
   and then only moved by the compositor, which is what keeps a drifter free
   even while the orbit, a star fight and the background canvas all run. */
.dbody {
  --u: calc(var(--drifter-size, 48px) / 100);
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.dbody > * {
  position: absolute;
}

/* ── Errant Chime ── */
.ch-gem {
  top: 50%;
  left: 50%;
  width: 50%;
  height: 50%;
  margin: -25% 0 0 -25%;
  border-radius: 4px;
  background: radial-gradient(circle at 34% 26%, #fffdf2 0%, var(--c) 46%, #7a4e20 100%);
  box-shadow: inset 0 0 0 calc(2 * var(--u)) rgba(255, 255, 255, 0.35);
  animation: ch-turn 6s linear infinite;
}

.ch-halo {
  top: 50%;
  left: 50%;
  width: 86%;
  height: 86%;
  margin: -43% 0 0 -43%;
  border: calc(3 * var(--u)) solid var(--c-55);
  border-radius: 50%;
  animation: ch-halo 2.8s ease-in-out infinite;
}

.ch-orbit {
  inset: 0;
  animation: dbody-spin 4.6s linear infinite;
}

.ch-mote {
  position: absolute;
  top: 0;
  left: 50%;
  width: 13%;
  height: 13%;
  margin-left: -6.5%;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c) 70%);
}

.ch-mote--b {
  top: auto;
  bottom: 0;
}

@keyframes ch-turn {
  from {
    transform: rotate(45deg);
  }
  to {
    transform: rotate(405deg);
  }
}

@keyframes ch-halo {
  0%,
  100% {
    transform: scale(0.9);
    opacity: 0.45;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.95;
  }
}

/* ── Ember Shard ── */
.sh-main,
.sh-echo {
  top: 50%;
  left: 50%;
  /* An uneven splinter — deliberately not symmetrical, so the slow turn below
     actually reads as a tumbling rock instead of a spinning diamond. */
  clip-path: polygon(52% 0%, 80% 36%, 64% 100%, 28% 74%, 20% 28%);
}

.sh-main {
  width: 76%;
  height: 96%;
  margin: -48% 0 0 -38%;
  background: linear-gradient(158deg, #fff6e6 0%, var(--c) 40%, #5c1f04 100%);
  animation: sh-turn 3.6s ease-in-out infinite;
}

.sh-echo {
  width: 98%;
  height: 118%;
  margin: -59% 0 0 -49%;
  background: var(--c-55);
  animation: sh-echo 3.6s ease-in-out infinite;
}

.sh-ember {
  bottom: 6%;
  left: 38%;
  width: 10%;
  height: 10%;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c) 65%, var(--c-0) 100%);
  animation: sh-rise 2.2s linear infinite;
}

.sh-ember--b {
  left: 60%;
  animation-duration: 2.9s;
  animation-delay: -1.3s;
}

@keyframes sh-turn {
  0%,
  100% {
    transform: rotate(-8deg) scale(1);
  }
  50% {
    transform: rotate(9deg) scale(1.07);
  }
}

@keyframes sh-echo {
  0%,
  100% {
    transform: rotate(7deg) scale(1.04);
    opacity: 0.5;
  }
  50% {
    transform: rotate(-9deg) scale(0.92);
    opacity: 0.16;
  }
}

@keyframes sh-rise {
  0% {
    transform: translateY(20%) scale(0.5);
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  100% {
    transform: translateY(-120%) scale(0.25);
    opacity: 0;
  }
}

/* ── Lost Meep ── */
.mp-shell {
  top: 50%;
  left: 50%;
  width: 74%;
  height: 74%;
  margin: -37% 0 0 -37%;
  border: calc(3 * var(--u)) solid var(--c-80);
  border-radius: 50%;
  background: radial-gradient(circle at 34% 28%, #ffffff 0%, var(--c) 52%, #1d3a52 100%);
  animation: mp-squash 2.4s ease-in-out infinite;
}

.mp-eye {
  position: absolute;
  top: 34%;
  left: 24%;
  width: 15%;
  height: 19%;
  border-radius: 50%;
  background: #16140e;
  animation: mp-blink 4.6s ease-in-out infinite;
}

.mp-eye--r {
  left: 61%;
}

.mp-antenna {
  top: 2%;
  left: 50%;
  width: calc(4 * var(--u));
  height: 28%;
  margin-left: calc(-2 * var(--u));
  transform-origin: 50% 100%;
  background: var(--c-80);
  animation: mp-wave 2.8s ease-in-out infinite;
}

.mp-bulb {
  position: absolute;
  top: calc(-4 * var(--u));
  left: 50%;
  width: calc(10 * var(--u));
  height: calc(10 * var(--u));
  margin-left: calc(-5 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c) 70%);
}

@keyframes mp-squash {
  0%,
  100% {
    transform: scale(1.05, 0.95);
  }
  50% {
    transform: scale(0.95, 1.06);
  }
}

/* Long open stretch, one quick shut — a blink, not a strobe. */
@keyframes mp-blink {
  0%,
  92%,
  100% {
    transform: scaleY(1);
  }
  96% {
    transform: scaleY(0.08);
  }
}

@keyframes mp-wave {
  0%,
  100% {
    transform: rotate(-16deg);
  }
  50% {
    transform: rotate(16deg);
  }
}

/* ── Salvage Probe ── */
/* Solar panels flanking the hull: they give the probe a machined outline that
   a plain box cannot, and cost nothing — both are static. */
.pb-panel {
  top: 50%;
  left: 6%;
  width: 15%;
  height: 40%;
  margin-top: -20%;
  border: calc(2 * var(--u)) solid var(--c-55);
  border-radius: 4px;
  background: linear-gradient(180deg, #24406a 0%, #0e1a2e 100%);
}

.pb-panel--r {
  left: auto;
  right: 6%;
}

.pb-hull {
  top: 50%;
  left: 50%;
  width: 48%;
  height: 52%;
  margin: -26% 0 0 -24%;
  overflow: hidden;
  border: calc(3 * var(--u)) solid var(--c-80);
  border-radius: 4px;
  background: linear-gradient(180deg, #2c3a26 0%, #14200e 100%);
}

.pb-scan {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 16%;
  background: linear-gradient(90deg, var(--c-0), var(--c-80) 50%, var(--c-0));
  animation: pb-sweep 1.9s ease-in-out infinite;
}

.pb-ring {
  inset: 0;
  border: calc(3 * var(--u)) dashed var(--c-55);
  border-radius: 50%;
  animation: dbody-spin 7s linear infinite;
}

.pb-led {
  top: 12%;
  right: 12%;
  width: 11%;
  height: 11%;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c) 70%);
  animation: pb-blink 1.4s ease-in-out infinite;
}

@keyframes pb-sweep {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(620%);
  }
}

@keyframes pb-blink {
  0%,
  100% {
    opacity: 1;
  }
  55% {
    opacity: 0.15;
  }
}

/* ── Coronal Surge ── */
.sg-core {
  top: 50%;
  left: 50%;
  width: 44%;
  height: 44%;
  margin: -22% 0 0 -22%;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 38%, #ffffff 0%, var(--c) 58%, var(--c-30) 100%);
  animation: sg-pulse 1.5s ease-in-out infinite;
}

.sg-wave {
  inset: 0;
  border: calc(4 * var(--u)) solid var(--c-80);
  border-radius: 50%;
  animation: sg-ring 2.1s cubic-bezier(0.2, 0.7, 0.4, 1) infinite;
}

/* Corona: two crossed beams turning as one group, so the flare never sits
   still yet only a single element carries an animation. */
.sg-flare {
  inset: 0;
  animation: dbody-spin 14s linear infinite;
}

.sg-beam {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 9%;
  margin-top: -4.5%;
  border-radius: 50%;
  background: linear-gradient(90deg, var(--c-0) 0%, var(--c-80) 50%, var(--c-0) 100%);
}

.sg-beam--b {
  transform: rotate(90deg);
}

.sg-wave--b {
  animation-delay: -0.7s;
}

.sg-wave--c {
  animation-delay: -1.4s;
}

@keyframes sg-pulse {
  0%,
  100% {
    transform: scale(0.9);
  }
  50% {
    transform: scale(1.14);
  }
}

@keyframes sg-ring {
  0% {
    transform: scale(0.46);
    opacity: 1;
  }
  100% {
    transform: scale(1.06);
    opacity: 0;
  }
}

/* ── Rift Echo ── */
/* The rings are flattened ellipses that keep turning: the squash lives in the
   keyframe next to the rotation, because one element can only carry one
   transform — `--sx` per ring is what makes three identical ellipses read as
   three different orbital planes. */
.vx-ring {
  top: 50%;
  left: 50%;
  border: calc(3 * var(--u)) solid var(--c-55);
  border-radius: 50%;
  animation: vx-spin 3.2s linear infinite;
}

.vx-ring--a {
  --sx: 0.42;
  width: 100%;
  height: 100%;
  margin: -50% 0 0 -50%;
}

.vx-ring--b {
  --sx: 0.66;
  width: 80%;
  height: 80%;
  margin: -40% 0 0 -40%;
  border-color: var(--c-80);
  animation-duration: 2.3s;
  animation-direction: reverse;
}

.vx-ring--c {
  --sx: 0.3;
  width: 60%;
  height: 60%;
  margin: -30% 0 0 -30%;
  animation-duration: 1.6s;
}

.vx-core {
  top: 50%;
  left: 50%;
  width: 34%;
  height: 34%;
  margin: -17% 0 0 -17%;
  border-radius: 50%;
  background: radial-gradient(circle, #0a0410 30%, var(--c) 100%);
  animation: vx-throb 2s ease-in-out infinite;
}

@keyframes vx-spin {
  from {
    transform: rotate(0deg) scaleX(var(--sx));
  }
  to {
    transform: rotate(360deg) scaleX(var(--sx));
  }
}

@keyframes vx-throb {
  0%,
  100% {
    transform: scale(0.86);
  }
  50% {
    transform: scale(1.12);
  }
}

/* ── Wayfarer's Beacon ── */
.bc-sweep {
  inset: 0;
  /* A light cone anchored at the centre — rotating it is one transform, which
     is why the beam is a clipped gradient and not an animated conic. */
  clip-path: polygon(50% 50%, 100% 6%, 100% 94%);
  background: linear-gradient(90deg, var(--c-80) 0%, var(--c-30) 55%, var(--c-0) 100%);
  animation: dbody-spin 3.4s linear infinite;
}

.bc-ring {
  inset: 0;
  border: calc(3 * var(--u)) solid var(--c-80);
  border-radius: 50%;
  animation: bc-ping 2.6s ease-out infinite;
}

.bc-housing {
  top: 50%;
  left: 50%;
  width: 62%;
  height: 62%;
  margin: -31% 0 0 -31%;
  border: calc(4 * var(--u)) solid #7a4e20;
  border-radius: 50%;
  background: linear-gradient(180deg, #3a2418 0%, #140d07 100%);
}

.bc-lens {
  top: 50%;
  left: 50%;
  width: 38%;
  height: 38%;
  margin: -19% 0 0 -19%;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--c) 68%);
  animation: bc-glow 1.3s ease-in-out infinite;
}

@keyframes bc-ping {
  0% {
    transform: scale(0.38);
    opacity: 0.85;
  }
  100% {
    transform: scale(1.08);
    opacity: 0;
  }
}

@keyframes bc-glow {
  0%,
  100% {
    transform: scale(0.85);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.18);
    opacity: 1;
  }
}

/* ── Star Leviathan ── */
.lv-hull {
  top: 50%;
  left: 4%;
  width: 74%;
  height: 46%;
  margin-top: -23%;
  /* Blunt head on the left, tapering to the tail stock on the right. */
  border-radius: 52% 30% 30% 52% / 56% 50% 50% 56%;
  background: linear-gradient(170deg, var(--c) 0%, #1a7f74 55%, #06312f 100%);
  animation: lv-swim 5.2s ease-in-out infinite;
}

.lv-back {
  position: absolute;
  top: 16%;
  left: 10%;
  width: 62%;
  height: 22%;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0));
}

.lv-eye {
  position: absolute;
  top: 40%;
  left: 13%;
  width: 11%;
  height: 22%;
  border-radius: 50%;
  background: #06201f;
  box-shadow: inset calc(2 * var(--u)) calc(-2 * var(--u)) 0 rgba(255, 255, 255, 0.7);
}

.lv-tail {
  top: 50%;
  right: 0;
  width: 34%;
  height: 54%;
  margin-top: -27%;
  /* Fluke: two blades meeting at the stock on the left edge. */
  clip-path: polygon(0% 42%, 0% 58%, 74% 100%, 58% 50%, 74% 0%);
  transform-origin: 0% 50%;
  background: linear-gradient(90deg, #1a7f74 0%, var(--c) 100%);
  animation: lv-tail 2.6s ease-in-out infinite;
}

.lv-fin {
  bottom: 14%;
  left: 34%;
  width: 26%;
  height: 26%;
  clip-path: polygon(0% 0%, 100% 0%, 34% 100%);
  transform-origin: 50% 0%;
  background: linear-gradient(180deg, var(--c) 0%, #06312f 100%);
  animation: lv-fin 3.4s ease-in-out infinite;
}

@keyframes lv-swim {
  0%,
  100% {
    transform: rotate(-3deg) translateY(-3%);
  }
  50% {
    transform: rotate(3deg) translateY(3%);
  }
}

@keyframes lv-tail {
  0%,
  100% {
    transform: rotate(-17deg);
  }
  50% {
    transform: rotate(17deg);
  }
}

@keyframes lv-fin {
  0%,
  100% {
    transform: rotate(-14deg);
  }
  50% {
    transform: rotate(10deg);
  }
}

/* ── Shared ── */
@keyframes dbody-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dbody *,
  .dbody {
    animation: none !important;
  }
}
</style>
