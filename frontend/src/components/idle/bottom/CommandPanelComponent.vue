<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlanetShopStore, PLANET_ROLES } from '@/stores/planetShopStore'
import type { PlanetRoleType } from '@/stores/planetShopStore'
import ChampionSelectorComponent from '@/components/header/ChampionSelectorComponent.vue'
import { HUD_PANEL_ARC_R } from '@/config/constants'

const planetStore = usePlanetShopStore()
const { slots } = storeToRefs(planetStore)

const ARC_R = HUD_PANEL_ARC_R
const CORNER_R = 20
const framePath = `M 440,0 L ${ARC_R + 2},0 A ${ARC_R},${ARC_R} 0 0,0 2,${ARC_R} L 2,${380 - CORNER_R} A ${CORNER_R},${CORNER_R} 0 0,1 ${2 - CORNER_R},380`

function roleColor(role: PlanetRoleType): string {
  return PLANET_ROLES[role].color
}

function roleImage(role: PlanetRoleType): string {
  return PLANET_ROLES[role].image
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}
</script>

<template>
  <div class="cmd-hud">
    <div class="cmd-panel">
      <div class="cmd-surface-fill" />
      <div class="cmd-surface-glow" />
      <div class="cmd-surface-floor" />

      <!-- ── Champion Slots ── -->
      <div class="cmd-team-slots-wrapper">
        <div class="cmd-team-slots">
          <ChampionSelectorComponent />
        </div>
      </div>

      <!-- ── Separator ── -->
      <div class="cmd-sep">
        <div class="cmd-sep-line" />
      </div>

      <!-- ── Planet Grid ── -->
      <div class="cmd-planet-grid">
        <div
          v-for="(slot, index) in slots"
          :key="slot.id"
          class="cmd-planet-tile"
          :class="{
            'cmd-planet-tile--filled': slot.purchased && !!slot.role,
            'cmd-planet-tile--empty-slot': slot.purchased && !slot.role,
            'cmd-planet-tile--locked': !slot.purchased && !planetStore.canAffordSlot(slot.id),
            'cmd-planet-tile--buy': !slot.purchased,
            [`cmd-planet-tile--role-${slot.role}`]: slot.purchased && !!slot.role,
          }"
          :style="slot.purchased && slot.role ? { '--role-color': roleColor(slot.role) } : {}"
          @click="
            slot.purchased ? planetStore.openRoleModal(slot.id) : planetStore.buySlot(slot.id)
          "
        >
          <template v-if="slot.purchased && slot.role">
            <img :src="roleImage(slot.role)" class="cmd-tile-planet-img" alt="" />
            <div class="cmd-tile-role-glow" />
          </template>

          <template v-else-if="slot.purchased">
            <div class="cmd-tile-icon cmd-tile-icon--empty">＋</div>
          </template>

          <template v-else>
            <div class="cmd-tile-icon cmd-tile-icon--locked">🔒</div>
            <div class="cmd-tile-label cmd-tile-label--cost">
              🔔 {{ formatNumber(planetStore.getSlotCost(slot.id)) }}
            </div>
          </template>

          <div
            v-if="!slot.purchased"
            class="cmd-tile-afford-dot"
            :class="{ 'cmd-tile-afford-dot--yes': planetStore.canAffordSlot(slot.id) }"
          />

          <!-- ── Slot-Nummer Badge ── -->
          <div class="cmd-slot-number-badge">
            <span class="cmd-slot-number-text">Slot {{ index + 1 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SVG frame -->
    <svg
      class="cmd-frame-svg"
      viewBox="0 0 440 440"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="cmdGoldGlow" x="-8%" y="-8%" width="116%" height="116%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- ── Haupt-Frame ── -->
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
        filter="url(#cmdGoldGlow)"
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
</template>

<style scoped>
.cmd-hud {
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 10000;
  width: 440px;
  height: 440px;
  pointer-events: none;
}

@media (max-width: 600px) {
  .cmd-hud {
    display: none;
  }
}

.cmd-panel {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 440px;
  height: 440px;
  pointer-events: auto;
  overflow: hidden;
  box-sizing: border-box;
  clip-path: path('M 440,0 L 62,0 A 60,60 0 0,0 2,60 L 2,440 L 440,440 Z');
  background: transparent;
}

.cmd-surface-fill {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.92));
}

