<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { formatNumber } from '../../config/numberFormat'
import BardProfileMenu from '../bardProfil/BardProfileMenu.vue'
import UniverseRescueComponent from './UniverseRescueComponent.vue'
import InventoryTooltip from './InventoryTooltip.vue'
import HeaderStatsComponent from './HeaderStatsComponent.vue'

const props = defineProps<{ inventoryOpen?: boolean }>()
const emit = defineEmits<{ 'open-inventory': [] }>()

const gameStore = useGameStore()

const isHovering = ref(false)
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
  <header ref="headerRef" class="z-[120] header-bar w-full max-w-[1400px] mx-auto relative">
    <!-- ════════ LINKE SEITE ════════ -->
    <div class="flex items-center gap-2 header-side header-side--left">
      <div class="flex-shrink-0 header-profile-bump">
        <BardProfileMenu />
      </div>

    </div>

    <!-- ════════ MITTE – Platzhalter für Grid-Spalte 2 ════════ -->
    <div class="header-center-anchor" aria-hidden="true"></div>

    <!-- ════════ MITTE (absolut zentriert, überlagert Spalte 2) ════════ -->
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
    <div class="flex items-center gap-2 header-side header-side--right">
      <!-- Stats-Komponente -->
      <HeaderStatsComponent />

      <div class="header-divider" aria-hidden="true"></div>

      <!-- UniversePortal -->
      <div class="z-[65] flex-shrink-0 header-portal-wrap">
        <UniverseRescueComponent />
      </div>

      <div class="header-divider" aria-hidden="true"></div>

      <!-- Inventory-Kreis -->
      <div class="relative flex-shrink-0 header-inventory-bump">
        <button
          class="inventory-circle-btn"
          title="Inventar öffnen"
          @mouseenter="isHovering = true"
          @mouseleave="isHovering = false"
          @click="emit('open-inventory')"
        >
          <div class="relative w-36 h-36">
            <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(160,110,15,0.45)"
                stroke-width="7"
              />
            </svg>
            <div class="absolute overflow-hidden inset-2 inventory-portrait-inner">
              <img
                src="/img/Bag.png"
                class="object-contain w-full h-full p-4"
                alt="Inventar öffnen"
              />
            </div>
          </div>
        </button>
        <InventoryTooltip :visible="isHovering && !props.inventoryOpen" />
      </div>
    </div>
  </header>
</template>

<style>
/* ================================================================
   HEADER BAR
   ================================================================ */
.header-bar {
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.88));
  border: 2px solid var(--rpg-wood, #7c4f1a);
  border-top: none;
  border-radius: 0 0 var(--bard-avatar-radius) var(--bard-avatar-radius);
  box-shadow:
    inset 0 0 0 1px var(--rpg-wood-inner, rgba(255, 200, 80, 0.08)),
    inset 0 0 0 3px var(--rpg-wood-mid, rgba(255, 200, 80, 0.04)),
    0 6px 28px rgba(0, 0, 0, 0.75);
  overflow: visible;
  position: relative;
  /* ── Grid-Layout: Links | Mitte | Rechts ── */
  display: grid;
  grid-template-columns: 1fr clamp(200px, 20vw, 280px) 1fr;
  align-items: stretch;
}

/* ── Portal-Container ── */
.header-portal-wrap {
  width: clamp(148px, 14vw, 215px);
  align-self: stretch;
  display: flex;
  align-items: stretch;
}

/* ── Linke / Rechte Seite ── */
.header-side {
  min-width: 0;
  padding-top: 1px;
  padding-bottom: 1px;
  overflow: hidden;
}
.header-side--left {
  justify-content: flex-start;
}
.header-side--right {
  justify-content: flex-end;
}

/* ================================================================
   BARD-PROFILE
   ================================================================ */
.header-profile-bump {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex-shrink: 0;
}

/* ================================================================
   MITTE — Grid-Spalte 2 Platzhalter + absolut zentriertes Panel
   ================================================================ */
.header-center-anchor {
  /* Hält Grid-Spalte 2 besetzt; kein sichtbarer Inhalt */
  flex-shrink: 0;
}

