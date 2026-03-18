<template>
  <div class="flex flex-col w-full h-full space-y-4">
    <!-- Active Missions -->
    <div v-if="missionStore.activeMissions.length === 0 && missionStore.completedMissions.length === 0"
      class="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
    >
      <span class="text-3xl">📜</span>
      <h4 class="text-sm font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text">
        Keine aktiven Missionen
      </h4>
      <p class="text-xs text-blue-400">Starte eine Mission im "Neue Mission" Tab!</p>
    </div>

    <!-- Active Mission Cards -->
    <div
      v-for="mission in missionStore.activeMissions"
      :key="mission.id"
      class="group relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300"
      :class="mission.status === 'active'
        ? 'bg-gradient-to-br from-blue-900/30 via-violet-900/20 to-blue-900/10 border-blue-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
        : mission.status === 'success'
          ? 'bg-gradient-to-br from-emerald-900/30 via-green-900/20 to-teal-900/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
          : 'bg-gradient-to-br from-red-900/30 via-rose-900/20 to-red-900/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
      "
    >
      <!-- Pulse glow for active missions -->
      <div v-if="mission.status === 'active'"
        class="absolute inset-0 border pointer-events-none rounded-2xl border-blue-400/30 animate-pulse"
      />

      <div class="relative p-4 space-y-3">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">{{ getMissionIcon(mission.configId) }}</span>
            <h3 class="text-sm font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text">
              {{ mission.name }}
            </h3>
          </div>
          <span v-if="mission.status === 'active'"
            class="px-2 py-0.5 text-xs font-black rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 tracking-wider"
          >
            Aktiv
          </span>
          <span v-else-if="mission.status === 'success'"
            class="px-2 py-0.5 text-xs font-black rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 tracking-wider"
          >
            Erfolg!
          </span>
          <span v-else
            class="px-2 py-0.5 text-xs font-black rounded-full bg-red-500/20 border border-red-400/30 text-red-200 tracking-wider"
          >
            Fehlgeschlagen
          </span>
        </div>

        <!-- Champions -->
        <div class="flex flex-wrap gap-1.5">
          <span v-for="champ in mission.assignedChampions" :key="champ.name"
            class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-white/10 border border-white/15 text-white/80"
          >
            <img :src="getChampionImage(champ.name)" :alt="champ.name"
              class="w-4 h-4 rounded-full object-cover"
            />
            {{ champ.name }}
            <span class="text-[10px] uppercase text-white/40">{{ champ.role }}</span>
          </span>
        </div>

        <!-- Progress Bar (active) -->
        <div v-if="mission.status === 'active'" class="space-y-1">
          <div class="w-full h-2 overflow-hidden rounded-full bg-white/10">
            <div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-1000"
              :style="{ width: getProgress(mission) + '%' }"
            />
          </div>
          <div class="flex justify-between text-[10px] text-white/40 font-bold">
            <span>{{ getTimeRemaining(mission) }}</span>
            <span>{{ Math.round(mission.successChance * 100) }}% Chance</span>
          </div>
        </div>

        <!-- Reward display (completed) -->
        <div v-else class="flex items-center justify-between">
          <span class="text-xs text-white/50">
            Belohnung: <span class="font-black" :class="mission.status === 'success' ? 'text-yellow-300' : 'text-red-300'">
              {{ mission.reward }} Chimes
            </span>
          </span>
          <button @click="missionStore.collectMission(mission.id)"
            class="relative px-4 py-2 text-xs font-black rounded-xl border overflow-hidden transition-all duration-300 active:scale-95"
            :class="mission.status === 'success'
              ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400/50 text-white shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/50 hover:from-emerald-400'
              : 'bg-gradient-to-b from-gray-600 to-gray-800 border-gray-500/50 text-white shadow-lg hover:from-gray-500'
            "
          >
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-500" />
            <span class="relative">Einsammeln</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Completed History -->
    <div v-if="missionStore.completedMissions.length > 0" class="space-y-2">
      <div class="flex items-center px-3 py-2 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl">
        <span class="text-xs font-bold tracking-widest uppercase text-white/50">Verlauf</span>
      </div>

      <div
        v-for="mission in missionStore.completedMissions"
        :key="mission.id"
        class="flex items-center justify-between px-4 py-2 rounded-xl border backdrop-blur-md bg-white/[0.03] border-white/5"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm">{{ getMissionIcon(mission.configId) }}</span>
          <span class="text-xs font-bold text-white/60">{{ mission.name }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span :class="mission.status === 'success' ? 'text-emerald-400' : 'text-red-400'"
            class="text-xs font-black"
          >
            {{ mission.status === 'success' ? '+' : '' }}{{ mission.reward }} Chimes
          </span>
          <span class="text-[10px]">{{ mission.status === 'success' ? '✅' : '❌' }}</span>
        </div>
      </div>
    </div>
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
