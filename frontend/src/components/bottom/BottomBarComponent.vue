<template>
  <svg ref="svgRef" class="bottom-bar-frame" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      :d="framePath"
      fill="none"
      :stroke="BOTTOM_FRAME_STROKE_SHADOW"
      stroke-width="5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      :d="framePath"
      fill="none"
      :stroke="BOTTOM_FRAME_STROKE_WOOD"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      :d="framePath"
      fill="none"
      :stroke="BOTTOM_FRAME_STROKE_GRAIN"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      :d="framePath"
      fill="none"
      :stroke="BOTTOM_FRAME_STROKE_SHEEN"
      stroke-width="1"
      stroke-linecap="round"
    />
  </svg>
  <MiniMap />
  <BottomStatusComponent />
  <CommandPanelComponent />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MiniMap from '@/components/bottom/minimap/MiniMap.vue'
import BottomStatusComponent from './BottomStatusComponent.vue'
import CommandPanelComponent from '@/components/bottom/command/CommandPanelComponent.vue'
import {
  BOTTOM_FRAME_STROKE_SHADOW,
  BOTTOM_FRAME_STROKE_WOOD,
  BOTTOM_FRAME_STROKE_GRAIN,
  BOTTOM_FRAME_STROKE_SHEEN,
} from '@/config/constants'

const svgRef = ref<SVGSVGElement | null>(null)
const vw = ref(window.innerWidth)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (svgRef.value) {
    vw.value = svgRef.value.getBoundingClientRect().width
    resizeObserver = new ResizeObserver((entries) => {
      vw.value = entries[0].contentRect.width
    })
    resizeObserver.observe(svgRef.value)
  }
})
onUnmounted(() => resizeObserver?.disconnect())

const ARC = 60
const NR = 20
const O = 3

const framePath = computed(() => {
  const W = vw.value
  const mm2 = 438,
    mm1 = mm2 - ARC
  const cm1 = W - mm2,
    cm2 = W - mm1
  const CY = 440 - 60 // 437 — notch floor at bottom edge of frame

  return [
    `M ${O},${O}`,
    `L ${mm1},${O}`,
    `A ${ARC},${ARC} 0 0,1 ${mm2},${ARC + O}`,
    `L ${mm2},${CY - NR}`,
    `A ${NR},${NR} 0 0,0 ${mm2 + NR},${CY}`,
    `L ${cm1 - NR},${CY}`,
    `A ${NR},${NR} 0 0,0 ${cm1},${CY - NR}`,
    `L ${cm1},${ARC + O}`,
    `A ${ARC},${ARC} 0 0,1 ${cm2},${O}`,
    `L ${W - O},${O}`,
    `L ${W - O},${440 - O}`,
    `L ${O},${440 - O}`,
    `Z`,
  ].join(' ')
})
</script>

<style scoped>
.bottom-bar-frame {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 440px;
  pointer-events: none;
  z-index: 10001;
}
</style>
