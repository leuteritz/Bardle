<template>
  <div class="perm-panel">
    <!-- ── Available upgrades ── -->
    <template v-if="availableUpgrades.length > 0">
      <button
        class="buy-all-btn"
        :class="hasAffordableUpgrade ? 'buy-all-btn--active' : 'buy-all-btn--disabled'"
        :disabled="!hasAffordableUpgrade"
        @click="buyAllAffordable"
      >
        Buy All
      </button>

      <div class="perm-grid">
        <button
          v-for="pUpgrade in availableUpgrades"
          :key="pUpgrade.id"
          class="perm-btn"
          :class="
            shopStore.canAffordPermanentUpgrade(pUpgrade.id)
              ? 'perm-btn--affordable'
              : 'perm-btn--locked'
          "
          @click="shopStore.buyPermanentUpgrade(pUpgrade.id)"
          @mouseenter="showTooltip($event, pUpgrade)"
          @mouseleave="hideTooltip"
        >
          <span class="perm-icon">{{ pUpgrade.icon }}</span>
          <div class="perm-cost">
            <img src="/img/BardAbilities/BardChime.png" class="coin-icon-sm" />
            <span>{{ formatNumber(pUpgrade.cost) }}</span>
          </div>
        </button>
      </div>
    </template>

    <!-- ── Purchased upgrades with modifier slots ── -->
    <template v-if="purchasedUpgrades.length > 0">
      <div class="section-divider" />
      <div class="purchased-list">
        <div
          v-for="pUpgrade in purchasedUpgrades"
          :key="pUpgrade.id"
          class="purchased-row"
          @mouseenter="showTooltip($event, pUpgrade)"
          @mouseleave="hideTooltip"
        >
          <span class="perm-icon purchased-icon">{{ pUpgrade.icon }}</span>
          <button
            v-if="pUpgrade.appliedModifier"
            class="mod-badge mod-badge--active"
            @click="openModifierPanel(pUpgrade)"
          >
            {{ pUpgrade.appliedModifier.icon }}
          </button>
          <button
            v-else-if="pUpgrade.modifierSlotUnlocked"
            class="mod-badge mod-badge--empty"
            @click="openModifierPanel(pUpgrade)"
          >
            ✦
          </button>
        </div>
      </div>
    </template>
  </div>

  <!-- ── Tooltip ── -->
  <Teleport to="body">
    <div v-if="hoveredUpgrade" class="upgrade-tooltip" :style="tooltipStyle">
      <h4 class="tooltip-title">{{ hoveredUpgrade.name }}</h4>
      <p class="tooltip-desc">{{ hoveredUpgrade.description }}</p>
      <div v-if="!hoveredUpgrade.purchased" class="tooltip-cost">
        <img src="/img/BardAbilities/BardChime.png" class="coin-icon-sm" />
        <span
          :class="
            shopStore.canAffordPermanentUpgrade(hoveredUpgrade.id) ? 'text-green' : 'text-red'
          "
        >
          {{ formatNumber(hoveredUpgrade.cost) }}
        </span>
      </div>
      <div
        v-if="
          hoveredUpgrade.requirement &&
          !shopStore.isPermanentUpgradeRequirementMet(hoveredUpgrade.id)
        "
        class="tooltip-req"
      >
        🔒 {{ hoveredUpgrade.requirement.minLevel }}×
        {{ getBuildingName(hoveredUpgrade.requirement.buildingId) }} benötigt
      </div>
      <div v-if="hoveredUpgrade.purchased && hoveredUpgrade.appliedModifier" class="tooltip-mod">
        {{ hoveredUpgrade.appliedModifier.icon }} {{ hoveredUpgrade.appliedModifier.name }}
      </div>
    </div>

    <!-- ── Modifier panel modal ── -->
    <UpgradeModifierPanel
      v-if="modifierPanelUpgrade"
      :upgrade="modifierPanelUpgrade"
      @close="modifierPanelUpgrade = null"
    />
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useShopStore } from '../../../stores/shopStore'
import { formatNumber } from '../../../config/numberFormat'
import type { PermanentUpgrade } from '../../../types'
import UpgradeModifierPanel from './UpgradeModifierPanel.vue'

export default defineComponent({
  name: 'UpgradesComponent',
  components: { UpgradeModifierPanel },
  setup() {
    const shopStore = useShopStore()

    const availableUpgrades = computed(() =>
      shopStore.permanentUpgrades.filter((u) => !u.purchased).sort((a, b) => a.cost - b.cost),
    )

    const purchasedUpgrades = computed(() =>
      shopStore.permanentUpgrades.filter((u) => u.purchased),
    )

    const hasAffordableUpgrade = computed(() =>
      availableUpgrades.value.some((u) => shopStore.canAffordPermanentUpgrade(u.id)),
    )

    const buyAllAffordable = () => {
      for (const u of availableUpgrades.value) {
        if (shopStore.canAffordPermanentUpgrade(u.id)) {
          shopStore.buyPermanentUpgrade(u.id)
        }
      }
    }

    const getBuildingName = (buildingId: string): string => {
      const building = shopStore.shopUpgrades.find((u) => u.id === buildingId)
      return building?.name ?? buildingId
    }

    const hoveredUpgrade = ref<PermanentUpgrade | null>(null)
    const tooltipStyle = ref<Record<string, string>>({})
    const modifierPanelUpgrade = ref<PermanentUpgrade | null>(null)

    const showTooltip = (event: MouseEvent, upgrade: PermanentUpgrade) => {
      hoveredUpgrade.value = upgrade
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      const tooltipWidth = 220

      let left = rect.left + rect.width / 2 - tooltipWidth / 2
      if (left < 8) left = 8
      if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8

      tooltipStyle.value = {
        top: `${rect.bottom + 8}px`,
        left: `${left}px`,
      }
    }

    const hideTooltip = () => {
      hoveredUpgrade.value = null
    }

    const openModifierPanel = (upgrade: PermanentUpgrade) => {
      modifierPanelUpgrade.value = upgrade
    }

    return {
      shopStore,
      formatNumber,
      availableUpgrades,
      purchasedUpgrades,
      hasAffordableUpgrade,
      buyAllAffordable,
      getBuildingName,
      hoveredUpgrade,
      tooltipStyle,
      showTooltip,
      hideTooltip,
      modifierPanelUpgrade,
      openModifierPanel,
    }
  },
})
</script>

