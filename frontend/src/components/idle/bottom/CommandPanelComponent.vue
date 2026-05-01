<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlanetShopStore, PLANET_ROLES } from '@/stores/planetShopStore'
import type { PlanetRoleType } from '@/stores/planetShopStore'
import ChampionSelectorComponent from '@/components/header/ChampionSelectorComponent.vue'

const planetStore = usePlanetShopStore()
const { slots } = storeToRefs(planetStore)

const CORNER_R = 20
const framePath = `M 440,0 L 220,0 A 218,218 0 0,0 2,220 L 2,${380 - CORNER_R} A ${CORNER_R},${CORNER_R} 0 0,1 ${2 - CORNER_R},380`

function roleColor(role: PlanetRoleType): string {
  return PLANET_ROLES[role].color
}
function roleIcon(role: PlanetRoleType): string {
  return PLANET_ROLES[role].icon
}
function roleName(role: PlanetRoleType): string {
  return PLANET_ROLES[role].name
}
function roleBonusShort(role: PlanetRoleType): string {
  const r = PLANET_ROLES[role]
  switch (r.bonusType) {
    case 'auto_attack_dps':
      return `+${r.bonusPerSlot} DPS/s`
    case 'material_harvest_rate':
      return `Ernte alle 30s`
    case 'expedition_reward_multiplier':
      return `+${Math.round(r.bonusPerSlot * 100)}% Exped.`
    case 'boss_damage_reduction':
      return `-${Math.round(r.bonusPerSlot * 100)}% Orbit-Dmg`
    case 'offline_boost':
      return `+${Math.round(r.bonusPerSlot * 100)}% Offline`
    case 'building_cps_multiplier':
      return `+${Math.round(r.bonusPerSlot * 100)}% Gebäude-CPS`
  }
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

      <!-- ── Body ── -->
      <div class="cmd-body">
        <!-- Champion Slots -->
        <div class="cmd-team-slots">
          <ChampionSelectorComponent />
        </div>

        <!-- Section separator -->
        <div class="cmd-sep">
          <div class="cmd-sep-line" />
          <span class="cmd-sep-label">🪐 Orbit-Slots</span>
          <div class="cmd-sep-line" />
        </div>

        <!-- Planet Grid -->
        <div class="cmd-planet-grid">
          <div
            v-for="(slot, idx) in slots"
            :key="slot.id"
            class="cmd-planet-tile"
            :class="{
              'cmd-planet-tile--purchased': slot.purchased,
              'cmd-planet-tile--locked': !slot.purchased && !planetStore.canAffordSlot(slot.id),
              'cmd-planet-tile--buy': !slot.purchased,
            }"
            @click="
              slot.purchased ? planetStore.openRoleModal(slot.id) : planetStore.buySlot(slot.id)
            "
          >
            <div class="cmd-tile-num">{{ idx + 1 }}</div>

            <template v-if="slot.purchased && slot.role">
              <div class="cmd-tile-icon" :style="{ color: roleColor(slot.role) }">
                {{ roleIcon(slot.role) }}
              </div>
              <div class="cmd-tile-info">
                <span class="cmd-tile-name" :style="{ color: roleColor(slot.role) }">{{
                  roleName(slot.role)
                }}</span>
                <span class="cmd-tile-bonus">{{ roleBonusShort(slot.role) }}</span>
              </div>
              <div class="cmd-tile-action">Ändern</div>
            </template>

            <template v-else-if="slot.purchased">
              <div class="cmd-tile-icon cmd-tile-icon--empty">＋</div>
              <div class="cmd-tile-info">
                <span class="cmd-tile-name cmd-tile-name--empty">Bereit</span>
                <span class="cmd-tile-bonus cmd-tile-bonus--warn">Keine Rolle</span>
              </div>
              <div class="cmd-tile-action cmd-tile-action--assign">Wählen</div>
            </template>

            <template v-else>
              <div class="cmd-tile-icon cmd-tile-icon--locked">🔒</div>
              <div class="cmd-tile-info">
                <span class="cmd-tile-name cmd-tile-name--locked">Gesperrt</span>
                <span class="cmd-tile-bonus"
                  >🔔 {{ formatNumber(planetStore.getSlotCost(slot.id)) }}</span
                >
              </div>
              <div
                class="cmd-tile-action"
                :class="
                  planetStore.canAffordSlot(slot.id)
                    ? 'cmd-tile-action--buy'
                    : 'cmd-tile-action--poor'
                "
              >
                Kaufen
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- SVG frame — same as ChatWidget -->
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
/* ── Outer HUD wrapper ── */
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

/* ── Panel (clipped to same arc shape as ChatWidget) ── */
.cmd-panel {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 440px;
  height: 440px;
  pointer-events: auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  clip-path: path('M 440,0 L 220,0 A 218,218 0 0,0 2,220 L 2,440 L 440,440 Z');
  background: transparent;
}

/* ── Background layers (same as ChatWidget) ── */
.cmd-surface-fill {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.92));
}
.cmd-surface-glow {
  position: absolute;
  inset: auto 0 0 0;
  height: 140px;
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
  height: 120px;
  z-index: 0;
  background: linear-gradient(180deg, rgba(30, 12, 4, 0.72) 0%, rgba(22, 8, 2, 0.98) 100%), #160802;
  pointer-events: none;
}

