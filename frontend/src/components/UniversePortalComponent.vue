<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { formatNumber } from '../config/numberFormat'
const gameStore = useGameStore()
</script>

<template>
  <!-- Portal + Progress Einheit: zentriert unter GameCenter -->
  <div class="flex flex-col items-center w-full mt-2 group">
    <!-- Portal Unit: linker Char + Tube + rechter Char -->
    <div class="relative flex items-center w-full max-w-2xl mx-auto">
      <!-- Tube Hintergrund (absolut, zwischen den Chars) -->
      <div class="absolute left-[20%] right-[20%] inset-y-0 flex items-center z-0">
        <div class="relative w-full h-20 lg:h-28">
          <div class="absolute inset-0 rounded-full tube-bg"></div>
          <div
            class="absolute inset-y-0 left-0 transition-all duration-1000 rounded-full tube-fill"
            :style="{ width: gameStore.universeRescueProgress + '%' }"
          ></div>
          <!-- Chimes-to-Prestige Progress Overlay -->
          <div class="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
            <div
              class="h-full transition-all duration-700 ease-out"
              :style="{
                width: gameStore.universeRescueProgress + '%',
                background:
                  'linear-gradient(to right, rgba(52,211,153,0.35), rgba(74,222,128,0.55))',
                boxShadow: '0 0 18px rgba(52, 211, 153, 0.5), inset 0 0 10px rgba(52,211,153,0.2)',
              }"
            ></div>
          </div>
          <!-- Centered percentage label -->
          <div class="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span
              class="text-xl font-bold tabular-nums text-emerald-300 drop-shadow-lg"
              style="
                text-shadow:
                  0 0 8px rgba(52, 211, 153, 0.8),
                  0 1px 3px rgba(0, 0, 0, 0.9);
              "
            >
              {{ gameStore.universeRescueProgress.toFixed(1) }}% rescued
            </span>
          </div>
          <div class="absolute inset-0 rounded-full tube-highlight"></div>
          <div class="absolute h-1 rounded-full top-1 left-4 right-4 tube-shine"></div>
        </div>
      </div>

      <!-- Links: Charakter mit Portal-Effekt -->
      <div class="relative z-20 flex items-center justify-end flex-1">
        <img
          src="/img/BardPortalRichtig.png"
          alt="Game Character"
          class="relative z-30 w-24 h-24 lg:w-36 lg:h-36"
          loading="lazy"
        />
        <div class="absolute right-0 h-20 w-14 portal-effect lg:w-20 lg:h-28 lg:right-1">
          <div class="portal-glow"></div>
          <div class="portal-vortex"></div>
          <div class="portal-ring"></div>
        </div>
      </div>

      <!-- Mitte: Spacer für die Tube -->
      <div class="flex-1"></div>

      <!-- Rechts: Charakter mit Portal-Effekt -->
      <div class="relative z-20 flex items-center justify-start flex-1">
        <img
          src="/img/PortalEndeRichtig.png"
          alt="Game Character"
          class="relative z-30 w-24 h-24 lg:w-36 lg:h-36"
          loading="lazy"
        />
        <div class="absolute left-0 h-20 w-14 portal-effect lg:w-20 lg:h-28 lg:left-1">
          <div class="portal-glow"></div>
          <div class="portal-vortex"></div>
          <div class="portal-ring"></div>
        </div>
      </div>
    </div>

    <!-- Progressbar darunter -->
    <div class="flex flex-col items-center gap-1 mt-2">
      <p
        class="text-sm font-bold transition-opacity duration-200 opacity-0 text-violet-400/60 tabular-nums group-hover:opacity-100"
      >
        {{ formatNumber(gameStore.chimesForNextUniverse) }} /
        {{ formatNumber(gameStore.chimesToUniverseRescue) }} chimes to prestige
      </p>
      <button
        v-if="gameStore.prestigeAvailable"
        @click.stop="gameStore.triggerPrestige()"
        class="px-4 py-0.5 text-[11px] font-bold tracking-wide rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white animate-pulse hover:animate-none hover:from-violet-400 hover:to-indigo-400 transition-all duration-200"
      >
        🌌 Prestige!
      </button>
    </div>
  </div>
