<template>
  <!-- The flying object itself, drawn entirely in CSS — no icon, no image.
       Every drifter type gets its own silhouette so a meteoroid, a probe and a
       leviathan are told apart at a glance, mid-flight, from across the screen.
       The icon lives on in the HUD (info card, buff chip, herald).

       The one idea every body here is built on: a drifter is a BODY IN THE
       SUN'S LIGHT, not a sign on the sky. The sun sits at the centre of the
       stage, so the lit side always faces inward — `.db-lit` carries both the
       grazing highlight and the core shadow in a single gradient and is turned
       to the sun once per frame by DrifterObject. It sits INSIDE the clipped
       core element, so the shadow can never spill past the silhouette.

       Bodies that emit their own light get no terminator at all: plasma, a
       pulsar and a gravitational lens are not lit from outside. That is a
       distinction the eye reads instantly, and it saves a layer where it would
       have been wrong anyway. -->
  <span class="dbody" :class="`dbody--${kind}`" :style="tint" aria-hidden="true">
    <!-- Errant Chime — a resonance crystal: a faceted splinter with an ember
         locked inside, its fracture planes catching the sun as it tumbles. -->
    <template v-if="kind === 'chime'">
      <span class="cr-shard">
        <i class="cr-axis"><b class="cr-facets"></b></i>
        <i class="cr-core"></i>
        <i class="db-lit"></i>
      </span>
      <span class="cr-glint db-lit"></span>
    </template>

    <!-- Ember Shard — a meteoroid: dark stone with heat still in its cracks,
         ablating along the edge that faces the sun. -->
    <template v-else-if="kind === 'shard'">
      <span class="mt-rock">
        <i class="mt-axis"><b class="mt-veins"></b></i>
        <i class="mt-crater"></i>
        <i class="mt-crater mt-crater--b"></i>
        <i class="db-lit"></i>
      </span>
      <span class="mt-ablate db-lit"></span>
    </template>

    <!-- Lost Meep — a small creature holding its own vacuum bubble. Canon
         keeps the meep; what changes is that it is now a body with volume and
         one lit eye instead of a sticker with two black dots. -->
    <template v-else-if="kind === 'meep'">
      <span class="mp-bubble"></span>
      <span class="mp-orb">
        <i class="mp-nap"></i>
        <i class="db-lit"></i>
      </span>
      <span class="mp-eye"></span>
      <span class="mp-wisp"></span>
    </template>

    <!-- Salvage Probe — the one machine in the set: solar sails, a high-gain
         dish and a navigation strobe. Its ion burn is the WAKE and lives in
         DrifterObject, because it has to point somewhere and only the frame
         loop knows which way. -->
    <template v-else-if="kind === 'probe'">
      <span class="pb-sail"></span>
      <span class="pb-sail pb-sail--r"></span>
      <span class="pb-bus">
        <i class="pb-grid"></i>
        <i class="db-lit"></i>
      </span>
      <span class="pb-dish"></span>
      <span class="pb-nav"></span>
    </template>

    <!-- Coronal Surge — a prominence: an arch of solar material that rises off
         a footpoint and falls back along the same loop. Self-luminous, so no
         terminator: nothing lights a piece of the sun from outside. -->
    <template v-else-if="kind === 'surge'">
      <span class="pr-loop"></span>
      <span class="pr-loop pr-loop--b"></span>
      <span class="pr-spray"></span>
      <span class="pr-base"></span>
    </template>

    <!-- Rift Echo — a gravitational lens: a shadow that is genuinely darker
         than the sky behind it, ringed by the light it bends around itself. -->
    <template v-else-if="kind === 'vortex'">
      <span class="gl-warp"></span>
      <span class="gl-ring"></span>
      <span class="gl-ring gl-ring--b"></span>
      <span class="gl-shadow"></span>
    </template>

    <!-- Wayfarer's Beacon — a pulsar buoy. The old flat searchlight became a
         double cone, because that is what a rotating beam looks like from the
         side: two lobes, not one wedge. -->
    <template v-else-if="kind === 'beacon'">
      <span class="bj-spin">
        <i class="bj-cone"></i>
        <i class="bj-cone bj-cone--b"></i>
      </span>
      <span class="bj-hull">
        <i class="db-lit"></i>
      </span>
      <span class="bj-collar"></span>
      <span class="bj-lamp"></span>
    </template>

    <!-- Sundering Pulse — a pulsar: a hard core, two polar jets, and the shock
         disc thrown out perpendicular to them. The jets are what break planets;
         the disc is what you see coming. -->
    <template v-else-if="kind === 'pulse'">
      <span class="ps-disc"></span>
      <span class="ps-jet"></span>
      <span class="ps-jet ps-jet--b"></span>
      <span class="ps-core"></span>
      <span class="ps-flash"></span>
    </template>

    <!-- Star Leviathan — the big one, and the only body that carries its own
         weather: light moving under the hide, ribs showing through it, and a
         bow wave where it pushes the dust aside. -->
    <template v-else>
      <span class="lv-bow"></span>
      <span class="lv-body">
        <i class="lv-ribs"></i>
        <i class="lv-lume"></i>
        <i class="db-lit"></i>
      </span>
      <span class="lv-fin"></span>
      <span class="lv-fin lv-fin--b"></span>
      <span class="lv-eye"></span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { hexToRgba } from '@/utils/ui/format'
