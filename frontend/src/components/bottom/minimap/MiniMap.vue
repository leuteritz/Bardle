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

          <!-- ── Waiting for role selection ── -->
          <div v-if="galaxyStore.pendingRoleSelection" class="minimap-waiting-label">
            Choose your Role
          </div>

          <!-- ── HUD-Panel: Ankunft · Entfernung · Tempo ── -->
          <MiniMapHudPanel />

          <!-- ── Minimap-Stern Interaktionsbereich (Arrival-View) ── -->
          <div
            v-if="isArrived && championStar"
            class="minimap-star-hitarea"
            :class="{ 'star-hover-active': starGroupStore.hoveredTimerStarId === championStar.id }"
            @mouseenter="onMinimapStarEnter"
            @mouseleave="onMinimapStarLeave"
            @click="onMinimapStarClick"
          />

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
            <span class="complete-badge">✦ Galaxy Liberated ✦</span>

            <!-- Next tier still locked → show the unlock gate; otherwise the warp button -->
            <TierUnlockPanel v-if="galaxyStore.nextTierLocked" />
            <button v-else class="next-galaxy-btn" @click="galaxyStore.requestTransition()">
              » Next Galaxy «
            </button>
          </div>

          <!-- ── Tier unlocked celebration ── -->
          <Transition name="tier-flash-fade">
            <div v-if="galaxyStore.tierJustUnlocked" class="tier-flash" aria-hidden="true">
              <span class="tier-flash-text">✦ Tier {{ galaxyStore.unlockedTier }} Unlocked ✦</span>
            </div>
          </Transition>

          <!-- ── Skip-to-arrival shortcut (travel only) ── -->
          <button
            v-if="galaxyStore.championTravelState === 'traveling'"
            class="minimap-skip-btn"
            :title="`Skip to -${SKIP_DURATION_SECONDS}s`"
            @click="teleportNearPlanet"
          >
            ⏩ -{{ SKIP_DURATION_SECONDS }}s
          </button>
        </div>
      </div>

    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, computed, watch } from 'vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { useStarGroupStore } from '../../../stores/starGroupStore'
import { useActionToast } from '../../../composables/useActionToast'
import { HUD_PANEL_ARC_R, SKIP_DURATION_SECONDS } from '../../../config/constants'
import MiniMapCanvas from './MiniMapCanvas.vue'
import MiniMapHudPanel from './MiniMapHudPanel.vue'
import TierUnlockPanel from './TierUnlockPanel.vue'

const CORNER_R = 20
const TIER_FLASH_MS = 2400

