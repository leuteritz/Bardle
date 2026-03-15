<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      @click.self="$emit('cancel')"
    >
      <div
        class="relative w-full max-w-3xl mx-4 overflow-hidden border shadow-2xl shadow-blue-900/50 rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 border-white/30"
      >
        <!-- Header -->
        <div
          class="relative flex items-center justify-center p-5 border-b backdrop-blur-lg bg-white/10 border-white/20"
        >
          <h2
            class="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text"
            style="font-family: 'MedievalSharp', cursive"
          >
            Wähle dein nächstes Universum
          </h2>
        </div>

        <!-- Universe Cards -->
        <div class="grid grid-cols-2 gap-6 p-6">
          <button
            v-for="uid in choices"
            :key="uid"
            class="group relative flex flex-col items-center p-5 border rounded-2xl bg-white/5 backdrop-blur-sm border-white/15 hover:border-violet-400/60 hover:bg-violet-500/10 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300 cursor-pointer text-left"
            @click="$emit('select', uid)"
          >
            <!-- Icon -->
            <span class="text-4xl mb-3">{{ getUniverse(uid)?.modifier?.icon ?? '🌌' }}</span>

            <!-- Name -->
            <h3
              class="text-lg font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text mb-1 text-center"
            >
              {{ getUniverse(uid)?.name }}
            </h3>

            <!-- Description -->
            <p class="text-xs text-blue-400/70 mb-4 text-center">
              {{ getUniverse(uid)?.description }}
            </p>

            <!-- Modifier Effects -->
            <div
              v-if="getUniverse(uid)?.modifier"
              class="w-full space-y-1.5 p-3 rounded-xl bg-black/30 border border-white/10"
            >
              <div class="text-xs font-bold text-violet-300 mb-2 text-center">
                {{ getUniverse(uid)!.modifier!.name }}
              </div>
              <div
                v-for="(line, i) in getEffectLines(uid)"
                :key="i"
                class="flex items-center gap-2 text-xs"
              >
                <span :class="line.positive ? 'text-emerald-400' : 'text-red-400'">
                  {{ line.positive ? '▲' : '▼' }}
                </span>
                <span class="text-blue-200/80">{{ line.text }}</span>
              </div>
            </div>

            <!-- Select hint -->
            <div
              class="mt-4 px-4 py-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 text-xs font-bold text-violet-300 group-hover:bg-violet-500/30 group-hover:border-violet-400/60 transition-all"
            >
              Auswählen
            </div>
          </button>
        </div>

        <!-- Cancel -->
        <div class="flex justify-center pb-5">
          <button
            class="px-6 py-2 text-sm text-blue-400/60 hover:text-blue-300 border border-blue-400/20 hover:border-blue-400/40 rounded-xl transition-all duration-200"
            @click="$emit('cancel')"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { universes } from '../../../config/universes'
import type { ModifierEffects } from '../../../types'

const effectLabels: Record<keyof ModifierEffects, { label: string; neutral: number }> = {
  cpsMultiplier: { label: 'CPS', neutral: 1 },
  cpcMultiplier: { label: 'CPC', neutral: 1 },
  buildingCostMultiplier: { label: 'Gebäude-Kosten', neutral: 1 },
  meepCostMultiplier: { label: 'Meep-Kosten', neutral: 1 },
  meepPowerMultiplier: { label: 'Meep-Power', neutral: 1 },
  levelExponent: { label: 'Level-Exponent', neutral: 1.2 },
  maxAbilityLevel: { label: 'Max Ability Level', neutral: 5 },
  skillPointInterval: { label: 'SP-Intervall', neutral: 2 },
  eloPowerMultiplier: { label: 'Battle-Power', neutral: 1 },
  expeditionRewardMultiplier: { label: 'Expedition-Rewards', neutral: 1 },
  abilityCPSPerLevel: { label: 'Ability CPS/Lvl', neutral: 0.15 },
  abilityCPCPerLevel: { label: 'Ability CPC/Lvl', neutral: 0.25 },
  abilityPowerPerLevel: { label: 'Ability Power/Lvl', neutral: 300 },
  abilityMeepCostPerLevel: { label: 'Ability Meep-Kosten/Lvl', neutral: 0.1 },
  baseChimesPerClick: { label: 'Basis-CPC', neutral: 20 },
  buildingMultipliers: { label: 'Gebäude-Multiplikatoren', neutral: 1 },
}

// Keys where higher = better for the player
const higherIsBetter = new Set([
  'cpsMultiplier', 'cpcMultiplier', 'meepPowerMultiplier', 'maxAbilityLevel',
  'eloPowerMultiplier', 'expeditionRewardMultiplier', 'baseChimesPerClick',
  'abilityCPSPerLevel', 'abilityCPCPerLevel', 'abilityPowerPerLevel',
])

// Keys where lower = better
const lowerIsBetter = new Set([
  'buildingCostMultiplier', 'meepCostMultiplier', 'levelExponent',
  'skillPointInterval', 'abilityMeepCostPerLevel',
])

export default defineComponent({
  name: 'UniverseSelectionModal',
  props: {
    visible: { type: Boolean, required: true },
    choices: { type: Array as PropType<number[]>, required: true },
  },
  emits: ['select', 'cancel'],
  setup() {
    function getUniverse(id: number) {
      return universes.find((u) => u.id === id)
    }

    function getEffectLines(uid: number) {
      const u = getUniverse(uid)
      if (!u?.modifier) return []
      const effects = u.modifier.effects
      const lines: { text: string; positive: boolean }[] = []

      for (const [key, value] of Object.entries(effects)) {
        if (key === 'buildingMultipliers' && typeof value === 'object') {
          for (const [building, mult] of Object.entries(value as Record<string, number>)) {
            lines.push({
              text: `${building} x${mult}`,
              positive: mult > 1,
            })
          }
          continue
        }

        const meta = effectLabels[key as keyof ModifierEffects]
        if (!meta) continue
        const numVal = value as number
        const isPositive = higherIsBetter.has(key)
          ? numVal > meta.neutral
          : lowerIsBetter.has(key)
            ? numVal < meta.neutral
            : true
        lines.push({
          text: `${meta.label} x${numVal}`,
          positive: isPositive,
        })
      }
      return lines
    }

    return { getUniverse, getEffectLines }
  },
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
