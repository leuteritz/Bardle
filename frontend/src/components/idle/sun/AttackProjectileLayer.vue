<!-- frontend/src/components/idle/sun/AttackProjectileLayer.vue -->
<template>
  <Teleport to="body">
    <svg class="projectile-layer" aria-hidden="true">
      <defs>
        <filter :id="filterId" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g v-for="shot in shots" :key="shot.id">
        <!-- Strahl-Schweif -->
        <line
          :x1="shot.tailX"
          :y1="shot.tailY"
          :x2="shot.headX"
          :y2="shot.headY"
          :stroke="shot.trailColor ?? '#cc4444'"
          stroke-width="2"
          :stroke-opacity="shot.opacity * 0.7"
          stroke-linecap="round"
          :filter="`url(#${filterId})`"
        />
        <!-- Leuchtende Spitze -->
        <circle
          :cx="shot.headX"
          :cy="shot.headY"
          r="4.5"
          :fill="shot.headColor ?? '#ff7777'"
          :opacity="shot.opacity"
          :filter="`url(#${filterId})`"
        />
      </g>
    </svg>
  </Teleport>
</template>

<script setup lang="ts">
import type { ProjectileShot } from '@/composables/useProjectileSystem'

// Eindeutige Filter-ID pro Instanz – verhindert ID-Kollision wenn
// PlanetOrbit und ChampionOrbit gleichzeitig je eine Instanz rendern.
const filterId = `proj-glow-${Math.random().toString(36).slice(2, 7)}`

defineProps<{ shots: ProjectileShot[] }>()
</script>

<style scoped>
.projectile-layer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 55;
  overflow: visible;
}
</style>
