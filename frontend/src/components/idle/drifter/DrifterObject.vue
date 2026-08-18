<template>
  <!-- The flying body. `pointer-events: none` on the shell, `auto` only on the
       hit area, so the drifter never steals a click meant for the sun below. -->
  <div ref="shell" class="drifter-shell" :style="shellStyle" aria-hidden="true">
    <button
      class="drifter-hit"
      :class="{ 'drifter-hit--large': def.hits > 1 }"
      type="button"
      :aria-label="`Collect ${def.name}`"
      @click.stop="onHit"
    >
      <!-- Wake. Turned once per frame together with the position — either away
           from the SUN (a tail is blown outward, it does not trail the path) or
           against the flight heading for the one body with an engine. Pure
           gradient, no blur: it scrolls across the screen every frame and must
           stay compositor-only.

           The dust plume lives INSIDE the wake rather than beside it, so it
           costs no second frame-write and can never drift out of alignment
           with the tail it belongs to. -->
      <span
        v-if="def.wake !== 'none'"
        ref="trail"
        class="drifter-trail"
        :style="trailStyle"
        aria-hidden="true"
      >
        <i v-if="showDust" class="drifter-dust" :style="dustStyle"></i>
      </span>

      <!-- Aura shells. Static glow, breathing on opacity and transform only
           (performance rule 11) — never a filter or a box-shadow. How many
           there are is the rarity stage's business; only the inner one (and,
           from uncommon up, the second) actually breathes, because three
           separate beats on the same body read as flicker, not as light. -->
      <span
        v-for="shell in auraShells"
        :key="shell.i"
        class="drifter-aura"
        :class="{ 'drifter-aura--still': !shell.breathes }"
        :style="shell.style"
        aria-hidden="true"
      ></span>

      <!-- Debris belt — legendary only. Two elements: a static tilt that
           foreshortens the circle into an orbit plane, and the belt turning
           inside it. One element carries only one transform. -->
      <span v-if="showRing" class="drifter-ring-plane" :style="ringPlaneStyle" aria-hidden="true">
        <i class="drifter-ring"></i>
      </span>

      <!-- The silhouette is pure CSS, one shape per drifter type — see
           DrifterBody.vue. Nothing in here paints per frame; the body carries
           its own idle motion while the shell does the travelling. -->
      <span class="drifter-body" :style="bodyStyle">
        <DrifterBody :kind="def.body" :color="def.color" :motion="stage.motion" />
      </span>

      <!-- Debris motes. Two turning planes carry all of them, rather than one
           animation per mote: at seven motes that is the difference between two
           running animations and seven. Their angles and radii come from the
           INDEX, never from Math.random — a rolled value in a style getter
           re-draws on every render and makes the swarm jump mid-flight. -->
      <template v-if="motePlanes.length">
        <span
          v-for="plane in motePlanes"
          :key="plane.i"
          class="drifter-motes"
          :style="plane.style"
          aria-hidden="true"
        >
          <i v-for="m in plane.motes" :key="m.i" class="drifter-mote" :style="m.style"></i>
        </span>
      </template>

      <!-- Multi-hit types show how far along they are, right on the body. -->
      <span v-if="def.hits > 1" class="drifter-pips" aria-hidden="true">
        <span
          v-for="i in def.hits"
          :key="i"
          class="drifter-pip"
          :class="{ 'drifter-pip--lit': i <= drifter.hitsLanded }"
          :style="i <= drifter.hitsLanded ? { background: def.color } : undefined"
        ></span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ActiveDrifter, DrifterDef } from '@/types'
import {
  drifterPointAt,
  drifterLightAngleDeg,
  type DrifterFieldRect,
} from '@/utils/orbit/drifterPath'
import type { HudFieldMetrics } from '@/utils/ui/hudField'
import { hexToRgba } from '@/utils/ui/format'
import { drifterFxStage } from '@/config/world/drifters'
import DrifterBody from './DrifterBody.vue'
import {
  DRIFTER_FADE_IN_FRAC,
  DRIFTER_FADE_OUT_FRAC,
  DRIFTER_HIT_PADDING_PX,
  DRIFTER_TRAIL_LENGTH_SCALE,
  DRIFTER_TRAIL_WIDTH_SCALE,
  DRIFTER_TRAIL_WIDTH_MAX_PX,
  DRIFTER_TRAIL_WIDTH_MIN_PX,
  DRIFTER_ORNAMENT_MIN_SIZE,
  DRIFTER_AURA_SHELL_SCALES,
  DRIFTER_AURA_SHELL_ALPHAS,
  DRIFTER_AURA_BREATHE_MS,
  DRIFTER_AURA_SHELL_BREATHE_STEP,
  DRIFTER_MOTE_ORBIT_SCALE,
  DRIFTER_MOTE_ORBIT_SPREAD,
  DRIFTER_MOTE_SIZE_MIN,
  DRIFTER_MOTE_SIZE_MAX,
  DRIFTER_MOTE_SPIN_MS_MIN,
  DRIFTER_MOTE_SPIN_MS_MAX,
  DRIFTER_RING_SCALE,
  DRIFTER_RING_TILT,
  DRIFTER_RING_SPIN_MS,
  DRIFTER_DUST_LENGTH_SCALE,
  DRIFTER_DUST_WIDTH_SCALE,
} from '@/config/constants'

