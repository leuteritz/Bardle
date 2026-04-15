<template>
  <!-- ① Back-Layer: Sterne + Planeten HINTER der Sonne (z-index 3) -->
  <Teleport to="body">
    <div class="star-sys-layer star-sys-back" aria-hidden="true">
      <template v-for="star in backStars" :key="star.id">
        <div
          class="star-body"
          :class="`star-body--${star.starType}`"
          :style="starBodyStyle(star)"
        />
        <PlanetComponent
          v-for="p in star.planets.filter((p) => p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="true"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
        />
      </template>
      <!-- Front-Stars' behind-planets also go in back layer -->
      <template v-for="star in frontStars" :key="'fb-' + star.id">
        <PlanetComponent
          v-for="p in star.planets.filter((p) => p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="true"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
        />
      </template>
    </div>
  </Teleport>

  <!-- ② Front-Layer: Sterne + Planeten VOR der Sonne (z-index 7) -->
  <Teleport to="body">
    <div class="star-sys-layer star-sys-front" aria-hidden="true">
      <template v-for="star in frontStars" :key="star.id">
        <div
          class="star-body"
          :class="`star-body--${star.starType}`"
          :style="starBodyStyle(star)"
        />
        <PlanetComponent
          v-for="p in star.planets.filter((p) => !p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="true"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="p.labelData"
          :animState="p.animState"
        />
      </template>
      <!-- Back-Stars' front-positioned planets go here for correct depth -->
      <template v-for="star in backStars" :key="'ff-' + star.id">
        <PlanetComponent
          v-for="p in star.planets.filter((p) => !p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="true"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="p.labelData"
          :animState="p.animState"
        />
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStarSystem } from '../../../composables/useStarSystem'
import type { StarRenderEntry } from '../../../composables/useStarSystem'
import PlanetComponent from '../planet/PlanetComponent.vue'

const { starRenders } = useStarSystem()

const backStars = computed(() => starRenders.value.filter((s) => s.isBehind))
const frontStars = computed(() => starRenders.value.filter((s) => !s.isBehind))

function starBodyStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  return {
    transform: `translate(${star.x - s / 2}px, ${star.y - s / 2}px) scale(${star.scale.toFixed(4)})`,
    opacity: String(star.opacity.toFixed(3)),
    width: `${s}px`,
    height: `${s}px`,
  }
}

function starSize(type: string): number {
  if (type === 'galaxy_boss') return 40
  if (type === 'champion') return 34
  return 28
}
</script>

<style scoped>
/* ── Layer containers ──────────────────────────────────────────────────────── */
.star-sys-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.star-sys-back  { z-index: 3; }
.star-sys-front { z-index: 7; }

/* ── Star body ─────────────────────────────────────────────────────────────── */
.star-body {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  will-change: transform, opacity;
  animation: star-pulse 2.8s ease-in-out infinite;
}

/* Champion star — gold */
.star-body--champion {
  background: radial-gradient(circle, #ffe8a0 0%, #d4a020 45%, #7a4808 100%);
  box-shadow:
    0 0 14px rgba(255, 200, 60, 0.9),
    0 0 32px rgba(220, 140, 20, 0.6),
    0 0 56px rgba(180, 100, 10, 0.3);
}
.star-body--champion::after {
  content: '';
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  border: 1px solid rgba(255, 200, 60, 0.35);
  animation: corona-spin 18s linear infinite;
}

/* Resource star — teal */
.star-body--resource {
  background: radial-gradient(circle, #a0ffe8 0%, #18c0a8 45%, #085848 100%);
  box-shadow:
    0 0 12px rgba(40, 220, 190, 0.9),
    0 0 26px rgba(20, 180, 150, 0.55),
    0 0 46px rgba(10, 130, 110, 0.28);
}
.star-body--resource::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px solid rgba(40, 220, 190, 0.32);
  animation: corona-spin 24s linear infinite;
}

/* Galaxy boss star — purple / ominous */
.star-body--galaxy_boss {
  background: radial-gradient(circle, #ffa0e8 0%, #c030b0 45%, #4a0838 100%);
  box-shadow:
    0 0 18px rgba(220, 60, 200, 0.95),
    0 0 38px rgba(180, 40, 160, 0.65),
    0 0 70px rgba(120, 20, 100, 0.35);
  animation: star-pulse 1.6s ease-in-out infinite;
}
.star-body--galaxy_boss::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 1.5px solid rgba(220, 80, 220, 0.55);
  box-shadow:
    0 0 10px rgba(200, 60, 200, 0.3),
    inset 0 0 10px rgba(200, 60, 200, 0.15);
  animation: corona-spin 12s linear infinite;
}

@keyframes star-pulse {
  0%, 100% { filter: brightness(1) saturate(1);    }
  50%       { filter: brightness(1.18) saturate(1.2); }
}

@keyframes corona-spin {
  from { transform: rotate(0deg);   }
  to   { transform: rotate(360deg); }
}
</style>
