<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { usePlanetShopStore, PLANET_ROLES } from '@/stores/planetShopStore'
import type { PlanetRoleType } from '@/stores/planetShopStore'
import { useUiStore } from '@/stores/uiStore'
import { formatNumber } from '@/config/numberFormat'
import {
  HP_BAR_SEGMENTS,
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

function hpGlowColor(ratio: number): string {
  if (ratio > HP_COLOR_THRESHOLD_HIGH) return 'rgba(82,184,48,0.6)'
  if (ratio > HP_COLOR_THRESHOLD_LOW) return 'rgba(212,160,48,0.6)'
  return 'rgba(204,48,32,0.6)'
}

function hpTextColor(ratio: number): string {
  if (ratio > HP_COLOR_THRESHOLD_HIGH) return '#52b830'
  if (ratio > HP_COLOR_THRESHOLD_LOW) return '#d4a030'
  return '#cc3020'
}

function hpTextGlow(ratio: number): string {
  const col =
    ratio > HP_COLOR_THRESHOLD_HIGH
      ? '82,184,48'
      : ratio > HP_COLOR_THRESHOLD_LOW
        ? '212,160,48'
        : '204,48,32'
  return `0 1px 4px rgba(0,0,0,0.98), 0 0 8px rgba(0,0,0,0.8), 0 0 6px rgba(${col},0.65)`
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
      <div class="cmd-surface-fill" />
      <div class="cmd-surface-glow" />
      <div class="cmd-surface-floor" />

      <!-- ── Champion Slots ── -->
      <div class="cmd-team-slots-wrapper">
        <div class="cmd-team-slots">
          <ChampionSelectorComponent />
        </div>
      </div>

      <!-- ── Planet Grid ── -->
      <div class="cmd-planet-grid">
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
            [`cmd-planet-tile--role-${slot.role}`]: slot.purchased && !!slot.role,
          }"
          :style="slot.purchased && slot.role ? { '--role-color': roleColor(slot.role) } : {}"
          @click="handleSlotClick(slot)"
          @mouseenter="uiStore.setHoveredPlanetSlotId(slot.id)"
          @mouseleave="uiStore.setHoveredPlanetSlotId(null)"
        >
          <template v-if="slot.purchased && slot.role">
            <img :src="roleImage(slot.role)" class="cmd-tile-planet-img" alt="" draggable="false" />
            <div class="cmd-tile-role-glow" />
            <div class="cmd-tile-img-vignette" />

            <!-- Jungle Buff: Overlay Schimmer -->
            <div v-if="slot.jungleBuff?.active" class="cmd-buff-overlay" />

            <!-- Jungle Buff: Badge oben rechts -->
            <div v-if="slot.jungleBuff?.active" class="cmd-buff-badge">
              <Icon icon="game-icons:lightning-storm" class="cmd-buff-badge-icon" />
              <span class="cmd-buff-badge-mul">×{{ slot.jungleBuff!.multiplier.toFixed(1) }}</span>
            </div>

            <!-- ── HP-Bereich unten ── -->
            <div
              class="cmd-tile-hp-area"
              :style="{
                '--hp-pct': slot.currentHp / slot.maxHp,
                '--hp-glow': hpGlowColor(slot.currentHp / slot.maxHp),
              }"
            >
              <!-- HP Wert Label -->
              <div class="cmd-tile-hp-label-row">
                <span
                  class="cmd-tile-hp-value"
                  :style="{
                    color: hpTextColor(slot.currentHp / slot.maxHp),
                    textShadow: hpTextGlow(slot.currentHp / slot.maxHp),
                  }"
                >
                  {{ formatNumber(slot.currentHp) }}<span class="cmd-tile-hp-sep">/</span
                  ><span class="cmd-tile-hp-max">{{ formatNumber(slot.maxHp) }}</span>
                </span>
              </div>

              <!-- RPG Leiste -->
              <div class="cmd-tile-hp-frame">
                <div class="cmd-tile-hp-cap cmd-tile-hp-cap--left" />
                <div class="cmd-tile-hp-track">
                  <div
                    class="cmd-tile-hp-fill"
                    :style="{ background: hpFillColor(slot.currentHp / slot.maxHp) }"
                  />
                  <div class="cmd-tile-hp-shine" />
                  <div class="cmd-tile-hp-notches">
                    <div
                      v-for="i in HP_BAR_SEGMENTS - 1"
                      :key="i"
                      class="cmd-tile-hp-notch"
                      :style="{ left: `${(i / HP_BAR_SEGMENTS) * 100}%` }"
                    />
                  </div>
                </div>
                <div class="cmd-tile-hp-cap cmd-tile-hp-cap--right" />
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
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 10000;
  width: 440px;
  height: 440px;
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
  background: var(--color-panel-bg);
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

