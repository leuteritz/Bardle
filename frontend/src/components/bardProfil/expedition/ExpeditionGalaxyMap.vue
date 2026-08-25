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
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { paintGalaxy, galaxyFitBox, type FitBox } from '@/utils/fx/galaxyPlate'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { voyageGateSizeFor, voyageMarkerSizeFor } from '@/utils/game/voyageSites'
import {
  generateGalaxyDots,
  minimapAccentForTheme,
} from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { toRoman } from '@/utils/ui/format'
import {
  VOYAGE_MAP_HISTORY_SCALE,
  VOYAGE_MAP_INSET_PX,
  VOYAGE_MAP_MAX_BACKING_PX,
  VOYAGE_MAP_ROUTE_ALPHA,
  VOYAGE_SITE_INLINE_CLOCK_PX,
  VOYAGE_SITE_MOVE_MS,
  VOYAGE_MAP_LEGEND_MIN_W,
  VOYAGE_MAP_LEGEND_MIN_H,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_MIN_H,
  VOYAGE_MAP_STATS_MIN_W,
  VOYAGE_MAP_STATS_WIDE_W,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyageHomecoming, VoyagePlacedSite } from '@/types'
import ExpeditionSiteNode from './ExpeditionSiteNode.vue'
import ExpeditionGateNode from './ExpeditionGateNode.vue'
import ExpeditionMapLegend from './ExpeditionMapLegend.vue'
import ExpeditionGalaxyStatsBand from './ExpeditionGalaxyStatsBand.vue'
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
  /** Stufe des Ziels, für das Band oben links. */
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
}>()
const emit = defineEmits<{ select: [string | null] }>()

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
    `${props.record.galaxy}:${props.record.mapSeed}:${props.record.attemptResults.length}:${props.record.themeIndex}` +
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

/** Unter dieser Bühnengrösse ist die Legende Unruhe statt Auskunft. */
const showLegend = computed(
  () => cssW.value >= VOYAGE_MAP_LEGEND_MIN_W && cssH.value >= VOYAGE_MAP_LEGEND_MIN_H,
)

/** Dieselbe Farbe, die `paintGalaxy` dem Kern und den Akzentpartikeln gibt. */
const accent = computed(() => minimapAccentForTheme(props.record.themeIndex))

/** Dieselbe Richtung, in die das Ankunftsportal auf der Karte zeigt. */
const legendHeading = computed(() => {
  const { spawn, dots } = generateGalaxyDots(props.record.mapSeed, 1)
  const d = dots[0] ?? spawn
  return Math.atan2(d.y - spawn.y, d.x - spawn.x)
})

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
    :style="{ '--egm-band-h': `${bandH}px` }"
    :aria-label="`${title} — voyage chart`"
    @click="emit('select', null)"
  >
    <canvas ref="canvas" class="egm-plate" aria-hidden="true" />

    <!-- Das Band sass einmal als Plakette unter dem Kern in der Bildmitte. Mit
         einer Marke, die bis 96 px misst, kollidierte es dort mit dem nächsten
         Hafen — und in der Ecke steht es ohnehin da, wo man eine Kartenlegende
         sucht. -->
    <div class="egm-ribbon" :class="`egm-ribbon--${tier}`" aria-hidden="true">
      <span class="egm-ribbon-no">{{ toRoman(record.galaxy) }}</span>
      <span class="egm-ribbon-text">
        <span class="egm-ribbon-name">{{ title }}</span>
        <span class="egm-ribbon-sub">
          <span class="egm-ribbon-tier">{{ tier }}</span>
        </span>
      </span>
    </div>

    <ExpeditionMapLegend
      v-if="showLegend"
      :dpr="dprNow"
      :heading="legendHeading"
      :accent="accent"
    />

    <ExpeditionGalaxyStatsBand
      v-if="showBand"
      :record="record"
      :compact="cssW < VOYAGE_MAP_STATS_MIN_W"
      :wide="cssW >= VOYAGE_MAP_STATS_WIDE_W"
    />

    <!-- Zwischen Band und Marken: die Legende steht bei gleichem z-index früher
         im Template und läge sonst darüber. -->
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
      <!-- Vor den Häfen: das Tor liegt bei gleichem z-index sonst darüber, und
           ein Vertrag nahe am Kern verschwände unter dem Reifen. -->
      <ExpeditionGateNode
        :left="pct(0.5, 0.5).left"
        :top="pct(0.5, 0.5).top"
        :now="now"
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
        @select="emit('select', $event)"
      />

      <div v-if="!sites.length" class="egm-quiet">
        <Icon icon="game-icons:treasure-map" width="26" height="26" class="egm-quiet-ico" />
        <span class="egm-quiet-title">No contracts bound here</span>
        <span class="egm-quiet-sub">The chart stays — a crew will be called this way again</span>
      </div>
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
.egm-nodes :deep(.sn),
.egm-nodes :deep(.gt) {
  pointer-events: auto;
}

/* ── Das Band oben links ────────────────────────────────────────────────── */
.egm-ribbon {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 13px 7px 9px;
  background: rgba(11, 8, 6, 0.82);
  border: 1px solid #3e200a;
  border-left: 3px solid #c89040;
  border-radius: 4px;
  pointer-events: none;
}
.egm-ribbon--rare {
  border-left-color: #7aa8e0;
}
.egm-ribbon--epic {
  border-left-color: #c090e0;
}
.egm-ribbon-no {
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 22px;
  line-height: 1;
  color: rgba(200, 144, 64, 0.5);
  font-variant-numeric: tabular-nums;
}
.egm-ribbon-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.egm-ribbon-name {
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 17px;
  line-height: 1;
  letter-spacing: 0.04em;
  color: #e8c040;
  white-space: nowrap;
}
.egm-ribbon-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.egm-ribbon-tier {
  color: rgba(200, 144, 64, 0.75);
}
.egm-ribbon--rare .egm-ribbon-tier {
  color: #7aa8e0;
}
.egm-ribbon--epic .egm-ribbon-tier {
  color: #c090e0;
}
.egm-quiet {
  position: absolute;
  left: 50%;
  bottom: calc(var(--egm-band-h, 0px) + 14px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 16px;
  background: rgba(11, 8, 6, 0.82);
  border: 1px solid #3e200a;
  border-radius: 4px;
  text-align: center;
  pointer-events: none;
}
.egm-quiet-ico {
  color: rgba(200, 144, 64, 0.34);
}
.egm-quiet-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
}
.egm-quiet-sub {
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.38);
}
</style>
