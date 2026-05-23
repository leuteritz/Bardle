<template>
  <div class="flex flex-col w-full gap-3">

    <!-- ── SCHRITT 1: Expedition wählen ───────────────────────── -->
    <template v-if="!selectedConfigId">
      <div v-if="!expeditionStore.canStartExpedition" class="ec-warning">
        ⚠️ Maximum erreicht ({{ MAX_ACTIVE_EXPEDITIONS }})
      </div>
      <div class="ec-grid">
        <button
          v-for="config in expeditionConfigs"
          :key="config.id"
          class="ec-tile"
          :class="expeditionStore.canStartExpedition ? 'ec-tile--available' : 'ec-tile--locked'"
          :disabled="!expeditionStore.canStartExpedition"
          @click="expeditionStore.canStartExpedition && selectConfig(config.id)"
        >
          <div class="ec-tile-icon">
            <img v-if="config.icon.startsWith('/')" :src="config.icon" :alt="config.name" class="ec-tile-img" />
            <span v-else>{{ config.icon }}</span>
          </div>
          <div class="ec-tile-name">{{ config.name }}</div>
          <div class="ec-tile-meta">{{ formatDuration(config.durationSeconds) }} · 🎵 {{ config.baseReward }}</div>
          <div class="ec-tile-roles">
            <span
              v-for="role in config.requiredRoles"
              :key="role"
              class="ec-role-dot"
              :class="'ec-role-dot--' + role"
            >{{ roleShort[role] }}</span>
          </div>
        </button>
      </div>
    </template>

    <!-- ── SCHRITT 2: Champions zuweisen ─────────────────────── -->
    <template v-else>
      <div class="ec-step2-header">
        <button class="ec-back-btn" @click="selectedConfigId = null">← Zurück</button>
        <div class="ec-selected-info">
          <span class="ec-selected-icon">
            <img v-if="selectedConfig!.icon.startsWith('/')" :src="selectedConfig!.icon" :alt="selectedConfig!.name" class="ec-tile-img" />
            <span v-else>{{ selectedConfig!.icon }}</span>
          </span>
          <span class="ec-selected-name">{{ selectedConfig!.name }}</span>
          <span class="ec-selected-meta">{{ formatDuration(selectedConfig!.durationSeconds) }} · 🎵 {{ selectedConfig!.baseReward }}</span>
        </div>
      </div>

      <div class="ec-roles-list">
        <div v-for="(role, roleIdx) in selectedConfig!.requiredRoles" :key="role + '-' + roleIdx" class="ec-role-row">
          <div class="ec-role-label-row">
            <span class="ec-role-badge" :class="'ec-role-badge--' + role">{{ role }}</span>
            <span v-if="getSelection(selectedConfigId, roleIdx)" class="ec-role-selected-name">
              {{ getSelection(selectedConfigId, roleIdx) }}
            </span>
            <span v-else class="ec-role-placeholder">— wählen</span>
          </div>
          <div class="ec-champ-row">
            <button
              v-for="champ in getAvailableChampions(selectedConfigId, roleIdx, role)"
              :key="champ"
              class="ec-champ-pick"
              :class="
                getSelection(selectedConfigId, roleIdx) === champ
                  ? 'ec-champ-pick--selected'
                  : isSelectedElsewhere(selectedConfigId, roleIdx, champ)
                    ? 'ec-champ-pick--disabled'
                    : 'ec-champ-pick--available'
              "
              :disabled="isSelectedElsewhere(selectedConfigId, roleIdx, champ)"
              @click="toggleSelection(selectedConfigId, roleIdx, champ)"
            >
              <img
                :src="getChampionImage(champ)"
                :alt="champ"
                class="ec-champ-img rpg-img"
                @error="onImgError"
              />
              <div v-if="getSelection(selectedConfigId, roleIdx) === champ" class="ec-champ-check">✓</div>
            </button>
            <span v-if="getAvailableChampions(selectedConfigId, roleIdx, role).length === 0" class="ec-role-placeholder">
              Kein {{ role }}-Champion verfügbar
            </span>
          </div>
        </div>
      </div>

      <div class="ec-footer">
        <span v-if="isFullyAssigned(selectedConfigId, selectedConfig!.requiredRoles.length)" class="ec-chance" :class="getSuccessChanceColor(getSuccessChance(selectedConfigId))">
          {{ Math.round(getSuccessChance(selectedConfigId) * 100) }}% Erfolgschance
        </span>
        <span v-else class="ec-role-placeholder">Alle Rollen besetzen …</span>
        <button
          @click="startExpedition(selectedConfigId)"
          :disabled="!canStart(selectedConfigId, selectedConfig!.requiredRoles.length)"
          class="ec-start-btn"
          :class="canStart(selectedConfigId, selectedConfig!.requiredRoles.length) ? 'rpg-btn-green' : 'rpg-btn-disabled'"
        >
          Entsenden
        </button>
      </div>
    </template>

  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed } from 'vue'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { useBattleStore } from '@/stores/battleStore'
