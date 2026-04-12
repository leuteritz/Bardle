<template>
  <!-- 2×1 Grid (links: Shop+Expedition | rechts: ItemShop) -->
  <div class="w-full h-full p-4 overflow-hidden">
    <div class="flex h-full gap-3">
      <!-- ╔══════════════════════════╗
           ║  Linke Spalte (3fr)       ║
           ╚══════════════════════════╝ -->
      <div class="flex flex-col min-h-0 gap-3" style="flex: 3">
        <!-- Champion Shop -->
        <div class="flex flex-col min-h-0 tt-panel" style="flex: 2">
          <div class="flex-1 min-h-0 overflow-hidden">
            <ChampionShopComponent />
          </div>
        </div>

        <!-- Expedition -->
        <div
          class="flex flex-col min-h-0 px-4 pt-3 pb-3 overflow-hidden tt-panel-expedition"
          style="flex: 3"
        >
          <!-- Header -->
          <div class="flex items-center flex-shrink-0 gap-3 mb-3">
            <div
              class="relative"
              @mouseenter="showTooltip = true"
              @mouseleave="showTooltip = false"
            >
              <div
                class="flex items-center gap-2 px-3 py-1.5 cursor-default transition-all duration-200 tt-expedition-badge"
                :class="
                  expeditionStore.activeExpeditions.length > 0
                    ? completedExpeditionCount > 0
                      ? 'tt-expedition-badge--completed'
                      : 'tt-expedition-badge--active'
                    : 'tt-expedition-badge--empty'
                "
              >
                <span class="text-sm">🧭</span>
                <span class="text-xs font-bold tracking-wide">
                  {{ activeExpeditionCount }}/{{ MAX_ACTIVE_EXPEDITIONS }}
                </span>
              </div>
              <span
                v-if="completedExpeditionCount > 0"
                class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full tt-pulse-dot animate-pulse"
              />

              <!-- Tooltip -->
              <Transition name="expedition-tooltip">
                <div
                  v-show="showTooltip && expeditionStore.activeExpeditions.length > 0"
                  class="absolute left-0 z-50 p-4 mt-2 top-full w-72 rpg-tooltip tt-tooltip-wide"
                >
                  <template v-if="activeExpeditionCount > 0">
                    <span class="block mb-3 tt-tooltip-label"> Aktive Expeditionen </span>
                    <div class="space-y-4">
                      <div
                        v-for="expedition in expeditionStore.activeExpeditions.filter(
                          (e) => e.status === 'active',
                        )"
                        :key="expedition.id"
                        class="space-y-2"
                      >
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-semibold tt-text-muted">
                            {{ getExpeditionIcon(expedition.configId) }} {{ expedition.name }}
                          </span>
                          <span class="font-mono text-xs tt-text-dim">{{
                            getTimeRemaining(expedition)
                          }}</span>
                        </div>
                        <div class="w-full h-1 overflow-hidden tt-progress-track">
                          <div
                            class="h-full transition-all duration-1000 tt-progress-bar"
                            :style="{ width: getProgress(expedition) + '%' }"
                          />
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-if="completedExpeditionCount > 0">
                    <div :class="activeExpeditionCount > 0 ? 'mt-4 pt-4 tt-divider-top' : ''">
                      <span class="block mb-3 tt-tooltip-label tt-tooltip-label--green">
                        Abgeschlossen
                      </span>
                      <div class="space-y-2">
                        <div
                          v-for="expedition in expeditionStore.activeExpeditions.filter(
                            (e) => e.status !== 'active',
                          )"
                          :key="expedition.id"
                          class="flex items-center justify-between"
                        >
                          <span class="text-xs font-semibold tt-text-muted">
                            {{ getExpeditionIcon(expedition.configId) }} {{ expedition.name }}
                          </span>
                          <button
                            @click="expeditionStore.collectExpedition(expedition.id)"
                            class="text-[11px] font-bold px-2 py-0.5 transition-colors cursor-pointer tt-collect-btn"
                            :class="
                              expedition.status === 'success'
                                ? 'tt-collect-btn--success'
                                : 'tt-collect-btn--fail'
                            "
                          >
                            {{
                              expedition.status === 'success'
                                ? `+${expedition.reward} Einsammeln`
                                : '✕ Entfernen'
                            }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Expedition-Komponenten -->
          <div class="flex flex-col flex-1 min-h-0 gap-3 overflow-y-auto rpg-scrollbar">
            <ExpeditionCreateComponent />
          </div>
        </div>
      </div>

      <!-- ╔══════════════════════════╗
           ║  Rechte Spalte (2fr)      ║
           ║  Item Shop – volle Höhe   ║
           ╚══════════════════════════╝ -->
      <div class="flex flex-col min-h-0" style="flex: 2">
        <div class="flex flex-col flex-1 min-h-0 p-3 overflow-y-auto rpg-scrollbar tt-panel">
          <ItemShopComponent />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { MAX_ACTIVE_EXPEDITIONS } from '@/config/constants'
import { EXPEDITION_CONFIGS } from '@/config/expedition'
import ExpeditionCreateComponent from './expedition/ExpeditionCreateComponent.vue'
import ChampionShopComponent from './ChampionShopComponent.vue'
import ItemShopComponent from './ItemShopComponent.vue'
import type { ExpeditionMission } from '@/types'

export default defineComponent({
  name: 'TeamTabComponent',
  components: {
    ExpeditionCreateComponent,
    ChampionShopComponent,
    ItemShopComponent,
  },
  setup() {
    const expeditionStore = useExpeditionStore()
    const now = ref(Date.now())
    const showTooltip = ref(false)
    let timer: ReturnType<typeof setInterval> | null = null

    onMounted(() => {
      timer = setInterval(() => {
        now.value = Date.now()
      }, 1000)
    })
    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    const activeExpeditionCount = computed(
      () => expeditionStore.activeExpeditions.filter((e) => e.status === 'active').length,
    )
    const completedExpeditionCount = computed(
      () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
    )

    function getProgress(expedition: ExpeditionMission): number {
      return Math.min(
        100,
        ((now.value - expedition.startTime) / (expedition.durationSeconds * 1000)) * 100,
      )
    }
    function getTimeRemaining(expedition: ExpeditionMission): string {
      const remaining = Math.max(
        0,
        expedition.durationSeconds * 1000 - (now.value - expedition.startTime),
      )
      const secs = Math.ceil(remaining / 1000)
      const min = Math.floor(secs / 60)
      const sec = secs % 60
      return `${min}:${sec.toString().padStart(2, '0')}`
    }
    function getExpeditionIcon(configId: string): string {
      return EXPEDITION_CONFIGS.find((e) => e.id === configId)?.icon ?? '📜'
    }

    return {
      expeditionStore,
      showTooltip,
      activeExpeditionCount,
      completedExpeditionCount,
      getProgress,
      getTimeRemaining,
      getExpeditionIcon,
      MAX_ACTIVE_EXPEDITIONS,
    }
  },
})
</script>

<style scoped>
/* ── Panel frames ── */
.tt-panel {
  border: 4px solid var(--rpg-wood);
  border-radius: 4px;
  background: var(--rpg-bg-deep);
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid);
}

