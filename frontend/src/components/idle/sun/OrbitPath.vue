<template>
  <defs>
    <filter
      :id="uid"
      filterUnits="userSpaceOnUse"
      :x="baseRegion.x"
      :y="baseRegion.y"
      :width="baseRegion.width"
      :height="baseRegion.height"
    >
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
      </feMerge>
    </filter>

    <template v-if="abilityActive">
      <filter
        :id="uid + '-ability-outer'"
        filterUnits="userSpaceOnUse"
        :x="outerRegion.x"
        :y="outerRegion.y"
        :width="outerRegion.width"
        :height="outerRegion.height"
      >
        <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="blur2" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="44" result="blur3" />
        <feMerge>
          <feMergeNode in="blur3" />
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
        </feMerge>
      </filter>
      <filter
        :id="uid + '-ability-core'"
        filterUnits="userSpaceOnUse"
        :x="coreRegion.x"
        :y="coreRegion.y"
        :width="coreRegion.width"
        :height="coreRegion.height"
      >
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blurCore" />
        <feMerge>
          <feMergeNode in="blurCore" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </template>
  </defs>

  <!-- Normal orbit ring (visible when behind sun or as base) -->
  <g
    :filter="`url(#${uid})`"
    :style="{
      opacity: (visible ? 1 : 0) * (dimmed ? HOVER_DIM_OPACITY : 1),
      transition: 'opacity 0.5s ease',
    }"
  >
    <ellipse
      :cx="x"
      :cy="y"
      :rx="rx"
      :ry="ry"
      :transform="`rotate(${tiltDeg}, ${x}, ${y})`"
      fill="none"
      :stroke="color"
      :stroke-opacity="opacity"
      :stroke-width="28 * strokeWidth * orbitSunScale"
    />
  </g>

  <!-- Ability-active: outer wide diffuse glow -->
  <g
    v-if="abilityActive"
    :filter="`url(#${uid + '-ability-outer'})`"
    class="ability-outer-glow"
  >
    <ellipse
      :cx="x"
      :cy="y"
      :rx="rx"
      :ry="ry"
      :transform="`rotate(${tiltDeg}, ${x}, ${y})`"
      fill="none"
      :stroke="color"
      stroke-opacity="0.55"
      :stroke-width="55 * strokeWidth"
    />
  </g>

  <!-- Ability-active: inner sharp bright core -->
  <g
    v-if="abilityActive"
    :filter="`url(#${uid + '-ability-core'})`"
    class="ability-inner-core"
  >
    <ellipse
      :cx="x"
      :cy="y"
      :rx="rx"
      :ry="ry"
      :transform="`rotate(${tiltDeg}, ${x}, ${y})`"
      fill="none"
      :stroke="color"
      stroke-opacity="0.95"
      :stroke-width="6 * strokeWidth"
    />
  </g>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { HOVER_DIM_OPACITY } from '@/config/constants'

const props = withDefaults(
  defineProps<{
    color: string
    x: number
    y: number
    rx: number
    ry: number
    tiltDeg: number
    strokeWidth?: number
    opacity?: number
    visible?: boolean
    abilityActive?: boolean
    dimmed?: boolean
  }>(),
  { strokeWidth: 0.3, opacity: 0.2, visible: true, abilityActive: false, dimmed: false },
)

const { orbitSunScale } = storeToRefs(usePlanetShopStore())
const uid = `orbit-glow-${getCurrentInstance()!.uid}`

// ── Filter-Regionen exakt statt in Prozent ───────────────────────────────────
// Eine Prozent-Region bezieht sich auf die Bounding-Box der Bahn: `300%` heißt
// die NEUNFACHE Fläche, und der Browser rechnet jeden feGaussianBlur über
// jeden Pixel davon — bei einer bildschirmfüllenden Bahn Millionen fast
// ausschließlich leerer Pixel. Gebraucht wird nur so viel Rand, dass der
// breiteste Blur nicht abgeschnitten wird: ~3σ, hier mit 3.5σ Reserve, plus
// die halbe Strichbreite. In userSpaceOnUse lässt sich das exakt angeben.
const BLUR_REACH = 3.5

/** Halbe Ausdehnung der um tiltDeg rotierten Ellipse — exakte AABB. */
function rotatedHalf(axis: 'w' | 'h'): number {
  const t = (props.tiltDeg * Math.PI) / 180
  const a = axis === 'w' ? props.rx * Math.cos(t) : props.rx * Math.sin(t)
  const b = axis === 'w' ? props.ry * Math.sin(t) : props.ry * Math.cos(t)
  return Math.sqrt(a * a + b * b)
}

function region(maxSigma: number, strokeScale: number, sunScale = 1) {
  const pad = BLUR_REACH * maxSigma + (strokeScale * props.strokeWidth * sunScale) / 2
  const hw = rotatedHalf('w') + pad
  const hh = rotatedHalf('h') + pad
  return { x: props.x - hw, y: props.y - hh, width: hw * 2, height: hh * 2 }
}

// Basis-Ring (läuft für JEDE Bahn dauerhaft, nicht nur beim Hover): σ 4 / 10
const baseRegion = computed(() => region(10, 28, orbitSunScale.value))
// Ability-Glow der fokussierten Bahn: σ 8 / 22 / 44
const outerRegion = computed(() => region(44, 55))
const coreRegion = computed(() => region(1.5, 6))
</script>

<style scoped>
.ability-outer-glow {
  animation: orbit-ability-pulse 1.8s ease-in-out infinite alternate;
}

.ability-inner-core {
  animation: orbit-core-pulse 0.85s ease-in-out infinite alternate;
}

@keyframes orbit-ability-pulse {
  from { opacity: 0.35; }
  to   { opacity: 1; }
}

@keyframes orbit-core-pulse {
  from { opacity: 0.65; }
  to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .ability-outer-glow,
  .ability-inner-core {
    animation: none;
    opacity: 0.7;
  }
}
</style>
