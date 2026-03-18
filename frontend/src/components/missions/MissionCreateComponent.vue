<template>
  <div class="flex flex-col w-full h-full space-y-4">
    <!-- Max missions warning -->
    <div v-if="!missionStore.canStartMission"
      class="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200"
    >
      <span>⚠️</span>
      <span>Maximale Anzahl aktiver Missionen erreicht ({{ MAX_ACTIVE_MISSIONS }})</span>
    </div>

    <!-- Mission Cards -->
    <div
      v-for="config in missionConfigs"
      :key="config.id"
      class="group relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-white/20"
    >
      <div class="relative p-4 space-y-3">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">{{ config.icon }}</span>
            <div>
              <h3 class="text-sm font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text">
                {{ config.name }}
              </h3>
              <p class="text-[11px] text-white/40">{{ config.description }}</p>
            </div>
          </div>
        </div>

        <!-- Mission Info Badges -->
        <div class="flex flex-wrap gap-1.5">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200">
            ⏱️ {{ formatDuration(config.durationSeconds) }}
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-yellow-500/20 border border-yellow-400/30 text-yellow-200">
            🎵 {{ config.baseReward }} Chimes
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200">
            ⚡ {{ config.minPowerThreshold }} Power
          </span>
        </div>

        <!-- Role Slots -->
        <div class="space-y-2">
          <div
            v-for="(role, roleIdx) in config.requiredRoles"
            :key="role + '-' + roleIdx"
            class="flex items-center gap-2"
          >
            <span class="w-16 px-2 py-0.5 text-[10px] font-black uppercase rounded-full text-center"
              :class="roleColors[role]"
            >
              {{ role }}
            </span>
            <select
              :value="getSelection(config.id, roleIdx)"
              @change="setSelection(config.id, roleIdx, ($event.target as HTMLSelectElement).value, role)"
              class="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-blue-400/50 appearance-none cursor-pointer"
              :disabled="!missionStore.canStartMission"
            >
              <option value="" class="bg-gray-900">-- Champion wählen --</option>
              <option
                v-for="champ in getAvailableChampions(config.id, roleIdx, role)"
                :key="champ"
                :value="champ"
                class="bg-gray-900"
              >
                {{ champ }}
              </option>
            </select>
          </div>
        </div>

        <!-- Success Chance & Start Button -->
        <div class="flex items-center justify-between pt-1">
          <div v-if="isFullyAssigned(config.id, config.requiredRoles.length)" class="flex items-center gap-2">
            <span class="text-[11px] text-white/40">Erfolgschance:</span>
            <span class="text-sm font-black"
              :class="getSuccessChanceColor(getSuccessChance(config.id))"
            >
              {{ Math.round(getSuccessChance(config.id) * 100) }}%
            </span>
          </div>
          <div v-else class="text-[11px] text-white/30">Alle Rollen besetzen...</div>

          <button
            @click="startMission(config.id)"
            :disabled="!canStart(config.id, config.requiredRoles.length)"
            class="relative px-4 py-2 text-xs font-black rounded-xl border overflow-hidden transition-all duration-300 active:scale-95"
            :class="canStart(config.id, config.requiredRoles.length)
              ? 'bg-gradient-to-b from-blue-500 to-violet-700 border-blue-400/50 text-white shadow-lg shadow-violet-900/50 hover:shadow-violet-500/50 hover:from-blue-400'
              : 'bg-gray-800/50 border-gray-600/20 text-gray-500 cursor-not-allowed'
            "
          >
            <div v-if="canStart(config.id, config.requiredRoles.length)"
              class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-500"
            />
            <span class="relative">Mission starten</span>
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
import type { ChampionRole } from '../../types'

export default defineComponent({
  name: 'MissionCreateComponent',
  setup() {
    const missionStore = useMissionStore()
    const battleStore = useBattleStore()

    // Track selections per mission: { configId: { roleIdx: championName } }
    const selections = reactive<Record<string, Record<number, string>>>({})

    const roleColors: Record<ChampionRole, string> = {
      top: 'bg-red-500/20 border border-red-400/30 text-red-200',
      jungle: 'bg-green-500/20 border border-green-400/30 text-green-200',
      mid: 'bg-blue-500/20 border border-blue-400/30 text-blue-200',
      adc: 'bg-yellow-500/20 border border-yellow-400/30 text-yellow-200',
      support: 'bg-pink-500/20 border border-pink-400/30 text-pink-200',
    }

    function getSelection(configId: string, roleIdx: number): string {
      return selections[configId]?.[roleIdx] ?? ''
    }

    function setSelection(configId: string, roleIdx: number, value: string, _role: ChampionRole) {
      if (!selections[configId]) selections[configId] = {}
      selections[configId][roleIdx] = value
    }

    function getAvailableChampions(configId: string, roleIdx: number, role: ChampionRole): string[] {
      const onMission = missionStore.championsOnMission
      const owned = battleStore.ownedChampions.filter(
        (c) => c !== 'Bard' && !onMission.includes(c),
      )

      // Filter by role
      const withRole = owned.filter((c) => getChampionRoles(c).includes(role))

      // Exclude already selected for OTHER slots in this mission
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
      const assigned = config.requiredRoles.map((role, idx) => ({
        name: sel[idx] ?? '',
        role,
      }))
      if (assigned.some((a) => !a.name)) return 0
      return missionStore.calculateSuccessChance(assigned, configId)
    }

    function getSuccessChanceColor(chance: number): string {
      if (chance >= 0.7) return 'text-emerald-400'
      if (chance >= 0.4) return 'text-yellow-400'
      return 'text-red-400'
    }

    function formatDuration(seconds: number): string {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      if (min === 0) return `${sec}s`
      if (sec === 0) return `${min}m`
      return `${min}m ${sec}s`
    }

    function startMission(configId: string) {
      const config = MISSION_CONFIGS.find((m) => m.id === configId)
      if (!config) return
      const sel = selections[configId] ?? {}
      const assigned = config.requiredRoles.map((role, idx) => ({
        name: sel[idx],
        role,
      }))
      if (assigned.some((a) => !a.name)) return

      const success = missionStore.startMission(configId, assigned)
      if (success) {
        // Clear selections for this mission
        delete selections[configId]
      }
    }

    return {
      missionStore,
      missionConfigs: MISSION_CONFIGS,
      selections,
      roleColors,
      getSelection,
      setSelection,
      getAvailableChampions,
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
