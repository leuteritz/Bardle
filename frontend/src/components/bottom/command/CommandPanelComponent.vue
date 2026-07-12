<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import {
  usePlanetShopStore,
  PLANET_ROLES,
  planetLevelBonusMultiplier,
} from '@/stores/planetShopStore'
import type { PlanetRoleType, PlanetSlot } from '@/stores/planetShopStore'
import { useUiStore } from '@/stores/uiStore'
import { formatNumber } from '@/config/numberFormat'
import {
  HP_COLOR_THRESHOLD_HIGH,
  HP_COLOR_THRESHOLD_LOW,
} from '@/config/constants'
import ChampionSelectorComponent from '@/components/bottom/command/ChampionSelectorComponent.vue'

const planetStore = usePlanetShopStore()
const uiStore = useUiStore()
const { slots } = storeToRefs(planetStore)

function roleColor(role: PlanetRoleType): string {
  return PLANET_ROLES[role].color
}

function roleImage(role: PlanetRoleType): string {
  return PLANET_ROLES[role].image
}

function hpFillColor(ratio: number): string {
  if (ratio > HP_COLOR_THRESHOLD_HIGH) return 'linear-gradient(to right, #2e7a1a, #52b830)'
  if (ratio > HP_COLOR_THRESHOLD_LOW) return 'linear-gradient(to right, #9a6010, #d4a030)'
  return 'linear-gradient(to right, #7a1a10, #cc3020)'
}

function hpTextColor(ratio: number): string {
  if (ratio > HP_COLOR_THRESHOLD_HIGH) return '#52b830'
  if (ratio > HP_COLOR_THRESHOLD_LOW) return '#d4a030'
  return '#cc3020'
}

/** Compact bonus tag shown at the top of a planet tile (e.g. "+2 DPS", "×1.3"). */
function slotBonusText(slot: PlanetSlot): string {
  if (!slot.role) return ''
  const role = PLANET_ROLES[slot.role]
  const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
  const v = role.bonusPerSlot * planetLevelBonusMultiplier(slot.level) * mul
  switch (role.bonusType) {
    case 'auto_attack_dps':
      return `+${formatNumber(v)} DPS`
    case 'material_harvest_rate':
      return `+${formatNumber(v)} /s`
    case 'expedition_reward_multiplier':
      return `×${(1 + v).toFixed(1)}`
    case 'boss_damage_reduction':
      return `−${Math.round(v * 100)}%`
    case 'offline_boost':
      return `+${Math.round(v * 100)}%`
    case 'building_cps_multiplier':
      return `+${Math.round(v * 100)}% CPS`
  }
  return ''
}

function handleSlotClick(slot: (typeof slots.value)[number]) {
  uiStore.requestOpenPlanetsTab(slot.id)
  if (!slot.purchased) {
    planetStore.buySlot(slot.id)
  }
}
</script>

