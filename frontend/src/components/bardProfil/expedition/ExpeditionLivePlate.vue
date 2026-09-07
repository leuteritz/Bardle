<script setup lang="ts">
/**
 * Die Platte der Live-Bühne — dieselbe Zeichenreihenfolge wie der Atlas.
 *
 * Sie zeigt die LAUFENDE Galaxie, und zwar als Standbild: gemalt wird nur bei
 * `paintKey`-Wechsel, also wenn ein Stern fällt, ein Ort erledigt ist oder die
 * Bühne ihre Grösse ändert. Was sich bewegt — der Spieler — ist DOM darüber.
 *
 * Ein eigenes Bauteil und keine Prop an `ExpeditionGalaxyMap`: die Bühne ist
 * eine ANSICHT. Sie hat kein Tor, keine Häfen, keine Sternknoten und keine
 * Hover-Karten, und der Atlas müsste dafür zehn Props stubben.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { paintGalaxy, galaxyFitBox, starRoleSignature } from '@/utils/fx/galaxyPlate'
import type { FitBox } from '@/utils/fx/galaxyPlate'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { universeOfRecord } from '@/utils/game/galaxyUniverseBackfill'
import {
  VOYAGE_MAP_HISTORY_SCALE,
  VOYAGE_MAP_INSET_PX,
  VOYAGE_MAP_MAX_BACKING_PX,
  VOYAGE_MAP_ROUTE_ALPHA,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_MIN_H,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

const props = defineProps<{ record: CompletedGalaxyRecord }>()
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const cssW = ref(0)
const cssH = ref(0)
const dprNow = ref(1)
const paintCount = ref(0)

/** Dieselbe Regel wie im Atlas — das Band SCHRUMPFT die Fit-Box, sonst wüchse
 *  die Karte über ihr eigenes Band. */
const bandH = computed(() =>
  cssH.value >= VOYAGE_MAP_STATS_MIN_H && cssW.value > 0 ? VOYAGE_MAP_STATS_BAND_H : 0,
)

const box = computed<FitBox>(() =>
  galaxyFitBox(cssW.value, cssH.value - bandH.value, VOYAGE_MAP_INSET_PX),
)

const paintKey = computed(
  () =>
    `${props.record.galaxy}:${props.record.mapSeed}:${props.record.attemptResults.length}` +
    `:${props.record.landfallResults?.length ?? 0}:${props.record.themeIndex}` +
    `:${universeOfRecord(props.record)}` +
    `:${props.record.incidentResults?.length ?? 0}` +
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

  resetCanvasIfContextLost(el)

  const dpr = Math.min(window.devicePixelRatio || 1, 2, VOYAGE_MAP_MAX_BACKING_PX / Math.max(w, h))
  el.width = Math.max(1, Math.round(w * dpr))
  el.height = Math.max(1, Math.round(h * dpr))
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  // Dieselben Werte wie der Atlas — beim Bühnenwechsel darf das Bild nicht
  // springen. `live` nimmt das Caretaker's Gate heraus und lässt die Reise am
  // letzten besuchten Stern enden: der Kern ist noch nicht befreit.
  paintGalaxy(ctx, props.record, w, h, box.value, {
    dpr,
    routeAlpha: VOYAGE_MAP_ROUTE_ALPHA,
    historyScale: VOYAGE_MAP_HISTORY_SCALE,
    deepField: true,
    live: true,
  })
  paintCount.value += 1
}

watch(paintKey, schedule, { flush: 'post' })

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
    // Gerundet, und 0x0 verworfen — verdeckt meldet der Observer das, und der
    // Schluessel spraenge beim Zurueckkommen zweimal.
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
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
</script>

<template>
  <div ref="stage" class="elp">
    <!-- `data-paints` ist der Beleg: über eine ganze Etappe darf er NICHT
         wachsen — der Spieler wandert im DOM, die Platte steht. -->
    <canvas ref="canvas" class="elp-plate" :data-paints="paintCount" aria-hidden="true" />
    <slot :box="box" :width="cssW" :height="cssH" :band-h="bandH" />
  </div>
</template>

<style scoped>
.elp {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #0b0806;
  contain: layout paint;
}

.elp-plate {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