.cmd-surface-glow {
  position: absolute;
  inset: auto 0 0 0;
  height: 180px;
  z-index: 0;
  background:
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0) 0%,
      rgba(18, 7, 2, 0.1) 24%,
      rgba(18, 7, 2, 0.28) 100%
    ),
    linear-gradient(180deg, rgba(103, 47, 10, 0.08), rgba(43, 16, 5, 0.2));
  pointer-events: none;
}

.cmd-surface-floor {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 140px;
  z-index: 0;
  background: linear-gradient(180deg, rgba(30, 12, 4, 0.72) 0%, rgba(22, 8, 2, 0.98) 100%), #160802;
  pointer-events: none;
}

.cmd-team-slots-wrapper {
  position: absolute;
  top: 8px;
  left: 10px;
  right: 8px;
  height: 178px;
  z-index: 2;
  border: none !important;
  outline: none !important;
  background: transparent;
  box-shadow: none !important;
}

.cmd-team-slots {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  border: none !important;
  outline: none !important;
  background: transparent;
  box-shadow: none !important;
}

.cmd-sep {
  position: absolute;
  top: 190px;
  left: 8px;
  right: 8px;
  height: 20px;
  z-index: 2;
  display: flex;
  align-items: center;
}

.cmd-sep-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(200, 144, 64, 0.18) 15%,
    rgba(210, 160, 40, 0.55) 50%,
    rgba(200, 144, 64, 0.18) 85%,
    transparent 100%
  );
  border-radius: 999px;
}

/* Planet Grid - 3×2 */
.cmd-planet-grid {
  position: absolute;
  top: 214px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 8px;
  overflow: hidden;
  padding: 4px;
}

/* Planet Tile Basis */
.cmd-planet-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  background: linear-gradient(180deg, rgba(52, 26, 10, 0.55), rgba(28, 13, 5, 0.72));
  border: 2px solid rgba(122, 78, 32, 0.45);
  border-radius: 12px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
  overflow: hidden;
  min-height: 0;
  box-shadow: inset 0 1px 0 rgba(255, 200, 80, 0.05);
}

.cmd-planet-tile:hover {
  background: linear-gradient(180deg, rgba(72, 36, 12, 0.7), rgba(40, 18, 6, 0.82));
  border-color: rgba(200, 144, 64, 0.75);
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.1),
    0 0 12px rgba(200, 144, 64, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.5);
  transform: translateY(-1px);
}

.cmd-planet-tile:active {
  transform: translateY(0px) scale(0.97);
}

/* Gefüllter Slot */
.cmd-planet-tile--filled {
  padding: 0;
  background: linear-gradient(170deg, #1e1208 0%, #150f04 100%);
  border-width: 3px;
}

.cmd-planet-tile--empty-slot {
  border: 2px solid rgba(90, 142, 224, 0.22);
}

.cmd-planet-tile--empty-slot:hover {
  border-color: rgba(90, 142, 224, 0.52);
}

/* Gesperrter Slot */
.cmd-planet-tile--locked {
  opacity: 0.38;
  cursor: not-allowed;
  border: 2px solid rgba(200, 144, 64, 0.08);
}

.cmd-planet-tile--locked:hover {
  transform: none;
  box-shadow: none;
  border-color: rgba(200, 144, 64, 0.08);
  background: linear-gradient(180deg, rgba(52, 26, 10, 0.55), rgba(28, 13, 5, 0.72));
}

/* Kaufbarer Slot */
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) {
  border: 2px solid rgba(82, 184, 48, 0.18);
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked):hover {
  border-color: rgba(82, 184, 48, 0.55);
  box-shadow:
    0 0 12px -2px rgba(82, 184, 48, 0.3),
    0 6px 16px rgba(0, 0, 0, 0.2);
}

