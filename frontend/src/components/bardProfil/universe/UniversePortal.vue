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
 * `.un-stage:has(.un-portal-hit:hover)`. Der fremde Vorfahre war buehnenweit,
 * und auf der laufenden Bahn stehen DREI Portale: ein Hover haette alle drei
 * geweckt. Nebenbei liegen Animation und Regel damit ohnehin im selben scoped
 * Block, was Vues Keyframe-Suffix ohne Trickserei aufloest.
 *
 * Diese Komponente traegt KEINE Bedienung. Der Knopf sitzt im Chart, damit
 * dessen Hover-Pause-Regel (`.un-stage:has(…)`) ihn ohne Scope-Trickserei
 * erfassen kann.
 */
import { computed, ref, watchEffect } from 'vue'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { buildPortalSprite, portalSpriteSpan, type PortalLayer } from '@/utils/fx/portalSprite'
import { universeDiscSpinSec } from '@/utils/fx/universeDisc'
import {
  UNIVERSE_MAP_MAX_DPR,
  UNIVERSE_MAP_PORTAL_BLOOM_ALPHA,
  UNIVERSE_MAP_PORTAL_BLOOM_REST_K,
  UNIVERSE_MAP_PORTAL_BLOOM_SPAN,
  UNIVERSE_MAP_PORTAL_HALO_REST,
  UNIVERSE_MAP_PORTAL_HOVER_BOOST_RATIO,
  UNIVERSE_MAP_PORTAL_HOVER_HALO_K,
  UNIVERSE_MAP_PORTAL_HOVER_MAW_K,
  UNIVERSE_MAP_PORTAL_HOVER_MS,
  UNIVERSE_HOP_GATE_MS,
  UNIVERSE_HOP_GATE_PORTAL_K,
  UNIVERSE_MAP_PORTAL_HOVER_RIM_K,
  UNIVERSE_MAP_PORTAL_HOVER_SWIRL_K,
  UNIVERSE_MAP_PORTAL_MAX_BACKING_PX,
  UNIVERSE_MAP_PORTAL_PULSE_MIN,
  UNIVERSE_MAP_PORTAL_PULSE_SEC,
  UNIVERSE_MAP_PORTAL_RIPPLE_ALPHA,
  UNIVERSE_MAP_PORTAL_RIPPLE_FROM,
  UNIVERSE_MAP_PORTAL_RIPPLE_MS,
  UNIVERSE_MAP_PORTAL_RIPPLE_TO,
  UNIVERSE_MAP_PORTAL_RY,
  UNIVERSE_MAP_PORTAL_SPIN_RATIO,
} from '@/config/constants'
import type { UniversePortalSpot } from '@/utils/ui/universePortalSpot'