import { DRIFTER_TUMBLE_MS, DRIFTER_TUMBLE_TILT } from '@/config/constants'
import type { DrifterBodyKind } from '@/types'

const props = defineProps<{
  kind: DrifterBodyKind
  /** The drifter's signature color — every layer tints off this one value. */
  color: string
  /** Motion amplitude of the rarity stage, 0..1. Lower means slower: a common
   *  drifter is calm, a legendary one is not. */
  motion: number
}>()

/** Guarded: every duration below divides by this. */
const mo = computed(() => Math.max(0.2, props.motion))

// Alpha steps of the signature color, resolved once per drifter. These never
// change during a flight, so a container variable is free here — the per-frame
// values (position, heading, light angle) stay inline on the elements that move.
const tint = computed(() => ({
  '--c': props.color,
  '--c-80': hexToRgba(props.color, 0.8),
  '--c-55': hexToRgba(props.color, 0.55),
  '--c-30': hexToRgba(props.color, 0.3),
  '--c-12': hexToRgba(props.color, 0.12),
  '--c-0': hexToRgba(props.color, 0),
  '--mo': `${mo.value}`,
  '--tumble-ms': `${Math.round(DRIFTER_TUMBLE_MS / mo.value)}ms`,
  '--tilt': `${DRIFTER_TUMBLE_TILT}`,
}))
</script>

<style scoped>
/* ── Shared frame ──────────────────────────────────────────────────────────
   Every part is sized off `--u` = 1 % of the body edge, so the same markup
   reads correctly at 44px (Ember Shard) and at 128px (Star Leviathan) without
   a second set of numbers. Percentages carry widths and offsets, `--u` carries
   line weights, which percentages cannot express.

   Performance: only `transform` and `opacity` are ever animated. Gradients,
   borders, clip-paths and the few inset shadows are STATIC — rastered once and
   then only moved by the compositor, which is what keeps a drifter free even
   while the orbit, a star fight and the background canvas all run.

   Durations divide by `--mo`, the rarity stage's motion amplitude. A common
   drifter therefore moves SLOWER as well as less — calm reads as cheap, and it
   is: the same keyframe invalidates its element fewer times per second. */
.dbody {
  --u: calc(var(--drifter-size, 48px) / 100);
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.dbody > * {
  position: absolute;
}

/* ── Sunlight ──────────────────────────────────────────────────────────────
   One element, one gradient, one rotation per frame — and it does the work of
   two: the bright graze on the limb facing the sun and the shadow falling away
   from it. Written by DrifterObject's frame loop, which is the only place that
   knows where the body currently stands.

   Deliberately OVERSIZED (150 %, centred by the negative margin): a square
   rotating inside a round clip would otherwise swing its bare corners into
   view at 45°. The parent clips it, so the extra area costs nothing to look
   at — and a gradient is rastered once either way. */
.db-lit {
  top: 50%;
  left: 50%;
  width: 150%;
  height: 150%;
  margin: -75% 0 0 -75%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.55) 0%,
    rgba(255, 255, 255, 0.14) 12%,
    rgba(255, 255, 255, 0) 26%,
    rgba(0, 0, 0, 0) 46%,
    rgba(0, 0, 0, 0.42) 68%,
    rgba(0, 0, 0, 0.74) 88%,
    rgba(0, 0, 0, 0.82) 100%
  );
  pointer-events: none;
}

