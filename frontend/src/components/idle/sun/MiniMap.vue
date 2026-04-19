<template>
  <Transition name="travel-fade">
    <div v-if="show" class="travel-hud">
      <div class="minimap-panel">
        <!-- ── Kopfzeile mit aktuellem Galaxienamen ── -->
        <div class="map-header">
          <div class="map-header-inner">
            <span class="map-header-title">{{ currentGalaxyName }}</span>
          </div>
          <div class="map-header-divider" />
        </div>

        <!-- ── Haupt-Canvas-Bereich ── -->
        <div class="map-canvas-wrapper">
          <MiniMapCanvas />

          <svg
            class="map-grid-overlay"
            viewBox="0 0 380 280"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="gridPat"
                x="0"
                y="0"
                width="38"
                height="28"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 38 0 L 0 0 0 28"
                  fill="none"
                  stroke="rgba(210,160,40,0.06)"
                  stroke-width="0.5"
                />
              </pattern>
              <radialGradient id="gridFade" cx="50%" cy="50%" r="50%">
                <stop offset="40%" stop-color="rgba(0,0,0,0)" />
                <stop offset="100%" stop-color="rgba(10,6,2,0.55)" />
              </radialGradient>
            </defs>
            <rect width="380" height="280" fill="url(#gridPat)" />
            <rect width="380" height="280" fill="url(#gridFade)" />
          </svg>

          <div v-if="!isRescuing" class="hud-eta">
            <span class="hud-eta-label">ANKUNFT</span>
            <span class="hud-eta-value">{{ countdown }}</span>
          </div>

          <div
            v-if="!galaxyStore.isComplete && !galaxyStore.isBossSearchActive"
            class="minimap-planet-count"
          >
            <span class="planet-count-icon">★</span>
            <span class="planet-count-text"
              >{{ galaxyStore.starsRescued }} / {{ galaxyStore.starsRequired }}</span
            >
          </div>

          <!-- Ressourcen-Stern nur noch als leuchtendes Icon, kein Text -->
          <div
            v-if="starGroupStore.hasActiveResourceStar"
            class="minimap-resource-star"
            aria-hidden="true"
          >
            ✦
          </div>

          <div v-if="galaxyStore.isBossSearchActive" class="minimap-search-label">???</div>

          <div
            v-if="
              galaxyStore.isComplete &&
              !galaxyStore.isGalaxyTransitioning &&
              !galaxyStore.pendingTransition
            "
            class="complete-overlay"
          >
            <div class="complete-glow-ring" />
            <span class="complete-badge">✦ Galaxie Befreit ✦</span>
            <button class="next-galaxy-btn" @click="galaxyStore.requestTransition()">
              » Nächste Galaxie «
            </button>
          </div>
        </div>
      </div>

      <svg
        class="panel-frame-svg"
        viewBox="0 0 440 440"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="goldGlow" x="-8%" y="-8%" width="116%" height="116%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M 0,0 L 220,0 A 218,218 0 0,1 438,220 L 438,352 A 14,14 0 0,1 440,380"
          fill="none"
          stroke="rgba(30,12,0,0.95)"
          stroke-width="5"
          stroke-linecap="square"
          stroke-linejoin="miter"
        />
        <path
          d="M 0,0 L 220,0 A 218,218 0 0,1 438,220 L 438,352 A 14,14 0 0,1 440,380"
          fill="none"
          stroke="#7a4e20"
          stroke-width="3"
          stroke-linecap="square"
          stroke-linejoin="miter"
        />
        <path
          d="M 0,0 L 220,0 A 218,218 0 0,1 438,220 L 438,352 A 14,14 0 0,1 440,380"
          fill="none"
          stroke="rgba(210,160,40,0.85)"
          stroke-width="1.5"
          stroke-linecap="square"
          stroke-linejoin="miter"
          filter="url(#goldGlow)"
        />
        <path
          d="M 0,0 L 220,0 A 218,218 0 0,1 438,220 L 438,352 A 14,14 0 0,1 440,380"
          fill="none"
          stroke="rgba(255,220,80,0.25)"
          stroke-width="1"
          stroke-linecap="square"
        />
      </svg>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { useStarGroupStore } from '../../../stores/starGroupStore'
import MiniMapCanvas from './MiniMapCanvas.vue'

export default defineComponent({
  name: 'MiniMap',
  components: { MiniMapCanvas },
  setup() {
    const galaxyStore = useGalaxyStore()
    const starGroupStore = useStarGroupStore()

    const show = computed(
      () =>
        ((galaxyStore.championTravelState === 'traveling' ||
          galaxyStore.championTravelState === 'champion_available' ||
          galaxyStore.championTravelState === 'champion_spawned') &&
          !galaxyStore.pendingGalaxyBoss &&
          !galaxyStore.isComplete) ||
        galaxyStore.isBossSearchActive ||
        galaxyStore.isGalaxyTransitioning ||
        galaxyStore.isComplete,
    )

    const isRescuing = computed(
      () =>
        galaxyStore.championTravelState === 'champion_available' ||
        galaxyStore.championTravelState === 'champion_spawned',
    )

    const countdown = computed(() => {
      const ms = galaxyStore.travelRemainingMs
      const s = Math.ceil(ms / 1000)
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      return `${m}:${String(sec).padStart(2, '0')}`
    })

    const currentGalaxyName = computed(() => `GALAXIE ${galaxyStore.currentGalaxy}`)

    return { show, isRescuing, countdown, currentGalaxyName, galaxyStore, starGroupStore }
  },
})
</script>

<style scoped>
.travel-fade-enter-active,
.travel-fade-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}
.travel-fade-enter-from,
.travel-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.travel-hud,
.travel-hud *,
.travel-hud *::before,
.travel-hud *::after {
  animation-play-state: running !important;
}

