<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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

// Misst die Header-Höhe dynamisch und setzt --header-total-height auf :root
const headerRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

function updateHeaderHeight() {
  if (headerRef.value) {
    const rect = headerRef.value.getBoundingClientRect()
    document.documentElement.style.setProperty('--header-total-height', `${rect.bottom}px`)
  }
}

onMounted(() => {
  updateHeaderHeight()
  resizeObserver = new ResizeObserver(updateHeaderHeight)
  if (headerRef.value) resizeObserver.observe(headerRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="min-h-screen cosmic-bg">
    <StarBackgroundComponent />
    <PlanetRescueModal />
    <AugmentSelectionModal />
    <AugmentBuffPanel />
    <HyperspaceOverlay />
    <UniverseSelectModal />
    <InventoryModal :open="isInventoryOpen" @close="isInventoryOpen = false" />

    <div class="flex flex-col justify-between w-full min-h-screen px-4 pb-10">
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- HEADER BAR  (LoL-Scoreboard-Stil + CK3/EU4-RPG-Theme)         -->
      <!-- Drei Ebenen: Seiten (flach) < BardProfile (mittel) < Chimes (groß) -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <header
        ref="headerRef"
        class="z-[100] header-bar w-full max-w-[1400px] mx-auto relative flex items-stretch"
      >
        <!-- Gold-Akzentlinie oben -->
        <div class="header-accent-top" aria-hidden="true"></div>

        <!-- ════════ LINKE SEITE ════════ -->
        <div class="flex items-center gap-2 pr-3 header-side header-side--left">
          <!-- ① BardProfileMenu — in eigenem herausragenden Panel (Ebene 2) -->
          <div class="flex-shrink-0 header-profile-bump">
            <BardProfileMenu />
          </div>

          <div class="header-divider" aria-hidden="true"></div>

          <!-- ② SectionNavigator -->
          <div class="z-[65] flex-shrink-0" style="width: clamp(130px, 13vw, 210px)">
            <SectionNavigatorComponent />
          </div>

          <div class="header-divider" aria-hidden="true"></div>

          <!-- ③ C/Click + C/s – links für optische Balance -->
          <div class="flex items-center flex-shrink-0 gap-3 pointer-events-none">
            <div class="flex flex-col items-center leading-none">
              <span class="header-label">C/Click</span>
              <span class="stat-value chimes-text-glow">
                {{ formatNumber(gameStore.chimesPerClick) }}
              </span>
            </div>
            <span class="header-dot" aria-hidden="true">·</span>
            <div class="flex flex-col items-center leading-none">
              <span class="header-label">C/s</span>
              <span class="stat-value cps-text-glow">
                {{ formatNumber(gameStore.chimesPerSecond) }}
              </span>
            </div>
          </div>
        </div>

        <!-- ════════ MITTE (absolut zentriert — Ebene 3, größter Überhang) ════════ -->
        <div class="header-center-anchor" aria-hidden="true"></div>
        <div class="header-center">
          <div class="center-wing center-wing--left" aria-hidden="true"></div>

          <div class="center-chimes">
            <img
              src="/img/BardAbilities/BardChime.png"
              class="header-chime-icon chime-glow"
              alt="Chimes"
            />
            <span class="chimes-value chimes-text-glow">
              {{ formatNumber(gameStore.chimes) }}
            </span>
          </div>

          <div class="center-wing center-wing--right" aria-hidden="true"></div>
        </div>

        <!-- ════════ RECHTE SEITE ════════ -->
        <div class="flex items-center gap-2 px-3 header-side header-side--right">
          <!-- ④ Power + Meeps -->
          <div class="flex items-center flex-shrink-0 gap-3 pointer-events-none">
            <div class="flex flex-col items-center leading-none">
              <span class="header-label">Power</span>
              <span class="stat-value" style="color: #c084fc">
                {{ formatNumber(gameStore.totalPower) }}
              </span>
            </div>
            <span class="header-dot" aria-hidden="true">·</span>
            <div class="flex flex-col items-center leading-none">
              <span class="header-label">Meeps</span>
              <span class="stat-value" style="color: #60a5fa">
                {{ gameStore.meeps }}
              </span>
            </div>
          </div>

          <div class="header-divider" aria-hidden="true"></div>

          <!-- ⑤ MeepIndicator -->
          <div class="flex-shrink-0">
            <MeepIndicatorComponent />
          </div>

          <div class="header-divider" aria-hidden="true"></div>

          <!-- ⑥ UniversePortal -->
          <div class="z-[65] flex-shrink-0" style="width: clamp(110px, 11vw, 170px)">
            <UniversePortalComponent />
          </div>

          <div class="header-divider" aria-hidden="true"></div>

          <!-- ⑦ Inventar-Tasche -->
          <div class="relative flex-shrink-0">
            <button
              class="w-8 h-8 inventory-btn"
              title="Inventar öffnen"
              @mouseenter="isHovering = true"
              @mouseleave="isHovering = false"
              @click="isInventoryOpen = true"
            >
              <img src="/img/Bag.png" class="object-contain w-full h-full" alt="Inventar öffnen" />
            </button>
            <InventoryTooltip :visible="isHovering && !isInventoryOpen" />
          </div>
        </div>

        <!-- Gold-Akzentlinie unten -->
        <div class="header-accent-bottom" aria-hidden="true"></div>
      </header>

      <!-- Planet-Rettungs-Timer direkt unter dem Header -->
      <PlanetRescueOverlay />

      <!-- Hauptbereich -->
      <div class="flex flex-col w-full gap-2">
        <div class="flex justify-center w-full">
          <div class="w-full">
            <GameCenterComponent :active-tab="activeTab" />
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

  --header-bg: rgba(8, 5, 18, 0.72);
  --header-border: rgba(255, 200, 80, 0.1);
  --header-divider: rgba(255, 200, 80, 0.12);
  --header-radius: 10px;

  --color-chimes: #f0c840;
  --color-cps: #74d448;
  --color-label: rgba(200, 185, 140, 0.55);

  /* ── Beide Panels ragen gleich weit heraus ── */
  --bump-profile: 7px;
  --bump-center: 30px;
  --header-total-height: 50px; /* Fallback; wird per ResizeObserver dynamisch überschrieben */
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
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.88));
  border: 2px solid var(--rpg-wood, #7c4f1a);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px var(--rpg-wood-inner, rgba(255, 200, 80, 0.08)),
    inset 0 0 0 3px var(--rpg-wood-mid, rgba(255, 200, 80, 0.04)),
    0 6px 28px rgba(0, 0, 0, 0.75);
  overflow: visible;
  display: flex;
  align-items: stretch;
  position: relative;
}

.header-accent-top,
.header-accent-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  pointer-events: none;
  z-index: 2;
}
.header-accent-top {
  top: 0;
}
.header-accent-bottom {
  bottom: 0;
}