.cmd-planet-grid {
  position: absolute;
  top: 192px;
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

.cmd-planet-tile--filled {
  padding: 0;
  background: linear-gradient(170deg, #1e1208 0%, #150f04 100%);
  border-width: 3px;
}

.cmd-planet-tile--empty-slot {
  border: 2px dashed var(--rpg-slot-empty-border, rgba(82, 184, 48, 0.52));
  background: linear-gradient(180deg, rgba(8, 18, 6, 0.70), rgba(5, 12, 4, 0.84));
  box-shadow: inset 0 0 14px rgba(52, 160, 24, 0.06);
  animation: cmd-empty-breathe 3s ease-in-out infinite;
}
.cmd-planet-tile--empty-slot:hover {
  border-color: var(--rpg-slot-empty-border-hover, rgba(110, 192, 64, 0.82));
  box-shadow:
    inset 0 0 14px rgba(82, 184, 48, 0.12),
    0 0 8px rgba(82, 184, 48, 0.20);
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
  background: linear-gradient(170deg, #1a1408 0%, #120e04 100%);
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
  overflow: hidden;
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked)::after {
  content: '';
  position: absolute;
  top: 0;
  left: -80%;
  width: 45%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(160, 255, 100, 0.14) 50%,
    transparent 100%
  );
  transform: skewX(-18deg);
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked):hover {
  background: linear-gradient(180deg, rgba(18, 36, 12, 0.8), rgba(12, 26, 10, 0.9));
  border-color: #6ec040;
  box-shadow:
    0 0 18px rgba(110, 192, 64, 0.6),
    0 0 36px rgba(110, 192, 64, 0.18),
    inset 0 0 12px rgba(110, 192, 64, 0.08);
  transform: translateY(-1px) scale(1.03);
  animation: none;
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked):hover::after {
  animation: cmd-afford-shine 0.5s ease-out forwards;
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
  0%, 100% {
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

@keyframes cmd-afford-shine {
  0%   { left: -80%; opacity: 0; }
  15%  { opacity: 1; }
  100% { left: 130%; opacity: 0; }
}

@keyframes cmd-chime-bob {
  0%, 100% { transform: translateY(0) scale(1); }
  50%       { transform: translateY(-2px) scale(1.1); }
}

@keyframes cmd-empty-breathe {
  0%, 100% { border-color: rgba(82, 184, 48, 0.38); }
  50%       { border-color: rgba(82, 184, 48, 0.68); }
}

@keyframes cmd-empty-icon-pulse {
  0%, 100% { opacity: 0.65; }
  50%       { opacity: 1; }
}

/* Rollenfarbige Rahmen */
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

/* ── Planet Bild – scharf ── */
.cmd-tile-planet-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  transform: translateZ(0);
  will-change: transform;
  transition: transform 0.18s ease;
  border-radius: 8px;
  backface-visibility: hidden;
}
.cmd-planet-tile:hover .cmd-tile-planet-img {
  transform: translateZ(0) scale(1.06);
}

.cmd-tile-img-vignette {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(6, 3, 1, 0.65) 100%);
  pointer-events: none;
  z-index: 1;
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
  z-index: 2;
}

/* ── HP-BEREICH ── */
.cmd-tile-hp-area {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
  padding: 6px 5px 5px;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.88) 0%,
    rgba(0, 0, 0, 0.55) 60%,
    transparent 100%
  );
  pointer-events: none;
  filter: drop-shadow(0 0 4px var(--hp-glow, rgba(82, 184, 48, 0.5)));
}

