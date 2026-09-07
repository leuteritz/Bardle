<script setup lang="ts">
/**
 * Die Karte — VIER Ebenen, und der Schnitt ist der Grund, warum der Reiter auf
 * Grundlast steht.
 *
 * | Ebene | was | malt neu, wenn |
 * | --- | --- | --- |
 * | Grund | Penumbra | Buehne, Pixeldichte oder gezeigte Bahn sich aendern |
 * | Wall | das Filamentgewebe | der Bahnradius sich aendert |
 * | Herz | das beobachtete Universum | seine Kantenstufe sich aendert |
 * | Karte | Bahn, Tore, Koerper | `paintKey` sich aendert |
 *
 * Wall, Herz und Karte DREHEN sich — aber ohne einen einzigen Repaint: es sind
 * fertig gebackene Sprites, die das CSS am Compositor dreht. Verboten ist die
 * Frame-SCHLEIFE, nicht die Bewegung. `paintCount` zaehlt die Karte und muss in
 * Ruhe stehenbleiben.
 *
 * Die KARTE laeuft dabei im Gleichtakt mit dem Herzen — die Bahn liegt IN der
 * Galaxienwolke, nicht darauf, und stillstehende Knoten auf einem drehenden Feld
 * lasen sich als Aufkleber. Der Wall dreht gegen beide. Die Knoten sind deshalb
 * KEINE Baken mehr, sondern Koerper desselben Feldes (`paintNode`).
 *
 * Der Grund liegt AUSSERHALB der fahrenden Ebene: die Penumbra ist der Raum,
 * nicht die Karte — an ihr haengt nichts von Zoom oder Fahrt.
 *
 * Ueber allem liegt je Knoten EIN durchsichtiger Knopf — Hover, Klick, Fokus
 * und Hover-Karte. Die Trefferschleife des Entwurfs (`pick()` ueber alle Knoten
 * je Mausbewegung) entfaellt damit ersatzlos.
 *
 * Zoom faehrt in DREI Stufen statt stufenlos: jede Stufe ist EIN Repaint. Die
 * Fahrt kostet keinen — sie verschiebt nur Sprites. Bedient wird beides mit der
 * Maus: das Rad schaltet die Stufen, ein Doppelklick auf die freie Flaeche holt
 * die ganze Bahn zurueck. Die Buehne traegt kein Bedienelement.
 */
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useUiStore } from '@/stores/core/uiStore'
import { getUniverse } from '@/config/progression/universes'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { universeFitBox } from '@/utils/ui/universeLayout'
import {
  universeOfferPortalSpots,
  universePortalHitBox,
  universePortalLabelSpot,
  universePortalSpot,
} from '@/utils/ui/universePortalSpot'
import { universeDiscSpinSec } from '@/utils/fx/universeDisc'
import {
  universeScreenPos,
  paintUniverse,
  paintUniverseGround,
  paintUniverseWeb,
} from '@/utils/fx/universePlate'
import { toRoman, universeLabel } from '@/utils/ui/format'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import UniverseGalaxyTip from './UniverseGalaxyTip.vue'
import UniverseOriginTip from './UniverseOriginTip.vue'
import UniversePortal from './UniversePortal.vue'
import UniverseDepartureTip from './UniverseDepartureTip.vue'
import UniverseDisc from './UniverseDisc.vue'
import {
  UNIVERSE_MAP_DIVE_ARRIVE_MS,
  UNIVERSE_MAP_DIVE_EASE_ARRIVE,
  UNIVERSE_MAP_DIVE_EASE_LEAVE,
  UNIVERSE_MAP_DIVE_LEAVE_MS,
  UNIVERSE_MAP_DIVE_SCALE,
  UNIVERSE_MAP_FREED_COLOR,
  UNIVERSE_MAP_GATE_COLOR,
  UNIVERSE_MAP_LABEL_MAX_NODES,
  UNIVERSE_MAP_MAX_BACKING_PX,
  UNIVERSE_MAP_MAX_DPR,
  UNIVERSE_MAP_NODE_HIT_BODY_K,
  UNIVERSE_MAP_NODE_HIT_MIN,
  UNIVERSE_MAP_PLATE_REF_R,
  UNIVERSE_MAP_PLATE_SPRITE_MARGIN,
  UNIVERSE_MAP_START_LABEL_MAX_PX,
  UNIVERSE_MAP_START_LABEL_MIN_PX,
  UNIVERSE_MAP_START_LABEL_OFFSET,
  UNIVERSE_MAP_START_LABEL_PX,
  UNIVERSE_MAP_START_TICK_PX,
  UNIVERSE_MAP_RIM_SPIN_REVERSE,
  UNIVERSE_MAP_RIM_SPRITE_MARGIN,
  UNIVERSE_MAP_PENUMBRA_SEED,
  UNIVERSE_MAP_WALL_MAX_BACKING_PX,
  UNIVERSE_MAP_UNLIT_COLOR,
  UNIVERSE_MAP_ZOOM_STEPS,
  UNIVERSE_DISC_HERO_MIN_PX,
  UNIVERSE_DISC_HERO_OPACITY,
  UNIVERSE_DISC_HERO_QUANT_PX,
  UNIVERSE_DISC_HERO_R_RATIO,
} from '@/config/constants'
import type { UniverseDeparture, UniverseNode } from '@/utils/ui/universeLayout'
import type { UniverseDiveRequest, UniverseSelection } from '@/types'
import type { PrestigeOfferCard } from '@/stores/progression/providenceStore'
import UniverseOfferTip from './UniverseOfferTip.vue'

const props = defineProps<{
  nodes: UniverseNode[]
  departure: UniverseDeparture | null
  /** Die Karten des Aufbruchs — je eine wird zu einem Portal im schwarzen Raum.
   *  Leer auf jeder Bahn, auf der nichts ansteht; die VERGANGENE bekommt nie
   *  welche, sie traegt ihr Abflugportal. */
  offers: PrestigeOfferCard[]
  selection: UniverseSelection
  visible: boolean
  /** Rueckweg aus dem Atlas als Kamerafahrt: die Ebene setzt sich aus dem
   *  Knoten der genannten Galaxie heraus. `null` = keine Fahrt. */
  arriving: number | null
}>()

const emit = defineEmits<{
  (e: 'select', value: UniverseSelection): void
  (e: 'open', galaxy: number): void
  (e: 'dive', req: UniverseDiveRequest): void
}>()

const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
const uiStore = useUiStore()
const { completedGalaxies } = storeToRefs(galaxyStore)

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const groundEl = ref<HTMLCanvasElement | null>(null)
const rimEl = ref<HTMLCanvasElement | null>(null)
const cssW = ref(0)
const cssH = ref(0)
const dprNow = ref(1)

/** Zaehlt die Repaints. Der Playwright-Lauf liest das: bleibt die Zahl in Ruhe
 *  stehen, laeuft keine Frame-Schleife. */
const paintCount = ref(0)

// ── Zoom und Fahrt ──────────────────────────────────────────────────────────
const zoomStep = ref(0)
const pan = ref({ x: 0, y: 0 })
/** Waehrend des Ziehens: reine Compositor-Fahrt, noch nicht im `paintKey`. */
const drag = ref({ x: 0, y: 0 })
const dragging = ref(false)
/** Die laufende Kamerafahrt — siehe „Die Kamerafahrt" unten. */
const dive = ref<{ ox: number; oy: number; way: 'leave' | 'arrive' } | null>(null)

const zoom = computed(() => UNIVERSE_MAP_ZOOM_STEPS[zoomStep.value] ?? 1)
const canPan = computed(() => zoomStep.value > 0)