/* ── Linke / Rechte Seite ─────────────────────────────────────── */
.header-side {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
  padding-bottom: 1px;
}
.header-side--left {
  justify-content: flex-start;
}
.header-side--right {
  justify-content: flex-end;
}

/* ================================================================
   EBENE 2 — BardProfile-Panel
   Wächst aus dem linken Header-Rand heraus (Rahmen "springt" mit hoch)
   ================================================================ */
.header-profile-bump {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex-shrink: 0;
}

/* ================================================================
   EBENE 3 — Chimes-Center-Panel (Mitte, größter Überhang)
   ================================================================ */
.header-center-anchor {
  flex-shrink: 0;
  width: 0;
}

.header-center {
  position: absolute;
  left: 50%;

  /* ✅ GEÄNDERT: kein negativer top mehr → oberer Header-Rahmen bleibt durchgehend */
  top: 2px; /* vorher: calc(-1 * var(--bump-center)) */
  bottom: calc(-1 * var(--bump-center)); /* hängt nur noch nach unten */

  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0;
  pointer-events: none;
}

.center-wing {
  flex-shrink: 0;
  width: 28px;
  height: 2px;
  background: linear-gradient(to right, transparent, rgba(255, 200, 80, 0.38));
  align-self: center;

  /* ✅ NEU: korrigiert den Versatz durch den nach-unten-Überhang */
  position: relative;
  top: calc(-1 * (var(--bump-center) + 2px) / 2);
}

.center-wing--right {
  background: linear-gradient(to left, transparent, rgba(255, 200, 80, 0.38));
}

.center-chimes {
  display: flex;
  align-items: center;
  gap: 8px;

  background: linear-gradient(to bottom, rgba(30, 16, 6, 0.97), rgba(10, 6, 2, 0.99));
  /* ✅ GEÄNDERT: border-top entfernt – Panel liegt nun bündig am Header-Rand */
  border-left: 1px solid rgba(255, 200, 80, 0.24);
  border-right: 1px solid rgba(255, 200, 80, 0.24);
  border-bottom: 1px solid rgba(255, 200, 80, 0.28);
  border-radius: 0 0 8px 8px;

  padding: 5px 20px 5px 14px;

  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.08),
    0 6px 24px rgba(0, 0, 0, 0.7);

  align-self: stretch;
  display: flex;
  align-items: center;
}

.header-chime-icon {
  width: clamp(34px, 4vw, 52px);
  height: clamp(34px, 4vw, 52px);
  object-fit: contain;
  flex-shrink: 0;
}

/* ── Trennlinien ──────────────────────────────────────────────── */
.header-divider {
  flex-shrink: 0;
  width: 1px;
  height: 18px;
  background: var(--rpg-wood-mid, rgba(255, 200, 80, 0.15));
  border-radius: 1px;
  margin-inline: 2px;
  align-self: center;
}

.header-dot {
  font-size: 1.2rem;
  line-height: 1;
  color: var(--rpg-wood-mid, rgba(255, 200, 80, 0.25));
  user-select: none;
  flex-shrink: 0;
}

/* ================================================================
   CHIMES & STATS – Typografie
   ================================================================ */
.header-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-label);
  line-height: 1;
  margin-bottom: 1px;
}

.chimes-value {
  font-size: clamp(1.3rem, 1.7vw, 2rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--color-chimes);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.cps-value {
  font-size: clamp(0.9rem, 1.3vw, 1.15rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-cps);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat-value {
  font-size: clamp(0.8rem, 1.1vw, 1rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--color-label);
}

/* ================================================================
   GLOWS & FILTER
   ================================================================ */
.chime-glow {
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.7)) drop-shadow(0 0 14px rgba(251, 191, 36, 0.3));
}
.chime-glow-green {
  filter: drop-shadow(0 0 7px rgba(52, 211, 153, 0.5))
    drop-shadow(0 0 14px rgba(52, 211, 153, 0.22));
}
.chimes-text-glow {
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));
}
.cps-text-glow {
  filter: drop-shadow(0 0 7px rgba(116, 212, 72, 0.4));
}

/* ================================================================
   INVENTAR-BUTTON
   ================================================================ */
.inventory-btn {
  border-radius: 4px;
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
