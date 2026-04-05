<template>
  <div class="shop-frame">
    <!-- ── Kaufmengen-Selector ── -->
    <div class="selector-bar">
      <button
        v-for="option in buyOptions"
        :key="option.value"
        @click="shopStore.setBuyAmount(option.value)"
        class="selector-btn"
        :class="{ 'selector-btn--active': shopStore.buyAmount === option.value }"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="shop-body">
      <!-- ── Linke Spalte: Shop-Upgrades ── -->
      <div class="upgrade-list">
        <div
          v-for="upgrade in shopStore.shopUpgrades"
          :key="upgrade.id"
          @click="handleUpgradeClick(upgrade)"
          @mouseenter="hoveredUpgradeId = upgrade.id"
          @mouseleave="hoveredUpgradeId = null"
          class="upgrade-row"
          :class="{
            'upgrade-row--affordable': shopStore.canAffordUpgrade(upgrade),
            'upgrade-row--locked': !shopStore.canAffordUpgrade(upgrade),
          }"
        >
          <!-- Icon -->
          <div class="upgrade-icon-box">
            <img
              v-if="isImageUrl(upgrade.icon)"
              :src="upgrade.icon"
              :alt="upgrade.name"
              class="upgrade-icon-img"
            />
            <span v-else class="upgrade-icon-emoji">{{ upgrade.icon }}</span>
          </div>

          <!-- Info -->
          <div class="upgrade-info">
            <div class="upgrade-level-row">
              <span class="upgrade-level">Lv. {{ upgrade.level }}</span>
              <span class="upgrade-name">{{ upgrade.name }}</span>
            </div>
            <div
              class="upgrade-stat"
              v-if="
                upgrade.baseCPS &&
                (upgrade.level > 0 ||
                  (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0))
              "
            >
              <img src="/img/BardAbilities/BardChime.png" class="stat-icon" />
              +{{
                formatNumber(
                  upgrade.baseCPS *
                    (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0
                      ? upgrade.level + shopStore.getActualBuyAmount(upgrade)
                      : upgrade.level),
                )
              }}
              CpS
            </div>
            <div
              class="upgrade-stat upgrade-stat--cpc"
              v-if="
                upgrade.baseCPC &&
                (upgrade.level > 0 ||
                  (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0))
              "
            >
              ✦
              {{
                formatNumber(
                  upgrade.baseCPC *
                    (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0
                      ? upgrade.level + shopStore.getActualBuyAmount(upgrade)
                      : upgrade.level),
                )
              }}
              /klick
            </div>
          </div>

          <!-- Kauf-Button -->
          <button
            class="upgrade-buy-btn"
            :class="
              shopStore.canAffordUpgrade(upgrade)
                ? 'upgrade-buy-btn--green'
                : 'upgrade-buy-btn--disabled'
            "
            :style="!shopStore.canAffordUpgrade(upgrade) ? { '--progress': getProgress(upgrade) + '%' } : {}"
            :disabled="!shopStore.canAffordUpgrade(upgrade)"
            role="progressbar"
            :aria-valuenow="Math.floor(getProgress(upgrade))"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span class="buy-label">
              Buy
              {{
                shopStore.buyAmount === 'max'
                  ? shopStore.getMaxAffordableAmount(upgrade)
                  : shopStore.getActualBuyAmount(upgrade)
              }}
            </span>
            <span class="buy-cost">
              {{ formatNumber(shopStore.getTotalUpgradeCost(upgrade)) }}
              <img src="/img/BardAbilities/BardChime.png" class="coin-icon" />
            </span>
          </button>
        </div>
      </div>

      <!-- ── Rechte Spalte: Permanente Upgrades ── -->
      <div v-if="availableUpgrades.length > 0" class="perm-panel">
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
      </div>
    </div>

    <!-- ── Tooltip ── -->
    <Teleport to="body">
      <div v-if="hoveredUpgrade" class="upgrade-tooltip" :style="tooltipStyle">
        <h4 class="tooltip-title">{{ hoveredUpgrade.name }}</h4>
        <p class="tooltip-desc">{{ hoveredUpgrade.description }}</p>
        <div class="tooltip-cost">
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
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useShopStore } from '../../../stores/shopStore'
import { useGameStore } from '../../../stores/gameStore'
import { formatNumber } from '../../../config/numberFormat'
import type { ShopUpgrade, PermanentUpgrade } from '../../../types'

interface BuyOption {
  value: number | 'max'
  label: string
}

