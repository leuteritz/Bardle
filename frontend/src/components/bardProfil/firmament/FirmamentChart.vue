<script setup lang="ts">
/**
 * Die Karte — ein STANDBILD mit ein paar Trefferflaechen darueber.
 *
 * Zwei Ebenen, und der Schnitt ist der Grund, warum der Reiter auf Grundlast
 * steht: das Canvas traegt alles Stillstehende (Sternfeld, Wall, Bahn, Tore,
 * Koerper samt Pips und Ortsrauten) und malt nur, wenn `paintKey` sich aendert.
 * Darueber liegt je Knoten EIN durchsichtiger Knopf — Hover, Klick, Fokus und
 * Hover-Karte. Die Trefferschleife des Entwurfs (`pick()` ueber alle Knoten je
 * Mausbewegung) entfaellt damit ersatzlos.
 *
 * Bewegt wird ausschliesslich per CSS und nur `opacity`/`transform`: der
 * Atemring der laufenden Galaxie und der Auswahlring. Keine Frame-Schleife,
 * keine driftende Drehung, kein Komet — beide traegen keine Auskunft und
 * kosteten Dauerlast in einem Reiter, der nie abgerissen wird.
 *
 * Zoom faehrt in DREI Stufen statt stufenlos: jede Stufe ist EIN Repaint. Beim
 * Ziehen faehrt die ganze Ebene per `transform` (Compositor), der Repaint kommt
 * einmal beim Loslassen.
 */
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { firmamentFitBox, firmamentGateSignature } from '@/utils/ui/firmamentLayout'
import { firmamentScreenPos, paintFirmament } from '@/utils/fx/firmamentPlate'
import { toRoman } from '@/utils/ui/format'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import FirmamentGalaxyTip from './FirmamentGalaxyTip.vue'
import FirmamentSelectionCard from './FirmamentSelectionCard.vue'
import {
  FIRMAMENT_FREED_COLOR,
  FIRMAMENT_GATE_COLOR,
  FIRMAMENT_HERE_COLOR,
  FIRMAMENT_LABEL_MAX_NODES,
  FIRMAMENT_LANDFALL_COLOR,
  FIRMAMENT_MAX_BACKING_PX,
  FIRMAMENT_MAX_DPR,
  FIRMAMENT_NODE_HIT_MIN,
  FIRMAMENT_STAR_SEED,
  FIRMAMENT_UNLIT_COLOR,
  FIRMAMENT_ZOOM_STEPS,
} from '@/config/constants'
import type { FirmamentGate, FirmamentNode } from '@/utils/ui/firmamentLayout'
import type { FirmamentSelection } from '@/types'

const props = defineProps<{
  nodes: FirmamentNode[]
  gates: FirmamentGate[]
  selection: FirmamentSelection
  visible: boolean
}>()

const emit = defineEmits<{ (e: 'select', value: FirmamentSelection): void }>()

const galaxyStore = useGalaxyStore()
const { completedGalaxies } = storeToRefs(galaxyStore)

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const cssW = ref(0)
const cssH = ref(0)
const dprNow = ref(1)

/** Zaehlt die Repaints. Der Playwright-Lauf liest das: bleibt die Zahl in Ruhe
 *  stehen, laeuft keine Frame-Schleife. */
const paintCount = ref(0)
defineExpose({ paintCount })

// ── Zoom und Fahrt ──────────────────────────────────────────────────────────
const zoomStep = ref(0)
const pan = ref({ x: 0, y: 0 })
/** Waehrend des Ziehens: reine Compositor-Fahrt, noch nicht im `paintKey`. */
const drag = ref({ x: 0, y: 0 })
const dragging = ref(false)

const zoom = computed(() => FIRMAMENT_ZOOM_STEPS[zoomStep.value] ?? 1)
const canPan = computed(() => zoomStep.value > 0)

