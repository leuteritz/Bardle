<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { usePersistence } from '@/composables/usePersistence'
import { AUGMENTS } from '@/config/augments'
import type { AugmentDefinition } from '@/types'

const gameStore = useGameStore()

const { resetGame } = usePersistence()
const handleReset = () => {
  if (
    window.confirm(
      'Spielstand wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    )
  ) {
    resetGame()
  }
}

const options = computed<AugmentDefinition[]>(() =>
  gameStore.pendingAugmentOptions
    .map((id) => AUGMENTS.find((a) => a.id === id))
    .filter((a): a is AugmentDefinition => !!a),
)

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
        <div class="relative flex items-center justify-center p-5 rpg-header">
          <div class="text-center">
            <h2 class="text-2xl font-bold aug-title">Level {{ gameStore.level }}</h2>
            <p class="mt-1 text-xs aug-subtitle">Wähle ein Augment</p>
          </div>

          <!-- Reset Button -->
          <button class="aug-reset-btn" title="Spielstand löschen" @click.stop="handleReset">
            ✕
          </button>
        </div>

        <!-- Skip -->
        <div class="flex justify-center px-6 pt-3">
          <button class="text-xs underline skip-btn" @click="gameStore.skipAllAugments()">
            Überspringen
          </button>
        </div>

        <!-- Cards -->
        <div class="flex flex-row gap-3 p-5">
          <button
            v-for="aug in options"
            :key="aug.id"
            class="relative flex flex-col items-center flex-1 p-4 aug-card group"
            :class="[
              `rpg-rarity-${aug.rarity}`,
              `rpg-glow-${aug.rarity}`,
              `aug-card-hover--${aug.rarity}`,
            ]"
            @click="gameStore.chooseAugment(aug.id)"
          >
            <!-- Icon -->
            <div class="mb-2 aug-icon-box">
              <img v-if="aug.image" :src="aug.image" class="aug-card-img" :alt="aug.name" />
              <span v-else class="text-5xl">{{ aug.icon }}</span>
            </div>

            <!-- Name -->
            <h3 class="mb-1 text-base font-bold leading-tight text-center text-white">
              {{ aug.name }}
            </h3>

            <!-- Rarity badge -->
            <span
              class="aug-badge mb-3 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              :class="`rpg-badge-${aug.rarity}`"
            >
              {{ rarityLabel[aug.rarity] }}
            </span>

            <!-- Effect line -->
            <p class="mb-3 text-sm font-medium text-center aug-effect">
              {{ aug.effectLine }}
            </p>

            <!-- Select button -->
            <div
              class="aug-select-btn mt-auto px-4 py-1.5 text-xs font-bold"
              :class="`rpg-badge-${aug.rarity}`"
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
  text-shadow: 0 0 8px color-mix(in srgb, var(--rpg-gold) 40%, transparent);
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
  background: var(--rpg-bg-hover);
  transform: scale(1.03);
}

.aug-effect {
  color: var(--rpg-text-muted);
}

.aug-icon-box {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  overflow: hidden;
  background: #141410;
  border: 2px solid #5c3310;
}

.aug-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Hover glow enhancement per rarity */
.aug-card-hover--common:hover {
  border-color: color-mix(in srgb, var(--rpg-rarity-common) 80%, #fff);
  box-shadow: 0 0 14px color-mix(in srgb, var(--rpg-rarity-common) 50%, transparent);
}
.aug-card-hover--rare:hover {
  border-color: color-mix(in srgb, var(--rpg-rarity-rare) 80%, #fff);
  box-shadow: 0 0 14px color-mix(in srgb, var(--rpg-rarity-rare) 50%, transparent);
}
.aug-card-hover--epic:hover {
  border-color: color-mix(in srgb, var(--rpg-rarity-epic) 80%, #fff);
  box-shadow: 0 0 14px color-mix(in srgb, var(--rpg-rarity-epic) 50%, transparent);
}
.aug-card-hover--legendary:hover {
  border-color: color-mix(in srgb, var(--rpg-rarity-legendary) 80%, #fff);
  box-shadow: 0 0 20px color-mix(in srgb, var(--rpg-rarity-legendary) 60%, transparent);
}

/* ═══════════════════════════════════════════
   RESET BUTTON
   ═══════════════════════════════════════════ */
.aug-reset-btn {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);

  width: 22px;
  height: 22px;
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  background: linear-gradient(to bottom, #4a1010, #2e0808);
  border: 1.5px solid #8a3020;
  border-radius: 50%;
  color: #cc6050;
  cursor: pointer;
  z-index: 10;

  opacity: 0.35;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    background 0.12s ease,
    border-color 0.12s ease;
}

.aug-reset-btn:hover {
  opacity: 1;
  background: linear-gradient(to bottom, #6a1818, #4a0e0e);
  color: #ff9080;
  border-color: #cc4830;
  transform: translateY(-50%) scale(1.1);
}

.aug-reset-btn:active {
  transform: translateY(-50%) scale(0.88);
}
</style>
