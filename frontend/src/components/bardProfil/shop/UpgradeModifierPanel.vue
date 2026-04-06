<template>
  <div class="mod-overlay" @click.self="$emit('close')">
    <div class="mod-modal">
      <!-- Gold top bar -->
      <div class="mod-topbar" />

      <!-- Header -->
      <div class="mod-header">
        <span class="mod-header-icon">{{ upgrade.icon }}</span>
        <div class="mod-header-text">
          <div class="mod-title">Resonanz-Modul</div>
          <div class="mod-subtitle">{{ upgrade.name }}</div>
        </div>
        <button class="mod-close" @click="$emit('close')">✕</button>
      </div>

      <!-- Current modifier -->
      <div class="mod-current">
        <div class="mod-current-label">Aktives Modul</div>
        <div v-if="upgrade.appliedModifier" class="mod-current-badge">
          <span class="mod-current-icon">{{ upgrade.appliedModifier.icon }}</span>
          <div>
            <div class="mod-current-name">{{ upgrade.appliedModifier.name }}</div>
            <div class="mod-current-desc">{{ upgrade.appliedModifier.description }}</div>
          </div>
        </div>
        <div v-else class="mod-current-empty">Kein Modul aktiv</div>
      </div>

      <!-- Cost -->
      <div class="mod-cost-row">
        <img src="/img/BardAbilities/BardChime.png" class="mod-coin" />
        <span class="mod-cost-value" :class="canAfford ? 'cost-green' : 'cost-red'">
          {{ formatNumber(upgrade.modifierCost ?? 0) }}
        </span>
        <span class="mod-cost-label">zum Anwenden</span>
        <span v-if="upgrade.appliedModifier" class="mod-replace-note">· ersetzt aktuelles</span>
      </div>

      <!-- Option cards -->
      <div class="mod-options">
        <button
          v-for="option in rolledOptions"
          :key="option.id"
          class="mod-option"
          :class="{
            'mod-option--selected': selectedOption?.id === option.id,
            'mod-option--disabled': !canAfford,
          }"
          @click="selectOption(option)"
        >
          <div class="mod-opt-icon">{{ option.icon }}</div>
          <div class="mod-opt-body">
            <div class="mod-opt-name">{{ option.name }}</div>
            <div class="mod-opt-desc">{{ option.description }}</div>
            <div class="mod-opt-preview">{{ previewEffect(option) }}</div>
          </div>
        </button>
      </div>

      <!-- Apply button -->
      <button
        class="mod-apply-btn"
        :class="selectedOption && canAfford ? 'mod-apply-btn--active' : 'mod-apply-btn--disabled'"
        :disabled="!selectedOption || !canAfford"
        @click="applySelected"
      >
        {{ selectedOption ? 'Anwenden' : 'Modul wählen' }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import type { PropType } from 'vue'
import type { PermanentUpgrade, UpgradeModifier } from '../../../types'
import { useShopStore } from '../../../stores/shopStore'
import { useGameStore } from '../../../stores/gameStore'
import { formatNumber } from '../../../config/numberFormat'

export default defineComponent({
  name: 'UpgradeModifierPanel',
  props: {
    upgrade: {
      type: Object as PropType<PermanentUpgrade>,
      required: true,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const shopStore = useShopStore()
    const gameStore = useGameStore()

    const rolledOptions = ref<UpgradeModifier[]>([])
    const selectedOption = ref<UpgradeModifier | null>(null)

    const canAfford = computed(() => gameStore.chimes >= (props.upgrade.modifierCost ?? 0))

    onMounted(() => {
      rolledOptions.value = shopStore.rollModifierOptions(props.upgrade.id)
    })

    const selectOption = (option: UpgradeModifier) => {
      if (!canAfford.value) return
      selectedOption.value = option
    }

    const applySelected = () => {
      if (!selectedOption.value) return
      const success = shopStore.applyModifier(props.upgrade.id, selectedOption.value)
      if (success) emit('close')
    }

    const previewEffect = (option: UpgradeModifier): string => {
      const base = props.upgrade.effect.value
      const type = props.upgrade.effect.type

      let modifiedValue: number
      switch (option.type) {
        case 'resonanceBoost':
          modifiedValue = base * (option.params.boostFactor as number)
          break
        case 'synergyLink': {
          const linkedId = option.params.linkedUpgradeId as string
          const linked = shopStore.permanentUpgrades.find((u) => u.id === linkedId)?.purchased
          modifiedValue = linked ? base * 2 : base
          break
        }
        case 'cascadeEffect':
          modifiedValue = base * (1 + (option.params.cascadeBonus as number))
          break
        case 'adaptiveScaling': {
          const maxLevel = Math.max(...shopStore.shopUpgrades.map((u) => u.level), 1)
          modifiedValue = base * (1 + maxLevel * (option.params.scaleFactor as number))
          break
        }
        case 'chimeEcho':
          return `+${formatNumber((option.params.burstAmount as number) * (option.params.chance as number))} CPS (erwartet)`
        case 'timeCrystal':
          return `+${formatNumber(option.params.crystalCPSBonus as number)} CPS`
        default:
          modifiedValue = base
      }

      const label = type === 'cpsMultiplier' ? 'CPS' : type === 'cpcMultiplier' ? 'CPC' : 'Gebäude'
      const pct = (v: number) => `×${v.toFixed(2)}`
      return `${label}: ${pct(base)} → ${pct(modifiedValue)}`
    }

    return {
      rolledOptions,
      selectedOption,
      canAfford,
      selectOption,
      applySelected,
      previewEffect,
      formatNumber,
    }
  },
})
</script>

<style scoped>
.mod-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mod-modal {
  width: 340px;
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310, 0 12px 40px rgba(0, 0, 0, 0.9);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mod-topbar {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  flex-shrink: 0;
}

.mod-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #1e1006;
  border-bottom: 2px solid #3e2008;
  flex-shrink: 0;
}

.mod-header-icon {
  font-size: 26px;
  line-height: 1;
}

.mod-header-text {
  flex: 1;
}

.mod-title {
  font-size: 13px;
  font-weight: 900;
  color: #e8c040;
  text-shadow: 0 0 6px rgba(230, 190, 40, 0.4);
}

.mod-subtitle {
  font-size: 10px;
  color: #8a7050;
  margin-top: 1px;
}

.mod-close {
  background: none;
  border: none;
  color: #5c3310;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  transition: color 0.15s;
}

.mod-close:hover {
  color: #e04040;
}

.mod-current {
  padding: 8px 12px;
  border-bottom: 1px solid #1e1a10;
  flex-shrink: 0;
}

.mod-current-label {
  font-size: 9px;
  font-weight: 700;
  color: #5c4020;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 5px;
}

.mod-current-badge {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  background: #1a1810;
  border: 1px solid #52b830;
  border-radius: 4px;
}

.mod-current-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.mod-current-name {
  font-size: 11px;
  font-weight: 700;
  color: #80d050;
}

.mod-current-desc {
  font-size: 10px;
  color: #556644;
  margin-top: 2px;
  line-height: 1.4;
}

.mod-current-empty {
  font-size: 10px;
  color: #3a3020;
  padding: 4px 0;
  font-style: italic;
}

.mod-cost-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #0e0c06;
  border-bottom: 1px solid #1e1a10;
  font-size: 11px;
  flex-shrink: 0;
}

.mod-coin {
  width: 12px;
  height: 12px;
}

.mod-cost-value {
  font-weight: 900;
  font-size: 13px;
}

.cost-green {
  color: #52b830;
}

.cost-red {
  color: #cc6050;
}

.mod-cost-label {
  color: #5a4830;
}

.mod-replace-note {
  color: #5a4020;
  font-size: 10px;
}

.mod-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.mod-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  background: #1a1810;
  border: 1px solid #2a2218;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.mod-option:hover:not(.mod-option--disabled) {
  border-color: #5c3310;
  background: #201c10;
}

