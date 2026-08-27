<template>
  <div v-if="shown" class="lfb-layer" :style="{ '--lfb-px': `${bodyPx}px` }">
    <div
      ref="shell"
      class="lfb-shell"
      :class="{ 'lfb-shell--cleared': shown.cleared, 'lfb-shell--missed': missed }"
    >
      <div ref="scaleEl" class="lfb-scale">
        <span class="lfb-halo" aria-hidden="true"></span>

        <!-- Dieselbe hohle Raute, die `paintLandfall` auf die Galaxiekarte malt:
             breiter dunkler Unterzug, dünner heller Zug darüber. Was hier
             wegzieht, steht später als Marke in der Chronik. -->
        <svg class="lfb-mark" viewBox="0 0 100 100" aria-hidden="true">
          <polygon class="lfb-mark__under" :points="RHOMB_POINTS" />
          <polygon class="lfb-mark__over" :points="RHOMB_POINTS" />
          <circle
            v-for="p in pips"
            :key="p.i"
            class="lfb-pip"
            :class="{ 'lfb-pip--on': p.on }"
            :cx="p.x"
            :cy="p.y"
            :r="PIP_R"
          />
        </svg>

        <Icon class="lfb-glyph" :icon="shown.icon" width="48" height="48" aria-hidden="true" />

        <span v-if="abeamSeq" :key="`abeam-${abeamSeq}`" class="lfb-abeam" aria-hidden="true"></span>
        <span
          v-if="shown.taps > 0"
          :key="`tap-${shown.taps}`"
          class="lfb-tap"
          aria-hidden="true"
        ></span>

        <!-- Trefferfläche nur, wo der Ort auch Griffe nimmt. Das Gloaming zahlt
             ohne Geste, der Cairn verlangt eine Wahl unter dreien — die kann nur
             die HUD-Karte zeigen. Dasselbe Prädikat entscheidet dort.
             Sie steht INNERHALB der Skalenebene und wächst deshalb mit dem
             Körper: fest gesetzt fing sie 144 px um eine 57-px-Marke und nähme
             dem Sonnenklick etwas weg, der bis auf 280 px heranreicht. -->
        <button
          v-if="takesTaps"
          class="lfb-hit"
          type="button"
          :aria-label="`Harvest ${shown.name}`"
          @click.stop="tap"
          @pointerenter="setHover(true)"
          @pointerleave="setHover(false)"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { getLandfall } from '@/config/world/landfalls'
import { landfallAcceptsTap, landfallCleared } from '@/utils/game/landfalls'
import { gameNow } from '@/utils/game/gameClock'
import { hudFieldMetrics } from '@/utils/ui/hudField'
import { useHeaderCenterArc } from '@/composables/ui/useHeaderCenterArc'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import { drifterField, measuredFieldInsets, type DrifterFieldRect } from '@/utils/orbit/drifterPath'
import { landfallFlyPointAt, landfallLaneFor, landfallBodyPx } from '@/utils/orbit/landfallPath'
import {
  LANDFALL_BODY_ABEAM_AT,
  LANDFALL_BODY_ABEAM_MS,
  LANDFALL_BODY_BREATHE_MS,
  LANDFALL_BODY_EXIT_MS,
  LANDFALL_BODY_EXIT_SHRINK,
  LANDFALL_BODY_HALO_SPAN,
  LANDFALL_BODY_HIT_PADDING_PX,
  LANDFALL_BODY_TAP_PULSE_MS,
  ORBIT_SCALE_QUANTIZE_STEPS,
} from '@/config/constants'

/**
 * Der Ort, an dem das Schiff GERADE vorbeikommt — als Körper im freien Feld.
 *
 * Er verhält sich mit Absicht anders als Drifter und Void-Wesen: die sind
 * Wesen und bewegen sich aus eigenem Antrieb, ein Landfall ist ein ORT. Er
 * steht still, das Schiff zieht an ihm vorbei, und was man sieht, ist reine
 * Parallaxe (`utils/orbit/landfallPath.ts`). Seine Lage IST der Fortschritt
 * des Fensters — es gibt keine zweite Uhr.
 *
 * Layer und Körper in EINER Datei: es steht nie mehr als ein Ort offen, ein
 * Split wie beim Drifter trüge hier nichts.
 */