.header-center {
  position: absolute;
  left: 50%;
  top: 2px;
  bottom: calc(
    -1 * (max(var(--bump-center), 50dvh - min(480px, 45dvh) - var(--header-total-height)) + 7px)
  );
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0;
  pointer-events: none;
  width: clamp(200px, 20vw, 280px);
}

body.bard-modal-open .center-chimes {
  border-left: 4px solid #7a4e20;
  border-right: 4px solid #7a4e20;
  border-bottom: none;
  border-radius: 0;
}

.center-wing {
  flex-shrink: 0;
  width: 20px;
  height: 2px;
  background: linear-gradient(to right, transparent, rgba(255, 200, 80, 0.38));
  align-self: center;
  position: relative;
  top: calc(-1 * (var(--bump-center) + 2px) / 2);
}
.center-wing--right {
  background: linear-gradient(to left, transparent, rgba(255, 200, 80, 0.38));
}

.center-chimes {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  flex-shrink: 0;
  background: linear-gradient(to bottom, rgba(30, 16, 6, 0.97), rgba(10, 6, 2, 0.99));
  border-left: 1px solid rgba(255, 200, 80, 0.24);
  border-right: 1px solid rgba(255, 200, 80, 0.24);
  border-bottom: 1px solid rgba(255, 200, 80, 0.28);
  border-radius: 0 0 8px 8px;
  padding: 6px 20px 6px 14px;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.08),
    0 6px 24px rgba(0, 0, 0, 0.7);
  align-self: stretch;
}

.header-chime-icon {
  width: clamp(38px, 4.5vw, 58px);
  height: clamp(38px, 4.5vw, 58px);
  object-fit: contain;
  flex-shrink: 0;
}

/* ================================================================
   TRENNLINIEN
   ================================================================ */
.header-divider {
  flex-shrink: 0;
  width: 1px;
  height: 18px;
  background: var(--rpg-wood-mid, rgba(255, 200, 80, 0.15));
  border-radius: 1px;
  margin-inline: 2px;
  align-self: center;
}

/* ================================================================
   TYPOGRAFIE (globale Fallback-Klassen)
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
  font-size: clamp(1.6rem, 2.2vw, 2.6rem);
  font-weight: 800;
  letter-spacing: 0.04em;
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
  color: #74d448;
  filter: drop-shadow(0 0 7px rgba(116, 212, 72, 0.4));
}
.dmg-text-glow {
  color: #ff7a50;
  filter: drop-shadow(0 0 7px rgba(255, 100, 60, 0.4));
}

/* ================================================================
   CENTER STAT PANELS (Fallback)
   ================================================================ */
.center-stat-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  flex-shrink: 0;
  pointer-events: none;
  margin-bottom: var(--bump-center);
}
.center-stat-panel--stacked {
  padding: 0 10px;
}

.stat-grid {
  display: grid;
  grid-template-columns: auto auto;
  column-gap: 6px;
  row-gap: 3px;
  align-items: baseline;
}
.stat-grid--left .header-label,
.stat-grid--left .stat-value,
.stat-grid--right .header-label,
.stat-grid--right .stat-value {
  text-align: left;
}

/* ================================================================
   INVENTAR-KREIS
   ================================================================ */
.header-inventory-bump {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex-shrink: 0;
}
.inventory-circle-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  display: block;
}
.inventory-portrait-inner {
  border-radius: 50%;
  background: #141410;
  transition: transform 0.3s ease;
}
.inventory-circle-btn:hover .inventory-portrait-inner {
  transform: scale(1.06);
}
.inventory-circle-btn:active .inventory-portrait-inner {
  transform: scale(0.96);
}

/* ================================================================
   LEGACY
   ================================================================ */
.header-right-status-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: clamp(150px, 14vw, 210px);
  padding: 6px 8px;
  background: rgba(6, 4, 14, 0.55);
  border: 1px solid rgba(255, 200, 80, 0.12);
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 200, 80, 0.04),
    0 4px 16px rgba(0, 0, 0, 0.45);
}
.status-panel-divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 200, 80, 0.18) 30%,
    rgba(251, 146, 60, 0.18) 70%,
    transparent
  );
  margin-inline: 2px;
}
.header-dot {
  font-size: 1.2rem;
  line-height: 1;
  color: var(--rpg-wood-mid, rgba(255, 200, 80, 0.25));
  user-select: none;
  flex-shrink: 0;
}
</style>