const box = computed(() => {
  const fit = universeFitBox(cssW.value, cssH.value)
  return { cx: fit.cx + pan.value.x, cy: fit.cy + pan.value.y, r: fit.r * zoom.value }
})

/**
 * Wie weit die Fahrt reichen darf.
 *
 * Nur so weit, dass der Rand der vergroesserten Scheibe die Buehnenkante
 * erreicht — nicht weiter. Ohne den Riegel schiebt ein Zug die ganze Bahn ins
 * Nichts, und der Spieler steht vor einem leeren Sternfeld ohne Hinweis, wohin
 * zurueck. Bei Zoomstufe 1 ist die Reichweite null, dort steht ohnehin alles im
 * Bild.
 */
function panLimit(): { x: number; y: number } {
  const r = universeFitBox(cssW.value, cssH.value).r * zoom.value
  return {
    x: Math.max(0, r - cssW.value / 2),
    y: Math.max(0, r - cssH.value / 2),
  }
}

function clampPan(x: number, y: number): { x: number; y: number } {
  const lim = panLimit()
  return {
    x: Math.min(lim.x, Math.max(-lim.x, x)),
    y: Math.min(lim.y, Math.max(-lim.y, y)),
  }
}

/**
 * Das Rad schaltet die STUFEN, und es zoomt auf den Punkt unter dem Zeiger.
 *
 * Stufenlos malte die Platte je Radtick neu — `plateSide` haengt an `box.r` und
 * steht im `paintKey`. Ohne den Fixpunkt wanderte der betrachtete Ausschnitt bei
 * jedem Schritt weg; die Klemmung kommt deshalb zuletzt, umgekehrt zoege sie den
 * Fixpunkt mit und das Bild verschoebe sich doppelt (Muster: `ForgeTreePanel`).
 */
function onWheel(e: WheelEvent) {
  const el = stage.value
  if (!el || dive.value) return
  const next = Math.min(
    UNIVERSE_MAP_ZOOM_STEPS.length - 1,
    Math.max(0, zoomStep.value + (e.deltaY < 0 ? 1 : -1)),
  )
  if (next === zoomStep.value) return

  const rect = el.getBoundingClientRect()
  const fit = universeFitBox(cssW.value, cssH.value)
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const nx = (mx - (fit.cx + pan.value.x)) / (fit.r * zoom.value)
  const ny = (my - (fit.cy + pan.value.y)) / (fit.r * zoom.value)
  const after = fit.r * UNIVERSE_MAP_ZOOM_STEPS[next]

  zoomStep.value = next
  // Herauszoomen zieht die Fahrt mit zurueck in ihre neue, engere Reichweite.
  pan.value =
    next === 0 ? { x: 0, y: 0 } : clampPan(mx - nx * after - fit.cx, my - ny * after - fit.cy)
}

function recenter() {
  zoomStep.value = 0
  pan.value = { x: 0, y: 0 }
  drag.value = { x: 0, y: 0 }
}

/** Zurueck zur ganzen Bahn. Auf einem Knopf gehoert der Klick dem Knoten bzw.
 *  dem Portal — dort waere ein Reset die zweite Wirkung derselben Geste. */
function onDblClick(e: MouseEvent) {
  if (dive.value || (e.target as HTMLElement).closest('button')) return
  recenter()
}