const RHOMB = [
  { x: 50, y: 10 },
  { x: 90, y: 50 },
  { x: 50, y: 90 },
  { x: 10, y: 50 },
]
const RHOMB_POINTS = RHOMB.map((p) => `${p.x},${p.y}`).join(' ')
const PIP_R = 5.4

const hitPad = `${LANDFALL_BODY_HIT_PADDING_PX}px`
const haloSpan = `${LANDFALL_BODY_HALO_SPAN * 100}%`
const haloInset = `${((1 - LANDFALL_BODY_HALO_SPAN) / 2) * 100}%`
const breatheMs = `${LANDFALL_BODY_BREATHE_MS}ms`
const abeamMs = `${LANDFALL_BODY_ABEAM_MS}ms`
const tapMs = `${LANDFALL_BODY_TAP_PULSE_MS}ms`

const galaxyStore = useGalaxyStore()
const { activeLandfall } = storeToRefs(galaxyStore)
const { isIdleRenderingPaused } = useRenderingPaused()
const { headerCenterArc } = useHeaderCenterArc()

interface Snapshot {
  name: string
  icon: string
  lane: number
  mirrored: boolean
  openedAt: number
  windowMs: number
  taps: number
  pips: number
  cleared: boolean
}

const live = computed<Snapshot | null>(() => {
  const a = activeLandfall.value
  const d = a ? getLandfall(a.kind) : undefined
  if (!a || !d) return null
  const spur = landfallLaneFor(galaxyStore.mapSeed, a.leg)
  return {
    name: d.name,
    icon: d.icon,
    lane: spur.lane,
    mirrored: spur.mirrored,
    openedAt: a.openedAt,
    windowMs: galaxyStore.activeLandfallWindowMs,
    taps: a.taps,
    // Ohne Griffe keine Marken: der Cairn zählt eine Wahl, das Gloaming nichts.
    pips: d.gesture === 'none' || d.gesture === 'choice' ? 0 : (d.tapCap ?? 1),
    cleared: landfallCleared(a),
  }
})

/** Was nach dem Schliessen noch kurz stehen bleibt. Ohne den Nachlauf verschwände
 *  der Körper mitten im Bild von einem Frame auf den nächsten — und ausgerechnet
 *  der letzte Anblick ist der, den die Chronik später wiederholt. */
const farewell = ref<Snapshot | null>(null)
const shown = computed(() => live.value ?? farewell.value)
const missed = computed(() => farewell.value !== null && !farewell.value.cleared)

const takesTaps = computed(() => {
  const a = activeLandfall.value
  return a ? landfallAcceptsTap(getLandfall(a.kind), a.taps) : false
})

const pips = computed(() => {
  const n = shown.value?.pips ?? 0
  const getan = shown.value?.taps ?? 0
  const out: { i: number; x: number; y: number; on: boolean }[] = []
  for (let i = 0; i < n; i++) {
    // Gleichmässig um den Umfang, um eine halbe Stufe versetzt — sonst sässe die
    // erste Marke genau auf der Spitze und läse sich als Teil der Form.
    const p = (i + 0.5) / n
    const seite = Math.floor(p * 4) % 4
    const f = p * 4 - Math.floor(p * 4)
    const a = RHOMB[seite]
    const b = RHOMB[(seite + 1) % 4]
    out.push({ i, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, on: i < getan })
  }
  return out
})

/* Ein Griff am Ort ist bewusst KEIN Bard-Klick: über `registerClick` liefe er in
   die Passive Resonance und damit in die Abklingzeiten. Dieselbe Action, die die
   HUD-Karte ruft — ein erzwungener Griff sieht damit aus wie ein geklickter. */
function tap(): void {
  galaxyStore.tapLandfall()
}

/* Die HUD-Karte hebt ihre Akzentkante an, solange der Zeiger auf dem Körper
   steht — die beiden gehören zusammen und stehen weit auseinander. */
function setHover(on: boolean): void {
  document.body.classList.toggle('landfall-body-hover', on)
}

// ── Die Frame-Schleife ──────────────────────────────────────────────────────
// Sie läuft NUR, solange ein Ort im Bild steht. Anders als beim Drifter ist das
// die Ausnahme: zwischen zwei Orten liegen Minuten, und ein leer mitlaufender
// rAF wäre reine Abgabe.

