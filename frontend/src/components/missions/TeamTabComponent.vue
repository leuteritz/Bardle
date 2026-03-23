<template>
  <div class="flex flex-col w-full h-full gap-3 p-4 overflow-y-auto custom-scrollbar">
    <!-- ── Champion Shop ── -->
    <div
      class="h-[300px] rounded-2xl border border-white/[0.07] bg-black/20 overflow-hidden flex-shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
    >
      <ChampionShopComponent />
    </div>

    <!-- ── Team + Verfügbar (kombiniert) ── -->
    <div class="p-3 bg-white/[0.02] border border-white/[0.07] rounded-2xl backdrop-blur-xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-2.5">
        <div class="flex items-center gap-1.5">
          <span class="text-[9px] font-black tracking-[0.18em] uppercase text-white/25">Team</span>
          <span class="text-white/[0.08] text-xs">·</span>
          <span class="text-[9px] font-black tracking-[0.18em] uppercase text-white/15"
            >Verfügbar</span
          >
        </div>
        <div
          class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/[0.08] border border-blue-400/[0.15]"
        >
          <span class="text-[10px] font-black text-blue-300/70">{{
            battleStore.selectedChampions.length
          }}</span>
          <span class="text-[10px] font-black text-white/20">/4</span>
        </div>
      </div>

      <!-- Slots grid -->
      <div class="grid grid-cols-4 gap-1.5 mb-2.5">
        <!-- Belegte Slots -->
        <div
          v-for="(champion, index) in battleStore.selectedChampions"
          :key="champion"
          class="relative"
        >
          <div
            class="relative overflow-hidden transition-all duration-300 border rounded-xl"
            :class="
              isOnExpedition(champion)
                ? 'bg-white/[0.015] border-white/[0.05] opacity-50'
                : 'bg-gradient-to-b from-emerald-500/[0.09] to-transparent border-emerald-500/20 shadow-[0_0_14px_rgba(16,185,129,0.07)]'
            "
          >
            <div
              v-if="!isOnExpedition(champion)"
              class="absolute inset-0 border pointer-events-none rounded-xl border-emerald-400/15 animate-pulse"
            />
            <div class="flex flex-col items-center gap-1 p-2">
              <span class="text-[9px] font-black tracking-widest text-white/20 uppercase"
                >#{{ index + 1 }}</span
              >
              <img
                :src="battleStore.getChampionImage(champion)"
                :alt="champion"
                class="object-cover w-8 h-8 transition-all duration-300 rounded-lg shadow-md ring-1 ring-white/10"
                :class="isOnExpedition(champion) ? 'grayscale' : ''"
                @error="onImgError"
              />
              <span
                class="text-[9px] font-bold text-center leading-tight"
                :class="isOnExpedition(champion) ? 'text-white/25' : 'text-white/60'"
              >
                {{ truncate(champion, 7) }}
              </span>
              <span v-if="isOnExpedition(champion)" class="text-[8px] text-amber-400/50 font-bold"
                >⏳</span
              >
              <button
                v-else
                @click="removeChampion(champion)"
                class="w-full py-0.5 text-[8px] font-black rounded-md bg-red-500/[0.07] border border-red-400/15 text-red-400/50 hover:bg-red-500/20 hover:text-red-300/80 transition-all duration-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Leere Slots -->
        <div v-for="n in 4 - battleStore.selectedChampions.length" :key="'empty-' + n">
          <div
            class="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] min-h-[72px]"
          >
            <div
              class="w-6 h-6 rounded-md border border-dashed border-white/[0.08] flex items-center justify-center"
            >
              <span class="text-xs leading-none text-white/15">+</span>
            </div>
            <span class="text-[8px] text-white/12 font-bold tracking-wider uppercase">{{
              battleStore.selectedChampions.length + n
            }}</span>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-px bg-white/[0.05] mb-2.5" />

      <!-- Verfügbare Champions: Pill-Chips -->
      <div v-if="selectableChampions.length === 0" class="flex items-center gap-2 py-2">
        <span class="text-base opacity-20">🛒</span>
        <p class="text-[10px] text-white/20">Keine Champions — rekrutiere im Shop!</p>
      </div>
      <div v-else class="flex flex-wrap gap-1.5">
        <div
          v-for="champion in selectableChampions"
          :key="champion"
          @click="addChampion(champion)"
          class="group flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-200"
          :class="
            battleStore.selectedChampions.length < 4
              ? 'bg-white/[0.02] border-white/[0.06] hover:bg-emerald-500/[0.07] hover:border-emerald-400/20 cursor-pointer'
              : 'bg-white/[0.01] border-white/[0.04] opacity-35 cursor-not-allowed'
          "
        >
          <img
            :src="battleStore.getChampionImage(champion)"
            :alt="champion"
            class="flex-shrink-0 object-cover w-5 h-5 rounded"
            @error="onImgError"
          />
          <span
            class="text-sm font-semibold transition-colors duration-200 text-white/40 group-hover:text-white/60"
          >
            {{ truncate(champion, 8) }}
          </span>
          <span
            v-if="battleStore.selectedChampions.length < 4"
            class="text-[9px] font-black text-emerald-400/30 group-hover:text-emerald-400/60 transition-colors duration-200"
            >+</span
          >
        </div>
      </div>
    </div>

    <!-- ── Expeditions-Header ── -->
    <div class="flex items-center gap-3 px-1 pt-1">
      <div class="w-0.5 h-3 rounded-full bg-gradient-to-b from-amber-400/60 to-orange-500/60" />
      <span class="text-[9px] font-black tracking-[0.22em] uppercase text-white/20">
        Neue Expedition
      </span>
      <div class="flex-1 h-px bg-white/[0.04]" />

      <!-- Expedition-Indikator -->
      <div class="relative group/indicator">
        <div
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-default transition-all duration-200"
          :class="
            missionStore.activeMissions.length > 0
              ? 'bg-amber-500/[0.07] border-amber-400/[0.12] text-amber-300/60'
              : 'bg-white/[0.03] border-white/[0.06] text-white/20'
          "
        >
          <span class="text-xs">🧭</span>
          <span class="text-[10px] font-black tracking-wider">
            {{ activeExpeditionCount }}/{{ MAX_ACTIVE_MISSIONS }}
          </span>
        </div>

        <!-- Tooltip -->
        <div
          v-if="missionStore.activeMissions.length > 0"
          class="absolute right-0 top-full mt-2 z-50 w-64 p-3.5 rounded-xl border border-amber-500/[0.12] bg-[#09071a]/96 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] opacity-0 scale-95 pointer-events-none group-hover/indicator:opacity-100 group-hover/indicator:scale-100 transition-all duration-200 ease-out"
        >
          <span
            class="block mb-3 text-[9px] font-black tracking-[0.2em] uppercase text-amber-300/35"
          >
            Aktive Expeditionen
          </span>
          <div class="space-y-3">
            <div
              v-for="mission in missionStore.activeMissions.filter((m) => m.status === 'active')"
              :key="mission.id"
              class="space-y-1.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-white/50">
                  {{ getMissionIcon(mission.configId) }} {{ mission.name }}
                </span>
                <span class="text-[10px] font-mono text-white/25">
                  {{ getTimeRemaining(mission) }}
                </span>
              </div>
              <div class="w-full h-0.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  class="h-full transition-all duration-1000 rounded-full bg-gradient-to-r from-amber-500/80 to-orange-400/80"
                  :style="{ width: getProgress(mission) + '%' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <MissionCreateComponent />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue'
