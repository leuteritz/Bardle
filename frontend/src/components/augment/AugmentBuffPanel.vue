<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { AUGMENTS } from '../../config/augments'
import { AUGMENT_RARITY_COLOR } from '../../composables/useRarityColors'
import type { AugmentDefinition } from '../../types'

const gameStore = useGameStore()

interface AugmentSlot {
  aug: AugmentDefinition
  key: string
}

const activeAugmentSlots = computed<AugmentSlot[]>(() =>
  gameStore.activeAugments
    .map((id, idx) => {
      const aug = AUGMENTS.find((a) => a.id === id)
      return aug ? { aug, key: `${id}-${idx}` } : null
    })
    .filter((s): s is AugmentSlot => !!s),
)

const isExpanded = ref(true)
const hoveredKey = ref<string | null>(null)

type GroupKey = 'Chimes' | 'Ressourcen' | 'Kampf' | 'Spezial'

function getGroupKey(slot: AugmentSlot): GroupKey {
  const e = slot.aug.effects
  if (e.cpsMultiplier || e.cpcMultiplier || e.expeditionRewardMultiplier) return 'Chimes'
  if (
    e.buildingCostMultiplier ||
    e.meepCostMultiplier ||
    e.meepPowerMultiplier ||
    e.abilityPowerPerLevel
  )
    return 'Ressourcen'
  if (e.cooldownMultiplier || e.enemySpeedMultiplier || e.enemyMaxHPDrainPerSecond) return 'Kampf'
  return 'Spezial'
}

interface SummaryGroup {
  label: string
  entries: { label: string; value: string; positive: boolean }[]
}

const summaryGroups = computed<SummaryGroup[]>(() => {
  let cps = 0,
    cpc = 0,
    building = 0,
    meepCost = 0
  let meepPower = 0,
    expedition = 0,
    abilityPower = 0
  let cooldown = 0,
    enemySpeed = 0,
    hpDrain = 0
  const specialLineCounts = new Map<string, number>()

  for (const slot of activeAugmentSlots.value) {
    const e = slot.aug.effects
    if (e.cpsMultiplier) cps += (e.cpsMultiplier - 1) * 100
    if (e.cpcMultiplier) cpc += (e.cpcMultiplier - 1) * 100
    if (e.buildingCostMultiplier) building += (1 - e.buildingCostMultiplier) * 100
    if (e.meepCostMultiplier) meepCost += (1 - e.meepCostMultiplier) * 100
    if (e.meepPowerMultiplier) meepPower += (e.meepPowerMultiplier - 1) * 100
    if (e.expeditionRewardMultiplier) expedition += (e.expeditionRewardMultiplier - 1) * 100
    if (e.abilityPowerPerLevel) abilityPower += e.abilityPowerPerLevel
    if (e.cooldownMultiplier) cooldown += (1 - e.cooldownMultiplier) * 100
    if (e.enemySpeedMultiplier) enemySpeed += (1 - e.enemySpeedMultiplier) * 100
    if (e.enemyMaxHPDrainPerSecond) hpDrain += e.enemyMaxHPDrainPerSecond * 100
    if (slot.aug.specialEffect) {
      const hasNumeric = !!(
        e.cpsMultiplier ||
        e.cpcMultiplier ||
        e.buildingCostMultiplier ||
        e.meepCostMultiplier ||
        e.meepPowerMultiplier ||
        e.expeditionRewardMultiplier ||
        e.abilityPowerPerLevel ||
        e.cooldownMultiplier ||
        e.enemySpeedMultiplier ||
        e.enemyMaxHPDrainPerSecond
      )
      if (!hasNumeric) {
        specialLineCounts.set(
          slot.aug.effectLine,
          (specialLineCounts.get(slot.aug.effectLine) ?? 0) + 1,
        )
      }
    }
  }

  const fmt = (v: number) => (v > 0 ? '+' : '') + Math.round(v) + '%'

  const chimeEntries: SummaryGroup['entries'] = []
  if (cps !== 0) chimeEntries.push({ label: 'CPS', value: fmt(cps), positive: cps > 0 })
  if (cpc !== 0) chimeEntries.push({ label: 'CPC', value: fmt(cpc), positive: cpc > 0 })
  if (expedition !== 0)
    chimeEntries.push({ label: 'Expedition', value: fmt(expedition), positive: expedition > 0 })

  const resourceEntries: SummaryGroup['entries'] = []
  if (building > 0)
    resourceEntries.push({ label: 'Gebäude', value: `-${Math.round(building)}%`, positive: true })
  if (meepCost > 0)
    resourceEntries.push({
      label: 'Meep-Kosten',
      value: `-${Math.round(meepCost)}%`,
      positive: true,
    })
  if (meepPower !== 0)
    resourceEntries.push({ label: 'Meep-Stärke', value: fmt(meepPower), positive: meepPower > 0 })
  if (abilityPower > 0)
    resourceEntries.push({ label: 'Power/Lv', value: `+${abilityPower}`, positive: true })

  const combatEntries: SummaryGroup['entries'] = []
  if (cooldown > 0)
    combatEntries.push({ label: 'Cooldown', value: `-${Math.round(cooldown)}%`, positive: true })
  if (enemySpeed > 0)
    combatEntries.push({
      label: 'Feindspeed',
      value: `-${Math.round(enemySpeed)}%`,
      positive: true,
    })
  if (hpDrain > 0)
    combatEntries.push({ label: 'HP/s-Drain', value: `+${hpDrain.toFixed(1)}%`, positive: true })

  const specialEntries: SummaryGroup['entries'] = []
  for (const [line, count] of specialLineCounts) {
    specialEntries.push({ label: count > 1 ? `${count}×` : '', value: line, positive: true })
  }

  const groups: SummaryGroup[] = []
  if (chimeEntries.length) groups.push({ label: 'Chimes', entries: chimeEntries })
  if (resourceEntries.length) groups.push({ label: 'Ressourcen', entries: resourceEntries })
  if (combatEntries.length) groups.push({ label: 'Kampf', entries: combatEntries })
  if (specialEntries.length) groups.push({ label: 'Spezial', entries: specialEntries })
  return groups
})

