<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { formatNumber } from '../config/numberFormat'

const gameStore = useGameStore()
</script>

<template>
  <div class="flex flex-col items-center w-full group">
    <div class="w-full max-w-lg mx-auto flex flex-col gap-0.5 px-3">
      <!-- Label + Prozent -->
      <div class="flex items-center justify-center px-0.5">
        <span
          class="text-2xl font-extrabold tabular-nums"
          style="
            color: rgba(255, 215, 0, 0.9);
            text-shadow:
              0 0 10px rgba(255, 200, 0, 0.5),
              0 1px 3px rgba(0, 0, 0, 0.85);
          "
        >
          {{ gameStore.universeRescueProgress.toFixed(1) }}%
        </span>
      </div>

      <!-- Progress Bar -->
      <div class="relative w-full h-8 overflow-hidden rounded-full">
        <!-- Leerer Hintergrund -->
        <div class="absolute inset-0 tube-bg"></div>

        <!-- Füllung: nur rechts runden, links clippt der Container -->
        <div
          class="absolute inset-y-0 left-0 transition-all duration-1000 rounded-r-full tube-fill"
          :style="{ width: gameStore.universeRescueProgress + '%' }"
        ></div>

        <!-- Shimmer über Füllung -->
        <div
          class="absolute inset-y-0 left-0 transition-all duration-700 ease-out pointer-events-none"
          :style="{
            width: gameStore.universeRescueProgress + '%',
            background: 'linear-gradient(to right, rgba(255,200,0,0.05), rgba(255,230,80,0.22))',
          }"
        ></div>

        <div class="absolute inset-0 pointer-events-none tube-highlight"></div>
        <div class="absolute h-0.5 top-1.5 left-3 right-3 tube-shine pointer-events-none"></div>
      </div>

      <!-- Prestige Button -->
      <div v-if="gameStore.prestigeAvailable" class="flex justify-center mt-0.5">
        <button
          @click.stop="gameStore.triggerPrestige()"
          class="px-4 py-0.5 text-[10px] font-bold tracking-wide rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white animate-pulse hover:animate-none hover:from-violet-400 hover:to-indigo-400 transition-all duration-200 shadow-[0_0_12px_rgba(139,92,246,0.45)]"
        >
          🌌 Prestige!
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Leere Bar: fast unsichtbar, nur ein feiner Goldrahmen */
.tube-bg {
  background-color: rgba(10, 5, 0, 0.18);
  border: 1.5px solid rgba(255, 215, 0, 0.2);
  box-shadow:
    0 0 6px 1px rgba(255, 215, 0, 0.06),
    inset 0 2px 6px rgba(0, 0, 0, 0.4);
}

/* Füllung: sattes Gold mit Glühen */
.tube-fill {
  background: linear-gradient(
    to bottom,
    rgba(255, 220, 100, 0.55) 0%,
    rgba(255, 185, 0, 0.85) 30%,
    rgba(210, 130, 0, 0.95) 50%,
    rgba(255, 185, 0, 0.85) 70%,
    rgba(255, 220, 100, 0.55) 100%
  );
  box-shadow:
    0 0 20px rgba(255, 215, 0, 0.45),
    0 0 45px rgba(255, 180, 0, 0.2),
    inset 0 0 16px rgba(255, 215, 0, 0.18);
  overflow: hidden;
  animation: tubePulse 3s ease-in-out infinite;
}

.tube-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    rgba(255, 215, 0, 0.12) 15px,
    rgba(255, 215, 0, 0.06) 25px,
    transparent 40px
  );
  animation: tubeFlow 2.5s linear infinite;
}

.tube-highlight {
  background: linear-gradient(
    to bottom,
    rgba(255, 220, 100, 0.06) 0%,
    transparent 35%,
    transparent 65%,
    rgba(0, 0, 0, 0.14) 100%
  );
}

.tube-shine {
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 215, 0, 0.1) 20%,
    rgba(255, 235, 120, 0.2) 50%,
    rgba(255, 215, 0, 0.1) 80%,
    transparent
  );
}

@keyframes tubePulse {
  0%,
  100% {
    opacity: 0.85;
    box-shadow:
      0 0 20px rgba(255, 215, 0, 0.4),
      0 0 45px rgba(255, 180, 0, 0.18),
      inset 0 0 16px rgba(255, 215, 0, 0.14);
  }
  50% {
    opacity: 1;
    box-shadow:
      0 0 32px rgba(255, 215, 0, 0.6),
      0 0 65px rgba(255, 180, 0, 0.28),
      inset 0 0 24px rgba(255, 215, 0, 0.24);
  }
}

@keyframes tubeFlow {
  from {
    background-position-x: 0px;
  }
  to {
    background-position-x: 80px;
  }
}
</style>