const props = defineProps<{
  drifter: ActiveDrifter
  def: DrifterDef
}>()

const emit = defineEmits<{ hit: [x: number, y: number] }>()

const shell = ref<HTMLElement>()
const trail = ref<HTMLElement>()

/** The rarity stage — how much ornament this drifter has earned. */
const stage = computed(() => drifterFxStage(props.def.rarity))

/**
 * Ornament needs room. Below the threshold a drifter keeps its core, its
 * terminator and its rim highlight, and nothing else — a shell that measures
 * under two pixels is invisible and still rastered, composited and paid for in
 * full (performance rule 7, same reasoning as CHAMPION_REGALIA_ORNAMENT_MIN_SIZE).
 *
 * Every flag below is read through this AND, never on its own.
 */
const ornate = computed(() => props.def.sizePx >= DRIFTER_ORNAMENT_MIN_SIZE)

const showRing = computed(() => ornate.value && stage.value.ring)
const showDust = computed(() => ornate.value && stage.value.dust)

const shellStyle = computed(() => ({
  '--drifter-size': `${props.def.sizePx}px`,
  '--drifter-hit-pad': `${DRIFTER_HIT_PADDING_PX}px`,
}))

const bodyStyle = computed(() => ({
  width: `${props.def.sizePx}px`,
  height: `${props.def.sizePx}px`,
}))

// ── Aura shells ─────────────────────────────────────────────────────────────
// Stacked so they read as ONE soft falloff rather than three rings: each shell
// reaches further out and is weaker than the one inside it. Only the innermost
// breathes by default; `pulse` adds the second on an offset beat.

const auraShells = computed(() => {
  const s = stage.value
  const count = ornate.value ? Math.min(s.auraLayers, DRIFTER_AURA_SHELL_SCALES.length) : 1
  return Array.from({ length: count }, (_, i) => {
    const scale = DRIFTER_AURA_SHELL_SCALES[i]
    const alpha = s.auraAlpha * DRIFTER_AURA_SHELL_ALPHAS[i]
    const breathes = i === 0 || (i === 1 && s.pulse)
    const ms = DRIFTER_AURA_BREATHE_MS * DRIFTER_AURA_SHELL_BREATHE_STEP ** i
    return {
      i,
      breathes,
      style: {
        width: `${props.def.sizePx * scale}px`,
        height: `${props.def.sizePx * scale}px`,
        background: `radial-gradient(circle, ${hexToRgba(props.def.color, alpha)} 0%, ${hexToRgba(
          props.def.color,
          alpha * 0.45,
        )} 38%, ${hexToRgba(props.def.color, 0)} 70%)`,
        animationDuration: `${Math.round(ms)}ms`,
        // Negative delay: the shells start mid-cycle, offset from each other,
        // instead of all swelling together on the first frame.
        animationDelay: `${Math.round(-ms * 0.37 * i)}ms`,
      } as Record<string, string>,
    }
  })
})

// ── Debris motes ────────────────────────────────────────────────────────────
// Two turning planes carry the whole swarm. Angles, radii and sizes come from
// the index — deterministic, so the same drifter looks the same every render
// (the reason particleField.ts avoids Math.random in a style getter).

