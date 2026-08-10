<script setup lang="ts">
import {
  UNIVERSE_NEUTRAL_MULTIPLIER,
  UNIVERSE_NEUTRAL_LEVEL_EXPONENT,
  UNIVERSE_NEUTRAL_MAX_ABILITY_LEVEL,
  UNIVERSE_NEUTRAL_SKILL_POINT_INTERVAL,
  UNIVERSE_NEUTRAL_HP_DRAIN,
  ABILITY_CPS_PER_LEVEL_DEFAULT,
  ABILITY_CPC_PER_LEVEL_DEFAULT,
  ABILITY_POWER_PER_LEVEL_DEFAULT,
  ABILITY_MEEP_COST_PER_LEVEL_DEFAULT,
  CHIMES_PER_CLICK_BASE,
} from '@/config/constants'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import RpgFrame from '../../ui/RpgFrame.vue'
import ProvidenceChoiceStep from './ProvidenceChoiceStep.vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { universes } from '@/config/progression/universes'
import type { ModifierEffects } from '@/types'

const gameStore = useGameStore()
const providenceStore = useProvidenceStore()

const visible = computed(() => gameStore.showUniverseSelectModal)

/* ── Zwei Schritte: erst wohin, dann worunter ──────────────────────────────
   Das Ziel-Universum wird lokal gehalten und erst beim Antritt der Vorsehung an
   den Store gereicht. Ein Zwischenzustand im gameStore hätte einen weiteren
   Fall geschaffen, den jeder Leser von `currentUniverse` mitdenken müsste —
   „gewählt, aber noch nicht angetreten" existiert für den Rest des Spiels
   schlicht nicht. */
const step = ref<'universe' | 'providence'>('universe')
const pendingUniverse = ref<number | null>(null)

const pendingUniverseName = computed(
  () => universes.find((u) => u.id === pendingUniverse.value)?.name ?? '',
)

// Jedes Öffnen beginnt beim ersten Schritt — sonst stünde nach einem
// abgebrochenen Prestige die Vorsehungswahl zu einem Universum offen, das der
// Spieler inzwischen vergessen hat.
watch(visible, (open) => {
  if (open) {
    step.value = 'universe'
    pendingUniverse.value = null
  }
})

function chooseUniverse(id: number) {
  if (id === gameStore.currentUniverse) return
  pendingUniverse.value = id
  step.value = 'providence'
}

/** Vorsehung antreten und das Prestige auslösen. Erst annehmen, dann reisen:
 *  `selectPrestigeUniverse` startet die Hyperspace-Animation, nach der der Reset
 *  läuft — die Vorsehung muss davor stehen. */
function chooseProvidence(id: string) {
  if (pendingUniverse.value === null) return
  providenceStore.choose(id)
  gameStore.selectPrestigeUniverse(pendingUniverse.value)
}

