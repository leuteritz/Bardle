<script setup lang="ts">
/**
 * Die Bühne: die gewählte Galaxie, in Panelgrösse gemalt, mit den Ankerplätzen
 * als bedienbare Marken darüber.
 *
 * EIN Canvas für alles Unbewegliche — Spiralarme, Kern, geflogene Route, die
 * geretteten und verlorenen Sterne. Es wird nur neu gemalt, wenn sich die
 * Galaxie, die Grösse oder die Pixeldichte ändert; ein ablaufender Vertrag
 * kostet keinen einzigen Partikel. Es gibt hier keine Frame-Schleife.
 *
 * Darüber liegt eine reine Positionsebene ohne Zeigerereignisse, damit der
 * Klick auf den Bühnengrund überall durchkommt ausser auf den Marken selbst.
 *
 * Zwei Overlays teilen sich die Bühne, und sie tun es UNGLEICH: das Datenband
 * am Fuss SCHRUMPFT die Fit-Box (unter ihm liegt keine Marke), die
 * Manifestreihe oben links ÜBERLAGERT sie. Unter der Ecke können deshalb Marken
 * liegen — sie stehen abgedunkelt weiter da, weil die Reihe ein Scrim ist.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  paintGalaxy,
  galaxyFitBox,
  coreGateClearance,
  starRoleSignature,
  starMarkRadius,
  GALAXY_PLATE_REF_W,
  type FitBox,
} from '@/utils/fx/galaxyPlate'
import { landfallMarks } from '@/utils/game/landfalls'
import { incidentMarkRadius, incidentMarks } from '@/utils/game/galaxyIncidents'
import { galaxyStarMarksOf } from '@/utils/game/starNames'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { voyageGateSizeFor, voyageMarkerSizeFor } from '@/utils/game/voyageSites'
import { generateGalaxyDots } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  VOYAGE_MAP_HISTORY_SCALE,
  LANDFALL_MARK_R,
  GALAXY_INCIDENT_MARK_R,
  GALAXY_STAR_MARK_HIT_MIN,
  GALAXY_STAR_MARK_HIT_SCALE,
  VOYAGE_MAP_INSET_PX,
  VOYAGE_MAP_MAX_BACKING_PX,
  VOYAGE_MAP_ROUTE_ALPHA,
  VOYAGE_SITE_INLINE_CLOCK_PX,
  VOYAGE_SITE_MOVE_MS,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_MIN_H,
  VOYAGE_MAP_STATS_MIN_W,
} from '@/config/constants'
import { computeRequired, type CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyageHomecoming, VoyageMarkAction, VoyagePlacedSite } from '@/types'
import ExpeditionSiteNode from './ExpeditionSiteNode.vue'
import ExpeditionGateNode from './ExpeditionGateNode.vue'
import ExpeditionLandfallNode from './ExpeditionLandfallNode.vue'
import ExpeditionIncidentNode from './ExpeditionIncidentNode.vue'
import ExpeditionStarNode from './ExpeditionStarNode.vue'
import ExpeditionPortalNode from './ExpeditionPortalNode.vue'
import ExpeditionGalaxyStatsBand from './ExpeditionGalaxyStatsBand.vue'
import ExpeditionStarManifest from './ExpeditionStarManifest.vue'
import ExpeditionCrewMarkerLayer from './ExpeditionCrewMarkerLayer.vue'

const props = defineProps<{
  record: CompletedGalaxyRecord
  sites: VoyagePlacedSite[]
  selectedKey: string | null
  now: number
  /** Der Name, den der Spieler kennt — der Theme-Name der Galaxie. */
  title: string
  /** Der Reiter bleibt gemountet — die Marker-Schleife hängt daran. */
  visible: boolean
  /** Stufe des Ziels — sie färbt die Kante der Identitätszone im Datenband. */
  tier: 'common' | 'rare' | 'epic'
  /** Zustand des Caretaker's Gate im Kern. */
  gate: {
    crewsOut: number
    waiting: number
    nextReturnAt: number | null
    nextSpanMs: number
    arriving: boolean
  }
  /** Crews auf dem Heimweg — rein darstellend. */
  homecomings: VoyageHomecoming[]
  /** Was ein Klick je Marke tut, nach pinKey. */
  actions: Map<string, VoyageMarkAction>
}>()
const emit = defineEmits<{ select: [string | null]; act: [string] }>()

