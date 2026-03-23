<template>
  <!-- 2×2 Grid: Shop | Team / Expedition | ItemShop -->
  <div class="w-full h-full p-4 overflow-hidden">
    <div class="grid grid-cols-[3fr_2fr] grid-rows-[3fr_2fr] gap-3 h-full">
      <!-- ╔══════════════════════════╗
           ║  Oben links: Champion Shop ║
           ╚══════════════════════════╝ -->
      <div class="flex flex-col overflow-hidden border rounded-2xl border-white/15 bg-black/20">
        <div class="flex-1 min-h-0 overflow-hidden">
          <ChampionShopComponent />
        </div>
      </div>

      <!-- ╔══════════════════════════╗
           ║  Oben rechts: Team        ║
           ╚══════════════════════════╝ -->
      <div
        class="flex flex-col p-3 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between flex-shrink-0 mb-3">
          <div
            class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-400/20"
          >
            <span class="text-sm font-bold text-blue-300/80">{{
              battleStore.selectedChampions.length
            }}</span>
            <span class="text-sm font-bold text-white/30">/4</span>
          </div>
        </div>

        <!-- Team-Slots -->
        <div class="grid flex-1 min-h-0 grid-cols-2 grid-rows-2 gap-2">
          <div
            v-for="(assignment, index) in battleStore.teamSlotAssignments"
            :key="'slot-' + index"
            class="h-full cursor-pointer group/slot"
            @click="openSlotIndex = index"
          >
            <!-- Gefüllter Slot -->
            <div
              v-if="assignment"
              class="relative overflow-hidden transition-all duration-200 border team-slot-card rounded-xl hover:ring-1 hover:ring-blue-400/30"
              :class="
                isOnExpedition(assignment)
                  ? 'border-white/[0.06] opacity-50'
                  : 'border-emerald-500/25 hover:border-blue-400/40'
              "
            >
              <img
                :src="battleStore.getChampionImage(assignment)"
                :alt="assignment"
                class="absolute inset-0 object-cover object-top w-full h-full"
                :class="isOnExpedition(assignment) ? 'grayscale' : ''"
                @error="onImgError"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"
              />
              <div class="relative z-10 flex flex-col justify-between h-full p-2">
                <span class="text-[11px] font-bold tracking-widest text-white/40 uppercase"
                  >#{{ index + 1 }}</span
                >
                <div class="flex flex-col gap-1">
                  <span class="text-sm font-bold leading-tight text-white/80 drop-shadow">
                    {{ truncate(assignment, 8) }}
                  </span>
                  <span v-if="isOnExpedition(assignment)" class="text-[11px] text-amber-400/70"
                    >⏳ Expedition</span
                  >
                  <button
                    v-else
                    @click.stop="removeChampion(assignment)"
                    class="w-full py-0.5 text-xs font-bold rounded bg-red-500/20 border border-red-400/25 text-red-300/70 hover:bg-red-500/35 hover:text-red-200 transition-all duration-200"
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            </div>

            <!-- Leerer Slot -->
            <div
              v-else
              class="team-slot-card flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-white/10 bg-white/[0.015] transition-all duration-200 hover:border-blue-400/30 hover:bg-blue-900/10 group-hover/slot:border-blue-400/30"
            >
              <div
                class="flex items-center justify-center w-8 h-8 transition-colors duration-200 border border-dashed rounded-xl border-white/10 group-hover/slot:border-blue-400/30"
              >
                <span
                  class="text-lg transition-colors duration-200 text-white/20 group-hover/slot:text-blue-400/70"
                  >+</span
                >
              </div>
              <span
                class="text-[10px] font-bold tracking-wider uppercase text-white/20 group-hover/slot:text-white/40 transition-colors duration-200"
              >
                Slot {{ index + 1 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Champion Slot Modal -->
        <ChampionSlotModal
          :show="openSlotIndex !== null"
          :slotIndex="openSlotIndex ?? 0"
          @close="openSlotIndex = null"
        />
      </div>

      <!-- ╔══════════════════════════╗
           ║  Unten links: Expedition  ║
           ╚══════════════════════════╝ -->
      <div
        class="flex flex-col px-4 pt-3 pb-3 overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-950/[0.06]"
      >
        <!-- Header -->
        <div class="flex items-center flex-shrink-0 gap-3 mb-3">
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
            <span
              v-if="completedExpeditionCount > 0"
              class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
            />

            <!-- Tooltip -->
            <div
              v-if="missionStore.activeMissions.length > 0"
              class="absolute right-0 top-full mt-2 z-50 w-72 p-4 rounded-2xl border border-amber-500/15 bg-[#09071a]/97 backdrop-blur-xl shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/indicator:opacity-100 group-hover/indicator:scale-100 transition-all duration-200"
            >
              <template v-if="activeExpeditionCount > 0">
                <span
                  class="block mb-3 text-[10px] font-bold tracking-widest uppercase text-amber-300/40"
                >
                  Aktive Expeditionen
                </span>
                <div class="space-y-4">
                  <div
                    v-for="mission in missionStore.activeMissions.filter(
                      (m) => m.status === 'active',
                    )"
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
              <template v-if="completedExpeditionCount > 0">
                <div
                  :class="activeExpeditionCount > 0 ? 'mt-4 pt-4 border-t border-white/[0.06]' : ''"
                >
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

        <!-- Mission-Komponenten -->
        <div class="flex flex-col flex-1 min-h-0 gap-3 overflow-y-auto custom-scrollbar">
          <MissionActiveComponent v-if="missionStore.activeMissions.length > 0" />
          <MissionCreateComponent />
        </div>
      </div>

      <!-- ╔══════════════════════════╗
           ║  Unten rechts: Item Shop  ║
           ╚══════════════════════════╝ -->
      <div
        class="overflow-y-auto custom-scrollbar rounded-2xl border border-white/15 bg-white/[0.01] p-3"
      >
        <ItemShopComponent />
      </div>
    </div>
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
import ItemShopComponent from '../gameCenter/ItemShopComponent.vue'
import ChampionSlotModal from '../ChampionSlotModal.vue'
import type { Mission } from '../../types'

export default defineComponent({
  name: 'TeamTabComponent',
  components: {
    MissionCreateComponent,
    MissionActiveComponent,
    ChampionShopComponent,
    ItemShopComponent,
    ChampionSlotModal,
  },
  setup() {
    const battleStore = useBattleStore()
    const missionStore = useMissionStore()
    const gameStore = useGameStore()
    const now = ref(Date.now())
    const openSlotIndex = ref<number | null>(null)
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
      if (battleStore.selectedChampions.length < 4) {
        const emptySlot = battleStore.teamSlotAssignments.indexOf(null)
        if (emptySlot !== -1) {
          battleStore.assignToSlot(emptySlot, champion)
        }
      }
    }
    function removeChampion(champion: string) {
      battleStore.removeChampionFromSlots(champion)
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
      openSlotIndex,
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
  height: 100%;
}
.available-card {
  min-height: 90px;
  height: 90px;
}
</style>