const shell = ref<HTMLElement | null>(null)
const scaleEl = ref<HTMLElement | null>(null)
const abeamSeq = ref(0)

let frame = 0
let feld: DrifterFieldRect = drifterField(0, 0)
const bodyPx = ref(landfallBodyPx(1920))
let lastLive: Snapshot | null = null
let exitAt = 0
let exitT = 1

function refreshField(): void {
  feld = drifterField(window.innerWidth, window.innerHeight, measuredFieldInsets())
  bodyPx.value = landfallBodyPx(window.innerWidth)
}

function render(): void {
  const s = shown.value
  const el = shell.value
  const box = scaleEl.value
  if (!s || !el || !box) return

  const now = gameNow()
  const laeuft = live.value !== null
  let t = s.windowMs > 0 ? (now - s.openedAt) / s.windowMs : 1
  let schwund = 0
  if (laeuft) {
    if (t >= LANDFALL_BODY_ABEAM_AT && abeamSeq.value === 0) abeamSeq.value = 1
  } else {
    // Der Abgang friert die Lage ein und nimmt nur noch Grösse und Deckkraft.
    t = exitT
    schwund = Math.min(1, Math.max(0, (now - exitAt) / LANDFALL_BODY_EXIT_MS))
  }

  const punkt = landfallFlyPointAt(
    s.lane,
    s.mirrored,
    t,
    feld,
    bodyPx.value,
    hudFieldMetrics(headerCenterArc.value ?? null),
  )
  const skala = punkt.scale * (1 - LANDFALL_BODY_EXIT_SHRINK * schwund)

  el.style.transform = `translate3d(${punkt.x.toFixed(1)}px, ${punkt.y.toFixed(1)}px, 0)`
  el.style.opacity = (punkt.alpha * (1 - schwund)).toFixed(3)
  // Auf 1-%-Stufen: der Compositor bewegt gratis, ein GEÄNDERTER transform kann
  // rastern — dieselbe Quantisierung wie im Orbit.
  box.style.transform = `scale(${Math.round(skala * ORBIT_SCALE_QUANTIZE_STEPS) / ORBIT_SCALE_QUANTIZE_STEPS})`

  if (!laeuft && schwund >= 1) farewell.value = null
}

function tick(): void {
  frame = requestAnimationFrame(tick)
  // Liegt ein Modal darüber, endet der Frame vor dem Schreiben. Die Schleife
  // läuft weiter — ab- und wieder anmelden kostet mehr als der leere Durchlauf.
  if (isIdleRenderingPaused.value) return
  render()
}

watch(
  live,
  (jetzt, vorher) => {
    if (jetzt) {
      lastLive = jetzt
      farewell.value = null
      if (!vorher) abeamSeq.value = 0
      return
    }
    if (!lastLive) return
    // Geschlossen: der letzte Eintrag der Ergebnisreihe sagt, was daraus wurde.
    const letzte = galaxyStore.landfallResults[galaxyStore.landfallResults.length - 1]
    const now = gameNow()
    exitT =
      lastLive.windowMs > 0 ? Math.min(1, (now - lastLive.openedAt) / lastLive.windowMs) : 1
    exitAt = now
    farewell.value = { ...lastLive, cleared: letzte?.cleared ?? false }
    lastLive = null
  },
  { immediate: true },
)

watch(
  () => shown.value !== null,
  (da) => {
    if (!da) {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      return
    }
    if (frame) return
    refreshField()
    frame = requestAnimationFrame(tick)
    // Ein frisch montierter Körper muss stehen, BEVOR gemalt wird — sonst
    // blitzt er einen Frame lang in der linken oberen Ecke.
    void nextTick(render)
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', refreshField)
  refreshField()
})

onUnmounted(() => {
  window.removeEventListener('resize', refreshField)
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  document.body.classList.remove('landfall-body-hover')
})
</script>

<style scoped>
/* z-index 42 ist der Streifen, in dem Drifter und Void schon liegen: über der
   Chime-Klickfläche der Sonne (10), unter Header (120) und Bottom-Bar (10000).
   Die Ebene selbst fängt keinen Klick ab — nur der Knopf. */
.lfb-layer {
  position: fixed;
  inset: 0;
  z-index: 42;
  pointer-events: none;
}

