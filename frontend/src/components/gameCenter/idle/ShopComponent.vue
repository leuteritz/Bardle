<template>
  <div class="flex flex-col w-full h-full p-4 space-y-4">
    <!-- ─── Kaufmengen-Selector ─── -->
    <div
      class="sticky top-0 z-10 flex items-center justify-center gap-2 p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <span class="mr-2 text-xs font-bold tracking-widest uppercase text-white/50"> Kaufen </span>
      <div class="flex gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
        <button
          v-for="option in buyOptions"
          :key="option.value"
          @click="shopStore.setBuyAmount(option.value)"
          class="relative px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-300 overflow-hidden"
          :class="
            shopStore.buyAmount === option.value
              ? 'text-white shadow-lg shadow-violet-500/40'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          "
        >
          <!-- Active background gradient -->
          <span
            v-if="shopStore.buyAmount === option.value"
            class="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600"
          />
          <!-- Shimmer sweep on active -->
          <span
            v-if="shopStore.buyAmount === option.value"
            class="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"
          />
          <span class="relative z-10">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <!-- ─── Shop Items ─── -->
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
      <!-- Shimmer-Sweep auf Hover (nur wenn kaufbar) -->
      <div
        v-if="shopStore.canAffordUpgrade(upgrade)"
        class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
      />

      <!-- Glow-Pulse Rahmen -->
      <div
        v-if="shopStore.canAffordUpgrade(upgrade)"
        class="absolute inset-0 border pointer-events-none rounded-2xl border-emerald-400/40 animate-pulse"
      />

      <!-- Top-right: Level-Badge -->
      <div class="absolute z-10 top-3 right-3">
        <span
          class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
        >
          LV {{ upgrade.level }}
        </span>
      </div>

      <div class="flex items-center gap-4 p-4 pr-3">
        <!-- ─── Icon Container ─── -->
        <div
          class="relative flex items-center justify-center flex-shrink-0 w-16 h-16 transition-transform duration-300 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-white/15 group-hover:scale-110"
        >
          <!-- Glow hinter Icon -->
          <div
            v-if="shopStore.canAffordUpgrade(upgrade)"
            class="absolute inset-0 rounded-xl blur-md opacity-60 bg-gradient-to-br from-emerald-400/40 to-teal-400/20"
          />
          <img
            v-if="isImageUrl(upgrade.icon)"
            :src="upgrade.icon"
            :alt="upgrade.name"
            class="relative z-10 object-contain w-10 h-10 drop-shadow-lg"
          />
          <span v-else class="relative z-10 text-3xl drop-shadow-lg">{{ upgrade.icon }}</span>
        </div>

        <!-- ─── Text & Stats ─── -->
        <div class="flex-1 min-w-0">
          <h3
            class="mb-1.5 text-sm font-black leading-tight tracking-wide bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent"
          >
            {{ upgrade.name }}
          </h3>

          <!-- Stats-Chips -->
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

        <!-- ─── Kauf-Button ─── -->
        <div class="flex-shrink-0 ml-1 w-28">
          <button
            class="group/btn relative w-full px-2 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 overflow-hidden border"
            :class="
              shopStore.canAffordUpgrade(upgrade)
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400/50 text-white shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/50 hover:from-emerald-400 active:scale-95'
                : 'bg-gray-800/50 border-gray-600/20 text-gray-500 cursor-not-allowed'
            "
            :disabled="!shopStore.canAffordUpgrade(upgrade)"
          >
            <!-- Button shimmer -->
            <div
              v-if="shopStore.canAffordUpgrade(upgrade)"
              class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"
            />
            <div class="relative flex items-center justify-center gap-1.5">
              <img src="/img/BardAbilities/BardChime.png" class="w-5 h-5 drop-shadow-sm" />
              <span class="font-black tracking-tight">
                {{ formatNumber(shopStore.getTotalUpgradeCost(upgrade)) }}
              </span>
            </div>
          </button>
        </div>
      </div>
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
/* Shimmer-Keyframe für den Buy-Selector */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
