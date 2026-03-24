<template>
  <!-- Äußerer Wrapper: jetzt flex-row statt flex-col -->
  <div class="flex w-full min-h-full gap-4 p-4">
    <!-- ─── Linke Spalte: Kaufmengen + Gebäude ─── -->
    <div class="flex flex-col flex-1 min-w-0 gap-3">
      <!-- Kaufmengen-Selector (sticky links oben) -->
      <div class="sticky top-0 z-10 flex justify-center">
        <div
          class="inline-flex gap-0.5 p-0.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/[0.07]"
        >
          <button
            v-for="option in buyOptions"
            :key="option.value"
            @click="shopStore.setBuyAmount(option.value)"
            class="px-3 py-1 text-xl font-bold transition-all duration-200 rounded-md"
            :class="
              shopStore.buyAmount === option.value
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            "
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Shop Items -->
      <div class="flex flex-col gap-2">
        <div
          v-for="upgrade in shopStore.shopUpgrades"
          :key="upgrade.id"
          @click="handleUpgradeClick(upgrade)"
          @mouseenter="hoveredUpgradeId = upgrade.id"
          @mouseleave="hoveredUpgradeId = null"
          class="group rounded-2xl cursor-pointer transition-all duration-200 border backdrop-blur-md hover:scale-[1.01]"
          :class="
            shopStore.canAffordUpgrade(upgrade)
              ? 'bg-gradient-to-br from-emerald-900/30 via-green-900/20 to-teal-900/10 border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.12)]'
              : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 opacity-55 grayscale cursor-not-allowed'
          "
        >
          <div class="flex items-center gap-3 p-3">
            <!-- Icon -->
            <div
              class="relative flex items-center justify-center flex-shrink-0 w-12 h-12 transition-transform duration-200 group-hover:scale-110"
            >
              <div
                v-if="shopStore.canAffordUpgrade(upgrade)"
                class="absolute inset-0 rounded-xl blur-md opacity-50 bg-gradient-to-br from-emerald-400/40 to-teal-400/20"
              />
              <img
                v-if="isImageUrl(upgrade.icon)"
                :src="upgrade.icon"
                :alt="upgrade.name"
                class="relative z-10 object-contain w-full h-full drop-shadow-lg"
              />
              <span v-else class="relative z-10 text-2xl drop-shadow-lg">{{ upgrade.icon }}</span>
            </div>

            <!-- Text & Stats -->
            <div class="flex-1 min-w-0">
              <!-- Name + Level -->
              <div class="flex items-center justify-between gap-2 mb-1">
                <h3
                  class="text-base font-black leading-tight tracking-wide bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent truncate"
                >
                  {{ upgrade.name }}
                </h3>
                <span
                  class="flex-shrink-0 px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
                >
                  Lv {{ upgrade.level }}
                </span>
              </div>
              <!-- CPS / CPC -->
              <div
                v-if="(upgrade.baseCPS && (upgrade.level > 0 || (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0))) || (upgrade.baseCPC && (upgrade.level > 0 || (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0)))"
                class="flex flex-wrap gap-1.5 mb-1"
              >
                <span
                  v-if="upgrade.baseCPS && (upgrade.level > 0 || (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0))"
                  class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full border transition-all duration-150"
                  :class="hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0
                    ? 'bg-emerald-500/40 border-emerald-400/60 text-emerald-200'
                    : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'"
                >
                  <img src="/img/BardAbilities/BardChime.png" class="w-3.5 h-3.5 drop-shadow-sm" />
                  {{ formatNumber(upgrade.baseCPS * (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0
                    ? upgrade.level + shopStore.getActualBuyAmount(upgrade)
                    : upgrade.level)) }}/s
                </span>
                <span
                  v-if="upgrade.baseCPC && (upgrade.level > 0 || (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0))"
                  class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full border transition-all duration-150"
                  :class="hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0
                    ? 'bg-amber-500/40 border-amber-400/60 text-amber-200'
                    : 'bg-amber-500/20 border-amber-400/30 text-amber-300'"
                >
                  <span :class="hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0 ? 'text-amber-300' : 'text-amber-400'">✦</span>
                  {{ formatNumber(upgrade.baseCPC * (hoveredUpgradeId === upgrade.id && shopStore.getActualBuyAmount(upgrade) > 0
                    ? upgrade.level + shopStore.getActualBuyAmount(upgrade)
                    : upgrade.level)) }}/klick
                </span>
              </div>
            </div>

            <!-- Kauf-Button mit Kosten -->
            <div class="flex-shrink-0 ml-2 flex flex-col items-end gap-1">
              <span
                v-if="typeof shopStore.buyAmount === 'number' && shopStore.buyAmount > 1"
                class="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300"
              >
                {{ shopStore.buyAmount }}×
              </span>
              <span
                v-if="shopStore.buyAmount === 'max'"
                class="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300"
              >
                Max {{ shopStore.getMaxAffordableAmount(upgrade) }}×
              </span>
              <button
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-sm transition-all duration-200 border"
                :class="
                  shopStore.canAffordUpgrade(upgrade)
                    ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400/50 text-white shadow-md shadow-emerald-900/50 hover:from-emerald-400 active:scale-95'
                    : 'bg-gray-800/50 border-gray-600/20 text-gray-500 cursor-not-allowed'
                "
                :disabled="!shopStore.canAffordUpgrade(upgrade)"
              >
                <img src="/img/BardAbilities/BardChime.png" class="w-4 h-4 drop-shadow-sm" />
                <span>{{ formatNumber(shopStore.getTotalUpgradeCost(upgrade)) }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Rechte Spalte: Buy All + Permanente Upgrades ─── -->
    <div
      v-if="availableUpgrades.length > 0"
      class="flex flex-col gap-2 w-52 flex-shrink-0 sticky top-4 self-start max-h-[calc(100vh-2rem)]"
    >
      <!-- Buy All Button -->
      <button
        @click="buyAllAffordable"
        class="flex items-center justify-center w-full px-2 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 overflow-hidden border flex-shrink-0"
        :class="
          hasAffordableUpgrade
            ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400/50 text-white shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/50 hover:from-emerald-400 active:scale-95 cursor-pointer'
            : 'bg-gray-800/50 border-gray-600/20 text-gray-500 cursor-not-allowed'
        "
        :disabled="!hasAffordableUpgrade"
      >
        <span class="text-[11px] font-black tracking-tight whitespace-nowrap">Buy All</span>
      </button>

      <!-- Upgrade Icons (vertikale Scrollbar) -->
      <div class="grid grid-cols-2 flex-1 gap-2 overflow-y-auto custom-scrollbar content-start">
        <button
          v-for="pUpgrade in availableUpgrades"
          :key="pUpgrade.id"
          @click="shopStore.buyPermanentUpgrade(pUpgrade.id)"
          @mouseenter="showTooltip($event, pUpgrade)"
          @mouseleave="hideTooltip"
          class="relative flex flex-col items-center justify-center flex-shrink-0 w-full gap-1 px-1 py-2 overflow-hidden transition-all duration-300 border rounded-xl"
          :class="
            shopStore.canAffordPermanentUpgrade(pUpgrade.id)
              ? 'bg-gradient-to-br from-emerald-900/40 to-teal-900/20 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.25)] hover:scale-105 hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] cursor-pointer'
              : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 opacity-45 grayscale cursor-not-allowed'
          "
        >
          <!-- Glow-Hintergrund -->
          <div
            v-if="shopStore.canAffordPermanentUpgrade(pUpgrade.id)"
            class="absolute inset-0 opacity-50 rounded-xl blur-md bg-gradient-to-br from-emerald-400/30 to-teal-400/15"
          />
          <!-- Pulse-Rahmen -->
          <div
            v-if="shopStore.canAffordPermanentUpgrade(pUpgrade.id)"
            class="absolute inset-0 border pointer-events-none border-emerald-400/40 rounded-xl animate-pulse"
          />
          <!-- Icon -->
          <span class="relative z-10 text-2xl leading-none drop-shadow-lg">
            {{ pUpgrade.icon }}
          </span>
          <!-- Preis -->
          <div class="relative z-10 flex items-center gap-0.5">
            <img src="/img/BardAbilities/BardChime.png" class="w-3.5 h-3.5 drop-shadow-sm" />
            <span
              class="text-[10px] font-black leading-none"
              :class="
                shopStore.canAffordPermanentUpgrade(pUpgrade.id)
                  ? 'text-emerald-300'
                  : 'text-red-400/70'
              "
            >
              {{ formatNumber(pUpgrade.cost) }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- ─── Tooltip ─── -->
    <Teleport to="body">
      <div v-if="hoveredUpgrade" class="fixed z-[9999] pointer-events-none" :style="tooltipStyle">
        <div
          class="w-56 p-3 border shadow-2xl bg-black/85 backdrop-blur-xl border-white/10 rounded-xl"
        >
          <h4
            class="text-sm font-black leading-tight tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
          >
            {{ hoveredUpgrade.name }}
          </h4>
          <p class="mt-1 text-[11px] leading-snug text-white/60">
            {{ hoveredUpgrade.description }}
          </p>
          <div class="flex items-center gap-1.5 mt-2">
            <img src="/img/BardAbilities/BardChime.png" class="w-4 h-4 drop-shadow-sm" />
            <span
              class="text-xs font-black"
              :class="
                shopStore.canAffordPermanentUpgrade(hoveredUpgrade.id)
                  ? 'text-emerald-300'
                  : 'text-red-400'
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
            class="flex items-center gap-1 mt-2 px-2 py-1 text-[10px] font-bold rounded-lg bg-amber-500/15 border border-amber-400/25 text-amber-300"
          >
            <span>🔒</span>
            <span>
              {{ hoveredUpgrade.requirement.minLevel }}×
              {{ getBuildingName(hoveredUpgrade.requirement.buildingId) }} benötigt
            </span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<!-- Script & Style bleiben identisch -->

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useShopStore } from '../../../stores/shopStore'
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

    const buyOptions: BuyOption[] = [
      { value: 1, label: '1x' },
      { value: 5, label: '5x' },
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

    // ── Upgrade Icon Bar ──

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

    // ── Gebäude-Hover Preview ──

    const hoveredUpgradeId = ref<string | null>(null)

    // ── Tooltip ──

    const hoveredUpgrade = ref<PermanentUpgrade | null>(null)
    const tooltipStyle = ref<Record<string, string>>({})

    const showTooltip = (event: MouseEvent, upgrade: PermanentUpgrade) => {
      hoveredUpgrade.value = upgrade
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      const tooltipWidth = 224 // w-56 = 14rem = 224px

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
