<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { useAugmentStore } from '@/stores/augmentStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { Icon } from '@iconify/vue'

const gameStore = useGameStore()
const augmentStore = useAugmentStore()
const synergyStore = useSynergyStore()

const { activeModifier, abilityCPSMultiplier, abilityCPCMultiplier, abilityPowerBonus } =
  storeToRefs(gameStore)
const { temporaryCPSMultiplier } = storeToRefs(augmentStore)
const { cpsSynergyMultiplier, powerSynergyMultiplier, dpsSynergyMultiplier } =
  storeToRefs(synergyStore)

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

const hasActiveBuffs = computed(
  () =>
    buffCPSPct.value > 0 ||
    buffCPCPct.value > 0 ||
    buffPowerSynergyPct.value > 0 ||
    buffPowerFlat.value > 0 ||
    buffMeepPct.value > 0 ||
    buffDPSPct.value > 0 ||
    buffCDRPct.value > 0 ||
    buffExpPct.value > 0 ||
    buffCostPct.value > 0 ||
    buffEnemyPct.value > 0,
)
</script>

<template>
  <div class="abp-panel">
    <div class="abp-header">Active Buffs</div>

    <div v-if="!hasActiveBuffs" class="abp-empty">No active buffs yet</div>

    <div v-if="buffCPSPct > 0" class="abp-row">
      <Icon icon="game-icons:lyre" class="abp-icon" />
      <span class="abp-lbl">Production</span>
      <span class="abp-val">+{{ buffCPSPct }}%</span>
    </div>

    <div v-if="buffCPCPct > 0" class="abp-row">
      <Icon icon="game-icons:hand" class="abp-icon" />
      <span class="abp-lbl">Click</span>
      <span class="abp-val">+{{ buffCPCPct }}%</span>
    </div>

    <div v-if="buffPowerSynergyPct > 0 || buffPowerFlat > 0" class="abp-row">
      <Icon icon="game-icons:magic-swirl" class="abp-icon" />
      <span class="abp-lbl">Power</span>
      <span class="abp-val">
        <template v-if="buffPowerSynergyPct > 0">+{{ buffPowerSynergyPct }}%</template>
        <template v-if="buffPowerSynergyPct > 0 && buffPowerFlat > 0"> &amp; </template>
        <template v-if="buffPowerFlat > 0">+{{ buffPowerFlat }}</template>
      </span>
    </div>

    <div v-if="buffMeepPct > 0" class="abp-row">
      <Icon icon="game-icons:crystal-ball" class="abp-icon" />
      <span class="abp-lbl">Meep Power</span>
      <span class="abp-val">+{{ buffMeepPct }}%</span>
    </div>

    <div v-if="buffDPSPct > 0" class="abp-row">
      <Icon icon="game-icons:crossed-swords" class="abp-icon" />
      <span class="abp-lbl">Combat DPS</span>
      <span class="abp-val">+{{ buffDPSPct }}%</span>
    </div>

    <div v-if="buffCDRPct > 0" class="abp-row">
      <Icon icon="game-icons:empty-hourglass" class="abp-icon" />
      <span class="abp-lbl">Cooldowns</span>
      <span class="abp-val abp-val--green">-{{ buffCDRPct }}%</span>
    </div>

    <div v-if="buffExpPct > 0" class="abp-row">
      <Icon icon="game-icons:treasure-map" class="abp-icon" />
      <span class="abp-lbl">Expeditions</span>
      <span class="abp-val">+{{ buffExpPct }}%</span>
    </div>

    <div v-if="buffCostPct > 0" class="abp-row">
      <Icon icon="game-icons:stone-wall" class="abp-icon" />
      <span class="abp-lbl">Build Cost</span>
      <span class="abp-val abp-val--green">-{{ buffCostPct }}%</span>
    </div>

    <div v-if="buffEnemyPct > 0" class="abp-row">
      <Icon icon="game-icons:turtle" class="abp-icon" />
      <span class="abp-lbl">Enemy Speed</span>
      <span class="abp-val abp-val--green">-{{ buffEnemyPct }}%</span>
    </div>
  </div>
</template>

<style scoped>
.abp-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.abp-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--rpg-wood-inner);
  margin-bottom: 2px;
}

.abp-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: var(--bp-radius);
  transition: background 0.15s;
}

.abp-row:hover {
  background: #1a1008;
}

.abp-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  color: #c89040;
}

.abp-lbl {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  flex: 1;
}

.abp-val {
  font-size: 16px;
  font-weight: 900;
  color: #e8c040;
}

.abp-val--green {
  color: #52b830;
}

.abp-empty {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  padding: 12px 0;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