import { useBattleStore } from '../../stores/battleStore'
import { useMissionStore } from '../../stores/missionStore'
import { useGameStore } from '../../stores/gameStore'
import { MAX_ACTIVE_MISSIONS } from '../../config/constants'
import { MISSION_CONFIGS } from '../../config/missions'
import { truncate } from '../../config/numberFormat'
import MissionCreateComponent from './MissionCreateComponent.vue'
import MissionActiveComponent from './MissionActiveComponent.vue'
import ChampionShopComponent from '../gameCenter/champion/ChampionShopComponent.vue'
import type { Mission } from '../../types'

export default defineComponent({
  name: 'TeamTabComponent',
  components: { MissionCreateComponent, MissionActiveComponent, ChampionShopComponent },
  setup() {
    const battleStore = useBattleStore()
    const missionStore = useMissionStore()
    const gameStore = useGameStore()

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

    const selectableChampions = computed(() => {
      const onMission = missionStore.championsOnMission
      return battleStore.ownedChampions.filter(
        (c) => c !== 'Bard' && !battleStore.selectedChampions.includes(c) && !onMission.includes(c),
      )
    })

    const activeExpeditionCount = computed(
      () => missionStore.activeMissions.filter((m) => m.status === 'active').length,
    )

    function isOnExpedition(champion: string): boolean {
      return missionStore.championsOnMission.includes(champion)
    }

    function addChampion(champion: string) {
      if (
        battleStore.selectedChampions.length < 4 &&
        !battleStore.selectedChampions.includes(champion)
      ) {
        battleStore.selectedChampions.push(champion)
      }
    }

    function removeChampion(champion: string) {
      battleStore.selectedChampions = battleStore.selectedChampions.filter((c) => c !== champion)
    }

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

    function onImgError(e: Event) {
      const img = e.target as HTMLImageElement
      img.style.display = 'none'
    }

    return {
      battleStore,
      missionStore,
      gameStore,
      selectableChampions,
      activeExpeditionCount,
      isOnExpedition,
      addChampion,
      removeChampion,
      getProgress,
      getTimeRemaining,
      getMissionIcon,
      truncate,
      onImgError,
      MAX_ACTIVE_MISSIONS,
    }
  },
})
</script>
