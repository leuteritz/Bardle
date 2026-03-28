<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center rpg-overlay"
    @click.self="close"
  >
    <div class="relative w-full max-w-4xl mx-4 overflow-hidden rpg-frame max-h-[80vh]">
      <!-- Gold Accent -->
      <div class="rpg-accent-bar"></div>

      <!-- Header -->
      <div class="rpg-header flex items-center justify-center p-6 relative">
        <div class="flex items-center gap-4">
          <div class="cps-icon-box p-3">
            <img src="/img/BardAbilities/BardChime.png" class="rpg-img w-8 h-8" />
          </div>
          <div>
            <h2 class="cps-title text-2xl font-bold">
              Chimes pro Sekunde Analyse
            </h2>
          </div>
        </div>
        <button
          @click="close"
          class="absolute right-10 p-2 rpg-close-btn"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(85vh-160px)] rpg-scrollbar cps-content">
        <!-- Zusammenfassung -->
        <div class="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
          <div class="stat-card p-6">
            <div class="text-center">
              <h3 class="stat-card-label mb-2 text-lg font-bold">Aktuelle CPS</h3>
              <p class="stat-card-value text-3xl font-bold">
                {{ gameStore.chimesPerSecond }}
              </p>
            </div>
          </div>

          <div class="stat-card p-6">
            <div class="text-center">
              <h3 class="stat-card-label mb-2 text-lg font-bold">Lifetime Produktion</h3>
              <p class="stat-card-value text-3xl font-bold">
                {{ formatNumber(shopStore.totalLifetimeProduction) }}
              </p>
            </div>
          </div>

          <div class="stat-card p-6">
            <div class="text-center">
              <h3 class="stat-card-label mb-2 text-lg font-bold">Top Produzent</h3>
              <div class="flex items-center justify-center gap-2">
                <img :src="shopStore.topProducer.icon" class="rpg-img w-6 h-6" />
                <p class="stat-card-value text-xl font-bold">
                  {{ shopStore.topProducer.name }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Gebäude-Statistiken -->
        <div class="mb-8">
          <h3 class="section-title mb-6 text-xl font-bold">
            🏭 Gebäude-Produktionsanalyse
          </h3>
          <div class="space-y-4">
            <div
              v-for="building in shopStore.buildingStats"
              :key="building.id"
              class="building-row p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <img :src="building.icon" class="rpg-img w-10 h-10" />
                  <div>
                    <h4 class="font-bold text-white">{{ building.name }}</h4>
                    <p class="building-sublabel text-sm">Level {{ building.level }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="building-cps text-lg font-bold">
                    {{ building.currentCPS }}/s
                  </p>
                  <p class="building-sublabel text-sm">
                    {{ formatNumber(building.lifetimeProduction) }} total
                  </p>
                </div>
              </div>

              <!-- Produktions-Fortschrittsbalken -->
              <div class="progress-track relative h-3 mb-2 overflow-hidden">
                <div
                  class="progress-fill h-full"
                  :style="{
                    width: building.productionPercentage + '%',
                  }"
                ></div>
              </div>

              <!-- Effizienz-Meter -->
              <div class="flex items-center justify-between text-sm">
                <span class="building-sublabel">Effizienz:</span>
                <div class="flex items-center gap-2">
                  <div class="flex">
                    <div v-for="star in 5" :key="star" class="star-icon text-lg">
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
                      'eff-good': building.efficiency >= 80,
                      'eff-mid': building.efficiency >= 60 && building.efficiency < 80,
                      'eff-bad': building.efficiency < 60,
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
            <h3 class="section-title text-xl font-bold">
              📈 Produktions-Timeline
            </h3>

            <!-- Zeitraum-Auswahl -->
            <div class="flex gap-2">
              <button
                v-for="period in cpsStore.timePeriods"
                :key="period.key"
                @click="cpsStore.setSelectedTimePeriod(period.key)"
                class="period-btn px-4 py-2 text-sm font-medium"
                :class="{
                  'period-btn--active': cpsStore.selectedTimePeriod === period.key,
                }"
              >
                {{ period.label }}
              </button>
            </div>
          </div>

          <div class="chart-container p-6">
            <!-- Chart -->
            <div
              class="flex items-end justify-between h-32 gap-1"
              v-if="cpsStore.currentProductionHistory.length > 0"
            >
              <div
                v-for="(value, index) in cpsStore.currentProductionHistory"
                :key="index"
                class="chart-bar flex-1"
                :style="{
                  height: Math.max(4, (value / cpsStore.currentMaxHistoryValue) * 120) + 'px',
                }"
                :title="cpsStore.getTooltipText(value, index)"
              ></div>
            </div>

            <!-- Keine Daten verfügbar -->
            <div v-else class="flex items-center justify-center h-32 no-data-text">
              <div class="text-center">
                <p class="mb-2">📊 Keine Daten verfügbar</p>
                <p class="text-sm">Warte auf Produktionsdaten...</p>
              </div>
            </div>

            <!-- Zeit-Labels -->
            <div class="flex justify-between mt-2 text-xs time-labels">
              <span>{{ cpsStore.getStartTimeLabel() }}</span>
              <span>{{ cpsStore.getMidTimeLabel() }}</span>
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
import { useCpsStore } from '../../../stores/cpsStore'
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
    const cpsStore = useCpsStore()

    const close = () => {
      emit('close')
    }

    // Lifecycle
    onMounted(() => {
      cpsStore.startProductionTracking()
    })

    onUnmounted(() => {
      cpsStore.stopProductionTracking()
    })

    // Watch für sofortige Aktualisierung bei CPS-Änderungen
    watch(
      () => gameStore.chimesPerSecond,
      (newCPS) => {
        cpsStore.updateCurrentCPS(newCPS || 0)
      },
      { immediate: true },
    )

    return {
      gameStore,
      shopStore,
      cpsStore,
      close,
      formatNumber,
    }
  },
})
</script>

