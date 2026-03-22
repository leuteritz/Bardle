<template>
  <div class="flex flex-col w-full h-full gap-3">
    <!-- Active Mission Cards -->
    <div
      v-for="mission in missionStore.activeMissions"
      :key="mission.id"
      class="relative overflow-hidden transition-all duration-300 border rounded-2xl"
      :class="{
        'bg-[#0d1117] border-indigo-500/20': mission.status === 'active',
        'bg-[#0d1117] border-emerald-500/20': mission.status === 'success',
        'bg-[#0d1117] border-red-500/20': mission.status === 'failure',
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

      <div class="p-4 pt-5 space-y-3">
        <!-- Header Row -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-lg">{{ getMissionIcon(mission.configId) }}</span>
            <span class="text-sm font-bold tracking-wide text-white/90">{{ mission.name }}</span>
          </div>

          <span
            class="px-2.5 py-0.5 text-[10px] font-bold rounded-full tracking-widest uppercase"
            :class="{
              'bg-indigo-500/15 text-indigo-300 border border-indigo-400/20':
                mission.status === 'active',
              'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20':
                mission.status === 'success',
              'bg-red-500/15 text-red-300 border border-red-400/20': mission.status === 'failure',
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

        <!-- Champions Row -->
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="champ in mission.assignedChampions"
            :key="champ.name"
            class="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-white/[0.05] border border-white/[0.08] text-white/70"
          >
            <img
              :src="getChampionImage(champ.name)"
              :alt="champ.name"
              class="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-white/10"
            />
            {{ champ.name }}
            <span class="text-[9px] uppercase text-white/30 font-bold">{{ champ.role }}</span>
          </span>
        </div>

        <!-- Progress (active) -->
        <div v-if="mission.status === 'active'" class="space-y-1.5">
          <div class="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              class="h-full transition-all duration-1000 ease-linear rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              :style="{ width: getProgress(mission) + '%' }"
            />
          </div>
          <div class="flex justify-between text-[10px] font-semibold text-white/30">
            <span class="font-mono">{{ getTimeRemaining(mission) }}</span>
            <span>{{ Math.round(mission.successChance * 100) }}% Chance</span>
          </div>
        </div>

        <!-- Reward Row (completed) -->
        <div v-else class="flex items-center justify-between pt-0.5">
          <div class="text-xs text-white/40">
            Belohnung:
            <span
              class="ml-1 font-bold"
              :class="mission.status === 'success' ? 'text-amber-300' : 'text-red-400'"
            >
              {{ mission.reward }} Chimes
            </span>
          </div>
          <button
            @click="missionStore.collectMission(mission.id)"
            class="px-4 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 active:scale-95"
            :class="
              mission.status === 'success'
                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-white/[0.04] border-white/10 text-white/40 hover:bg-white/[0.08]'
            "
          >
            Einsammeln
          </button>
        </div>
      </div>
    </div>

    <!-- History Section -->
    <template v-if="missionStore.completedMissions.length > 0">
      <div class="flex items-center gap-3 px-1 pt-2">
        <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25">Verlauf</span>
        <div class="flex-1 h-px bg-white/5" />
      </div>

      <div
        class="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.04]"
      >
        <div
          v-for="mission in missionStore.completedMissions"
          :key="mission.id"
          class="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm opacity-60">{{ getMissionIcon(mission.configId) }}</span>
            <span class="text-xs font-medium text-white/50">{{ mission.name }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="text-xs font-bold"
              :class="mission.status === 'success' ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ mission.status === 'success' ? '+' : '' }}{{ mission.reward }}
              <span class="text-[10px] text-white/30 font-normal">Chimes</span>
            </span>
            <span class="text-xs">{{ mission.status === 'success' ? '✅' : '❌' }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
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
      const elapsed = now.value - mission.startTime
      return Math.min(100, (elapsed / (mission.durationSeconds * 1000)) * 100)
    }

    function getTimeRemaining(mission: Mission): string {
      const elapsed = now.value - mission.startTime
      const remaining = Math.max(0, mission.durationSeconds * 1000 - elapsed)
      const secs = Math.ceil(remaining / 1000)
      const min = Math.floor(secs / 60)
      const sec = secs % 60
      return `${min}:${sec.toString().padStart(2, '0')}`
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
