<template>
  <div class="flex flex-col w-full gap-3">
    <!-- Max missions warning -->
    <div
      v-if="!missionStore.canStartMission"
      class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold mc-warning"
    >
      ⚠️ Maximum erreicht ({{ MAX_ACTIVE_MISSIONS }})
    </div>

    <!-- Mission Cards -->
    <div v-for="config in missionConfigs" :key="config.id" class="p-2 space-y-1.5 mc-card">
      <!-- Header: Icon + Name + Meta -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm">{{ config.icon }}</span>
          <span class="text-sm font-bold text-white/85">{{ config.name }}</span>
        </div>
        <div class="flex items-center gap-3 text-xs font-semibold text-white/35">
          <span>⏱ {{ formatDuration(config.durationSeconds) }}</span>
          <span class="text-amber-300/55">🎵 {{ config.baseReward }}</span>
        </div>
      </div>

      <!-- Role Slots -->
      <div class="space-y-1.5">
        <div v-for="(role, roleIdx) in config.requiredRoles" :key="role + '-' + roleIdx">
          <!-- Role label -->
          <div class="flex items-center gap-2 mb-0.5">
            <span
              class="px-2 py-0.5 text-[10px] font-black uppercase rounded-md tracking-widest"
              :class="roleColors[role]"
              >{{ role }}</span
            >
            <span v-if="getSelection(config.id, roleIdx)" class="text-xs text-white/50">
              {{ getSelection(config.id, roleIdx) }}
            </span>
            <span v-else class="text-[10px] text-white/20">—</span>
          </div>

          <!-- Champion Grid -->
          <div class="flex flex-wrap gap-1">
            <div
              v-for="champ in getAvailableChampions(config.id, roleIdx, role)"
              :key="champ"
              @click="
                !isSelectedElsewhere(config.id, roleIdx, champ) && missionStore.canStartMission
                  ? toggleSelection(config.id, roleIdx, champ, role)
                  : undefined
              "
              class="relative flex flex-col items-center gap-1 p-1.5 transition-all duration-150 cursor-pointer mc-champ-pick"
              :class="
                getSelection(config.id, roleIdx) === champ
                  ? 'mc-champ-pick--selected'
                  : isSelectedElsewhere(config.id, roleIdx, champ) || !missionStore.canStartMission
                    ? 'mc-champ-pick--disabled'
                    : 'mc-champ-pick--available'
              "
            >
              <img
                :src="getChampionImage(champ)"
                :alt="champ"
                class="object-cover w-8 h-8 rounded-lg"
                @error="onImgError"
              />
              <!-- Checkmark -->
              <div
                v-if="getSelection(config.id, roleIdx) === champ"
                class="absolute flex items-center justify-center w-4 h-4 rounded-full -top-1 -right-1 mc-checkmark"
              >
                <span class="text-[10px] text-white">✓</span>
              </div>
            </div>

            <p
              v-if="getAvailableChampions(config.id, roleIdx, role).length === 0"
              class="text-[11px] text-white/20 py-1"
            >
              Kein {{ role }}-Champion verfügbar
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-0">
        <span
          v-if="isFullyAssigned(config.id, config.requiredRoles.length)"
          class="text-sm font-bold"
          :class="getSuccessChanceColor(getSuccessChance(config.id))"
        >
          {{ Math.round(getSuccessChance(config.id) * 100) }}%
        </span>
        <span v-else class="text-[11px] text-white/20">Rollen besetzen …</span>

        <button
          @click="startMission(config.id)"
          :disabled="!canStart(config.id, config.requiredRoles.length)"
          class="px-4 py-1.5 text-sm font-bold transition-all duration-150 active:scale-95"
          :class="
            canStart(config.id, config.requiredRoles.length) ? 'rpg-btn-green' : 'rpg-btn-disabled'
          "
        >
          Starten
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Script bleibt vollständig unverändert
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
      top: 'mc-role--top',
      jungle: 'mc-role--jungle',
      mid: 'mc-role--mid',
      adc: 'mc-role--adc',
      support: 'mc-role--support',
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
      const selectedElsewhere = Object.entries(selections[configId] ?? {})
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
      getSelection(configId, roleIdx) === champ
        ? setSelection(configId, roleIdx, '', role)
        : setSelection(configId, roleIdx, champ, role)
    }
    function isSelectedElsewhere(configId: string, roleIdx: number, champ: string): boolean {
      return Object.entries(selections[configId] ?? {})
        .filter(([idx]) => Number(idx) !== roleIdx)
        .some(([, name]) => name === champ)
    }
    function getChampionImage(name: string): string {
      return battleStore.getChampionImage(name)
    }
    function onImgError(e: Event) {
      ;(e.target as HTMLImageElement).style.display = 'none'
    }
    function startMission(configId: string) {
      const config = MISSION_CONFIGS.find((m) => m.id === configId)
      if (!config) return
      const sel = selections[configId] ?? {}
      const assigned = config.requiredRoles.map((role, idx) => ({ name: sel[idx], role }))
      if (assigned.some((a) => !a.name)) return
      if (missionStore.startMission(configId, assigned)) delete selections[configId]
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
