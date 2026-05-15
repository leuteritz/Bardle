<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { AUGMENTS } from '../../config/augments'
import { AUGMENT_RARITY_COLOR } from '../../composables/useRarityColors'
import type { AugmentDefinition } from '../../types'

const gameStore = useGameStore()

interface AugmentSlot {
  aug: AugmentDefinition
  key: string
}

const activeAugmentSlots = computed<AugmentSlot[]>(() =>
  gameStore.activeAugments
    .map((id, idx) => {
      const aug = AUGMENTS.find((a) => a.id === id)
      return aug ? { aug, key: `${id}-${idx}` } : null
    })
    .filter((s): s is AugmentSlot => !!s),
)

const isExpanded = ref(true)
const hoveredKey = ref<string | null>(null)

const summaryParts = computed<string[]>(() => {
  let cps = 0,
    cpc = 0,
    building = 0,
    meepCost = 0
  let meepPower = 0,
    expedition = 0,
    abilityPower = 0
  let cooldown = 0,
    enemySpeed = 0,
    hpDrain = 0
  const uniqueLines: string[] = []

  for (const slot of activeAugmentSlots.value) {
    const e = slot.aug.effects
    if (e.cpsMultiplier) cps += (e.cpsMultiplier - 1) * 100
    if (e.cpcMultiplier) cpc += (e.cpcMultiplier - 1) * 100
    if (e.buildingCostMultiplier) building += (1 - e.buildingCostMultiplier) * 100
    if (e.meepCostMultiplier) meepCost += (1 - e.meepCostMultiplier) * 100
    if (e.meepPowerMultiplier) meepPower += (e.meepPowerMultiplier - 1) * 100
    if (e.expeditionRewardMultiplier) expedition += (e.expeditionRewardMultiplier - 1) * 100
    if (e.abilityPowerPerLevel) abilityPower += e.abilityPowerPerLevel
    if (e.cooldownMultiplier) cooldown += (1 - e.cooldownMultiplier) * 100
    if (e.enemySpeedMultiplier) enemySpeed += (1 - e.enemySpeedMultiplier) * 100
    if (e.enemyMaxHPDrainPerSecond) hpDrain += e.enemyMaxHPDrainPerSecond * 100
    if (slot.aug.specialEffect) {
      const hasNumeric = !!(
        e.cpsMultiplier || e.cpcMultiplier || e.buildingCostMultiplier ||
        e.meepCostMultiplier || e.meepPowerMultiplier || e.expeditionRewardMultiplier ||
        e.abilityPowerPerLevel || e.cooldownMultiplier || e.enemySpeedMultiplier ||
        e.enemyMaxHPDrainPerSecond
      )
      if (!hasNumeric) uniqueLines.push(slot.aug.effectLine)
    }
  }

  const parts: string[] = []
  const fmt = (v: number) => (v > 0 ? '+' : '') + Math.round(v)
  if (cps !== 0) parts.push(`${fmt(cps)}% CPS`)
  if (cpc !== 0) parts.push(`${fmt(cpc)}% CPC`)
  if (building > 0) parts.push(`-${Math.round(building)}% Gebäude`)
  if (meepCost > 0) parts.push(`-${Math.round(meepCost)}% Meep-Kosten`)
  if (meepPower !== 0) parts.push(`${fmt(meepPower)}% Meep-Power`)
  if (expedition !== 0) parts.push(`${fmt(expedition)}% Expedition`)
  if (abilityPower > 0) parts.push(`+${abilityPower} Power/Lv`)
  if (cooldown > 0) parts.push(`-${Math.round(cooldown)}% CD`)
  if (enemySpeed > 0) parts.push(`-${Math.round(enemySpeed)}% Feindspeed`)
  if (hpDrain > 0) parts.push(`-${hpDrain.toFixed(1)}% HP/s`)
  for (const line of uniqueLines) parts.push(line)
  return parts
})
</script>

