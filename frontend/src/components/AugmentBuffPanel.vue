<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { AUGMENTS } from '../config/augments'
import type { AugmentDefinition } from '../types'

const gameStore = useGameStore()

const activeAugmentDefs = computed<AugmentDefinition[]>(() =>
  gameStore.activeAugments
    .map((id) => AUGMENTS.find((a) => a.id === id))
    .filter((a): a is AugmentDefinition => !!a),
)

const rarityBorder: Record<string, string> = {
  common: 'border-blue-400/60',
  rare: 'border-purple-400/60',
  epic: 'border-amber-400/70',
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
  <div
    v-if="activeAugmentDefs.length > 0"
    class="fixed left-4 top-[180px] z-[60] flex flex-col gap-2"
  >
    <div v-for="aug in activeAugmentDefs" :key="aug.id" class="relative group">
      <!-- Icon button -->
      <div
        class="w-12 h-12 flex items-center justify-center rounded-full border-2 bg-slate-900/80 backdrop-blur-sm cursor-default text-2xl shadow-lg"
        :class="rarityBorder[aug.rarity]"
      >
        {{ aug.icon }}
      </div>

      <!-- Tooltip (rechts beim Hover) -->
      <div
        class="absolute left-14 top-0 hidden group-hover:flex flex-col min-w-[200px] max-w-[240px] p-3 rounded-xl border bg-slate-950/95 border-white/20 shadow-2xl backdrop-blur-sm z-[70]"
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl">{{ aug.icon }}</span>
          <span class="text-sm font-bold text-white">{{ aug.name }}</span>
        </div>
        <span
          class="text-xs px-2 py-0.5 rounded-full border self-start mb-2"
          :class="rarityBadge[aug.rarity]"
        >
          {{ rarityLabel[aug.rarity] }}
        </span>
        <p class="text-xs text-blue-200/60 mb-2">{{ aug.description }}</p>
        <div class="space-y-1 p-2 rounded-lg bg-black/30 border border-white/10">
          <div
            v-for="(line, i) in getEffectLines(aug)"
            :key="i"
            class="flex items-center gap-1.5 text-xs"
          >
            <span class="text-emerald-400">▲</span>
            <span class="text-blue-100/80">{{ line }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