const N = UNIVERSE_NEUTRAL_MULTIPLIER
const effectLabels: Record<keyof ModifierEffects, { label: string; neutral: number }> = {
  cpsMultiplier: { label: 'CPS', neutral: N },
  cpcMultiplier: { label: 'CPC', neutral: N },
  buildingCostMultiplier: { label: 'Cost', neutral: N },
  meepCostMultiplier: { label: 'Meep Cost', neutral: N },
  meepPowerMultiplier: { label: 'Meep Power', neutral: N },
  levelExponent: { label: 'Level Exponent', neutral: UNIVERSE_NEUTRAL_LEVEL_EXPONENT },
  maxAbilityLevel: { label: 'Max Ability Lvl', neutral: UNIVERSE_NEUTRAL_MAX_ABILITY_LEVEL },
  skillPointInterval: { label: 'SP Interval', neutral: UNIVERSE_NEUTRAL_SKILL_POINT_INTERVAL },
  eloPowerMultiplier: { label: 'Battle-Power', neutral: N },
  expeditionRewardMultiplier: { label: 'Expedition-Rewards', neutral: N },
  abilityCPSPerLevel: { label: 'Ability CPS/Lvl', neutral: ABILITY_CPS_PER_LEVEL_DEFAULT },
  abilityCPCPerLevel: { label: 'Ability CPC/Lvl', neutral: ABILITY_CPC_PER_LEVEL_DEFAULT },
  abilityPowerPerLevel: { label: 'Ability Power/Lvl', neutral: ABILITY_POWER_PER_LEVEL_DEFAULT },
  abilityMeepCostPerLevel: {
    label: 'Ability Meep Cost/Lvl',
    neutral: ABILITY_MEEP_COST_PER_LEVEL_DEFAULT,
  },
  baseChimesPerClick: { label: 'Base CPC', neutral: CHIMES_PER_CLICK_BASE },
  buildingMultipliers: { label: 'Multipliers', neutral: N },
  cooldownMultiplier: { label: 'Cooldown', neutral: N },
  enemySpeedMultiplier: { label: 'Enemy Speed', neutral: N },
  enemyMaxHPDrainPerSecond: { label: 'HP Drain/sec', neutral: UNIVERSE_NEUTRAL_HP_DRAIN },
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

/** Escape-Leiter: aus der Vorsehungswahl zurück zur Universumswahl, von dort
 *  aus dem Modal. Ein Escape, das aus dem zweiten Schritt direkt alles schliesst,
 *  verwürfe die erste Wahl mit — für den Spieler sähe das aus wie ein Absturz. */
function handleEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (step.value === 'providence') {
    step.value = 'universe'
    return
  }
  gameStore.closePrestigeModal()
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
          <RpgFrame />
          <!-- Gold Accent -->
          <div class="rpg-accent-bar"></div>

          <!-- Header -->
          <div class="relative flex items-center justify-center p-6 rpg-header">
            <h2 class="text-3xl font-bold uni-title">
              {{ step === 'universe' ? 'Choose Your Next Universe' : 'Choose Your Providence' }}
            </h2>
            <button class="modal-close-btn" @click="gameStore.closePrestigeModal()">✕</button>
          </div>

          <!-- Schritt 2: unter welcher Vorsehung -->
          <ProvidenceChoiceStep
            v-if="step === 'providence'"
            :cards="providenceStore.offerCards"
            :universe-name="pendingUniverseName"
            @pick="chooseProvidence"
            @back="step = 'universe'"
          />

          <!-- Schritt 1: Universe Cards Grid -->
          <div
            v-else
            class="grid grid-cols-2 gap-4 p-6 overflow-y-auto rpg-scrollbar lg:grid-cols-3 max-h-[65vh]"
          >
            <button
              v-for="universe in universes"
              :key="universe.id"
              :disabled="universe.id === gameStore.currentUniverse"
              class="relative flex flex-col items-center p-4 text-left uni-card group"
              :class="
                universe.id === gameStore.currentUniverse
                  ? 'uni-card--current'
                  : 'uni-card--selectable'
              "
              @click="chooseUniverse(universe.id)"
            >
              <!-- Current badge -->
              <span
                v-if="universe.id === gameStore.currentUniverse"
                class="uni-active-badge absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold"
              >
                ACTIVE
              </span>

              <!-- Icon -->
              <img
                v-if="universe.modifier?.icon?.startsWith('/')"
                class="mb-2 uni-modifier-icon"
                :src="universe.modifier.icon"
                :alt="universe.modifier.name"
              />
              <Icon v-else-if="universe.modifier?.icon?.includes(':')" :icon="universe.modifier.icon" class="mb-2 uni-modifier-gi" />
              <!-- Fallback: ohne Modifier-Icon steht hier die Bahn-Ikone, nie der rohe Icon-Name -->
              <Icon v-else icon="game-icons:orbital" class="mb-2 uni-modifier-gi" />

              <!-- Name -->
              <h3 class="mb-1 text-base font-bold text-center uni-name">
                {{ universe.name }}
              </h3>

              <!-- Description -->
              <p class="uni-desc mb-3 text-[11px] text-center">
                {{ universe.description }}
              </p>

              <!-- Modifier Effects -->
              <div v-if="universe.modifier" class="uni-effects w-full space-y-1 p-2.5">
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
              <div v-else class="uni-no-mod w-full p-2.5 text-center text-[10px]">
                No Modifiers
              </div>
            </button>
          </div>

          <!-- Footer -->
          <div class="flex justify-center p-4 uni-footer">
            <button
              class="px-6 py-2 text-sm uni-cancel-btn"
              @click="gameStore.closePrestigeModal()"
            >
              Cancel
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

.uni-modifier-gi {
  width: 30px;
  height: 30px;
  color: #c89040;
}
.uni-modifier-icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
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
  background: var(--rpg-bg-hover);
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
