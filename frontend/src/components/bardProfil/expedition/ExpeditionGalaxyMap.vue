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
import {
  VOYAGE_MAP_HISTORY_SCALE,
  VOYAGE_MAP_INSET_PX,
  VOYAGE_MAP_MAX_BACKING_PX,
  VOYAGE_MAP_ROUTE_ALPHA,
  VOYAGE_SITE_MOVE_MS,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyagePlacedSite } from '@/types'
import ExpeditionSiteNode from './ExpeditionSiteNode.vue'

const props = defineProps<{
  record: CompletedGalaxyRecord
  sites: VoyagePlacedSite[]
  selectedKey: string | null
  now: number
  /** Der Name, den der Spieler kennt — der Theme-Name der Galaxie. */
  title: string
}>()
const emit = defineEmits<{ select: [string | null] }>()

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

const cssW = ref(0)
const cssH = ref(0)
const dprNow = ref(1)

const box = computed<FitBox>(() => galaxyFitBox(cssW.value, cssH.value, VOYAGE_MAP_INSET_PX))

/** Normalisierte Position → Prozent der BÜHNE, nicht der Fit-Box. */
function pct(x: number, y: number): { left: number; top: number } {
  const b = box.value
  if (cssW.value <= 0 || cssH.value <= 0) return { left: 50, top: 50 }
  return {
    left: ((b.x + x * b.w) / cssW.value) * 100,
    top: ((b.y + y * b.h) / cssH.value) * 100,
  }
}

const corePos = computed(() => pct(0.5, 0.5))

const rescued = computed(() => props.record.attemptResults.filter((r) => r === 'rescued').length)

// ── Malen ───────────────────────────────────────────────────────────────────
/** Zählt die Repaints — der Playwright-Lauf liest das, siehe docs/playwright.md. */
const paintCount = ref(0)

const paintKey = computed(
  () =>
    `${props.record.galaxy}:${props.record.mapSeed}:${props.record.attemptResults.length}:${props.record.themeIndex}` +
    `|${Math.round(cssW.value)}x${Math.round(cssH.value)}|${dprNow.value}`,
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

  paintGalaxy(ctx, props.record, w, h, galaxyFitBox(w, h, VOYAGE_MAP_INSET_PX), {
    markers: 'bodies',
    dpr,
    routeAlpha: VOYAGE_MAP_ROUTE_ALPHA,
    historyScale: VOYAGE_MAP_HISTORY_SCALE,
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

defineExpose({ paintCount, box, cssW, cssH })
</script>

<template>
  <div
    ref="stage"
    class="egm"
    role="group"
    :aria-label="`${title} — voyage chart`"
    :style="{ '--sn-move': `${VOYAGE_SITE_MOVE_MS}ms` }"
    @click="emit('select', null)"
  >
    <canvas ref="canvas" class="egm-plate" aria-hidden="true" />

    <div class="egm-nodes">
      <!-- Der befreite Kern: die Plakette benennt den Ort, sie ist nichts,
           das man anfassen kann. -->
      <div
        class="egm-plaque"
        :style="{ left: `${corePos.left}%`, top: `${corePos.top}%` }"
        aria-hidden="true"
      >
        <span class="egm-plaque-name">{{ title }}</span>
        <span class="egm-plaque-sub">
          freed · {{ rescued }}/{{ record.attemptResults.length }} stars
        </span>
      </div>

      <ExpeditionSiteNode
        v-for="site in sites"
        :key="site.pinKey"
        :site="site"
        :left="pct(site.x, site.y).left"
        :top="pct(site.x, site.y).top"
        :now="now"
        :selected="selectedKey === site.pinKey"
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
.egm-nodes :deep(.sn) {
  pointer-events: auto;
}

.egm-plaque {
  position: absolute;
  transform: translate(-50%, calc(-50% + 34px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}
.egm-plaque-name {
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 15px;
  letter-spacing: 0.06em;
  color: #e8c040;
  text-shadow: 0 1px 4px #000;
}
.egm-plaque-sub {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
  text-shadow: 0 1px 3px #000;
  font-variant-numeric: tabular-nums;
}

.egm-quiet {
  position: absolute;
  left: 50%;
  bottom: 14px;
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
