<template>
  <div class="flex flex-col w-full h-full p-4 space-y-6">
    <!-- Shop Items -->
    <div
      v-for="upgrade in shopStore.shopUpgrades"
      :key="upgrade.id"
      @click="handleUpgradeClick(upgrade)"
      class="relative flex items-center justify-between p-4 transition-all duration-300 rounded-2xl cursor-pointer group backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:scale-[1.02] hover:shadow-xl hover:border-purple-400/30"
      :class="{
        'from-green-500/20 to-emerald-500/10 border-green-400/40 shadow-green-500/20':
          shopStore.canAffordUpgrade(upgrade),
        'opacity-60 grayscale cursor-not-allowed': !shopStore.canAffordUpgrade(upgrade),
      }"
    >
      <!-- Upgrade Icon + Info -->
      <div class="flex items-center flex-1 gap-5">
        <!-- Icon mit Glow -->
        <div
          class="flex items-center justify-center w-20 h-20 transition-all duration-300 b group-hover:scale-105"
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
        <div class="flex flex-col">
          <h3
            class="mb-1 text-lg font-bold text-transparent bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text"
          >
            {{ upgrade.name }}
          </h3>
          <!-- Upgrade Stats -->
          <div class="flex flex-wrap gap-3 mt-1 text-xs">
            <span
              v-if="getUpgradeStats(upgrade).cps"
              class="px-2 py-1 font-semibold text-green-300 border rounded-md shadow-sm bg-green-500/20 border-green-400/40"
            >
              +{{ getUpgradeStats(upgrade).cps }} Chimes/s
            </span>
            <span
              v-if="getUpgradeStats(upgrade).cpc"
              class="px-2 py-1 font-semibold border rounded-md shadow-sm bg-amber-500/20 border-amber-400/40 text-amber-300"
            >
              +{{ getUpgradeStats(upgrade).cpc }} Chimes/click
            </span>
            <span
              class="px-2 py-1 font-bold text-blue-300 border rounded-md shadow-sm bg-blue-500/20 border-blue-400/40"
            >
              Lv. {{ upgrade.level }}
            </span>
          </div>
        </div>
      </div>
      <!-- Upgrade Button -->
      <div class="flex flex-col items-center ml-4">
        <button
          class="px-6 py-3 text-sm font-bold transition-all duration-300 shadow-md rounded-xl"
          :class="{
            'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-green-500/40 hover:scale-105 active:scale-95 border border-green-500/60':
              shopStore.canAffordUpgrade(upgrade),
            'bg-gray-700/40 text-gray-400 border border-gray-500/40 cursor-not-allowed':
              !shopStore.canAffordUpgrade(upgrade),
          }"
          :disabled="!shopStore.canAffordUpgrade(upgrade)"
        >
          <div class="flex flex-col items-center justify-center">
            <span class="block text-lg">
              {{ formatNumber(shopStore.getUpgradeCost(upgrade)) }}
            </span>
            <img src="/img/BardAbilities/BardChime.png" class="w-6 h-6" />
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

export default defineComponent({
  name: 'ShopComponent',
  setup() {
    const shopStore = useShopStore()

    const handleUpgradeClick = (upgrade: any) => {
      if (shopStore.buyUpgrade(upgrade.id)) {
        console.log(`${upgrade.name} erfolgreich gekauft!`)
      }
    }

    // Berechnet die Werte für Upgrade
    const getUpgradeStats = (upgrade: any) => {
      if (upgrade.baseCPS != null) {
        return {
          cps: upgrade.baseCPS ? upgrade.baseCPS * Math.max(1, upgrade.level) : null,
        }
      } else if (upgrade.baseCPC != null) {
        return {
          cpc: upgrade.baseCPC ? upgrade.baseCPC * Math.max(1, upgrade.level) : null,
        }
      }
      return { cps: null, cpc: null }
    }

    const isImageUrl = (icon: string): boolean => {
      return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(icon)
    }

    return { shopStore, handleUpgradeClick, getUpgradeStats, isImageUrl, formatNumber }
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
