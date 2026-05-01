<!-- frontend/src/components/idle/sun/AttackProjectileLayer.vue -->
<template>
  <Teleport to="body">
    <svg class="projectile-layer" aria-hidden="true">
      <defs>
        <!-- Haupt-Glüh-Filter (stärker, mehrschichtig) -->
        <filter :id="filterId" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Sanfter Halo-Filter für den äußeren Aureolen-Ring -->
        <filter :id="`${filterId}-halo`" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="6" result="haloBlur" />
          <feColorMatrix
            in="haloBlur"
            type="matrix"
            values="1 0 0 0 0
                    0 0.4 0 0 0
                    0 0 0.2 0 0
                    0 0 0 0.6 0"
            result="coloredHalo"
          />
          <feMerge>
            <feMergeNode in="coloredHalo" />
          </feMerge>
        </filter>

        <!-- Intensiver Kern-Filter -->
        <filter :id="`${filterId}-core`" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.5" result="coreBlur" />
          <feMerge>
            <feMergeNode in="coreBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Linearer Verlauf für den Schweif -->
        <linearGradient
          v-for="shot in shots"
          :key="`grad-${shot.id}`"
          :id="`${filterId}-trail-${shot.id}`"
          gradientUnits="userSpaceOnUse"
          :x1="shot.tailX"
          :y1="shot.tailY"
          :x2="shot.headX"
          :y2="shot.headY"
        >
          <stop offset="0%" stop-color="transparent" stop-opacity="0" />
          <stop offset="40%" :stop-color="shot.trailColor ?? '#cc4444'" stop-opacity="0.15" />
          <stop
            offset="100%"
            :stop-color="shot.trailColor ?? '#cc4444'"
            :stop-opacity="shot.opacity * 0.85"
          />
        </linearGradient>
      </defs>

      <g v-for="shot in shots" :key="shot.id">
        <!-- Äußerer Halo (breite, weiche Aureole) -->
        <line
          :x1="shot.tailX"
          :y1="shot.tailY"
          :x2="shot.headX"
          :y2="shot.headY"
          :stroke="shot.trailColor ?? '#cc4444'"
          stroke-width="10"
          :stroke-opacity="shot.opacity * 0.18"
          stroke-linecap="round"
          :filter="`url(#${filterId}-halo)`"
        />

        <!-- Mittlerer Schweif mit Farbverlauf -->
        <line
          :x1="shot.tailX"
          :y1="shot.tailY"
          :x2="shot.headX"
          :y2="shot.headY"
          :stroke="`url(#${filterId}-trail-${shot.id})`"
          stroke-width="5"
          :stroke-opacity="shot.opacity * 0.9"
          stroke-linecap="round"
          :filter="`url(#${filterId})`"
        />

        <!-- Innerer heller Schweif-Kern -->
        <line
          :x1="shot.tailX"
          :y1="shot.tailY"
          :x2="shot.headX"
          :y2="shot.headY"
          stroke="white"
          stroke-width="1.5"
          :stroke-opacity="shot.opacity * 0.55"
          stroke-linecap="round"
          :filter="`url(#${filterId}-core)`"
        />

        <!-- Äußerer Glühring (großer Halo um die Spitze) -->
        <circle
          :cx="shot.headX"
          :cy="shot.headY"
          r="14"
          :fill="shot.headColor ?? '#ff7777'"
          :opacity="shot.opacity * 0.2"
          :filter="`url(#${filterId}-halo)`"
        />

        <!-- Mittlere Glühschicht -->
        <circle
          :cx="shot.headX"
          :cy="shot.headY"
          r="9"
          :fill="shot.headColor ?? '#ff7777'"
          :opacity="shot.opacity * 0.55"
          :filter="`url(#${filterId})`"
        />

        <!-- Heller Innenkern -->
        <circle
          :cx="shot.headX"
          :cy="shot.headY"
          r="5"
          :fill="shot.headColor ?? '#ff7777'"
          :opacity="shot.opacity"
          :filter="`url(#${filterId})`"
        />

        <!-- Weißer Glanzpunkt (Spitzlichter für Kristall-/Magie-Effekt) -->
        <circle
          :cx="shot.headX"
          :cy="shot.headY"
          r="2"
          fill="white"
          :opacity="shot.opacity * 0.9"
          :filter="`url(#${filterId}-core)`"
        />

        <!-- Kleine Funken-Spitzen (Kreuz-Glanzlichter) -->
        <line
          :x1="shot.headX - 7"
          :y1="shot.headY"
          :x2="shot.headX + 7"
          :y2="shot.headY"
          stroke="white"
          stroke-width="1"
          :stroke-opacity="shot.opacity * 0.6"
          stroke-linecap="round"
          :filter="`url(#${filterId}-core)`"
        />
        <line
          :x1="shot.headX"
          :y1="shot.headY - 7"
          :x2="shot.headX"
          :y2="shot.headY + 7"
          stroke="white"
          stroke-width="1"
          :stroke-opacity="shot.opacity * 0.6"
          stroke-linecap="round"
          :filter="`url(#${filterId}-core)`"
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
