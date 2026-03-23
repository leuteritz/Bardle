<template>
  <div class="flex flex-col w-full gap-2">
    <!-- Max missions warning -->
    <div
      v-if="!missionStore.canStartMission"
      class="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-300/70"
    >
      ⚠️ Maximale Missionsanzahl erreicht ({{ MAX_ACTIVE_MISSIONS }})
    </div>

    <!-- Mission Cards -->
    <div
      v-for="config in missionConfigs"
      :key="config.id"
      class="rounded-xl border border-white/[0.06] bg-[#0d1117] p-4 space-y-4"
    >
      <!-- Header -->
      <div class="flex items-start gap-3">
        <span class="text-xl">{{ config.icon }}</span>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-semibold text-white/85">{{ config.name }}</h3>
          <p class="text-[11px] text-white/30 mt-0.5 leading-relaxed">{{ config.description }}</p>
        </div>
        <!-- Meta inline -->
        <div class="flex flex-col items-end gap-0.5 shrink-0 text-[10px] text-white/30 font-medium">
          <span>⏱ {{ formatDuration(config.durationSeconds) }}</span>
          <span class="text-amber-300/50">🎵 {{ config.baseReward }}</span>
          <span class="text-violet-300/50">⚡ {{ config.minPowerThreshold }}</span>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-px bg-white/[0.04]" />

      <!-- Role Slots -->
      <div class="space-y-4">
        <div v-for="(role, roleIdx) in config.requiredRoles" :key="role + '-' + roleIdx">
          <!-- Role label + selected name -->
          <div class="flex items-center gap-2 mb-2">
            <span
              class="px-2 py-0.5 text-[9px] font-black uppercase rounded tracking-widest"
              :class="roleColors[role]"
            >
              {{ role }}
            </span>
            <span v-if="getSelection(config.id, roleIdx)" class="text-[10px] text-white/50">
              {{ getSelection(config.id, roleIdx) }}
            </span>
            <span v-else class="text-[10px] text-white/20">Nicht besetzt</span>
          </div>

          <!-- Champion Grid -->
          <div class="grid grid-cols-5 gap-1.5">
            <div
              v-for="champ in getAvailableChampions(config.id, roleIdx, role)"
              :key="champ"
              @click="
                !isSelectedElsewhere(config.id, roleIdx, champ) && missionStore.canStartMission
                  ? toggleSelection(config.id, roleIdx, champ, role)
                  : undefined
              "
              class="flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all duration-150 cursor-pointer"
              :class="
                getSelection(config.id, roleIdx) === champ
                  ? 'bg-indigo-500/20 border-indigo-400/30'
                  : isSelectedElsewhere(config.id, roleIdx, champ)
                    ? 'border-transparent opacity-25 cursor-not-allowed'
                    : missionStore.canStartMission
                      ? 'border-transparent hover:border-white/10 hover:bg-white/[0.04]'
                      : 'border-transparent opacity-25 cursor-not-allowed'
              "
            >
              <div class="relative">
                <img
                  :src="getChampionImage(champ)"
                  :alt="champ"
                  class="object-cover w-8 h-8 rounded-md"
                  @error="onImgError"
                />
                <div
                  v-if="getSelection(config.id, roleIdx) === champ"
                  class="absolute flex items-center justify-center w-3 h-3 bg-indigo-500 rounded-full -top-1 -right-1"
                >
                  <span class="text-[7px] text-white">✓</span>
                </div>
              </div>
              <span class="text-[8px] text-white/40 text-center truncate w-full leading-tight">
                {{ truncateName(champ, 6) }}
              </span>
            </div>
          </div>

          <div
            v-if="getAvailableChampions(config.id, roleIdx, role).length === 0"
            class="py-2 text-center text-[10px] text-white/20"
          >
            Keine Champions mit Rolle {{ role }}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-1">
        <div class="text-[11px]">
          <template v-if="isFullyAssigned(config.id, config.requiredRoles.length)">
            <span class="mr-1 text-white/25">Chance</span>
            <span class="font-bold" :class="getSuccessChanceColor(getSuccessChance(config.id))">
              {{ Math.round(getSuccessChance(config.id) * 100) }}%
            </span>
          </template>
          <span v-else class="text-white/20">Alle Rollen besetzen …</span>
        </div>

        <button
          @click="startMission(config.id)"
          :disabled="!canStart(config.id, config.requiredRoles.length)"
          class="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 active:scale-95"
          :class="
            canStart(config.id, config.requiredRoles.length)
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
          "
        >
          Starten
        </button>
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
      top: 'bg-red-400/10     text-red-300/60',
      jungle: 'bg-emerald-400/10 text-emerald-300/60',
      mid: 'bg-blue-400/10    text-blue-300/60',
      adc: 'bg-amber-400/10   text-amber-300/60',
      support: 'bg-pink-400/10    text-pink-300/60',
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