// Icons nach Kategorie gruppiert
interface IconGroup {
  key: GroupKey
  slots: AugmentSlot[]
}

const iconGroups = computed<IconGroup[]>(() => {
  const map = new Map<GroupKey, AugmentSlot[]>([
    ['Chimes', []],
    ['Ressourcen', []],
    ['Kampf', []],
    ['Spezial', []],
  ])
  for (const slot of activeAugmentSlots.value) {
    map.get(getGroupKey(slot))!.push(slot)
  }
  const order: GroupKey[] = ['Chimes', 'Ressourcen', 'Kampf', 'Spezial']
  return order.filter((k) => map.get(k)!.length > 0).map((k) => ({ key: k, slots: map.get(k)! }))
})
</script>

<template>
  <div v-if="activeAugmentSlots.length > 0" class="aug-panel">
    <button
      class="aug-toggle-btn"
      @click="isExpanded = !isExpanded"
      :aria-label="isExpanded ? 'Collapse augments' : 'Expand augments'"
    >
      <svg
        class="aug-chevron"
        :class="{ 'is-expanded': isExpanded }"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline
          points="2,4 7,10 12,4"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div v-show="isExpanded" class="aug-body">
      <div class="aug-gold-topbar"></div>

      <!-- ── Summary (unverändert) ── -->
      <div class="aug-buff-summary">
        <div v-for="group in summaryGroups" :key="group.label" class="aug-summary-group">
          <span class="aug-summary-group-label">{{ group.label }}</span>
          <div class="aug-summary-entries">
            <div v-for="(entry, i) in group.entries" :key="i" class="aug-summary-entry">
              <span class="aug-entry-label">{{ entry.label }}</span>
              <span
                class="aug-entry-value"
                :class="entry.positive ? 'is-positive' : 'is-negative'"
                >{{ entry.value }}</span
              >
            </div>
          </div>
        </div>
        <div class="aug-divider"></div>
      </div>

      <!-- ── Icons gruppiert ── -->
      <div class="aug-icon-section">
        <div v-for="(group, gi) in iconGroups" :key="group.key" class="aug-icon-group">
          <div class="aug-icon-group-label">{{ group.key }}</div>
          <TransitionGroup name="aug-card" tag="div" class="aug-icon-grid">
            <div
              v-for="slot in group.slots"
              :key="slot.key"
              class="aug-icon-slot"
              :style="{ borderColor: AUGMENT_RARITY_COLOR[slot.aug.rarity] }"
              @mouseenter="hoveredKey = slot.key"
              @mouseleave="hoveredKey = null"
            >
              <img
                v-if="slot.aug.image"
                :src="slot.aug.image"
                class="aug-icon-img"
                :alt="slot.aug.name"
              />
              <span v-else class="aug-icon-emoji">{{ slot.aug.icon }}</span>

              <div v-if="hoveredKey === slot.key" class="aug-tooltip">
                <div
                  class="aug-tooltip-name"
                  :style="{ color: AUGMENT_RARITY_COLOR[slot.aug.rarity] }"
                >
                  {{ slot.aug.name }}
                </div>
                <div class="aug-tooltip-effect">{{ slot.aug.effectLine }}</div>
              </div>
            </div>
          </TransitionGroup>
          <!-- Trennlinie zwischen Gruppen, außer nach der letzten -->
          <div v-if="gi < iconGroups.length - 1" class="aug-icon-group-sep"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aug-panel {
  position: fixed;
  left: 0.75rem;
  top: 0.45rem;
  z-index: 60;
  width: 260px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.aug-toggle-btn {
  padding: 4px 7px;
  line-height: 0;
  background: rgba(10, 7, 2, 0.9);
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(200, 160, 80, 0.75);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}
.aug-toggle-btn:hover {
  border-color: #c89040;
  color: #e8c040;
}

.aug-chevron {
  display: block;
  transition: transform 0.2s ease;
}
.aug-chevron.is-expanded {
  transform: rotate(180deg);
}

.aug-body {
  width: 100%;
  border: 2px solid #5c3310;
  background: #111008;
  border-radius: 4px;
}

.aug-gold-topbar {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c040, #d4a020, #c89040, #5c3310);
}

/* ── Summary ─────────────────────────────── */
.aug-buff-summary {
  padding: 6px 10px 0;
}

.aug-summary-group {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 0;
}

.aug-summary-group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #5c3310;
  min-width: 60px;
  flex-shrink: 0;
}

