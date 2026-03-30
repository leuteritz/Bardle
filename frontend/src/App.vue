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
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- HEADER BAR                                                     -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <header class="z-[100] header-bar w-full flex items-center gap-2 px-3 py-2">
        <!-- ① BardProfileMenu -->
        <div class="flex-shrink-0">
          <BardProfileMenu />
        </div>

        <!-- Trennlinie -->
        <div class="header-divider" aria-hidden="true"></div>

        <!-- ② SectionNavigator -->
        <div class="z-[65] flex-shrink-0" style="width: clamp(130px, 13vw, 210px)">
          <SectionNavigatorComponent />
        </div>

        <!-- Trennlinie -->
        <div class="header-divider" aria-hidden="true"></div>

        <!-- ③ Chimes + CPS – zentriert im Freiraum -->
        <div class="flex items-center justify-center flex-1 min-w-0 gap-3 pointer-events-none">
          <!-- Chime-Icon -->
          <img
            src="/img/BardAbilities/BardChime.png"
            class="flex-shrink-0 w-16 h-16 chime-glow"
            alt="Chimes"
          />

          <!-- Chimes-Wert + Label-Stack -->
          <div class="flex flex-col items-start min-w-0 leading-none">
            <span class="truncate chimes-value chimes-text-glow">
              {{ formatNumber(gameStore.chimes) }}
            </span>
          </div>

          <!-- Trennpunkt -->
          <span class="header-dot" aria-hidden="true">·</span>

          <!-- CPS-Stack -->
          <div class="flex flex-col items-start min-w-0 leading-none">
            <span class="header-label">CPS</span>
            <span class="truncate cps-value cps-text-glow">
              {{ gameStore.chimesPerSecond }}
            </span>
          </div>
        </div>

        <!-- Trennlinie -->
        <div class="header-divider" aria-hidden="true"></div>

        <!-- ④ MeepIndicator -->
        <div class="flex-shrink-0">
          <MeepIndicatorComponent />
        </div>

        <!-- Trennlinie -->
        <div class="header-divider" aria-hidden="true"></div>

        <!-- ⑤ UniversePortal -->
        <div class="z-[65] flex-shrink-0" style="width: clamp(110px, 11vw, 170px)">
          <UniversePortalComponent />
        </div>

        <!-- Trennlinie -->
        <div class="header-divider" aria-hidden="true"></div>

        <!-- ⑥ Inventar-Tasche -->
        <div class="relative flex-shrink-0">
          <button
            class="w-9 h-9 inventory-btn"
            title="Inventar öffnen"
            @mouseenter="isHovering = true"
            @mouseleave="isHovering = false"
            @click="isInventoryOpen = true"
          >
            <img src="/img/Bag.png" class="object-contain w-full h-full" alt="Inventar öffnen" />
          </button>
          <InventoryTooltip :visible="isHovering && !isInventoryOpen" />
        </div>
      </header>
      <!-- ↑ HEADER BAR ENDE -->

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

    <span class="fixed z-50 text-xs select-none bottom-3 right-3 text-amber-600/60 drop-shadow-sm">
      © Leuteritz
    </span>
  </div>
</template>

<style>
/* ================================================================
   DESIGN TOKENS
   ================================================================ */
:root {
  --star-base-size: 2px;
  --star-max-size: 6px;
  --cosmic-gradient: linear-gradient(45deg, #0a0620, #110b3d, #160e4a, #0d0830);

  /* Header */
  --header-bg: rgba(8, 5, 18, 0.72);
  --header-border: rgba(255, 200, 80, 0.1);
  --header-divider: rgba(255, 200, 80, 0.12);
  --header-radius: 10px;

  /* Typografie */
  --color-chimes: #f0c840;
  --color-cps: #74d448;
  --color-label: rgba(200, 185, 140, 0.55);
}

/* ================================================================
   COSMIC BACKGROUND
   ================================================================ */
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

/* ================================================================
   HEADER BAR
   ================================================================ */
.header-bar {
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  border-radius: var(--header-radius);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 1px 0 rgba(255, 200, 80, 0.06) inset,
    0 4px 24px rgba(0, 0, 0, 0.45);
}

/* Vertikale Trennlinie zwischen Header-Segmenten */
.header-divider {
  flex-shrink: 0;
  width: 1px;
  height: 28px;
  background: var(--header-divider);
  border-radius: 1px;
  margin-inline: 2px;
}

/* Trennpunkt zwischen Chimes und CPS */
.header-dot {
  font-size: 1.4rem;
  line-height: 1;
  color: var(--header-divider);
  user-select: none;
  flex-shrink: 0;
}

/* ================================================================
   CHIMES & CPS – Typografie
   ================================================================ */

/* Klein-Label ("Chimes" / "CPS") über dem Wert */
.header-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-label);
  line-height: 1;
  margin-bottom: 1px;
}

/* Chimes-Zahl */
.chimes-value {
  font-size: clamp(1.15rem, 1.8vw, 1.55rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--color-chimes);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

/* CPS-Zahl */
.cps-value {
  font-size: clamp(1rem, 1.5vw, 1.3rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-cps);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

/* ================================================================
   GLOWS & FILTER
   ================================================================ */
.chime-glow {
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.65))
    drop-shadow(0 0 18px rgba(251, 191, 36, 0.28));
}

.chime-glow-green {
  filter: drop-shadow(0 0 7px rgba(52, 211, 153, 0.5))
    drop-shadow(0 0 14px rgba(52, 211, 153, 0.22));
}

.chimes-text-glow {
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.45));
}

.cps-text-glow {
  filter: drop-shadow(0 0 7px rgba(116, 212, 72, 0.4));
}

/* ================================================================
   INVENTAR-BUTTON
   ================================================================ */
.inventory-btn {
  border-radius: 6px;
  padding: 2px;
  transition:
    transform 0.15s ease,
    filter 0.15s ease;
}
.inventory-btn:hover {
  transform: scale(1.12);
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5));
}
.inventory-btn:active {
  transform: scale(0.96);
}

/* ================================================================
   ENCYCLOPEDIA TOGGLE
   ================================================================ */
.encyclopedia-toggle {
  background: var(--rpg-bg-header);
  border-color: var(--rpg-wood-mid);
  border-radius: 4px 0 0 4px;
}
.encyclopedia-toggle:hover {
  background: #2a1a0a;
  border-color: var(--rpg-wood);
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
