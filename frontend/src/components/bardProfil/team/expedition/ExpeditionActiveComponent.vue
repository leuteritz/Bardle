<template>
  <div class="flex flex-col w-full h-full gap-3">
    <!-- Active Expedition Cards -->
    <div
      v-for="expedition in expeditionStore.activeExpeditions"
      :key="expedition.id"
      class="relative overflow-hidden transition-all duration-300 expedition-card"
      :class="{
        'expedition-card--active': expedition.status === 'active',
        'expedition-card--success': expedition.status === 'success',
        'expedition-card--failure': expedition.status === 'failure',
      }"
    >
      <!-- Top accent line -->
      <div
        class="absolute top-0 left-0 right-0 h-[2px] expedition-accent"
        :class="{
          'expedition-accent--active': expedition.status === 'active',
          'expedition-accent--success': expedition.status === 'success',
          'expedition-accent--failure': expedition.status === 'failure',
        }"
      />

      <div class="p-4 pt-5 space-y-3.5">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xl">{{ getExpeditionIcon(expedition.configId) }}</span>
            <span class="text-sm font-bold tracking-wide text-white/90">{{ expedition.name }}</span>
          </div>
          <span
            class="px-3 py-1 text-[11px] font-bold tracking-widest uppercase expedition-status-badge"
            :class="{
              'expedition-status--active': expedition.status === 'active',
              'expedition-status--success': expedition.status === 'success',
              'expedition-status--failure': expedition.status === 'failure',
            }"
          >
            {{
              expedition.status === 'active'
                ? 'Läuft'
                : expedition.status === 'success'
                  ? 'Erfolg'
                  : 'Fehlgeschl.'
            }}
          </span>
        </div>

        <!-- Champions -->
        <div class="flex flex-wrap gap-2">
          <span
            v-for="champ in expedition.assignedChampions"
            :key="champ.name"
            class="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold expedition-champ-tag"
          >
            <img
              :src="getChampionImage(champ.name)"
              :alt="champ.name"
              class="object-cover w-4 h-4 rounded-full rpg-img ring-1 ring-white/10"
            />
            {{ champ.name }}
            <span class="text-[10px] uppercase text-white/35 font-bold">{{ champ.role }}</span>
          </span>
        </div>

        <!-- Progress (aktiv) -->
        <div v-if="expedition.status === 'active'" class="space-y-2">
          <div class="w-full h-2 overflow-hidden rounded-full expedition-progress-track">
            <div
              class="h-full transition-all duration-1000 ease-linear rounded-full expedition-progress-fill"
              :style="{ width: getProgress(expedition) + '%' }"
            />
          </div>
          <div class="flex justify-between text-xs font-semibold text-white/40">
            <span class="font-mono">{{ getTimeRemaining(expedition) }}</span>
            <span>{{ Math.round(expedition.successChance * 100) }}% Chance</span>
          </div>
        </div>

        <!-- Reward (abgeschlossen) -->
        <div v-else class="flex items-center justify-between pt-1">
          <div class="text-sm text-white/45">
            Belohnung:
            <span
              class="ml-1.5 font-bold"
              :class="expedition.status === 'success' ? 'text-amber-300' : 'text-red-400'"
            >
              {{ expedition.reward }} Chimes
            </span>
          </div>
          <button
            @click="expeditionStore.collectExpedition(expedition.id)"
            class="px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95"
            :class="expedition.status === 'success' ? 'rpg-btn-green' : 'rpg-btn-disabled'"
          >
            Einsammeln
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { useBattleStore } from '@/stores/battleStore'
import { EXPEDITION_CONFIGS } from '@/config/expedition'
import type { ExpeditionMission } from '@/types' // ← Expedition entfernt, nur ExpeditionMission

export default defineComponent({
  name: 'ExpeditionActiveComponent',
  setup() {
    const expeditionStore = useExpeditionStore()
    const battleStore = useBattleStore()
    const now = ref(Date.now())
    let timer: ReturnType<typeof setInterval> | null = null

    onMounted(() => {
      timer = setInterval(() => {
        now.value = Date.now()
      }, 1000)
    })
    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    function getProgress(expedition: ExpeditionMission): number {
      // ← Typ gefixt
      return Math.min(
        100,
        ((now.value - expedition.startTime) / (expedition.durationSeconds * 1000)) * 100,
      )
    }
    function getTimeRemaining(expedition: ExpeditionMission): string {
      // ← Typ gefixt
      const remaining = Math.max(
        0,
        expedition.durationSeconds * 1000 - (now.value - expedition.startTime),
      )
      const secs = Math.ceil(remaining / 1000)
      return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
    }
    function getExpeditionIcon(configId: string): string {
      // ← getMissionIcon umbenannt
      return EXPEDITION_CONFIGS.find((e) => e.id === configId)?.icon ?? '📜'
    }
    function getChampionImage(name: string): string {
      return battleStore.getChampionImage(name)
    }

    return { expeditionStore, getProgress, getTimeRemaining, getExpeditionIcon, getChampionImage }
  },
})
</script>

<style scoped>
.expedition-card {
  border-radius: 4px;
  border: 1px solid;
}
.expedition-card--active {
  background: var(--rpg-bg-dark);
  border-color: rgba(92, 51, 16, 0.4);
}
.expedition-card--success {
  background: var(--rpg-bg-dark);
  border-color: rgba(82, 184, 48, 0.3);
}
.expedition-card--failure {
  background: var(--rpg-bg-dark);
  border-color: rgba(204, 96, 80, 0.3);
}

.expedition-accent--active {
  background: linear-gradient(
    to right,
    var(--rpg-wood-mid),
    var(--rpg-gold-dim),
    var(--rpg-wood-mid)
  );
}
.expedition-accent--success {
  background: linear-gradient(to right, var(--rpg-green-bottom), var(--rpg-green-top));
}
.expedition-accent--failure {
  background: linear-gradient(to right, var(--rpg-red), #a04030);
}

.expedition-status-badge {
  border-radius: 4px;
  border: 1px solid;
}
.expedition-status--active {
  background: rgba(200, 144, 64, 0.12);
  border-color: rgba(200, 144, 64, 0.25);
  color: var(--rpg-gold-dim);
}
.expedition-status--success {
  background: rgba(82, 184, 48, 0.12);
  border-color: rgba(82, 184, 48, 0.25);
  color: var(--rpg-green-top);
}
.expedition-status--failure {
  background: rgba(204, 96, 80, 0.12);
  border-color: rgba(204, 96, 80, 0.25);
  color: var(--rpg-red);
}

.expedition-champ-tag {
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  color: var(--rpg-text-muted);
}

.expedition-progress-track {
  background: var(--rpg-bg-deep);
  border: 1px solid var(--rpg-border-row);
}
.expedition-progress-fill {
  background: linear-gradient(to right, var(--rpg-gold-dim), var(--rpg-gold));
}
</style>
