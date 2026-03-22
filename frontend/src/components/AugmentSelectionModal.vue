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
  common: 'border-blue-400/60 shadow-blue-400/20',
  rare: 'border-purple-400/60 shadow-purple-400/20',
  epic: 'border-amber-400/70 shadow-amber-400/30',
  legendary: 'border-yellow-400/80 shadow-yellow-400/40 legendary-glow',
}

const rarityBorderHover: Record<string, string> = {
  common: 'hover:border-blue-300 hover:shadow-blue-400/40',
  rare: 'hover:border-purple-300 hover:shadow-purple-400/40',
  epic: 'hover:border-amber-300 hover:shadow-amber-400/50',
  legendary: 'hover:border-yellow-200 hover:shadow-yellow-400/70',
}

const rarityBadge: Record<string, string> = {
  common: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
  rare: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
  epic: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
  legendary: 'bg-yellow-500/25 text-yellow-200 border-yellow-400/50',
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
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md"
    >
      <div
        class="relative w-full max-w-3xl mx-4 overflow-hidden border shadow-2xl rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 border-white/20"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-center p-5 border-b bg-white/5 border-white/10"
        >
          <div class="text-center">
            <h2
              class="text-2xl font-bold text-transparent bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text"
              style="font-family: 'MedievalSharp', cursive"
            >
              Level {{ gameStore.level }}
            </h2>
            <p class="mt-1 text-xs text-blue-300/50">Wähle ein Augment</p>
          </div>
        </div>

        <!-- Skip -->
        <div class="flex justify-center pt-3 px-6">
          <button
            class="text-xs text-gray-500 hover:text-white underline"
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
            class="group relative flex flex-col items-center flex-1 p-4 border-2 rounded-2xl bg-white/5 backdrop-blur-sm transition-all duration-300 cursor-pointer shadow-lg hover:scale-105 hover:bg-white/10"
            :class="[rarityBorder[aug.rarity], rarityBorderHover[aug.rarity]]"
            @click="gameStore.chooseAugment(aug.id)"
          >
            <!-- Icon -->
            <span class="text-5xl mb-2 drop-shadow-lg">{{ aug.icon }}</span>

            <!-- Name -->
            <h3
              class="text-base font-bold text-white mb-1 text-center leading-tight"
              style="font-family: 'MedievalSharp', cursive"
            >
              {{ aug.name }}
            </h3>

            <!-- Rarity badge -->
            <span
              class="mb-3 px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider"
              :class="rarityBadge[aug.rarity]"
            >
              {{ rarityLabel[aug.rarity] }}
            </span>

            <!-- Effect line -->
            <p class="text-sm text-blue-100/90 text-center font-medium mb-3">
              {{ aug.effectLine }}
            </p>

            <!-- Select button -->
            <div
              class="mt-auto px-4 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200"
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

@keyframes legendary-pulse {
  0%, 100% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.4), inset 0 0 8px rgba(251, 191, 36, 0.1); }
  50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.7), inset 0 0 15px rgba(251, 191, 36, 0.15); }
}
.legendary-glow {
  animation: legendary-pulse 2s ease-in-out infinite;
}
</style>
