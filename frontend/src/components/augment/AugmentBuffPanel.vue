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
      <div class="aug-summary-scroll">
        <div
          v-for="slot in activeAugmentSlots"
          :key="slot.key"
          class="aug-buff-row"
          :style="{ color: AUGMENT_RARITY_COLOR[slot.aug.rarity] }"
        >
          <span class="aug-buff-icon">{{ slot.aug.icon }}</span>
          <span class="aug-buff-name">{{ slot.aug.name }}</span>
          <span class="aug-buff-sep"> – </span>
          <span class="aug-buff-effect">{{ slot.aug.effectLine }}</span>
        </div>
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
  max-height: 300px;
}

.aug-summary-scroll {
  max-height: 240px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
  padding: 4px 0 2px;
}

.aug-buff-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 2px 10px;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aug-buff-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.aug-buff-name {
  font-weight: 700;
  flex-shrink: 0;
}

.aug-buff-sep {
  color: #5c3310;
  flex-shrink: 0;
}

.aug-buff-effect {
  color: #b0a080;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aug-divider {
  height: 2px;
  margin: 4px 6px 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c040, #d4a020, #c89040, #5c3310);
}

.aug-icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
}

.aug-icon-slot {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 4px;
  border: 2px solid #5c3310;
  background: #141410;
  cursor: default;
  flex-shrink: 0;
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
