<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from './stores/gameStore'
import { formatNumber } from './config/numberFormat'
import GameCenterComponent from './components/gameCenter/GameCenterComponent.vue'
import InventoryTooltip from './components/InventoryTooltip.vue'
import StarBackgroundComponent from './components/layout/StarBackgroundComponent.vue'
import PlanetRescueOverlay from './components/layout/PlanetRescueOverlay.vue'
import PlanetRescueModal from './components/layout/PlanetRescueModal.vue'
import AugmentSelectionModal from './components/AugmentSelectionModal.vue'
import AugmentBuffPanel from './components/AugmentBuffPanel.vue'
import HyperspaceOverlay from './components/HyperspaceOverlay.vue'
import UniverseSelectModal from './components/UniverseSelectModal.vue'
import EncyclopediaPanel from './components/encyclopedia/EncyclopediaPanel.vue'
import AdminDashboard from './components/AdminDashboard.vue'
import BardProfileMenu from './components/BardProfileMenu.vue'
import UniversePortalComponent from './components/UniversePortalComponent.vue'
import MeepIndicatorComponent from './components/ui/MeepIndicatorComponent.vue'
import InventoryModal from './components/InventoryModal.vue'
import SectionNavigatorComponent from './components/gameCenter/idle/SectionNavigatorComponent.vue'

const gameStore = useGameStore()

const isInventoryOpen = ref(false)
const isHovering = ref(false)

const activeTab = ref('idle')
</script>

<template>
  <div class="min-h-screen cosmic-bg">
    <StarBackgroundComponent />
    <PlanetRescueOverlay />
    <PlanetRescueModal />
    <AugmentSelectionModal />
    <AugmentBuffPanel />
    <HyperspaceOverlay />
    <UniverseSelectModal />
    <InventoryModal :open="isInventoryOpen" @close="isInventoryOpen = false" />

    <div class="flex flex-col justify-between w-full min-h-screen px-4 pt-4 pb-10">
      <!-- Oberer Bereich mit Navigation -->
      <div class="z-[100] grid w-full min-h-8 grid-cols-3 items-start">
        <!-- Links: Bard portrait toggle -->
        <div class="flex items-start justify-start col-span-1 px-4 py-4">
          <BardProfileMenu />
        </div>

        <!-- Mitte: Chimes & CPS -->
        <!-- Mitte: Chimes & CPS -->
        <div
          class="relative z-[65] flex flex-col items-center justify-center col-span-1 gap-0 pointer-events-none"
        >
          <div class="flex items-center gap-1 px-4 py-1">
            <img src="/img/BardAbilities/BardChime.png" class="w-24 h-24 chime-glow" />
            <span
              class="font-bold tracking-wider text-7xl whitespace-nowrap chimes-text-glow"
              style="color: #e8c040"
            >
              {{ formatNumber(gameStore.chimes) }}
            </span>
          </div>
          <div class="flex items-center gap-1 px-2 py-0.5">
            <span
              class="text-4xl font-semibold tracking-wide whitespace-nowrap cps-text-glow"
              style="color: #6ec040"
            >
              {{ gameStore.chimesPerSecond }} CPS
            </span>
          </div>
        </div>

        <!-- Rechts: Inventar, Portal, Meep -->
        <div
          class="relative z-[65] flex items-center justify-end h-full col-span-1 px-4 py-4 gap-x-6"
        >
          <!-- Section Navigator: mr-auto drückt ihn an die linke Kante der rechten Spalte -->
          <div class="mr-auto z-[65] self-center" style="width: clamp(160px, 16vw, 240px)">
            <SectionNavigatorComponent />
          </div>
          <!-- Bag: self-center stellt sicher, dass er zur Mitte der Portal+Meep-Gruppe zeigt -->
          <div class="relative self-center">
            <button
              class="w-32 h-32"
              title="Inventar öffnen"
              @mouseenter="isHovering = true"
              @mouseleave="isHovering = false"
              @click="isInventoryOpen = true"
            >
              <img src="/img/Bag.png" class="object-contain w-full h-full" alt="Inventar" />
            </button>
            <InventoryTooltip :visible="isHovering && !isInventoryOpen" />
          </div>

          <!-- Portal & Meep untereinander, zentriert -->
          <div class="flex flex-col items-center self-center gap-1">
            <UniversePortalComponent />
            <MeepIndicatorComponent />
          </div>
        </div>

        <!-- ↑ Rechte Spalte korrekt geschlossen -->
      </div>
      <!-- ↑ Grid geschlossen -->

      <!-- Hauptbereich -->
      <div class="flex flex-col w-full gap-2">
        <div class="flex justify-center w-full">
          <div class="w-full">
            <GameCenterComponent :active-tab="activeTab" />
          </div>
        </div>
      </div>
    </div>
    <!-- ↑ flex flex-col justify-between geschlossen -->

    <!-- Encyclopedia Toggle Button -->
    <button
      v-show="!gameStore.isEncyclopediaOpen"
      class="fixed right-0 z-[45] px-2 py-3 transition-all duration-300 -translate-y-1/2 border border-r-0 shadow-lg top-1/2 hover:pr-3 group encyclopedia-toggle"
      @click="gameStore.toggleEncyclopedia()"
    >
      <span class="text-lg transition-transform duration-200 group-hover:scale-110">📖</span>
    </button>

    <EncyclopediaPanel />
    <AdminDashboard />

    <span class="fixed z-50 text-xl bottom-5 right-5 text-amber-500 drop-shadow-lg"
      >©Leuteritz</span
    >
  </div>
</template>

<style>
:root {
  --star-base-size: 2px;
  --star-max-size: 6px;
  --cosmic-gradient: linear-gradient(45deg, #0a0620, #110b3d, #160e4a, #0d0830);
}

.cosmic-bg {
  background: var(--cosmic-gradient);
  background-size: 400% 400%;
  animation: cosmicShift 20s ease infinite;
}

.cosmic-bg.reduce-motion {
  animation: none;
  background-position: 0% 50%;
}

@keyframes cosmicShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cosmic-bg {
    animation: none !important;
  }
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 500ms;
}

.encyclopedia-toggle {
  background: var(--rpg-bg-header);
  border-color: var(--rpg-wood-mid);
  border-radius: 4px 0 0 4px;
}
.encyclopedia-toggle:hover {
  background: #2a1a0a;
  border-color: var(--rpg-wood);
}

.chime-glow {
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.6))
    drop-shadow(0 0 20px rgba(251, 191, 36, 0.3));
}

.chime-glow-green {
  filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.5))
    drop-shadow(0 0 16px rgba(52, 211, 153, 0.25));
}

.chimes-text-glow {
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.5));
}

.cps-text-glow {
  filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.4));
}
</style>