/** Eine platzierte Marke hat immer einen Eintrag — der Rückfall hält nur den Typ dicht. */
const ACTION_FALLBACK: VoyageMarkAction = { kind: 'waiting', endsAt: 0 }

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

const cssW = ref(0)
const cssH = ref(0)
const dprNow = ref(1)

/**
 * Das Datenband SCHRUMPFT die Fit-Box, statt sich darüberzulegen: Häfen sind
 * anklickbar, und ein Band über die ganze Kante lässt sich nicht wie die
 * Legende unter die Marken schieben. Die Galaxie sitzt damit mittig im freien
 * Feld darüber — `galaxyFitBox` zentriert in dem, was es bekommt.
 */
const showBand = computed(() => cssH.value >= VOYAGE_MAP_STATS_MIN_H && cssW.value > 0)
const bandH = computed(() => (showBand.value ? VOYAGE_MAP_STATS_BAND_H : 0))

const box = computed<FitBox>(() =>
  galaxyFitBox(cssW.value, cssH.value - bandH.value, VOYAGE_MAP_INSET_PX),
)

/** Normalisierte Position → Prozent der BÜHNE, nicht der Fit-Box. */
function pct(x: number, y: number): { left: number; top: number } {
  const b = box.value
  if (cssW.value <= 0 || cssH.value <= 0) return { left: 50, top: 50 }
  return {
    left: ((b.x + x * b.w) / cssW.value) * 100,
    top: ((b.y + y * b.h) / cssH.value) * 100,
  }
}

/**
 * Wie gross ein Hafen auf DIESER Karte sein darf — aus der Enge der gerade
 * gesetzten Plätze, nicht aus einer festen Zahl. Ein computed, kein Frame:
 * er hängt nur an der Box und an der Menge der Häfen.
 *
 * Die Einrückung der Fit-Box (`VOYAGE_MAP_INSET_PX`) muss NICHT mitwachsen, und
 * das ist kein Zufall: `voyageBerthsOf` klemmt jeden Platz auf 0.06..0.94, ein
 * Randhafen steht also `0.06 × box.h + 18` von der Bühnenkante entfernt.
 * `VOYAGE_SITE_MAX_SPAN_FRACTION` (0.12) deckelt die Platte auf ~`0.12 × box.h`,
 * ihre halbe Höhe ist damit immer kleiner als dieser Rand.
 */
const markerSize = computed(() => voyageMarkerSizeFor(props.sites, box.value))

/**
 * Die Fangflächen über den Ortsmarken.
 *
 * Sie malen nichts — die Raute kommt aus dem Canvas. Sie tragen nur den
 * Tooltip, und den brauchen sie, seit die Legende alle sechs Orte als EINE
 * Zeile führt: sechs Silhouetten wären bei 4,4 px nicht zu trennen, also sagt
 * die Karte ohne sie nicht mehr, WELCHER Ort hier lag.
 *
 * Höchstens `LANDFALL_MAX` je Galaxie, also acht durchsichtige Quadrate — das
 * ist billiger als eine Trefferprüfung auf dem Canvas und hält die Auskunft im
 * DOM, wo Fokus und Vorlesen sie finden.
 */
/**
 * Die Geometrie der Historie — EIN Aufruf für alle drei Markenmengen.
 *
 * `generateGalaxyDots` stand vorher INNERHALB von `landfallNodes`; seit Sterne
 * und Portal dieselben Punkte brauchen, liefe die Ableitung sonst dreimal je
 * Neuberechnung. Die Aufrufreihenfolge ihres rng-Stroms bleibt unangetastet —
 * archivierte Galaxien spielen sie nach.
 */
