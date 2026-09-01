<script setup lang="ts">
/**
 * Das Abflugportal — der Ausgang eines Universums, im schwarzen Raum jenseits
 * der Galaxienscheibe.
 *
 * SECHS Ebenen auf EINEM Ankerpunkt: Halo, Schlund, Schwellenlicht, Wirbel,
 * stehender Ring, Ringwelle. Der Anker misst 0 x 0 und jede Ebene zentriert
 * sich per `translate(-50%,-50%)` darauf — so gibt es trotz verschiedener
 * Kantenlaengen keine Ausrichtung und damit keine ganze Klasse von Fehlern.
 *
 * Bewegt wird ausschliesslich per CSS an FERTIG GEBACKENEN Sprites: der Wirbel
 * dreht, der Halo atmet. Keine Frame-Schleife, kein `data-paints` — der Zaehler
 * gehoert der Karte.
 *
 * Beim Ueberfahren WACHT DIE SCHWELLE AUF: der Wirbel zieht an, die Ebenen
 * staffeln sich in die Tiefe, das Schwellenlicht blueht auf, eine Welle
 * quittiert. Ausgeloest wird das vom Knopf im Chart, aber der Zustand kommt als
 * PROP herein und schaltet eine Klasse an der EIGENEN Wurzel — nicht mehr ueber
 * `.fm-stage:has(.fm-portal-hit:hover)`. Der fremde Vorfahre war buehnenweit,
 * und auf der laufenden Bahn stehen DREI Portale: ein Hover haette alle drei
 * geweckt. Nebenbei liegen Animation und Regel damit ohnehin im selben scoped
 * Block, was Vues Keyframe-Suffix ohne Trickserei aufloest.
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
  FIRMAMENT_PORTAL_BLOOM_ALPHA,
  FIRMAMENT_PORTAL_BLOOM_REST_K,
  FIRMAMENT_PORTAL_BLOOM_SPAN,
  FIRMAMENT_PORTAL_HALO_REST,
  FIRMAMENT_PORTAL_HOVER_BOOST_RATIO,
  FIRMAMENT_PORTAL_HOVER_HALO_K,
  FIRMAMENT_PORTAL_HOVER_MAW_K,
  FIRMAMENT_PORTAL_HOVER_MS,
  FIRMAMENT_PORTAL_HOVER_RIM_K,
  FIRMAMENT_PORTAL_HOVER_SWIRL_K,
  FIRMAMENT_PORTAL_MAX_BACKING_PX,
  FIRMAMENT_PORTAL_PULSE_MIN,
  FIRMAMENT_PORTAL_PULSE_SEC,
  FIRMAMENT_PORTAL_RIPPLE_ALPHA,
  FIRMAMENT_PORTAL_RIPPLE_FROM,
  FIRMAMENT_PORTAL_RIPPLE_MS,
  FIRMAMENT_PORTAL_RIPPLE_TO,
  FIRMAMENT_PORTAL_RY,
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
  /** Ueberfahren: die Schwelle wacht auf. Der Zustand kommt von AUSSEN, weil
   *  der Knopf dazu im Chart sitzt — und weil auf der laufenden Bahn DREI
   *  Portale nebeneinander stehen. Eine Regel an `.fm-stage:has(…)` weckte
   *  alle drei, egal welches man ueberfaehrt. */
  awake?: boolean
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

/* Schwellenlicht und Welle sind DOM, kein Sprite: das Licht braucht nur einen
   Verlauf, und `portalSprite.spec.ts` verriegelt die Zugzahlen der vier
   Malfunktionen zu eng fuer einen fuenften Zug. Der Durchmesser der Welle IST
   der Ringdurchmesser — deshalb lesen sich ihre Skalen als Ringradien. */
const bloomPx = computed(() => `${Math.round(ringPx.value * FIRMAMENT_PORTAL_BLOOM_SPAN)}px`)
const ripplePx = computed(() => `${ringPx.value}px`)

/* Dieselbe Wurzelregel wie alles im Reiter, nur mit einem eigenen, BENANNTEN
   Teiler: roh waeren es 166 s und 4,9 px/s an der Armspitze — die Rate eines
   Galaxienfeldes. Ein Portal ist eine offene Maschine, kein Feld. */
