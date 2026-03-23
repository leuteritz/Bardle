<template>
  <div class="flex flex-col w-full h-full gap-3">
    <!-- Active Mission Cards -->
    <div
      v-for="mission in missionStore.activeMissions"
      :key="mission.id"
      class="relative overflow-hidden transition-all duration-300 border rounded-2xl"
      :class="{
        'bg-white/[0.03] border-indigo-500/20': mission.status === 'active',
        'bg-white/[0.03] border-emerald-500/25': mission.status === 'success',
        'bg-white/[0.03] border-red-500/20': mission.status === 'failure',
      }"
    >
      <!-- Top accent line -->
      <div
        class="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        :class="{
          'bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500':
            mission.status === 'active',
          'bg-gradient-to-r from-emerald-500 to-teal-500': mission.status === 'success',
          'bg-gradient-to-r from-red-500 to-rose-500': mission.status === 'failure',
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
            class="px-3 py-1 text-[11px] font-bold rounded-full tracking-widest uppercase border"
            :class="{
              'bg-indigo-500/15 text-indigo-300 border-indigo-400/25': mission.status === 'active',
              'bg-emerald-500/15 text-emerald-300 border-emerald-400/25':
                mission.status === 'success',
              'bg-red-500/15 text-red-300 border-red-400/25': mission.status === 'failure',
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
            class="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-xl bg-white/[0.05] border border-white/10 text-white/75"
          >
            <img
              :src="getChampionImage(champ.name)"
              :alt="champ.name"
              class="object-cover w-4 h-4 rounded-full ring-1 ring-white/10"
            />
            {{ champ.name }}
            <span class="text-[10px] uppercase text-white/35 font-bold">{{ champ.role }}</span>
          </span>
        </div>

        <!-- Progress (aktiv) -->
        <div v-if="mission.status === 'active'" class="space-y-2">
          <div class="w-full h-2 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              class="h-full transition-all duration-1000 ease-linear rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
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
            class="px-5 py-2 text-sm font-bold transition-all duration-200 border rounded-xl active:scale-95"
            :class="
              mission.status === 'success'
                ? 'bg-emerald-500/20 border-emerald-400/35 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-white/[0.04] border-white/10 text-white/45 hover:bg-white/[0.08]'
            "
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
import { useMissionStore } from '../../stores/missionStore'
import { useBattleStore } from '../../stores/battleStore'
import { MISSION_CONFIGS } from '../../config/missions'
import type { Mission } from '../../types'

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