<template>
  <div class="cmd-hud">
    <div class="cmd-panel">
      <!-- ── Champion portrait cards (with role ability tracking) ── -->
      <ChampionSelectorComponent />

      <!-- ── Planet dock: single row of 6 ── -->
      <div class="cmd-planet-dock">
        <div
          v-for="(slot, index) in slots"
          :key="slot.id"
          class="cmd-planet-tile"
          :class="{
            'cmd-planet-tile--filled': slot.purchased && !!slot.role,
            'cmd-planet-tile--buffed': !!(slot.jungleBuff?.active),
            'cmd-planet-tile--empty-slot': slot.purchased && !slot.role,
            'cmd-planet-tile--locked': !slot.purchased && !planetStore.canUnlockPlanetSlot(index),
            'cmd-planet-tile--buy': !slot.purchased,
          }"
          :style="slot.purchased && slot.role ? { '--role-color': roleColor(slot.role) } : {}"
          @click="handleSlotClick(slot)"
          @mouseenter="uiStore.setHoveredPlanetSlotId(slot.id)"
          @mouseleave="uiStore.setHoveredPlanetSlotId(null)"
        >
          <template v-if="slot.purchased && slot.role">
            <img :src="roleImage(slot.role)" class="cmd-tile-planet-img" alt="" draggable="false" />
            <div class="cmd-tile-img-vignette" />

            <!-- Jungle Buff: shimmer overlay -->
            <div v-if="slot.jungleBuff?.active" class="cmd-buff-overlay" />

            <!-- Bonus tag top center -->
            <div class="cmd-tile-bonus" :class="{ 'cmd-tile-bonus--buffed': slot.jungleBuff?.active }">
              <Icon
                v-if="slot.jungleBuff?.active"
                icon="game-icons:lightning-storm"
                class="cmd-tile-bonus-icon"
              />
              {{ slotBonusText(slot) }}
            </div>

            <!-- HP value + mini bar -->
            <div class="cmd-tile-hp">
              <div
                class="cmd-tile-hp-value"
                :style="{ color: hpTextColor(slot.currentHp / slot.maxHp) }"
              >
                {{ formatNumber(slot.currentHp) }}
              </div>
              <div class="cmd-tile-hp-track">
                <div
                  class="cmd-tile-hp-fill"
                  :style="{
                    width: `${Math.max(0, Math.min(100, (slot.currentHp / slot.maxHp) * 100))}%`,
                    background: hpFillColor(slot.currentHp / slot.maxHp),
                  }"
                />
              </div>
            </div>
          </template>

          <template v-else-if="slot.purchased">
            <div class="cmd-tile-icon cmd-tile-icon--empty">＋</div>
          </template>

          <template v-else>
            <div class="cmd-tile-icon cmd-tile-icon--locked">
              <img src="/img/lock.png" alt="Locked" class="lock-icon" />
            </div>
            <div v-if="planetStore.canUnlockPlanetSlot(index)" class="cmd-tile-unlock-label">UNLOCK</div>
            <div class="cmd-tile-cost-row">
              <img src="/img/BardAbilities/BardChime.png" class="cmd-tile-chime-img" alt="Chimes" />
              <span class="cmd-tile-cost-value">{{ formatNumber(planetStore.getSlotCost(slot.id)) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cmd-hud {
  /* lives inside the unified bottom-bar shell — bg comes from the shell */
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 2;
  width: 440px;
  height: 443px;
  pointer-events: none;
  transform-origin: bottom right;
  transform: scale(var(--hud-scale, 1));
}

@media (max-width: 600px) {
  .cmd-hud {
    display: none;
  }
}

.cmd-panel {
  position: absolute;
  inset: 14px 20px 16px 20px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Planet dock row ── */
.cmd-planet-dock {
  flex: none;
  height: 118px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  min-width: 0;
}

.cmd-planet-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  border-radius: 5px;
  overflow: hidden;
  border: 2px solid rgba(122, 78, 32, 0.45);
  background: linear-gradient(180deg, rgba(52, 26, 10, 0.55), rgba(28, 13, 5, 0.72));
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.cmd-planet-tile:hover {
  border-color: rgba(200, 144, 64, 0.75);
  box-shadow:
    0 0 12px rgba(200, 144, 64, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.5);
  transform: translateY(-1px);
}
.cmd-planet-tile:active {
  transform: translateY(0) scale(0.97);
}

/* filled: role-colored frame */
.cmd-planet-tile--filled {
  padding: 0;
  border-color: color-mix(in srgb, var(--role-color, #c89040) 90%, transparent);
  background: linear-gradient(170deg, #1e1208 0%, #150f04 100%);
  box-shadow: 0 0 10px -1px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
}
.cmd-planet-tile--filled:hover {
  border-color: var(--role-color, #c89040);
  box-shadow:
    0 0 14px -1px color-mix(in srgb, var(--role-color, #c89040) 65%, transparent),
    0 2px 8px rgba(0, 0, 0, 0.5);
}

.cmd-tile-planet-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: translateZ(0);
  transition: transform 0.18s ease;
  backface-visibility: hidden;
}
.cmd-planet-tile:hover .cmd-tile-planet-img {
  transform: translateZ(0) scale(1.06);
}

.cmd-tile-img-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 32%, transparent 38%, rgba(6, 3, 1, 0.78));
  pointer-events: none;
  z-index: 1;
}

/* ── Bonus tag (top) ── */
.cmd-tile-bonus {
  position: absolute;
  top: 4px;
  left: 0;
  right: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.03em;
  color: color-mix(in srgb, var(--role-color, #e8c040) 45%, #f0e0c8);
  text-shadow: 0 1px 2px #000;
  white-space: nowrap;
  overflow: hidden;
  pointer-events: none;
}
.cmd-tile-bonus--buffed {
  color: #f0d060;
  text-shadow:
    0 1px 2px #000,
    0 0 6px rgba(232, 192, 64, 0.7);
}
.cmd-tile-bonus-icon {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

/* ── HP value + mini bar (bottom) ── */
.cmd-tile-hp {
  position: absolute;
  bottom: 5px;
  left: 5px;
  right: 5px;
  z-index: 4;
  pointer-events: none;
}

.cmd-tile-hp-value {
  text-align: center;
  font-size: 11px;
  line-height: 1;
  margin-bottom: 2px;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 1px 2px #000,
    0 0 6px rgba(0, 0, 0, 0.8);
  transition: color 0.4s ease;
}

.cmd-tile-hp-track {
  height: 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.cmd-tile-hp-fill {
  height: 100%;
  transition:
    width 0.4s cubic-bezier(0.25, 1, 0.4, 1),
    background 0.4s ease;
}

/* ── Empty / locked / buy states ── */
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

.cmd-planet-tile--empty-slot {
  border: 2px dashed var(--rpg-slot-empty-border, rgba(82, 184, 48, 0.52));
  background: linear-gradient(180deg, rgba(8, 18, 6, 0.7), rgba(5, 12, 4, 0.85));
  box-shadow: inset 0 0 14px rgba(52, 160, 24, 0.06);
  animation: cmd-empty-breathe 3s ease-in-out infinite;
}
.cmd-planet-tile--empty-slot:hover {
  border-color: var(--rpg-slot-empty-border-hover, rgba(110, 192, 64, 0.82));
  box-shadow:
    inset 0 0 14px rgba(82, 184, 48, 0.12),
    0 0 8px rgba(82, 184, 48, 0.2);
}

.cmd-tile-icon--empty {
  color: rgba(116, 212, 72, 0.75);
  font-size: 26px;
  text-shadow: 0 0 10px rgba(82, 184, 48, 0.38);
  animation: cmd-empty-icon-pulse 3s ease-in-out infinite;
}

.cmd-planet-tile--locked {
  background: linear-gradient(170deg, #1a1408 0%, #120e04 100%);
  border: 2px solid rgba(122, 78, 32, 0.35);
  box-shadow: none;
  opacity: 0.55;
  filter: grayscale(40%);
  cursor: not-allowed;
}
.cmd-planet-tile--locked:hover {
  border-color: rgba(122, 78, 32, 0.45);
  box-shadow: none;
  transform: none;
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) {
  background: linear-gradient(180deg, rgba(18, 30, 10, 0.72), rgba(12, 20, 6, 0.82));
  border: 2px solid rgba(110, 192, 64, 0.45);
  box-shadow:
    0 0 8px rgba(110, 192, 64, 0.18),
    inset 0 0 10px rgba(110, 192, 64, 0.04);
  animation: cmd-afford-pulse 2.2s ease-in-out infinite;
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked):hover {
  border-color: #6ec040;
  box-shadow:
    0 0 18px rgba(110, 192, 64, 0.6),
    0 0 36px rgba(110, 192, 64, 0.18),
    inset 0 0 12px rgba(110, 192, 64, 0.08);
  transform: translateY(-1px) scale(1.03);
  animation: none;
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) .cmd-tile-chime-img {
  filter: drop-shadow(0 0 4px rgba(232, 192, 64, 0.8));
  animation: cmd-chime-bob 1.5s ease-in-out infinite;
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) .cmd-tile-cost-value {
  color: #f0d060;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.6);
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) .cmd-tile-icon--locked {
  filter: sepia(1) saturate(3) hue-rotate(80deg) brightness(1.1);
}

@keyframes cmd-afford-pulse {
  0%,
  100% {
    border-color: rgba(110, 192, 64, 0.35);
    box-shadow:
      0 0 6px rgba(110, 192, 64, 0.15),
      inset 0 0 8px rgba(110, 192, 64, 0.03);
  }
  50% {
    border-color: #6ec040;
    box-shadow:
      0 0 16px rgba(110, 192, 64, 0.55),
      0 0 28px rgba(110, 192, 64, 0.16),
      inset 0 0 10px rgba(110, 192, 64, 0.08);
  }
}

@keyframes cmd-chime-bob {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-2px) scale(1.1);
  }
}

@keyframes cmd-empty-breathe {
  0%,
  100% {
    border-color: rgba(82, 184, 48, 0.38);
  }
  50% {
    border-color: rgba(82, 184, 48, 0.68);
  }
}

@keyframes cmd-empty-icon-pulse {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

.cmd-tile-icon--locked {
  display: flex;
  align-items: center;
  justify-content: center;
}
.cmd-tile-icon--locked .lock-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: 0.85;
}

.cmd-tile-cost-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 4px;
  padding: 2px 6px;
}

.cmd-tile-chime-img {
  width: 15px;
  height: 15px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.cmd-tile-cost-value {
  font-size: 12px;
  font-weight: 800;
  color: #e8c040;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.cmd-tile-unlock-label {
  position: relative;
  z-index: 1;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #90e050;
  text-shadow: 0 0 6px rgba(144, 224, 80, 0.7);
}

/* ── Jungle Buff states ── */
.cmd-planet-tile--buffed {
  border-color: #e8c040 !important;
  animation: cmd-buff-pulse 1.8s ease-in-out infinite;
}

@keyframes cmd-buff-pulse {
  0%,
  100% {
    box-shadow:
      0 0 8px rgba(232, 192, 64, 0.55),
      inset 0 1px 0 rgba(255, 220, 80, 0.12);
  }
  50% {
    box-shadow:
      0 0 18px rgba(232, 192, 64, 0.9),
      0 0 6px rgba(255, 240, 100, 0.5),
      inset 0 1px 0 rgba(255, 220, 80, 0.2);
  }
}

.cmd-buff-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(232, 192, 64, 0.18) 0%, transparent 65%);
  pointer-events: none;
  z-index: 3;
  animation: cmd-buff-shimmer 1.8s ease-in-out infinite;
}

@keyframes cmd-buff-shimmer {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cmd-planet-tile--buffed,
  .cmd-buff-overlay,
  .cmd-planet-tile--empty-slot,
  .cmd-tile-icon--empty,
  .cmd-planet-tile--buy:not(.cmd-planet-tile--locked),
  .cmd-planet-tile--buy:not(.cmd-planet-tile--locked) .cmd-tile-chime-img {
    animation: none;
  }
}
</style>