const chart = computed(() => {
  const attempts = props.record.attemptResults.length
  return { attempts, ...generateGalaxyDots(props.record.mapSeed, attempts + 1) }
})

const landfallNodes = computed(() => {
  const results = props.record.landfallResults ?? []
  if (!results.length) return []
  // DIESELBE Sperrzone wie beim Malen — sonst stünde die Fangfläche woanders
  // als die Marke.
  return landfallMarks(
    props.record.mapSeed,
    props.record.galaxy,
    chart.value.spawn,
    chart.value.dots,
    chart.value.attempts,
    results,
    coreGateClearance(box.value, historyHk.value),
  )
})

/**
 * Die Fangflächen über den Ereignismarken — Void-Einschläge und seltene Drifter.
 *
 * DIESELBE Ableitung wie beim Malen, samt derselben belegten Punkte: rechnete
 * eine der beiden Seiten anders, stünde die Fangfläche neben ihrer Marke.
 */
const incidentNodes = computed(() => {
  const results = props.record.incidentResults ?? []
  if (!results.length) return []
  return incidentMarks(
    props.record.mapSeed,
    chart.value.spawn,
    chart.value.dots,
    chart.value.attempts,
    results,
    [...chart.value.dots.slice(0, chart.value.attempts), ...landfallNodes.value],
    coreGateClearance(box.value, historyHk.value),
  )
})

/** Kantenlänge der Fangfläche: sie folgt dem gemalten Zug, wie beim Ort. Der
 *  Rang wächst in die Grösse, also wächst sie mit. */
function incidentHit(rank: number): number {
  return Math.max(
    16,
    Math.round(incidentMarkRadius(rank, GALAXY_INCIDENT_MARK_R * historyHk.value) * 2.4),
  )
}

/** Der Massstab der HISTORIE — dieselbe Zahl, mit der `paintGalaxy` die Marken
 *  malt. Sie steht hier einmal, damit Fangfläche und Sperrzone nicht
 *  auseinanderlaufen. */
const historyHk = computed(
  () => (box.value.w / GALAXY_PLATE_REF_W) * VOYAGE_MAP_HISTORY_SCALE,
)

/** Kantenlänge der Fangfläche: sie folgt der gemalten Marke, wie beim Tor. */
const landfallHit = computed(() =>
  Math.max(16, Math.round(LANDFALL_MARK_R * historyHk.value * 2.4)),
)

/**
 * Die Fangflächen über den Sternmarken.
 *
 * Dieselbe Trennung wie beim Ort: das Canvas malt Ring und Hülle, das DOM trägt
 * die Auskunft. Und die gab es hier bis jetzt überhaupt nicht — ein Stern war
 * auf der Karte nur `'rescued' | 'failed'` plus seine Nummer, die Legende sagt
 * bloss, was die FORM bedeutet.
 *
 * `freedSoFar` läuft mit: die dritte Ablesung zeigt den Stand, wie er in DIESEM
 * Moment der Galaxie war, nicht den Endstand.
 */
const starNodes = computed(() => {
  const marks = galaxyStarMarksOf(props.record.mapSeed, props.record.attemptResults)
  let freed = 0
  return marks.map((mark) => {
    if (mark.outcome !== 'failed') freed += 1
    const dot = chart.value.dots[mark.index]
    // Das Manifest darf fehlen — Altbestand und nachgetragene Galaxien
    // tragen keines, und die Karte fällt dann auf Kopf und Chips zurück.
    const manifest = props.record.starManifests?.[mark.index]
    return { mark, freedSoFar: freed, manifest, x: dot.x, y: dot.y }
  })
})