@keyframes db-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* The tumble axis. A body spinning around the screen axis reads as a clock
   hand; the static scaleY foreshortens the circle into an ellipse, and the
   same rotation then reads as an axis standing at an angle in space. Two
   elements, because one element carries only ONE transform. */
.cr-axis,
.mt-axis {
  position: absolute;
  inset: 0;
  transform: scaleY(var(--tilt));
}

.cr-facets,
.mt-veins {
  position: absolute;
  inset: 0;
  animation: db-spin var(--tumble-ms) linear infinite;
}

/* ── Errant Chime — resonance crystal ── */
.cr-shard {
  top: 50%;
  left: 50%;
  width: 72%;
  height: 96%;
  margin: -48% 0 0 -36%;
  /* An elongated bipyramid seen edge-on — the shape a crystal actually breaks
     into, and asymmetric enough that the tumble is legible. */
  clip-path: polygon(50% 0%, 82% 26%, 88% 66%, 50% 100%, 12% 66%, 18% 26%);
  background: linear-gradient(150deg, #fffdf2 0%, var(--c) 34%, #6d4413 78%, #2a1806 100%);
}

/* Fracture planes: bright edges running the length of the crystal. They turn
   with the body, which is what sells it as a solid rather than a flat cut of
   colour. */
.cr-facets {
  background:
    linear-gradient(102deg, var(--c-0) 40%, rgba(255, 255, 255, 0.5) 50%, var(--c-0) 60%),
    linear-gradient(72deg, var(--c-0) 44%, rgba(255, 255, 255, 0.28) 52%, var(--c-0) 62%),
    linear-gradient(96deg, var(--c-0) 22%, rgba(0, 0, 0, 0.4) 34%, var(--c-0) 46%);
}

/* The ember locked inside — the one thing that says this is a chime and not a
   rock. Breathes on opacity only; the glow itself is static. */
.cr-core {
  top: 50%;
  left: 50%;
  width: 34%;
  height: 46%;
  margin: -23% 0 0 -17%;
  border-radius: 50%;
  background: radial-gradient(circle, #fffef6 0%, var(--c) 44%, var(--c-0) 76%);
  animation: cr-ember calc(2600ms / var(--mo)) ease-in-out infinite;
}

/* A specular flash off the sunward face. It carries `db-lit` as well, so the
   frame loop turns it to the sun along with the terminator — a highlight that
   never moves reads as paint, not as glass. */
.cr-glint {
  top: 50%;
  left: 50%;
  width: 30%;
  height: 9%;
  margin: -4.5% 0 0 -30%;
  background: none;
  animation: cr-glint calc(3400ms / var(--mo)) ease-in-out infinite;
}

.cr-glint::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, var(--c-55) 46%, var(--c-0) 100%);
}

@keyframes cr-ember {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(0.86);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes cr-glint {
  0%,
  62%,
  100% {
    opacity: 0.22;
  }
  76% {
    opacity: 1;
  }
}

/* ── Ember Shard — meteoroid ── */
.mt-rock {
  top: 50%;
  left: 50%;
  width: 92%;
  height: 86%;
  margin: -43% 0 0 -46%;
  /* Lumpy and deliberately off-centre: a rock, not a gem. */
  clip-path: polygon(
    26% 4%,
    62% 0%,
    88% 22%,
    100% 54%,
    82% 84%,
    48% 100%,
    16% 88%,
    2% 52%,
    8% 20%
  );
  background: linear-gradient(158deg, #6b5a4c 0%, #2e2620 46%, #14100c 100%);
}

/* Heat still trapped in the cracks. Static gradients, turning with the rock. */
.mt-veins {
  background:
    linear-gradient(74deg, var(--c-0) 32%, var(--c-55) 38%, var(--c-0) 43%),
    linear-gradient(126deg, var(--c-0) 49%, var(--c-80) 54%, var(--c-0) 59%),
    linear-gradient(28deg, var(--c-0) 63%, var(--c-30) 68%, var(--c-0) 72%);
}

.mt-crater {
  top: 30%;
  left: 24%;
  width: 22%;
  height: 20%;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 34%, #0d0a07 0%, #3a302a 70%, #4d4038 100%);
}

.mt-crater--b {
  top: 58%;
  left: 56%;
  width: 15%;
  height: 14%;
}

/* Ablation: the sunward edge is burning off. It rides the light angle, so the
   glow always sits on the side actually facing the sun — the detail that turns
   a dark rock into a body on a trajectory. */
.mt-ablate {
  top: 50%;
  left: 50%;
  width: 104%;
  height: 88%;
  margin: -44% 0 0 -52%;
  background: none;
  animation: mt-flare calc(1500ms / var(--mo)) ease-in-out infinite;
}

.mt-ablate::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 2% 50%,
    #fff3d4 0%,
    var(--c-80) 10%,
    var(--c-30) 22%,
    var(--c-0) 42%
  );
}