const box = computed(() => {
  const fit = firmamentFitBox(cssW.value, cssH.value)
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
  const r = firmamentFitBox(cssW.value, cssH.value).r * zoom.value
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

function zoomBy(delta: number) {
  const next = Math.min(FIRMAMENT_ZOOM_STEPS.length - 1, Math.max(0, zoomStep.value + delta))
  if (next === zoomStep.value) return
  zoomStep.value = next
  // Herauszoomen zieht die Fahrt mit zurueck in ihre neue, engere Reichweite.
  pan.value = next === 0 ? { x: 0, y: 0 } : clampPan(pan.value.x, pan.value.y)
}

function recenter() {
  zoomStep.value = 0
  pan.value = { x: 0, y: 0 }
  drag.value = { x: 0, y: 0 }
}

function onPointerDown(e: PointerEvent) {
  if (!canPan.value || e.button !== 0) return
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
    // EIN Repaint, am Ende der Fahrt — nicht je Bewegung.
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
const showLabels = computed(() => props.nodes.length <= FIRMAMENT_LABEL_MAX_NODES)

/** Die Bahn eines Universums: von seinem Tor zurueck bis zum vorigen. So sieht
 *  man, was der Lauf zurueckgelegt hat, ohne dass etwas verschwindet. */
const litSpan = computed<{ from: number; to: number } | null>(() => {
  const sel = props.selection
  if (sel?.kind !== 'universe') return null
  const idx = props.gates.findIndex((g) => g.universe === sel.universe)
  if (idx < 0) return null
  const prev = idx > 0 ? props.gates[idx - 1].afterIndex + 1 : 0
  return { from: prev, to: props.gates[idx].afterIndex }
})

const marks = computed(() =>
  props.nodes.map((node, i) => {
    const p = firmamentScreenPos(box.value, node.nx, node.ny)
    const span = litSpan.value
    return {
      node,
      index: i,
      x: p.x,
      y: p.y,
      size: Math.max(FIRMAMENT_NODE_HIT_MIN, node.bodyR * (box.value.r / 300) * 3.2),
      picked: props.selection?.kind === 'galaxy' && props.selection.galaxy === node.galaxy,
      inSpan: span !== null && i >= span.from && i <= span.to,
      accent:
        node.state === 'unlit' || node.themeIndex < 0
          ? FIRMAMENT_UNLIT_COLOR
          : `rgb(${minimapAccentForTheme(node.themeIndex)})`,
    }
  }),
)

const gateMarks = computed(() =>
  props.gates.map((gate) => {
    const p = firmamentScreenPos(box.value, gate.nx, gate.ny)
    return {
      gate,
      x: p.x,
      y: p.y,
      picked: props.selection?.kind === 'universe' && props.selection.universe === gate.universe,
    }
  }),
)

function pickNode(node: FirmamentNode, picked: boolean) {
  emit('select', picked ? null : { kind: 'galaxy', galaxy: node.galaxy })
}

function pickGate(gate: FirmamentGate, picked: boolean) {
  emit('select', picked ? null : { kind: 'universe', universe: gate.universe })
}

// ── Malen ───────────────────────────────────────────────────────────────────
/** Nur LAENGEN und Formzahlen — nie ein Wert, der tickt. Eine Zahl aus dem
 *  Sekundentakt hier malte die ganze Platte jede Sekunde neu. */
const paintKey = computed(
  () =>
    `${props.nodes.length}:${completedGalaxies.value.length}` +
    `:${props.nodes.map((n) => `${n.galaxy}${n.state[0]}${n.rescued}${n.lost}${n.landfalls}`).join(',')}` +
    `|${firmamentGateSignature(props.gates)}` +
    `|${Math.round(cssW.value)}x${Math.round(cssH.value)}|${dprNow.value}` +
    `|${zoomStep.value}|${Math.round(pan.value.x)},${Math.round(pan.value.y)}`,
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
  // Backing-Store bliebe sonst bis zur naechsten Aenderung leer.
  resetCanvasIfContextLost(el)

  const dpr = Math.min(
    window.devicePixelRatio || 1,
    FIRMAMENT_MAX_DPR,
    FIRMAMENT_MAX_BACKING_PX / Math.max(w, h),
  )
  el.width = Math.max(1, Math.round(w * dpr))
  el.height = Math.max(1, Math.round(h * dpr))
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  paintFirmament(ctx, props.nodes, props.gates, w, h, box.value, { seed: FIRMAMENT_STAR_SEED })
  paintCount.value += 1
}

watch(paintKey, schedule, { flush: 'post' })

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
    else detach()
  },
  { immediate: true },
)

onBeforeUnmount(detach)

// ── Ebene ───────────────────────────────────────────────────────────────────
const layerStyle = computed(() => ({
  transform: `translate3d(${drag.value.x}px, ${drag.value.y}px, 0)`,
}))

const LEGEND = [
  { key: 'freed', label: 'Freed', color: FIRMAMENT_FREED_COLOR, shape: 'dot' },
  { key: 'here', label: 'You are here', color: FIRMAMENT_HERE_COLOR, shape: 'dot' },
  { key: 'unlit', label: 'Unlit', color: FIRMAMENT_UNLIT_COLOR, shape: 'ring' },
  { key: 'land', label: 'Landfall', color: FIRMAMENT_LANDFALL_COLOR, shape: 'diamond' },
  { key: 'gate', label: 'Departure', color: FIRMAMENT_GATE_COLOR, shape: 'gate' },
] as const
</script>

<template>
  <div
    ref="stage"
    class="fm-stage"
    :class="{ 'is-pannable': canPan, 'is-dragging': dragging }"
    @pointerdown="onPointerDown"
  >
    <div class="fm-layer" :style="layerStyle">
      <canvas ref="canvas" class="fm-canvas" />

      <!-- Ein Knopf je Knoten. Kein Schein, kein Zierrat — den malt das Canvas
           darunter; hier liegt nur, was auf Zeiger und Tastatur antwortet. -->
      <RpgBadgeTooltip v-for="mark in marks" :key="mark.node.galaxy" passive :accent="mark.accent">
        <button
          class="fm-node"
          :class="{
            'is-current': mark.node.state === 'current',
            'is-unlit': mark.node.state === 'unlit',
            'is-picked': mark.picked,
            'is-lit': mark.inSpan,
            'is-labelled': showLabels,
          }"
          :style="{
            left: `${mark.x}px`,
            top: `${mark.y}px`,
            width: `${mark.size}px`,
            height: `${mark.size}px`,
            '--fm-node-accent': mark.accent,
          }"
          :aria-label="`Galaxy ${toRoman(mark.node.galaxy)}`"
          :aria-pressed="mark.picked"
          @click="pickNode(mark.node, mark.picked)"
        >
          <span class="fm-node-ring" aria-hidden="true" />
          <span class="fm-node-tag" aria-hidden="true">{{ toRoman(mark.node.galaxy) }}</span>
        </button>
        <template #tip>
          <FirmamentGalaxyTip :node="mark.node" />
        </template>
      </RpgBadgeTooltip>

      <!-- Die Tore. Sie tragen ihre Ziffer selbst — die Bahn ist sonst nicht
           lesbar, wo ein Universum endete. -->
      <button
        v-for="g in gateMarks"
        :key="`gate-${g.gate.universe}-${g.gate.afterIndex}`"
        class="fm-gate"
        :class="{ 'is-picked': g.picked }"
        :style="{ left: `${g.x}px`, top: `${g.y}px` }"
        :aria-label="`Departure to Universe ${toRoman(g.gate.universe)}`"
        :aria-pressed="g.picked"
        @click="pickGate(g.gate, g.picked)"
      >
        {{ toRoman(g.gate.universe) }}
      </button>
    </div>

    <!-- Bedienung: drei Zoomstufen und zurueck zur Mitte. -->
    <div class="fm-tools">
      <button
        class="fm-tool"
        title="Zoom out"
        aria-label="Zoom out"
        :disabled="zoomStep === 0"
        @click="zoomBy(-1)"
      >
        <Icon icon="lucide:minus" width="14" height="14" />
      </button>
      <button
        class="fm-tool"
        title="Zoom in"
        aria-label="Zoom in"
        :disabled="zoomStep === FIRMAMENT_ZOOM_STEPS.length - 1"
        @click="zoomBy(1)"
      >
        <Icon icon="lucide:plus" width="14" height="14" />
      </button>
      <button
        class="fm-tool fm-tool--home"
        title="Fit the whole road"
        aria-label="Fit the whole road"
        @click="recenter"
      >
        <Icon icon="lucide:crosshair" width="14" height="14" />
      </button>
    </div>

    <div class="fm-legend">
      <span v-for="l in LEGEND" :key="l.key" class="fm-legend-chip" :style="{ color: l.color }">
        <span class="fm-legend-mark" :class="`is-${l.shape}`" :style="{ '--fm-l': l.color }" />
        {{ l.label }}
      </span>
    </div>

    <FirmamentSelectionCard :nodes="nodes" :gates="gates" :selection="selection" />
  </div>
