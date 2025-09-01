<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
    @click.self="close"
    style="min-height: 75vh"
  >
    <div
      class="relative w-full max-w-4xl overflow-hidden border shadow-2xl max-h-[80vh] rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-white/20"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-center p-6 border-b backdrop-blur-lg bg-white/10 border-white/20"
      >
        <div class="flex items-center gap-4">
          <div
            class="p-3 border rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border-green-400/30"
          >
            <img src="/img/BardAbilities/BardChime.png" class="w-8 h-8" />
          </div>
          <div>
            <h2
              class="text-2xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text"
            >
              Chimes pro Sekunde Analyse
            </h2>
          </div>
        </div>
        <button
          @click="close"
          class="absolute p-2 text-white transition-all duration-200 border right-10 rounded-xl hover:bg-red-500/20 border-red-400/30 hover:border-red-400/60"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(85vh-160px)] custom-scrollbar">
        <!-- Zusammenfassung -->
        <div class="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
          <div
            class="p-6 border rounded-2xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border-blue-400/30"
          >
            <div class="text-center">
              <h3 class="mb-2 text-lg font-bold text-blue-300">Aktuelle CPS</h3>
              <p
                class="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text"
              >
                {{ gameStore.chimesPerSecond }}
              </p>
            </div>
          </div>

          <div
            class="p-6 border rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border-purple-400/30"
          >
            <div class="text-center">
              <h3 class="mb-2 text-lg font-bold text-purple-300">Lifetime Produktion</h3>
              <p
                class="text-3xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text"
              >
                {{ formatNumber(shopStore.totalLifetimeProduction) }}
              </p>
            </div>
          </div>

          <div
            class="p-6 border rounded-2xl bg-gradient-to-r from-orange-500/20 to-yellow-500/20 backdrop-blur-sm border-orange-400/30"
          >
            <div class="text-center">
              <h3 class="mb-2 text-lg font-bold text-orange-300">Top Produzent</h3>
              <div class="flex items-center justify-center gap-2">
                <img :src="shopStore.topProducer.icon" class="w-6 h-6" />
                <p
                  class="text-xl font-bold text-transparent bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text"
                >
                  {{ shopStore.topProducer.name }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Gebäude-Statistiken -->
        <div class="mb-8">
          <h3
            class="mb-6 text-xl font-bold text-transparent bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text"
          >
            🏭 Gebäude-Produktionsanalyse
          </h3>
          <div class="space-y-4">
            <div
              v-for="building in shopStore.buildingStats"
              :key="building.id"
              class="p-4 transition-all duration-300 border rounded-2xl backdrop-blur-sm bg-white/5 border-white/10 hover:border-white/20"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <img :src="building.icon" class="w-10 h-10" />
                  <div>
                    <h4 class="font-bold text-white">{{ building.name }}</h4>
                    <p class="text-sm text-gray-300">Level {{ building.level }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p
                    class="text-lg font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text"
                  >
                    {{ building.currentCPS }}/s
                  </p>
                  <p class="text-sm text-gray-400">
                    {{ formatNumber(building.lifetimeProduction) }} total
                  </p>
                </div>
              </div>

              <!-- Produktions-Fortschrittsbalken -->
              <div
                class="relative h-3 mb-2 overflow-hidden border rounded-full bg-gray-700/50 border-white/10"
              >
                <div
                  class="h-full transition-all duration-1000 ease-out rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                  :style="{
                    width: building.productionPercentage + '%',
                    boxShadow: '0 0 15px rgba(34, 197, 94, 0.6)',
                  }"
                ></div>
              </div>

              <!-- Effizienz-Meter -->
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-400">Effizienz:</span>
                <div class="flex items-center gap-2">
                  <div class="flex">
                    <div v-for="star in 5" :key="star" class="text-lg text-yellow-400">
                      {{
                        star <= Math.floor(building.efficiencyStars)
                          ? '★'
                          : star === Math.floor(building.efficiencyStars) + 1 &&
                              building.efficiencyStars % 1 >= 0.5
                            ? '⯪'
                            : '☆'
                      }}
                    </div>
                  </div>

                  <span
                    :class="{
                      'text-green-400': building.efficiency >= 80,
                      'text-yellow-400': building.efficiency >= 60 && building.efficiency < 80,
                      'text-red-400': building.efficiency < 60,
                    }"
                  >
                    {{ building.efficiency }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Produktions-Timeline -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-6">
            <h3
              class="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text"
            >
              📈 Produktions-Timeline
            </h3>

            <!-- Zeitraum-Auswahl -->
            <div class="flex gap-2">
              <button
                v-for="period in shopStore.timePeriods"
                :key="period.key"
                @click="shopStore.setSelectedTimePeriod(period.key)"
                class="px-4 py-2 text-sm font-medium transition-all duration-200 border rounded-lg"
                :class="{
                  'bg-cyan-500/20 border-cyan-400/50 text-cyan-300':
                    shopStore.selectedTimePeriod === period.key,
                  'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10':
                    shopStore.selectedTimePeriod !== period.key,
                }"
              >
                {{ period.label }}
              </button>
            </div>
          </div>

          <div
            class="p-6 border rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border-slate-400/30"
          >
            <!-- Chart -->
            <div
              class="flex items-end justify-between h-32 gap-1"
              v-if="shopStore.currentProductionHistory.length > 0"
            >
              <div
                v-for="(value, index) in shopStore.currentProductionHistory"
                :key="index"
                class="flex-1 transition-all duration-300 rounded-t-sm bg-gradient-to-t from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
                :style="{
                  height: Math.max(4, (value / shopStore.currentMaxHistoryValue) * 120) + 'px',
                }"
                :title="shopStore.getTooltipText(value, index)"
              ></div>
            </div>

            <!-- Keine Daten verfügbar -->
            <div v-else class="flex items-center justify-center h-32 text-gray-400">
              <div class="text-center">
                <p class="mb-2">📊 Keine Daten verfügbar</p>
                <p class="text-sm">Warte auf Produktionsdaten...</p>
              </div>
            </div>

            <!-- Zeit-Labels -->
            <div class="flex justify-between mt-2 text-xs text-gray-400">
              <span>{{ shopStore.getStartTimeLabel() }}</span>
              <span>{{ shopStore.getMidTimeLabel() }}</span>
              <span>Jetzt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { useShopStore } from '../../../stores/shopStore'
import { formatNumber } from '../../../config/numberFormat'

export default defineComponent({
  name: 'ChimesPerSecondModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const gameStore = useGameStore()
    const shopStore = useShopStore()

    const close = () => {
      emit('close')
    }

    // Lifecycle
    onMounted(() => {
      shopStore.startProductionTracking()
    })

    onUnmounted(() => {
      shopStore.stopProductionTracking()
    })

    // Watch für sofortige Aktualisierung bei CPS-Änderungen
    watch(
      () => gameStore.chimesPerSecond,
      (newCPS) => {
        shopStore.updateCurrentCPS(newCPS || 0)
      },
      { immediate: true },
    )

    return {
      gameStore,
      shopStore,
      close,
      formatNumber,
    }
  },
})
</script>