function onPointerDown(e: PointerEvent) {
  if (!canPan.value || e.button !== 0 || dive.value) return
  const sx = e.clientX
  const sy = e.clientY
  dragging.value = true
  let moved = false

  const move = (ev: PointerEvent) => {
    drag.value = { x: ev.clientX - sx, y: ev.clientY - sy }
    if (Math.hypot(drag.value.x, drag.value.y) > 3) moved = true
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    dragging.value = false
    // KEIN Repaint: die Karte ist ein Sprite um ihre eigene Mitte, die Fahrt
    // verschiebt es nur.
    if (moved) pan.value = clampPan(pan.value.x + drag.value.x, pan.value.y + drag.value.y)
    drag.value = { x: 0, y: 0 }
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// ── Knoten ──────────────────────────────────────────────────────────────────
/**
 * Ob JEDER Knoten seine Ziffer dauerhaft traegt. Bei vielen Knoten waere das
 * Filz — dann kommt sie beim Ueberfahren und an der Auswahl. Sie haengt am DOM,
 * nicht am Canvas: so kostet ein Hover keinen Repaint, und es gibt den Text nur
 * einmal statt zweimal.
 */
const showLabels = computed(() => props.nodes.length <= UNIVERSE_MAP_LABEL_MAX_NODES)

const marks = computed(() =>
  props.nodes.map((node, i) => {
    const p = universeScreenPos(box.value, node.nx, node.ny)
    return {
      node,
      index: i,
      x: p.x,
      y: p.y,
      size: Math.max(
        UNIVERSE_MAP_NODE_HIT_MIN,
        node.bodyR * (box.value.r / UNIVERSE_MAP_PLATE_REF_R) * UNIVERSE_MAP_NODE_HIT_BODY_K,
      ),
      picked: props.selection.galaxy === node.galaxy,
      accent:
        node.state === 'unlit' || node.themeIndex < 0
          ? UNIVERSE_MAP_UNLIT_COLOR
          : `rgb(${minimapAccentForTheme(node.themeIndex, props.selection.universe)})`,
    }
  }),
)

/** Ob die gezeigte Bahn die eigene ist — sonst behauptete die Wolke „hier bin
 *  ich" ueber einer vergangenen. */
const isHere = computed(() => props.selection.universe === gameStore.currentUniverse)

/** Der Ton der gezeigten Bahn: Wolke, Wall und Glutringe sprechen ihn gemeinsam,
 *  die Zustandsfarben der Marken bleiben davon unberuehrt. */
const viewTint = computed(
  () => getUniverse(props.selection.universe)?.tint ?? UNIVERSE_MAP_UNLIT_COLOR,
)

/** Wo das Abflugportal steht. Es kennt weder Zoom noch Fahrt — sonst malte der
 *  Reiter bei jedem Zoomschritt ein Sprite neu, das sich nicht bewegt hat. */
const portalSpot = computed(() =>
  props.departure ? universePortalSpot(props.selection.universe, cssW.value, cssH.value) : null,
)

/** Der Ton des ZIELS, nicht der gezeigten Bahn: Wall und Wolke sprechen deren
 *  Ton schon, und ein Portal in der Farbe der Wand, jenseits derer es steht,
 *  sagt nicht „woanders hin". */
const portalTint = computed(
  () => getUniverse(props.departure?.toUniverse ?? 0)?.tint ?? UNIVERSE_MAP_GATE_COLOR,
)

/** Wohin das Portal fuehrt — als Schrift neben dem Ring, nicht erst im Hover.
 *  Die Seite sucht sich die Rechnung selbst; sie kennt Zoom und Fahrt genauso
 *  wenig wie die Stelle des Rings. */
const portalLabel = computed(() =>
  portalSpot.value ? universePortalLabelSpot(portalSpot.value, cssW.value, cssH.value) : null,
)

/** Ring UND Beschriftung als EIN Rechteck: es ist die Trefferflaeche und
 *  zugleich der Anker der Hover-Karte, die sonst auf der Beschriftung aufginge. */
const portalHit = computed(() =>
  portalSpot.value && portalLabel.value
    ? universePortalHitBox(portalSpot.value, portalLabel.value, cssW.value, cssH.value)
    : null,
)

const portalHitStyle = computed(() => {
  const b = portalHit.value
  if (!b) return undefined
  return {
    left: `${b.x0}px`,
    top: `${b.y0}px`,
    width: `${b.x1 - b.x0}px`,
    height: `${b.y1 - b.y0}px`,
  }
})

/* Die Lage kommt als Versatz zur ECKE der Trefferflaeche — die ist seit dem
   Rechteck der Bezugspunkt, an dem das Label haengt. */
const portalLabelStyle = computed(() => {
  const l = portalLabel.value
  const b = portalHit.value
  if (!l || !b) return undefined
  return {
    left: `${l.cx - b.x0}px`,
    top: `${l.cy - b.y0}px`,
    width: `${l.w}px`,
    height: `${l.h}px`,
    fontSize: `${l.size}px`,
    '--un-portal-tint': portalTint.value,
  }
})


// ── Die Angebotsportale ─────────────────────────────────────────────────────
/**
 * Die DREI Wege, die offenstehen, wenn das Universum gerettet ist.
 *
 * Sie stehen im selben schwarzen Raum wie das Abflugportal und nach denselben
 * Regeln — nur eben zu dritt, und deshalb kleiner und mit einem gegenseitigen
 * Abstand. Weder Zoom noch Fahrt gehen ein: was die Rechnung nicht sieht, kann
 * keinen Repaint ausloesen.
 *
 * Die Zeitform trennt sie vom Abflugportal, nicht eine Fallunterscheidung:
 * `buildDeparture` gibt auf der LAUFENDEN Bahn immer `null`, ein Angebot gibt
 * es nur DORT. Auf einer Bahn steht damit immer genau eine Art Portal.
 */
const offerSpots = computed(() =>
  props.offers.length
    ? universeOfferPortalSpots(
        props.selection.universe,
        props.offers.map((o) => o.universe.id),
        cssW.value,
        cssH.value,
      )
    : [],
)

/** Ein Portal, fertig zum Zeichnen: Stelle, Beschriftung, Trefferflaeche.
 *  Die Beschriftung weicht dabei den NACHBARN aus — die Kartenscheibe war
 *  bisher die einzige Sperre, jetzt sind es drei mehr. */
const offerMarks = computed(() => {
  const spots = offerSpots.value
  return props.offers.slice(0, spots.length).map((card, i) => {
    const spot = spots[i]
    const label = universePortalLabelSpot(
      spot,
      cssW.value,
      cssH.value,
      spots.filter((_, j) => j !== i),
    )
    const hit = universePortalHitBox(spot, label, cssW.value, cssH.value)
    return {
      card,
      spot,
      label,
      hit,
      tint: getUniverse(card.universe.id)?.tint ?? UNIVERSE_MAP_GATE_COLOR,
    }
  })
})

/** Welches Portal gerade unter dem Zeiger liegt und welches geschaerft ist.
 *
 *  Der Zustand liegt HIER und nicht als `:has`-Regel in der Buehne: der fremde
 *  Vorfahre weckte alle drei zugleich. Die Handler haengen am stillstehenden
 *  Knopf, nicht an einem wandernden Koerper — Chrome liefert bei
 *  transformierten Elementen `mouseover` ohne `mouseout`. */
const hoveredOffer = ref<number | null>(null)

/**
 * Der Klick auf ein Portal — er REIST, sofort.
 *
 * Es war einmal zweistufig (erster Klick schaerft, zweiter reist), als Sicherung
 * gegen einen Fehlklick, der einen ganzen Durchlauf beendet. Zurueckgenommen:
 * ein Portal, das auf den ersten Klick nichts tut, liest sich als kaputt, und
 * die Ansage gehoert ohnehin VOR den Klick — sie steht in der Hover-Karte.
 */
function tapOffer(mark: (typeof offerMarks.value)[number]) {
  const id = mark.card.universe.id
  if (gameStore.isHyperspaceActive) return
  const rect = stage.value?.getBoundingClientRect()
  gameStore.travelToUniverse(
    id,
    rect ? { x: rect.left + mark.spot.x, y: rect.top + mark.spot.y } : undefined,
  )
  // Bei reduzierter Bewegung ist der Reset schon durch — nichts anzufliegen.
  if (gameStore.isHyperspaceActive) departingUniverse.value = id
}

/** Das Portal, das gerade angeflogen wird; die Buehne faellt dahinter weg. */
const departingUniverse = ref<number | null>(null)
watch(
  () => uiStore.universeHop,
  (hop) => {
    if (!hop) departingUniverse.value = null
  },
)

/* Nach dem Aufbruch steht man auf einer neuen Bahn — der Zeiger haengt dann
   ueber einem Portal, das es nicht mehr gibt. */
watch(
  () => props.offers.map((o) => o.universe.id).join(','),
  () => {
    hoveredOffer.value = null
  },
)

defineExpose({ paintCount })

/**
 * Der Startpunkt — die Benennung des Ursprungs, an dem die Bahn ansetzt.
 *
 * Er haengt am DOM wie die roemischen Ziffern: ein Hover auf dem Canvas kostete
 * einen Repaint der ganzen Platte, und den Text gaebe es zweimal. Er liegt in
 * `.un-layer`, faehrt also mit und waechst ueber `box.r` mit dem Zoom.
 *
 * Unter der Mitte ist Platz: `universeSpots` haelt das Feld dort frei.
 */
const startMark = computed(() => {
  const k = box.value.r / UNIVERSE_MAP_PLATE_REF_R
  return {
    x: box.value.cx,
    y: box.value.cy + box.value.r * UNIVERSE_MAP_START_LABEL_OFFSET,
    size: Math.min(
      UNIVERSE_MAP_START_LABEL_MAX_PX,
      Math.max(UNIVERSE_MAP_START_LABEL_MIN_PX, UNIVERSE_MAP_START_LABEL_PX * k),
    ),
    tick: UNIVERSE_MAP_START_TICK_PX * k,
  }
})

/**
 * Das beobachtete Universum — es FUELLT die Kartenscheibe.
 *
 * Ihre Kante haengt am Bahnradius, ist aber GESTUFT: `px` steht im
 * Sprite-Schluessel, und ein stufenlos mitlaufender Wert riebe bei jedem
 * Resize-Frame ein neues Sprite. Gedeckelt wird die Rasterflaeche, nicht die
 * Kante (`UNIVERSE_DISC_CLOUD_MAX_BACKING_PX`) — ein Kantendeckel machte sie auf
 * grossen Buehnen wieder zum Fleck in der Mitte.
 */
const heroPx = computed(() => {
  const raw = 2 * box.value.r * UNIVERSE_DISC_HERO_R_RATIO
  const stepped = Math.round(raw / UNIVERSE_DISC_HERO_QUANT_PX) * UNIVERSE_DISC_HERO_QUANT_PX
  return Math.max(UNIVERSE_DISC_HERO_MIN_PX, stepped)
})

/** Kante des Wall-Sprites. Quadratisch, die Mitte ist der Drehpunkt. */
const rimSide = computed(() =>
  Math.max(1, Math.round(box.value.r * 2 * UNIVERSE_MAP_RIM_SPRITE_MARGIN)),
)

/**
 * Kante des Karten-Sprites — dieselbe Bauart wie der Wall.
 *
 * Die Karte dreht mit der Wolke. Buehnenfuellend schwenkte dabei alles, was bei
 * Zoom und Fahrt ausserhalb der Buehne liegt, als LEERE Flaeche ins Bild: die
 * Knoepfe stuenden da, ihre Koerper nicht.
 */
const plateSide = computed(() =>
  Math.max(1, Math.round(box.value.r * 2 * UNIVERSE_MAP_PLATE_SPRITE_MARGIN)),
)

/** Die Karte malt in ihre EIGENE Mitte; die Lage besorgt das CSS. */
const plateBox = computed(() => ({
  cx: plateSide.value / 2,
  cy: plateSide.value / 2,
  r: box.value.r,
}))

/* Wall, Wolke und Karte haengen an der Mitte der BAHN, nicht an der der Buehne:
   `box.cx` traegt die Fahrt. Auf `left: 50%` liefen sie nach jedem Zug
   auseinander — und die Bahn liegt jetzt IN der Wolke, dort faellt das sofort
   auf. */
const centerStyle = computed(() => ({
  left: `${box.value.cx}px`,
  top: `${box.value.cy}px`,
}))

/**
 * Die drehende Gruppe — Karte, Knoten und Tore in EINEM `transform`.
 *
 * Die Dauer ist `universeDiscSpinSec(heroPx)`: dieselbe Funktion mit demselben
 * Argument, aus dem `UniverseDisc` die Dauer ihrer NAHEN Ebene zieht. Das IST
 * die Verriegelung — eine eigene Zahl liefe von der Wolke weg. Gedreht wird ein
 * fertiges Sprite am Compositor, `paintCount` ruehrt sich nicht.
 */
const spinStyle = computed(() => ({
  transformOrigin: `${box.value.cx}px ${box.value.cy}px`,
}))

/** EINE Dauer fuer die Gruppe und fuer die Gegendrehung der Schrift darin. */
const spinDur = computed(() => `${universeDiscSpinSec(heroPx.value)}s`)

/* Dieselbe Wurzelregel wie die Scheiben: die Dauer waechst mit der Wurzel des
   Durchmessers. Der Wall ist der groesste Koerper im Reiter und dreht damit von
   selbst am traegsten — die Parallaxe zur Heldenscheibe kostet keine zweite
   Zahl. */
const rimSpinDur = computed(() => `${universeDiscSpinSec(rimSide.value)}s`)
const rimSpinDir = UNIVERSE_MAP_RIM_SPIN_REVERSE ? 'reverse' : 'normal'
const heroOpacity = String(UNIVERSE_DISC_HERO_OPACITY)

// ── Die Kamerafahrt ─────────────────────────────────────────────────────────
/**
 * Hin: die Ebene zoomt in den geklickten Knoten (`leave`). Zurueck: sie setzt
 * sich aus ihm heraus (`arrive`). Der Fahrtpunkt ist die Knopfmitte — der
 * Knopf steht in der drehenden Gruppe, sein Rechteck traegt die Drehung mit.
 * Waehrend der Fahrt ist die Buehne taub: Rad, Doppelklick und Zug wuerden
 * `box` unter der laufenden Animation verschieben.
 */
function nodeCenter(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function pickNode(mark: (typeof marks.value)[number], e: MouseEvent) {
  if (dive.value) return
  const { node, picked, accent } = mark
  // `record` ist der Beleg, dass die Galaxie im Voyages-Atlas liegt — dort sind
  // die Datensaetze genau `completedGalaxies`. Laufende und unbeleuchtete
  // Knoten haben keinen und bleiben eine reine Auswahl.
  if (!node.record) {
    emit('select', { ...props.selection, galaxy: picked ? null : node.galaxy })
    return
  }
  const s = stage.value?.getBoundingClientRect()
  if (!s || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('open', node.galaxy)
    return
  }
  const { x, y } = nodeCenter(e.currentTarget as HTMLElement)
  dive.value = { ox: x - s.left, oy: y - s.top, way: 'leave' }
  emit('dive', { toward: 'atlas', galaxy: node.galaxy, x, y, accent })
}

/* Der Rueckweg: erst das SICHTBARE Universe kennt die Knotenmitte — es meldet
   sie dem Schleier nach, das Licht faellt dorthin. Ohne Knoten (Galaxie nicht
   auf der gezeigten Bahn) faellt nur der Schleier. */
watch(
  () => props.arriving,
  (galaxy) => {
    if (galaxy === null) {
      dive.value = null
      return
    }
    const s = stage.value?.getBoundingClientRect()
    const el = stage.value?.querySelector(`.un-node[data-galaxy="${galaxy}"]`)
    if (!s || !el) return
    const { x, y } = nodeCenter(el)
    dive.value = { ox: x - s.left, oy: y - s.top, way: 'arrive' }
    uiStore.anchorUniverseDive(x, y)
  },
  { flush: 'post' },
)

/** Weiterreisen: das Tor ist die Fortsetzung des Weges, nicht eine zweite
 *  Leiste. So geht man den ganzen Weg der Reihe nach ab. */
function pickDeparture(departure: UniverseDeparture) {
  emit('select', { universe: departure.toUniverse, galaxy: null })
}

// ── Malen ───────────────────────────────────────────────────────────────────
/** Nur LAENGEN und Formzahlen — nie ein Wert, der tickt. Eine Zahl aus dem
 *  Sekundentakt hier malte die ganze Platte jede Sekunde neu.
 *
 *  Die FAHRT steht nicht mehr darin: die Karte malt in ihre eigene Mitte, ein
 *  Zug verschiebt nur noch das Sprite. Panning kostet damit null Repaints. */
const paintKey = computed(
  () =>
    `${props.nodes.length}:${completedGalaxies.value.length}` +
    `:${props.nodes.map((n) => `${n.galaxy}${n.state[0]}${n.rescued}${n.lost}${n.landfalls}`).join(',')}` +
    `|${props.selection.universe}|${props.departure?.toUniverse ?? '-'}` +
    `|${plateSide.value}|${dprNow.value}`,
)

/** Der Grund kennt weder Zoom noch Fahrt — deshalb ein eigener, groberer
 *  Schluessel. Er feuert beim Zoomschritt NICHT; die gezeigte Bahn traegt er
 *  wie der Wall, als NUMMER. */
const groundKey = computed(
  () =>
    `${Math.round(cssW.value)}x${Math.round(cssH.value)}|${dprNow.value}|${props.selection.universe}`,
)

/** Der Wall haengt am Bahnradius — und am Ton der gezeigten Bahn. Die NUMMER,
 *  nicht der Hex-Wert: kuerzer, und sie tickt genauso wenig. */
const rimKey = computed(() => `${rimSide.value}|${dprNow.value}|${props.selection.universe}`)

function backingDpr(w: number, h: number, cap = UNIVERSE_MAP_MAX_BACKING_PX): number {
  return Math.min(window.devicePixelRatio || 1, UNIVERSE_MAP_MAX_DPR, cap / Math.max(w, h))
}

function paintGround() {
  const el = groundEl.value
  const w = Math.round(cssW.value)
  const h = Math.round(cssH.value)
  if (!el || w <= 0 || h <= 0) return
  resetCanvasIfContextLost(el)
  const dpr = backingDpr(w, h)
  el.width = Math.max(1, Math.round(w * dpr))
  el.height = Math.max(1, Math.round(h * dpr))
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  paintUniverseGround(ctx, w, h, UNIVERSE_MAP_PENUMBRA_SEED, props.selection.universe, viewTint.value)
}

function paintRim() {
  const el = rimEl.value
  const side = rimSide.value
  if (!el || side <= 1) return
  resetCanvasIfContextLost(el)
  // Eigener, engerer Deckel: die Ebene ist quadratisch und waechst mit dem
  // Zoom. Bei Zoom 1 greift er nicht.
  const dpr = backingDpr(side, side, UNIVERSE_MAP_WALL_MAX_BACKING_PX)
  el.width = Math.max(1, Math.round(side * dpr))
  el.height = Math.max(1, Math.round(side * dpr))
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const r = box.value.r
  paintUniverseWeb(ctx, side / 2, side / 2, r, r / UNIVERSE_MAP_PLATE_REF_R, viewTint.value)
}

let queued = false
function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    paint()
  })
}

