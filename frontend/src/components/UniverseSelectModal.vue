<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { universes } from '../config/universes'
import type { ModifierEffects } from '../types'

const gameStore = useGameStore()

const visible = computed(() => gameStore.showUniverseSelectModal)

const effectLabels: Record<keyof ModifierEffects, { label: string; neutral: number }> = {
  cpsMultiplier: { label: 'CPS', neutral: 1 },
  cpcMultiplier: { label: 'CPC', neutral: 1 },
  buildingCostMultiplier: { label: 'Kosten', neutral: 1 },
  meepCostMultiplier: { label: 'Meep-Kosten', neutral: 1 },
  meepPowerMultiplier: { label: 'Meep-Power', neutral: 1 },
  levelExponent: { label: 'Level-Exponent', neutral: 1.2 },
  maxAbilityLevel: { label: 'Max Ability Lvl', neutral: 5 },
  skillPointInterval: { label: 'SP-Intervall', neutral: 2 },
  eloPowerMultiplier: { label: 'Battle-Power', neutral: 1 },
  expeditionRewardMultiplier: { label: 'Expedition-Rewards', neutral: 1 },
  abilityCPSPerLevel: { label: 'Ability CPS/Lvl', neutral: 0.15 },
  abilityCPCPerLevel: { label: 'Ability CPC/Lvl', neutral: 0.25 },
  abilityPowerPerLevel: { label: 'Ability Power/Lvl', neutral: 300 },
  abilityMeepCostPerLevel: { label: 'Ability Meep-Kosten/Lvl', neutral: 0.1 },
  baseChimesPerClick: { label: 'Basis-CPC', neutral: 20 },
  buildingMultipliers: { label: 'Multipliers', neutral: 1 },
  cooldownMultiplier: { label: 'Cooldown', neutral: 1 },
  enemySpeedMultiplier: { label: 'Gegner-Speed', neutral: 1 },
  enemyMaxHPDrainPerSecond: { label: 'HP-Drain/Sek', neutral: 0 },
}

const higherIsBetter = new Set([
  'cpsMultiplier',
  'cpcMultiplier',
  'meepPowerMultiplier',
  'maxAbilityLevel',
  'eloPowerMultiplier',
  'expeditionRewardMultiplier',
  'baseChimesPerClick',
  'abilityCPSPerLevel',
  'abilityCPCPerLevel',
  'abilityPowerPerLevel',
  'enemyMaxHPDrainPerSecond',
])

const lowerIsBetter = new Set([
  'buildingCostMultiplier',
  'meepCostMultiplier',
  'levelExponent',
  'skillPointInterval',
  'abilityMeepCostPerLevel',
  'cooldownMultiplier',
  'enemySpeedMultiplier',
])

function getEffectLines(uid: number) {
  const u = universes.find((uni) => uni.id === uid)
  if (!u?.modifier) return []
  const effects = u.modifier.effects
  const lines: { text: string; positive: boolean }[] = []

  for (const [key, value] of Object.entries(effects)) {
    if (key === 'buildingMultipliers' && typeof value === 'object') {
      for (const [building, mult] of Object.entries(value as Record<string, number>)) {
        lines.push({ text: `${building} x${mult}`, positive: mult > 1 })
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
    lines.push({ text: `${meta.label} x${numVal}`, positive: isPositive })
  }
  return lines
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') gameStore.closePrestigeModal()
}

onMounted(() => document.addEventListener('keydown', handleEscape))
onUnmounted(() => document.removeEventListener('keydown', handleEscape))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md"
        @click.self="gameStore.closePrestigeModal()"
      >
        <div
          class="relative w-full max-w-4xl mx-4 overflow-hidden border shadow-2xl shadow-purple-900/50 rounded-3xl bg-gradient-to-br from-slate-950 via-purple-950/80 to-slate-950 border-white/20"
        >
          <!-- Close Button -->
          <button
            class="absolute z-10 flex items-center justify-center w-8 h-8 transition-all rounded-full top-4 right-4 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white"
            @click="gameStore.closePrestigeModal()"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Header -->
          <div class="relative flex items-center justify-center p-6 border-b backdrop-blur-lg bg-white/5 border-white/10">
            <h2
              class="text-3xl font-bold text-transparent bg-gradient-to-r from-purple-400 via-amber-300 to-purple-400 bg-clip-text"
            >
              Wähle dein nächstes Universum
            </h2>
          </div>

          <!-- Universe Cards Grid -->
          <div class="grid grid-cols-2 gap-4 p-6 overflow-y-auto lg:grid-cols-3 max-h-[65vh]">
            <button
              v-for="universe in universes"
              :key="universe.id"
              :disabled="universe.id === gameStore.currentUniverse"
              class="universe-card relative flex flex-col items-center p-4 text-left transition-all duration-300 border cursor-pointer group rounded-2xl backdrop-blur-sm"
              :class="
                universe.id === gameStore.currentUniverse
                  ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed'
                  : 'bg-white/5 border-white/15 hover:border-violet-400/60 hover:bg-violet-500/10 hover:scale-[1.03] hover:shadow-lg hover:shadow-violet-500/20'
              "
              @click="gameStore.selectPrestigeUniverse(universe.id)"
            >
              <!-- Current badge -->
              <span
                v-if="universe.id === gameStore.currentUniverse"
                class="absolute px-2 py-0.5 text-[10px] font-bold text-emerald-300 border rounded-full top-2 right-2 bg-emerald-500/20 border-emerald-400/30"
              >
                AKTIV
              </span>

              <!-- Icon -->
              <span class="mb-2 text-3xl">{{ universe.modifier?.icon ?? '🌍' }}</span>

              <!-- Name -->
              <h3
                class="mb-1 text-base font-bold text-center text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
              >
                {{ universe.name }}
              </h3>

              <!-- Description -->
              <p class="mb-3 text-[11px] text-center text-blue-400/70">
                {{ universe.description }}
              </p>

              <!-- Modifier Effects -->
              <div
                v-if="universe.modifier"
                class="w-full space-y-1 p-2.5 rounded-xl bg-black/30 border border-white/10"
              >
                <div class="mb-1.5 text-[10px] font-bold text-center text-violet-300">
                  {{ universe.modifier.name }}
                </div>
                <div
                  v-for="(line, i) in getEffectLines(universe.id)"
                  :key="i"
                  class="flex items-center gap-1.5 text-[10px]"
                >
                  <span :class="line.positive ? 'text-emerald-400' : 'text-red-400'">
                    {{ line.positive ? '▲' : '▼' }}
                  </span>
                  <span class="text-blue-200/80">{{ line.text }}</span>
                </div>
              </div>

              <!-- No modifier hint -->
              <div
                v-else
                class="w-full p-2.5 rounded-xl bg-black/20 border border-white/5 text-center text-[10px] text-blue-300/50"
              >
                Keine Modifikatoren
              </div>
            </button>
          </div>

          <!-- Footer -->
          <div class="flex justify-center p-4 border-t border-white/10">
            <button
              class="px-6 py-2 text-sm transition-all duration-200 border text-blue-400/60 hover:text-blue-300 border-blue-400/20 hover:border-blue-400/40 rounded-xl"
              @click="gameStore.closePrestigeModal()"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
