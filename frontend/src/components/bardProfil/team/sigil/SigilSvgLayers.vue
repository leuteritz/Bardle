<script setup lang="ts">
import { computed } from 'vue'
import {
  SIGIL_STAGE_SIZE,
  SIGIL_RING_OUTER_R,
  SIGIL_RING_RUNE_R,
  SIGIL_RING_INNER_R,
  SIGIL_RING_CORE_R,
  SIGIL_DIM_COLOR,
} from '@/config/constants'
import type { SigilStageDef } from '@/types'
import type { SigilPoint } from '@/composables/useTeamSigil'

const props = defineProps<{
  stage: SigilStageDef
  filledSlots: number
  rolePoints: SigilPoint[]
  /** Ally satellite positions per role — rune ticks align with these. */
  allyPoints: SigilPoint[][]
  /** Per role: which ally sub-slots hold a champion. */
  allyFilled: boolean[][]
  roleColors: string[]
  mainFilled: boolean[]
  roleFull: boolean[]
  selectedRole: number | null
  showPentagram: boolean
  showMandala: boolean
}>()

const C = SIGIL_STAGE_SIZE / 2

const pentagonPath = computed(() =>
  props.rolePoints.map((p) => `${p.x},${p.y}`).join(' '),
)

/** Pentagram: connect every second pentagon vertex (0→2→4→1→3→0). */
const pentagramPath = computed(() => {
  const order = [0, 2, 4, 1, 3]
  return order.map((i) => `${props.rolePoints[i].x},${props.rolePoints[i].y}`).join(' ')
})

/** Rune ticks — one per FILLED ally slot, placed on the ray from the center
 *  through that ally's satellite, so each tick points dead-center at its
 *  champion image. Empty slots draw no tick at all. */
const runeTicks = computed(() => {
  const ticks: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }> = []
  const inner = SIGIL_RING_RUNE_R - 10
  const outer = SIGIL_RING_RUNE_R + 10
  props.allyPoints.forEach((points, roleIdx) => {
    points.forEach((p, sub) => {
      if (!props.allyFilled[roleIdx]?.[sub]) return
      const angle = Math.atan2(p.y - C, p.x - C)
      ticks.push({
        x1: C + inner * Math.cos(angle),
        y1: C + inner * Math.sin(angle),
        x2: C + outer * Math.cos(angle),
        y2: C + outer * Math.sin(angle),
        color: props.roleColors[roleIdx] ?? props.stage.crestColor,
      })
    })
  })
  return ticks
})

function spokeColor(i: number): string {
  return props.mainFilled[i] ? props.roleColors[i] : SIGIL_DIM_COLOR
}
</script>

<template>
  <svg
    class="sigil-svg"
    :viewBox="`0 0 ${SIGIL_STAGE_SIZE} ${SIGIL_STAGE_SIZE}`"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- rotating dashed outer ring -->
    <g class="sigil-spin" :style="{ '--spin-dur': `${stage.spinSec}s` }">
      <circle
        :cx="C"
        :cy="C"
        :r="SIGIL_RING_OUTER_R"
        fill="none"
        :stroke="stage.ringColor"
        stroke-width="1.5"
        stroke-dasharray="3 14"
        opacity="0.75"
      />
      <circle
        v-if="stage.extraRings >= 1"
        :cx="C"
        :cy="C"
        :r="SIGIL_RING_OUTER_R - 22"
        fill="none"
        :stroke="stage.ringColor"
        stroke-width="1"
        opacity="0.45"
      />
    </g>
    <!-- counter-rotating extra ring (stage 2+) -->
    <g
      v-if="stage.extraRings >= 2"
      class="sigil-spin sigil-spin--reverse"
      :style="{ '--spin-dur': `${stage.spinSec * 1.6}s` }"
    >
      <circle
        :cx="C"
        :cy="C"
        :r="SIGIL_RING_OUTER_R + 18"
        fill="none"
        :stroke="stage.ringColor"
        stroke-width="1"
        stroke-dasharray="1 8"
        opacity="0.55"
      />
    </g>

    <!-- rune tick ring — one tick lights per filled slot -->
    <circle
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_RUNE_R"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1"
      opacity="0.35"
    />
    <g stroke-width="3" stroke-linecap="round">
      <line
        v-for="(tick, k) in runeTicks"
        :key="k"
        :x1="tick.x1"
        :y1="tick.y1"
        :x2="tick.x2"
        :y2="tick.y2"
        :stroke="tick.color"
        opacity="0.95"
        class="rune-lit"
      />
    </g>

    <!-- inner circles -->
    <circle
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_INNER_R"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1"
      stroke-dasharray="3 6"
      opacity="0.5"
    />
    <circle
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_CORE_R"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1.5"
      opacity="0.6"
    />

    <!-- pentagon body -->
    <polygon
      :points="pentagonPath"
      :fill="showMandala ? `${stage.crestColor}14` : 'rgba(200, 164, 90, 0.04)'"
      :stroke="showPentagram ? stage.crestColor : 'rgba(200, 164, 90, 0.35)'"
      stroke-width="1.5"
    />
    <!-- pentagram overlay — appears once all 5 mains are set -->
    <polygon
      v-if="showPentagram"
      :points="pentagramPath"
      fill="none"
      :stroke="stage.crestColor"
      stroke-width="1.2"
      opacity="0.65"
      class="pentagram"
    />

    <!-- spokes: center → role vertex, lit in role color once the main is set -->
    <g stroke-width="1.5" stroke-linecap="round">
      <line
        v-for="(p, i) in rolePoints"
        :key="`spoke-${i}`"
        :x1="C"
        :y1="C"
        :x2="p.x"
        :y2="p.y"
        :stroke="spokeColor(i)"
        :opacity="mainFilled[i] ? 0.7 : 0.4"
      />
    </g>

    <!-- vertex diamonds — lit per filled main -->
    <g>
      <rect
        v-for="(p, i) in rolePoints"
        :key="`vertex-${i}`"
        :x="p.x - 5"
        :y="p.y - 5"
        width="10"
        height="10"
        :transform="`rotate(45 ${p.x} ${p.y})`"
        :fill="mainFilled[i] ? roleColors[i] : SIGIL_DIM_COLOR"
        :opacity="mainFilled[i] ? 0.95 : 0.6"
      />
    </g>

    <!-- mandala petals at a complete 15/15 team -->
    <g v-if="showMandala" class="sigil-spin" :style="{ '--spin-dur': `${stage.spinSec * 2}s` }">
      <circle
        v-for="(p, i) in rolePoints"
        :key="`petal-${i}`"
        :cx="(p.x + C) / 2"
        :cy="(p.y + C) / 2"
        :r="52"
        fill="none"
        :stroke="stage.crestColor"
        stroke-width="1"
        stroke-dasharray="2 5"
        opacity="0.5"
      />
    </g>
  </svg>
</template>

<style scoped>
.sigil-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.sigil-spin {
  transform-origin: 50% 50%;
  animation: sigil-rotate var(--spin-dur, 60s) linear infinite;
}
.sigil-spin--reverse {
  animation-direction: reverse;
}
.pentagram {
  animation: pentagram-glow 3s ease-in-out infinite;
}
.rune-lit {
  transition: stroke 0.4s ease;
}
@keyframes sigil-rotate {
  to {
    transform: rotate(360deg);
  }
}
@keyframes pentagram-glow {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.85;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sigil-spin,
  .pentagram {
    animation: none !important;
  }
}
</style>