function paint() {
  const el = canvas.value
  const side = plateSide.value
  if (!el || side <= 1) return

  // Das Canvas wird nicht pro Frame gezeichnet — ein von Chrome verworfener
  // Backing-Store bliebe sonst bis zur naechsten Aenderung leer.
  resetCanvasIfContextLost(el)

  const dpr = backingDpr(side, side)
  el.width = Math.max(1, Math.round(side * dpr))
  el.height = Math.max(1, Math.round(side * dpr))
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  paintUniverse(
    ctx,
    props.nodes,
    side,
    side,
    plateBox.value,
    viewTint.value,
    props.selection.universe,
  )
  paintCount.value += 1
}

watch(paintKey, schedule, { flush: 'post' })
watch(groundKey, () => requestAnimationFrame(paintGround), { flush: 'post' })
watch(rimKey, () => requestAnimationFrame(paintRim), { flush: 'post' })

// ── Groesse und Pixeldichte — beide haengen an der SICHTBARKEIT ─────────────
let observer: ResizeObserver | null = null
let dprQuery: MediaQueryList | null = null

function readDpr() {
  const next = window.devicePixelRatio || 1
  if (next !== dprNow.value) dprNow.value = next
  watchDpr()
}

function watchDpr() {
  dprQuery?.removeEventListener('change', readDpr)
  dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
  dprQuery.addEventListener('change', readDpr)
}

