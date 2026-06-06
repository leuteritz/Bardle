<template>
  <div class="flex flex-col w-full h-full gap-3">
    <!-- Global empty state -->
    <div v-if="expeditionStore.activeExpeditions.length === 0" class="exp-empty">
      No active expeditions.
    </div>

    <!-- BEREIT-Sektion -->
    <template v-if="doneExpeditions.length > 0">
      <div class="section-header"><Icon icon="game-icons:open-chest" width="16" height="16" style="color: #e8c040; vertical-align: middle; margin-right: 4px" />Ready to Collect</div>
      <div
        v-for="expedition in doneExpeditions"
        :key="expedition.id"
        class="relative overflow-hidden transition-all duration-300 expedition-card"
        :class="{
          'expedition-card--success': expedition.status === 'success',
          'expedition-card--failure': expedition.status === 'failure',
        }"
      >
        <div
          class="absolute top-0 left-0 right-0 h-[2px] expedition-accent"
          :class="{
            'expedition-accent--success': expedition.status === 'success',
            'expedition-accent--failure': expedition.status === 'failure',
          }"
        />
        <div class="p-3 pt-4 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon :icon="expedition.icon || 'game-icons:rolled-cloth'" width="20" height="20" style="color: #c89040" />
              <span class="text-sm font-bold tracking-wide text-white/90">{{ expedition.name }}</span>
            </div>
            <span
              class="px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase expedition-status-badge"
              :class="{
                'expedition-status--success': expedition.status === 'success',
                'expedition-status--failure': expedition.status === 'failure',
              }"
            >
              {{ expedition.status === 'success' ? 'Success' : 'Failed' }}
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="champ in expedition.assignedChampions"
              :key="champ.name"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold expedition-champ-tag"
            >
              <img
                :src="getChampionImage(champ.name)"
                :alt="champ.name"
                class="object-cover w-3.5 h-3.5 rounded-full rpg-img"
              />
              {{ champ.name }}
            </span>
          </div>
          <div class="flex items-center justify-between pt-0.5">
            <div class="text-xs text-white/45">
              Reward:
              <span
                class="ml-1 font-bold"
                :class="expedition.status === 'success' ? 'text-amber-300' : 'text-red-400'"
              >
                {{ expedition.reward }} Chimes
              </span>
            </div>
            <button
              @click="collectExpedition(expedition.id)"
              class="px-4 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95"
              :class="expedition.status === 'success' ? 'rpg-btn-green' : 'rpg-btn-disabled'"
            >
              Collect
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- LAUFEND-Sektion -->
    <template v-if="runningExpeditions.length > 0">
      <div class="section-header" :class="{ 'section-header--mt': doneExpeditions.length > 0 }">Running</div>
      <div
        v-for="expedition in runningExpeditions"
        :key="expedition.id"
        class="relative overflow-hidden transition-all duration-300 expedition-card expedition-card--active"
        :style="activeCardStyle(expedition)"
      >
        <div class="absolute top-0 left-0 right-0 h-[2px] expedition-accent-active" />
        <div class="p-3 pt-4 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon :icon="expedition.icon || 'game-icons:rolled-cloth'" width="20" height="20" :style="{ color: getExpeditionColor(expedition).dim }" />
              <span class="text-sm font-bold tracking-wide text-white/90">{{ expedition.name }}</span>
            </div>
            <span class="text-xs font-mono text-white/40">{{ getTimeRemaining(expedition) }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="champ in expedition.assignedChampions"
              :key="champ.name"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold expedition-champ-tag"
            >
              <img
                :src="getChampionImage(champ.name)"
                :alt="champ.name"
                class="object-cover w-3.5 h-3.5 rounded-full rpg-img"
              />
              {{ champ.name }}
            </span>
          </div>
          <div class="space-y-1.5">
            <div class="w-full h-1.5 overflow-hidden expedition-progress-track">
              <div
                class="h-full transition-all duration-1000 ease-linear expedition-progress-fill"
                :style="{ width: getProgress(expedition) + '%' }"
              />

            </div>
            <div class="flex justify-between text-[10px] font-semibold text-white/35">
              <span>{{ Math.round(getProgress(expedition)) }}%</span>
              <span>{{ Math.round(expedition.successChance * 100) }}% Chance</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { useBattleStore } from '@/stores/battleStore'
import { EXPEDITION_COLORS, type ExpeditionColorDef } from '@/config/constants'
import { useActionToast } from '@/composables/useActionToast'
import type { ExpeditionMission } from '@/types'

export default defineComponent({
  name: 'ExpeditionActiveComponent',
  components: { Icon },
  setup() {
    const expeditionStore = useExpeditionStore()
    const battleStore = useBattleStore()
    const { showToast } = useActionToast()
    const now = ref(Date.now())
    let timer: ReturnType<typeof setInterval> | null = null

    const doneExpeditions = computed(() =>
      expeditionStore.activeExpeditions.filter((e) => e.status !== 'active'),
    )
    const runningExpeditions = computed(() =>
      expeditionStore.activeExpeditions.filter((e) => e.status === 'active'),
    )

    onMounted(() => {
      timer = setInterval(() => {
        now.value = Date.now()
      }, 1000)
    })
    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

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
      return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
    }
    function getChampionImage(name: string): string {
      return battleStore.getChampionImage(name)
    }

    function getExpeditionColor(expedition: ExpeditionMission): ExpeditionColorDef {
      const key = expedition.colorKey ?? 'gold'
      return EXPEDITION_COLORS.find((x) => x.key === key) ?? EXPEDITION_COLORS[0]
    }

    function activeCardStyle(expedition: ExpeditionMission) {
      const c = getExpeditionColor(expedition)
      return { '--exp-p': c.primary, '--exp-d': c.dim, '--exp-glow': c.glowRgb }
    }

    function collectExpedition(id: string) {
      const expedition = expeditionStore.activeExpeditions.find((e) => e.id === id)
      const status = expedition?.status
      expeditionStore.collectExpedition(id)
      showToast(status === 'success' ? 'Expedition rewards collected!' : 'Expedition completed.')
    }

    return {
      expeditionStore,
      doneExpeditions,
      runningExpeditions,
      getProgress,
      getTimeRemaining,
      getExpeditionColor,
      getChampionImage,
      collectExpedition,
      activeCardStyle,
    }
  },
})
</script>

