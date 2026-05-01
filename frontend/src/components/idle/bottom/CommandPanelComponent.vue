<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlanetShopStore, PLANET_ROLES } from '@/stores/planetShopStore'
import type { PlanetRoleType } from '@/stores/planetShopStore'
import ChampionSelectorComponent from '@/components/header/ChampionSelectorComponent.vue'

const planetStore = usePlanetShopStore()
const { slots } = storeToRefs(planetStore)

// ── Neuer kleinerer Arc-Radius: 60px statt 218px ──
// Bogen startet bei (380, 0), kurve bis (2, 60), dann gerade nach unten
const ARC_R = 60
const CORNER_R = 20
const framePath = `M 440,0 L ${ARC_R + 2},0 A ${ARC_R},${ARC_R} 0 0,0 2,${ARC_R} L 2,${380 - CORNER_R} A ${CORNER_R},${CORNER_R} 0 0,1 ${2 - CORNER_R},380`

function roleColor(role: PlanetRoleType): string {
  return PLANET_ROLES[role].color
}
function roleIcon(role: PlanetRoleType): string {
  return PLANET_ROLES[role].icon
}
function roleBonusShort(role: PlanetRoleType): string {
  const r = PLANET_ROLES[role]
  switch (r.bonusType) {
    case 'auto_attack_dps':
      return `+${r.bonusPerSlot} DPS`
    case 'material_harvest_rate':
      return `⏱30s`
    case 'expedition_reward_multiplier':
      return `+${Math.round(r.bonusPerSlot * 100)}%`
    case 'boss_damage_reduction':
      return `-${Math.round(r.bonusPerSlot * 100)}%`
    case 'offline_boost':
      return `+${Math.round(r.bonusPerSlot * 100)}%`
    case 'building_cps_multiplier':
      return `+${Math.round(r.bonusPerSlot * 100)}%`
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

      <!-- ── Champion Slots: volle Breite ab y=70 ── -->
      <div class="cmd-team-slots">
        <ChampionSelectorComponent />
      </div>

      <!-- ── Separator ── -->
      <div class="cmd-sep">
        <div class="cmd-sep-line" />
        <span class="cmd-sep-dot">🪐</span>
        <div class="cmd-sep-line" />
      </div>

      <!-- ── Planet Grid ── -->
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
            <div
              class="cmd-tile-icon"
              :style="{ color: roleColor(slot.role), '--role-color': roleColor(slot.role) }"
            >
              {{ roleIcon(slot.role) }}
            </div>
            <div class="cmd-tile-bonus" :style="{ color: roleColor(slot.role) }">
              {{ roleBonusShort(slot.role) }}
            </div>
          </template>

          <template v-else-if="slot.purchased">
            <div class="cmd-tile-icon cmd-tile-icon--empty">＋</div>
            <div class="cmd-tile-bonus cmd-tile-bonus--warn">Wählen</div>
          </template>

          <template v-else>
            <div class="cmd-tile-icon cmd-tile-icon--locked">🔒</div>
            <div class="cmd-tile-bonus cmd-tile-bonus--cost">
              🔔 {{ formatNumber(planetStore.getSlotCost(slot.id)) }}
            </div>
          </template>

          <div
            v-if="!slot.purchased"
            class="cmd-tile-afford-dot"
            :class="{ 'cmd-tile-afford-dot--yes': planetStore.canAffordSlot(slot.id) }"
          />
        </div>
      </div>
    </div>

    <!-- SVG frame mit neuem kleinen Arc -->
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

/* ── Panel: clip-path passt zum neuen ARC_R=60 ──
   Bogen von (62, 0) → links oben mit Radius 60 → (2, 60) → gerade runter */
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

/* ── Champion Slots ──
   Mit ARC_R=60: Ab y=60 ist die volle Breite frei (x=2).
   Slots starten bei top: 8px, left: 10px, right: 8px
   → volle Breite minus kleiner Rand.
   Höhe: 180px — großzügig für die Champion-Karten. */
.cmd-team-slots {
  position: absolute;
  top: 8px;
  left: 10px;
  right: 8px;
  height: 180px;
  z-index: 2;
  display: flex;
  align-items: stretch;
}

/* ── Separator ── */
.cmd-sep {
  position: absolute;
  top: 194px;
  left: 10px;
  right: 10px;
  height: 14px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cmd-sep-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200, 144, 64, 0.22), transparent);
}
.cmd-sep-dot {
  font-size: 11px;
  line-height: 1;
  opacity: 0.5;
}