const props = defineProps<{
  spot: UniversePortalSpot
  /** Die BAHN, an deren Ende das Portal steht — nie ihr Ziel. */
  seed: number
  /** Der Ton des ZIELS: das Portal sagt, wohin es geht. */
  tint: string
  /** Das ZIEL selbst — sein Galaxienfeld steht im Schlund. */
  target: number
  /** Ueberfahren: die Schwelle wacht auf. Der Zustand kommt von AUSSEN, weil
   *  der Knopf dazu im Chart sitzt — und weil auf der laufenden Bahn DREI
   *  Portale nebeneinander stehen. Eine Regel an `.un-stage:has(…)` weckte
   *  alle drei, egal welches man ueberfaehrt. */
  awake?: boolean
  /** Der Aufbruch: dieses Portal wird angeflogen, die Bühne fällt dahinter weg. */
  departing?: boolean
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
      UNIVERSE_MAP_MAX_DPR,
      UNIVERSE_MAP_PORTAL_MAX_BACKING_PX / span,
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
const bloomPx = computed(() => `${Math.round(ringPx.value * UNIVERSE_MAP_PORTAL_BLOOM_SPAN)}px`)
const ripplePx = computed(() => `${ringPx.value}px`)

/* Dieselbe Wurzelregel wie alles im Reiter, nur mit einem eigenen, BENANNTEN
   Teiler: roh waeren es 166 s und 4,9 px/s an der Armspitze — die Rate eines
   Galaxienfeldes. Ein Portal ist eine offene Maschine, kein Feld. */
const spinSec = computed(() => universeDiscSpinSec(ringPx.value) / UNIVERSE_MAP_PORTAL_SPIN_RATIO)
const spinDur = computed(() => `${spinSec.value}s`)
/* Die Zusatzdrehung ADDIERT sich zur Grunddrehung, statt sie umzustellen: eine
   neue `animation-duration` liesse Chrome den Fortschritt umrechnen, und die
   sieben Motes zeigten den Sprung. */
const boostDur = computed(() => `${spinSec.value / UNIVERSE_MAP_PORTAL_HOVER_BOOST_RATIO}s`)

const pulseDur = `${UNIVERSE_MAP_PORTAL_PULSE_SEC}s`
const pulseMin = String(UNIVERSE_MAP_PORTAL_PULSE_MIN)
const haloRest = String(UNIVERSE_MAP_PORTAL_HALO_REST)

const tintColor = computed(() => props.tint)
const portalRy = String(UNIVERSE_MAP_PORTAL_RY)
const hoverDur = `${UNIVERSE_MAP_PORTAL_HOVER_MS}ms`
const gateDur = `${UNIVERSE_HOP_GATE_MS}ms`
const gateK = String(UNIVERSE_HOP_GATE_PORTAL_K)
const gateHaloK = String(UNIVERSE_HOP_GATE_PORTAL_K * 1.1)
const haloK = String(UNIVERSE_MAP_PORTAL_HOVER_HALO_K)
const rimK = String(UNIVERSE_MAP_PORTAL_HOVER_RIM_K)
const mawK = String(UNIVERSE_MAP_PORTAL_HOVER_MAW_K)
const swirlK = String(UNIVERSE_MAP_PORTAL_HOVER_SWIRL_K)
const bloomAlpha = String(UNIVERSE_MAP_PORTAL_BLOOM_ALPHA)
const bloomRestK = String(UNIVERSE_MAP_PORTAL_BLOOM_REST_K)
const rippleAlpha = String(UNIVERSE_MAP_PORTAL_RIPPLE_ALPHA)
const rippleFrom = String(UNIVERSE_MAP_PORTAL_RIPPLE_FROM)
const rippleTo = String(UNIVERSE_MAP_PORTAL_RIPPLE_TO)
const rippleDur = `${UNIVERSE_MAP_PORTAL_RIPPLE_MS}ms`

const left = computed(() => `${props.spot.x}px`)
const top = computed(() => `${props.spot.y}px`)
</script>

<template>
  <span
    class="un-portal"
    :class="{ 'is-awake': awake, 'is-departing': departing }"
    aria-hidden="true"
  >
    <canvas ref="haloEl" class="un-portal-l un-portal-l--halo" />
    <canvas ref="mawEl" class="un-portal-l un-portal-l--maw" />
    <!-- Das Licht kommt AUS der Oeffnung: es liegt auf dem Schlund und unter
         Wirbel und Ring, damit die Fassung die scharfe oberste Kante bleibt. -->
    <span class="un-portal-fx un-portal-fx--bloom" />
    <!-- Der Drehrahmen der Zusatzdrehung. 0 x 0 auf dem Anker, also dreht und
         skaliert er um genau den Punkt, um den auch der Wirbel dreht. -->
    <span class="un-portal-boost">
      <canvas ref="swirlEl" class="un-portal-l un-portal-l--swirl" />
    </span>
    <canvas ref="rimEl" class="un-portal-l un-portal-l--rim" />
    <!-- Die Welle laeuft UEBER die Fassung hinaus: sie verlaesst die Schwelle,
         statt ein zweiter Ring darauf zu sein. -->
    <span class="un-portal-fx un-portal-fx--ripple" />
  </span>
</template>

<style scoped>
/* Ankerpunkt ohne Ausdehnung: jede Ebene zentriert sich selbst darauf, damit
   die verschiedenen Kantenlaengen nichts ausrichten muessen. */
.un-portal {
  position: absolute;
  left: v-bind(left);
  top: v-bind(top);
  width: 0;
  height: 0;
  pointer-events: none;
}

.un-portal-l {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
  transform: translate(-50%, -50%);
  transform-origin: 50% 50%;
  transition: transform v-bind(hoverDur) cubic-bezier(0.22, 0.68, 0.24, 1);
}

.un-portal-l--maw {
  width: v-bind(mawPx);
  height: v-bind(mawPx);
}

.un-portal-l--rim {
  width: v-bind(rimPx);
  height: v-bind(rimPx);
}

.un-portal-l--swirl {
  width: v-bind(swirlPx);
  height: v-bind(swirlPx);
  animation: un-portal-turn v-bind(spinDur) linear infinite;
}

.un-portal-l--halo {
  width: v-bind(haloPx);
  height: v-bind(haloPx);
  opacity: v-bind(haloRest);
  animation: un-portal-pulse v-bind(pulseDur) ease-in-out infinite;
}

/* Der Wirbel bekommt seinen Hover-Massstab HIER und nicht am Canvas: dessen
   `transform` gehoert den Keyframes, und die Einzeleigenschaft `scale` liegt in
   der Matrixkette AUSSERHALB von `translate(-50%,-50%)` — sie zoege ihn aus der
   Mitte. Am 0-x-0-Rahmen stimmt beides.

   Ruhend PAUSIERT, beim Hover laufend: eine pausierte Animation friert ein und
   laeuft weiter, wo sie stand. Ein blosses Umstellen von `animation-duration`
   liesse Chrome den Fortschritt umrechnen, und die sieben Motes zeigten den
   Sprung. */
.un-portal-boost {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  animation: un-portal-boost v-bind(boostDur) linear infinite;
  animation-play-state: paused;
  transition: scale v-bind(hoverDur) cubic-bezier(0.22, 0.68, 0.24, 1);
}

/* Ruhend malen beide nichts. Sie kosten erst etwas, wenn sie etwas sagen —
   dasselbe Muster wie `.un-node-ring` und `.node-glow`. */
.un-portal-fx {
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
.un-portal-fx--bloom {
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
.un-portal-fx--ripple {
  width: v-bind(ripplePx);
  height: v-bind(ripplePx);
  border: 1.4px solid v-bind(tintColor);
  border-radius: 50%;
  transform: translate(-50%, -50%) scaleY(v-bind(portalRy)) scale(v-bind(rippleFrom));
}

/* Die Zentrierung steht IM Keyframe: eine Drehung ueberschriebe ein separates
   `transform` sonst — dieselbe Falle, gegen die `un-rim-turn` gebaut ist. */
@keyframes un-portal-turn {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes un-portal-pulse {
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
@keyframes un-portal-boost {
  to {
    transform: rotate(360deg);
  }
}

@keyframes un-portal-ripple {
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
.un-portal.is-awake .un-portal-l--halo {
  transform: translate(-50%, -50%) scale(v-bind(haloK));
}

.un-portal.is-awake .un-portal-l--rim {
  transform: translate(-50%, -50%) scale(v-bind(rimK));
}

.un-portal.is-awake .un-portal-l--maw {
  transform: translate(-50%, -50%) scale(v-bind(mawK));
}

.un-portal.is-awake .un-portal-boost {
  animation-play-state: running;
  scale: v-bind(swirlK);
}

.un-portal.is-awake .un-portal-fx--bloom {
  opacity: v-bind(bloomAlpha);
  transform: translate(-50%, -50%) scaleY(v-bind(portalRy)) scale(1);
}

/* Der Aufbruch: das angeflogene Portal waechst dem Schleier entgegen — dieselben
   Ebenen wie beim Hover, groesser und in der Gate-Dauer; der Wirbel laeuft. */
.un-portal.is-departing .un-portal-l--halo {
  transform: translate(-50%, -50%) scale(v-bind(gateHaloK));
  transition-duration: v-bind(gateDur);
}

.un-portal.is-departing .un-portal-l--rim,
.un-portal.is-departing .un-portal-l--maw {
  transform: translate(-50%, -50%) scale(v-bind(gateK));
  transition-duration: v-bind(gateDur);
}

.un-portal.is-departing .un-portal-boost {
  animation-play-state: running;
  scale: v-bind(gateK);
  transition-duration: v-bind(gateDur);
}

/* EINE Welle je Beruehrung, kein Dauerlaeufer. Danach steht das Element wieder
   auf null — `animation-fill-mode` bleibt bewusst aus. */
.un-portal.is-awake .un-portal-fx--ripple {
  animation: un-portal-ripple v-bind(rippleDur) ease-out 1;
}

@media (prefers-reduced-motion: reduce) {
  .un-portal-l,
  .un-portal-boost,
  .un-portal-fx {
    animation: none;
    transition: none;
  }

  /* Das Schwellenlicht bleibt: es ist Auskunft, keine Bewegung. */
  .un-portal.is-awake .un-portal-fx--ripple {
    animation: none;
  }
}
</style>