</template>

<style scoped>
.fm-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #0b0806;
}

.fm-stage.is-pannable {
  cursor: grab;
}

.fm-stage.is-dragging {
  cursor: grabbing;
}

/* Die ganze Ebene faehrt beim Ziehen als EIN transform — Canvas und Knoten
   bleiben dabei zwangslaeufig deckungsgleich. */
.fm-layer {
  position: absolute;
  inset: 0;
}

.fm-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* ── Knoten ───────────────────────────────────────────────────────────── */
.fm-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.fm-node:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}

/* Der Ring ist die EINZIGE Ebene, die der Knoten selbst malt. Ruhend ist er
   unsichtbar; er kostet erst etwas, wenn er etwas sagt. */
.fm-node-ring {
  width: 76%;
  height: 76%;
  border-radius: 50%;
  border: 1.4px solid transparent;
}

.fm-node:hover .fm-node-ring {
  border-color: rgba(232, 220, 192, 0.55);
}

.fm-node.is-lit .fm-node-ring {
  border-color: rgba(122, 184, 240, 0.75);
}

.fm-node.is-picked .fm-node-ring {
  border-color: #e8c040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
}

/* Die Ziffer. Ruhend malt sie nichts (`visibility: hidden`), und sie faengt
   den Zeiger nicht ab — der gehoert der Trefferflaeche darunter. */
