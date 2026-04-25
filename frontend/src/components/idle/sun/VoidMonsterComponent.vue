<template>
  <!-- Orbit-Arc Layer (über Sonne, z-index 6) -->
  <Teleport to="body">
    <svg class="void-orbit-arcs" :viewBox="`0 0 ${screenW} ${screenH}`" aria-hidden="true">
      <defs>
        <filter id="orbit-blur-void" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <ellipse
        v-for="m in monsterRenders"
        :key="'arc-' + m.id"
        :cx="screenCx"
        :cy="screenCy"
        :rx="m.orbitRx"
        :ry="m.orbitRy"
        :transform="`rotate(${(m.orbitTilt * 180) / Math.PI} ${screenCx} ${screenCy})`"
        stroke="#9922ff"
        :stroke-opacity="m.hintOpacity * 0.7"
        filter="url(#orbit-blur-void)"
        fill="none"
        stroke-width="4"
      />
    </svg>
  </Teleport>

  <!-- Monster-Bodies: Back-Layer (hinter Sonne, z-index 4) -->
  <Teleport to="body">
    <div class="void-monster-layer void-monster-back" aria-hidden="true">
      <div
        v-for="m in monsterRenders.filter((m) => m.isBehind)"
        :key="m.id"
        class="void-monster-pos"
        :style="{
          transform: `translate(${m.x}px, ${m.y}px) translate(-50%, -50%) scale(${m.scale})`,
          opacity: m.opacity,
        }"
      >
        <div class="void-monster void-monster--behind">
          <img :src="m.bossImage" alt="" class="void-monster-img" draggable="false" />
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Monster-Bodies: Front-Layer (vor Sonne, z-index 8) -->
  <Teleport to="body">
    <div class="void-monster-layer void-monster-front" aria-hidden="true">
      <div
        v-for="m in monsterRenders.filter((m) => !m.isBehind)"
        :key="m.id"
        class="void-monster-pos"
        :style="{
          transform: `translate(${m.x}px, ${m.y}px) translate(-50%, -50%) scale(${m.scale})`,
          opacity: m.opacity,
        }"
      >
        <div class="void-monster">
          <img :src="m.bossImage" alt="" class="void-monster-img" draggable="false" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useVoidMonster } from '../../../composables/useVoidMonster'

export default defineComponent({
  name: 'VoidMonsterComponent',
  setup() {
    const { monsterRenders } = useVoidMonster()

    const screenW = window.innerWidth
    const screenH = window.innerHeight
    const screenCx = screenW / 2
    const screenCy = screenH / 2

    return { monsterRenders, screenW, screenH, screenCx, screenCy }
  },
})
</script>

<style scoped>
.void-orbit-arcs {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 6;
  pointer-events: none;
  overflow: visible;
}

.void-monster-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

/* Back = unter Sonne (z-index 4), Front = über Sonne (z-index 8) */
.void-monster-back  { z-index: 4; }
.void-monster-front { z-index: 8; }

/* Wrapper: nur Positionierung – KEINE Animation */
.void-monster-pos {
  position: fixed;
  left: 0;
  top: 0;
  width: 44px;
  height: 44px;
  pointer-events: none;
  will-change: transform, opacity;
}

/* Inneres Div: scale-Animation */
.void-monster {
  width: 100%;
  height: 100%;
  animation: void-pulse 1.8s ease-in-out infinite;
}

/* Bild: kein Rahmen, kein runder Ausschnitt, Glow via drop-shadow */
.void-monster-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  animation: void-glow 1.8s ease-in-out infinite;
}

.void-monster--behind {
  filter: blur(2.5px) brightness(0.7) saturate(0.55);
  transition: filter 0.25s ease;
}

@keyframes void-pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.05); }
}

@keyframes void-glow {
  0%, 100% {
    filter: drop-shadow(0 0 6px #7700ff) drop-shadow(0 0 14px #5500cc);
  }
  50% {
    filter: drop-shadow(0 0 12px #9922ff) drop-shadow(0 0 24px #7700ee);
  }
}
</style>
