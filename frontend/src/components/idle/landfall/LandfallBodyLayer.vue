<template>
  <div
    v-if="shown"
    class="lfb-layer"
    :style="{
      '--lfb-px': `${bodyPx}px`,
      '--lfb-span': `${bodyPx * LANDFALL_SPRITE_SPAN}px`,
      '--lfb-veil-alpha': stage.veilAlpha,
      '--lfb-veil-low': stage.veilAlpha * LANDFALL_VEIL_BREATHE_LOW,
    }"
  >
    <div
      ref="shell"
      class="lfb-shell"
      :class="{ 'lfb-shell--cleared': shown.cleared, 'lfb-shell--missed': missed }"
    >
      <div ref="scaleEl" class="lfb-scale">
        <!-- Staubschleier: was ein seltener Ort mehr mitbringt als ein häufiger.
             Statischer Verlauf, animiert wird ausschliesslich die Deckkraft. -->
        <span
          v-for="v in veils"
          :key="`veil-${v}`"
          class="lfb-veil"
          :class="{ 'lfb-veil--late': v === 1 }"
          aria-hidden="true"
        ></span>

        <!-- Der Körper. EIN gerastertes Bild, das als Ganzes auf den
             Lichtwinkel dreht: die Sonnenseite ist im Sprite eingebacken, also
             zeigt sie damit immer zur Bühnenmitte, wo die Sonne steht. -->
        <div ref="turnEl" class="lfb-turn" aria-hidden="true">
          <div ref="albedoEl" class="lfb-albedo"></div>
          <div v-if="hasBeacon" ref="beaconEl" class="lfb-beacon"></div>
        </div>

        <!-- Begleitsplitter, ab Präsenzstufe `rare`. Reine CSS-Rotation an einer
             eigenen Ebene — kein Frame-Wert. -->
        <span v-if="motes.length" class="lfb-motes" aria-hidden="true">
          <i
            v-for="m in motes"
            :key="`mote-${m.i}`"
            class="lfb-mote"
            :style="{ transform: `rotate(${m.deg}deg) translateX(${m.span}%)` }"
          ></i>
        </span>

        <!-- Die Griffe. Sie stehen AUSSERHALB der Silhouette auf einem eigenen
             Kreis: Zustand gehört ins DOM, die Form ins Canvas — dieselbe
             Trennung, die `ExpeditionLandfallNode` auf der Karte führt. -->
        <svg v-if="shown.pips > 0" class="lfb-ticks" viewBox="0 0 100 100" aria-hidden="true">
          <path
            v-for="p in pips"
            :key="p.i"
            class="lfb-tick"
            :class="{ 'lfb-tick--on': p.on }"
            :d="p.d"
          />
        </svg>

        <span v-if="heralded" :key="`herald-${heralded}`" class="lfb-herald" aria-hidden="true">
        </span>
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
import { storeToRefs } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { getLandfall } from '@/config/world/landfalls'
import { landfallAcceptsTap, landfallCleared } from '@/utils/game/landfalls'
import { gameNow } from '@/utils/game/gameClock'
import { hudFieldMetrics } from '@/utils/ui/hudField'
import { useHeaderCenterArc } from '@/composables/ui/useHeaderCenterArc'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import {
  drifterField,
  drifterLightAngleDeg,
  measuredFieldInsets,
  type DrifterFieldRect,
} from '@/utils/orbit/drifterPath'
import { landfallFlyPointAt, landfallLaneFor, landfallBodyPx } from '@/utils/orbit/landfallPath'
import { buildLandfallBeacon, buildLandfallSprite } from '@/utils/fx/landfallSprite'
import { clampSpriteDpr } from '@/utils/fx/spaceBody'
import {
  LANDFALL_BODY_ABEAM_AT,
  LANDFALL_BODY_ABEAM_MS,
  LANDFALL_BODY_EXIT_MS,
  LANDFALL_BODY_EXIT_SHRINK,
  LANDFALL_BODY_HIT_PADDING_PX,
  LANDFALL_BODY_MOTIF,
  LANDFALL_BODY_TAP_PULSE_MS,
  LANDFALL_DISTRESS_MS,
  LANDFALL_MOTE_ORBIT_MS,
  LANDFALL_MOTE_ORBIT_SPAN,
  LANDFALL_ORNAMENT_MIN_PX,
  LANDFALL_PRESENCE_STAGES,
  LANDFALL_SPIN_PHASE_DEG,
  LANDFALL_SPIN_QUANTIZE_DEG,
  LANDFALL_SPIN_TURN_DEG,
  LANDFALL_SPRITE_SPAN,
  LANDFALL_VEIL_BREATHE_LOW,
  LANDFALL_VEIL_BREATHE_MS,
  LANDFALL_VEIL_OFFSET_MS,
  ORBIT_SCALE_QUANTIZE_STEPS,
  LANDFALL_THROUGH_ABEAM_AT,
} from '@/config/constants'
import type { LandfallKindId, LandfallFlightMode } from '@/types'

