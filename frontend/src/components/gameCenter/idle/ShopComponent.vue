<template>
  <div class="flex flex-col w-full min-h-full gap-4 p-4">
    <!-- ─── Kaufmengen-Selector (sticky, volle Breite) ─── -->
    <div
      class="sticky top-0 z-10 flex items-center justify-center gap-2 p-3 backdrop-blur-xl bg-black/40 border border-white/[0.07] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <span class="mr-2 text-xs font-bold tracking-widest uppercase text-white/50">Kaufen</span>
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
          <span
            v-if="shopStore.buyAmount === option.value"
            class="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600"
          />
          <span
            v-if="shopStore.buyAmount === option.value"
            class="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"
          />
          <span class="relative z-10">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- ─── Zwei-Spalten-Layout ─── -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="flex items-start gap-4">
      <!-- ════════════════════════════════ -->
      <!-- LINKE SPALTE: Gebäude (~60%)    -->
      <!-- ════════════════════════════════ -->
      <div class="flex flex-col flex-1 min-w-0 gap-3">
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

      <!-- ════════════════════════════════ -->
      <!-- RECHTE SPALTE: Upgrades (~40%) -->
      <!-- ════════════════════════════════ -->
      <div class="flex flex-col gap-3 w-[42%] flex-shrink-0">
        <!-- Sektion-Header Upgrades -->
        <div class="flex items-center gap-3">
          <div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span class="text-xs font-black tracking-widest uppercase text-white/40">Upgrades</span>
          <div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <!-- Permanente Upgrades (1-spaltig, da Platz begrenzt) -->
        <div class="flex flex-col gap-2.5 pb-4">
          <template v-for="pUpgrade in shopStore.permanentUpgrades" :key="pUpgrade.id">
            <div
              v-if="!pUpgrade.purchased"
              class="relative overflow-hidden transition-all duration-300 border group rounded-2xl backdrop-blur-md"
              :class="
                shopStore.canAffordPermanentUpgrade(pUpgrade.id)
                  ? 'bg-gradient-to-br from-emerald-900/30 via-green-900/20 to-teal-900/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] cursor-pointer hover:scale-[1.015] hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(16,185,129,0.3)]'
                  : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 opacity-55 grayscale cursor-not-allowed'
              "
              @click="shopStore.buyPermanentUpgrade(pUpgrade.id)"
            >
              <!-- Shimmer-Sweep -->
              <div
                v-if="shopStore.canAffordPermanentUpgrade(pUpgrade.id)"
                class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
              />
              <!-- Glow-Pulse -->
              <div
                v-if="shopStore.canAffordPermanentUpgrade(pUpgrade.id)"
                class="absolute inset-0 border pointer-events-none rounded-2xl border-emerald-400/40 animate-pulse"
              />

              <div class="flex gap-3 p-3">
                <!-- Icon -->
                <div
                  class="relative flex items-center justify-center flex-shrink-0 transition-transform duration-300 border shadow-inner w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-white/15 group-hover:scale-110"
                >
                  <div
                    v-if="shopStore.canAffordPermanentUpgrade(pUpgrade.id)"
                    class="absolute inset-0 rounded-xl blur-md opacity-60 bg-gradient-to-br from-emerald-400/40 to-teal-400/20"
                  />
                  <span class="relative z-10 text-xl leading-none">{{ pUpgrade.icon }}</span>
                </div>

                <!-- Text -->
                <div class="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <h4
                      class="text-xs font-black leading-tight tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
                      :class="
                        pUpgrade.purchased ? 'from-emerald-300 via-teal-200 to-emerald-300' : ''
                      "
                    >
                      {{ pUpgrade.name }}
                    </h4>
                    <p class="mt-0.5 text-[10px] leading-snug text-white/50 line-clamp-2">
                      {{ pUpgrade.description }}
                    </p>
                  </div>

                  <!-- Footer -->
                  <div class="flex items-center justify-between mt-1.5 gap-1 flex-wrap">
                    <span
                      v-if="
                        pUpgrade.requirement &&
                        !shopStore.isPermanentUpgradeRequirementMet(pUpgrade.id)
                      "
                      class="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 leading-none"
                    >
                      {{ pUpgrade.requirement.minLevel }}x
                      {{ getBuildingName(pUpgrade.requirement.buildingId) }}
                    </span>
                    <span v-else class="flex-1" />

                    <div class="inline-flex items-center gap-1">
                      <img
                        src="/img/BardAbilities/BardChime.png"
                        class="flex-shrink-0 w-3 h-3 drop-shadow-sm"
                      />
                      <span class="text-[10px] font-black text-white/70 leading-none">
                        {{ formatNumber(pUpgrade.cost) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Script & Style bleiben identisch -->

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

    const getBuildingName = (buildingId: string): string => {
      const building = shopStore.shopUpgrades.find((u) => u.id === buildingId)
      return building?.name ?? buildingId
    }

    return { shopStore, handleUpgradeClick, isImageUrl, formatNumber, buyOptions, getBuildingName }
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