</template>

<style>
/* ── Portal Effect ── */
.portal-effect {
  border-radius: 50%;
  position: absolute;
  overflow: visible;
}

.portal-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 215, 0, 0.65) 0%,
    rgba(255, 180, 0, 0.38) 40%,
    rgba(180, 120, 0, 0.1) 70%,
    transparent 100%
  );
  filter: blur(14px);
  animation: portalPulse 3s ease-in-out infinite;
}

.portal-vortex {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 215, 0, 0.6),
    rgba(180, 130, 20, 0.2),
    rgba(255, 200, 50, 0.5),
    rgba(120, 80, 10, 0.15),
    rgba(255, 215, 0, 0.6)
  );

  mask-image: radial-gradient(
    ellipse at center,
    transparent 30%,
    black 50%,
    black 70%,
    transparent 90%
  );
  -webkit-mask-image: radial-gradient(
    ellipse at center,
    transparent 30%,
    black 50%,
    black 70%,
    transparent 90%
  );
}

.portal-vortex::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(40, 20, 5, 0.45) 0%,
    rgba(80, 50, 10, 0.35) 35%,
    rgba(180, 120, 20, 0.3) 60%,
    transparent 80%
  );
}

.portal-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  background:
    linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)) padding-box,
    linear-gradient(135deg, #ffd700, #b8860b, #ffd700, #daa520, #ffd700) border-box;
  box-shadow:
    0 0 15px 3px rgba(255, 215, 0, 0.65),
    inset 0 0 15px 3px rgba(255, 215, 0, 0.4),
    0 0 30px 6px rgba(255, 180, 0, 0.3);
  animation: portalPulse 3s ease-in-out infinite;
}

@keyframes portalPulse {
  0%,
  100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

/* Zylindrischer Tube Effekt — Portal-Stil (Gold/Amber) */
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
  border: 2px solid transparent;
  box-shadow:
    0 0 12px 2px rgba(255, 215, 0, 0.2),
    inset 0 0 15px 4px rgba(255, 215, 0, 0.08),
    inset 0 3px 10px rgba(0, 0, 0, 0.75),
    inset 0 -3px 10px rgba(0, 0, 0, 0.6);
}

.tube-fill {
  background: linear-gradient(
    to bottom,
    rgba(255, 210, 80, 0.22) 0%,
    rgba(255, 180, 0, 0.38) 30%,
    rgba(200, 120, 0, 0.45) 50%,
    rgba(255, 180, 0, 0.38) 70%,
    rgba(255, 210, 80, 0.22) 100%
  );
  box-shadow:
    0 0 20px rgba(255, 215, 0, 0.35),
    0 0 45px rgba(255, 180, 0, 0.15),
    inset 0 0 18px rgba(255, 215, 0, 0.15);
  overflow: hidden;
  animation: tubePulse 3s ease-in-out infinite;
}

/* Fließende Energie-Linien wie portal-vortex */
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
    rgba(255, 220, 100, 0.1) 0%,
    transparent 35%,
    transparent 65%,
    rgba(0, 0, 0, 0.2) 100%
  );
  pointer-events: none;
}

.tube-shine {
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 215, 0, 0.15) 20%,
    rgba(255, 235, 120, 0.25) 50%,
    rgba(255, 215, 0, 0.15) 80%,
    transparent
  );
}

@keyframes tubePulse {
  0%,
  100% {
    opacity: 0.85;
    box-shadow:
      0 0 20px rgba(255, 215, 0, 0.35),
      0 0 45px rgba(255, 180, 0, 0.15),
      inset 0 0 18px rgba(255, 215, 0, 0.15);
  }
  50% {
    opacity: 1;
    box-shadow:
      0 0 35px rgba(255, 215, 0, 0.5),
      0 0 70px rgba(255, 180, 0, 0.25),
      inset 0 0 28px rgba(255, 215, 0, 0.25);
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