.aug-summary-entries {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.aug-summary-entry {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-size: 11px;
}

.aug-entry-label {
  color: #8a7050;
}

.aug-entry-value {
  font-weight: 700;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.aug-entry-value.is-positive {
  color: #7ecf5a;
}

.aug-entry-value.is-negative {
  color: #e05050;
}

.aug-divider {
  height: 2px;
  margin: 6px 0 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c040, #d4a020, #c89040, #5c3310);
}

/* ── Icon-Bereich ────────────────────────── */
.aug-icon-section {
  padding: 6px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.aug-icon-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.aug-icon-group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #5c3310;
  padding: 4px 2px 0;
}

.aug-icon-group-sep {
  height: 1px;
  background: #2a2010;
  margin: 6px 2px;
}

.aug-icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.aug-icon-slot {
  position: relative;
  height: 56px;
  border-radius: 4px;
  border: 2px solid #5c3310;
  background: #141410;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.aug-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 2px;
}

.aug-icon-emoji {
  font-size: 30px;
  line-height: 1;
}

.aug-tooltip {
  position: absolute;
  left: calc(100% + 6px);
  top: 0;
  z-index: 70;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  padding: 8px 10px;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  pointer-events: none;
}

.aug-tooltip-name {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}

.aug-tooltip-effect {
  color: #b0a080;
  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
}

/* ── Transitions ─────────────────────────── */
.aug-card-enter-active,
.aug-card-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.aug-card-enter-from,
.aug-card-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
.aug-card-move {
  transition: transform 0.25s ease;
}
</style>