/**
 * Welcher Stern gerade gezeigt wird — der Knotenpunkt zwischen Manifestreihe
 * und Karte.
 *
 * Der Wert ist der FLUGINDEX (`mark.index` === Index in `attemptResults` ===
 * `seat.index`), nicht die Position in irgendeiner Liste: die Reihe deckelt und
 * hat Luecken. Er lebt hier, weil beide Beteiligten Kinder dieser Karte sind —
 * ein Store waere ein Umweg ueber das halbe Projekt.
 */
const hoveredStar = ref<number | null>(null)

/** Das Sternsoll dieser Galaxie — dieselbe Formel, gegen die das Spiel zählt. */
const starsRequired = computed(() => computeRequired(props.record.galaxy))

const starsFreed = computed(
  () => props.record.attemptResults.filter((r) => r !== 'failed').length,
)
const starsLost = computed(
  () => props.record.attemptResults.filter((r) => r === 'failed').length,
)

/** Kantenlängen der Fangflächen — sie folgen den GEMALTEN Radien aus
 *  `galaxyPlate` (verloren 7, befreit 8.5, Portal 9), wie beim Ort. */
const starHit = computed(() =>
  Math.max(
    GALAXY_STAR_MARK_HIT_MIN,
    Math.round(8.5 * historyHk.value * GALAXY_STAR_MARK_HIT_SCALE),
  ),
)
const portalHit = computed(() =>
  Math.max(
    GALAXY_STAR_MARK_HIT_MIN,
    Math.round(9 * historyHk.value * GALAXY_STAR_MARK_HIT_SCALE),
  ),
)

/**
 * Das Tor misst sich an derselben Platte und wird am nächsten Hafen gedeckelt —
 * ein Reifen, der einen Vertrag zudeckt, nimmt der Karte ihre Handlung.
 */
const gateSize = computed(() => voyageGateSizeFor(props.sites, box.value, markerSize.value))

const nodeVars = computed(() => ({
  '--sn-hit': `${markerSize.value.hit}px`,
  '--sn-plate': `${markerSize.value.plate}px`,
  '--sn-dot': `${markerSize.value.dot}px`,
  '--sn-move': `${VOYAGE_SITE_MOVE_MS}ms`,
  '--gt-size': `${gateSize.value.size}px`,
}))

/** Ab dieser Plattengrösse trägt die Marke ihre Uhr selbst. */
const inlineClock = computed(() => markerSize.value.plate >= VOYAGE_SITE_INLINE_CLOCK_PX)

// ── Malen ───────────────────────────────────────────────────────────────────
/** Zählt die Repaints — der Playwright-Lauf liest das, siehe docs/playwright.md. */
const paintCount = ref(0)

const paintKey = computed(
  () =>
    `${props.record.galaxy}:${props.record.mapSeed}:${props.record.attemptResults.length}` +
    `:${props.record.landfallResults?.length ?? 0}:${props.record.themeIndex}` +
    // Eine Buchung legt eine Marke auf die Karte, ohne dass sich eine der
    // anderen Zahlen rührt.
    `:${props.record.incidentResults?.length ?? 0}` +
    // Die Rollen färben die Sternkerne und werden nachträglich gefüllt — ohne
    // sie malte die Karte nach einem Nachtrag nie wieder neu.
    `:${starRoleSignature(props.record.starManifests)}` +
    `|${Math.round(cssW.value)}x${Math.round(cssH.value)}|${bandH.value}|${dprNow.value}`,
)

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
  const w = Math.round(cssW.value)
  const h = Math.round(cssH.value)
  if (!el || w <= 0 || h <= 0) return

  // Das Canvas wird nicht pro Frame gezeichnet — ein von Chrome verworfener
  // Backing-Store bliebe sonst bis zum nächsten Galaxiewechsel leer.
  resetCanvasIfContextLost(el)

  const dpr = Math.min(
    window.devicePixelRatio || 1,
    2,
    VOYAGE_MAP_MAX_BACKING_PX / Math.max(w, h),
  )
  el.width = Math.max(1, Math.round(w * dpr))
  el.height = Math.max(1, Math.round(h * dpr))
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // Volles w/h fuer den Hintergrund, `box` fuer die Galaxie: das Deep-Field ist
  // Deko und darf hinter dem Band weiterlaufen. `box` und keine zweite Rechnung
  // — der Observer rundet cssW/cssH schon, beide waeren sonst dieselbe Zahl aus
  // zwei Quellen.
  paintGalaxy(ctx, props.record, w, h, box.value, {
    dpr,
    routeAlpha: VOYAGE_MAP_ROUTE_ALPHA,
    historyScale: VOYAGE_MAP_HISTORY_SCALE,
    deepField: true,
  })
  paintCount.value += 1
}

