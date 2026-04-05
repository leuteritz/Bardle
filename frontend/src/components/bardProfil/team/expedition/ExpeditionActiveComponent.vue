<template>
  <div class="flex flex-col w-full h-full gap-3">
    <!-- Active Mission Cards -->
    <div
      v-for="mission in missionStore.activeMissions"
      :key="mission.id"
      class="relative overflow-hidden transition-all duration-300 mission-card"
      :class="{
        'mission-card--active': mission.status === 'active',
        'mission-card--success': mission.status === 'success',
        'mission-card--failure': mission.status === 'failure',
      }"
    >
      <!-- Top accent line -->
      <div
        class="absolute top-0 left-0 right-0 h-[2px] mission-accent"
        :class="{
          'mission-accent--active': mission.status === 'active',
          'mission-accent--success': mission.status === 'success',
          'mission-accent--failure': mission.status === 'failure',
        }"
      />

      <div class="p-4 pt-5 space-y-3.5">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xl">{{ getMissionIcon(mission.configId) }}</span>
            <span class="text-sm font-bold tracking-wide text-white/90">{{ mission.name }}</span>
          </div>
          <span
            class="px-3 py-1 text-[11px] font-bold tracking-widest uppercase mission-status-badge"
            :class="{
              'mission-status--active': mission.status === 'active',
              'mission-status--success': mission.status === 'success',
              'mission-status--failure': mission.status === 'failure',
            }"
          >
            {{
              mission.status === 'active'
                ? 'Läuft'
                : mission.status === 'success'
                  ? 'Erfolg'
                  : 'Fehlgeschl.'
            }}
          </span>
        </div>

        <!-- Champions -->
        <div class="flex flex-wrap gap-2">
          <span
            v-for="champ in mission.assignedChampions"
            :key="champ.name"
            class="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold mission-champ-tag"
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
        <div v-if="mission.status === 'active'" class="space-y-2">
          <div class="w-full h-2 overflow-hidden rounded-full mission-progress-track">
            <div
              class="h-full transition-all duration-1000 ease-linear rounded-full mission-progress-fill"
              :style="{ width: getProgress(mission) + '%' }"
            />
          </div>
          <div class="flex justify-between text-xs font-semibold text-white/40">
            <span class="font-mono">{{ getTimeRemaining(mission) }}</span>
            <span>{{ Math.round(mission.successChance * 100) }}% Chance</span>
          </div>
        </div>

        <!-- Reward (abgeschlossen) -->
        <div v-else class="flex items-center justify-between pt-1">
          <div class="text-sm text-white/45">
            Belohnung:
            <span
              class="ml-1.5 font-bold"
              :class="mission.status === 'success' ? 'text-amber-300' : 'text-red-400'"
            >
              {{ mission.reward }} Chimes
            </span>
          </div>
          <button
            @click="missionStore.collectMission(mission.id)"
            class="px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95"
            :class="mission.status === 'success' ? 'rpg-btn-green' : 'rpg-btn-disabled'"
          >
            Einsammeln
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Script bleibt identisch – keine Änderungen nötig
import { defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { useMissionStore } from '@/stores/expedtion'
import { useBattleStore } from '@/stores/battleStore'
import { MISSION_CONFIGS } from '@/config/expedition'
import type { Mission } from '@/types'

export default defineComponent({
  name: 'MissionActiveComponent',
  setup() {
    const missionStore = useMissionStore()
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

    function getProgress(mission: Mission): number {
      return Math.min(
        100,
        ((now.value - mission.startTime) / (mission.durationSeconds * 1000)) * 100,
      )
    }
    function getTimeRemaining(mission: Mission): string {
      const remaining = Math.max(
        0,
        mission.durationSeconds * 1000 - (now.value - mission.startTime),
      )
      const secs = Math.ceil(remaining / 1000)
      return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
    }
    function getMissionIcon(configId: string): string {
      return MISSION_CONFIGS.find((m) => m.id === configId)?.icon ?? '📜'
    }
    function getChampionImage(name: string): string {
      return battleStore.getChampionImage(name)
    }

    return { missionStore, getProgress, getTimeRemaining, getMissionIcon, getChampionImage }
  },
})
</script>

<style scoped>
.mission-card {
  border-radius: 4px;
  border: 1px solid;
}
.mission-card--active {
  background: var(--rpg-bg-dark);
  border-color: rgba(92, 51, 16, 0.4);
}
.mission-card--success {
  background: var(--rpg-bg-dark);
  border-color: rgba(82, 184, 48, 0.3);
}
.mission-card--failure {
  background: var(--rpg-bg-dark);
  border-color: rgba(204, 96, 80, 0.3);
}

.mission-accent--active {
  background: linear-gradient(
    to right,
    var(--rpg-wood-mid),
    var(--rpg-gold-dim),
    var(--rpg-wood-mid)
  );
}
.mission-accent--success {
  background: linear-gradient(to right, var(--rpg-green-bottom), var(--rpg-green-top));
}
.mission-accent--failure {
  background: linear-gradient(to right, var(--rpg-red), #a04030);
}

.mission-status-badge {
  border-radius: 4px;
  border: 1px solid;
}
.mission-status--active {
  background: rgba(200, 144, 64, 0.12);
  border-color: rgba(200, 144, 64, 0.25);
  color: var(--rpg-gold-dim);
}
.mission-status--success {
  background: rgba(82, 184, 48, 0.12);
  border-color: rgba(82, 184, 48, 0.25);
  color: var(--rpg-green-top);
}
.mission-status--failure {
  background: rgba(204, 96, 80, 0.12);
  border-color: rgba(204, 96, 80, 0.25);
  color: var(--rpg-red);
}

.mission-champ-tag {
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  color: var(--rpg-text-muted);
}

.mission-progress-track {
  background: var(--rpg-bg-deep);
  border: 1px solid var(--rpg-border-row);
}
.mission-progress-fill {
  background: linear-gradient(to right, var(--rpg-gold-dim), var(--rpg-gold));
}
</style>
