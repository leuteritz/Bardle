<template>
  <div class="flex flex-col w-full h-full gap-3">
    <!-- Max missions warning -->
    <div
      v-if="!missionStore.canStartMission"
      class="flex items-center gap-2 px-3 py-2 text-xs font-semibold border rounded-xl bg-amber-500/10 border-amber-400/20 text-amber-300/80"
    >
      <span>⚠️</span>
      <span>Maximale Missionsanzahl erreicht ({{ MAX_ACTIVE_MISSIONS }})</span>
    </div>

    <!-- Mission Cards -->
    <div
      v-for="config in missionConfigs"
      :key="config.id"
      class="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d1117] hover:border-white/[0.12] transition-all duration-200"
    >
      <div class="p-4 space-y-3.5">
        <!-- Header -->
        <div class="flex items-start gap-3">
          <span class="text-2xl mt-0.5">{{ config.icon }}</span>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-bold tracking-wide text-white/90">{{ config.name }}</h3>
            <p class="text-[11px] text-white/35 mt-0.5 leading-relaxed">{{ config.description }}</p>
          </div>
        </div>

        <!-- Info Badges -->
        <div class="flex flex-wrap gap-1.5">
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/[0.05] border border-white/[0.08] text-white/50"
          >
            ⏱ {{ formatDuration(config.durationSeconds) }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300/70"
          >
            🎵 {{ config.baseReward }} Chimes
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-violet-400/10 border border-violet-400/20 text-violet-300/70"
          >
            ⚡ {{ config.minPowerThreshold }} Power
          </span>
        </div>

        <!-- Divider -->
        <div class="h-px bg-white/[0.05]" />

        <!-- Role Slots -->
        <div class="space-y-3">
          <div
            v-for="(role, roleIdx) in config.requiredRoles"
            :key="role + '-' + roleIdx"
          >
            <div class="flex items-center gap-2 mb-1.5">
              <span
                class="w-14 shrink-0 px-2 py-0.5 text-[9px] font-black uppercase rounded-md text-center tracking-widest"
                :class="roleColors[role]"
              >
                {{ role }}
              </span>
              <span v-if="getSelection(config.id, roleIdx)" class="text-[10px] font-bold text-indigo-300/70">
                {{ getSelection(config.id, roleIdx) }}
              </span>
              <span v-else class="text-[10px] text-white/25">Nicht besetzt</span>
            </div>
            <div class="grid grid-cols-4 gap-1.5">
              <div
                v-for="champ in getAvailableChampions(config.id, roleIdx, role)"
                :key="champ"
                @click="!isSelectedElsewhere(config.id, roleIdx, champ) && missionStore.canStartMission ? toggleSelection(config.id, roleIdx, champ, role) : undefined"
                class="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all duration-150 cursor-pointer"
                :class="
                  getSelection(config.id, roleIdx) === champ
                    ? 'bg-indigo-500/20 border-indigo-400/40 ring-1 ring-indigo-400/30'
                    : isSelectedElsewhere(config.id, roleIdx, champ)
                      ? 'bg-white/[0.02] border-white/[0.05] opacity-30 grayscale cursor-not-allowed'
                      : missionStore.canStartMission
                        ? 'bg-white/[0.03] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.06]'
                        : 'bg-white/[0.02] border-white/[0.05] opacity-30 cursor-not-allowed'
                "
              >
                <div class="relative">
                  <img
                    :src="getChampionImage(champ)"
                    :alt="champ"
                    class="w-8 h-8 rounded-md object-cover ring-1 ring-white/10"
                    @error="onImgError"
                  />
                  <div
                    v-if="getSelection(config.id, roleIdx) === champ"
                    class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 border border-indigo-300/50 flex items-center justify-center"
                  >
                    <span class="text-[8px] text-white font-bold">✓</span>
                  </div>
                </div>
                <span class="text-[8px] font-semibold text-white/50 text-center leading-tight truncate w-full">
                  {{ truncateName(champ, 6) }}
                </span>
              </div>
            </div>
            <div
              v-if="getAvailableChampions(config.id, roleIdx, role).length === 0"
              class="py-2 text-center text-[10px] text-white/20 border border-dashed border-white/[0.06] rounded-lg"
            >
              Keine Champions mit Rolle {{ role }}
            </div>
          </div>
        </div>

        <!-- Footer Row -->
        <div class="flex items-center justify-between pt-0.5">
          <!-- Success Chance -->
          <div class="flex items-center h-6">
            <template v-if="isFullyAssigned(config.id, config.requiredRoles.length)">
              <span class="text-[11px] text-white/30 mr-1.5">Chance:</span>
              <span
                class="text-sm font-black"
                :class="getSuccessChanceColor(getSuccessChance(config.id))"
              >
                {{ Math.round(getSuccessChance(config.id) * 100) }}%
              </span>
            </template>
            <span v-else class="text-[11px] text-white/20">Alle Rollen besetzen …</span>
          </div>

          <!-- Start Button -->
          <button
            @click="startMission(config.id)"
            :disabled="!canStart(config.id, config.requiredRoles.length)"
            class="px-5 py-2 text-xs font-bold transition-all duration-200 border rounded-xl active:scale-95"
            :class="
              canStart(config.id, config.requiredRoles.length)
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-400/30 text-white shadow-md shadow-violet-900/40 hover:shadow-violet-500/30 hover:brightness-110'
                : 'bg-white/[0.03] border-white/[0.06] text-white/20 cursor-not-allowed'
            "
          >
            Starten
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue'
import { useMissionStore } from '../../stores/missionStore'
import { useBattleStore } from '../../stores/battleStore'
import { MISSION_CONFIGS } from '../../config/missions'
import { getChampionRoles } from '../../config/championRoles'
import { MAX_ACTIVE_MISSIONS } from '../../config/constants'
import { truncate as truncateName } from '../../config/numberFormat'
import type { ChampionRole } from '../../types'

export default defineComponent({
  name: 'MissionCreateComponent',
  setup() {
    const missionStore = useMissionStore()
    const battleStore = useBattleStore()

    const selections = reactive<Record<string, Record<number, string>>>({})

    const roleColors: Record<ChampionRole, string> = {
      top: 'bg-red-400/10     border border-red-400/20     text-red-300/70',
      jungle: 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-300/70',
      mid: 'bg-blue-400/10    border border-blue-400/20    text-blue-300/70',
      adc: 'bg-amber-400/10   border border-amber-400/20   text-amber-300/70',
      support: 'bg-pink-400/10    border border-pink-400/20    text-pink-300/70',
    }

    function getSelection(configId: string, roleIdx: number): string {
      return selections[configId]?.[roleIdx] ?? ''
    }

    function setSelection(configId: string, roleIdx: number, value: string, _role: ChampionRole) {
      if (!selections[configId]) selections[configId] = {}
      selections[configId][roleIdx] = value
    }

    function getAvailableChampions(
      configId: string,
      roleIdx: number,
      role: ChampionRole,
    ): string[] {
      const onMission = missionStore.championsOnMission
      const owned = battleStore.ownedChampions.filter((c) => c !== 'Bard' && !onMission.includes(c))
      const withRole = owned.filter((c) => getChampionRoles(c).includes(role))
      const currentSelections = selections[configId] ?? {}
      const selectedElsewhere = Object.entries(currentSelections)
        .filter(([idx]) => Number(idx) !== roleIdx)
        .map(([, name]) => name)
        .filter(Boolean)
      return withRole.filter((c) => !selectedElsewhere.includes(c))
    }

    function isFullyAssigned(configId: string, roleCount: number): boolean {
      const sel = selections[configId]
      if (!sel) return false
      for (let i = 0; i < roleCount; i++) {
        if (!sel[i]) return false
      }
      return true
    }

    function canStart(configId: string, roleCount: number): boolean {
      return missionStore.canStartMission && isFullyAssigned(configId, roleCount)
    }

    function getSuccessChance(configId: string): number {
      const config = MISSION_CONFIGS.find((m) => m.id === configId)
      if (!config) return 0
      const sel = selections[configId] ?? {}
      const assigned = config.requiredRoles.map((role, idx) => ({ name: sel[idx] ?? '', role }))
      if (assigned.some((a) => !a.name)) return 0
      return missionStore.calculateSuccessChance(assigned, configId)
    }

    function getSuccessChanceColor(chance: number): string {
      if (chance >= 0.7) return 'text-emerald-400'
      if (chance >= 0.4) return 'text-amber-400'
      return 'text-red-400'
    }

    function formatDuration(seconds: number): string {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      if (min === 0) return `${sec}s`
      if (sec === 0) return `${min}m`
      return `${min}m ${sec}s`
    }

    function toggleSelection(configId: string, roleIdx: number, champ: string, role: ChampionRole) {
      if (getSelection(configId, roleIdx) === champ) {
        setSelection(configId, roleIdx, '', role)
      } else {
        setSelection(configId, roleIdx, champ, role)
      }
    }

    function isSelectedElsewhere(configId: string, roleIdx: number, champ: string): boolean {
      const currentSelections = selections[configId] ?? {}
      return Object.entries(currentSelections)
        .filter(([idx]) => Number(idx) !== roleIdx)
        .some(([, name]) => name === champ)
    }

    function getChampionImage(name: string): string {
      return battleStore.getChampionImage(name)
    }

    function onImgError(e: Event) {
      const img = e.target as HTMLImageElement
      img.style.display = 'none'
    }

    function startMission(configId: string) {
      const config = MISSION_CONFIGS.find((m) => m.id === configId)
      if (!config) return
      const sel = selections[configId] ?? {}
      const assigned = config.requiredRoles.map((role, idx) => ({ name: sel[idx], role }))
      if (assigned.some((a) => !a.name)) return
      const success = missionStore.startMission(configId, assigned)
      if (success) delete selections[configId]
    }

    return {
      missionStore,
      missionConfigs: MISSION_CONFIGS,
      selections,
      roleColors,
      getSelection,
      setSelection,
      toggleSelection,
      getAvailableChampions,
      isSelectedElsewhere,
      getChampionImage,
      onImgError,
      truncateName,
      isFullyAssigned,
      canStart,
      getSuccessChance,
      getSuccessChanceColor,
      formatDuration,
      startMission,
      MAX_ACTIVE_MISSIONS,
    }
  },
})
</script>
