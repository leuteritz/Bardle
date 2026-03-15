<template>
  <div
    ref="starsContainer"
    class="stars"
    id="stars"
    v-show="!prefersReducedMotion"
    aria-hidden="true"
  ></div>
</template>

<script setup lang="ts">
import { useStarBackground } from '../../composables/useStarBackground'
const { starsContainer, prefersReducedMotion } = useStarBackground()
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

.star {
  position: absolute !important;
  border-radius: 50% !important;
  will-change: transform, opacity !important;
}

.star-connection {
  will-change: opacity;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 0.8;
  }
  80% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
  }
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
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
  .star,
  .star-connection,
  .galaxy {
    animation: none !important;
  }
}
</style>
