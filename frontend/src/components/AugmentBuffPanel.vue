<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { AUGMENTS } from '../config/augments'
import type { AugmentDefinition } from '../types'

const gameStore = useGameStore()

// Track each slot by id+index to support stacked duplicates
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

const hovering = ref<string | null>(null)

const rarityBorderColor: Record<string, string> = {
  common: '#9d9d9d',
  rare: '#4a90e2',
  epic: '#a855f7',
  legendary: '#e8c040',
}
</script>

<template>
  <Transition name="augment-panel">
    <div v-if="activeAugmentSlots.length > 0" class="aug-sidebar">
      <div class="aug-icon-list">
        <TransitionGroup name="aug-card" tag="div" class="aug-icon-list-inner">
          <div
            v-for="slot in activeAugmentSlots"
            :key="slot.key"
            class="aug-icon-slot"
            :style="{ borderColor: rarityBorderColor[slot.aug.rarity] }"
            @mouseenter="hovering = slot.key"
            @mouseleave="hovering = null"
          >
            <img
              v-if="slot.aug.image"
              :src="slot.aug.image"
              class="aug-icon-img"
              :alt="slot.aug.name"
            />
            <span v-else class="aug-icon-emoji">{{ slot.aug.icon }}</span>

            <!-- Tooltip -->
            <Transition name="tooltip">
              <div v-if="hovering === slot.key" class="aug-tooltip">
                <div class="aug-tooltip-name">{{ slot.aug.name }}</div>
                <div class="aug-tooltip-effect">{{ slot.aug.effectLine }}</div>
              </div>
            </Transition>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.augment-panel-enter-active,
.augment-panel-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.augment-panel-enter-from,
.augment-panel-leave-to {
  opacity: 0;
  transform: translateX(-12px);
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

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease;
}
.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}

.aug-sidebar {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 60;
  border-top: 4px solid #7a4e20;
  border-right: 4px solid #7a4e20;
  border-bottom: 4px solid #7a4e20;
  border-left: none;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310;
  background: #111008;
  border-radius: 0 4px 4px 0;
  padding: 8px 6px 8px 0;
}

.aug-icon-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.aug-icon-list-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aug-icon-slot {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 4px;
  overflow: visible;
  border: 2px solid #5c3310;
  background: #141410;
  cursor: default;
  flex-shrink: 0;
}

.aug-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 2px;
  overflow: hidden;
}

.aug-icon-emoji {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.aug-tooltip {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  padding: 6px 10px;
  min-width: 140px;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
}

.aug-tooltip-name {
  color: #e8c040;
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 2px;
}

.aug-tooltip-effect {
  color: #b0a080;
  font-size: 10px;
}
</style>