const motePlanes = computed(() => {
  const count = ornate.value ? stage.value.motes : 0
  if (count === 0) return []

  const planes = [
    { i: 0, reverse: false, ms: DRIFTER_MOTE_SPIN_MS_MAX },
    { i: 1, reverse: true, ms: DRIFTER_MOTE_SPIN_MS_MIN },
  ]

  return planes.map((plane) => {
    const motes = []
    for (let i = plane.i; i < count; i += planes.length) {
      // Golden-ish step so consecutive motes never line up into a pattern.
      const angle = (i * 137 + plane.i * 61) % 360
      const radius =
        DRIFTER_MOTE_ORBIT_SCALE + (((i * 7) % 5) / 4) * DRIFTER_MOTE_ORBIT_SPREAD
      const size =
        DRIFTER_MOTE_SIZE_MIN +
        (((i * 3) % 4) / 3) * (DRIFTER_MOTE_SIZE_MAX - DRIFTER_MOTE_SIZE_MIN)
      const rad = (angle * Math.PI) / 180
      motes.push({
        i,
        style: {
          left: `${50 + Math.cos(rad) * radius * 50}%`,
          top: `${50 + Math.sin(rad) * radius * 50}%`,
          width: `${(size * 100).toFixed(2)}%`,
          height: `${(size * 100).toFixed(2)}%`,
          background: `radial-gradient(circle, ${hexToRgba(
            props.def.color,
            0.9,
          )} 0%, ${hexToRgba(props.def.color, 0.5)} 52%, ${hexToRgba(props.def.color, 0)} 100%)`,
        } as Record<string, string>,
      })
    }
    return {
      i: plane.i,
      motes,
      style: {
        width: `${props.def.sizePx * 2}px`,
        height: `${props.def.sizePx * 2}px`,
        animationDuration: `${plane.ms}ms`,
        animationDirection: plane.reverse ? 'reverse' : 'normal',
      } as Record<string, string>,
    }
  })
})

// ── Debris belt ─────────────────────────────────────────────────────────────

const ringPlaneStyle = computed(() => ({
  width: `${props.def.sizePx * DRIFTER_RING_SCALE}px`,
  height: `${props.def.sizePx * DRIFTER_RING_SCALE}px`,
  '--ring-tilt': `${DRIFTER_RING_TILT}`,
  '--ring-ms': `${DRIFTER_RING_SPIN_MS}ms`,
  '--ring-color': hexToRgba(props.def.color, 0.3),
  '--ring-color-soft': hexToRgba(props.def.color, 0.07),
}))

// ── Wake ────────────────────────────────────────────────────────────────────

const trailWidthPx = computed(() =>
  Math.min(
    DRIFTER_TRAIL_WIDTH_MAX_PX,
    Math.max(DRIFTER_TRAIL_WIDTH_MIN_PX, props.def.sizePx * DRIFTER_TRAIL_WIDTH_SCALE),
  ),
)

const trailStyle = computed(() => ({
  width: `${props.def.sizePx * DRIFTER_TRAIL_LENGTH_SCALE}px`,
  height: `${trailWidthPx.value}px`,
  // Radial, nicht linear. Ein linearer Verlauf fällt nur LÄNGS ab — quer dazu
  // bleibt er voll deckend, und genau das stand im Bild: ein Band mit harten
  // Längskanten. Die Ellipse am rechten Rand (dort sitzt der Körper) lässt ihn
  // in BEIDE Richtungen auslaufen, was ein Schweif auch tut.
  background: `radial-gradient(ellipse at right center, ${hexToRgba(
    props.def.color,
    0.62,
  )} 0%, ${hexToRgba(props.def.color, 0.26)} 34%, ${hexToRgba(props.def.color, 0)} 100%)`,
}))

/** Wider and longer than the tail it sits in, and much fainter — dust spreads,
 *  ions do not. */
const dustStyle = computed(() => ({
  width: `${DRIFTER_DUST_LENGTH_SCALE * 100}%`,
  height: `${DRIFTER_DUST_WIDTH_SCALE * 100}%`,
  background: `radial-gradient(ellipse at right center, ${hexToRgba(
    props.def.color,
    0.22,
  )} 0%, ${hexToRgba(props.def.color, 0.07)} 40%, ${hexToRgba(props.def.color, 0)} 100%)`,
}))

// ── Flight ──────────────────────────────────────────────────────────────────
// Position comes from the wall clock, never from an accumulated delta: a
// throttled tab, a dropped frame or a paused overlay can therefore not desync
// the body from the store's spawnedAt.
//
// The LOOP itself lives in DrifterLayer — one rAF drives every drifter, and the
// field and HUD metrics are resolved once per frame instead of once per body.
// All values are written straight to element.style; routing them through Vue
// would re-render the subtree 60×/s.

/**
 * The terminator layers, collected once. There are at most two per body and
 * they never change during a flight, so a query at mount is cheaper and far
 * simpler than threading refs up through DrifterBody.
 */
let litEls: HTMLElement[] = []

