<template>
  <div class="flex flex-col w-full min-h-full gap-4 p-4">
    <!-- ─── Upgrade Icon Bar (horizontale Reihe) ─── -->
    <div
      v-if="availableUpgrades.length > 0"
      class="relative flex items-center gap-2 p-3 backdrop-blur-xl bg-black/40 border border-white/[0.07] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <!-- Upgrade Icons (scrollbar) -->
      <div
        class="flex items-center flex-1 min-w-0 gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar"
      >
        <button
          v-for="pUpgrade in availableUpgrades"
          :key="pUpgrade.id"
          @click="shopStore.buyPermanentUpgrade(pUpgrade.id)"
          @mouseenter="showTooltip($event, pUpgrade)"
          @mouseleave="hideTooltip"
          class="relative flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-300 border w-14 h-14 rounded-xl"
          :class="
            shopStore.canAffordPermanentUpgrade(pUpgrade.id)
              ? 'bg-gradient-to-br from-emerald-900/40 to-teal-900/20 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.25)] hover:scale-110 hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] cursor-pointer'
              : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 opacity-45 grayscale cursor-not-allowed'
          "
        >
          <!-- Glow background for affordable -->
          <div
            v-if="shopStore.canAffordPermanentUpgrade(pUpgrade.id)"
            class="absolute inset-0 opacity-50 rounded-xl blur-md bg-gradient-to-br from-emerald-400/30 to-teal-400/15"
          />
          <!-- Pulse border for affordable -->
          <div
            v-if="shopStore.canAffordPermanentUpgrade(pUpgrade.id)"
            class="absolute inset-0 border pointer-events-none border-emerald-400/40 rounded-xl animate-pulse"
          />
          <span class="relative z-10 text-2xl leading-none drop-shadow-lg">{{
            pUpgrade.icon
          }}</span>
        </button>
      </div>

      <!-- Buy All Button -->
      <button
        @click="buyAllAffordable"
        class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 overflow-hidden border"
        :class="
          hasAffordableUpgrade
            ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400/50 text-white shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/50 hover:from-emerald-400 active:scale-95 cursor-pointer'
            : 'bg-gray-800/50 border-gray-600/20 text-gray-500 cursor-not-allowed'
        "
        :disabled="!hasAffordableUpgrade"
      >
        <span class="text-sm font-black tracking-tight whitespace-nowrap">Buy All</span>
      </button>
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

    <!-- ─── Kaufmengen-Selector (sticky, kompakt) ─── -->
    <div class="sticky top-0 z-10 flex justify-center">
      <div
        class="inline-flex gap-0.5 p-0.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/[0.07]"
      >
        <button
          v-for="option in buyOptions"
          :key="option.value"
          @click="shopStore.setBuyAmount(option.value)"
          class="px-3 py-1 text-xs font-bold transition-all duration-200 rounded-md"
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

    <!-- ─── Gebäude (volle Breite) ─── -->
    <div class="flex flex-col gap-3">
      <!-- Sektion-Header Gebäude -->
      <div class="flex items-center gap-3">
        <div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <span class="text-xs font-black tracking-widest uppercase text-white/40">Gebäude</span>
        <div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <!-- Shop Items -->
      <div
        v-for="upgrade in shopStore.shopUpgrades"
        :key="upgrade.id"
        @click="handleUpgradeClick(upgrade)"
        class="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 border backdrop-blur-md hover:scale-[1.015] hover:-translate-y-0.5"
        :class="
          shopStore.canAffordUpgrade(upgrade)
            ? 'bg-gradient-to-br from-emerald-900/30 via-green-900/20 to-teal-900/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_35px_rgba(16,185,129,0.3)]'
            : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 opacity-55 grayscale cursor-not-allowed'
        "
      >
        <!-- Shimmer-Sweep -->
        <div
          v-if="shopStore.canAffordUpgrade(upgrade)"
          class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
        />
        <!-- Glow-Pulse Rahmen -->
        <div
          v-if="shopStore.canAffordUpgrade(upgrade)"
          class="absolute inset-0 border pointer-events-none rounded-2xl border-emerald-400/40 animate-pulse"
        />
        <!-- Level-Badge -->
        <div class="absolute z-10 top-3 right-3">
          <span
            class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
          >
            LV {{ upgrade.level }}
          </span>
        </div>

        <div class="flex items-center gap-4 p-4 pr-3">
          <!-- Icon Container -->
          <div
            class="relative flex items-center justify-center flex-shrink-0 transition-transform duration-300 border shadow-inner w-14 h-14 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-white/15 group-hover:scale-110"
          >
            <div
              v-if="shopStore.canAffordUpgrade(upgrade)"
              class="absolute inset-0 rounded-xl blur-md opacity-60 bg-gradient-to-br from-emerald-400/40 to-teal-400/20"
            />
            <img
              v-if="isImageUrl(upgrade.icon)"
              :src="upgrade.icon"
              :alt="upgrade.name"
              class="relative z-10 object-contain w-9 h-9 drop-shadow-lg"
            />
            <span v-else class="relative z-10 text-2xl drop-shadow-lg">{{ upgrade.icon }}</span>
          </div>

          <!-- Text & Stats -->
          <div class="flex-1 min-w-0">
            <h3
              class="mb-1.5 text-sm font-black leading-tight tracking-wide bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent"
            >
              {{ upgrade.name }}
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-if="upgrade.baseCPS && upgrade.level > 0"
                class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
              >
                <span class="text-emerald-400">▲</span>
                {{ upgrade.baseCPS * upgrade.level }}/s
              </span>
              <span
                v-if="upgrade.baseCPC && upgrade.level > 0"
                class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300"
              >
                <span class="text-amber-400">✦</span>
                {{ upgrade.baseCPC * upgrade.level }}/klick
              </span>
              <span
                v-if="typeof shopStore.buyAmount === 'number' && shopStore.buyAmount > 1"
                class="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300"
              >
                {{ shopStore.buyAmount }}×
              </span>
              <span
                v-if="shopStore.buyAmount === 'max'"
                class="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300"
              >
                Max {{ shopStore.getMaxAffordableAmount(upgrade) }}×
              </span>
            </div>
          </div>

          <!-- Kauf-Button -->
          <div class="flex-shrink-0 w-24 ml-1">
            <button
              class="group/btn relative w-full px-2 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 overflow-hidden border"
              :class="
                shopStore.canAffordUpgrade(upgrade)
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400/50 text-white shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/50 hover:from-emerald-400 active:scale-95'
                  : 'bg-gray-800/50 border-gray-600/20 text-gray-500 cursor-not-allowed'
              "
              :disabled="!shopStore.canAffordUpgrade(upgrade)"
            >
              <div
                v-if="shopStore.canAffordUpgrade(upgrade)"
                class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"
              />
              <div class="relative flex items-center justify-center gap-1.5">
                <img src="/img/BardAbilities/BardChime.png" class="w-4 h-4 drop-shadow-sm" />
                <span class="font-black tracking-tight text-[11px]">
                  {{ formatNumber(shopStore.getTotalUpgradeCost(upgrade)) }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
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
      const purchasedAmount = shopStore.buyUpgrade(upgrade.id)
      if (purchasedAmount > 0) {
        console.log(`${upgrade.name} ${purchasedAmount}x erfolgreich gekauft!`)
      }
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
      hoveredUpgrade,
      tooltipStyle,
      showTooltip,
      hideTooltip,
    }
  },
})
</script>
