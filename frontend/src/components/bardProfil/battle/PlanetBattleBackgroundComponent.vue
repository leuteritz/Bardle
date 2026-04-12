<template>
  <div class="absolute inset-0 z-0 pointer-events-none planet-battle-bg" aria-hidden="true">
    <div class="starfield" aria-hidden="true" />
    <div class="planet-sphere" :class="`planet-v${variant}`">
      <div class="planet-atmo" />
      <div class="planet-terrain" :class="`terrain-v${variant}`" />
      <div class="planet-cloud" />
      <div class="planet-highlight" />
      <div class="planet-rim" :class="`rim-v${variant}`" />
    </div>
    <div class="planet-halo" :class="`halo-v${variant}`" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'PlanetBattleBackgroundComponent',
  props: {
    variant: {
      type: Number,
      default: 0,
      validator: (v: number) => [0, 1, 2, 3, 4].includes(v),
    },
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   PLANET BATTLE BACKGROUND
   ═══════════════════════════════════════════ */
.planet-battle-bg {
  overflow: hidden;
  background: radial-gradient(ellipse at 22% 78%, #0b1424 0%, #05080e 100%);
}

/* ═══════════════════════════════════════════
   STARFIELD
   ═══════════════════════════════════════════ */
.starfield {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: starfieldTwinkle 9s ease-in-out infinite;
  background-image:
    radial-gradient(circle 1.2px at 16% 5%, rgba(255, 255, 255, 0.95) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 42% 15%, rgba(220, 235, 255, 0.9) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 72% 8%, rgba(255, 255, 255, 0.92) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 88% 22%, rgba(220, 235, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 28% 32%, rgba(255, 255, 255, 0.9) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 58% 42%, rgba(200, 220, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 85% 55%, rgba(255, 255, 255, 0.92) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 12% 65%, rgba(220, 235, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 38% 78%, rgba(255, 255, 255, 0.85) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 68% 68%, rgba(200, 220, 255, 0.9) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 92% 85%, rgba(255, 255, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 52% 92%, rgba(220, 235, 255, 0.85) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 8% 14%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 23% 8%, rgba(200, 215, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 38% 21%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 53% 11%, rgba(220, 230, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 68% 18%, rgba(255, 255, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 83% 8%, rgba(200, 215, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 97% 22%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 15% 38%, rgba(220, 230, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 30% 28%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 45% 42%, rgba(200, 215, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 60% 32%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 75% 45%, rgba(220, 230, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 90% 32%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 7% 58%, rgba(200, 215, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 22% 52%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 37% 62%, rgba(220, 230, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 52% 55%, rgba(255, 255, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 67% 65%, rgba(200, 215, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 82% 52%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 96% 62%, rgba(220, 230, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 18% 75%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 33% 85%, rgba(200, 215, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 48% 78%, rgba(255, 255, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 63% 88%, rgba(220, 230, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 78% 75%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 5% 8%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 13% 22%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 22% 5%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 31% 18%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 40% 11%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 49% 25%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 58% 7%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 67% 19%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 76% 13%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 85% 28%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 94% 6%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 3% 35%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 11% 42%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 20% 38%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 29% 48%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 38% 32%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 47% 45%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 56% 38%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 65% 48%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 74% 33%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 83% 45%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 92% 38%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 8% 55%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 17% 62%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 26% 58%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 35% 65%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 44% 52%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 53% 68%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 62% 55%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 71% 65%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 80% 58%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 89% 72%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 97% 55%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 4% 72%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 12% 78%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 21% 68%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 30% 82%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 39% 75%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 48% 88%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 57% 72%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 66% 85%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 75% 78%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 84% 92%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 93% 78%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 6% 95%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 25% 92%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 44% 97%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 63% 95%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 82% 97%, rgba(255, 255, 255, 0.42) 0%, transparent 100%);
}

/* ═══════════════════════════════════════════
   PLANET SPHERE
   ═══════════════════════════════════════════ */
.planet-sphere {
  position: absolute;
  width: 74%;
  aspect-ratio: 1;
  border-radius: 50%;
  bottom: -15%;
  left: -10%;
  background: radial-gradient(circle at 36% 30%, #2a4878, #0e1a3a, #060c1e);
}
.planet-v0 {
  background: radial-gradient(circle at 36% 30%, #2a4878 0%, #0e1a3a 45%, #060c1e 100%);
}
.planet-v1 {
  background: radial-gradient(circle at 36% 30%, #78340a 0%, #3a1404 45%, #160700 100%);
}
.planet-v2 {
  background: radial-gradient(circle at 36% 30%, #6e1010 0%, #2e0606 45%, #120202 100%);
}
.planet-v3 {
  background: radial-gradient(circle at 36% 30%, #0e4a1c 0%, #041e08 45%, #010a02 100%);
}
.planet-v4 {
  background: radial-gradient(circle at 36% 30%, #3c1260 0%, #180528 45%, #080010 100%);
}

.planet-atmo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 50% -5%, rgba(100, 160, 255, 0.22) 0%, transparent 55%);
  mix-blend-mode: screen;
}
.planet-terrain {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
}
.terrain-v0 {
  background:
    radial-gradient(ellipse 20% 13% at 44% 44%, rgba(15, 55, 110, 0.65) 0%, transparent 100%),
    radial-gradient(ellipse 14% 20% at 60% 54%, rgba(20, 70, 130, 0.55) 0%, transparent 100%),
    radial-gradient(ellipse 24% 11% at 34% 63%, rgba(10, 45, 90, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 11% 16% at 65% 36%, rgba(20, 40, 80, 0.45) 0%, transparent 100%);
}
.terrain-v1 {
  background:
    radial-gradient(ellipse 22% 12% at 42% 46%, rgba(120, 60, 10, 0.6) 0%, transparent 100%),
    radial-gradient(ellipse 13% 19% at 61% 52%, rgba(100, 40, 5, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 18% 10% at 35% 61%, rgba(80, 30, 8, 0.5) 0%, transparent 100%);
}
.terrain-v2 {
  background:
    radial-gradient(ellipse 18% 14% at 45% 45%, rgba(150, 20, 10, 0.6) 0%, transparent 100%),
    radial-gradient(ellipse 14% 18% at 62% 55%, rgba(120, 10, 5, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 20% 10% at 33% 62%, rgba(90, 15, 10, 0.5) 0%, transparent 100%);
}
.terrain-v3 {
  background:
    radial-gradient(ellipse 20% 13% at 44% 44%, rgba(15, 80, 25, 0.7) 0%, transparent 100%),
    radial-gradient(ellipse 14% 20% at 60% 54%, rgba(10, 65, 20, 0.6) 0%, transparent 100%),
    radial-gradient(ellipse 23% 11% at 34% 63%, rgba(20, 70, 15, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 11% 16% at 64% 37%, rgba(15, 55, 10, 0.5) 0%, transparent 100%);
}
.terrain-v4 {
  background:
    radial-gradient(ellipse 20% 13% at 44% 44%, rgba(70, 15, 110, 0.65) 0%, transparent 100%),
    radial-gradient(ellipse 14% 20% at 60% 54%, rgba(55, 10, 90, 0.55) 0%, transparent 100%),
    radial-gradient(ellipse 22% 11% at 34% 63%, rgba(80, 20, 100, 0.5) 0%, transparent 100%);
}
.planet-cloud {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  background:
    radial-gradient(ellipse 35% 5% at 55% 38%, rgba(255, 255, 255, 0.06) 0%, transparent 100%),
    radial-gradient(ellipse 25% 4% at 38% 56%, rgba(255, 255, 255, 0.04) 0%, transparent 100%);
  animation: cloudDrift 22s linear infinite;
}
.planet-highlight {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 26%, rgba(200, 230, 255, 0.1) 0%, transparent 42%);
}
.planet-rim {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  box-shadow:
    inset 0 0 40px rgba(60, 130, 255, 0.28),
    0 0 80px rgba(40, 100, 220, 0.24),
    0 0 160px rgba(30, 70, 180, 0.12);
  border: 1px solid rgba(80, 150, 255, 0.18);
}
.rim-v0 {
  box-shadow:
    inset 0 0 40px rgba(60, 130, 255, 0.28),
    0 0 80px rgba(40, 100, 220, 0.24),
    0 0 160px rgba(30, 70, 180, 0.12);
  border-color: rgba(80, 150, 255, 0.18);
}
.rim-v1 {
  box-shadow:
    inset 0 0 40px rgba(255, 130, 40, 0.28),
    0 0 80px rgba(220, 90, 20, 0.24),
    0 0 160px rgba(180, 60, 10, 0.12);
  border-color: rgba(255, 130, 60, 0.18);
}
.rim-v2 {
  box-shadow:
    inset 0 0 40px rgba(255, 60, 40, 0.3),
    0 0 80px rgba(220, 30, 20, 0.26),
    0 0 160px rgba(180, 10, 10, 0.14);
  border-color: rgba(255, 80, 60, 0.2);
}
.rim-v3 {
  box-shadow:
    inset 0 0 40px rgba(40, 200, 80, 0.28),
    0 0 80px rgba(20, 160, 50, 0.24),
    0 0 160px rgba(10, 120, 30, 0.12);
  border-color: rgba(60, 200, 80, 0.18);
}
.rim-v4 {
  box-shadow:
    inset 0 0 40px rgba(160, 60, 255, 0.3),
    0 0 80px rgba(120, 20, 220, 0.26),
    0 0 160px rgba(80, 0, 180, 0.14);
  border-color: rgba(160, 80, 255, 0.2);
}

/* ═══════════════════════════════════════════
   PLANET HALO
   ═══════════════════════════════════════════ */
.planet-halo {
  position: absolute;
  width: 86%;
  aspect-ratio: 1;
  border-radius: 50%;
  bottom: -28%;
  left: -16%;
  pointer-events: none;
  background: transparent;
}
.halo-v0 {
  box-shadow:
    0 0 100px 60px rgba(30, 80, 200, 0.12),
    0 0 200px 110px rgba(20, 60, 180, 0.07),
    0 0 320px 160px rgba(15, 45, 160, 0.04);
}
.halo-v1 {
  box-shadow:
    0 0 100px 60px rgba(200, 80, 20, 0.12),
    0 0 200px 110px rgba(180, 60, 10, 0.07),
    0 0 320px 160px rgba(160, 40, 5, 0.04);
}
.halo-v2 {
  box-shadow:
    0 0 100px 60px rgba(200, 20, 20, 0.14),
    0 0 200px 110px rgba(180, 10, 10, 0.08),
    0 0 320px 160px rgba(160, 5, 5, 0.05);
}
.halo-v3 {
  box-shadow:
    0 0 100px 60px rgba(20, 160, 50, 0.12),
    0 0 200px 110px rgba(10, 140, 30, 0.07),
    0 0 320px 160px rgba(5, 120, 20, 0.04);
}
.halo-v4 {
  box-shadow:
    0 0 100px 60px rgba(120, 30, 220, 0.14),
    0 0 200px 110px rgba(80, 0, 180, 0.08),
    0 0 320px 160px rgba(60, 0, 150, 0.05);
}

/* ═══════════════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════════════ */
@keyframes cloudDrift {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@keyframes starfieldTwinkle {
  0%,
  100% {
    opacity: 0.8;
  }
  25% {
    opacity: 1;
  }
  60% {
    opacity: 0.88;
  }
}

@media (prefers-reduced-motion: reduce) {
  .planet-cloud,
  .starfield {
    animation: none !important;
  }
}
</style>