function renderFrame(
  now: number,
  field: DrifterFieldRect,
  metrics: HudFieldMetrics,
  viewportW: number,
  viewportH: number,
): void {
  const el = shell.value
  if (!el) return

  const t = (now - props.drifter.spawnedAt) / props.drifter.flightMs
  const point = drifterPointAt(
    props.drifter.routeIndex,
    props.drifter.mirrored,
    t,
    field,
    props.def.sizePx / 2,
    metrics,
  )

  // Fade in on entry, out on exit — the shell carries the envelope so the wake,
  // the aura and the motes ride along without a second animated property.
  let opacity = 1
  if (t < DRIFTER_FADE_IN_FRAC) opacity = Math.max(0, t / DRIFTER_FADE_IN_FRAC)
  else if (t > 1 - DRIFTER_FADE_OUT_FRAC) opacity = Math.max(0, (1 - t) / DRIFTER_FADE_OUT_FRAC)

  el.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`
  el.style.opacity = opacity.toFixed(3)

  // The sun sits at the centre of the stage, so this one angle drives both the
  // terminator across the body and the direction the tail is blown.
  const light = drifterLightAngleDeg(point.x, point.y, viewportW, viewportH)

  for (const lit of litEls) lit.style.transform = `rotate(${light}deg)`

  if (trail.value) {
    // A comet's tail points AWAY FROM THE SUN, not backwards along the path —
    // the wake rides the light angle. Only the probe, which has an engine,
    // pushes against its own heading.
    const wakeDeg = props.def.wake === 'thrust' ? point.angleDeg : light + 180
    trail.value.style.transform = `translate(-100%, -50%) rotate(${wakeDeg.toFixed(1)}deg)`
  }
}

function onHit(event: MouseEvent): void {
  emit('hit', event.clientX, event.clientY)
}

onMounted(() => {
  litEls = shell.value ? Array.from(shell.value.querySelectorAll<HTMLElement>('.db-lit')) : []
})

defineExpose({ renderFrame })
</script>

<style scoped>
.drifter-shell {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  will-change: transform, opacity;
}

.drifter-hit {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--drifter-hit-pad);
  background: none;
  border: none;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.14s ease;
}

.drifter-hit:hover {
  transform: translate(-50%, -50%) scale(1.14);
}

.drifter-hit:active {
  transform: translate(-50%, -50%) scale(0.92);
}

/* No border-radius: the SHAPE is the gradient.
   A 50% radius clipped this element into a lens with a hard edge, and against
   the dark sky that edge read as a stick rather than a tail — visible in every
   screenshot of the set. Letting the radial gradient fall off on its own gives
   an outline that fades instead of ending, which is what a wake looks like. */
.drifter-trail {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: 100% 50%;
  pointer-events: none;
}

/* Inside the wake, centred on it: no second frame-write, and it can never come
   apart from the tail it belongs to. */
.drifter-dust {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  pointer-events: none;
}

.drifter-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation-name: drifter-breathe;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

/* Outer shells past the second one hold still — three separate beats on one
   body read as flicker rather than as light, and each beat is an element
   invalidated every frame. */
.drifter-aura--still {
  animation-name: none;
}

.drifter-ring-plane {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
  /* Static foreshortening: the belt is a circle seen at an angle, and the tilt
     never changes. Animating it would rebuild the ellipse every frame. */
  transform: translate(-50%, -50%) scaleY(var(--ring-tilt));
}

.drifter-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  /* Denser on two opposing arcs, so the turning belt reads as debris strung
     along an orbit rather than as a painted hoop. */
  background: conic-gradient(
    from 0deg,
    var(--ring-color-soft) 0deg,
    var(--ring-color) 38deg,
    var(--ring-color-soft) 88deg,
    transparent 150deg,
    transparent 190deg,
    var(--ring-color-soft) 220deg,
    var(--ring-color) 268deg,
    var(--ring-color-soft) 316deg,
    transparent 360deg
  );
  mask: radial-gradient(circle, transparent 70%, #000 78%, #000 90%, transparent 96%);
  /* The belt sits inside an already-centred plane, so it turns about its own
     middle and needs no translate of its own — hence its own keyframe rather
     than the one the mote planes use. */
  animation: drifter-spin var(--ring-ms) linear infinite;
}

.drifter-motes {
  position: absolute;
  top: 50%;
  left: 50%;
  margin: 0;
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: drifter-orbit linear infinite;
}

.drifter-mote {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.drifter-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drifter-pips {
  position: absolute;
  left: 50%;
  bottom: -14px;
  display: flex;
  gap: 5px;
  transform: translateX(-50%);
  pointer-events: none;
}

.drifter-pip {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2a2a24;
  border: 1px solid #5c3310;
}

.drifter-pip--lit {
  border-color: #e8c040;
}

/* Only transform and opacity animate — a drifter crosses the whole screen
   while orbits, star fights and the background canvas keep running. */
@keyframes drifter-breathe {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0.75;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
}

/* Shared by the belt and both mote planes. The mote planes are centred by a
   translate, so their rotation has to carry it along — one element, one
   transform. */
@keyframes drifter-orbit {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes drifter-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .drifter-aura,
  .drifter-motes,
  .drifter-ring {
    animation: none;
  }
  .drifter-hit {
    transition: none;
  }
}
</style>
