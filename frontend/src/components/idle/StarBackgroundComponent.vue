<template>
  <div
    ref="starsContainer"
    class="stars"
    id="stars"
    v-show="!prefersReducedMotion"
    aria-hidden="true"
  >
    <div class="nebula nebula-1"></div>
    <div class="nebula nebula-2"></div>
    <div class="nebula nebula-3"></div>
    <div class="nebula nebula-4"></div>
    <canvas ref="starCanvas" class="star-canvas"></canvas>
    <PlanetLabelComponent
      v-for="[id, label] in planetLabels"
      :key="id"
      :style="{ transform: label.transform }"
      :bossName="label.bossName"
      :currentHP="label.currentHP"
      :maxHP="label.maxHP"
      :reward="label.reward"
      :materialImage="label.materialImage"
      :materialName="label.materialName"
      :championImage="label.championImage"
      :championName="label.championName"
      :isGalaxyBoss="label.isGalaxyBoss"
    />
  </div>
</template>

<script setup lang="ts">
import { useStarBackground } from '../../composables/useStarBackground'
import { usePlanetBackground } from '../../composables/usePlanetBackground'
import PlanetLabelComponent from './planet/PlanetLabelComponent.vue'

const { starsContainer, starCanvas, prefersReducedMotion } = useStarBackground()
const { planetLabels } = usePlanetBackground(starsContainer)
</script>

<style>
.stars {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important;
  z-index: 1 !important;
  overflow: hidden !important;
}

.star-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.galaxy {
  position: absolute;
  pointer-events: none;
  z-index: 2;
  will-change: transform, opacity, filter;
  mix-blend-mode: screen;
  filter: blur(0.5px) brightness(1.1) saturate(1.3);
}

@keyframes galaxyEnter {
  0% {
    opacity: 0;
    scale: 0.75;
    filter: blur(3px) brightness(0.8);
  }
  100% {
    opacity: 0.82;
    scale: 1;
    filter: blur(0.4px) brightness(1.15) saturate(1.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .galaxy {
    animation: none !important;
  }
}

/* ─── Nebula ──────────────────────────────────────────────────────────────── */

.nebula {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  mix-blend-mode: screen;
  will-change: transform;
}

.nebula-1 {
  width: 600px;
  height: 500px;
  top: -10%;
  left: 5%;
  background: radial-gradient(ellipse, var(--nebula-1-color, rgba(88, 28, 135, 0.07)) 0%, transparent 70%);
  animation: nebulaFloat1 90s ease-in-out infinite;
}
.nebula-2 {
  width: 700px;
  height: 550px;
  top: 40%;
  right: -5%;
  background: radial-gradient(ellipse, var(--nebula-2-color, rgba(6, 78, 130, 0.06)) 0%, transparent 70%);
  animation: nebulaFloat2 110s ease-in-out infinite;
}
.nebula-3 {
  width: 500px;
  height: 600px;
  bottom: -5%;
  left: 30%;
  background: radial-gradient(ellipse, var(--nebula-3-color, rgba(14, 116, 144, 0.055)) 0%, transparent 70%);
  animation: nebulaFloat3 80s ease-in-out infinite;
}
.nebula-4 {
  width: 450px;
  height: 450px;
  top: 20%;
  left: 45%;
  background: radial-gradient(ellipse, var(--nebula-4-color, rgba(131, 24, 67, 0.05)) 0%, transparent 70%);
  animation: nebulaFloat4 125s ease-in-out infinite;
}

@keyframes nebulaFloat1 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(4%, 6%) scale(1.08);
  }
  66% {
    transform: translate(-3%, 3%) scale(0.95);
  }
}
@keyframes nebulaFloat2 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  40% {
    transform: translate(-5%, -4%) scale(1.06);
  }
  70% {
    transform: translate(3%, -7%) scale(0.97);
  }
}
@keyframes nebulaFloat3 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(6%, -5%) scale(1.1);
  }
}
@keyframes nebulaFloat4 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  30% {
    transform: translate(-4%, 5%) scale(0.92);
  }
  60% {
    transform: translate(5%, 2%) scale(1.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nebula {
    animation: none !important;
  }
}

/* ─── Planets ─────────────────────────────────────────────────────────────── */

.planet {
  position: absolute;
  pointer-events: none;
  z-index: 2;
  will-change: transform, opacity, filter;
}

.planet--rescue {
  pointer-events: none;
  cursor: default;
  z-index: 4;
  animation: planetDistress 2s ease-in-out infinite !important;
  filter: drop-shadow(0 0 8px rgba(255, 120, 0, 0.7)) drop-shadow(0 0 18px rgba(255, 60, 0, 0.4));
}

.planet--rescue--galaxy {
  animation: planetDistressGalaxy 1.6s ease-in-out infinite !important;
  filter: drop-shadow(0 0 10px rgba(180, 60, 255, 0.85))
    drop-shadow(0 0 24px rgba(140, 20, 220, 0.55)) !important;
}

@keyframes planetLifecycle {
  0% {
    opacity: 0;
    scale: 0.05;
  }
  10% {
    opacity: 0.9;
  }
  80% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    scale: 2;
  }
}

@keyframes planetDistress {
  0%,
  100% {
    filter: drop-shadow(0 0 8px rgba(255, 120, 0, 0.7)) drop-shadow(0 0 18px rgba(255, 60, 0, 0.4));
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(255, 60, 0, 1)) drop-shadow(0 0 30px rgba(255, 80, 0, 0.6));
  }
}

@keyframes planetDistressGalaxy {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(180, 60, 255, 0.85))
      drop-shadow(0 0 24px rgba(140, 20, 220, 0.55));
  }
  50% {
    filter: drop-shadow(0 0 18px rgba(210, 80, 255, 1))
      drop-shadow(0 0 40px rgba(160, 40, 255, 0.75)) drop-shadow(0 0 60px rgba(100, 0, 200, 0.35));
  }
}

@keyframes planetExplode {
  0% {
    opacity: 1;
    scale: 1;
    filter: none;
  }
  30% {
    opacity: 0.85;
    scale: 1.5;
    filter: brightness(3) saturate(3);
  }
  100% {
    opacity: 0;
    scale: 2.2;
    filter: brightness(0.5);
  }
}

@keyframes planetSaved {
  0% {
    opacity: 1;
    scale: 1;
    filter: drop-shadow(0 0 8px rgba(100, 255, 150, 0.9));
  }
  50% {
    opacity: 0.9;
    scale: 1.25;
    filter: drop-shadow(0 0 28px rgba(100, 255, 150, 1))
      drop-shadow(0 0 55px rgba(200, 255, 210, 0.7));
  }
  100% {
    opacity: 0;
    scale: 1.6;
    filter: drop-shadow(0 0 4px rgba(100, 255, 150, 0.3));
  }
}

.stars--rescue-active {
  z-index: 100 !important;
  pointer-events: none !important;
}

.stars--rescue-active .planet--rescue {
  pointer-events: auto !important;
  cursor: pointer !important;
}

@media (prefers-reduced-motion: reduce) {
  .planet,
  .planet--rescue {
    animation: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .planet--rescue--galaxy {
    animation: none !important;
  }
}
</style>
