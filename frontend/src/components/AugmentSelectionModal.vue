<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { AUGMENTS } from '../config/augments'
import type { AugmentDefinition } from '../types'

const gameStore = useGameStore()

const options = computed<AugmentDefinition[]>(() =>
  gameStore.pendingAugmentOptions
    .map((id) => AUGMENTS.find((a) => a.id === id))
    .filter((a): a is AugmentDefinition => !!a),
)

const rarityBorder: Record<string, string> = {
  common: 'rarity-common',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary',
}

const rarityBorderHover: Record<string, string> = {
  common: 'rarity-common-hover',
  rare: 'rarity-rare-hover',
  epic: 'rarity-epic-hover',
  legendary: 'rarity-legendary-hover',
}

const rarityBadge: Record<string, string> = {
  common: 'badge-common',
  rare: 'badge-rare',
  epic: 'badge-epic',
  legendary: 'badge-legendary',
}

const rarityLabel: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="gameStore.pendingAugmentChoice"
      class="fixed inset-0 z-[200] flex items-center justify-center rpg-overlay"
    >
      <div class="relative w-full max-w-3xl mx-4 overflow-hidden rpg-frame">
        <!-- Gold Accent -->
        <div class="rpg-accent-bar"></div>

        <!-- Header -->
        <div class="rpg-header flex items-center justify-center p-5">
          <div class="text-center">
            <h2 class="aug-title text-2xl font-bold">
              Level {{ gameStore.level }}
            </h2>
            <p class="aug-subtitle mt-1 text-xs">Wähle ein Augment</p>
          </div>
        </div>

        <!-- Skip -->
        <div class="flex justify-center pt-3 px-6">
          <button
            class="skip-btn text-xs underline"
            @click="gameStore.skipAllAugments()"
          >
            Überspringen
          </button>
        </div>

        <!-- Cards -->
        <div class="flex flex-row gap-3 p-5">
          <button
            v-for="aug in options"
            :key="aug.id"
            class="aug-card group relative flex flex-col items-center flex-1 p-4"
            :class="[rarityBorder[aug.rarity], rarityBorderHover[aug.rarity]]"
            @click="gameStore.chooseAugment(aug.id)"
          >
            <!-- Icon -->
            <span class="text-5xl mb-2">{{ aug.icon }}</span>

            <!-- Name -->
            <h3 class="text-base font-bold text-white mb-1 text-center leading-tight">
              {{ aug.name }}
            </h3>

            <!-- Rarity badge -->
            <span
              class="aug-badge mb-3 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              :class="rarityBadge[aug.rarity]"
            >
              {{ rarityLabel[aug.rarity] }}
            </span>

            <!-- Effect line -->
            <p class="aug-effect text-sm text-center font-medium mb-3">
              {{ aug.effectLine }}
            </p>

            <!-- Select button -->
            <div
              class="aug-select-btn mt-auto px-4 py-1.5 text-xs font-bold"
              :class="rarityBadge[aug.rarity]"
            >
              Auswählen
            </div>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.aug-title {
  color: var(--rpg-gold);
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.4);
}

.aug-subtitle {
  color: var(--rpg-text-dim);
}

.skip-btn {
  color: var(--rpg-text-dim);
  background: none;
  border: none;
  cursor: pointer;
}
.skip-btn:hover {
  color: #fff;
}

.aug-card {
  background: var(--rpg-bg-dark);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.aug-card:hover {
  background: #252520;
  transform: scale(1.03);
}

.aug-effect {
  color: var(--rpg-text-muted);
}

.aug-badge {
  border-radius: 4px;
  border-width: 1px;
  border-style: solid;
}

.aug-select-btn {
  border-radius: 4px;
  border-width: 1px;
  border-style: solid;
}

/* Rarity: Common (Blue) */
.rarity-common {
  border: 2px solid #5b8dd9;
  box-shadow: 0 0 8px rgba(91, 141, 217, 0.3);
}
.rarity-common-hover:hover {
  border-color: #7eaae8;
  box-shadow: 0 0 14px rgba(91, 141, 217, 0.5);
}
.badge-common {
  background: rgba(91, 141, 217, 0.15);
  color: #7eaae8;
  border-color: rgba(91, 141, 217, 0.4);
}

/* Rarity: Rare (Purple) */
.rarity-rare {
  border: 2px solid #a87ed8;
  box-shadow: 0 0 8px rgba(168, 126, 216, 0.3);
}
.rarity-rare-hover:hover {
  border-color: #c4a0ee;
  box-shadow: 0 0 14px rgba(168, 126, 216, 0.5);
}
.badge-rare {
  background: rgba(168, 126, 216, 0.15);
  color: #c4a0ee;
  border-color: rgba(168, 126, 216, 0.4);
}

/* Rarity: Epic (Amber) */
.rarity-epic {
  border: 2px solid #d9a03e;
  box-shadow: 0 0 8px rgba(217, 160, 62, 0.3);
}
.rarity-epic-hover:hover {
  border-color: #e8c060;
  box-shadow: 0 0 14px rgba(217, 160, 62, 0.5);
}
.badge-epic {
  background: rgba(217, 160, 62, 0.15);
  color: #e8c060;
  border-color: rgba(217, 160, 62, 0.4);
}

/* Rarity: Legendary (Gold/Yellow) */
.rarity-legendary {
  border: 2px solid #e8c040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.4);
  animation: legendary-pulse 2s ease-in-out infinite;
}
.rarity-legendary-hover:hover {
  border-color: #f0d860;
  box-shadow: 0 0 20px rgba(232, 192, 64, 0.6);
}
.badge-legendary {
  background: rgba(232, 192, 64, 0.15);
  color: #f0d860;
  border-color: rgba(232, 192, 64, 0.5);
}

@keyframes legendary-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(232, 192, 64, 0.3), inset 0 0 6px rgba(232, 192, 64, 0.08); }
  50% { box-shadow: 0 0 22px rgba(232, 192, 64, 0.6), inset 0 0 12px rgba(232, 192, 64, 0.12); }
}
</style>