export default defineComponent({
  name: 'MiniMap',
  components: { MiniMapCanvas, MiniMapHudPanel, TierUnlockPanel },
  setup() {
    const galaxyStore = useGalaxyStore()
    const starGroupStore = useStarGroupStore()
    const { showToast } = useActionToast()

    // Celebrate a tier unlock: toast + on-screen flash, then clear the flag.
    watch(
      () => galaxyStore.tierJustUnlocked,
      (justUnlocked) => {
        if (!justUnlocked) return
        showToast(`✦ Tier ${galaxyStore.unlockedTier} unlocked!`)
        setTimeout(() => {
          galaxyStore.tierJustUnlocked = false
        }, TIER_FLASH_MS)
      },
    )

    const show = computed(
      () =>
        galaxyStore.pendingRoleSelection ||
        galaxyStore.isRescueRotating ||
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

    const isArrived = computed(
      () =>
        galaxyStore.championTravelState === 'champion_available' ||
        galaxyStore.championTravelState === 'champion_spawned',
    )

    const championStar = computed(
      () => starGroupStore.activeStars.find((s) => s.starType === 'champion') ?? null,
    )

    function onMinimapStarEnter() {
      if (championStar.value) starGroupStore.setHoveredTimerStar(championStar.value.id)
    }

    function onMinimapStarLeave() {
      starGroupStore.setHoveredTimerStar(null)
    }

    function onMinimapStarClick() {
      if (!championStar.value || starGroupStore.starFightModalOpen) return
      starGroupStore.openStarFightModal(championStar.value.id)
    }

    function teleportNearPlanet() {
      if (galaxyStore.championTravelState !== 'traveling') return
      galaxyStore.championTravelStartTime =
        Date.now() - (galaxyStore.championTravelDurationMs - SKIP_DURATION_SECONDS * 1000)
    }

    const ARC_R = HUD_PANEL_ARC_R
    const framePath = `M 0,0 L ${438 - ARC_R},0 A ${ARC_R},${ARC_R} 0 0,1 438,${ARC_R} L 438,${380 - CORNER_R} A ${CORNER_R},${CORNER_R} 0 0,0 ${438 + CORNER_R},380`

    return {
      show,
      galaxyStore,
      starGroupStore,
      framePath,
      isArrived,
      championStar,
      onMinimapStarEnter,
      onMinimapStarLeave,
      onMinimapStarClick,
      teleportNearPlanet,
      SKIP_DURATION_SECONDS,
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
  transform-origin: bottom left;
  transform: scale(var(--hud-scale, 1));
}

.minimap-panel {
  position: relative;
  pointer-events: auto;
  width: 440px;
  height: 440px;
  clip-path: path('M 0,0 L 380,0 A 60,60 0 0,1 440,60 L 440,440 L 0,440 Z');
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
  clip-path: path('M 0,0 L 380,0 A 60,60 0 0,1 440,60 L 440,440 L 0,440 Z');
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

/* ── Minimap-Stern Hit-Area (Arrival View) ── */
.minimap-star-hitarea {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 112px;
  height: 112px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  cursor: pointer;
  z-index: 4;
  pointer-events: auto;
  box-shadow: 0 0 0 0 rgba(255, 200, 80, 0);
  transition: box-shadow 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

.minimap-star-hitarea:hover,
.minimap-star-hitarea.star-hover-active {
  animation: minimap-star-ring-pulse 1.4s ease-in-out infinite;
}

@keyframes minimap-star-ring-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 3px rgba(255, 200, 80, 0.55),
      0 0 18px 6px rgba(255, 180, 40, 0.25);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(255, 220, 80, 0.35),
      0 0 32px 10px rgba(255, 180, 40, 0.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .minimap-star-hitarea:hover,
  .minimap-star-hitarea.star-hover-active {
    animation: none;
    box-shadow:
      0 0 0 3px rgba(255, 200, 80, 0.55),
      0 0 18px 6px rgba(255, 180, 40, 0.3);
  }
}

/* ── Rollenauswahl-Wartezustand ── */
.minimap-waiting-label {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.05rem;
  letter-spacing: 0.22em;
  color: #e8c040;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  user-select: none;
  text-transform: uppercase;
  animation: waiting-label-pulse 1.8s ease-in-out infinite alternate;
  text-shadow:
    0 0 12px rgba(232, 192, 64, 0.9),
    0 0 5px rgba(200, 150, 20, 0.7),
    0 1px 4px rgba(0, 0, 0, 0.98);
}

@keyframes waiting-label-pulse {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
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

.complete-badge {
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

/* ── Tier unlocked celebration flash ── */
.tier-flash {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12;
  pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(82, 184, 48, 0.22) 0%, transparent 65%);
}

.tier-flash-text {
  font-size: 1.15rem;
  letter-spacing: 0.16em;
  color: #b6ff8c;
  text-transform: uppercase;
  text-shadow:
    0 0 16px rgba(120, 220, 80, 0.95),
    0 0 6px rgba(82, 184, 48, 0.8),
    0 1px 4px rgba(0, 0, 0, 0.98);
  animation: tier-flash-pop 2.4s ease-out forwards;
}

@keyframes tier-flash-pop {
  0% {
    transform: scale(0.7);
    opacity: 0;
  }
  18% {
    transform: scale(1.08);
    opacity: 1;
  }
  35% {
    transform: scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.tier-flash-fade-enter-active,
.tier-flash-fade-leave-active {
  transition: opacity 0.4s ease;
}
.tier-flash-fade-enter-from,
.tier-flash-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .tier-flash-text {
    animation: none;
  }
}

/* ── Minimap skip button ── */
.minimap-skip-btn {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 6;
  pointer-events: auto;
  background: linear-gradient(to bottom, #1e1006, #110900);
  border: 2px solid #7a4e20;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 0 8px rgba(200, 144, 64, 0.18);
  border-radius: 4px;
  color: #e8c040;
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  padding: 6px 14px;
  cursor: pointer;
  line-height: 1.4;
  text-transform: uppercase;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    color 0.15s ease;
}
.minimap-skip-btn:hover {
  background: linear-gradient(to bottom, #2a1a08, #180c04);
  border-color: #c89040;
  box-shadow:
    inset 0 0 0 1px #5c3310,
    0 0 14px rgba(232, 192, 64, 0.35);
  color: #f0d060;
}
.minimap-skip-btn:active {
  background: linear-gradient(to bottom, #110900, #0e0700);
  transform: translateY(1px);
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 0 4px rgba(200, 144, 64, 0.12);
}

</style>
