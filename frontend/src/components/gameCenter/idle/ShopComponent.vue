<template>
  <div class="flex flex-col items-center justify-center w-full">
    <!-- Shop Items -->
    <div class="p-6 space-y-4">
      <div
        v-for="upgrade in shopStore.shopUpgrades"
        :key="upgrade.id"
        class="flex items-center justify-between p-4 transition-all duration-200 border-2 border-gray-200 rounded-lg cursor-pointer bg-gradient-to-r from-gray-50 to-blue-50"
        :class="{
          'border-green-300 !bg-gradient-to-r !from-green-50 !to-blue-50':
            shopStore.canAffordUpgrade(upgrade),
        }"
        @click="handleUpgradeClick(upgrade)"
      >
        <!-- Upgrade Icon und Info -->
        <div class="flex items-center flex-1 gap-4">
          <div
            class="flex items-center justify-center w-16 h-16 transition-all duration-200 border-2 rounded-full shadow-md"
          >
            <span class="text-2xl">{{ upgrade.icon }}</span>
          </div>
          <div class="flex-1">
            <h3 class="mb-1 text-lg font-bold text-gray-800">{{ upgrade.name }}</h3>

            <div class="flex gap-4 text-xs">
              <span class="font-semibold text-green-600"
                >+{{ upgrade.baseCPS * upgrade.level }} Chimes/s</span
              >
              <span class="font-medium text-blue-600">Level {{ upgrade.level }}</span>
            </div>
          </div>
        </div>

        <!-- Upgrade Button -->
        <div class="flex flex-col items-center">
          <button
            class="px-6 py-3 font-bold transition-all duration-200 border-2 rounded-lg shadow-md"
            :class="{
              'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-lg active:transform active:scale-95':
                shopStore.canAffordUpgrade(upgrade),
              'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed':
                !shopStore.canAffordUpgrade(upgrade),
            }"
            :disabled="!shopStore.canAffordUpgrade(upgrade)"
          >
            <span class="block text-lg">{{ shopStore.getUpgradeCost(upgrade) }}</span>
            <span class="block text-xs opacity-90">Chimes</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useShopStore } from '../../../stores/shopStore'

export default defineComponent({
  name: 'ShopComponent',
  setup() {
    const shopStore = useShopStore()
    const handleUpgradeClick = (upgrade: any) => {
      if (shopStore.buyUpgrade(upgrade.id)) {
        // Erfolgreich gekauft - könnte hier eine Animation oder Sound hinzufügen
        console.log(`${upgrade.name} erfolgreich gekauft!`)
      }
    }

    return {
      shopStore,
      handleUpgradeClick,
    }
  },
})
</script>
