<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  BOTTOM_FRAME_STROKE_SHADOW,
  BOTTOM_FRAME_STROKE_WOOD,
  BOTTOM_FRAME_STROKE_GOLD,
  BOTTOM_FRAME_W_SHADOW,
  BOTTOM_FRAME_W_WOOD,
  BOTTOM_FRAME_W_GOLD,
  BOTTOM_BAR_EDGE_INSET,
} from '@/config/constants'

/* Standard-SVG-Holzrahmen für Modals/Panels (gleiche Technik wie .bar-frame der
   Bottom-Bar, .enc-frame der Encyclopedia und der Header-Rahmen): drei Strokes
   Schatten → Holz → Goldlinie entlang einer geschlossenen Rundrect-Kontur.

   Verwendung: als direktes Kind des Modal-Elements einhängen — der Parent muss
   `position: relative` (o. ä.) und `overflow: hidden` haben. Maße und Eckradius
   werden per ResizeObserver vom Parent gelesen; der CSS-`border` des Parents
   entfällt ersatzlos. offsetWidth/offsetHeight statt getBoundingClientRect,
   damit der Rahmen auch unter CSS-`zoom` (TeamModalShell) korrekt sitzt. */

const rootRef = ref<SVGSVGElement | null>(null)
const w = ref(0)
const h = ref(0)
const r = ref(0)

let parent: HTMLElement | null = null
let observer: ResizeObserver | null = null

function measure() {
  if (!parent) return
  w.value = parent.offsetWidth
  h.value = parent.offsetHeight
  r.value = parseFloat(getComputedStyle(parent).borderTopLeftRadius) || 0
}

onMounted(() => {
  parent = rootRef.value?.parentElement ?? null
  if (!parent) return
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(parent)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})

/** Geschlossene Rundrect-Kontur, um BOTTOM_BAR_EDGE_INSET nach innen versetzt —
    gleiche Konstruktion wie framePath in BottomBarComponent / EncyclopediaPanel. */
const framePath = computed(() => {
  const O = BOTTOM_BAR_EDGE_INSET
  const W = w.value
  const H = h.value
  const rad = Math.max(0, r.value - O)
  return [
    `M ${O + rad},${O}`,
    `L ${W - O - rad},${O}`,
    `A ${rad},${rad} 0 0,1 ${W - O},${O + rad}`,
    `L ${W - O},${H - O - rad}`,
    `A ${rad},${rad} 0 0,1 ${W - O - rad},${H - O}`,
    `L ${O + rad},${H - O}`,
    `A ${rad},${rad} 0 0,1 ${O},${H - O - rad}`,
    `L ${O},${O + rad}`,
    `A ${rad},${rad} 0 0,1 ${O + rad},${O}`,
    'Z',
  ].join(' ')
})
</script>

<template>
  <!-- Klassenname bewusst NICHT .rpg-frame — die globale Klasse in
       rpg-theme.css trägt einen opaken Background und würde den Modal-Inhalt
       überdecken -->
  <svg ref="rootRef" v-show="w && h" class="rpg-frame-svg" :width="w" :height="h" aria-hidden="true">
    <path
      :d="framePath"
      fill="none"
      :stroke="BOTTOM_FRAME_STROKE_SHADOW"
      :stroke-width="BOTTOM_FRAME_W_SHADOW"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      :d="framePath"
      fill="none"
      :stroke="BOTTOM_FRAME_STROKE_WOOD"
      :stroke-width="BOTTOM_FRAME_W_WOOD"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      :d="framePath"
      fill="none"
      :stroke="BOTTOM_FRAME_STROKE_GOLD"
      :stroke-width="BOTTOM_FRAME_W_GOLD"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
/* Über dem Content — Inhalte scrollen sichtbar unter den Strichen durch */
.rpg-frame-svg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
}
</style>
