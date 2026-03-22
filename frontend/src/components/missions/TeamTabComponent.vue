<template>
  <div
    class="flex flex-col w-full h-full gap-4 p-4 overflow-y-auto custom-scrollbar"
  >
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- SEKTION A — Teamaufstellung                        -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="flex items-center gap-3 px-1">
      <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30"
        >Teamaufstellung</span
      >
      <div class="flex-1 h-px bg-white/5" />

      <!-- Expedition Indicator -->
      <div class="relative group/indicator">
        <div
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-default transition-colors"
          :class="
            missionStore.activeMissions.length > 0
              ? 'bg-amber-500/10 border-amber-400/20 text-amber-300/80'
              : 'bg-white/[0.04] border-white/[0.08] text-white/30'
          "
        >
          <span class="text-sm">🧭</span>
          <span class="text-[10px] font-bold tracking-wider">
            {{ activeExpeditionCount }}/{{ MAX_ACTIVE_MISSIONS }}
          </span>
        </div>

        <!-- Tooltip -->
        <div
          v-if="missionStore.activeMissions.length > 0"
          class="absolute right-0 top-full mt-2 z-50 w-64 p-3 rounded-xl border border-amber-500/20 bg-gradient-to-b from-[#0a0820]/95 to-[#0d0a2a]/95 backdrop-blur-xl shadow-[0_0_24px_rgba(245,158,11,0.12)] opacity-0 scale-95 pointer-events-none group-hover/indicator:opacity-100 group-hover/indicator:scale-100 transition-all duration-200 ease-out"
        >
          <span class="block mb-2 text-[10px] font-bold tracking-widest uppercase text-amber-300/50"
            >Aktive Expeditionen</span
          >
          <div class="space-y-2">
            <div
              v-for="mission in missionStore.activeMissions.filter((m) => m.status === 'active')"
              :key="mission.id"
              class="space-y-1"
            >
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-white/70"
                  >{{ getMissionIcon(mission.configId) }} {{ mission.name }}</span
                >
                <span class="text-[10px] font-mono text-white/40">{{
                  getTimeRemaining(mission)
                }}</span>
              </div>
              <div class="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  class="h-full transition-all duration-1000 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                  :style="{ width: getProgress(mission) + '%' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Bard Leader Card ─── -->
    <div
      class="group relative overflow-hidden rounded-2xl border backdrop-blur-md bg-gradient-to-br from-blue-900/30 via-violet-900/20 to-blue-900/10 border-blue-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
    >
      <div
        class="absolute inset-0 border pointer-events-none rounded-2xl border-blue-400/30 animate-pulse"
      />
      <div class="flex items-center gap-4 p-4">
        <div
          class="relative flex items-center justify-center flex-shrink-0 w-16 h-16 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-white/15"
        >
          <div
            class="absolute inset-0 rounded-xl blur-md opacity-60 bg-gradient-to-br from-blue-400/40 to-violet-400/20"
          />
          <img
            src="/img/BardAbilities/Bard.png"
            alt="Bard"
            class="relative z-10 object-cover w-10 h-10 rounded-lg drop-shadow-lg"
          />
          <span class="absolute text-sm -translate-x-1/2 -top-3 left-1/2 drop-shadow-lg">👑</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3
            class="mb-1 text-sm font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
          >
            Bard
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-black rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 tracking-wider"
            >
              👑 Team Leader
            </span>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-black rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 tracking-wider"
            >
              Lv. {{ gameStore.level }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Team Slots ─── -->
    <div
      class="p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-bold tracking-widest uppercase text-white/50"
          >Team-Aufstellung</span
        >
        <span
          class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
        >
          {{ battleStore.selectedChampions.length }}/4
        </span>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <!-- Filled Slots -->
        <div
          v-for="(champion, index) in battleStore.selectedChampions"
          :key="champion"
          class="relative group/slot"
        >
          <div
            class="relative overflow-hidden transition-all duration-300 border rounded-xl"
            :class="
              isOnExpedition(champion)
                ? 'bg-gradient-to-br from-gray-900/40 via-gray-800/30 to-gray-900/20 border-gray-500/20 opacity-60'
                : 'bg-gradient-to-br from-emerald-900/30 via-green-900/20 to-teal-900/10 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
            "
          >
            <div
              v-if="!isOnExpedition(champion)"
              class="absolute inset-0 border pointer-events-none rounded-xl border-emerald-400/30 animate-pulse"
            />
            <div class="flex flex-col items-center gap-1 p-2">
              <span
                class="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200"
              >
                #{{ index + 1 }}
              </span>
              <img
                :src="battleStore.getChampionImage(champion)"
                :alt="champion"
                class="object-cover w-10 h-10 rounded-lg shadow-md ring-1 ring-white/20"
                :class="isOnExpedition(champion) ? 'grayscale opacity-60' : ''"
                @error="onImgError"
              />
              <span
                class="text-[11px] font-black text-center leading-tight"
                :class="
                  isOnExpedition(champion)
                    ? 'text-gray-400'
                    : 'bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent'
                "
              >
                {{ truncate(champion, 7) }}
              </span>
              <!-- Expedition indicator on champion -->
              <span v-if="isOnExpedition(champion)" class="text-[10px] text-amber-400/70 font-bold">
                ⏳ Expedition
              </span>
              <button
                v-else
                @click="removeChampion(champion)"
                class="w-full px-1 py-0.5 text-[10px] font-black rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/40 transition-colors duration-200"
              >
                ✕ Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Empty Slots -->
        <div
          v-for="n in 4 - battleStore.selectedChampions.length"
          :key="'empty-' + n"
          class="relative"
        >
          <div
            class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 border-dashed bg-white/[0.02] border-white/10 min-h-[80px] opacity-50"
          >
            <span class="text-xl text-white/20">+</span>
            <span class="text-[10px] text-white/20 font-bold"
              >#{{ battleStore.selectedChampions.length + n }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Available Champions ─── -->
    <div
      class="p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-bold tracking-widest uppercase text-white/50">Verfügbar</span>
        <span
          class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
        >
          {{ selectableChampions.length }} Champions
        </span>
      </div>

      <!-- No Champions State -->
      <div
        v-if="selectableChampions.length === 0"
        class="flex flex-col items-center justify-center gap-2 p-6 border border-dashed rounded-xl border-white/10"
      >
        <span class="text-2xl opacity-40">🛒</span>
        <p class="text-xs text-white/30">Keine Champions verfügbar — besuche den Shop!</p>
      </div>

      <!-- Champion Grid -->
      <div v-else class="grid grid-cols-2 gap-2">
        <div
          v-for="champion in selectableChampions"
          :key="champion"
          @click="addChampion(champion)"
          class="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all duration-200 border min-h-[56px]"
          :class="
            battleStore.selectedChampions.length < 4
              ? 'bg-emerald-900/20 border-emerald-500/20 hover:border-emerald-400/40 hover:bg-emerald-900/30'
              : 'bg-white/[0.02] border-white/10 opacity-50 cursor-not-allowed'
          "
        >
          <img
            :src="battleStore.getChampionImage(champion)"
            :alt="champion"
            class="flex-shrink-0 object-cover w-8 h-8 rounded-lg ring-1 ring-white/15"
            @error="onImgError"
          />
          <span class="flex-1 text-[11px] font-bold text-white/70 truncate">
            {{ champion }}
          </span>
          <span
            v-if="battleStore.selectedChampions.length < 4"
            class="text-[10px] font-bold text-emerald-400/70"
          >
            + Add
          </span>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- SEKTION B — Expeditionen                           -->
    <!-- ═══════════════════════════════════════════════════ -->

    <!-- Available Expeditions -->
    <div class="flex items-center gap-3 px-1 pt-2">
      <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25"
        >Neue Expedition</span
      >
      <div class="flex-1 h-px bg-white/5" />
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
import type { Mission } from '../../types'

export default defineComponent({
  name: 'TeamTabComponent',
  components: { MissionCreateComponent, MissionActiveComponent },
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

