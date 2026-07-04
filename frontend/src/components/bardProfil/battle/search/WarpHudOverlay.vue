<template>
  <div class="warp-hud">
    <!-- Top-left: warp drive + remaining distance -->
    <div class="hud-corner hud-corner--left">
      <div class="hud-eyebrow">WARP DRIVE</div>
      <div class="hud-value">ENGAGED · {{ remainingLy.toFixed(1) }} ly</div>
    </div>

    <!-- Top-right: velocity -->
    <div class="hud-corner hud-corner--right">
      <div class="hud-eyebrow">VELOCITY</div>
      <div class="hud-value">{{ velocity.toFixed(2) }} c</div>
    </div>

    <!-- Bottom status -->
    <div class="hud-bottom">
      <img src="/img/planet.png" alt="Planet" class="hud-planet" />
      <div class="hud-status">SEARCHING THE VOID<span class="hud-dots">…</span></div>
      <div class="hud-sub">LOCATING NEXT ARENA · SUMMONER'S RIFT INBOUND</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  WARP_DISTANCE_LY_MIN,
  WARP_DISTANCE_LY_MAX,
  WARP_VELOCITY_C_MIN,
  WARP_VELOCITY_C_MAX,
  WARP_HUD_UPDATE_MS,
  PLANET_SEARCH_ANIM_DURATION_MS,
} from '@/config/constants'

const totalLy =
  WARP_DISTANCE_LY_MIN + Math.random() * (WARP_DISTANCE_LY_MAX - WARP_DISTANCE_LY_MIN)
const remainingLy = ref(totalLy)
const velocity = ref(WARP_VELOCITY_C_MIN)

let hudTimer: ReturnType<typeof setInterval> | null = null
const startedAt = Date.now()

onMounted(() => {
  hudTimer = setInterval(() => {
    const progress = Math.min(1, (Date.now() - startedAt) / PLANET_SEARCH_ANIM_DURATION_MS)
    remainingLy.value = totalLy * (1 - progress)
    // ease velocity up, then brake near arrival
    const curve = progress < 0.7 ? progress / 0.7 : 1 - ((progress - 0.7) / 0.3) * 0.4
    velocity.value =
      WARP_VELOCITY_C_MIN + (WARP_VELOCITY_C_MAX - WARP_VELOCITY_C_MIN) * Math.max(0, curve)
  }, WARP_HUD_UPDATE_MS)
})

onBeforeUnmount(() => {
  if (hudTimer) clearInterval(hudTimer)
})
</script>

<style scoped>
.warp-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.hud-corner {
  position: absolute;
  top: 18px;
  line-height: 1.5;
}
.hud-corner--left { left: 22px; }
.hud-corner--right {
  right: 22px;
  text-align: right;
}

.hud-eyebrow {
  font-size: 11px;
  letter-spacing: 4px;
  color: rgba(160, 200, 255, 0.5);
}

.hud-value {
  font-size: 17px;
  color: #a0c8ff;
  text-shadow: 0 0 12px rgba(100, 165, 255, 0.6);
  font-variant-numeric: tabular-nums;
}

.hud-bottom {
  position: absolute;
  bottom: 46px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.hud-planet {
  width: 44px;
  height: 44px;
  filter: drop-shadow(0 0 20px rgba(100, 165, 255, 0.8));
  animation: planet-bob 1.4s ease-in-out infinite;
}

.hud-status {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 6px;
  color: #a0c8ff;
  text-shadow: 0 0 16px rgba(100, 165, 255, 0.9), 0 0 32px rgba(100, 165, 255, 0.5);
}

.hud-dots {
  animation: dots-blink 1.2s steps(1) infinite;
}

.hud-sub {
  font-size: 12px;
  letter-spacing: 3px;
  color: rgba(160, 200, 255, 0.5);
}

@keyframes planet-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes dots-blink {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .hud-planet, .hud-dots { animation: none; }
}
</style>