/* Rollenfarbige Rahmen wie beim Champion Selector */
.cmd-planet-tile--role-harvest.cmd-planet-tile--filled {
  border: 3px solid rgba(80, 192, 96, 0.92);
  box-shadow:
    0 0 10px -1px rgba(80, 192, 96, 0.45),
    inset 0 1px 0 rgba(80, 192, 96, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

.cmd-planet-tile--role-research.cmd-planet-tile--filled {
  border: 3px solid rgba(80, 144, 232, 0.92);
  box-shadow:
    0 0 10px -1px rgba(80, 144, 232, 0.45),
    inset 0 1px 0 rgba(80, 144, 232, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

.cmd-planet-tile--role-trade.cmd-planet-tile--filled {
  border: 3px solid rgba(232, 152, 64, 0.92);
  box-shadow:
    0 0 10px -1px rgba(232, 152, 64, 0.45),
    inset 0 1px 0 rgba(232, 152, 64, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

.cmd-planet-tile--role-defense.cmd-planet-tile--filled {
  border: 3px solid rgba(224, 80, 80, 0.92);
  box-shadow:
    0 0 10px -1px rgba(224, 80, 80, 0.45),
    inset 0 1px 0 rgba(224, 80, 80, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

.cmd-planet-tile--role-support.cmd-planet-tile--filled {
  border: 3px solid rgba(184, 200, 216, 0.92);
  box-shadow:
    0 0 10px -1px rgba(184, 200, 216, 0.45),
    inset 0 1px 0 rgba(184, 200, 216, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

/* Hover: stärkerer Glow je Rollenfarbe */
.cmd-planet-tile--role-harvest.cmd-planet-tile--filled:hover {
  border-color: #50c060;
  box-shadow:
    0 0 14px -1px rgba(80, 192, 96, 0.65),
    inset 0 1px 0 rgba(80, 192, 96, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}

.cmd-planet-tile--role-research.cmd-planet-tile--filled:hover {
  border-color: #5090e8;
  box-shadow:
    0 0 14px -1px rgba(80, 144, 232, 0.65),
    inset 0 1px 0 rgba(80, 144, 232, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}

.cmd-planet-tile--role-trade.cmd-planet-tile--filled:hover {
  border-color: #e89840;
  box-shadow:
    0 0 14px -1px rgba(232, 152, 64, 0.65),
    inset 0 1px 0 rgba(232, 152, 64, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}

.cmd-planet-tile--role-defense.cmd-planet-tile--filled:hover {
  border-color: #e05050;
  box-shadow:
    0 0 14px -1px rgba(224, 80, 80, 0.65),
    inset 0 1px 0 rgba(224, 80, 80, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}

.cmd-planet-tile--role-support.cmd-planet-tile--filled:hover {
  border-color: #b8c8d8;
  box-shadow:
    0 0 14px -1px rgba(184, 200, 216, 0.65),
    inset 0 1px 0 rgba(184, 200, 216, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}

.cmd-tile-planet-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.18s ease;
  border-radius: 8px;
}

.cmd-planet-tile:hover .cmd-tile-planet-img {
  transform: scale(1.06);
}

.cmd-tile-role-glow {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: radial-gradient(
    ellipse at 50% 110%,
    var(--role-color, rgba(200, 144, 64, 0.2)) 0%,
    transparent 65%
  );
  pointer-events: none;
  z-index: 1;
}

.cmd-tile-icon {
  position: relative;
  z-index: 1;
  font-size: 26px;
  line-height: 1;
  text-align: center;
  transition: transform 0.15s;
}

.cmd-planet-tile:hover .cmd-tile-icon {
  transform: scale(1.15);
}

.cmd-tile-icon--empty {
  color: rgba(90, 142, 224, 0.35);
  font-size: 24px;
}

.cmd-tile-icon--locked {
  color: rgba(255, 255, 255, 0.15);
  font-size: 20px;
}

.cmd-tile-label {
  position: relative;
  z-index: 1;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-align: center;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  opacity: 0.88;
}

.cmd-tile-label--cost {
  color: rgba(200, 144, 64, 0.6);
  font-size: 8.5px;
}

.cmd-tile-afford-dot {
  position: absolute;
  top: 5px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(200, 144, 64, 0.2);
  border: 1px solid rgba(200, 144, 64, 0.3);
  z-index: 2;
}

.cmd-tile-afford-dot--yes {
  background: rgba(82, 184, 48, 0.7);
  border-color: rgba(110, 210, 64, 0.5);
  box-shadow: 0 0 4px rgba(82, 184, 48, 0.5);
}

/* Slot-Nummer Badge */
.cmd-slot-number-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 4px 4px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
}

.cmd-slot-number-text {
  font-size: 11px;
  font-weight: 800;
  color: rgba(180, 130, 50, 0.6);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  line-height: 1;
  transition: color 0.2s ease;
}

.cmd-planet-tile--filled .cmd-slot-number-text {
  color: rgba(220, 170, 60, 0.95);
}

.cmd-planet-tile:hover .cmd-slot-number-text {
  color: #e8c040;
}

/* SVG Frame */
.cmd-frame-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 440px;
  height: 440px;
  pointer-events: none;
  z-index: 100;
  overflow: visible;
  animation: cmd-pulse-glow 3.5s ease-in-out infinite;
}

@keyframes cmd-pulse-glow {
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