@keyframes mt-flare {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* ── Lost Meep — creature in a vacuum bubble ── */
/* The bubble is a thin shell, brightest where it curves away from the eye —
   that is what tells you it is a sphere of something rather than a ring. */
.mp-bubble {
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 32%,
    rgba(255, 255, 255, 0.16) 0%,
    var(--c-0) 42%,
    var(--c-12) 74%,
    var(--c-30) 92%,
    var(--c-0) 100%
  );
  animation: mp-swell calc(3600ms / var(--mo)) ease-in-out infinite;
}

.mp-orb {
  top: 50%;
  left: 50%;
  width: 62%;
  height: 62%;
  margin: -31% 0 0 -31%;
  overflow: hidden;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #ffffff 0%, var(--c) 46%, #17334a 100%);
  animation: mp-breathe calc(2400ms / var(--mo)) ease-in-out infinite;
}

/* A soft nap over the shell, so the sphere is not a bare gradient. */
.mp-nap {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 22% 68%, rgba(255, 255, 255, 0.2) 0%, transparent 26%),
    radial-gradient(circle at 74% 24%, rgba(255, 255, 255, 0.14) 0%, transparent 22%);
}

/* One lit eye instead of two black dots. It blinks by squashing — the same
   long-open, one-quick-shut envelope as before, because that part was right. */
/* Dark iris with a bright catchlight, not a bright blob. A light-on-light eye
   read as one more specular highlight on the sphere and the creature vanished;
   an eye is legible because it is DARKER than the face around it. */
.mp-eye {
  top: 42%;
  left: 40%;
  width: 20%;
  height: 20%;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #ffffff 0%, #ffffff 16%, #0b1c2b 42%, #050d16 100%);
  animation: mp-blink calc(4600ms / var(--mo)) ease-in-out infinite;
}

/* The wisp it trails — a meep is never quite still. */
.mp-wisp {
  top: 14%;
  left: 50%;
  width: calc(5 * var(--u));
  height: 24%;
  margin-left: calc(-2.5 * var(--u));
  transform-origin: 50% 100%;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 100%, var(--c-80) 0%, var(--c-30) 52%, var(--c-0) 100%);
  animation: mp-sway calc(2800ms / var(--mo)) ease-in-out infinite;
}