const spinSec = computed(() => universeDiscSpinSec(ringPx.value) / FIRMAMENT_PORTAL_SPIN_RATIO)
const spinDur = computed(() => `${spinSec.value}s`)
/* Die Zusatzdrehung ADDIERT sich zur Grunddrehung, statt sie umzustellen: eine
   neue `animation-duration` liesse Chrome den Fortschritt umrechnen, und die
   sieben Motes zeigten den Sprung. */
const boostDur = computed(() => `${spinSec.value / FIRMAMENT_PORTAL_HOVER_BOOST_RATIO}s`)

const pulseDur = `${FIRMAMENT_PORTAL_PULSE_SEC}s`
const pulseMin = String(FIRMAMENT_PORTAL_PULSE_MIN)
const haloRest = String(FIRMAMENT_PORTAL_HALO_REST)

const tintColor = computed(() => props.tint)
const portalRy = String(FIRMAMENT_PORTAL_RY)
const hoverDur = `${FIRMAMENT_PORTAL_HOVER_MS}ms`
const haloK = String(FIRMAMENT_PORTAL_HOVER_HALO_K)
const rimK = String(FIRMAMENT_PORTAL_HOVER_RIM_K)
const mawK = String(FIRMAMENT_PORTAL_HOVER_MAW_K)
const swirlK = String(FIRMAMENT_PORTAL_HOVER_SWIRL_K)
const bloomAlpha = String(FIRMAMENT_PORTAL_BLOOM_ALPHA)
const bloomRestK = String(FIRMAMENT_PORTAL_BLOOM_REST_K)
const rippleAlpha = String(FIRMAMENT_PORTAL_RIPPLE_ALPHA)
const rippleFrom = String(FIRMAMENT_PORTAL_RIPPLE_FROM)
const rippleTo = String(FIRMAMENT_PORTAL_RIPPLE_TO)
const rippleDur = `${FIRMAMENT_PORTAL_RIPPLE_MS}ms`

const left = computed(() => `${props.spot.x}px`)
const top = computed(() => `${props.spot.y}px`)
</script>

<template>
  <span
    class="fm-portal"
    :class="{ 'is-awake': awake }"
    aria-hidden="true"
  >
    <canvas ref="haloEl" class="fm-portal-l fm-portal-l--halo" />
    <canvas ref="mawEl" class="fm-portal-l fm-portal-l--maw" />
    <!-- Das Licht kommt AUS der Oeffnung: es liegt auf dem Schlund und unter
         Wirbel und Ring, damit die Fassung die scharfe oberste Kante bleibt. -->
    <span class="fm-portal-fx fm-portal-fx--bloom" />
    <!-- Der Drehrahmen der Zusatzdrehung. 0 x 0 auf dem Anker, also dreht und
         skaliert er um genau den Punkt, um den auch der Wirbel dreht. -->
    <span class="fm-portal-boost">
      <canvas ref="swirlEl" class="fm-portal-l fm-portal-l--swirl" />
    </span>
    <canvas ref="rimEl" class="fm-portal-l fm-portal-l--rim" />
    <!-- Die Welle laeuft UEBER die Fassung hinaus: sie verlaesst die Schwelle,
         statt ein zweiter Ring darauf zu sein. -->
    <span class="fm-portal-fx fm-portal-fx--ripple" />
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
  transition: transform v-bind(hoverDur) cubic-bezier(0.22, 0.68, 0.24, 1);
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

/* Der Wirbel bekommt seinen Hover-Massstab HIER und nicht am Canvas: dessen
   `transform` gehoert den Keyframes, und die Einzeleigenschaft `scale` liegt in
   der Matrixkette AUSSERHALB von `translate(-50%,-50%)` — sie zoege ihn aus der
   Mitte. Am 0-x-0-Rahmen stimmt beides.

   Ruhend PAUSIERT, beim Hover laufend: eine pausierte Animation friert ein und
   laeuft weiter, wo sie stand. Ein blosses Umstellen von `animation-duration`
   liesse Chrome den Fortschritt umrechnen, und die sieben Motes zeigten den
   Sprung. */
.fm-portal-boost {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  animation: fm-portal-boost v-bind(boostDur) linear infinite;
  animation-play-state: paused;
  transition: scale v-bind(hoverDur) cubic-bezier(0.22, 0.68, 0.24, 1);
}

