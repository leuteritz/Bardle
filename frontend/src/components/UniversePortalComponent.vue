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
          class="text-sm font-extrabold tabular-nums"
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
      <div class="relative w-full h-5">
        <div class="absolute inset-0 rounded-full tube-bg"></div>
        <div
          class="absolute inset-y-0 left-0 transition-all duration-1000 rounded-full tube-fill"
          :style="{ width: gameStore.universeRescueProgress + '%' }"
        ></div>
        <!-- Shimmer -->
        <div class="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
          <div
            class="h-full transition-all duration-700 ease-out"
            :style="{
              width: gameStore.universeRescueProgress + '%',
              background: 'linear-gradient(to right, rgba(255,200,0,0.08), rgba(255,230,80,0.18))',
            }"
          ></div>
        </div>
        <!-- Chimes-Text im Balken -->
        <div class="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <span
            class="text-[9px] font-bold tabular-nums tracking-wide"
            style="
              color: rgba(255, 230, 120, 0.92);
              text-shadow:
                0 0 7px rgba(255, 200, 0, 0.85),
                0 1px 3px rgba(0, 0, 0, 0.95);
            "
          >
            {{ formatNumber(gameStore.chimesForNextUniverse) }}
            <span class="opacity-50">/</span>
            {{ formatNumber(gameStore.chimesToUniverseRescue) }} chimes
          </span>
        </div>
        <div class="absolute inset-0 rounded-full pointer-events-none tube-highlight"></div>
        <div
          class="absolute h-0.5 rounded-full top-1 left-3 right-3 tube-shine pointer-events-none"
        ></div>
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
.tube-bg {
  background:
    linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.04) 0%,
        transparent 20%,
        transparent 80%,
        rgba(0, 0, 0, 0.25) 100%
      )
      padding-box,
    linear-gradient(135deg, #ffd700, #b8860b, #ffd700, #daa520, #ffd700) border-box;
  background-color: rgba(20, 10, 2, 0.55);
  border: 1.5px solid transparent;
  box-shadow:
    0 0 10px 2px rgba(255, 215, 0, 0.18),
    inset 0 0 12px 3px rgba(255, 215, 0, 0.06),
    inset 0 2px 8px rgba(0, 0, 0, 0.7),
    inset 0 -2px 8px rgba(0, 0, 0, 0.55);
}

.tube-fill {
  background: linear-gradient(
    to bottom,
    rgba(255, 210, 80, 0.2) 0%,
    rgba(255, 180, 0, 0.38) 30%,
    rgba(200, 120, 0, 0.44) 50%,
    rgba(255, 180, 0, 0.38) 70%,
    rgba(255, 210, 80, 0.2) 100%
  );
  box-shadow:
    0 0 16px rgba(255, 215, 0, 0.3),
    0 0 36px rgba(255, 180, 0, 0.12),
    inset 0 0 14px rgba(255, 215, 0, 0.12);
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
    rgba(255, 215, 0, 0.1) 15px,
    rgba(255, 215, 0, 0.05) 25px,
    transparent 40px
  );
  animation: tubeFlow 2.5s linear infinite;
}

.tube-highlight {
  background: linear-gradient(
    to bottom,
    rgba(255, 220, 100, 0.08) 0%,
    transparent 35%,
    transparent 65%,
    rgba(0, 0, 0, 0.18) 100%
  );
}

.tube-shine {
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 215, 0, 0.12) 20%,
    rgba(255, 235, 120, 0.22) 50%,
    rgba(255, 215, 0, 0.12) 80%,
    transparent
  );
}

@keyframes tubePulse {
  0%,
  100% {
    opacity: 0.85;
    box-shadow:
      0 0 16px rgba(255, 215, 0, 0.3),
      0 0 36px rgba(255, 180, 0, 0.12),
      inset 0 0 14px rgba(255, 215, 0, 0.12);
  }
  50% {
    opacity: 1;
    box-shadow:
      0 0 28px rgba(255, 215, 0, 0.45),
      0 0 55px rgba(255, 180, 0, 0.2),
      inset 0 0 22px rgba(255, 215, 0, 0.2);
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