<style scoped>
.expedition-card {
  border-radius: 4px;
  border: 1px solid;
}
.expedition-card--active {
  background: #1a1008;
  border-color: rgba(92, 51, 16, 0.4);
}
.expedition-card--success {
  background: #0e1a0e;
  border-color: rgba(82, 184, 48, 0.3);
}
.expedition-card--failure {
  background: #1a0e0e;
  border-color: rgba(204, 96, 80, 0.3);
}

.expedition-accent--active {
  background: linear-gradient(to right, #5c3310, #c89040, #5c3310);
}
.expedition-accent-active {
  background: linear-gradient(to right, transparent, var(--exp-p, #e8c040), transparent);
}
.expedition-accent--success {
  background: linear-gradient(to right, #2e7a1a, #52b830);
}
.expedition-accent--failure {
  background: linear-gradient(to right, #cc6050, #a04030);
}

.expedition-status-badge {
  border-radius: 4px;
  border: 1px solid;
}
.expedition-status--success {
  background: rgba(82, 184, 48, 0.12);
  border-color: rgba(82, 184, 48, 0.3);
  color: #52b830;
}
.expedition-status--failure {
  background: rgba(204, 96, 80, 0.12);
  border-color: rgba(204, 96, 80, 0.3);
  color: #cc6050;
}

.expedition-champ-tag {
  background: #1c1c18;
  border: 1px solid rgba(92, 51, 16, 0.35);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.55);
}

.expedition-progress-track {
  background: #111008;
  border: 1px solid rgba(92, 51, 16, 0.3);
  border-radius: 4px;
}
.expedition-progress-fill {
  background: linear-gradient(to right, var(--exp-d, #c89040), var(--exp-p, #e8c040));
}

.section-header {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.45);
  padding-bottom: 6px;
  border-bottom: 1px solid #3e2010;
}
.section-header--mt {
  margin-top: 4px;
}

.exp-empty {
  padding: 28px 12px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(200, 144, 64, 0.3);
  text-transform: uppercase;
}
</style>
