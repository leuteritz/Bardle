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

interface RoleEdge {
  id: string
  a: SigilPoint
  b: SigilPoint
  colorA: string
  colorB: string
  lit: boolean
}

function buildEdge(id: string, i: number, j: number): RoleEdge {
  return {
    id,
    a: props.rolePoints[i],
    b: props.rolePoints[j],
    colorA: props.roleColors[i],
    colorB: props.roleColors[j],
    lit: props.mainFilled[i] && props.mainFilled[j],
  }
}

/** Pentagon edges — each link fades from one role's color into the other's
 *  at the middle of the line. */
const pentagonEdges = computed(() =>
  props.rolePoints.map((_, i) => buildEdge(`pent-${i}`, i, (i + 1) % props.rolePoints.length)),
)

/** Pentagram diagonals (0→2→4→1→3→0) — same two-color gradient treatment. */
const pentagramEdges = computed(() => {
  const order = [0, 2, 4, 1, 3]
  return order.map((i, idx) => buildEdge(`star-${i}`, i, order[(idx + 1) % order.length]))
})

function spokeColor(i: number): string {
  return props.mainFilled[i] ? props.roleColors[i] : SIGIL_DIM_COLOR
}

/** Gap around the main node so the link starts at its edge, not under the image. */
const ALLY_LINK_MAIN_GAP = 54
/** Gap around the ally satellite so the link ends just before the image. */
const ALLY_LINK_ALLY_GAP = 27

/** Connectors: role main node → each FILLED ally satellite, trimmed on both
 *  ends so the champion images stay untouched. */
const allyLinks = computed(() => {
  const links: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }> = []
  props.allyPoints.forEach((points, roleIdx) => {
    const main = props.rolePoints[roleIdx]
    points.forEach((p, sub) => {
      if (!props.allyFilled[roleIdx]?.[sub]) return
      const dx = p.x - main.x
      const dy = p.y - main.y
      const dist = Math.hypot(dx, dy)
      if (dist <= ALLY_LINK_MAIN_GAP + ALLY_LINK_ALLY_GAP) return
      const ux = dx / dist
      const uy = dy / dist
      links.push({
        x1: main.x + ux * ALLY_LINK_MAIN_GAP,
        y1: main.y + uy * ALLY_LINK_MAIN_GAP,
        x2: p.x - ux * ALLY_LINK_ALLY_GAP,
        y2: p.y - uy * ALLY_LINK_ALLY_GAP,
        color: props.roleColors[roleIdx] ?? props.stage.crestColor,
      })
    })
  })
  return links
})
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

    <!-- rune ring (decorative) -->
    <circle
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_RUNE_R"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1"
      opacity="0.35"
    />

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

    <!-- two-color gradients: each main→main link blends between the two role
         colors at the middle of the line -->
    <defs>
      <linearGradient
        v-for="e in [...pentagonEdges, ...pentagramEdges]"
        :id="`sigil-edge-${e.id}`"
        :key="`grad-${e.id}`"
        gradientUnits="userSpaceOnUse"
        :x1="e.a.x"
        :y1="e.a.y"
        :x2="e.b.x"
        :y2="e.b.y"
      >
        <stop offset="0%" :stop-color="e.colorA" />
        <stop offset="42%" :stop-color="e.colorA" />
        <stop offset="58%" :stop-color="e.colorB" />
        <stop offset="100%" :stop-color="e.colorB" />
      </linearGradient>
    </defs>

    <!-- pentagon body (fill only — edges are drawn as gradient lines) -->
    <polygon
      :points="pentagonPath"
      :fill="showMandala ? `${stage.crestColor}14` : 'rgba(200, 164, 90, 0.04)'"
      stroke="none"
    />
    <g stroke-width="1.5" stroke-linecap="round">
      <line
        v-for="e in pentagonEdges"
        :key="e.id"
        :x1="e.a.x"
        :y1="e.a.y"
        :x2="e.b.x"
        :y2="e.b.y"
        :stroke="`url(#sigil-edge-${e.id})`"
        :opacity="e.lit ? 0.9 : 0.4"
      />
    </g>
    <!-- pentagram overlay — appears once all 5 mains are set -->
    <g v-if="showPentagram" class="pentagram" stroke-width="1.2" stroke-linecap="round">
      <line
        v-for="e in pentagramEdges"
        :key="e.id"
        :x1="e.a.x"
        :y1="e.a.y"
        :x2="e.b.x"
        :y2="e.b.y"
        :stroke="`url(#sigil-edge-${e.id})`"
      />
    </g>

    <!-- ally links: role main → each filled ally satellite -->
    <g stroke-width="1.5" stroke-linecap="round">
      <line
        v-for="(l, k) in allyLinks"
        :key="`ally-link-${k}`"
        :x1="l.x1"
        :y1="l.y1"
        :x2="l.x2"
        :y2="l.y2"
        :stroke="l.color"
        opacity="0.65"
      />
    </g>

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