/* ── Header arc area ── */
.cmd-header-arc {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 92px;
  padding: 18px 16px 0 56px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 5px;
  z-index: 2;
}
.cmd-header-arc::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 115%, rgba(255, 205, 96, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(92, 50, 18, 0.24), rgba(46, 22, 8, 0.08));
  pointer-events: none;
}
.cmd-header-title {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 7px;
}
.cmd-header-icon {
  font-size: 16px;
  line-height: 1;
}
.cmd-header-label {
  font-size: 15px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.35));
}
.cmd-header-sub {
  position: relative;
  z-index: 2;
  font-size: 10px;
  color: rgba(200, 144, 64, 0.4);
  letter-spacing: 0.04em;
  line-height: 1;
  padding-left: 1px;
}

/* ── Body ── */
.cmd-body {
  position: absolute;
  inset: 92px 14px 0 14px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Champion slots ── */
.cmd-team-slots {
  height: 130px;
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  padding: 6px 0 4px;
}

/* ── Section separator ── */
.cmd-sep {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0 4px;
  flex-shrink: 0;
}
.cmd-sep-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200, 144, 64, 0.25), transparent);
}
.cmd-sep-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.45);
  white-space: nowrap;
}

/* ── Planet grid ── */
.cmd-planet-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  overflow-y: auto;
  padding-bottom: 6px;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 78, 24, 0.95) rgba(20, 10, 4, 0.28);
}
.cmd-planet-grid::-webkit-scrollbar {
  width: 4px;
}
.cmd-planet-grid::-webkit-scrollbar-track {
  background: rgba(20, 10, 4, 0.24);
  border-radius: 999px;
}
.cmd-planet-grid::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8c5d1b, #5d3810);
  border-radius: 999px;
}

/* ── Planet tile ── */
.cmd-planet-tile {
  position: relative;
  display: grid;
  grid-template-columns: 18px 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  background: linear-gradient(180deg, rgba(58, 29, 11, 0.56), rgba(33, 16, 7, 0.72));
  border: 1px solid rgba(200, 144, 64, 0.08);
  border-radius: 10px;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 238, 190, 0.03),
    0 4px 10px rgba(0, 0, 0, 0.14);
  transition:
    border-color 0.15s,
    background 0.15s,
    transform 0.12s;
  min-height: 52px;
}
.cmd-planet-tile:hover {
  border-color: rgba(200, 144, 64, 0.3);
  background: linear-gradient(180deg, rgba(78, 40, 14, 0.68), rgba(44, 22, 8, 0.82));
  transform: translateY(-1px);
}
.cmd-planet-tile:active {
  transform: scale(0.97);
}

.cmd-planet-tile--locked {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: auto;
}
.cmd-planet-tile--locked:hover {
  transform: none;
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) {
  border-color: rgba(82, 184, 48, 0.12);
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked):hover {
  border-color: rgba(82, 184, 48, 0.35);
}

.cmd-planet-tile--purchased {
  border-color: rgba(200, 144, 64, 0.12);
}

/* ── Tile number badge ── */
.cmd-tile-num {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(200, 144, 64, 0.1);
  border: 1px solid rgba(200, 144, 64, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 800;
  color: rgba(200, 144, 64, 0.55);
  flex-shrink: 0;
  align-self: center;
}

/* ── Tile icon ── */
.cmd-tile-icon {
  font-size: 18px;
  line-height: 1;
  text-align: center;
  align-self: center;
  filter: drop-shadow(0 0 5px currentColor);
  grid-column: unset;
}
.cmd-tile-icon--empty {
  color: rgba(200, 144, 64, 0.25);
  filter: none;
  font-size: 16px;
}
.cmd-tile-icon--locked {
  color: rgba(255, 255, 255, 0.2);
  filter: none;
  font-size: 14px;
}

/* ── Tile info ── */
.cmd-tile-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.cmd-tile-name {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}
.cmd-tile-name--empty {
  color: #a8e060;
}
.cmd-tile-name--locked {
  color: rgba(200, 144, 64, 0.35);
}
.cmd-tile-bonus {
  font-size: 9px;
  color: rgba(200, 144, 64, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}
.cmd-tile-bonus--warn {
  color: rgba(200, 144, 64, 0.9);
}

/* ── Tile action button ── */
.cmd-tile-action {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid #5c3310;
  background: rgba(60, 30, 10, 0.6);
  color: rgba(200, 144, 64, 0.6);
  white-space: nowrap;
  align-self: center;
  flex-shrink: 0;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;
}
.cmd-planet-tile:hover .cmd-tile-action {
  color: #e8c040;
  border-color: #7a4e20;
  background: rgba(80, 40, 10, 0.7);
}
.cmd-tile-action--assign {
  border-color: rgba(90, 142, 224, 0.5);
  background: rgba(42, 78, 144, 0.3);
  color: rgba(90, 142, 224, 0.8);
}
.cmd-planet-tile:hover .cmd-tile-action--assign {
  border-color: #5a8ee0;
  color: #7ab0f8;
  background: rgba(42, 78, 144, 0.55);
}
.cmd-tile-action--buy {
  border-color: rgba(82, 184, 48, 0.5);
  background: rgba(46, 122, 26, 0.3);
  color: rgba(110, 192, 64, 0.9);
}
.cmd-planet-tile:hover .cmd-tile-action--buy {
  border-color: #6ec040;
  color: #a8e060;
  background: rgba(46, 122, 26, 0.55);
}
.cmd-tile-action--poor {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── SVG frame (same animation as ChatWidget) ── */
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
