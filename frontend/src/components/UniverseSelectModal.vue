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
        class="fixed inset-0 z-[9998] flex items-center justify-center rpg-overlay"
        @click.self="gameStore.closePrestigeModal()"
      >
        <div class="relative w-full max-w-4xl mx-4 overflow-hidden rpg-frame">
          <!-- Gold Accent -->
          <div class="rpg-accent-bar"></div>

          <!-- Close Button -->
          <button
            class="absolute z-10 top-4 right-4 w-8 h-8 flex items-center justify-center rpg-close-btn"
            @click="gameStore.closePrestigeModal()"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Header -->
          <div class="rpg-header flex items-center justify-center p-6 relative">
            <h2 class="uni-title text-3xl font-bold">
              Wähle dein nächstes Universum
            </h2>
          </div>

          <!-- Universe Cards Grid -->
          <div class="grid grid-cols-2 gap-4 p-6 overflow-y-auto rpg-scrollbar lg:grid-cols-3 max-h-[65vh]">
            <button
              v-for="universe in universes"
              :key="universe.id"
              :disabled="universe.id === gameStore.currentUniverse"
              class="uni-card relative flex flex-col items-center p-4 text-left group"
              :class="
                universe.id === gameStore.currentUniverse
                  ? 'uni-card--current'
                  : 'uni-card--selectable'
              "
              @click="gameStore.selectPrestigeUniverse(universe.id)"
            >
              <!-- Current badge -->
              <span
                v-if="universe.id === gameStore.currentUniverse"
                class="uni-active-badge absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold"
              >
                AKTIV
              </span>

              <!-- Icon -->
              <span class="mb-2 text-3xl">{{ universe.modifier?.icon ?? '🌍' }}</span>

              <!-- Name -->
              <h3 class="uni-name mb-1 text-base font-bold text-center">
                {{ universe.name }}
              </h3>

              <!-- Description -->
              <p class="uni-desc mb-3 text-[11px] text-center">
                {{ universe.description }}
              </p>

              <!-- Modifier Effects -->
              <div
                v-if="universe.modifier"
                class="uni-effects w-full space-y-1 p-2.5"
              >
                <div class="uni-modifier-name mb-1.5 text-[10px] font-bold text-center">
                  {{ universe.modifier.name }}
                </div>
                <div
                  v-for="(line, i) in getEffectLines(universe.id)"
                  :key="i"
                  class="flex items-center gap-1.5 text-[10px]"
                >
                  <span :class="line.positive ? 'eff-positive' : 'eff-negative'">
                    {{ line.positive ? '▲' : '▼' }}
                  </span>
                  <span class="uni-effect-text">{{ line.text }}</span>
                </div>
              </div>

              <!-- No modifier hint -->
              <div
                v-else
                class="uni-no-mod w-full p-2.5 text-center text-[10px]"
              >
                Keine Modifikatoren
              </div>
            </button>
          </div>

          <!-- Footer -->
          <div class="uni-footer flex justify-center p-4">
            <button
              class="uni-cancel-btn px-6 py-2 text-sm"
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

.uni-title {
  color: var(--rpg-gold);
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.4);
}

.uni-card {
  border-radius: 4px;
  transition: all 0.2s;
  cursor: pointer;
}

.uni-card--current {
  background: var(--rpg-bg-icon);
  border: 1px solid var(--rpg-border-row);
  opacity: 0.4;
  cursor: not-allowed;
}

.uni-card--selectable {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-border-row);
}

.uni-card--selectable:hover {
  border-color: var(--rpg-gold-dim);
  background: #252520;
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(200, 144, 64, 0.2);
}

.uni-active-badge {
  color: var(--rpg-green-top);
  background: rgba(82, 184, 48, 0.15);
  border: 1px solid rgba(82, 184, 48, 0.3);
  border-radius: 4px;
}

.uni-name {
  color: var(--rpg-gold);
}

.uni-desc {
  color: var(--rpg-text-dim);
}

.uni-effects {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
}

.uni-modifier-name {
  color: var(--rpg-gold-dim);
}

.eff-positive {
  color: var(--rpg-green-top);
}

.eff-negative {
  color: var(--rpg-red);
}

.uni-effect-text {
  color: var(--rpg-text-muted);
}

.uni-no-mod {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  color: var(--rpg-text-dim);
}

.uni-footer {
  border-top: 1px solid var(--rpg-border-row);
}

.uni-cancel-btn {
  color: var(--rpg-text-dim);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.uni-cancel-btn:hover {
  color: var(--rpg-text-muted);
  border-color: var(--rpg-text-dim);
}
</style>
