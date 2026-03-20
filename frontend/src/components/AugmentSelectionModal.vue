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
}

const rarityBorderHover: Record<string, string> = {
  common: 'hover:border-blue-300 hover:shadow-blue-400/40',
  rare: 'hover:border-purple-300 hover:shadow-purple-400/40',
  epic: 'hover:border-amber-300 hover:shadow-amber-400/50',
}

const rarityBadge: Record<string, string> = {
  common: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
  rare: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
  epic: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
}

const rarityLabel: Record<string, string> = {
  common: 'Gewöhnlich',
  rare: 'Selten',
  epic: 'Episch',
}

function formatEffect(key: string, val: number): string {
  switch (key) {
    case 'cpsMultiplier':
      return `+${Math.round((val - 1) * 100)}% CPS`
    case 'cpcMultiplier':
      return `+${Math.round((val - 1) * 100)}% CPC`
    case 'buildingCostMultiplier':
      return `-${Math.round((1 - val) * 100)}% Gebäudekosten`
    case 'meepCostMultiplier':
      return `-${Math.round((1 - val) * 100)}% Meep-Kosten`
    case 'meepPowerMultiplier':
      return `+${Math.round((val - 1) * 100)}% Meep-Power`
    case 'expeditionRewardMultiplier':
      return `+${Math.round((val - 1) * 100)}% Expeditions-Belohnung`
    case 'abilityPowerPerLevel':
      return `+${val} Power pro Fähigkeitsstufe`
    default:
      return `${key}: ${val}`
  }
}

function getEffectLines(aug: AugmentDefinition): string[] {
  return Object.entries(aug.effects).map(([k, v]) => formatEffect(k, v as number))
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="gameStore.pendingAugmentChoice"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md"
    >
      <div
        class="relative w-full max-w-4xl mx-4 overflow-hidden border shadow-2xl rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 border-white/20"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-center p-6 border-b bg-white/5 border-white/10"
        >
          <div class="text-center">
            <h2
              class="text-3xl font-bold text-transparent bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text"
              style="font-family: 'MedievalSharp', cursive"
            >
              Level {{ gameStore.level }} erreicht!
            </h2>
            <p class="mt-1 text-sm text-blue-300/70">Wähle ein Augment — diese Wahl ist dauerhaft</p>
          </div>
        </div>

        <!-- Cards -->
        <div class="flex flex-row gap-4 p-6">
          <button
            v-for="aug in options"
            :key="aug.id"
            class="group relative flex flex-col items-center flex-1 p-5 border-2 rounded-2xl bg-white/5 backdrop-blur-sm transition-all duration-300 cursor-pointer shadow-lg hover:scale-105 hover:bg-white/10"
            :class="[rarityBorder[aug.rarity], rarityBorderHover[aug.rarity]]"
            @click="gameStore.chooseAugment(aug.id)"
          >
            <!-- Icon -->
            <span class="text-6xl mb-3 drop-shadow-lg">{{ aug.icon }}</span>

            <!-- Name -->
            <h3
              class="text-lg font-bold text-white mb-1 text-center"
              style="font-family: 'MedievalSharp', cursive"
            >
              {{ aug.name }}
            </h3>

            <!-- Rarity badge -->
            <span
              class="mb-3 px-3 py-0.5 text-xs font-bold rounded-full border"
              :class="rarityBadge[aug.rarity]"
            >
              {{ rarityLabel[aug.rarity] }}
            </span>

            <!-- Description -->
            <p class="text-xs text-blue-200/60 mb-4 text-center leading-relaxed">
              {{ aug.description }}
            </p>

            <!-- Effects -->
            <div class="w-full space-y-1.5 p-3 rounded-xl bg-black/30 border border-white/10">
              <div
                v-for="(line, i) in getEffectLines(aug)"
                :key="i"
                class="flex items-center gap-2 text-xs"
              >
                <span class="text-emerald-400">▲</span>
                <span class="text-blue-100/80">{{ line }}</span>
              </div>
            </div>

            <!-- Select hint -->
            <div
              class="mt-4 px-4 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200"
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
</style>