watch(paintKey, schedule, { flush: 'post' })

// ── Grösse und Pixeldichte ──────────────────────────────────────────────────
let observer: ResizeObserver | null = null
let dprQuery: MediaQueryList | null = null

function readDpr() {
  const next = window.devicePixelRatio || 1
  if (next !== dprNow.value) dprNow.value = next
  watchDpr()
}

function watchDpr() {
  dprQuery?.removeEventListener('change', readDpr)
  dprQuery = window.matchMedia(`(resolution: ${dprNow.value}dppx)`)
  dprQuery.addEventListener('change', readDpr)
}

onMounted(() => {
  dprNow.value = window.devicePixelRatio || 1
  watchDpr()
  if (!stage.value) return
  observer = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    // Auf ganze Pixel gerundet: Subpixel-Zittern beim Ziehen malte sonst neu.
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    // Der Reiter haengt an `v-show`; versteckt meldet der Observer 0x0. Wuerde
    // das uebernommen, aendert sich beim Zurueckkommen der Schluessel zweimal
    // und die ganze Platte wird neu gemalt, obwohl der Canvas sie noch traegt.
    if (w <= 0 || h <= 0) return
    if (w === Math.round(cssW.value) && h === Math.round(cssH.value)) return
    cssW.value = w
    cssH.value = h
  })
  observer.observe(stage.value)
  nextTick(schedule)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  dprQuery?.removeEventListener('change', readDpr)
  dprQuery = null
})

defineExpose({ paintCount, box, cssW, cssH, markerSize, gateSize, bandH })
</script>

