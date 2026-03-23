<template>
  <div class="flex flex-col w-full h-full gap-4 p-4 overflow-y-auto custom-scrollbar">
    <!-- ── Champion Shop ── -->
    <div
      class="h-[360px] rounded-2xl border border-white/10 bg-black/25 overflow-hidden flex-shrink-0"
    >
      <ChampionShopComponent />
    </div>

    <!-- ── Team + Verfügbar ── -->
    <div class="p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm font-bold tracking-widest uppercase text-white/40">Team</span>
        <div
          class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-400/20"
        >
          <span class="text-sm font-bold text-blue-300/80">{{
            battleStore.selectedChampions.length
          }}</span>
          <span class="text-sm font-bold text-white/30">/4</span>
        </div>
      </div>

      <!-- Slots -->
      <div class="grid grid-cols-4 gap-2 mb-4">
        <!-- Belegte Slots -->
        <div v-for="(champion, index) in battleStore.selectedChampions" :key="champion">
          <div
            class="relative overflow-hidden transition-all duration-300 border team-slot-card rounded-xl"
            :class="
              isOnExpedition(champion) ? 'border-white/[0.06] opacity-50' : 'border-emerald-500/25'
            "
          >
            <!-- Background image -->
            <img
              :src="battleStore.getChampionImage(champion)"
              :alt="champion"
              class="absolute inset-0 object-cover object-top w-full h-full"
              :class="isOnExpedition(champion) ? 'grayscale' : ''"
              @error="onImgError"
            />
            <!-- Gradient overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            <!-- Content -->
            <div class="relative z-10 flex flex-col justify-between h-full p-2">
              <span class="text-[11px] font-bold tracking-widest text-white/40 uppercase"
                >#{{ index + 1 }}</span
              >
              <div class="flex flex-col gap-1">
                <span class="text-sm font-bold leading-tight text-white/80 drop-shadow">
                  {{ truncate(champion, 8) }}
                </span>
                <span v-if="isOnExpedition(champion)" class="text-[11px] text-amber-400/70"
                  >⏳ Expedition</span
                >
                <button
                  v-else
                  @click="removeChampion(champion)"
                  class="w-full py-0.5 text-xs font-bold rounded bg-red-500/20 border border-red-400/25 text-red-300/70 hover:bg-red-500/35 hover:text-red-200 transition-all duration-200"
                >
                  Entfernen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Leere Slots -->
        <div v-for="n in 4 - battleStore.selectedChampions.length" :key="'empty-' + n">
          <div
            class="team-slot-card flex flex-col items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/10 bg-white/[0.015]"
          >
            <div
              class="flex items-center justify-center w-8 h-8 border border-dashed rounded-lg border-white/10"
            >
              <span class="text-base text-white/20">+</span>
            </div>
            <span class="text-xl font-semibold tracking-wider uppercase text-white/20">
              Slot {{ battleStore.selectedChampions.length + n }}
            </span>
          </div>
        </div>
      </div>

      <div class="h-px bg-white/[0.06] mb-4" />

      <!-- Verfügbare Champions -->
      <div v-if="selectableChampions.length === 0" class="flex items-center gap-3 py-3">
        <span class="text-xl opacity-25">🛒</span>
        <p class="text-xl text-white/30">Keine Champions — rekrutiere im Shop!</p>
      </div>
      <div
        v-else
        class="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-0.5"
      >
        <div
          v-for="champion in selectableChampions"
          :key="champion"
          @click="addChampion(champion)"
          class="relative overflow-hidden transition-all duration-200 border available-card group rounded-xl"
          :class="
            battleStore.selectedChampions.length < 4
              ? 'border-white/10 hover:border-emerald-400/30 hover:scale-[1.02] cursor-pointer'
              : 'border-white/[0.05] opacity-40 cursor-not-allowed'
          "
        >
          <!-- Background image -->
          <img
            :src="battleStore.getChampionImage(champion)"
            :alt="champion"
            class="absolute inset-0 object-cover object-top w-full h-full transition-transform duration-300 group-hover:scale-105"
            @error="onImgError"
          />
          <!-- Gradient overlay -->
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"
          />
          <!-- Content -->
          <div class="relative z-10 flex items-end justify-between h-full p-2">
            <span class="text-xl font-bold leading-tight text-white/80 drop-shadow">
              {{ truncate(champion, 9) }}
            </span>
            <span
              v-if="battleStore.selectedChampions.length < 4"
              class="text-sm font-bold transition-colors duration-200 text-emerald-400/60 group-hover:text-emerald-300 drop-shadow"
              >+</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- ── Expeditions-Header ── -->
    <div class="flex items-center gap-3 px-1 pt-1">
      <div class="w-1 h-4 rounded-full bg-gradient-to-b from-amber-400/70 to-orange-500/70" />
      <span class="text-xs font-bold tracking-widest uppercase text-white/35">Neue Expedition</span>
      <div class="flex-1 h-px bg-white/[0.05]" />

      <!-- Expedition-Indikator -->
      <div class="relative group/indicator">
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-default transition-all duration-200"
          :class="
            missionStore.activeMissions.length > 0
              ? completedExpeditionCount > 0
                ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300/70'
                : 'bg-amber-500/10 border-amber-400/20 text-amber-300/70'
              : 'bg-white/[0.03] border-white/10 text-white/30'
          "
        >
          <span class="text-sm">🧭</span>
          <span class="text-xs font-bold tracking-wide">
            {{ activeExpeditionCount }}/{{ MAX_ACTIVE_MISSIONS }}
          </span>
        </div>
        <!-- Pulsierender Dot bei abgeschlossenen Missionen -->
        <span
          v-if="completedExpeditionCount > 0"
          class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
        />

        <!-- Tooltip -->
        <div
          v-if="missionStore.activeMissions.length > 0"
          class="absolute right-0 top-full mt-2 z-50 w-72 p-4 rounded-2xl border border-amber-500/15 bg-[#09071a]/97 backdrop-blur-xl shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/indicator:opacity-100 group-hover/indicator:scale-100 transition-all duration-200"
        >
          <!-- Laufende Missionen -->
          <template v-if="activeExpeditionCount > 0">
            <span
              class="block mb-3 text-[10px] font-bold tracking-widest uppercase text-amber-300/40"
            >
              Aktive Expeditionen
            </span>
            <div class="space-y-4">
              <div
                v-for="mission in missionStore.activeMissions.filter((m) => m.status === 'active')"
                :key="mission.id"
                class="space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-white/60">
                    {{ getMissionIcon(mission.configId) }} {{ mission.name }}
                  </span>
                  <span class="font-mono text-xs text-white/35">{{
                    getTimeRemaining(mission)
                  }}</span>
                </div>
                <div class="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    class="h-full transition-all duration-1000 rounded-full bg-gradient-to-r from-amber-500/80 to-orange-400/80"
                    :style="{ width: getProgress(mission) + '%' }"
                  />
                </div>
              </div>
            </div>
          </template>
          <!-- Abgeschlossene Missionen -->
          <template v-if="completedExpeditionCount > 0">
            <div :class="activeExpeditionCount > 0 ? 'mt-4 pt-4 border-t border-white/[0.06]' : ''">
              <span
                class="block mb-3 text-[10px] font-bold tracking-widest uppercase text-emerald-300/40"
              >
                Abgeschlossen
              </span>
              <div class="space-y-2">
                <div
                  v-for="mission in missionStore.activeMissions.filter(
                    (m) => m.status !== 'active',
                  )"
                  :key="mission.id"
                  class="flex items-center justify-between"
                >
                  <span class="text-xs font-semibold text-white/60">
                    {{ getMissionIcon(mission.configId) }} {{ mission.name }}
                  </span>
                  <span
                    class="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    :class="
                      mission.status === 'success'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-red-500/15 text-red-300'
                    "
                  >
                    {{ mission.status === 'success' ? '✓ Erfolg' : '✗ Fehlschl.' }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <MissionActiveComponent v-if="missionStore.activeMissions.length > 0" />
    <MissionCreateComponent />
  </div>
</template>

<script lang="ts">
// Script bleibt identisch – keine Änderungen nötig
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

    const completedExpeditionCount = computed(
      () => missionStore.activeMissions.filter((m) => m.status !== 'active').length,
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
      completedExpeditionCount,
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

<style scoped>
.team-slot-card {
  min-height: 150px;
  height: 150px;
}
.available-card {
  min-height: 130px;
  height: 130px;
}
</style>
