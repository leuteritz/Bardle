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
  background: radial-gradient(ellipse, rgba(88, 28, 135, 0.07) 0%, transparent 70%);
  animation: nebulaFloat1 90s ease-in-out infinite;
}
.nebula-2 {
  width: 700px;
  height: 550px;
  top: 40%;
  right: -5%;
  background: radial-gradient(ellipse, rgba(6, 78, 130, 0.06) 0%, transparent 70%);
  animation: nebulaFloat2 110s ease-in-out infinite;
}
.nebula-3 {
  width: 500px;
  height: 600px;
  bottom: -5%;
  left: 30%;
  background: radial-gradient(ellipse, rgba(14, 116, 144, 0.055) 0%, transparent 70%);
  animation: nebulaFloat3 80s ease-in-out infinite;
}
.nebula-4 {
  width: 450px;
  height: 450px;
  top: 20%;
  left: 45%;
  background: radial-gradient(ellipse, rgba(131, 24, 67, 0.05) 0%, transparent 70%);
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

/* ─── Planet Labels ────────────────────────────────────────────────────────── */

.planet-label {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: left center;
  pointer-events: none;
  z-index: 5;

  background: linear-gradient(135deg, rgba(8, 8, 32, 0.95) 0%, rgba(18, 10, 45, 0.92) 100%);

  border: 1px solid rgba(255, 165, 55, 0.55);
  border-radius: 4px;
  box-shadow:
    0 0 0 1px rgba(255, 160, 50, 0.08),
    0 0 14px rgba(255, 130, 30, 0.28),
    0 6px 28px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.07);

  padding: 8px 13px;
  min-width: 140px;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 4px;

  /* ✅ FIX: Kein transform in der Animation – JS-Positionierung bleibt unberührt */
  animation: labelFadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* ✅ FIX: position: absolute damit top/left/bottom/right greifen */
.planet-label::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: 11px;
  height: 11px;
  border-top: 2px solid rgba(255, 185, 80, 0.95);
  border-left: 2px solid rgba(255, 185, 80, 0.95);
  border-radius: 4px 0 0 0;
  pointer-events: none;
}

.planet-label::after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 11px;
  height: 11px;
  border-bottom: 2px solid rgba(255, 140, 50, 0.75);
  border-right: 2px solid rgba(255, 140, 50, 0.75);
  border-radius: 0 0 4px 0;
  pointer-events: none;
}

/* ✅ FIX: Kein transform – nur opacity + filter animieren */
@keyframes labelFadeIn {
  0% {
    opacity: 0;
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    filter: blur(0px);
  }
}

/* ── Name ── */
.planet-label__name {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.09em;
  text-transform: uppercase;

  color: rgba(255, 225, 180, 0.95);
  text-shadow: 0 0 6px rgba(255, 200, 130, 0.3);

  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255, 165, 50, 0.22);
  margin-bottom: 2px;
}

/* ── Material ── */
.planet-label__material {
  color: rgba(255, 215, 120, 0.95);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}

.planet-label__material img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: drop-shadow(0 0 4px rgba(255, 200, 100, 0.65));
}

/* ── Reward ── */
.planet-label__reward {
  color: rgba(120, 255, 185, 0.92);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.planet-label__reward::before {
  content: '✦';
  font-size: 9px;
  opacity: 0.75;
  color: rgba(100, 255, 165, 0.85);
}

/* ── Champion ── */
.planet-label__champion {
  color: rgba(195, 160, 255, 0.95);
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 500;
  padding-top: 4px;
  border-top: 1px solid rgba(180, 140, 255, 0.18);
  margin-top: 2px;
}

.planet-label__champion img {
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 50%;
  border: 1px solid rgba(190, 150, 255, 0.65);
  box-shadow: 0 0 7px rgba(160, 120, 255, 0.45);
}

@media (prefers-reduced-motion: reduce) {
  .planet-label {
    display: none;
  }
}
</style>