/* Ein 0x0-Punkt; alles Sichtbare hängt zentriert daran. */
.lfb-shell {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  will-change: transform, opacity;
}

.lfb-scale {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--lfb-px);
  height: var(--lfb-px);
  margin-top: calc(var(--lfb-px) / -2);
  margin-left: calc(var(--lfb-px) / -2);
}

/* Eigene Ebene mit STATISCHEM Verlauf; animiert wird nur ihre Deckkraft. */
.lfb-halo {
  position: absolute;
  top: v-bind(haloInset);
  left: v-bind(haloInset);
  width: v-bind(haloSpan);
  height: v-bind(haloSpan);
  /* LANDFALL_ACCENT_HEX */
  background: radial-gradient(
    circle,
    rgba(143, 191, 174, 0.26) 0%,
    rgba(143, 191, 174, 0.1) 42%,
    transparent 70%
  );
  opacity: 0.55;
  animation: lfb-breathe v-bind(breatheMs) ease-in-out infinite;
}

.lfb-mark {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.lfb-mark__under {
  fill: none;
  stroke: rgba(11, 8, 6, 0.75);
  stroke-width: 9;
  stroke-linejoin: round;
}

/* LANDMARK_LANDFALL_RING — unbunt, wie auf der Galaxiekarte: zwanzig
   Galaxie-Themen decken den Farbkreis fast lückenlos ab. */
.lfb-mark__over {
  fill: none;
  stroke: #aeb2b0;
  stroke-width: 3.4;
  stroke-linejoin: round;
  opacity: 0.88;
}

/* LANDMARK_FREED_RING — angefasst steht der Ort so hell wie ein befreiter
   Stern, aber ohne dessen Kernfunke. */
.lfb-shell--cleared .lfb-mark__over {
  stroke: #eef2f8;
  opacity: 1;
}

/* LANDMARK_LANDFALL_MISSED_ALPHA — dieselbe Zahl, mit der die Marke später auf
   dem Galaxiebild steht. */
.lfb-shell--missed .lfb-mark__over,
.lfb-shell--missed .lfb-glyph,
.lfb-shell--missed .lfb-pip {
  opacity: 0.4;
}

.lfb-shell--missed .lfb-halo {
  opacity: 0.15;
  animation: none;
}

.lfb-pip {
  fill: #16140e;
  stroke: #aeb2b0;
  stroke-width: 1.6;
  opacity: 0.55;
}

.lfb-pip--on {
  fill: #8fbfae;
  stroke: #cfe6dd;
  opacity: 1;
}

.lfb-glyph {
  position: absolute;
  top: 33%;
  left: 33%;
  width: 34%;
  height: 34%;
  color: #8fbfae;
}

.lfb-shell--cleared .lfb-glyph {
  color: #cfe6dd;
}

/* Querab: der Ort ist am nächsten, das Fenster halb um. Läuft genau einmal. */
.lfb-abeam,
.lfb-tap {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 52%,
    rgba(143, 191, 174, 0.5) 68%,
    transparent 82%
  );
  pointer-events: none;
}

.lfb-abeam {
  animation: lfb-ring v-bind(abeamMs) ease-out forwards;
}

.lfb-tap {
  animation: lfb-ring v-bind(tapMs) ease-out forwards;
}

/* Die Raute hat spitze Ecken und trifft sich schlechter als eine Scheibe —
   LANDFALL_BODY_HIT_PADDING_PX legt einen Rand um sie. In der Skalenebene, also
   mitwachsend: der Rand ist querab 14 px und weit weg entsprechend weniger. */
.lfb-hit {
  position: absolute;
  inset: calc(v-bind(hitPad) * -1);
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.14s ease;
}

.lfb-hit:hover {
  transform: scale(1.08);
}

.lfb-hit:active {
  transform: scale(0.94);
}

@keyframes lfb-breathe {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.75;
  }
}

@keyframes lfb-ring {
  from {
    transform: scale(0.9);
    opacity: 0.9;
  }
  to {
    transform: scale(2.4);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lfb-halo {
    animation: none;
  }
  .lfb-abeam,
  .lfb-tap {
    display: none;
  }
  .lfb-hit {
    transition: none;
  }
}
</style>
