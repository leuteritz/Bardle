<template>
  <defs>
    <filter :id="uid" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
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
      :stroke-opacity="o1"
      :stroke-width="36 * strokeWidth"
    />
    <ellipse
      :cx="x"
      :cy="y"
      :rx="rx"
      :ry="ry"
      :transform="`rotate(${tiltDeg}, ${x}, ${y})`"
      fill="none"
      :stroke="color"
      :stroke-opacity="o2"
      :stroke-width="16 * strokeWidth"
    />
    <ellipse
      :cx="x"
      :cy="y"
      :rx="rx"
      :ry="ry"
      :transform="`rotate(${tiltDeg}, ${x}, ${y})`"
      fill="none"
      :stroke="color"
      :stroke-opacity="o3"
      :stroke-width="7 * strokeWidth"
    />
    <ellipse
      :cx="x"
      :cy="y"
      :rx="rx"
      :ry="ry"
      :transform="`rotate(${tiltDeg}, ${x}, ${y})`"
      fill="none"
      :stroke="color"
      :stroke-opacity="opacity"
      :stroke-width="2.5 * strokeWidth"
    />
  </g>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'

const props = withDefaults(
  defineProps<{
    /** CSS-Farbe der Umlaufbahn (z.B. `#ffffff`, `rgba(...)`) */
    color: string
    /** Mittelpunkt X in px */
    x: number
    /** Mittelpunkt Y in px */
    y: number
    /** X-Radius der Ellipse */
    rx: number
    /** Y-Radius der Ellipse */
    ry: number
    /** Neigungswinkel in Grad */
    tiltDeg: number
    /** Multiplikator für alle Strichbreiten (Standard: 1) */
    strokeWidth?: number
    /** Opacity der scharfen Außenlinie; innere Lagen skalieren proportional (Standard: 0.25) */
    opacity?: number
  }>(),
  { strokeWidth: 1, opacity: 0.2 },
)

const uid = `orbit-glow-${getCurrentInstance()!.uid}`

const BASE = 0.28
const o1 = computed(() => (0.04 / BASE) * props.opacity)
const o2 = computed(() => (0.1 / BASE) * props.opacity)
const o3 = computed(() => (0.22 / BASE) * props.opacity)
</script>