<template>
  <div v-if="activeAugmentSlots.length > 0" class="aug-panel">
    <div class="aug-gold-topbar"></div>

    <div class="aug-header">
      <button
        class="aug-toggle-btn"
        @click="isExpanded = !isExpanded"
        :aria-label="isExpanded ? 'Collapse augments' : 'Expand augments'"
      >
        <svg
          class="aug-chevron"
          :class="{ 'is-expanded': isExpanded }"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polyline
            points="2,4 7,10 12,4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div class="aug-buff-summary" :class="{ 'is-expanded': isExpanded }">
      <div class="aug-summary-line">
        <template v-for="(part, i) in summaryParts" :key="i">
          <span v-if="i > 0" class="aug-summary-sep"> | </span>
          <span>{{ part }}</span>
        </template>
      </div>
      <div class="aug-divider"></div>
    </div>

    <TransitionGroup name="aug-card" tag="div" class="aug-icon-grid">
      <div
        v-for="slot in activeAugmentSlots"
        :key="slot.key"
        class="aug-icon-slot"
        :style="{ borderColor: AUGMENT_RARITY_COLOR[slot.aug.rarity] }"
        @mouseenter="hoveredKey = slot.key"
        @mouseleave="hoveredKey = null"
      >
        <img
          v-if="slot.aug.image"
          :src="slot.aug.image"
          class="aug-icon-img"
          :alt="slot.aug.name"
        />
        <span v-else class="aug-icon-emoji">{{ slot.aug.icon }}</span>

        <div v-if="hoveredKey === slot.key" class="aug-tooltip">
          <div
            class="aug-tooltip-name"
            :style="{ color: AUGMENT_RARITY_COLOR[slot.aug.rarity] }"
          >
            {{ slot.aug.name }}
          </div>
          <div class="aug-tooltip-effect">{{ slot.aug.effectLine }}</div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.aug-panel {
  position: fixed;
  left: 0.75rem;
  top: 0.45rem;
  z-index: 60;
  width: 260px;
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310;
  background: #111008;
  border-radius: 4px;
}

.aug-gold-topbar {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c040, #d4a020, #c89040, #5c3310);
}

.aug-header {
  display: flex;
  justify-content: flex-end;
  padding: 5px 6px 3px;
}

.aug-toggle-btn {
  padding: 4px 7px;
  line-height: 0;
  background: rgba(10, 7, 2, 0.9);
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(200, 160, 80, 0.75);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}
.aug-toggle-btn:hover {
  border-color: #c89040;
  color: #e8c040;
}

.aug-chevron {
  display: block;
  transition: transform 0.2s ease;
}
.aug-chevron.is-expanded {
  transform: rotate(180deg);
}

.aug-buff-summary {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.aug-buff-summary.is-expanded {
  max-height: 200px;
}

.aug-summary-line {
  padding: 5px 10px 6px;
  font-size: 12px;
  color: #e8c040;
  line-height: 1.5;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.aug-summary-sep {
  color: #5c3310;
}

.aug-divider {
  height: 2px;
  margin: 4px 6px 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c040, #d4a020, #c89040, #5c3310);
}

.aug-icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 8px;
}

.aug-icon-slot {
  position: relative;
  height: 56px;
  border-radius: 4px;
  border: 2px solid #5c3310;
  background: #141410;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.aug-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 2px;
}

.aug-icon-emoji {
  font-size: 30px;
  line-height: 1;
}

.aug-tooltip {
  position: absolute;
  left: calc(100% + 6px);
  top: 0;
  z-index: 70;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  padding: 8px 10px;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  pointer-events: none;
}

.aug-tooltip-name {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}

.aug-tooltip-effect {
  color: #b0a080;
  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
}

.aug-card-enter-active,
.aug-card-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.aug-card-enter-from,
.aug-card-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
.aug-card-move {
  transition: transform 0.25s ease;
}
</style>
