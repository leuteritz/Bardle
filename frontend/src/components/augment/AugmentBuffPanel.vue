<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { AUGMENTS } from '../../config/augments'
import { AUGMENT_RARITY_COLOR } from '../../composables/useRarityColors'
import type { AugmentDefinition } from '../../types'

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
</script>

<template>
  <Transition name="augment-panel">
    <div
      v-if="activeAugmentSlots.length > 0"
      class="aug-sidebar"
      @mouseenter="hovering = 'sidebar'"
      @mouseleave="hovering = null"
    >
      <div class="aug-icon-list">
        <TransitionGroup name="aug-card" tag="div" class="aug-icon-list-inner">
          <div
            v-for="slot in activeAugmentSlots"
            :key="slot.key"
            class="aug-icon-slot"
            :style="{ borderColor: AUGMENT_RARITY_COLOR[slot.aug.rarity] }"
          >
            <div class="aug-icon-box">
              <img
                v-if="slot.aug.image"
                :src="slot.aug.image"
                class="aug-icon-img"
                :alt="slot.aug.name"
              />
              <span v-else class="aug-icon-emoji">{{ slot.aug.icon }}</span>
            </div>
            <div class="aug-expand-panel" :class="{ expanded: hovering !== null }">
              <div class="aug-expand-name">{{ slot.aug.name }}</div>
              <div class="aug-expand-effect">{{ slot.aug.effectLine }}</div>
            </div>
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
  display: flex;
  align-items: center;
  height: 64px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid #5c3310;
  background: #141410;
  cursor: default;
  flex-shrink: 0;
}

.aug-icon-box {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.aug-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 2px;
}

.aug-icon-emoji {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}

.aug-expand-panel {
  max-width: 0;
  overflow: hidden;
  transition:
    max-width 0.25s ease,
    padding 0.25s ease;
  padding: 0;
  white-space: nowrap;
}

.aug-expand-panel.expanded {
  max-width: 300px;
  width: 300px;
  padding: 0 14px;
}

.aug-expand-name {
  color: #e8c040;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 4px;
}

.aug-expand-effect {
  color: #b0a080;
  font-size: 17px;
}
</style>