function attach() {
  const el = stage.value
  if (!el || observer) return
  observer = new ResizeObserver((entries) => {
    const r = entries[0]?.contentRect
    if (!r || r.width <= 0 || r.height <= 0) return
    cssW.value = r.width
    cssH.value = r.height
  })
  observer.observe(el)
  readDpr()
  // Die beiden Watcher feuern nur auf AENDERUNG; beim Wiedereinblenden steht
  // ihr Schluessel schon richtig, das Canvas aber leer.
  requestAnimationFrame(() => {
    paintGround()
    paintRim()
  })
}

function detach() {
  observer?.disconnect()
  observer = null
  dprQuery?.removeEventListener('change', readDpr)
  dprQuery = null
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) nextTick(attach)
    else {
      detach()
      // `display: none` bricht die Fahrt ab; stehen bliebe sie, spielte sie
      // beim Zurueckkommen von vorn.
      dive.value = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(detach)

// ── Ebene ───────────────────────────────────────────────────────────────────
const layerStyle = computed(() => ({
  transform: `translate3d(${drag.value.x}px, ${drag.value.y}px, 0)`,
  ...(dive.value && {
    transformOrigin: `${dive.value.ox}px ${dive.value.oy}px`,
    '--un-dive-scale': String(UNIVERSE_MAP_DIVE_SCALE),
  }),
}))
const diveLeaveDur = `${UNIVERSE_MAP_DIVE_LEAVE_MS}ms`
const diveArriveDur = `${UNIVERSE_MAP_DIVE_ARRIVE_MS}ms`
const diveEaseLeave = UNIVERSE_MAP_DIVE_EASE_LEAVE
const diveEaseArrive = UNIVERSE_MAP_DIVE_EASE_ARRIVE

</script>

<template>
  <div
    ref="stage"
    class="un-stage"
    :class="{
      'is-pannable': canPan,
      'is-dragging': dragging,
      'is-diving': !!dive,
      'is-departing': departingUniverse !== null,
    }"
    @pointerdown="onPointerDown"
    @wheel.prevent="onWheel"
    @dblclick="onDblClick"
  >
    <!-- Der Raum. Er faehrt NICHT mit: die Bahn wandert durch die Stroemung,
         statt sie mitzuschleppen. -->
    <canvas ref="groundEl" class="un-ground" aria-hidden="true" />

    <!-- Das Abflugportal steht im schwarzen Raum jenseits der Karte. Sein BILD
         liegt AUSSERHALB `.un-layer`: es faehrt nicht mit und waechst nicht mit
         dem Zoom — beim Hineinzoomen schiebt sich die Karte davor. -->
    <UniversePortal
      v-if="portalSpot && departure"
      :spot="portalSpot"
      :seed="selection.universe"
      :target="departure.toUniverse"
      :tint="portalTint"
      :awake="hoveredOffer === -1"
    />

    <!-- Die Angebotsportale der LAUFENDEN Bahn. Dieselbe Schichtung wie oben:
         das BILD vor der fahrenden Ebene, der Knopf dahinter. -->
    <UniversePortal
      v-for="mark in offerMarks"
      :key="mark.card.universe.id"
      :spot="mark.spot"
      :seed="selection.universe"
      :target="mark.card.universe.id"
      :tint="mark.tint"
      :awake="hoveredOffer === mark.card.universe.id || departingUniverse === mark.card.universe.id"
      :departing="departingUniverse === mark.card.universe.id"
    />

    <div class="un-layer" :class="dive && `un-layer--${dive.way}`" :style="layerStyle">
      <!-- Die zwei Ebenen, die sich drehen. Beide sind fertige Sprites; das CSS
           dreht sie am Compositor, kein Repaint. Gegenlaeufig, damit sie nicht
           als EIN Rad zusammenfallen. -->
      <canvas
        ref="rimEl"
        class="un-rim"
        aria-hidden="true"
        :style="{
          ...centerStyle,
          width: `${rimSide}px`,
          height: `${rimSide}px`,
          animationDuration: rimSpinDur,
          animationDirection: rimSpinDir,
        }"
      />
      <UniverseDisc
        class="un-hero"
        variant="cloud"
        :universe="selection.universe"
        :state="isHere ? 'current' : 'walked'"
        :px="heroPx"
        :style="centerStyle"
      />

      <!-- Die Bahn dreht im Gleichtakt mit der Wolke — Karte, Knoten und Tore
           in EINEM `transform` um die Mitte der Bahn. Der Startpunkt bleibt
           draussen: er BENENNT diesen Drehpunkt und kreiste sonst um ihn. -->
      <div class="un-spin" :style="spinStyle">
        <!-- `data-paints` ist der Beleg, nicht Zierrat: der Playwright-Lauf liest
             ihn und darf ihn in Ruhe nicht wachsen sehen. Er wird nur
             geschrieben, wenn ohnehin gemalt wurde. -->
        <canvas
          ref="canvas"
          class="un-canvas"
          :data-paints="paintCount"
          :style="{ ...centerStyle, width: `${plateSide}px`, height: `${plateSide}px` }"
        />

        <!-- Ein Knopf je Knoten. Kein Schein, kein Zierrat — den malt das Canvas
             darunter; hier liegt nur, was auf Zeiger und Tastatur antwortet. -->
        <RpgBadgeTooltip v-for="mark in marks" :key="mark.node.galaxy" passive :accent="mark.accent">
          <button
            class="un-node"
            :class="{
              'is-current': mark.node.state === 'current',
              'is-unlit': mark.node.state === 'unlit',
              'is-picked': mark.picked,
              'is-labelled': showLabels,
              'is-open': !!mark.node.record,
            }"
            :style="{
              left: `${mark.x}px`,
              top: `${mark.y}px`,
              width: `${mark.size}px`,
              height: `${mark.size}px`,
              '--un-node-accent': mark.accent,
            }"
            :data-galaxy="mark.node.galaxy"
            :aria-label="
              mark.node.record
                ? `Galaxy ${toRoman(mark.node.galaxy)} — open in Galaxy`
                : `Galaxy ${toRoman(mark.node.galaxy)}`
            "
            :aria-pressed="mark.node.record ? undefined : mark.picked"
            @click="pickNode(mark, $event)"
          >
            <span class="un-node-ring" aria-hidden="true" />
            <span class="un-node-tag" aria-hidden="true">{{ toRoman(mark.node.galaxy) }}</span>
          </button>
          <template #tip>
            <UniverseGalaxyTip :node="mark.node" :universe="props.selection.universe" />
          </template>
        </RpgBadgeTooltip>
      </div>

      <!-- Der Startpunkt. KEIN Knopf: er fuehrt keine Aktion aus, und „zurueck
           zur Mitte" liegt auf dem Doppelklick der freien Flaeche. Er ist
           trotzdem fokussierbar, damit die Karte auch per Tastatur aufgeht. -->
      <RpgBadgeTooltip passive :accent="UNIVERSE_MAP_FREED_COLOR">
        <div
          class="un-start"
          tabindex="0"
          role="img"
          :aria-label="`Start — where the road begins, ${nodes.length} galaxies on the chain`"
          :style="{
            left: `${startMark.x}px`,
            top: `${startMark.y}px`,
            fontSize: `${startMark.size}px`,
            '--un-start-tick': `${startMark.tick}px`,
          }"
        >
          <span class="un-start-tick" aria-hidden="true" />
          <span class="un-start-word">Start</span>
        </div>
        <template #tip>
          <UniverseOriginTip :nodes="nodes" :universe="selection.universe" />
        </template>
      </RpgBadgeTooltip>
    </div>

    <!-- Die Trefferflaeche des Portals liegt NACH der fahrenden Ebene, also
         ueber der Kartenplatte: die faengt Klicks ueber ihr ganzes Quadrat, und
         in den Ecken reicht das weiter als das Portal steht.
         Nur auf Zoomstufe 0 — darueber waechst die Platte ohnehin darueber und
         das Portal ist nicht mehr zu sehen; ein Knopf auf einem unsichtbaren
         Objekt waere ein Klickkreis mitten auf der Galaxie. -->
    <RpgBadgeTooltip v-if="portalHit && departure && zoomStep === 0" passive :accent="portalTint">
      <button
        class="un-portal-hit"
        :style="portalHitStyle"
        :aria-label="`Departure portal — the road went on to ${universeLabel(departure.toUniverse)}`"
        @pointerdown.stop
        @click="pickDeparture(departure)"
        @pointerenter="hoveredOffer = -1"
        @pointerleave="hoveredOffer = null"
        @focus="hoveredOffer = -1"
        @blur="hoveredOffer = null"
      >
        <!-- Die Beschriftung haengt IM Knopf, nicht daneben: so teilt sie Klick,
             Hover-Karte und die Hover-Pause der drehenden Ebenen mit dem Ring,
             ohne eine zweite Trefferflaeche zu sein. `aria-hidden`, weil der
             Knopf den Namen im Label schon traegt. -->
        <span
          v-if="portalLabel"
          class="un-portal-label"
          :class="`is-${portalLabel.side}`"
          aria-hidden="true"
          :style="portalLabelStyle"
        >
          <span class="un-portal-name">
            Universe
            <span class="un-portal-num">{{ toRoman(departure.toUniverse) }}</span>
          </span>
        </span>
      </button>
      <template #tip>
        <UniverseDepartureTip :departure="departure" :tint="portalTint" />
      </template>
    </RpgBadgeTooltip>

    <!-- Die Knoepfe der Angebotsportale. Wie beim Abflugportal NACH der
         fahrenden Ebene, und nur auf Zoomstufe 0: darueber waechst die Platte
         davor, und ein Knopf auf einem unsichtbaren Objekt ist ein Klickkreis
         mitten auf der Galaxie. -->
    <RpgBadgeTooltip
      v-for="mark in offerMarks"
      v-show="zoomStep === 0"
      :key="`offer-${mark.card.universe.id}`"
      passive
      :accent="mark.tint"
    >
      <button
        class="un-portal-hit"
        :style="{
          left: `${mark.hit.x0}px`,
          top: `${mark.hit.y0}px`,
          width: `${mark.hit.x1 - mark.hit.x0}px`,
          height: `${mark.hit.y1 - mark.hit.y0}px`,
        }"
        :aria-label="`Depart to ${universeLabel(mark.card.universe.id)} under ${mark.card.providence.name}`"
        @pointerdown.stop
        @click="tapOffer(mark)"
        @pointerenter="hoveredOffer = mark.card.universe.id"
        @pointerleave="hoveredOffer = null"
        @focus="hoveredOffer = mark.card.universe.id"
        @blur="hoveredOffer = null"
      >
        <span
          class="un-portal-label"
          :class="`is-${mark.label.side}`"
          aria-hidden="true"
          :style="{
            left: `${mark.label.cx - mark.hit.x0}px`,
            top: `${mark.label.cy - mark.hit.y0}px`,
            width: `${mark.label.w}px`,
            height: `${mark.label.h}px`,
            fontSize: `${mark.label.size}px`,
            '--un-portal-tint': mark.tint,
          }"
        >
          <span class="un-portal-name">
            Universe
            <span class="un-portal-num">{{ toRoman(mark.card.universe.id) }}</span>
          </span>
        </span>
      </button>
      <template #tip>
        <UniverseOfferTip
          :universe="mark.card.universe"
          :providence="mark.card.providence"
          :tint="mark.tint"
        />
      </template>
    </RpgBadgeTooltip>

  </div>
