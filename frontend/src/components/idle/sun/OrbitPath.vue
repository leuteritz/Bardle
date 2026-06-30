<template>
  <defs>
    <filter :id="uid" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
      </feMerge>
    </filter>

    <template v-if="abilityActive">
      <filter :id="uid + '-ability-outer'" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="blur2" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="44" result="blur3" />
        <feMerge>
          <feMergeNode in="blur3" />
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
        </feMerge>
      </filter>
      <filter :id="uid + '-ability-core'" x="-30%" y="-30%" width="160%" height="160%">
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
      :stroke-width="28 * strokeWidth * (currentSunRadius / 80)"
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
import { getCurrentInstance } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlanetShopStore } from '@/stores/planetShopStore'
import { HOVER_DIM_OPACITY } from '@/config/constants'

withDefaults(
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

const { currentSunRadius } = storeToRefs(usePlanetShopStore())
const uid = `orbit-glow-${getCurrentInstance()!.uid}`
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
