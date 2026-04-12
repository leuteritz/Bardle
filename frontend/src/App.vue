<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyTheme } from '@/composables/useGalaxyTheme'
import IdleGameComponent from '@/components/idle/IdleGameComponent.vue'
import StarBackgroundComponent from '@/components/idle/StarBackgroundComponent.vue'
import PlanetRescueOverlay from '@/components/idle/planet/PlanetRescueOverlay.vue'
import PlanetRescueModal from '@/components/idle/planet/PlanetRescueModal.vue'
import AugmentSelectionModal from '@/components/augment/AugmentSelectionModal.vue'
import AugmentBuffPanel from '@/components/augment/AugmentBuffPanel.vue'
import HyperspaceOverlay from '@/components/idle/prestige/HyperspaceOverlay.vue'
import UniverseSelectModal from '@/components/idle/prestige/UniverseSelectModal.vue'
import EncyclopediaPanel from '@/components/encyclopedia/EncyclopediaPanel.vue'
import InventoryModal from '@/components/header/InventoryModal.vue'
import AppHeaderComponent from '@/components/header/AppHeaderComponent.vue'
import FpsOverlay from './components/idle/FpsOverlay.vue'
import OfflineProgressModal from '@/components/idle/OfflineProgressModal.vue'

const gameStore = useGameStore()
useGalaxyTheme()

const isInventoryOpen = ref(false)
const activeTab = ref('idle')
</script>

<template>
  <div class="min-h-screen cosmic-bg">
    <div class="galaxy-tint-overlay" aria-hidden="true"></div>
    <StarBackgroundComponent />
    <PlanetRescueModal />
    <AugmentSelectionModal />
    <AugmentBuffPanel />
    <HyperspaceOverlay />
    <UniverseSelectModal />
    <InventoryModal :open="isInventoryOpen" @close="isInventoryOpen = false" />
    <FpsOverlay />
    <OfflineProgressModal />

    <div class="flex flex-col justify-between w-full min-h-screen px-4 pb-10">
      <!-- Header + Countdown zusammen als ein Flex-Kind -->
      <div class="w-full">
        <AppHeaderComponent
          :inventory-open="isInventoryOpen"
          @open-inventory="isInventoryOpen = true"
        />

        <!-- Planet-Rettungs-Timer direkt unter dem Header -->
        <div class="planet-rescue-wrapper">
          <PlanetRescueOverlay />
        </div>
      </div>

      <!-- Hauptbereich -->
      <div class="flex flex-col w-full gap-2">
        <div class="flex justify-center w-full">
          <div class="w-full">
            <IdleGameComponent :active-tab="activeTab" />
          </div>
        </div>
      </div>
    </div>

    <!-- Encyclopedia Toggle Button -->
    <button
      v-show="!gameStore.isEncyclopediaOpen"
      class="fixed right-0 z-[45] px-2 py-3 transition-all duration-300 -translate-y-1/2 border border-r-0 shadow-lg top-1/2 hover:pr-3 group encyclopedia-toggle"
      @click="gameStore.toggleEncyclopedia()"
    >
      <span class="text-lg transition-transform duration-200 group-hover:scale-110">📖</span>
    </button>

    <EncyclopediaPanel />

    <span class="fixed z-50 text-xl select-none bottom-3 right-3 text-amber-600/60 drop-shadow-xl">
      © Leuteritz
    </span>
  </div>
</template>

<style>
/* ================================================================
   DESIGN TOKENS
   ================================================================ */
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

  --bump-profile: 7px;
  --bump-center: 30px;
  --header-total-height: 50px;

  --bard-avatar-radius: 72px;
}

/* ================================================================
   GALAXY TINT OVERLAY
   ================================================================ */
.galaxy-tint-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-color: var(--galaxy-accent);
  opacity: 0.18;
  transition: background-color 3s ease;
}

/* ================================================================
   COSMIC BACKGROUND
   ================================================================ */
.cosmic-bg {
  background: #0a0620;
  position: relative;
}

/* Animated background layer uses transform (composited) instead of
   background-position (paint) to avoid per-frame repaint work. */
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

/* ================================================================
   PLANET RESCUE WRAPPER
   ================================================================ */
.planet-rescue-wrapper {
  width: 100%;
  max-width: 1400px;
  margin-inline: auto;
  /* 72px Inset = Innenkante der abgerundeten Header-Ecken */
  padding-inline: var(--bard-avatar-radius);
}

/* ================================================================
   ENCYCLOPEDIA TOGGLE
   ================================================================ */
.encyclopedia-toggle {
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.88));
  border-color: var(--rpg-wood-mid, rgba(255, 200, 80, 0.15));
  border-radius: 4px 0 0 4px;
}
.encyclopedia-toggle:hover {
  background: #2a1a0a;
  border-color: var(--rpg-wood, #7c4f1a);
}

/* ================================================================
   MISC
   ================================================================ */
.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 500ms;
}
</style>