<template>
  <div
    ref="stage"
    class="egm"
    role="group"
    :aria-label="`${title} — voyage chart`"
    @click="emit('select', null)"
  >
    <!-- `data-paints` ist der Beleg, nicht Zierrat: der Playwright-Lauf liest
         ihn und darf beim Auf- und Zuklappen der Zielliste genau EINEN Zuwachs
         sehen. Steht dort mehr, ist eine Breite in eine Transition geraten. -->
    <canvas ref="canvas" class="egm-plate" :data-paints="paintCount" aria-hidden="true" />

    <!-- Identität UND Bilanz sitzen im Fuss der Bühne. Sie sassen einmal als
         zwei eigene Overlays in den beiden linken Ecken: eine Plakette oben
         (Ziffer, Name, Stufe) und die Formlegende unten. Beide belegten
         dauerhaft Kartenfläche für etwas, das in eine Zeile passt. -->
    <ExpeditionGalaxyStatsBand
      v-if="showBand"
      :record="record"
      :title="title"
      :tier="tier"
      :compact="cssW < VOYAGE_MAP_STATS_MIN_W"
    />

    <!-- Der Zwilling des Bandes in der gegenüberliegenden Ecke: das Band sagt
         WIE VIELE, die Reihe sagt WER. Sie schrumpft die Fit-Box NICHT — unter
         ihr können Marken liegen, deshalb ist sie ein Scrim und kein Kasten.
         Das Tor ist ein DATEN-Tor: Altbestand ohne Manifest führt hier nie
         jemanden, und ein Maßtor greift nachgerechnet auf keiner Breite. -->
    <ExpeditionStarManifest
      v-if="cssW > 0"
      :record="record"
      :width="cssW"
      :highlight="hoveredStar"
      @hover="hoveredStar = $event"
    />

    <ExpeditionCrewMarkerLayer
      :record="record"
      :sites="sites"
      :box="box"
      :width="cssW"
      :height="cssH"
      :plate="markerSize.plate"
      :visible="visible"
      :now="now"
      :gate-exit="gateSize.exit"
      :homecomings="homecomings"
    />

    <div class="egm-nodes" :style="nodeVars">
      <!-- Zuerst die Orte: sie sind die kleinsten Marken, und ein Hafen darüber
           soll den Zeiger bekommen, nicht umgekehrt. -->
      <ExpeditionLandfallNode
        v-for="(m, i) in landfallNodes"
        :key="`lf-${i}`"
        :kind="m.kind"
        :cleared="m.cleared"
        :left="pct(m.x, m.y).left"
        :top="pct(m.x, m.y).top"
        :hit="landfallHit"
      />

      <ExpeditionIncidentNode
        v-for="(m, i) in incidentNodes"
        :key="`in-${i}`"
        :kind="m.kind"
        :def-id="m.id"
        :hp="m.hp"
        :meeps="m.meeps"
        :left="pct(m.x, m.y).left"
        :top="pct(m.x, m.y).top"
        :hit="incidentHit(m.rank)"
      />

      <!-- Dann die Sterne: sie liegen ÜBER den Orten, wie beim Malen. Ein Ort
           ist Beiwerk der Reise, ein Stern ihr Ergebnis — liegen beide eng
           beieinander, soll der Stern den Zeiger bekommen. -->
      <ExpeditionStarNode
        v-for="n in starNodes"
        :key="`st-${n.mark.index}`"
        :mark="n.mark"
        :required="starsRequired"
        :freed-so-far="n.freedSoFar"
        :manifest="n.manifest"
        :left="pct(n.x, n.y).left"
        :top="pct(n.x, n.y).top"
        :hit="starHit"
        :mark-r="starMarkRadius(n.mark.outcome === 'failed', historyHk)"
        :highlight="hoveredStar === n.mark.index"
        @hover="hoveredStar = $event"
      />

      <!-- Das Ankunftsportal am Aussenrand: genau eines je Karte. -->
      <ExpeditionPortalNode
        :destination="title"
        :freed="starsFreed"
        :lost="starsLost"
        :left="pct(chart.spawn.x, chart.spawn.y).left"
        :top="pct(chart.spawn.x, chart.spawn.y).top"
        :hit="portalHit"
      />

      <!-- Vor den Häfen: das Tor liegt bei gleichem z-index sonst darüber, und
           ein Vertrag nahe am Kern verschwände unter dem Reifen. -->
      <ExpeditionGateNode
        :left="pct(0.5, 0.5).left"
        :top="pct(0.5, 0.5).top"
        :now="now"
        :destination="title"
        :crews-out="gate.crewsOut"
        :waiting="gate.waiting"
        :next-return-at="gate.nextReturnAt"
        :next-span-ms="gate.nextSpanMs"
        :arriving="gate.arriving"
        :show-arc="gateSize.showArc"
        @home="emit('select', null)"
      />

      <ExpeditionSiteNode
        v-for="site in sites"
        :key="site.pinKey"
        :site="site"
        :left="pct(site.x, site.y).left"
        :top="pct(site.x, site.y).top"
        :now="now"
        :selected="selectedKey === site.pinKey"
        :inline-clock="inlineClock"
        :action="actions.get(site.pinKey) ?? ACTION_FALLBACK"
        @act="emit('act', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.egm {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #0b0806;
  contain: layout paint;
}

.egm-plate {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* Reine Positionsebene: der Klick auf den Bühnengrund muss überall durchkommen,
   ausser auf den Marken selbst. */
.egm-nodes {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.egm-nodes :deep(.lfn),
.egm-nodes :deep(.stn),
.egm-nodes :deep(.ptn),
.egm-nodes :deep(.sn),
.egm-nodes :deep(.gt) {
  pointer-events: auto;
}
</style>