/* Ruhend malen beide nichts. Sie kosten erst etwas, wenn sie etwas sagen —
   dasselbe Muster wie `.fm-node-ring` und `.node-glow`. */
.fm-portal-fx {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  pointer-events: none;
  transform-origin: 50% 50%;
  transition:
    opacity v-bind(hoverDur) ease,
    transform v-bind(hoverDur) cubic-bezier(0.22, 0.68, 0.24, 1);
}

/* HOHL. Eine gefuellte Mitte waere der Aufkleber auf dem Durchgang, gegen den
   schon der Punkt und die Ringscheitel gefallen sind. Der Gipfel liegt dicht am
   Ring, die Ellipse ist die des Schlunds — dieselbe Neigung macht aus Licht und
   Portal EIN Objekt. */
.fm-portal-fx--bloom {
  width: v-bind(bloomPx);
  height: v-bind(bloomPx);
  transform: translate(-50%, -50%) scaleY(v-bind(portalRy)) scale(v-bind(bloomRestK));
  background: radial-gradient(
    closest-side,
    transparent 0 34%,
    color-mix(in srgb, v-bind(tintColor) 34%, transparent) 50%,
    color-mix(in srgb, v-bind(tintColor) 82%, transparent) 60%,
    color-mix(in srgb, v-bind(tintColor) 26%, transparent) 76%,
    transparent 95%
  );
}

/* Ihr Durchmesser IST der Ringdurchmesser: die Skalen der Keyframes lesen sich
   damit direkt als Ringradien. */
.fm-portal-fx--ripple {
  width: v-bind(ripplePx);
  height: v-bind(ripplePx);
  border: 1.4px solid v-bind(tintColor);
  border-radius: 50%;
  transform: translate(-50%, -50%) scaleY(v-bind(portalRy)) scale(v-bind(rippleFrom));
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

/* Der Rahmen misst 0 x 0, sein Drehpunkt IST der Anker — hier braucht es keine
   Zentrierung im Keyframe. */
@keyframes fm-portal-boost {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fm-portal-ripple {
  from {
    transform: translate(-50%, -50%) scaleY(v-bind(portalRy)) scale(v-bind(rippleFrom));
    opacity: v-bind(rippleAlpha);
  }
  to {
    transform: translate(-50%, -50%) scaleY(v-bind(portalRy)) scale(v-bind(rippleTo));
    opacity: 0;
  }
}

/* ── Der Hover ───────────────────────────────────────────────────────────
   Die BEDEUTUNG steckt in der Ordnung der Massstaebe, nicht in ihren Betraegen:
   Fassung vor, Schlund zurueck, Wirbel hinein — man sieht tiefer in den
   Durchgang, statt dass er nur groesser wird. Der Versatz zwischen Ring und
   Schlundkante bleibt unter dem `shadowBlur` des Rings, sonst risse zwischen
   beiden eine Fuge auf. */
.fm-portal.is-awake .fm-portal-l--halo {
  transform: translate(-50%, -50%) scale(v-bind(haloK));
}

.fm-portal.is-awake .fm-portal-l--rim {
  transform: translate(-50%, -50%) scale(v-bind(rimK));
}

.fm-portal.is-awake .fm-portal-l--maw {
  transform: translate(-50%, -50%) scale(v-bind(mawK));
}

.fm-portal.is-awake .fm-portal-boost {
  animation-play-state: running;
  scale: v-bind(swirlK);
}

.fm-portal.is-awake .fm-portal-fx--bloom {
  opacity: v-bind(bloomAlpha);
  transform: translate(-50%, -50%) scaleY(v-bind(portalRy)) scale(1);
}

/* EINE Welle je Beruehrung, kein Dauerlaeufer. Danach steht das Element wieder
   auf null — `animation-fill-mode` bleibt bewusst aus. */
.fm-portal.is-awake .fm-portal-fx--ripple {
  animation: fm-portal-ripple v-bind(rippleDur) ease-out 1;
}

@media (prefers-reduced-motion: reduce) {
  .fm-portal-l,
  .fm-portal-boost,
  .fm-portal-fx {
    animation: none;
    transition: none;
  }

  /* Das Schwellenlicht bleibt: es ist Auskunft, keine Bewegung. */
  .fm-portal.is-awake .fm-portal-fx--ripple {
    animation: none;
  }
}
</style>