.fm-node-tag {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding-bottom: 2px;
  font-size: 12px;
  line-height: 1;
  color: #e8dcc0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  pointer-events: none;
  visibility: hidden;
}

.fm-node.is-labelled .fm-node-tag,
.fm-node:hover .fm-node-tag,
.fm-node:focus-visible .fm-node-tag,
.fm-node.is-picked .fm-node-tag,
.fm-node.is-current .fm-node-tag {
  visibility: visible;
}

.fm-node.is-unlit .fm-node-tag {
  color: rgba(160, 146, 114, 0.75);
}

.fm-node.is-current .fm-node-tag {
  color: #9fe062;
}

.fm-node.is-picked .fm-node-tag {
  color: #e8c040;
}

/* Der laufende Knoten atmet — eigene Ebene, animiert wird nur ihre `opacity`
   (Compositor, keine Neurasterung). Dasselbe Muster wie `orbit-glow-breathe`. */
.fm-node.is-current::after {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  border: 1.6px solid #9fe062;
  box-shadow: 0 0 10px rgba(159, 224, 98, 0.5);
  pointer-events: none;
  animation: fm-breathe 2.4s ease-in-out infinite;
}

@keyframes fm-breathe {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

/* ── Tore ─────────────────────────────────────────────────────────────── */
.fm-gate {
  position: absolute;
  transform: translate(-50%, -50%);
  min-width: 22px;
  height: 18px;
  padding: 0 5px;
  font-size: 10.5px;
  font-weight: 900;
  line-height: 1;
  color: #7ab8f0;
  background: rgba(10, 12, 18, 0.9);
  border: 1px solid rgba(122, 184, 240, 0.45);
  border-radius: 3px;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.fm-gate:hover,
.fm-gate.is-picked {
  color: #c9e4ff;
  border-color: #7ab8f0;
}

/* ── Bedienung ────────────────────────────────────────────────────────── */
.fm-tools {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 4;
  display: flex;
  gap: 2px;
  padding: 3px;
  background: rgba(12, 10, 6, 0.86);
  border: 1px solid #3e200a;
  border-radius: 4px;
}

.fm-tool {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  color: #c8b890;
  background: #151109;
  border: 1px solid #3a2c14;
  border-radius: 3px;
  cursor: pointer;
  transition: color 0.12s;
}

.fm-tool:hover:not(:disabled) {
  color: #e8c040;
}

.fm-tool:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fm-tool--home {
  color: #9fe062;
}

.fm-tool--home:hover {
  color: #c9f08c;
}

/* ── Legende ──────────────────────────────────────────────────────────── */
.fm-legend {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-width: 60%;
  pointer-events: none;
}

.fm-legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  font-size: 11.5px;
  white-space: nowrap;
  background: rgba(12, 10, 6, 0.86);
  border: 1px solid #3a2c14;
  border-radius: 3px;
}

.fm-legend-mark {
  width: 8px;
  height: 8px;
}

.fm-legend-mark.is-dot {
  border-radius: 50%;
  background: var(--fm-l);
}

.fm-legend-mark.is-ring {
  border-radius: 50%;
  border: 1px dashed var(--fm-l);
}

.fm-legend-mark.is-diamond {
  width: 7px;
  height: 7px;
  transform: rotate(45deg);
  border: 1px solid var(--fm-l);
}

.fm-legend-mark.is-gate {
  width: 4px;
  height: 9px;
  border-left: 1px solid var(--fm-l);
  border-right: 1px solid var(--fm-l);
}
</style>