export default defineComponent({
  name: 'ShopComponent',
  setup() {
    const shopStore = useShopStore()
    const gameStore = useGameStore()

    const getProgress = (upgrade: ShopUpgrade): number => {
      const cost = shopStore.getTotalUpgradeCost(upgrade)
      if (!cost || cost <= 0) return 100
      return Math.min(100, (gameStore.chimes / cost) * 100)
    }

    const buyOptions: BuyOption[] = [
      { value: 1, label: '1x' },
      { value: 5, label: '5x' },
      { value: 10, label: '10x' },
      { value: 50, label: '50x' },
      { value: 100, label: '100x' },
      { value: 'max', label: 'Max' },
    ]

    const handleUpgradeClick = (upgrade: ShopUpgrade) => {
      shopStore.buyUpgrade(upgrade.id)
    }

    const isImageUrl = (icon: string): boolean => {
      return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(icon)
    }

    const getBuildingName = (buildingId: string): string => {
      const building = shopStore.shopUpgrades.find((u) => u.id === buildingId)
      return building?.name ?? buildingId
    }

    const availableUpgrades = computed(() =>
      shopStore.permanentUpgrades.filter((u) => !u.purchased).sort((a, b) => a.cost - b.cost),
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

    const hoveredUpgradeId = ref<string | null>(null)
    const hoveredUpgrade = ref<PermanentUpgrade | null>(null)
    const tooltipStyle = ref<Record<string, string>>({})

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

    return {
      shopStore,
      getProgress,
      handleUpgradeClick,
      isImageUrl,
      formatNumber,
      buyOptions,
      getBuildingName,
      availableUpgrades,
      hasAffordableUpgrade,
      buyAllAffordable,
      hoveredUpgradeId,
      hoveredUpgrade,
      tooltipStyle,
      showTooltip,
      hideTooltip,
    }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   SHOP FRAME – Holz-Rahmen wie im Screenshot
   ═══════════════════════════════════════════ */
.shop-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 4px 20px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

/* ═══════════════════════════════════════════
   KAUFMENGEN-SELECTOR
   ═══════════════════════════════════════════ */
.selector-bar {
  display: flex;
  gap: 3px;
  padding: 6px 10px;
  background: #1e1006;
  border-bottom: 2px solid #5c3310;
  justify-content: center;
  flex-shrink: 0;
}

.selector-btn {
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 900;
  color: #888;
  background: #1a1008;
  border: 1px solid #444;
  border-radius: 3px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.1s;
}

.selector-btn:hover {
  color: #eee;
  background: #2a1a0a;
  border-color: #666;
}

.selector-btn--active {
  background: linear-gradient(to bottom, #4a8a28, #2d6018);
  border-color: #6ec040;
  color: #fff;
  box-shadow: 0 0 6px rgba(100, 200, 50, 0.4);
}

/* ═══════════════════════════════════════════
   SHOP BODY LAYOUT
   ═══════════════════════════════════════════ */
.shop-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ═══════════════════════════════════════════
   UPGRADE LIST
   ═══════════════════════════════════════════ */
.upgrade-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.upgrade-list::-webkit-scrollbar {
  width: 6px;
}
.upgrade-list::-webkit-scrollbar-track {
  background: #111;
}
.upgrade-list::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 3px;
}

/* ── Einzelne Zeile ── */
.upgrade-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #2a2a2a;
  cursor: pointer;
  min-height: 76px;
  transition: background 0.1s;
}

.upgrade-row:hover.upgrade-row--affordable {
  background: #252520;
}

.upgrade-row--affordable {
  background: #1c1c18;
}

.upgrade-row--locked {
  background: #141410;
  cursor: not-allowed;
}

/* ── Icon-Box ── */
.upgrade-icon-box {
  width: 68px;
  min-width: 68px;
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border-right: 1px solid #2a2a2a;
  flex-shrink: 0;
}

.upgrade-icon-img {
  width: 52px;
  height: 52px;
  object-fit: contain;
  image-rendering: crisp-edges;
}

.upgrade-icon-emoji {
  font-size: 34px;
}

/* ── Text-Info ── */
.upgrade-info {
  flex: 1;
  padding: 8px 10px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.upgrade-level-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: nowrap;
}

.upgrade-level {
  font-size: 20px;
  font-weight: 900;
  color: #ffffff;
  white-space: nowrap;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.upgrade-name {
  font-size: 12px;
  font-weight: 700;
  color: #b0b0a0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upgrade-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: bold;
  color: #e8c040;
  text-shadow: 0 0 6px rgba(230, 180, 40, 0.4);
}

.upgrade-stat--cpc {
  color: #e09030;
}

.stat-icon {
  width: 13px;
  height: 13px;
}

/* ── Kauf-Button ── */
.upgrade-buy-btn {
  flex-shrink: 0;
  width: 108px;
  min-height: 58px;
  margin: 8px 8px 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 5px;
  cursor: pointer;
  padding: 6px 4px;
  overflow: hidden;
  position: relative;
  transition: background-size 0.45s ease, box-shadow 0.15s ease;
}

/* Grün = kaufbar – solider Farbverlauf, keine Progress-Logik nötig */
.upgrade-buy-btn--green {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #70d040;
  color: #fff;
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.upgrade-buy-btn--green:hover {
  background: linear-gradient(to bottom, #60d038, #388e22);
  box-shadow:
    0 0 10px rgba(80, 200, 40, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.upgrade-buy-btn--green:active {
  transform: scale(0.96);
  background: linear-gradient(to bottom, #2e7a1a, #1a4e0a);
}

/* Rot = nicht kaufbar – Progress-Balken wächst von links (helleres Rot) */
.upgrade-buy-btn--disabled {
  /* Dunkles Rot als Basis-Hintergrund */
  background-color: #220808;
  /* Hellerer Rot-Verlauf als Progress-Füllung von links */
  background-image: linear-gradient(
    to right,
    #7a1610 0%,
    #b02018 70%,
    #cc2820 100%
  );
  background-size: var(--progress, 0%) 100%;
  background-repeat: no-repeat;
  background-position: left center;
  border: 1px solid #5a1010;
  color: #cc8880;
  cursor: not-allowed;
}

.buy-label {
  font-size: 15px;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 0.3px;
}

.buy-cost {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1;
}

.coin-icon {
  width: 13px;
  height: 13px;
}

/* ═══════════════════════════════════════════
   PERMANENTE UPGRADES PANEL
   ═══════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════
   TOOLTIP
   ═══════════════════════════════════════════ */
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