import { EXPEDITION_CONFIGS } from '@/config/expedition'
import { getChampionRoles } from '@/config/championRoles'
import { MAX_ACTIVE_EXPEDITIONS } from '@/config/constants'
import type { ChampionRole } from '@/types'

export default defineComponent({
  name: 'ExpeditionCreateComponent',
  setup() {
    const expeditionStore = useExpeditionStore()
    const battleStore = useBattleStore()
    const selections = reactive<Record<string, Record<number, string>>>({})
    const selectedConfigId = ref<string | null>(null)

    const selectedConfig = computed(() =>
      selectedConfigId.value
        ? EXPEDITION_CONFIGS.find((e) => e.id === selectedConfigId.value) ?? null
        : null,
    )

    const roleShort: Record<ChampionRole, string> = {
      top: 'T',
      jungle: 'J',
      mid: 'M',
      adc: 'A',
      support: 'S',
    }

    function selectConfig(id: string) {
      selectedConfigId.value = id
    }

    function getSelection(configId: string, roleIdx: number): string {
      return selections[configId]?.[roleIdx] ?? ''
    }
    function setSelection(configId: string, roleIdx: number, value: string) {
      if (!selections[configId]) selections[configId] = {}
      selections[configId][roleIdx] = value
    }
    function getAvailableChampions(configId: string, roleIdx: number, role: ChampionRole): string[] {
      const onExpedition = expeditionStore.championsOnExpedition
      const owned = battleStore.ownedChampions.filter(
        (c) => c !== 'Bard' && !onExpedition.includes(c),
      )
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
      return expeditionStore.canStartExpedition && isFullyAssigned(configId, roleCount)
    }
    function getSuccessChance(configId: string): number {
      const config = EXPEDITION_CONFIGS.find((e) => e.id === configId)
      if (!config) return 0
      const sel = selections[configId] ?? {}
      const assigned = config.requiredRoles.map((role, idx) => ({ name: sel[idx] ?? '', role }))
      if (assigned.some((a) => !a.name)) return 0
      return expeditionStore.calculateSuccessChance(assigned, configId)
    }
    function getSuccessChanceColor(chance: number): string {
      if (chance >= 0.7) return 'ec-chance--high'
      if (chance >= 0.4) return 'ec-chance--mid'
      return 'ec-chance--low'
    }
    function formatDuration(seconds: number): string {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      if (min === 0) return `${sec}s`
      if (sec === 0) return `${min}m`
      return `${min}m ${sec}s`
    }
    function toggleSelection(configId: string, roleIdx: number, champ: string) {
      if (getSelection(configId, roleIdx) === champ) {
        setSelection(configId, roleIdx, '')
      } else {
        setSelection(configId, roleIdx, champ)
      }
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
    function startExpedition(configId: string) {
      const config = EXPEDITION_CONFIGS.find((e) => e.id === configId)
      if (!config) return
      const sel = selections[configId] ?? {}
      const assigned = config.requiredRoles.map((role, idx) => ({ name: sel[idx], role }))
      if (assigned.some((a) => !a.name)) return
      if (expeditionStore.startExpedition(configId, assigned)) {
        delete selections[configId]
        selectedConfigId.value = null
      }
    }

    return {
      expeditionStore,
      expeditionConfigs: EXPEDITION_CONFIGS,
      selections,
      selectedConfigId,
      selectedConfig,
      roleShort,
      selectConfig,
      getSelection,
      toggleSelection,
      getAvailableChampions,
      isSelectedElsewhere,
      getChampionImage,
      onImgError,
      isFullyAssigned,
      canStart,
      getSuccessChance,
      getSuccessChanceColor,
      formatDuration,
      startExpedition,
      MAX_ACTIVE_EXPEDITIONS,
    }
  },
})
</script>

<style scoped>
/* ── Warning ────────────────────────────── */
.ec-warning {
  background: #1a1008;
  border: 1px solid #cc6050;
  border-radius: 4px;
  color: #cc6050;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
}

/* ── Step 1: Kachel-Grid ─────────────────── */
.ec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ec-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 10px 12px;
  background: #1a1008;
  border: 1px solid #3e2010;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.ec-tile--available:hover {
  border-color: #c89040;
  background: #1e1408;
}
.ec-tile--locked {
  opacity: 0.4;
  cursor: not-allowed;
}
.ec-tile-icon {
  font-size: 20px;
  line-height: 1;
}
.ec-tile-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  image-rendering: pixelated;
}
.ec-tile-name {
  font-size: 11px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.04em;
  line-height: 1.2;
}
.ec-tile-meta {
  font-size: 10px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.5);
}
.ec-tile-roles {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}
.ec-role-dot {
  font-size: 8px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 3px;
  letter-spacing: 0.06em;
}
.ec-role-dot--top    { background: rgba(239,68,68,0.2); color: #fca5a5; }
.ec-role-dot--jungle { background: rgba(34,197,94,0.2); color: #86efac; }
.ec-role-dot--mid    { background: rgba(59,130,246,0.2); color: #93c5fd; }
.ec-role-dot--adc    { background: rgba(245,158,11,0.2); color: #fcd34d; }
.ec-role-dot--support{ background: rgba(168,85,247,0.2); color: #d8b4fe; }

/* ── Step 2: Header ──────────────────────── */
.ec-step2-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #3e2010;
}
.ec-back-btn {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: rgba(200, 144, 64, 0.55);
  background: transparent;
  border: 1px solid #3e2010;
  border-radius: 4px;
  padding: 4px 9px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;
}
.ec-back-btn:hover {
  color: #e8c040;
  border-color: #c89040;
}
.ec-selected-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.ec-selected-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}
.ec-selected-name {
  font-size: 13px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-selected-meta {
  font-size: 10px;
  color: rgba(200, 144, 64, 0.45);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Step 2: Rollen-Zuweisung ────────────── */
.ec-roles-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ec-role-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ec-role-label-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.ec-role-badge {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 3px;
  flex-shrink: 0;
}
.ec-role-badge--top    { background: rgba(239,68,68,0.2); color: #fca5a5; }
.ec-role-badge--jungle { background: rgba(34,197,94,0.2); color: #86efac; }
.ec-role-badge--mid    { background: rgba(59,130,246,0.2); color: #93c5fd; }
.ec-role-badge--adc    { background: rgba(245,158,11,0.2); color: #fcd34d; }
.ec-role-badge--support{ background: rgba(168,85,247,0.2); color: #d8b4fe; }

.ec-role-selected-name {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.65);
}
.ec-role-placeholder {
  font-size: 10px;
  color: rgba(255,255,255,0.2);
}
.ec-champ-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.ec-champ-pick {
  position: relative;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 3px;
  cursor: pointer;
  background: transparent;
  transition: border-color 0.12s, background 0.12s;
}
.ec-champ-pick--available {
  background: #141410;
  border-color: rgba(92, 51, 16, 0.4);
}
.ec-champ-pick--available:hover {
  border-color: #c89040;
  background: #1e1408;
}
.ec-champ-pick--selected {
  background: rgba(82, 184, 48, 0.12);
  border-color: #52b830;
}
.ec-champ-pick--disabled {
  opacity: 0.3;
  filter: grayscale(60%);
  cursor: not-allowed;
}
.ec-champ-img {
  width: 32px;
  height: 32px;
  object-fit: cover;
  object-position: top center;
  border-radius: 3px;
  display: block;
}
.ec-champ-check {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #52b830;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: white;
  font-weight: 900;
}

/* ── Step 2: Footer ──────────────────────── */
.ec-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
  border-top: 1px solid #3e2010;
  margin-top: 2px;
}
.ec-chance {
  font-size: 12px;
  font-weight: 900;
}
.ec-chance--high { color: #52b830; }
.ec-chance--mid  { color: #e8c040; }
.ec-chance--low  { color: #cc6050; }
.ec-start-btn {
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.06em;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.ec-start-btn:active:not(:disabled) {
  transform: scale(0.96);
}
</style>
