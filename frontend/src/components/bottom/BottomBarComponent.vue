<template>
  <div ref="shellRef" class="bottom-bar-shell" :style="{ height: `${barH}px` }">
    <!-- ── Unified background: one continuous silhouette fill ── -->
    <div class="bar-bg" :style="{ clipPath: `path('${closedPath}')` }" />

    <!-- ── Panel content (each section positions itself inside the shell) ── -->
    <MiniMap />
    <BottomScoreboard />
    <CommandPanelComponent />

    <!-- ── Gold/wood frame on top: one continuous edge ── -->
    <svg class="bar-frame" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
      <!-- faint vertical seams where the side panels meet the connector -->
      <line
        :x1="seamLeftX"
        :y1="seamY1"
        :x2="seamLeftX"
        :y2="seamY2"
        :stroke="BOTTOM_BAR_SEAM_COLOR"
        stroke-width="1.5"
      />
      <line
        :x1="seamRightX"
        :y1="seamY1"
        :x2="seamRightX"
        :y2="seamY2"
        :stroke="BOTTOM_BAR_SEAM_COLOR"
        stroke-width="1.5"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MiniMap from '@/components/bottom/minimap/MiniMap.vue'
import BottomScoreboard from './BottomScoreboard.vue'
import CommandPanelComponent from '@/components/bottom/command/CommandPanelComponent.vue'
import {
  BOTTOM_FRAME_STROKE_SHADOW,
  BOTTOM_FRAME_STROKE_WOOD,
  BOTTOM_FRAME_STROKE_GOLD,
  BOTTOM_FRAME_W_SHADOW,
  BOTTOM_FRAME_W_WOOD,
  BOTTOM_FRAME_W_GOLD,
  BOTTOM_BAR_HEIGHT,
  BOTTOM_BAR_SIDE_W,
  BOTTOM_BAR_CENTER_TOP_Y,
  BOTTOM_BAR_NOTCH_R,
  BOTTOM_BAR_EDGE_INSET,
  BOTTOM_BAR_SEAM_COLOR,
  HUD_PANEL_ARC_R,
} from '@/config/constants'

const shellRef = ref<HTMLDivElement | null>(null)
const vw = ref(window.innerWidth)
const hudScale = ref(1)

function readHudScale() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--hud-scale')
  const parsed = parseFloat(raw)
  hudScale.value = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  readHudScale()
  if (shellRef.value) {
    vw.value = shellRef.value.getBoundingClientRect().width
    resizeObserver = new ResizeObserver((entries) => {
      vw.value = entries[0].contentRect.width
      // --hud-scale breakpoints only change on resize — re-read it here
      readHudScale()
    })
    resizeObserver.observe(shellRef.value)
  }
})
onUnmounted(() => resizeObserver?.disconnect())

const barH = computed(() => BOTTOM_BAR_HEIGHT * hudScale.value)

/** Top-edge path of the silhouette (open — no stroke along the bottom edge). */
const framePath = computed(() => {
  const s = hudScale.value
  const W = vw.value
  const O = BOTTOM_BAR_EDGE_INSET
  const arc = HUD_PANEL_ARC_R * s
  const nr = BOTTOM_BAR_NOTCH_R * s
  const side = BOTTOM_BAR_SIDE_W * s
  const cy = BOTTOM_BAR_CENTER_TOP_Y * s

  return [
    `M ${O},${O}`,
    `L ${side - arc},${O}`,
    `A ${arc},${arc} 0 0,1 ${side},${arc + O}`,
    `L ${side},${cy - nr}`,
    `A ${nr},${nr} 0 0,0 ${side + nr},${cy}`,
    `L ${W - side - nr},${cy}`,
    `A ${nr},${nr} 0 0,0 ${W - side},${cy - nr}`,
    `L ${W - side},${arc + O}`,
    `A ${arc},${arc} 0 0,1 ${W - side + arc},${O}`,
    `L ${W - O},${O}`,
  ].join(' ')
})

/** Same silhouette, closed along the bottom — used for fill / clip. */
const closedPath = computed(
  () => `${framePath.value} L ${vw.value},${barH.value} L 0,${barH.value} Z`,
)

const seamLeftX = computed(() => BOTTOM_BAR_SIDE_W * hudScale.value)
const seamRightX = computed(() => vw.value - BOTTOM_BAR_SIDE_W * hudScale.value)
const seamY1 = computed(() => (HUD_PANEL_ARC_R + 10) * hudScale.value)
const seamY2 = computed(() => (BOTTOM_BAR_CENTER_TOP_Y - 28) * hudScale.value)
</script>

<style scoped>
.bottom-bar-shell {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
  z-index: 10000;
}

.bar-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 115%, rgba(58, 36, 14, 0) 55%, rgba(0, 0, 0, 0.55) 100%),
    linear-gradient(to bottom, #241608 0%, #1a1005 50%, #130b04 100%);
}

.bar-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}
</style>