</template>

<style scoped>
.un-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #0b0806;
  /* Die Buehne kennt Doppelklick UND Ziehen — beides markierte sonst Schrift. */
  user-select: none;
}

.un-stage.is-pannable {
  cursor: grab;
}

.un-stage.is-dragging {
  cursor: grabbing;
}

/* Der Raum, unter allem. */
.un-ground {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* Die ganze Ebene faehrt beim Ziehen als EIN transform — Canvas und Knoten
   bleiben dabei zwangslaeufig deckungsgleich. */
/* Auch die fahrende Ebene ist ein RAHMEN und buehnenfuellend: sie traegt die
   Fahrt, keinen Inhalt. Als Trefferziel deckte sie alles ab, was unter ihr
   liegt — das Portal steht dort. Wer hier etwas Klickbares einhaengt, gibt ihm
   `pointer-events: auto`; das Panning laeuft ueber `.un-stage` weiter. */
.un-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* ── Die Kamerafahrt ──────────────────────────────────────────────────────
   Hin zoomt die Ebene in den Knoten, zurueck setzt sie sich aus ihm heraus —
   ein `transform` auf fertigen Sprites, kein Repaint. `translate3d(0,0,0)`
   steht in beiden Keyframes: die Animation ueberstimmt das inline transform,
   und eine Fahrt (`drag`) ist beim Klick immer schon geflusht. */
.un-layer--leave {
  animation: un-dive-leave v-bind(diveLeaveDur) v-bind(diveEaseLeave) forwards;
}
.un-layer--arrive {
  animation: un-dive-arrive v-bind(diveArriveDur) v-bind(diveEaseArrive) forwards;
}
@keyframes un-dive-leave {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(0, 0, 0) scale(var(--un-dive-scale, 1));
  }
}
@keyframes un-dive-arrive {
  from {
    transform: translate3d(0, 0, 0) scale(var(--un-dive-scale, 1));
  }
  to {
    transform: translate3d(0, 0, 0) scale(1);
  }
}

