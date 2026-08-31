<script setup lang="ts">
/**
 * Das Abflugportal — der Ausgang eines Universums, im schwarzen Raum jenseits
 * der Galaxienscheibe.
 *
 * VIER Canvas auf EINEM Ankerpunkt: Halo, Schlund, Wirbel, stehender Ring. Der
 * Anker misst 0 x 0 und jede Ebene zentriert sich per `translate(-50%,-50%)`
 * darauf — so gibt es trotz verschiedener Kantenlaengen keine Ausrichtung und
 * damit keine ganze Klasse von Fehlern.
 *
 * Bewegt wird ausschliesslich per CSS an FERTIG GEBACKENEN Sprites: der Wirbel
 * dreht, der Halo atmet. Keine Frame-Schleife, kein `data-paints` — der Zaehler
 * gehoert der Karte.
 *
 * Diese Komponente traegt KEINE Bedienung. Der Knopf sitzt im Chart, damit
 * dessen Hover-Pause-Regel (`.fm-stage:has(…)`) ihn ohne Scope-Trickserei
 * erfassen kann.
 */
import { computed, ref, watchEffect } from 'vue'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { buildPortalSprite, portalSpriteSpan, type PortalLayer } from '@/utils/fx/portalSprite'
import { universeDiscSpinSec } from '@/utils/fx/universeDisc'
import {
  FIRMAMENT_MAX_DPR,
  FIRMAMENT_PORTAL_HALO_REST,
  FIRMAMENT_PORTAL_MAX_BACKING_PX,
  FIRMAMENT_PORTAL_PULSE_MIN,
  FIRMAMENT_PORTAL_PULSE_SEC,
  FIRMAMENT_PORTAL_SPIN_RATIO,
} from '@/config/constants'
import type { FirmamentPortalSpot } from '@/utils/ui/firmamentPortalSpot'

const props = defineProps<{
  spot: FirmamentPortalSpot
  /** Die BAHN, an deren Ende das Portal steht — nie ihr Ziel. */
  seed: number
  /** Der Ton des ZIELS: das Portal sagt, wohin es geht. */
  tint: string
  /** Das ZIEL selbst — sein Galaxienfeld steht im Schlund. */
  target: number
}>()

const mawEl = ref<HTMLCanvasElement | null>(null)
const rimEl = ref<HTMLCanvasElement | null>(null)
const swirlEl = ref<HTMLCanvasElement | null>(null)
const haloEl = ref<HTMLCanvasElement | null>(null)

const ringPx = computed(() => Math.round(props.spot.r * 2))

function dprFor(span: number): number {
  return Math.max(
    1,
    Math.min(
      window.devicePixelRatio || 1,
      FIRMAMENT_MAX_DPR,
      FIRMAMENT_PORTAL_MAX_BACKING_PX / span,
    ),
  )
}

/* Der Reiter wird nie abgerissen und liegt lange im Hintergrund — Chrome darf
   den Backing-Store verwerfen, und ohne rAF heilt sich das nicht. */
function paintLayer(cv: HTMLCanvasElement | null, layer: PortalLayer) {
  if (!cv) return
  resetCanvasIfContextLost(cv)
  const span = portalSpriteSpan(layer, ringPx.value)
  const dpr = dprFor(span)
  const side = Math.max(1, Math.round(span * dpr))
  if (cv.width !== side || cv.height !== side) {
    cv.width = side
    cv.height = side
  }
  const ctx = cv.getContext('2d')
  const sprite = buildPortalSprite(layer, props.seed, props.tint, props.target, ringPx.value, dpr)
  if (!ctx || !sprite) return
  ctx.clearRect(0, 0, side, side)
  ctx.drawImage(sprite, 0, 0, side, side)
}

watchEffect(() => {
  paintLayer(mawEl.value, 'maw')
  paintLayer(swirlEl.value, 'swirl')
  paintLayer(rimEl.value, 'rim')
  paintLayer(haloEl.value, 'halo')
})

const mawPx = computed(() => `${portalSpriteSpan('maw', ringPx.value)}px`)
const rimPx = computed(() => `${portalSpriteSpan('rim', ringPx.value)}px`)
const swirlPx = computed(() => `${portalSpriteSpan('swirl', ringPx.value)}px`)
const haloPx = computed(() => `${portalSpriteSpan('halo', ringPx.value)}px`)

/* Dieselbe Wurzelregel wie alles im Reiter, nur mit einem eigenen, BENANNTEN
   Teiler: roh waeren es 166 s und 4,9 px/s an der Armspitze — die Rate eines
   Galaxienfeldes. Ein Portal ist eine offene Maschine, kein Feld. */
const spinDur = computed(
  () => `${universeDiscSpinSec(ringPx.value) / FIRMAMENT_PORTAL_SPIN_RATIO}s`,
)
const pulseDur = `${FIRMAMENT_PORTAL_PULSE_SEC}s`
const pulseMin = String(FIRMAMENT_PORTAL_PULSE_MIN)
const haloRest = String(FIRMAMENT_PORTAL_HALO_REST)

const left = computed(() => `${props.spot.x}px`)
const top = computed(() => `${props.spot.y}px`)
</script>

<template>
  <span class="fm-portal" aria-hidden="true">
    <canvas ref="haloEl" class="fm-portal-l fm-portal-l--halo" />
    <canvas ref="mawEl" class="fm-portal-l fm-portal-l--maw" />
    <canvas ref="swirlEl" class="fm-portal-l fm-portal-l--swirl" />
    <canvas ref="rimEl" class="fm-portal-l fm-portal-l--rim" />
  </span>
</template>

<style scoped>
/* Ankerpunkt ohne Ausdehnung: jede Ebene zentriert sich selbst darauf, damit
   die verschiedenen Kantenlaengen nichts ausrichten muessen. */
.fm-portal {
  position: absolute;
  left: v-bind(left);
  top: v-bind(top);
  width: 0;
  height: 0;
  pointer-events: none;
}

.fm-portal-l {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
  transform: translate(-50%, -50%);
  transform-origin: 50% 50%;
}

.fm-portal-l--maw {
  width: v-bind(mawPx);
  height: v-bind(mawPx);
}

.fm-portal-l--rim {
  width: v-bind(rimPx);
  height: v-bind(rimPx);
}

.fm-portal-l--swirl {
  width: v-bind(swirlPx);
  height: v-bind(swirlPx);
  animation: fm-portal-turn v-bind(spinDur) linear infinite;
}

.fm-portal-l--halo {
  width: v-bind(haloPx);
  height: v-bind(haloPx);
  opacity: v-bind(haloRest);
  animation: fm-portal-pulse v-bind(pulseDur) ease-in-out infinite;
}

/* Die Zentrierung steht IM Keyframe: eine Drehung ueberschriebe ein separates
   `transform` sonst — dieselbe Falle, gegen die `fm-rim-turn` gebaut ist. */
@keyframes fm-portal-turn {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes fm-portal-pulse {
  0%,
  100% {
    opacity: v-bind(pulseMin);
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fm-portal-l {
    animation: none;
  }
}
</style>
