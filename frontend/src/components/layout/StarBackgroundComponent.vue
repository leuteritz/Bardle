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
/* Container der über den ganzen Bildschirm geht */
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

/* Aussehen der einzelnen Sterne */
.star {
  position: absolute !important;
  background: rgba(255, 255, 255, 0.95) !important;
  border-radius: 50% !important;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8) !important;
  will-change:
    transform, opacity !important;
  transform: translateZ(0) !important;
}

/* Optimierung für die Linien zwischen Sternen */
.star-connection {
  will-change: opacity;
}

/* Animation die Linien ein- und ausblendet */
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

/* Sterne bewegen sich von ihrer Startposition nach links raus */
@keyframes moveLeftStar {
  0% {
    left: var(--start-left);
  }
  100% {
    left: -10%;
  }
}

/* Sterne funkeln wie echte Sterne */
@keyframes twinkle {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

/* Schaltet alle Animationen aus wenn der Nutzer das will */
@media (prefers-reduced-motion: reduce) {
  .star {
    animation: none !important;
  }

  .star-connection {
    animation: none !important;
  }
}
</style>