/**
 * Der Ort, an dem das Schiff GERADE vorbeikommt — als Körper im freien Feld.
 *
 * Er verhält sich mit Absicht anders als Drifter und Void-Wesen: die sind
 * Wesen und bewegen sich aus eigenem Antrieb, ein Landfall ist ein ORT. Er
 * bleibt, wo er ist, das Schiff zieht an ihm vorbei, und was man sieht, ist
 * reine Parallaxe (`utils/orbit/landfallPath.ts`). Seine Lage IST der
 * Fortschritt des Fensters — es gibt keine zweite Uhr.
 *
 * Und er ist ein KÖRPER IM LICHT DER SONNE, kein Zeichen am Himmel — derselbe
 * Satz, auf dem `DrifterBody.vue` steht. Die Bühne hat genau eine Lichtquelle,
 * sie steht in der Mitte, und `drifterLightAngleDeg` beantwortet schon, aus
 * welchem Winkel sie auf einen Punkt fällt. Die Funktion beschreibt die BÜHNE,
 * nicht den Drifter.
 *
 * Layer und Körper in EINER Datei: es steht nie mehr als ein Ort offen, ein
 * Split wie beim Drifter trüge hier nichts.
 */

const hitPad = `${LANDFALL_BODY_HIT_PADDING_PX}px`
const abeamMs = `${LANDFALL_BODY_ABEAM_MS}ms`
const tapMs = `${LANDFALL_BODY_TAP_PULSE_MS}ms`
const veilMs = `${LANDFALL_VEIL_BREATHE_MS}ms`
const veilOffset = `-${LANDFALL_VEIL_OFFSET_MS}ms`
const beaconMs = `${LANDFALL_DISTRESS_MS}ms`
const moteMs = `${LANDFALL_MOTE_ORBIT_MS}ms`

const galaxyStore = useGalaxyStore()
const planetShop = usePlanetShopStore()
const { activeLandfall } = storeToRefs(galaxyStore)
const { isIdleRenderingPaused } = useRenderingPaused()
const { headerCenterArc } = useHeaderCenterArc()