<style scoped>
.cps-content {
  background: var(--rpg-bg-deep);
}

.cps-icon-box {
  background: var(--rpg-bg-icon);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
}

.cps-title {
  color: var(--rpg-gold);
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.4);
}

.section-title {
  color: var(--rpg-gold);
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.3);
}

.stat-card {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
}

.stat-card-label {
  color: var(--rpg-text-muted);
}

.stat-card-value {
  color: var(--rpg-gold);
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.4);
}

.building-row {
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  transition: background 0.15s;
}

.building-row:hover {
  background: var(--rpg-bg-hover);
}

.building-sublabel {
  color: var(--rpg-text-dim);
}

.building-cps {
  color: var(--rpg-green-border);
  text-shadow: 0 0 6px rgba(110, 192, 64, 0.3);
}

.progress-track {
  background: var(--rpg-btn-disabled-bg);
  border: 1px solid var(--rpg-border-row);
  border-radius: 3px;
}

.progress-fill {
  background: linear-gradient(to right, var(--rpg-green-bottom), var(--rpg-green-top));
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.4);
  transition: width 1s ease-out;
}

.star-icon {
  color: var(--rpg-gold);
}

.eff-good { color: var(--rpg-green-top); }
.eff-mid { color: var(--rpg-gold); }
.eff-bad { color: var(--rpg-red); }

.period-btn {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  color: var(--rpg-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.period-btn:hover {
  background: var(--rpg-bg-hover);
  color: #eee;
}

.period-btn--active {
  background: linear-gradient(to bottom, #4a8a28, #2d6018);
  border-color: var(--rpg-green-border);
  color: #fff;
  box-shadow: 0 0 6px rgba(100, 200, 50, 0.4);
}

.chart-container {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
}

.chart-bar {
  background: linear-gradient(to top, var(--rpg-green-bottom), var(--rpg-green-top));
  border-radius: 2px 2px 0 0;
  transition: all 0.3s;
}

.chart-bar:hover {
  background: linear-gradient(to top, #388e22, #60d038);
}

.no-data-text {
  color: var(--rpg-text-dim);
}

.time-labels {
  color: var(--rpg-text-dim);
}
</style>
