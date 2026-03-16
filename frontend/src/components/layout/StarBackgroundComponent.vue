<template>
  <div
    ref="starsContainer"
    class="stars"
    id="stars"
    v-show="!prefersReducedMotion"
    aria-hidden="true"
  >
    <canvas ref="starCanvas" class="star-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { useStarBackground } from '../../composables/useStarBackground'
import { usePlanetBackground } from '../../composables/usePlanetBackground'

const { starsContainer, starCanvas, prefersReducedMotion } = useStarBackground()
usePlanetBackground(starsContainer)
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

@keyframes galaxyLifecycle {
  0% {
    opacity: 0;
    filter: blur(3px) brightness(0.7) saturate(0.7);
    scale: 0.65;
    rotate: 0deg;
  }
  12% {
    opacity: 0.75;
    filter: blur(0.5px) brightness(1.15) saturate(1.4);
    scale: 1;
  }
  50% {
    opacity: 0.82;
    filter: blur(0.3px) brightness(1.2) saturate(1.5);
    scale: 1.04;
  }
  88% {
    opacity: 0.7;
    filter: blur(0.5px) brightness(1.1) saturate(1.3);
    scale: 1;
    rotate: var(--rot);
  }
  100% {
    opacity: 0;
    filter: blur(3px) brightness(0.6) saturate(0.6);
    scale: 0.7;
    rotate: var(--rot);
  }
}

@media (prefers-reduced-motion: reduce) {
  .galaxy {
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
  pointer-events: none; /* wird durch stars--rescue-active überschrieben */
  cursor: default;
  z-index: 4;
  animation: planetDistress 2s ease-in-out infinite !important;
  filter: drop-shadow(0 0 8px rgba(255, 120, 0, 0.7)) drop-shadow(0 0 18px rgba(255, 60, 0, 0.4));
}

@keyframes planetLifecycle {
  0% {
    opacity: 0;
    scale: 0.5;
  }
  10% {
    opacity: 0.9;
    scale: 1;
  }
  80% {
    opacity: 0.9;
    scale: 1;
  }
  100% {
    opacity: 0;
    scale: 0.8;
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
  z-index: 9999 !important;
  pointer-events: none !important; /* Container selbst bleibt pass-through */
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
</style>
