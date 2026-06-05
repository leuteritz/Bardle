<script setup lang="ts">
import { watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyTheme } from '@/composables/useGalaxyTheme'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import IdleGameComponent from '@/components/idle/IdleGameComponent.vue'
import StarBackgroundComponent from '@/components/idle/StarBackgroundComponent.vue'
import PlanetRescueOverlay from '@/components/idle/planet/PlanetRescueOverlay.vue'
import StarFightModal from '@/components/idle/planet/StarFightModal.vue'
import AugmentSelectionModal from '@/components/augment/AugmentSelectionModal.vue'
import AugmentBuffPanel from '@/components/augment/AugmentBuffPanel.vue'
import HyperspaceOverlay from '@/components/idle/prestige/HyperspaceOverlay.vue'
import UniverseSelectModal from '@/components/idle/prestige/UniverseSelectModal.vue'
import EncyclopediaPanel from '@/components/encyclopedia/EncyclopediaPanel.vue'
import AppHeaderComponent from '@/components/header/AppHeaderComponent.vue'
import StarTimerBarsComponent from '@/components/header/StarTimerBarsComponent.vue'
import FpsOverlay from './components/idle/FpsOverlay.vue'
import EventLogOverlay from '@/components/idle/EventLogOverlay.vue'
import NebulaFlythroughComponent from '@/components/idle/NebulaFlythroughComponent.vue'
import OfflineProgressModal from '@/components/idle/OfflineProgressModal.vue'
import PauseOverlay from '@/components/idle/PauseOverlay.vue'
import BottomBarComponent from '@/components/bottom/BottomBarComponent.vue'

const gameStore = useGameStore()
useGalaxyTheme()

const { isRenderingPaused } = useRenderingPaused()

watch(
  isRenderingPaused,
  (paused) => {
    document.documentElement.classList.toggle('rendering-paused', paused)
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-screen cosmic-bg">
    <div class="galaxy-tint-overlay" aria-hidden="true"></div>
    <StarBackgroundComponent />
    <NebulaFlythroughComponent />
    <StarFightModal />
    <AugmentSelectionModal />
    <AugmentBuffPanel />
    <HyperspaceOverlay />
    <UniverseSelectModal />
    <FpsOverlay />
    <EventLogOverlay />
    <OfflineProgressModal />
    <PauseOverlay />
    <StarTimerBarsComponent />

    <div class="flex flex-col justify-between w-full min-h-screen px-4 pb-10">
      <div class="w-full">
        <AppHeaderComponent />

        <div class="planet-rescue-wrapper">
          <PlanetRescueOverlay />
        </div>
      </div>

      <div class="flex flex-col w-full gap-2">
        <div class="flex justify-center w-full">
          <div class="w-full">
            <IdleGameComponent />
          </div>
        </div>
      </div>
    </div>

    <button
      v-show="!gameStore.isEncyclopediaOpen"
      class="fixed right-0 z-[45] px-2 py-3 transition-all duration-300 -translate-y-1/2 border border-r-0 shadow-lg top-1/2 hover:pr-3 group encyclopedia-toggle"
      @click="gameStore.toggleEncyclopedia()"
    >
      <Icon icon="game-icons:wax-tablet" width="24" height="24" class="transition-transform duration-200 group-hover:scale-110" style="color: #e8c040" />
    </button>

    <EncyclopediaPanel />
    <BottomBarComponent />

    <span class="copyright-overlay text-amber-600/60">© Leuteritz</span>
  </div>
</template>

<style>
:root {
  --galaxy-accent: #0a1a3e;
  --star-base-size: 2px;
  --star-max-size: 6px;
  --cosmic-gradient: linear-gradient(45deg, #0a0620, #110b3d, #160e4a, #0d0830);

  --header-bg: rgba(8, 5, 18, 0.72);
  --header-border: rgba(255, 200, 80, 0.1);
  --header-divider: rgba(255, 200, 80, 0.12);
  --header-radius: 10px;

  --color-chimes: #f0c840;
  --color-cps: #74d448;
  --color-label: rgba(200, 185, 140, 0.55);

  --header-total-height: 50px;

  /* Fluid scaling — no breakpoint jumps */
  --bard-avatar-radius: clamp(14px, 1.4vw, 40px);
  --avatar-circle-size: clamp(48px, calc(-5px + 4.4vw), 100px);
  --bump-center: clamp(6px, calc(-4px + 1vw), 20px);
  --bump-profile: clamp(2px, calc(-3px + 0.5vw), 8px);

  /* hud-scale / hud-panel-size affect non-header components — kept as breakpoints */
  --hud-scale: 0.75;
  --hud-panel-size: 330px;
}

@media (max-width: 1400px) {
  :root {
    --hud-scale: 0.65;
    --hud-panel-size: 286px;
  }
}

@media (max-width: 1280px) {
  :root {
    --hud-scale: 0.58;
    --hud-panel-size: 260px;
  }
}

@media (max-width: 1024px) {
  :root {
    --hud-scale: 0.52;
    --hud-panel-size: 230px;
  }
}

@media (min-width: 1600px) and (max-width: 1919px) {
  :root {
    --hud-scale: 0.78;
    --hud-panel-size: 343px;
  }
}

@media (min-width: 1920px) and (max-width: 2559px) {
  :root {
    --hud-scale: 0.85;
    --hud-panel-size: 374px;
  }
}

@media (min-width: 2560px) {
  :root {
    --hud-scale: 1.0;
    --hud-panel-size: 440px;
  }
}

.copyright-overlay {
  position: fixed;
  top: 0.5rem;
  left: calc(50% - min(700px, 50vw - 0.5rem) - 8px);
  transform: translateX(-100%);
  z-index: 9999;
  pointer-events: none;
  font-size: clamp(0.72rem, 0.9vw, 1rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f8e7a6;
  white-space: nowrap;
  user-select: none;
}

@media (max-width: 1200px) {
  .copyright-overlay {
    left: 0.75rem;
    transform: none;
    top: 0.75rem;
    font-size: 1.5rem;
  }
}

.galaxy-tint-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-color: var(--galaxy-accent);
  opacity: 0.18;
  transition: background-color 3s ease;
}

.cosmic-bg {
  background: #0a0620;
  position: relative;
}

.cosmic-bg::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 200%;
  height: 100%;
  background: var(--cosmic-gradient);
  background-size: 50% 100%;
  animation: cosmicShift 20s ease infinite;
  will-change: transform;
  z-index: -1;
  pointer-events: none;
}

.rendering-paused *,
.rendering-paused *::before,
.rendering-paused *::after {
  animation-play-state: paused !important;
  transition: none !important;
}

@keyframes cosmicShift {
  0%,
  100% {
    transform: translateX(0%);
  }
  50% {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cosmic-bg::before {
    animation: none !important;
  }
}

.planet-rescue-wrapper {
  width: 100%;
  max-width: 1400px;
  margin-inline: auto;
  padding-inline: var(--bard-avatar-radius);
}

.encyclopedia-toggle {
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.88));
  border-color: var(--rpg-wood-mid, rgba(255, 200, 80, 0.15));
  border-radius: 4px 0 0 4px;
}

.encyclopedia-toggle:hover {
  background: #2a1a0a;
  border-color: var(--rpg-wood, #7c4f1a);
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 500ms;
}
</style>
