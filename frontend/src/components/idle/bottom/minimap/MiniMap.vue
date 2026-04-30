<template>
  <Transition name="travel-fade">
    <div v-if="show" class="travel-hud">
      <div class="minimap-panel">
        <div class="map-canvas-wrapper">
          <MiniMapCanvas />

          <svg
            class="map-grid-overlay"
            viewBox="0 0 440 440"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="gridPat"
                x="0"
                y="0"
                width="44"
                height="44"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 44 0 L 0 0 0 44"
                  fill="none"
                  stroke="rgba(210,160,40,0.05)"
                  stroke-width="0.5"
                />
              </pattern>
              <radialGradient id="gridFade" cx="50%" cy="50%" r="50%">
                <stop offset="40%" stop-color="rgba(0,0,0,0)" />
                <stop offset="100%" stop-color="rgba(10,6,2,0.55)" />
              </radialGradient>
            </defs>
            <rect width="440" height="440" fill="url(#gridPat)" />
            <rect width="440" height="440" fill="url(#gridFade)" />
          </svg>

          <!-- ── Sterne-Zähler unten mittig ── -->
          <div
            v-if="!galaxyStore.isComplete && !galaxyStore.isBossSearchActive"
            class="minimap-planet-count"
          >
            <span class="planet-count-icon">★</span>
            <span class="planet-count-text"
              >{{ galaxyStore.starsRescued }} / {{ galaxyStore.starsRequired }}</span
            >
          </div>

          <!-- ── HUD-Panel: Ankunft · Entfernung · Tempo ── -->
          <div v-if="!isRescuing" class="hud-panel">
            <div class="hud-metric hud-metric--arrival">
              <span class="hud-metric-label">ANKUNFT</span>
              <span class="hud-metric-value">{{ countdown }}</span>
            </div>

            <template v-if="isTraveling">
              <div class="hud-metric hud-metric--dist">
                <span class="hud-metric-label">ENTF. · LJ</span>
                <span class="hud-metric-value">{{ remainingDistDisplay }}</span>
              </div>
              <div class="hud-metric hud-metric--speed">
                <span class="hud-metric-label">TEMPO · LJ/s</span>
                <span class="hud-metric-value">{{ speedDisplay }}</span>
              </div>
            </template>
          </div>

          <!-- ── Boss-Suche Label ── -->
          <div v-if="galaxyStore.isBossSearchActive" class="minimap-search-label">???</div>

          <!-- ── Galaxie abgeschlossen ── -->
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

      <!-- ── Dekorativer Rahmen mit goldener Linie ── -->
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
          :d="framePath"
          fill="none"
          stroke="rgba(30,12,0,0.95)"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          :d="framePath"
          fill="none"
          stroke="#7a4e20"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          :d="framePath"
          fill="none"
          stroke="rgba(210,160,40,0.85)"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#goldGlow)"
        />
        <path
          :d="framePath"
          fill="none"
          stroke="rgba(255,220,80,0.25)"
          stroke-width="1"
          stroke-linecap="round"
        />
      </svg>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useGalaxyStore } from '../../../../stores/galaxyStore'
import { useStarGroupStore } from '../../../../stores/starGroupStore'
import {
  CHAMPION_TRAVEL_BASE_LY,
  CHAMPION_TRAVEL_LY_PER_GALAXY,
} from '../../../../config/constants'
import MiniMapCanvas from './MiniMapCanvas.vue'

const CORNER_R = 20

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
        galaxyStore.pendingGalaxyBoss ||
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

    const isTraveling = computed(() => galaxyStore.championTravelState === 'traveling')

    const totalDistanceLY = computed(
      () =>
        CHAMPION_TRAVEL_BASE_LY + (galaxyStore.currentGalaxy - 1) * CHAMPION_TRAVEL_LY_PER_GALAXY,
    )

    const remainingDistanceLY = computed(
      () => totalDistanceLY.value * (1 - galaxyStore.travelProgressPercent / 100),
    )

    const speedLJperS = computed(() => {
      const remainingSec = galaxyStore.travelRemainingMs / 1000
      if (remainingSec < 0.5) return 0
      return remainingDistanceLY.value / remainingSec
    })

    // Nur die Zahl – Einheit steht im Label
    const remainingDistDisplay = computed(() => {
      const v = remainingDistanceLY.value
      return v >= 100 ? `${Math.round(v)}` : `${v.toFixed(1)}`
    })

    // Nur die Zahl – Einheit steht im Label
    const speedDisplay = computed(() => speedLJperS.value.toFixed(1))

    const framePath = `M 0,0 L 220,0 A 218,218 0 0,1 438,220 L 438,${380 - CORNER_R} A ${CORNER_R},${CORNER_R} 0 0,0 ${438 + CORNER_R},380`

    return {
      show,
      isRescuing,
      isTraveling,
      countdown,
      remainingDistDisplay,
      speedDisplay,
      galaxyStore,
      starGroupStore,
      framePath,
    }
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
  clip-path: path('M 0,0 L 220,0 A 220,220 0 0,1 440,220 L 440,440 L 0,440 Z');
  background:
    radial-gradient(ellipse at 20% 80%, rgba(60, 38, 8, 0.3) 0%, transparent 55%),
    linear-gradient(160deg, #1a0d04 0%, #120900 60%, #0e0700 100%);
  display: flex;
  flex-direction: column;
}

.map-canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #050302;
  clip-path: path('M 0,0 L 220,0 A 220,220 0 0,1 440,220 L 440,440 L 0,440 Z');
}

.map-canvas-wrapper :deep(canvas),
.map-canvas-wrapper :deep(.minimap-canvas) {
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

/* ── Sterne-Zähler ── */
.minimap-planet-count {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  background: rgba(10, 6, 2, 0.72);
  border: 1px solid rgba(210, 160, 40, 0.22);
  border-radius: 20px;
  padding: 4px 14px 5px;
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

/* ═══════════════════════════════════════════════
   HUD-Panel
   ═══════════════════════════════════════════════ */
.hud-panel {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 10;
  pointer-events: none;
  user-select: none;

  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 24px; /* gleichmäßiger Abstand zwischen allen drei Metriken */

  padding: 4px 0;

  animation: hud-panel-fadein 0.4s ease both;
}

@keyframes hud-panel-fadein {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Basis-Metrik */
.hud-metric {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  overflow: hidden;
}

/* Feste Breiten je nach maximalem Wert (ohne Einheit) */
/* ANKUNFT: max "9:59:59" */
.hud-metric--arrival {
  width: 60px;
}

/* ENTF.: max "9999" (Einheit im Label) */
.hud-metric--dist {
  width: 60px;
}

/* TEMPO: max "99.9" (Einheit im Label) */
.hud-metric--speed {
  width: 80px;
}

/* Label – Einheit direkt im Label-Text */
.hud-metric-label {
  font-size: 9px;
  letter-spacing: 1.8px;
  color: rgba(232, 192, 64, 0.55);
  font-family: Georgia, serif;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
}

/* Alle drei Werte identisch groß */
.hud-metric-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  line-height: 1.1;
  white-space: nowrap;
}

/* ── Boss-Suche ── */
.minimap-search-label {
  position: absolute;
  bottom: 14px;
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

/* ── Galaxie abgeschlossen ── */
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

/* ── Dekorativer SVG-Rahmen ── */
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