interface Snapshot {
  flightMode: LandfallFlightMode
  kind: LandfallKindId
  name: string
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
    flightMode: a.flightMode ?? 'flyby',
    kind: d.id,
    name: d.name,
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
 *  der letzte Anblick ist der, den der Spieler behält. */
const farewell = ref<Snapshot | null>(null)
const shown = computed(() => live.value ?? farewell.value)
const missed = computed(() => farewell.value !== null && !farewell.value.cleared)

const takesTaps = computed(() => {
  const a = activeLandfall.value
  return a ? landfallAcceptsTap(getLandfall(a.kind), a.taps) : false
})

const stage = computed(() => {
  const d = shown.value ? getLandfall(shown.value.kind) : undefined
  return LANDFALL_PRESENCE_STAGES[d?.presence ?? 'common']
})

const veils = computed(() => Array.from({ length: stage.value.veilLayers }, (_, i) => i))

const motes = computed(() =>
  Array.from({ length: stage.value.motes }, (_, i) => ({
    i,
    // Gleichmässig verteilt, um eine halbe Stufe versetzt — sonst stünde der
    // erste Splitter genau auf der Waagerechten.
    deg: ((i + 0.5) / stage.value.motes) * 360,
    span: LANDFALL_MOTE_ORBIT_SPAN * 50,
  })),
)

/** Nicht am Ort, sondern am MOTIV: teilt sich ein siebter die Havaristen,
 *  bekommt er die Lampe von selbst. */
const hasBeacon = computed(() =>
  shown.value ? LANDFALL_BODY_MOTIF[shown.value.kind] === 'derelicts' : false,
)

/**
 * Die Griffe als Segmentbogen UNTER dem Körper.
 *
 * Zuerst standen sie als Striche auf einem vollen Kreis um ihn herum — und das
 * las sich im Bild als ZIFFERBLATT. Ausgerechnet daneben läuft eine echte Uhr
 * (der Fensterbalken der HUD-Karte), also war die eine Anzeige für die andere zu
 * halten. Ein Bogen, der sich von links nach rechts füllt, ist eindeutig ein
 * Zähler.
 */
const pips = computed(() => {
  const n = shown.value?.pips ?? 0
  const getan = shown.value?.taps ?? 0
  const out: { i: number; d: string; on: boolean }[] = []
  if (n === 0) return out
  // Ein eigener Bogen AUSSERHALB der Silhouette: auf dem Körper sässen die
  // Marken auf Krater und Plattenfuge und läsen sich als Teil des Objekts.
  const r = 58
  const von = 0.62 * Math.PI // unten links
  const bis = 0.38 * Math.PI // unten rechts, über den Bogen unten herum
  const spanne = Math.PI * 2 - (von - bis)
  const luecke = Math.min(0.06, spanne / (n * 6))
  for (let i = 0; i < n; i++) {
    const a0 = von + (spanne * i) / n + luecke / 2
    const a1 = von + (spanne * (i + 1)) / n - luecke / 2
    const x0 = 50 + Math.cos(a0) * r
    const y0 = 50 + Math.sin(a0) * r
    const x1 = 50 + Math.cos(a1) * r
    const y1 = 50 + Math.sin(a1) * r
    out.push({
      i,
      d: `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      on: i < getan,
    })
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
const turnEl = ref<HTMLElement | null>(null)
const albedoEl = ref<HTMLElement | null>(null)
const beaconEl = ref<HTMLElement | null>(null)
const abeamSeq = ref(0)
const heralded = ref(0)

let frame = 0
let feld: DrifterFieldRect = drifterField(0, 0)
const bodyPx = ref(landfallBodyPx(1920))
let lastLive: Snapshot | null = null
let exitAt = 0
let exitT = 1

const reducedMotion =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

function refreshField(): void {
  feld = drifterField(window.innerWidth, window.innerHeight, measuredFieldInsets())
  bodyPx.value = landfallBodyPx(window.innerWidth)
}

/**
 * Das Bild einhängen — einmal je Ort und Grösse, nie im Frame.
 *
 * Der Sprite IST ein Canvas; er wandert direkt in den DOM, statt in ein zweites
 * kopiert zu werden. Ein `drawImage` je Frame wäre die eine Sache, die diesen
 * Umbau teuer machen könnte, und die Grösse macht ohnehin `scale()` am
 * Compositor.
 */
function mountSprite(): void {
  const s = shown.value
  if (!s) return
  const dpr = clampSpriteDpr(window.devicePixelRatio || 1)
  const box = albedoEl.value
  if (box) {
    const sprite = buildLandfallSprite(s.kind, bodyPx.value, dpr, stage.value.detail)
    box.replaceChildren()
    if (sprite) box.appendChild(sprite)
  }
  const lamp = beaconEl.value
  if (lamp) {
    const beacon = buildLandfallBeacon(s.kind, bodyPx.value, dpr)
    lamp.replaceChildren()
    if (beacon) lamp.appendChild(beacon)
  }
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
    const abeamAt = s.flightMode === 'through' ? LANDFALL_THROUGH_ABEAM_AT : LANDFALL_BODY_ABEAM_AT
    if (t >= abeamAt && abeamSeq.value === 0) abeamSeq.value = 1
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
    s.flightMode,
    planetShop.currentSunRadius,
  )
  const skala = s.flightMode === 'through' ? punkt.scale : punkt.scale * (1 - LANDFALL_BODY_EXIT_SHRINK * schwund)

  el.style.transform = `translate3d(${punkt.x.toFixed(1)}px, ${punkt.y.toFixed(1)}px, 0)`
  el.style.opacity = (punkt.alpha * (1 - schwund)).toFixed(3)
  // Auf 1-%-Stufen: der Compositor bewegt gratis, ein GEÄNDERTER transform kann
  // rastern — dieselbe Quantisierung wie im Orbit.
  box.style.transform = `scale(${Math.round(skala * ORBIT_SCALE_QUANTIZE_STEPS) / ORBIT_SCALE_QUANTIZE_STEPS})`

  // Zierebenen kosten pro Instanz, und an den Enden der Sehne steht der Körper
  // auf 45 % — auf Full HD also 53 px. Drei Begleitsplitter messen dort je zwei
  // Pixel: unsichtbar und trotzdem voll bezahlt (Performance-Regel 7).
  //
  // Geprüft wird die ECHTE Kantenlänge, nicht `--lfb-px`: die liegt selbst auf
  // der schmalsten Breite bei 99 px, eine Prüfung dagegen wäre immer wahr.
  // Als KLASSE, nicht als reaktiver Wert — ein Vue-Update pro Frame ist genau
  // das, was Regel 3 verbietet; ein `classList.toggle` mit gleichem Wert
  // verwirft Blink selbst.
  el.classList.toggle('lfb-shell--tiny', bodyPx.value * skala < LANDFALL_ORNAMENT_MIN_PX)

  // EINE Drehung trägt zwei Dinge.
  //
  // Der LICHTWINKEL ist der Hauptteil: die Sonnenseite ist im Sprite eingebacken
  // (Licht von links), also zeigt sie zur Bühnenmitte, sobald der Sprite auf
  // `drifterLightAngleDeg` steht. Über einen Vorbeiflug wandert dieser Winkel um
  // bis zu 150 Grad — der Körper dreht sich dadurch schon sichtbar, ohne dass
  // dafür etwas erfunden werden müsste.
  //
  // Die EIGENDREHUNG kommt obendrauf und hängt am Fensterfortschritt, nicht an
  // einer eigenen Uhr. Sie ist bewusst klein: sie verdreht das eingebackene
  // Licht um genau ihren Betrag, und bei einem weichen Terminator bleibt das
  // bis etwa 40 Grad unsichtbar. Wer sie erhöht, lässt die Sonne wandern.
  if (turnEl.value) {
    const licht = drifterLightAngleDeg(punkt.x, punkt.y, window.innerWidth, window.innerHeight)
    const spin = reducedMotion?.matches
      ? 0
      : s.lane * LANDFALL_SPIN_PHASE_DEG + Math.min(1, Math.max(0, t)) * LANDFALL_SPIN_TURN_DEG
    const q = LANDFALL_SPIN_QUANTIZE_DEG
    turnEl.value.style.transform = `rotate(${Math.round((licht + spin) / q) * q}deg)`
  }

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
      if (!vorher) {
        abeamSeq.value = 0
        // Nur der seltenste Ort meldet sich an.
        heralded.value = stage.value.herald ? heralded.value + 1 : 0
      }
      return
    }
    if (!lastLive) return
    // Geschlossen: der letzte Eintrag der Ergebnisreihe sagt, was daraus wurde.
    const letzte = galaxyStore.landfallResults[galaxyStore.landfallResults.length - 1]
    const now = gameNow()
    exitT = lastLive.windowMs > 0 ? Math.min(1, (now - lastLive.openedAt) / lastLive.windowMs) : 1
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
    void nextTick(() => {
      mountSprite()
      render()
    })
  },
  { immediate: true },
)

// Ein Fensterziehen ändert die Kantenlänge und damit den Sprite-Schlüssel; ein
// Wechsel des Ortes das Motiv. Beides ist selten und darf neu rastern.
watch([() => shown.value?.kind, bodyPx], () => {
  if (shown.value) void nextTick(mountSprite)
})

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

/* Ein 0x0-Punkt; alles Sichtbare hängt zentriert daran. Er trägt die
   Frame-Deckkraft (Parallaxe, Abgang) — der ZUSTAND sitzt eine Ebene tiefer. */
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

/* Versäumt: dieselbe Zahl, mit der die Marke später auf dem Galaxiebild steht.
   Sie sitzt auf der SKALEN-Ebene, nicht auf den Kindern: `.lfb-shell` schreibt
   seine Deckkraft pro Frame, eine zweite Quelle dort liefe auseinander. */
.lfb-shell--missed .lfb-scale {
  opacity: 0.4;
}

/* Der Körper. Grösser als die Kante, weil nicht jedes Motiv an seiner
   Kernkontur endet — der Trümmerschwarm streut, die Wolke hat gar keine. */
.lfb-turn {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--lfb-span);
  height: var(--lfb-span);
  margin-top: calc(var(--lfb-span) / -2);
  margin-left: calc(var(--lfb-span) / -2);
  will-change: transform;
  pointer-events: none;
}

/* Albedo und Lampe teilen die Geometrie des Turns — nur so trifft die Lampe in
   jeder Drehlage ihren Rumpf. */
.lfb-albedo,
.lfb-beacon {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Das Sprite-Canvas hängt direkt darin und füllt es ganz. */
.lfb-albedo :deep(canvas),
.lfb-beacon :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

/* Das Notsignal — die einzige eigene Lichtquelle unter allen sechs Körpern.
   Es liegt in derselben Geometrie wie der Rumpf und dreht deshalb mit ihm. */
.lfb-beacon {
  animation: lfb-blink v-bind(beaconMs) ease-in-out infinite;
}

/* Staubschleier. Statischer Verlauf, animiert wird nur die Deckkraft —
   Performance-Regel 2. Die zweite Ebene atmet auf VERSETZTEM Takt, sonst liest
   sich der Schleier als ein flacher Ring.

   Er ist HOHL und läuft weich aus: als gefüllte Scheibe mit Kante bei 72 %
   stand im Bild gemessen eine Blase um den Körper. Staub liegt UM einen Körper,
   nicht vor ihm — und wo der Körper ist, hat der Schleier nichts zu suchen. */
.lfb-veil {
  position: absolute;
  top: -34%;
  left: -34%;
  width: 168%;
  height: 168%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 0%,
    transparent 30%,
    rgba(150, 142, 128, 0.15) 50%,
    rgba(150, 142, 128, 0.06) 68%,
    transparent 90%
  );
  opacity: var(--lfb-veil-alpha);
  animation: lfb-breathe v-bind(veilMs) ease-in-out infinite;
  pointer-events: none;
}

.lfb-veil--late {
  top: -52%;
  left: -52%;
  width: 204%;
  height: 204%;
  animation-delay: v-bind(veilOffset);
}

.lfb-shell--missed .lfb-veil {
  animation: none;
  opacity: 0.16;
}

/* Weit weg trägt kein Zierrat. `display: none` und nicht `opacity: 0`: nur so
   friert Blink die Animation ein und rechnet gar nichts mehr. Zwei Umschläge je
   Vorbeiflug — der Körper wird zur Mitte hin gross und danach wieder klein. */
.lfb-shell--tiny .lfb-veil,
.lfb-shell--tiny .lfb-motes {
  display: none;
}

/* Begleitsplitter. EINE rotierende Ebene für alle — jeder Splitter steht per
   statischem transform darin und kostet keinen eigenen Frame-Wert. */
.lfb-motes {
  position: absolute;
  inset: 0;
  animation: lfb-orbit v-bind(moteMs) linear infinite;
  pointer-events: none;
}

.lfb-mote {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3.5%;
  height: 3.5%;
  margin: -1.75% 0 0 -1.75%;
  border-radius: 50%;
  background: rgba(196, 188, 172, 0.7);
}

/* Die Griffe: kurze Striche auf einem eigenen Kreis um den Körper. */
.lfb-ticks {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.lfb-tick {
  fill: none;
  stroke: #6f7a76;
  stroke-width: 3;
  stroke-linecap: round;
  opacity: 0.5;
}

/* LANDFALL_ACCENT_HEX — das blasse Seegrün bleibt ZUSTANDSfarbe. Der Körper
   trägt seine eigene, stoffliche. */
.lfb-tick--on {
  stroke: #8fbfae;
  stroke-width: 4.2;
  opacity: 1;
}

.lfb-shell--cleared .lfb-tick--on {
  stroke: #cfe6dd;
}

/* Querab: der Ort ist am nächsten, das Fenster halb um. Läuft genau einmal.
   Der Herold gehört allein dem seltensten Ort und läuft beim Auftauchen. */
.lfb-abeam,
.lfb-tap,
.lfb-herald {
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

.lfb-herald {
  background: radial-gradient(
    circle,
    transparent 48%,
    rgba(201, 191, 240, 0.42) 66%,
    transparent 84%
  );
  animation: lfb-ring v-bind(abeamMs) ease-out forwards;
}

/* Eine unrunde Silhouette trifft sich schlechter als eine Scheibe —
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
    opacity: var(--lfb-veil-low);
  }
  50% {
    opacity: var(--lfb-veil-alpha);
  }
}

@keyframes lfb-blink {
  0%,
  62%,
  100% {
    opacity: 0.22;
  }
  72%,
  86% {
    opacity: 1;
  }
}

@keyframes lfb-orbit {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
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
  .lfb-veil,
  .lfb-motes,
  .lfb-beacon {
    animation: none;
  }
  .lfb-beacon {
    opacity: 1;
  }
  .lfb-abeam,
  .lfb-tap,
  .lfb-herald {
    display: none;
  }
  .lfb-hit {
    transition: none;
  }
}
</style>