/* ── Planet Grid ──
   top: 212, bottom: 8 → ca. 220px für das Grid */
.cmd-planet-grid {
  position: absolute;
  top: 212px;
  left: 10px;
  right: 10px;
  bottom: 8px;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 1fr;
  gap: 5px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 78, 24, 0.9) rgba(20, 10, 4, 0.2);
}
.cmd-planet-grid::-webkit-scrollbar {
  width: 3px;
}
.cmd-planet-grid::-webkit-scrollbar-track {
  background: rgba(20, 10, 4, 0.2);
  border-radius: 999px;
}
.cmd-planet-grid::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8c5d1b, #5d3810);
  border-radius: 999px;
}

/* ── Planet Tile ── */
.cmd-planet-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 4px 5px;
  background: linear-gradient(180deg, rgba(52, 26, 10, 0.55), rgba(28, 13, 5, 0.72));
  border: 1px solid rgba(200, 144, 64, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    transform 0.12s,
    box-shadow 0.15s;
  overflow: hidden;
}
.cmd-planet-tile:hover {
  border-color: rgba(200, 144, 64, 0.32);
  background: linear-gradient(180deg, rgba(72, 36, 12, 0.7), rgba(40, 18, 6, 0.82));
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.cmd-planet-tile:active {
  transform: scale(0.95);
}

.cmd-planet-tile--purchased:not(:has(.cmd-tile-icon--empty)):hover {
  box-shadow:
    0 0 14px -2px var(--role-color, rgba(200, 144, 64, 0.4)),
    0 6px 16px rgba(0, 0, 0, 0.25);
  border-color: var(--role-color, rgba(200, 144, 64, 0.3));
}
.cmd-planet-tile--locked {
  opacity: 0.42;
  cursor: not-allowed;
}
.cmd-planet-tile--locked:hover {
  transform: none;
  box-shadow: none;
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) {
  border-color: rgba(82, 184, 48, 0.12);
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked):hover {
  border-color: rgba(82, 184, 48, 0.38);
  box-shadow:
    0 0 10px -2px rgba(82, 184, 48, 0.28),
    0 6px 16px rgba(0, 0, 0, 0.2);
}

.cmd-tile-num {
  position: absolute;
  top: 3px;
  left: 4px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: rgba(200, 144, 64, 0.08);
  border: 1px solid rgba(200, 144, 64, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 6.5px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.45);
  line-height: 1;
}

.cmd-tile-icon {
  font-size: 24px;
  line-height: 1;
  text-align: center;
  filter: drop-shadow(0 0 6px var(--role-color, currentColor));
  transition:
    filter 0.2s,
    transform 0.15s;
}
.cmd-planet-tile:hover .cmd-tile-icon {
  filter: drop-shadow(0 0 10px var(--role-color, currentColor))
    drop-shadow(0 0 3px var(--role-color, currentColor));
  transform: scale(1.12);
}
.cmd-tile-icon--empty {
  color: rgba(200, 144, 64, 0.2);
  filter: none;
  font-size: 20px;
}
.cmd-tile-icon--locked {
  color: rgba(255, 255, 255, 0.15);
  filter: none;
  font-size: 18px;
}

.cmd-tile-bonus {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-align: center;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  opacity: 0.88;
  text-shadow: 0 0 8px currentColor;
}
.cmd-tile-bonus--warn {
  color: rgba(90, 142, 224, 0.9);
  text-shadow: 0 0 8px rgba(90, 142, 224, 0.5);
}
.cmd-tile-bonus--cost {
  color: rgba(200, 144, 64, 0.6);
  font-size: 7.5px;
}

.cmd-tile-afford-dot {
  position: absolute;
  top: 3px;
  right: 4px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(200, 144, 64, 0.2);
  border: 1px solid rgba(200, 144, 64, 0.3);
}
.cmd-tile-afford-dot--yes {
  background: rgba(82, 184, 48, 0.7);
  border-color: rgba(110, 210, 64, 0.5);
  box-shadow: 0 0 4px rgba(82, 184, 48, 0.5);
}

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