/* Die Kinder holen sich `pointer-events: auto` einzeln zurueck — nur der Stern
   trifft sie alle. */
.un-stage.is-diving,
.un-stage.is-diving * {
  pointer-events: none;
}

/* Mit `pointer-events: none` endet die Hover-Pause, und die Bahn draengte
   unter dem Drehpunkt weg. Also stehen bleiben — der Klick ist die
   Fortsetzung des Ueberfahrens. */
.un-stage.is-diving :is(.un-spin, .un-rim, .un-node-tag) {
  animation-play-state: paused;
}
.un-stage.is-diving :deep(:is(.un-hero .uni-disc-l, .un-portal-l, .un-portal-boost)) {
  animation-play-state: paused;
}

/* Die Portale stehen AUSSERHALB der fahrenden Ebene und blieben sonst scharf
   ueber dem Zoom stehen. Statischer Umschlag, kein Dauerlaeufer. */
.un-stage.is-diving .un-portal-hit,
.un-stage.is-diving :deep(.un-portal) {
  opacity: 0;
  transition: opacity 0.16s ease;
}

/* Der Aufbruch: die Buehne faellt weg, nur das angeflogene Portal bleibt und
   waechst dem Schleier entgegen. Eigener Block neben `.is-diving` — der ist
   per Spec gebunden. Statische Umschlaege, keine neuen Keyframes. */
.un-stage.is-departing,
.un-stage.is-departing * {
  pointer-events: none;
}

.un-stage.is-departing :is(.un-spin, .un-rim, .un-node-tag) {
  animation-play-state: paused;
}