<style scoped>
.perm-panel {
  width: 118px;
  flex-shrink: 0;
  border-left: 2px solid #2a2a2a;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 6px;
  background: #141410;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.section-divider {
  height: 1px;
  background: #2a2a26;
  margin: 2px 0;
}

.purchased-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.purchased-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 2px;
  border-radius: 4px;
  background: #1a1a16;
  border: 1px solid #2a2a22;
  cursor: default;
}

.purchased-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.mod-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  margin-left: auto;
}

.mod-badge--active {
  background: #1e2a10;
  border: 1px solid #52b830;
  box-shadow: 0 0 6px rgba(80, 180, 40, 0.25);
}

.mod-badge--active:hover {
  box-shadow: 0 0 10px rgba(80, 180, 40, 0.5);
  transform: scale(1.1);
}

.mod-badge--empty {
  background: #1c1810;
  border: 1px solid #5c3310;
  color: #c89040;
  font-size: 10px;
  animation: slot-pulse 2.5s ease-in-out infinite;
}

@keyframes slot-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(200, 144, 64, 0.2); }
  50% { box-shadow: 0 0 10px rgba(200, 144, 64, 0.5); }
}

.mod-badge--empty:hover {
  background: #241e10;
  transform: scale(1.1);
}

.tooltip-mod {
  margin-top: 5px;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: bold;
  background: rgba(80, 180, 40, 0.1);
  border: 1px solid rgba(80, 180, 40, 0.3);
  color: #80d050;
  border-radius: 3px;
}

.buy-all-btn {
  width: 100%;
  padding: 7px 4px;
  font-size: 11px;
  font-weight: 900;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  transition: all 0.1s;
}

.buy-all-btn--active {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #70d040;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.buy-all-btn--active:hover {
  background: linear-gradient(to bottom, #60d038, #388e22);
}

.buy-all-btn--disabled {
  background: #2a2a26;
  border: 1px solid #444;
  color: #555;
  cursor: not-allowed;
}

.perm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.perm-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 3px;
  border-radius: 4px;
  cursor: pointer;
  background: #1c1c18;
  gap: 3px;
  transition: all 0.15s;
}

.perm-btn--affordable {
  border: 1px solid #52b830;
  background: #182414;
  box-shadow:
    0 0 8px rgba(80, 180, 40, 0.3),
    inset 0 0 4px rgba(80, 180, 40, 0.1);
  animation: perm-pulse 2s ease-in-out infinite;
}

@keyframes perm-pulse {
  0%,
  100% {
    box-shadow:
      0 0 6px rgba(80, 180, 40, 0.25),
      inset 0 0 4px rgba(80, 180, 40, 0.08);
  }
  50% {
    box-shadow:
      0 0 14px rgba(80, 180, 40, 0.55),
      inset 0 0 6px rgba(80, 180, 40, 0.18);
  }
}

.perm-btn--locked {
  border: 1px solid #333;
  opacity: 0.45;
  filter: grayscale(50%);
  cursor: not-allowed;
}

.perm-btn--affordable:hover {
  transform: scale(1.06);
}

.perm-icon {
  font-size: 24px;
  line-height: 1;
}

.perm-cost {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  font-weight: 700;
  color: #999;
}

.coin-icon-sm {
  width: 9px;
  height: 9px;
}

/* ── Tooltip ── */
.upgrade-tooltip {
  position: fixed;
  z-index: 9999;
  width: 220px;
  padding: 10px 12px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 5px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.85),
    inset 0 0 0 1px #2a1a08;
  pointer-events: none;
}

.tooltip-title {
  font-size: 13px;
  font-weight: 900;
  color: #e8c040;
  margin: 0 0 5px 0;
  text-shadow: 0 0 6px rgba(230, 190, 40, 0.4);
}

.tooltip-desc {
  font-size: 11px;
  color: #999;
  margin: 0 0 6px 0;
  line-height: 1.45;
}

.tooltip-cost {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: bold;
}

.text-green {
  color: #52b830;
}
.text-red {
  color: #e04040;
}

.tooltip-req {
  margin-top: 6px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: bold;
  background: rgba(200, 130, 0, 0.12);
  border: 1px solid rgba(200, 130, 0, 0.3);
  color: #c89040;
  border-radius: 3px;
}
</style>
