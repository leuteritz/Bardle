<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { useAugmentStore } from '@/stores/augmentStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { AUGMENTS } from '@/config/augments'
import { AUGMENT_RARITY_COLOR } from '@/composables/useRarityColors'
import type { AugmentDefinition } from '@/types'
import { Icon } from '@iconify/vue'

const gameStore = useGameStore()
const augmentStore = useAugmentStore()
const synergyStore = useSynergyStore()

const { activeModifier, abilityCPSMultiplier, abilityCPCMultiplier, abilityPowerBonus } =
  storeToRefs(gameStore)
const { temporaryCPSMultiplier } = storeToRefs(augmentStore)
const { cpsSynergyMultiplier, powerSynergyMultiplier, dpsSynergyMultiplier } =
  storeToRefs(synergyStore)

/* ── Aggregated buff totals (chips) ──────────────────────────────
   Fold augment activeModifier + ability + synergy + temporary buffs. */
const buffCPSPct = computed(() => {
  const mod = activeModifier.value
  const total =
    (mod.cpsMultiplier ?? 1) - 1 +
    (abilityCPSMultiplier.value - 1) +
    (cpsSynergyMultiplier.value - 1) +
    (temporaryCPSMultiplier.value - 1)
  return Math.round(total * 100)
})

const buffCPCPct = computed(() => {
  const mod = activeModifier.value
  const total = (mod.cpcMultiplier ?? 1) - 1 + (abilityCPCMultiplier.value - 1)
  return Math.round(total * 100)
})

const buffPowerSynergyPct = computed(() => Math.round((powerSynergyMultiplier.value - 1) * 100))
const buffPowerFlat = computed(() => abilityPowerBonus.value)
const buffMeepPct = computed(() =>
  Math.round(((activeModifier.value.meepPowerMultiplier ?? 1) - 1) * 100),
)
const buffDPSPct = computed(() => Math.round((dpsSynergyMultiplier.value - 1) * 100))
const buffCDRPct = computed(() => {
  const mul = activeModifier.value.cooldownMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})
const buffExpPct = computed(() =>
  Math.round(((activeModifier.value.expeditionRewardMultiplier ?? 1) - 1) * 100),
)
const buffCostPct = computed(() => {
  const mul = activeModifier.value.buildingCostMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})
const buffEnemyPct = computed(() => {
  const mul = activeModifier.value.enemySpeedMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})

interface TotalChip {
  key: string
  icon: string
  label: string
  value: string
  positive: boolean
}

const totalChips = computed<TotalChip[]>(() => {
  const chips: TotalChip[] = []
  if (buffCPSPct.value > 0)
    chips.push({ key: 'cps', icon: 'game-icons:lyre', label: 'Production', value: `+${buffCPSPct.value}%`, positive: true })
  if (buffCPCPct.value > 0)
    chips.push({ key: 'cpc', icon: 'game-icons:hand', label: 'Click', value: `+${buffCPCPct.value}%`, positive: true })
  if (buffPowerSynergyPct.value > 0 || buffPowerFlat.value > 0) {
    const parts: string[] = []
    if (buffPowerSynergyPct.value > 0) parts.push(`+${buffPowerSynergyPct.value}%`)
    if (buffPowerFlat.value > 0) parts.push(`+${buffPowerFlat.value}`)
    chips.push({ key: 'power', icon: 'game-icons:magic-swirl', label: 'Power', value: parts.join(' & '), positive: true })
  }
  if (buffMeepPct.value > 0)
    chips.push({ key: 'meep', icon: 'game-icons:crystal-ball', label: 'Meep Power', value: `+${buffMeepPct.value}%`, positive: true })
  if (buffDPSPct.value > 0)
    chips.push({ key: 'dps', icon: 'game-icons:crossed-swords', label: 'Combat DPS', value: `+${buffDPSPct.value}%`, positive: true })
  if (buffCDRPct.value > 0)
    chips.push({ key: 'cdr', icon: 'game-icons:sand-clock', label: 'Cooldowns', value: `-${buffCDRPct.value}%`, positive: false })
  if (buffExpPct.value > 0)
    chips.push({ key: 'exp', icon: 'game-icons:treasure-map', label: 'Expeditions', value: `+${buffExpPct.value}%`, positive: true })
  if (buffCostPct.value > 0)
    chips.push({ key: 'cost', icon: 'game-icons:stone-wall', label: 'Build Cost', value: `-${buffCostPct.value}%`, positive: false })
  if (buffEnemyPct.value > 0)
    chips.push({ key: 'enemy', icon: 'game-icons:turtle', label: 'Enemy Speed', value: `-${buffEnemyPct.value}%`, positive: false })
  return chips
})

/* ── Per-augment cards, grouped by effect category ──────────────── */
type GroupKey = 'Chimes' | 'Resources' | 'Combat' | 'Special'
const GROUP_ORDER: GroupKey[] = ['Chimes', 'Resources', 'Combat', 'Special']

function getGroupKey(aug: AugmentDefinition): GroupKey {
  const e = aug.effects
  if (e.cpsMultiplier || e.cpcMultiplier || e.expeditionRewardMultiplier) return 'Chimes'
  if (e.buildingCostMultiplier || e.meepCostMultiplier || e.meepPowerMultiplier || e.abilityPowerPerLevel)
    return 'Resources'
  if (e.cooldownMultiplier || e.enemySpeedMultiplier || e.enemyMaxHPDrainPerSecond) return 'Combat'
  return 'Special'
}