.tt-panel-expedition {
  border: 2px solid var(--rpg-wood-mid);
  border-radius: 4px;
  background: var(--rpg-bg-dark);
}

/* ── Expedition badge states ── */
.tt-expedition-badge {
  border-radius: 4px;
  border: 1px solid #444;
}

.tt-expedition-badge--active {
  background: var(--rpg-bg-selected);
  border-color: #5c4420;
  color: var(--rpg-gold-dim);
}

.tt-expedition-badge--completed {
  background: var(--rpg-bg-green-subtle);
  border-color: #2e5a1a;
  color: var(--rpg-green-light);
}

.tt-expedition-badge--empty {
  background: var(--rpg-bg-row);
  border-color: #333;
  color: #666;
}

.tt-pulse-dot {
  background: var(--rpg-green-top);
}

.tt-tooltip-wide {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
}

.tt-tooltip-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7040;
}

.tt-tooltip-label--green {
  color: #4a8a30;
}

.tt-text-muted {
  color: var(--rpg-text-muted);
}

.tt-text-dim {
  color: var(--rpg-text-dim);
}

.tt-progress-track {
  background: var(--rpg-border-row);
  border-radius: 4px;
}

.tt-progress-bar {
  border-radius: 4px;
  background: linear-gradient(to right, var(--rpg-gold-dim), var(--rpg-gold));
}

.tt-divider-top {
  border-top: 1px solid var(--rpg-border-row);
}

.tt-collect-btn {
  border-radius: 4px;
}

.tt-collect-btn--success {
  background: var(--rpg-bg-green-subtle);
  color: var(--rpg-green-light);
}

.tt-collect-btn--success:hover {
  background: #2a4a1e;
}

.tt-collect-btn--fail {
  background: #2e1414;
  color: var(--rpg-red);
}

.tt-collect-btn--fail:hover {
  background: #4a1e1e;
}

/* ── Expedition tooltip transitions ── */
.expedition-tooltip-enter-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.expedition-tooltip-leave-active {
  transition:
    opacity 0.08s ease,
    transform 0.08s ease;
}

.expedition-tooltip-enter-from,
.expedition-tooltip-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-2px);
}
</style>