.un-stage.is-departing :is(.un-layer, .un-ground, .un-portal-hit),
.un-stage.is-departing :deep(.un-portal:not(.is-departing)) {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* Wall und Herz. Beide zentriert auf der Mitte der Bahn, beide ohne
   `will-change`: Chrome promotet die laufende Animation ohnehin, und der
   Hinweis legte die Ebene schon beim Mount an — im teuersten Frame des
   Reiters. Dieselbe Begruendung wie in `UniverseDisc.vue`. */
.un-rim,
.un-hero {
  position: absolute;
  pointer-events: none;
}

/* Die Zentrierung steht IM Keyframe: eine Drehung ueberschriebe ein separates
   `transform` sonst. Die Richtung setzt der Aufrufer. */
.un-rim {
  display: block;
  transform: translate(-50%, -50%);
  transform-origin: 50% 50%;
  animation: un-rim-turn 260s linear infinite;
}

@keyframes un-rim-turn {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* Die Heldenscheibe dreht in sich selbst (ihre zwei Ebenen); hier haelt nur die
   Zentrierung. Gedaempft, weil die drei innersten Knoten auf ihr liegen. */
.un-hero {
  transform: translate(-50%, -50%);
  opacity: v-bind(heroOpacity);
}

/* ── Die drehende Gruppe ──────────────────────────────────────────────────
   Karte, Knoten und Tore laufen im Gleichtakt mit dem Galaxienfeld der Wolke:
   die Bahn liegt IN ihr, nicht darauf. Der Drehpunkt ist die Mitte der BAHN
   (`transform-origin` inline), nicht die der Buehne — sonst kreiste die Karte
   nach einer Fahrt um einen fremden Punkt.

   Ein `transform` fuer alles darin, ein fertiges Sprite plus Knoepfe: kein
   Repaint, `paintCount` bleibt stehen. Bewusst OHNE `will-change` — Chrome
   promotet die laufende Animation ohnehin, dieselbe Begruendung wie beim
   Wall. */
/* Die Gruppe ist ein DREHRAHMEN, kein Inhalt — und sie ist buehnenfuellend
   (`inset: 0`). Ohne `pointer-events: none` faengt sie jeden Klick auf der
   ganzen Buehne ab, auch die auf das Portal, das UNTER ihr liegt. Ihre Kinder
   holen sich die Trefferflaeche einzeln zurueck. */
.un-spin {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: un-spin-turn v-bind(spinDur) linear infinite;
}

@keyframes un-spin-turn {
  to {
    transform: rotate(360deg);
  }
}

/* Was Schrift traegt, dreht gegen — sonst stuende die Ziffer nach zwei Minuten
   auf dem Kopf. Der Fixpunkt der Abbildung ist bei beiden genau die
   Bildschirmmitte des Knotens: beim Tor die eigene Mitte, bei der Ziffer ihre
   Unterkante, die auf der Oberkante des Knopfes sitzt. */
@keyframes un-tag-counter {
  from {
    transform: translateX(-50%) rotate(0deg);
  }
  to {
    transform: translateX(-50%) rotate(-360deg);
  }
}


/* Beim Ueberfahren haelt ALLES an — Bahn, Wolke und Wall gemeinsam.
   Am aeusseren Rand wandert ein Knoten mit 7,4 px/s und verlaesst seine
   26-px-Trefferflaeche in 1,75 s: die Hover-Karte risse mitten im Lesen ab.
   Nur die Bahn anzuhalten liesse sie fuer die Dauer des Hoverns aus der Wolke
   herauslaufen. Reines CSS — kein Zustand, kein Re-Render. */
.un-stage:has(
    .un-node:hover,
    .un-node:focus-visible,
    .un-portal-hit:hover,
    .un-portal-hit:focus-visible
  )
  :is(.un-spin, .un-rim, .un-node-tag) {
  animation-play-state: paused;
}

/* Ueber einem KNOTEN haelt auch das Portal an: es wandert dem Zeiger zwar nicht
   davon, aber wenn alles andere steht, ist ein einzeln weiterdrehendes Objekt
   eine sichtbare Inkonsistenz. */
.un-stage:has(.un-node:hover, .un-node:focus-visible)
  :deep(:is(.un-hero .uni-disc-l, .un-portal-l, .un-portal-boost)) {
  animation-play-state: paused;
}

/* Ueber dem PORTAL haelt die Wolke an — das ueberfahrene Portal selbst LEBT.
   Die Pause gibt es, damit ein wandernder Knoten dem Zeiger nicht aus seiner
   Trefferflaeche laeuft; das Portal steht fest, und ein Durchgang, der auf den
   Blick hin anzieht, ist selbst die Auskunft: hier geht es weiter. Was es beim
   Ueberfahren tut, steht in `UniversePortal.vue`. */
.un-stage:has(.un-portal-hit:hover, .un-portal-hit:focus-visible)
  :deep(.un-hero .uni-disc-l) {
  animation-play-state: paused;
}

/* Und die ANDEREN Portale halten mit an. Auf der laufenden Bahn stehen drei
   nebeneinander; sobald eines aufwacht, waeren zwei weiterdrehende Nachbarn
   dieselbe Inkonsistenz wie ein einzeln drehendes Portal ueber einem
   gehoverten Knoten. Ein geschaerftes bleibt davon ausgenommen — es hat eine
   Zusage abgegeben und darf sie zeigen. */
.un-stage:has(.un-portal-hit:hover, .un-portal-hit:focus-visible)
  :deep(.un-portal:not(.is-awake) :is(.un-portal-l, .un-portal-boost)) {
  animation-play-state: paused;
}

/* Die Trefferflaeche des Portals. `@pointerdown.stop` haengt am Element, nicht
   hier: `onPointerDown` sitzt ohne `.self` an der Buehne, und ohne den Stopper
   begaenne jeder Portalklick eine Fahrt. */
/* Zwischen der Karte und den drei Bedienflaechen (4/5): der Knopf muss ueber
   die Platte, aber unter Werkzeugleiste, Legende und Auswahlkarte. */
/* Er ist ein RECHTECK um Ring UND Beschriftung, kein Kreis um den Ring: als
   Kreis ging die Hover-Karte unter ihm auf — also genau auf der Beschriftung —
   und deckte sie zu. Als ein Ziel gehoert auch die Zeile zum Portal. */
.un-portal-hit {
  position: absolute;
  z-index: 3;
  padding: 0;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.un-portal-hit:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}

/* Die Beschriftung. Sie misst GENAU das Kaestchen, gegen das
   `universePortalLabelSpot` geprueft hat — Breite, Hoehe und Schriftgrad
   kommen von dort. Alles darin haengt in `em` daran. */
.un-portal-label {
  position: absolute;
  transform: translate(-50%, -50%);
  line-height: 1.05;
  text-align: center;
  /* Lieber ueberstehen als umbrechen: die Hoehe des Kaestchens ist gemessen und
     steht in der Spec — eine zweite Zeile spraenge sie. Gemessen bleibt der
     laengste Fall („Universe VIII", 5,10 em) unter der Breite. */
  white-space: nowrap;
  pointer-events: none;
}

/* Der Text haengt am Ring, statt von ihm wegzulaufen. */
.un-portal-label.is-left {
  text-align: right;
}

.un-portal-label.is-right {
  text-align: left;
}

.un-portal-name {
  font-size: 1em;
  color: var(--un-portal-tint);
  text-shadow:
    0 0 10px rgba(0, 0, 0, 0.95),
    0 1px 3px rgba(0, 0, 0, 0.95);
  transition: color 0.16s ease;
}

.un-portal-num {
  font-size: 0.78em;
  color: rgba(232, 220, 192, 0.55);
}

/* Statischer Umschlag, kein Dauerlaeufer — die Farbe wechselt einmal. Der
   Ziel-Ton steht als VARIABLE am Kaestchen, nicht als `color` am Namen: inline
   gesetzt braeuchte dieser Hover ein `!important`. */
.un-portal-hit:hover .un-portal-name,
.un-portal-hit:focus-visible .un-portal-name {
  color: #fdf0c4;
}

@media (prefers-reduced-motion: reduce) {
  .un-rim,
  .un-spin,
  .un-node-tag,
  .un-layer--leave,
  .un-layer--arrive {
    animation: none;
  }
}

/* Quadratisches Sprite um die Mitte der Bahn — dieselbe Bauart wie der Wall.
   Buehnenfuellend schwenkte beim Drehen leere Flaeche ins Bild, sobald Zoom
   und Fahrt einen Teil der Karte nach draussen geschoben haben. */
/* Die Platte holt sich die Trefferflaeche zurueck, und das ist Absicht: beim
   Hineinzoomen waechst sie ueber das Portal und verdeckt es dann auch fuer den
   Zeiger. Ohne das laege dort ein unsichtbarer Klickkreis auf der Galaxie. */
.un-canvas {
  position: absolute;
  display: block;
  pointer-events: auto;
  transform: translate(-50%, -50%);
}

/* ── Knoten ───────────────────────────────────────────────────────────── */
/* Der Startpunkt. Er steht auf dem Galaxienfeld der Heldenscheibe — ohne den
   Schatten verschwindet versale Goldschrift dort zwischen den Marken. Die
   Haarlinie bindet ihn an den Kern, den er meint. */
.un-start {
  position: absolute;
  pointer-events: auto;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28em;
  line-height: 1;
  cursor: default;
}

.un-start:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 4px;
}

.un-start-tick {
  width: 1px;
  height: var(--un-start-tick);
  background: linear-gradient(to bottom, rgba(232, 192, 64, 0), rgba(232, 192, 64, 0.7));
  /* Die Linie sitzt UEBER dem Wort und reicht zum Kern hinauf. */
  margin-top: calc(-1 * var(--un-start-tick));
}

.un-start-word {
  color: #e8c040;
  font-size: 1em;
  letter-spacing: 0.34em;
  /* Die Laufweite haengt rechts an — sonst steht das Wort aus der Mitte. */
  text-indent: 0.34em;
  text-transform: uppercase;
  text-shadow:
    0 0 10px rgba(0, 0, 0, 0.95),
    0 1px 3px rgba(0, 0, 0, 0.95);
  transition: color 0.16s ease;
}

.un-start:hover .un-start-word,
.un-start:focus-visible .un-start-word {
  color: #fdf0c4;
}

.un-node {
  position: absolute;
  pointer-events: auto;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.un-node:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}

/* Der Ring ist die EINZIGE Ebene, die der Knoten selbst malt. Ruhend ist er
   unsichtbar; er kostet erst etwas, wenn er etwas sagt. */
.un-node-ring {
  width: 76%;
  height: 76%;
  border-radius: 50%;
  border: 1.4px solid transparent;
}

.un-node:hover .un-node-ring {
  border-color: rgba(232, 220, 192, 0.55);
}

/* Ein befreiter Knoten FUEHRT irgendwohin — sein Hover traegt deshalb die
   Goldkante, die im Spiel „bedienbar" heisst, statt der neutralen. Statischer
   Zustand, kein Keyframe. */
.un-node.is-open:hover .un-node-ring,
.un-node.is-open:focus-visible .un-node-ring {
  border-color: rgba(232, 192, 64, 0.85);
  box-shadow: 0 0 7px rgba(232, 192, 64, 0.35);
}

.un-node.is-picked .un-node-ring {
  border-color: #e8c040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
}

/* Die Ziffer. Ruhend malt sie nichts (`visibility: hidden`), und sie faengt
   den Zeiger nicht ab — der gehoert der Trefferflaeche darunter.

   Der Drehpunkt ist ihre UNTERKANTE: die sitzt auf der Oberkante des Knopfes,
   und damit faellt der Fixpunkt der Gegendrehung genau auf die Mitte des
   Knotens. */
.un-node-tag {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  transform-origin: 50% 100%;
  /* Die Gegendrehung laeuft IMMER, auch ruhend. Erst beim Hover gestartet
     begaenne sie bei Phase null, waehrend die Gruppe laengst weitergedreht ist
     — die Ziffer stuende dann genau schief. Unsichtbar kostet sie nichts: die
     Uhr laeuft, gemalt wird sie nicht. */
  animation: un-tag-counter v-bind(spinDur) linear infinite;
  padding-bottom: 2px;
  font-size: 12px;
  line-height: 1;
  color: #e8dcc0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  pointer-events: none;
  visibility: hidden;
}

.un-node.is-labelled .un-node-tag,
.un-node:hover .un-node-tag,
.un-node:focus-visible .un-node-tag,
.un-node.is-picked .un-node-tag,
.un-node.is-current .un-node-tag {
  visibility: visible;
}

.un-node.is-unlit .un-node-tag {
  color: rgba(160, 146, 114, 0.75);
}

.un-node.is-current .un-node-tag {
  color: #9fe062;
}

.un-node.is-picked .un-node-tag {
  color: #e8c040;
}

/* Der laufende Knoten atmet — eigene Ebene, animiert wird nur ihre `opacity`
   (Compositor, keine Neurasterung). Dasselbe Muster wie `orbit-glow-breathe`. */
.un-node.is-current::after {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  border: 1.6px solid #9fe062;
  box-shadow: 0 0 10px rgba(159, 224, 98, 0.5);
  pointer-events: none;
  animation: un-breathe 2.4s ease-in-out infinite;
}

@keyframes un-breathe {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}
</style>