.travel-hud {
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 10000;
  pointer-events: none;
}

.minimap-panel {
  position: relative;
  pointer-events: auto;
  width: 440px;
  height: 440px;
  clip-path: path(
    'M 0,0 L 440,0 L 440,440 L 0,440 Z M 220,0 L 220,2 A 218,218 0 0,1 438,220 L 440,220 L 440,0 Z'
  );
  background:
    radial-gradient(ellipse at 20% 80%, rgba(60, 38, 8, 0.3) 0%, transparent 55%),
    linear-gradient(160deg, #1a0d04 0%, #120900 60%, #0e0700 100%);
  display: flex;
  flex-direction: column;
}

.map-header {
  flex-shrink: 0;
  padding: 14px 28px 0 20px;
}

.map-header-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.map-header-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #ffe080;
  text-shadow:
    0 0 14px rgba(232, 192, 64, 0.9),
    0 0 5px rgba(180, 130, 20, 0.7);
  text-transform: uppercase;
  user-select: none;
  text-align: center;
}

.map-header-divider {
  height: 1px;
  margin-top: 8px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(210, 160, 40, 0.45),
    rgba(210, 160, 40, 0.15),
    transparent
  );
}

.map-canvas-wrapper {
  flex: 1;
  position: relative;
  margin: 8px 8px 8px 8px;
  border-radius: 4px;
  overflow: visible;
  border: 1px solid rgba(210, 160, 40, 0.18);
  background: #050302;
}

.map-canvas-wrapper :deep(canvas),
.map-canvas-wrapper :deep(.minimap-canvas),
.map-canvas-wrapper
  :deep(
    > *:not(.map-grid-overlay):not(.hud-eta):not(.minimap-planet-count):not(
        .minimap-resource-star
      ):not(.minimap-search-label):not(.complete-overlay)
  ) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.map-grid-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.hud-eta {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  pointer-events: none;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  background: rgba(10, 6, 2, 0.82);
  border: 1px solid rgba(210, 160, 40, 0.22);
  border-radius: 4px;
  padding: 4px 8px 5px;
}

.hud-eta-label {
  font-size: 8px;
  letter-spacing: 2px;
  color: rgba(232, 192, 64, 0.55);
  font-family: Georgia, serif;
  text-transform: uppercase;
}

.hud-eta-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  line-height: 1;
  text-shadow:
    0 0 16px rgba(220, 175, 40, 0.95),
    0 0 6px rgba(180, 130, 20, 0.7),
    0 1px 3px rgba(0, 0, 0, 0.98);
}

.minimap-planet-count {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}

.planet-count-icon {
  font-size: 1rem;
  color: #ffe080;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.8);
}

.planet-count-text {
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffe484;
  letter-spacing: 0.14em;
  text-shadow:
    0 0 12px rgba(232, 192, 64, 0.9),
    0 1px 3px rgba(0, 0, 0, 0.98);
}

.minimap-resource-star {
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: #ffd060;
  pointer-events: none;
  z-index: 10;
  user-select: none;
  animation: resource-star-pulse 1.4s ease-in-out infinite;
  text-shadow:
    0 0 8px rgba(255, 200, 50, 0.9),
    0 0 14px rgba(255, 210, 80, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

@keyframes resource-star-pulse {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

.minimap-search-label {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.6rem;
  font-weight: 700;
  color: #b090ff;
  letter-spacing: 0.22em;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  user-select: none;
  animation: search-label-pulse 1s ease-in-out infinite alternate;
  text-shadow:
    0 0 14px rgba(150, 80, 255, 0.95),
    0 0 6px rgba(120, 60, 255, 0.75),
    0 1px 4px rgba(0, 0, 0, 0.98);
}

@keyframes search-label-pulse {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

.complete-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 6, 2, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  z-index: 5;
  pointer-events: auto;
}

.complete-glow-ring {
  position: absolute;
  inset: 16px;
  border-radius: 4px;
  border: 1px solid rgba(232, 192, 64, 0.15);
  box-shadow:
    inset 0 0 40px rgba(232, 192, 64, 0.08),
    0 0 30px rgba(232, 192, 64, 0.06);
  pointer-events: none;
  animation: complete-ring-pulse 2.5s ease-in-out infinite;
}

@keyframes complete-ring-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.complete-badge {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1rem;
  letter-spacing: 0.2em;
  color: #e8c040;
  text-transform: uppercase;
  text-shadow:
    0 0 14px rgba(232, 192, 64, 0.95),
    0 0 5px rgba(255, 210, 60, 0.7);
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

.next-galaxy-btn {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 5px;
  color: #fff;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  padding: 9px 20px;
  cursor: pointer;
  text-transform: uppercase;
  font-family: Georgia, serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  box-shadow: 0 2px 10px rgba(46, 122, 26, 0.55);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.next-galaxy-btn:hover {
  background: linear-gradient(to bottom, #66d040, #3a9a22);
  box-shadow: 0 0 16px rgba(82, 184, 48, 0.75);
  transform: translateY(-1px);
}

.next-galaxy-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(46, 122, 26, 0.4);
}

.panel-frame-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 440px;
  height: 440px;
  pointer-events: none;
  z-index: 100;
  overflow: visible;
  animation: minimap-pulse-glow 3.5s ease-in-out infinite;
}

@keyframes minimap-pulse-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(180, 130, 28, 0.45))
      drop-shadow(0 0 3px rgba(90, 58, 10, 0.65));
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(210, 160, 40, 0.65))
      drop-shadow(0 0 6px rgba(120, 82, 15, 0.75));
  }
}
</style>