@keyframes mp-swell {
  0%,
  100% {
    transform: scale(0.96);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes mp-breathe {
  0%,
  100% {
    transform: scale(1.03, 0.97);
  }
  50% {
    transform: scale(0.97, 1.04);
  }
}

@keyframes mp-blink {
  0%,
  92%,
  100% {
    transform: scaleY(1);
  }
  96% {
    transform: scaleY(0.1);
  }
}

@keyframes mp-sway {
  0%,
  100% {
    transform: rotate(-18deg);
  }
  50% {
    transform: rotate(18deg);
  }
}

/* ── Salvage Probe — the machine ── */
/* Sails, not panels: two long planes on a boom, skewed off the bus. Static —
   a spacecraft's structure does not wobble. */
.pb-sail {
  top: 50%;
  left: 2%;
  width: 26%;
  height: 34%;
  margin-top: -17%;
  transform: skewY(-9deg);
  border: calc(1.5 * var(--u)) solid var(--c-30);
  background:
    linear-gradient(180deg, var(--c-12) 0%, transparent 60%),
    repeating-linear-gradient(
      90deg,
      #1d3a63 0,
      #1d3a63 calc(2 * var(--u)),
      #0c1a2e calc(2 * var(--u)),
      #0c1a2e calc(4 * var(--u))
    ),
    #12253f;
}

.pb-sail--r {
  left: auto;
  right: 2%;
  transform: skewY(9deg);
}

.pb-bus {
  top: 50%;
  left: 50%;
  width: 34%;
  height: 44%;
  margin: -22% 0 0 -17%;
  overflow: hidden;
  border: calc(2 * var(--u)) solid #8a9aa6;
  border-radius: 3px;
  background: linear-gradient(180deg, #4a5560 0%, #202a33 62%, #121a21 100%);
}

.pb-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0, transparent calc(3 * var(--u))),
    linear-gradient(180deg, transparent 46%, rgba(255, 255, 255, 0.12) 50%, transparent 54%);
}

/* High-gain dish, still pointed back the way it came — it is talking to
   someone. */
.pb-dish {
  top: 22%;
  left: 52%;
  width: 24%;
  height: 24%;
  border-radius: 50%;
  border: calc(2 * var(--u)) solid #9aa8b2;
  background: radial-gradient(circle at 60% 40%, #cfd8de 0%, #6c7a86 54%, #2b343c 100%);
}

/* Navigation strobe: opacity only, and hard-edged in time — a real strobe is
   off far longer than it is on. */
.pb-nav {
  top: 14%;
  left: 16%;
  width: 12%;
  height: 12%;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, var(--c) 46%, var(--c-0) 100%);
  animation: pb-strobe calc(1600ms / var(--mo)) linear infinite;
}

/* The ion burn is the WAKE, not a layer in here.
   It lived in the body once and pointed permanently left, while the wake it
   was supposed to be turned with the flight heading — the probe flew along
   with two exhausts aiming in different directions. The body only carries what
   holds still relative to itself; anything that has to point somewhere belongs
   on the element the frame loop already rotates. */

@keyframes pb-strobe {
  0%,
  86%,
  100% {
    opacity: 0.14;
  }
  90% {
    opacity: 1;
  }
}

/* ── Coronal Surge — prominence ── */
/* Self-luminous: no terminator anywhere in this body. An arch of solar plasma
   rising off a footpoint and falling back along the same loop. The loop is a
   ring clipped to its upper half — below it is where the sun would be. */
.pr-loop {
  top: 46%;
  left: 50%;
  width: 96%;
  height: 96%;
  margin: -48% 0 0 -48%;
  clip-path: polygon(0% 0%, 100% 0%, 100% 52%, 0% 52%);
  border: calc(7 * var(--u)) solid transparent;
  border-top-color: var(--c);
  border-left-color: var(--c-55);
  border-right-color: var(--c-55);
  border-radius: 50%;
  animation: pr-rise calc(2600ms / var(--mo)) ease-in-out infinite;
}

.pr-loop--b {
  width: 68%;
  height: 68%;
  margin: -34% 0 0 -34%;
  border-width: calc(5 * var(--u));
  animation-delay: calc(-900ms / var(--mo));
}

/* Material falling back down the far leg of the arch. */
.pr-spray {
  top: 30%;
  left: 50%;
  width: 10%;
  height: 10%;
  margin-left: -5%;
  border-radius: 50%;
  background: radial-gradient(circle, #fffdf0 0%, var(--c) 58%, var(--c-0) 100%);
  animation: pr-fall calc(2100ms / var(--mo)) ease-in infinite;
}

/* The footpoint the whole thing stands on — the brightest part, as it should be. */
.pr-base {
  bottom: 8%;
  left: 50%;
  width: 56%;
  height: 26%;
  margin-left: -28%;
  border-radius: 50%;
  background: radial-gradient(ellipse, #ffffff 0%, var(--c) 34%, var(--c-30) 62%, var(--c-0) 100%);
  animation: pr-roar calc(1400ms / var(--mo)) ease-in-out infinite;
}

@keyframes pr-rise {
  0% {
    transform: scale(0.44) translateY(22%);
    opacity: 0;
  }
  22% {
    opacity: 1;
  }
  78% {
    opacity: 0.85;
  }
  100% {
    transform: scale(1.08) translateY(-6%);
    opacity: 0;
  }
}

@keyframes pr-fall {
  0% {
    transform: translate(-140%, -30%) scale(0.5);
    opacity: 0;
  }
  24% {
    opacity: 1;
  }
  100% {
    transform: translate(150%, 150%) scale(0.9);
    opacity: 0;
  }
}

@keyframes pr-roar {
  0%,
  100% {
    transform: scale(0.9, 0.86);
    opacity: 0.72;
  }
  50% {
    transform: scale(1.08, 1.1);
    opacity: 1;
  }
}

/* ── Rift Echo — gravitational lens ── */
/* The shadow is genuinely darker than the sky behind it. That is the whole
   trick: everything else in the orbit adds light, this one takes it away. */
.gl-shadow {
  top: 50%;
  left: 50%;
  width: 40%;
  height: 40%;
  margin: -20% 0 0 -20%;
  border-radius: 50%;
  background: radial-gradient(circle, #000000 0%, #000000 62%, #05010a 82%, transparent 100%);
}

/* The Einstein ring: light from behind, bent around the mass until it closes
   into a circle. Two of them at different tilts, because one ring reads as a
   hoop. */
.gl-ring {
  top: 50%;
  left: 50%;
  width: 58%;
  height: 58%;
  margin: -29% 0 0 -29%;
  border: calc(2.5 * var(--u)) solid var(--c);
  border-radius: 50%;
  animation: gl-turn calc(6000ms / var(--mo)) linear infinite;
}

.gl-ring--b {
  --sx: 0.44;
  width: 82%;
  height: 82%;
  margin: -41% 0 0 -41%;
  border-width: calc(1.5 * var(--u));
  border-color: var(--c-55);
  animation-duration: calc(9000ms / var(--mo));
  animation-direction: reverse;
}

/* Starlight smeared into arcs around the mass. The conic gradient is STATIC —
   it is rastered once and the plate it sits on is only rotated, which is the
   allowed half of performance rule 2. Animating the gradient's own angle would
   rebuild it every frame; turning the element it lives on does not. */
.gl-warp {
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 50%, transparent 42%, var(--c-12) 52%, transparent 62%),
    conic-gradient(
      from 0deg,
      var(--c-0) 0deg,
      var(--c-30) 34deg,
      var(--c-0) 74deg,
      var(--c-0) 180deg,
      var(--c-30) 214deg,
      var(--c-0) 254deg,
      var(--c-0) 360deg
    );
  animation: db-spin calc(14000ms / var(--mo)) linear infinite;
}

/* The tilt of the second ring lives in the keyframe next to the rotation,
   because one element carries only ONE transform. */
@keyframes gl-turn {
  from {
    transform: rotate(0deg) scaleX(var(--sx, 1));
  }
  to {
    transform: rotate(360deg) scaleX(var(--sx, 1));
  }
}

/* ── Wayfarer's Beacon — pulsar buoy ── */
/* Two lobes, not one wedge: seen from the side, a rotating beam throws light
   both ways along its axis. */
.bj-spin {
  inset: 0;
  animation: db-spin calc(3800ms / var(--mo)) linear infinite;
}

.bj-cone {
  position: absolute;
  inset: 0;
  clip-path: polygon(50% 50%, 100% 22%, 100% 78%);
  background: linear-gradient(90deg, var(--c-80) 0%, var(--c-30) 34%, var(--c-0) 88%);
}

.bj-cone--b {
  clip-path: polygon(50% 50%, 0% 22%, 0% 78%);
  background: linear-gradient(270deg, var(--c-80) 0%, var(--c-30) 34%, var(--c-0) 88%);
}

.bj-hull {
  top: 50%;
  left: 50%;
  width: 50%;
  height: 50%;
  margin: -25% 0 0 -25%;
  overflow: hidden;
  border: calc(3 * var(--u)) solid #7a4e20;
  border-radius: 50%;
  background: linear-gradient(180deg, #46301f 0%, #1b1109 100%);
}

/* Collar of the buoy — a hard machined edge that keeps the lamp from reading
   as a loose ball of light. */
.bj-collar {
  top: 50%;
  left: 50%;
  width: 68%;
  height: 18%;
  margin: -9% 0 0 -34%;
  border-radius: 3px;
  background: linear-gradient(180deg, #8a6234 0%, #3e2810 60%, #1b1109 100%);
}

.bj-lamp {
  top: 50%;
  left: 50%;
  width: 28%;
  height: 28%;
  margin: -14% 0 0 -14%;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, var(--c) 56%, var(--c-30) 100%);
  animation: bj-pulse calc(1300ms / var(--mo)) ease-in-out infinite;
}

@keyframes bj-pulse {
  0%,
  100% {
    transform: scale(0.82);
    opacity: 0.72;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* ── Sundering Pulse — pulsar ── */
/* Jets along the poles, shock disc perpendicular to them. The geometry is the
   message: this is the drifter that hits every planet at once. */
.ps-core {
  top: 50%;
  left: 50%;
  width: 34%;
  height: 34%;
  margin: -17% 0 0 -17%;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, #ffe6f0 38%, var(--c) 74%, #5c0a26 100%);
  animation: ps-throb calc(1100ms / var(--mo)) ease-in-out infinite;
}

.ps-jet {
  top: 50%;
  left: 50%;
  width: 22%;
  height: 62%;
  margin: -62% 0 0 -11%;
  transform-origin: 50% 100%;
  clip-path: polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%);
  background: linear-gradient(0deg, #ffffff 0%, var(--c) 38%, var(--c-30) 72%, var(--c-0) 100%);
  animation: ps-jet calc(1800ms / var(--mo)) ease-out infinite;
}

.ps-jet--b {
  margin-top: 0;
  transform-origin: 50% 0%;
  clip-path: polygon(0% 0%, 100% 0%, 62% 100%, 38% 100%);
  background: linear-gradient(180deg, #ffffff 0%, var(--c) 38%, var(--c-30) 72%, var(--c-0) 100%);
}

/* The shock disc, foreshortened by a scaleY that lives inside the keyframe —
   one element, one transform. */
.ps-disc {
  top: 50%;
  left: 50%;
  width: 108%;
  height: 108%;
  margin: -54% 0 0 -54%;
  border: calc(3 * var(--u)) solid var(--c-55);
  border-radius: 50%;
  animation: ps-disc calc(2400ms / var(--mo)) cubic-bezier(0.2, 0.7, 0.4, 1) infinite;
}

/* The moment the beam sweeps past — brief, bright, and on opacity only. */
.ps-flash {
  top: 50%;
  left: 50%;
  width: 76%;
  height: 76%;
  margin: -38% 0 0 -38%;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, var(--c-55) 40%, var(--c-0) 72%);
  animation: ps-flash calc(1100ms / var(--mo)) ease-out infinite;
}

@keyframes ps-throb {
  0%,
  100% {
    transform: scale(0.88);
  }
  50% {
    transform: scale(1.14);
  }
}

/* The jets BREATHE, they do not flash out of nothing.
   Measured in the browser: with an envelope running 0 -> 1 -> 0 the pulsar was
   a bare 14px dot for most of its cycle, and a screenshot taken at a random
   moment caught nothing at all. A body has to be legible in every frame it is
   on screen, not only on the peak of its animation. */
@keyframes ps-jet {
  0%,
  100% {
    transform: scaleY(0.62) scaleX(0.82);
    opacity: 0.5;
  }
  50% {
    transform: scaleY(1.08) scaleX(1.12);
    opacity: 1;
  }
}

/* Same reasoning as the jets: the shock disc is part of the silhouette, so it
   stays on the screen and only swells. */
@keyframes ps-disc {
  0%,
  100% {
    transform: scaleX(1) scaleY(0.24);
    opacity: 0.45;
  }
  50% {
    transform: scaleX(1.16) scaleY(0.32);
    opacity: 0.95;
  }
}

@keyframes ps-flash {
  0%,
  74%,
  100% {
    opacity: 0;
  }
  84% {
    opacity: 0.7;
  }
}

/* ── Star Leviathan — the big one ── */
/* The only body with weather of its own: light travelling under the hide, ribs
   showing through it, and a bow wave where it pushes the dust aside. */
.lv-body {
  top: 50%;
  left: 4%;
  width: 84%;
  height: 58%;
  margin-top: -29%;
  /* A clip-path silhouette, not a rounded box. The pill shape read as a barrel
     with stripes painted on it: symmetrical top to bottom, blunt at both ends,
     nothing about it said which way it was going. This outline has a rounded
     brow, a deep chest that thins towards the tail stock, and it is NOT
     mirror-symmetric — which is what makes the slow roll read as a creature
     moving rather than an object rotating. clip-path also clips the subtree, so
     ribs, glow and terminator are cut to the same edge without overflow. */
  clip-path: polygon(
    8% 46%,
    18% 24%,
    38% 13%,
    62% 12%,
    82% 22%,
    97% 44%,
    97% 58%,
    80% 74%,
    58% 88%,
    34% 90%,
    16% 76%,
    6% 58%
  );
  background: linear-gradient(168deg, #35a396 0%, #12655e 48%, #04211f 100%);
  animation: lv-swim calc(5200ms / var(--mo)) ease-in-out infinite;
}

/* Ribs under the skin — static, and the reason the hull reads as a creature
   rather than a lozenge. */
.lv-ribs {
  position: absolute;
  inset: 0;
  /* Fainter and finer than they were: at full contrast the regular spacing read
     as a barrel hoop. They should suggest structure under the hide, not draw
     themselves. The overlaid gradient fades them out towards the head, so they
     are densest where the body is deepest. */
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.55) 0%, transparent 34%, transparent 100%),
    repeating-linear-gradient(
      98deg,
      transparent 0,
      transparent calc(4.5 * var(--u)),
      rgba(0, 0, 0, 0.17) calc(4.5 * var(--u)),
      rgba(0, 0, 0, 0.17) calc(5.4 * var(--u))
    );
}

/* Light moving along the body, head to tail. Transform and opacity only. */
.lv-lume {
  position: absolute;
  top: 0;
  left: -46%;
  width: 46%;
  height: 100%;
  background: linear-gradient(90deg, var(--c-0) 0%, var(--c-55) 50%, var(--c-0) 100%);
  animation: lv-lume calc(4200ms / var(--mo)) ease-in-out infinite;
}

.lv-eye {
  top: 40%;
  left: 15%;
  width: 8%;
  height: 13%;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, var(--c) 44%, #041a19 100%);
  animation: lv-eye calc(5600ms / var(--mo)) ease-in-out infinite;
}

/* Two trailing fins rather than a whale fluke: it should read as something
   that belongs in a vacuum, not in an ocean. */
/* Trailing vanes rather than a whale fluke: it should read as something that
   belongs in a vacuum, not in an ocean. Swept back from the tail stock and
   fading out along their trailing edge, so they look like they are being
   dragged through something rather than cut from card. */
.lv-fin {
  --flip: 1;
  top: 50%;
  right: 0;
  width: 34%;
  height: 40%;
  margin-top: -38%;
  transform-origin: 0% 100%;
  clip-path: polygon(0% 92%, 30% 34%, 58% 4%, 74% 30%, 76% 68%, 100% 100%);
  background: linear-gradient(198deg, var(--c-55) 0%, #0d4a45 54%, var(--c-0) 100%);
  animation: lv-fin calc(3000ms / var(--mo)) ease-in-out infinite;
}

.lv-fin--b {
  --flip: -1;
  margin-top: -2%;
  transform-origin: 0% 0%;
  clip-path: polygon(0% 8%, 30% 66%, 58% 96%, 74% 70%, 76% 32%, 100% 0%);
  background: linear-gradient(342deg, var(--c-55) 0%, #0d4a45 54%, var(--c-0) 100%);
  animation-delay: calc(-1500ms / var(--mo));
}

/* Bow wave: dust piling up in front of something this size. */
.lv-bow {
  top: 50%;
  left: 0;
  width: 26%;
  height: 74%;
  margin-top: -37%;
  border-radius: 50%;
  background: radial-gradient(ellipse at 78% 50%, var(--c-30) 0%, var(--c-12) 42%, var(--c-0) 74%);
  animation: lv-bow calc(3400ms / var(--mo)) ease-in-out infinite;
}

@keyframes lv-swim {
  0%,
  100% {
    transform: rotate(-2.5deg) translateY(-2.5%);
  }
  50% {
    transform: rotate(2.5deg) translateY(2.5%);
  }
}

@keyframes lv-lume {
  0% {
    transform: translateX(0);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    transform: translateX(320%);
    opacity: 0;
  }
}

@keyframes lv-eye {
  0%,
  90%,
  100% {
    opacity: 1;
  }
  95% {
    opacity: 0.25;
  }
}

@keyframes lv-fin {
  0%,
  100% {
    transform: rotate(calc(var(--flip) * -13deg));
  }
  50% {
    transform: rotate(calc(var(--flip) * 11deg));
  }
}

@keyframes lv-bow {
  0%,
  100% {
    transform: scaleX(0.9);
    opacity: 0.6;
  }
  50% {
    transform: scaleX(1.12);
    opacity: 1;
  }
}

/* Without motion the silhouette still has to say which drifter this is — the
   shapes, the light and the colours all stay, only the movement stops. */
@media (prefers-reduced-motion: reduce) {
  .dbody *,
  .dbody {
    animation: none !important;
  }
}
</style>