.mod-option--selected {
  border-color: #c89040;
  background: #221c08;
  box-shadow: 0 0 8px rgba(200, 144, 64, 0.25);
}

.mod-option--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mod-opt-icon {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 1px;
}

.mod-opt-body {
  flex: 1;
}

.mod-opt-name {
  font-size: 11px;
  font-weight: 900;
  color: #e8c040;
  margin-bottom: 2px;
}

.mod-opt-desc {
  font-size: 9px;
  color: #7a6840;
  line-height: 1.4;
  margin-bottom: 4px;
}

.mod-opt-preview {
  font-size: 10px;
  font-weight: 700;
  color: #52b830;
  padding: 2px 6px;
  background: rgba(80, 180, 40, 0.08);
  border: 1px solid rgba(80, 180, 40, 0.2);
  border-radius: 3px;
  display: inline-block;
}

.mod-apply-btn {
  margin: 0 12px 12px;
  padding: 9px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.1s;
  flex-shrink: 0;
}

.mod-apply-btn--active {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.mod-apply-btn--active:hover {
  background: linear-gradient(to bottom, #60d038, #388e22);
}

.mod-apply-btn--disabled {
  background: #1e1c14;
  border: 1px solid #2a2618;
  color: #3a3220;
  cursor: not-allowed;
}
</style>
