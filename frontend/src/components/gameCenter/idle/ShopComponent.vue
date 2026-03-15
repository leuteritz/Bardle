<template>
  <div class="flex flex-col w-full h-full p-4 space-y-6">
    <!-- Kaufmengen-Auswahl -->
    <div
      class="flex flex-wrap items-center justify-center gap-2 p-4 border bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-2xl border-white/20 backdrop-blur-md"
    >
      <span class="mr-4 text-sm font-semibold text-white">Kaufmenge:</span>
      <button
        v-for="option in buyOptions"
        :key="option.value"
        @click="shopStore.setBuyAmount(option.value)"
        class="px-3 py-1.5 text-sm font-bold transition-all duration-300 border-2 rounded-xl"
        :class="{
          'bg-gradient-to-r from-blue-500 to-violet-600 text-white border-blue-400 shadow-lg shadow-blue-500/40':
            shopStore.buyAmount === option.value,
          'bg-gray-700/40 text-gray-300 border-gray-500/40 hover:border-blue-400/60 hover:text-white':
            shopStore.buyAmount !== option.value,
        }"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Shop Items -->
    <div
      v-for="upgrade in shopStore.shopUpgrades"
      :key="upgrade.id"
      @click="handleUpgradeClick(upgrade)"
      class="relative flex items-center justify-between p-4 transition-all duration-300 rounded-2xl cursor-pointer group backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:scale-[1.02] hover:shadow-xl hover:border-blue-400/30"
      :class="{
        'from-green-500/20 to-emerald-500/10 border-green-400/40 shadow-green-500/20':
          shopStore.canAffordUpgrade(upgrade),
        'opacity-60 grayscale cursor-not-allowed': !shopStore.canAffordUpgrade(upgrade),
      }"
    >
      <!-- Upgrade Icon + Info -->
      <div class="flex items-center flex-1 min-w-0 gap-5">
        <!-- Icon mit Glow -->
        <div
          class="flex items-center justify-center w-20 h-20 transition-all duration-300 group-hover:scale-105"
        >
          <img
            v-if="isImageUrl(upgrade.icon)"
            :src="upgrade.icon"
            :alt="upgrade.name"
            class="object-cover w-14 h-14"
          />
          <span v-else class="text-3xl">{{ upgrade.icon }}</span>
        </div>
        <!-- Text -->
        <div class="flex flex-col min-w-0">
          <h3
            class="mb-1 text-base font-bold leading-tight text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
          >
            {{ upgrade.name }}
          </h3>
          <!-- Upgrade Stats -->
          <div class="flex flex-wrap gap-2 mt-1 text-xs">
            <span
              v-if="upgrade.baseCPS && upgrade.level > 0"
              class="px-2 py-1 font-semibold text-green-300 border rounded-md shadow-sm bg-green-500/20 border-green-400/40"
            >
              +{{ upgrade.baseCPS * upgrade.level }} Chimes/s
            </span>
            <span
              v-if="upgrade.baseCPC && upgrade.level > 0"
              class="px-2 py-1 font-semibold border rounded-md shadow-sm bg-amber-500/20 border-amber-400/40 text-amber-300"
            >
              +{{ upgrade.baseCPC * upgrade.level }} Chimes/click
            </span>
            <span
              class="px-2 py-1 font-bold text-blue-300 border rounded-md shadow-sm bg-blue-500/20 border-blue-400/40"
            >
              Lv. {{ upgrade.level }}
            </span>
            <!-- Kaufmenge anzeigen wenn > 1 -->
            <span
              v-if="typeof shopStore.buyAmount === 'number' && shopStore.buyAmount > 1"
              class="px-2 py-1 font-bold text-orange-300 border rounded-md shadow-sm bg-orange-500/20 border-orange-400/40"
            >
              {{ shopStore.buyAmount }}x
            </span>

            <span
              v-if="shopStore.buyAmount === 'max'"
              class="px-2 py-1 font-bold text-orange-300 border rounded-md shadow-sm bg-orange-500/20 border-orange-400/40"
            >
              Max: {{ shopStore.getMaxAffordableAmount(upgrade) }}x
            </span>
          </div>
        </div>
      </div>
      <!-- Upgrade Button -->
      <div class="flex-shrink-0 w-24 ml-4">
        <button
          class="w-full px-3 py-2 text-sm font-bold transition-all duration-300 shadow-md rounded-xl"
          :class="{
            'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-green-500/40 hover:scale-105 active:scale-95 border border-green-500/60':
              shopStore.canAffordUpgrade(upgrade),
            'bg-gray-700/40 text-gray-400 border border-gray-500/40 cursor-not-allowed':
              !shopStore.canAffordUpgrade(upgrade),
          }"
          :disabled="!shopStore.canAffordUpgrade(upgrade)"
        >
          <div class="flex flex-row items-center justify-center gap-1.5">
            <img src="/img/BardAbilities/BardChime.png" class="w-6 h-6" />
            <span class="text-sm font-bold whitespace-nowrap">
              {{ formatNumber(shopStore.getTotalUpgradeCost(upgrade)) }}
            </span>
          </div>
        </button>
      </div>
      <!-- Glow Effekt wenn kaufbar -->
      <div
        v-if="shopStore.canAffordUpgrade(upgrade)"
        class="absolute inset-0 border-2 pointer-events-none rounded-2xl border-green-400/50 animate-pulse"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useShopStore } from '../../../stores/shopStore'
import { formatNumber } from '../../../config/numberFormat'
import type { ShopUpgrade } from '../../../types'

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

    return { shopStore, handleUpgradeClick, isImageUrl, formatNumber, buyOptions }
  },
})
</script>

<style scoped>
/* Sanfte Hover-Scale */
button {
  transition: all 0.2s ease-in-out;
}

/* Pulsierender Glow für kaufbare Items */
@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.8);
  }
}
</style>
