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
      <!-- Trail: banks into the flight heading, set once per frame together
           with the position. Pure gradient, no blur — it scrolls across the
           screen every frame and must stay compositor-only. -->
      <span ref="trail" class="drifter-trail" :style="trailStyle" aria-hidden="true"></span>

      <!-- Static aura. Never animated with filter/box-shadow (see CLAUDE.md):
           the breathing is a transform on its own layer. -->
      <span class="drifter-aura" :style="auraStyle" aria-hidden="true"></span>

      <!-- The silhouette is pure CSS, one shape per drifter type — see
           DrifterBody.vue. Nothing in here paints per frame; the body only
           carries its own idle animation while the shell does the travelling. -->
      <span class="drifter-body" :style="bodyStyle">
        <DrifterBody :kind="def.body" :color="def.color" />
      </span>

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ActiveDrifter, DrifterDef } from '@/types'
import { drifterField, drifterPointAt, measuredFieldInsets } from '@/utils/orbit/drifterPath'
import { hudFieldMetrics } from '@/utils/ui/hudField'
import { useHeaderCenterArc } from '@/composables/ui/useHeaderCenterArc'
import { hexToRgba } from '@/utils/ui/format'
import { DRIFTER_RARITY_GLOW } from '@/config/world/drifters'
import DrifterBody from './DrifterBody.vue'
import {
  DRIFTER_FADE_IN_FRAC,
  DRIFTER_FADE_OUT_FRAC,
  DRIFTER_HIT_PADDING_PX,
  DRIFTER_AURA_SCALE,
  DRIFTER_TRAIL_LENGTH_SCALE,
  DRIFTER_TRAIL_WIDTH_SCALE,
  DRIFTER_TRAIL_WIDTH_MAX_PX,
  DRIFTER_TRAIL_WIDTH_MIN_PX,
} from '@/config/constants'
import { gameNow } from '@/utils/game/gameClock'

const props = defineProps<{
  drifter: ActiveDrifter
  def: DrifterDef
  /** Freeze the flight while an overlay covers the idle layer. */
  paused: boolean
}>()

const emit = defineEmits<{ hit: [x: number, y: number] }>()

const shell = ref<HTMLElement>()
const trail = ref<HTMLElement>()

const glow = computed(() => DRIFTER_RARITY_GLOW[props.def.rarity])

const shellStyle = computed(() => ({
  '--drifter-size': `${props.def.sizePx}px`,
  '--drifter-hit-pad': `${DRIFTER_HIT_PADDING_PX}px`,
}))

const bodyStyle = computed(() => ({
  width: `${props.def.sizePx}px`,
  height: `${props.def.sizePx}px`,
}))

const auraStyle = computed(() => ({
  width: `${props.def.sizePx * DRIFTER_AURA_SCALE}px`,
  height: `${props.def.sizePx * DRIFTER_AURA_SCALE}px`,
  background: `radial-gradient(circle, ${hexToRgba(props.def.color, glow.value)} 0%, ${hexToRgba(
    props.def.color,
    glow.value * 0.45,
  )} 38%, ${hexToRgba(props.def.color, 0)} 70%)`,
}))

const trailStyle = computed(() => {
  // Capped width: the trail should read as a wake, and a body four times the
  // size of a shard must not drag a bar across the screen.
  const width = Math.min(
    DRIFTER_TRAIL_WIDTH_MAX_PX,
    Math.max(DRIFTER_TRAIL_WIDTH_MIN_PX, props.def.sizePx * DRIFTER_TRAIL_WIDTH_SCALE),
  )
  return {
    width: `${props.def.sizePx * DRIFTER_TRAIL_LENGTH_SCALE}px`,
    height: `${width}px`,
    background: `linear-gradient(to left, ${hexToRgba(props.def.color, 0.5)}, ${hexToRgba(
      props.def.color,
      0,
    )})`,
  }
})

// ── Flight loop ─────────────────────────────────────────────────────────────
// Position comes from the wall clock, never from an accumulated delta: a
// throttled tab, a dropped frame or a paused overlay can therefore not desync
// the body from the store's spawnedAt. Both values are written straight to
// element.style — routing them through Vue would re-render the subtree 60×/s.

let frame = 0

// The flight band, resolved once and cached. Recomputing it per frame costs a
// getComputedStyle() call, and that FORCES a style recalculation on every
// frame — measured at roughly -17 fps with the orbit, planets and stars all
// running. The HUD only moves when the window does, so the cache is refreshed
// from the resize handler instead.
let cachedField = drifterField(0, 0)

function refreshField(): void {
  cachedField = drifterField(window.innerWidth, window.innerHeight, measuredFieldInsets())
}

// Die HUD-Kontur — sie ersetzt die beiden Rechteck-Klemmungen im Pfad. Der
// Zwischenspeicher in `hudField` hält sie zwischen Resizes fest, der Aufruf
// hier kostet also keinen Style-Read je Frame (worauf der Cache oben schon
// einmal teuer aufmerksam gemacht hat).
const { headerCenterArc } = useHeaderCenterArc()

function renderFrame(): void {
  const el = shell.value
  if (!el) {
    frame = 0
    return
  }
  if (props.paused) {
    frame = requestAnimationFrame(renderFrame)
    return
  }

  const t = (gameNow() - props.drifter.spawnedAt) / props.drifter.flightMs
  const field = cachedField
  const point = drifterPointAt(
    props.drifter.routeIndex,
    props.drifter.mirrored,
    t,
    field,
    props.def.sizePx / 2,
    hudFieldMetrics(headerCenterArc.value ?? null),
  )

  // Fade in on entry, out on exit — the body itself carries the envelope so
  // the trail and aura ride along without a second animated property.
  let opacity = 1
  if (t < DRIFTER_FADE_IN_FRAC) opacity = Math.max(0, t / DRIFTER_FADE_IN_FRAC)
  else if (t > 1 - DRIFTER_FADE_OUT_FRAC) opacity = Math.max(0, (1 - t) / DRIFTER_FADE_OUT_FRAC)

  el.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`
  el.style.opacity = opacity.toFixed(3)

  if (trail.value) {
    trail.value.style.transform = `translate(-100%, -50%) rotate(${point.angleDeg.toFixed(1)}deg)`
  }

  frame = requestAnimationFrame(renderFrame)
}

function onHit(event: MouseEvent): void {
  emit('hit', event.clientX, event.clientY)
}

onMounted(() => {
  refreshField()
  window.addEventListener('resize', refreshField)
  // First position before the browser paints — otherwise the body flashes at
  // the top-left corner for one frame.
  renderFrame()
})

onUnmounted(() => {
  window.removeEventListener('resize', refreshField)
  if (frame) cancelAnimationFrame(frame)
  frame = 0
})
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

/* Lens-shaped, not a rounded box: the wake tapers away from the body. The 50%
   radius is the same exemption the circular glow layers use — it makes the
   element round, it does not soften a rectangle's corners. */
.drifter-trail {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: 100% 50%;
  border-radius: 50%;
  pointer-events: none;
}

.drifter-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: drifter-breathe 2.6s ease-in-out infinite;
}

.drifter-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: drifter-bob 4.2s ease-in-out infinite;
}

/* Larger types read as a creature, not a pickup: slower, wider sway. */
.drifter-hit--large .drifter-body {
  animation-duration: 7s;
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

@keyframes drifter-bob {
  0%,
  100% {
    transform: translateY(-4%) rotate(-4deg);
  }
  50% {
    transform: translateY(4%) rotate(4deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .drifter-aura,
  .drifter-body {
    animation: none;
  }
  .drifter-hit {
    transition: none;
  }
}
</style>
