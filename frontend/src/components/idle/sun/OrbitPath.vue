<template>
  <defs>
    <filter :id="uid" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <!-- SourceGraphic entfernt → kein scharfer Strich mehr -->
      </feMerge>
    </filter>
  </defs>
  <g :filter="`url(#${uid})`">
    <ellipse
      :cx="x"
      :cy="y"
      :rx="rx"
      :ry="ry"
      :transform="`rotate(${tiltDeg}, ${x}, ${y})`"
      fill="none"
      :stroke="color"
      :stroke-opacity="opacity"
      :stroke-width="28 * strokeWidth"
    />
  </g>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue'

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
  }>(),
  { strokeWidth: 0.3, opacity: 0.2 },
)

const uid = `orbit-glow-${getCurrentInstance()!.uid}`
</script>