interface AugCard {
  aug: AugmentDefinition
  key: string
  color: string
}
interface AugGroup {
  key: GroupKey
  cards: AugCard[]
}

const augGroups = computed<AugGroup[]>(() => {
  const map = new Map<GroupKey, AugCard[]>(GROUP_ORDER.map((k) => [k, []]))
  gameStore.activeAugments.forEach((id, idx) => {
    const aug = AUGMENTS.find((a) => a.id === id)
    if (!aug) return
    map.get(getGroupKey(aug))!.push({
      aug,
      key: `${id}-${idx}`,
      color: AUGMENT_RARITY_COLOR[aug.rarity],
    })
  })
  return GROUP_ORDER.filter((k) => map.get(k)!.length > 0).map((k) => ({ key: k, cards: map.get(k)! }))
})

const augmentCount = computed(() => gameStore.activeAugments.length)
const hasAugments = computed(() => augmentCount.value > 0)
</script>

<template>
  <div class="abp-root">
    <div class="abp-gold-line" />

    <div class="abp-header">
      <span class="abp-title">Active Augments</span>
      <span v-if="hasAugments" class="abp-count">{{ augmentCount }}</span>
    </div>

    <div class="abp-body">
      <!-- ── Empty state ── -->
      <div v-if="!hasAugments" class="abp-empty">
        <Icon icon="game-icons:gems" class="abp-empty-icon" width="36" height="36" />
        <span class="abp-empty-title">No augments active yet</span>
        <span class="abp-empty-sub">Level up to pick your first augment</span>
      </div>

      <template v-else>
        <!-- ── Totals strip ── -->
        <div v-if="totalChips.length" class="abp-totals">
          <div v-for="chip in totalChips" :key="chip.key" class="abp-chip">
            <Icon :icon="chip.icon" class="abp-chip-icon" width="15" height="15" />
            <span class="abp-chip-lbl">{{ chip.label }}</span>
            <span class="abp-chip-val" :class="chip.positive ? 'is-up' : 'is-down'">{{ chip.value }}</span>
          </div>
        </div>

        <!-- ── Grouped augment cards ── -->
        <div v-for="group in augGroups" :key="group.key" class="abp-group">
          <div class="abp-group-label">{{ group.key }}</div>
          <div class="abp-grid">
            <div
              v-for="card in group.cards"
              :key="card.key"
              class="abp-card"
              :style="{ '--rarity': card.color }"
            >
              <div class="abp-card-icon">
                <img v-if="card.aug.image" :src="card.aug.image" :alt="card.aug.name" />
                <Icon
                  v-else-if="card.aug.icon.includes(':')"
                  :icon="card.aug.icon"
                  width="28"
                  height="28"
                />
                <span v-else class="abp-card-emoji">{{ card.aug.icon }}</span>
              </div>
              <div class="abp-card-body">
                <span class="abp-card-name" :style="{ color: card.color }">{{ card.aug.name }}</span>
                <span class="abp-card-effect">{{ card.aug.effectLine }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ══ Active Augments Panel ═════════════════════════════ */
.abp-root {
  width: 100%;
  border: 2px solid #7a4e20;
  box-shadow: inset 0 0 0 1px #5c3310;
  background: #111008;
  border-radius: 4px;
  overflow: hidden;
}

.abp-gold-line {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c040, #d4a020, #c89040, #5c3310);
}

.abp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #1e1006;
  border-bottom: 2px solid #5c3310;
}

.abp-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8c040;
}

.abp-count {
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  color: #e8c040;
  background: #111008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  padding: 2px 7px;
}

.abp-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Empty state ── */
.abp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 26px 12px;
  text-align: center;
}
.abp-empty-icon {
  color: #5c4a30;
  margin-bottom: 2px;
}
.abp-empty-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--rpg-text-muted);
}
.abp-empty-sub {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--rpg-text-dim);
}

/* ── Totals strip ── */
.abp-totals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.abp-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #1a1008;
  border: 1px solid #3e200a;
  border-radius: var(--bp-radius);
}

.abp-chip-icon {
  color: #c89040;
  flex-shrink: 0;
}

.abp-chip-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}

.abp-chip-val {
  font-size: 13px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.abp-chip-val.is-up {
  color: #e8c040;
}
.abp-chip-val.is-down {
  color: #52b830;
}

/* ── Augment card groups ── */
.abp-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.abp-group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--rpg-wood-inner);
}

.abp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 8px;
}

.abp-card {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--rarity);
  border-radius: var(--bp-radius);
  box-shadow: inset 0 0 12px color-mix(in srgb, var(--rarity) 8%, transparent);
  transition: box-shadow 0.15s, background 0.15s;
}

.abp-card:hover {
  background: #221f18;
  box-shadow:
    inset 0 0 12px color-mix(in srgb, var(--rarity) 14%, transparent),
    0 0 10px color-mix(in srgb, var(--rarity) 30%, transparent);
}

.abp-card-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border: 1px solid #2a1a08;
  border-radius: var(--bp-radius);
  overflow: hidden;
  color: var(--rarity);
}
.abp-card-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.abp-card-emoji {
  font-size: 24px;
  line-height: 1;
}

.abp-card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.abp-card-name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.abp-card-effect {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #b0a080;
  line-height: 1.15;
}
</style>