.cmd-tile-hp-label-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  line-height: 1;
}

.cmd-tile-hp-value {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.02em;
  white-space: nowrap;
  transition: color 0.4s ease;
}

.cmd-tile-hp-max {
  font-size: 11px;
  opacity: 0.65;
}

.cmd-tile-hp-sep {
  color: rgba(200, 144, 64, 0.65);
  margin: 0 1px;
  font-weight: 600;
}

.cmd-tile-hp-frame {
  position: relative;
  height: 12px;
  display: flex;
  align-items: center;
}

.cmd-tile-hp-cap--left {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 0 6px 7px;
  border-color: transparent transparent transparent rgba(200, 144, 64, 0.75);
  flex-shrink: 0;
}
.cmd-tile-hp-cap--right {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 7px 6px 0;
  border-color: transparent rgba(200, 144, 64, 0.75) transparent transparent;
  flex-shrink: 0;
}

.cmd-tile-hp-track {
  flex: 1;
  position: relative;
  height: 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(20, 8, 4, 0.95) 100%);
  border-top: 1px solid rgba(200, 144, 64, 0.6);
  border-bottom: 1px solid rgba(200, 144, 64, 0.6);
  overflow: hidden;
}

.cmd-tile-hp-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(var(--hp-pct, 1) * 100%);
  transition:
    width 0.4s cubic-bezier(0.25, 1, 0.4, 1),
    background 0.4s ease;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.55);
}

.cmd-tile-hp-shine {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 45%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, transparent 100%);
  pointer-events: none;
  z-index: 1;
  clip-path: inset(0 calc((1 - var(--hp-pct, 1)) * 100%) 0 0);
  transition: clip-path 0.4s cubic-bezier(0.25, 1, 0.4, 1);
}

.cmd-tile-hp-notches {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.cmd-tile-hp-notch {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.7);
  transform: translateX(-50%);
}

/* ── Tile Icons & Labels ── */
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
  color: var(--rpg-slot-empty-icon, rgba(200, 144, 64, 0.65));
  font-size: 24px;
  text-shadow: 0 0 10px var(--rpg-slot-empty-icon-glow, rgba(200, 144, 64, 0.38));
  animation: cmd-empty-icon-pulse 3s ease-in-out infinite;
}
.cmd-tile-icon--locked {
  display: flex;
  align-items: center;
  justify-content: center;
}
.cmd-tile-icon--locked .lock-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  opacity: 0.8;
  image-rendering: auto;
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
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.cmd-tile-cost-value {
  font-size: 11px;
  font-weight: 800;
  color: #e8c040;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.cmd-tile-unlock-label {
  position: relative;
  z-index: 1;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #90e050;
  text-shadow: 0 0 6px rgba(144, 224, 80, 0.7);
}



/* ── Jungle Buff: Tile-Modifier ── */
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

/* ── Jungle Buff: Overlay Schimmer ── */
.cmd-buff-overlay {
  position: absolute;
  inset: 0;
  border-radius: 8px;
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

/* ── Jungle Buff: Badge oben rechts ── */
.cmd-buff-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 1px 4px 1px 2px;
  background: rgba(14, 10, 2, 0.88);
  border: 1px solid rgba(232, 192, 64, 0.7);
  border-radius: 3px;
  box-shadow: 0 0 5px rgba(232, 192, 64, 0.4);
  pointer-events: none;
}

.cmd-buff-badge-icon {
  font-size: 8px;
  width: 8px;
  height: 8px;
  line-height: 1;
}

.cmd-buff-badge-mul {
  font-size: 8px;
  font-weight: 800;
  color: #e8c040;
  letter-spacing: 0.03em;
  line-height: 1;
  text-shadow: 0 0 4px rgba(232, 192, 64, 0.7);
}

/* SVG Frame */
</style>
