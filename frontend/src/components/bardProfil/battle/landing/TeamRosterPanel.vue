<template>
  <div class="roster-panel">
    <div class="roster-head">
      <span class="roster-title">YOUR TEAM</span>
      <span v-if="isBattleLive" class="ready-badge ready-badge--full">LIVE</span>
      <span
        v-else
        class="ready-badge"
        :class="hasFullTeam ? 'ready-badge--full' : 'ready-badge--open'"
      >
        {{ teamProgress }} / 5 {{ hasFullTeam ? 'READY' : 'OPEN' }}
      </span>
    </div>

    <div class="roster-rows">
      <div
        v-for="(role, idx) in roleRows"
        :key="role.key"
        class="roster-row"
        :class="battleStore.headerSlots[idx] ? 'roster-row--filled' : 'roster-row--empty'"
        :style="rowStyle(role, !!battleStore.headerSlots[idx])"
      >
        <template v-if="battleStore.headerSlots[idx]">
          <img
            :src="battleStore.getChampionImage(battleStore.headerSlots[idx]!)"
            :alt="battleStore.headerSlots[idx]!"
            class="row-champ-img"
          />
          <div class="row-names">
            <div class="row-champ-name">{{ battleStore.headerSlots[idx] }}</div>
            <div class="row-role-label" :style="{ color: role.color }">{{ role.roleLabel }}</div>
          </div>
        </template>
        <template v-else>
          <div class="row-empty-slot" :style="{ borderColor: hexToRgba(role.color, 0.45) }" />
          <div class="row-names">
            <div class="row-champ-name row-champ-name--empty">Empty slot</div>
            <div class="row-role-label" :style="{ color: hexToRgba(role.color, 0.55) }">
              {{ role.roleLabel }}
            </div>
          </div>
        </template>
      </div>
    </div>

    <button
      class="start-btn"
      :class="{ 'start-btn--locked': !hasFullTeam && !isBattleLive }"
      :disabled="isStarting || (!hasFullTeam && !isBattleLive)"
      :title="!hasFullTeam && !isBattleLive ? `${5 - teamProgress} role(s) still open` : ''"
      @click="$emit('start')"
    >
      <Icon
        v-if="isStarting"
        icon="game-icons:sundial"
        width="22"
        height="22"
        style="color: #e8c040"
      />
      <img
        v-else-if="!hasFullTeam && !isBattleLive"
        src="/img/lock.png"
        alt="Locked"
        class="start-btn-lock"
      />
      <img v-else src="/img/menu/BATTLE.png" alt="Battle" class="start-btn-img" />
      <span v-if="isStarting">STARTING…</span>
      <span v-else-if="isBattleLive">RETURN TO LIVE BATTLE</span>
      <span v-else-if="!hasFullTeam">{{ 5 - teamProgress }} SLOT{{ 5 - teamProgress !== 1 ? 'S' : '' }} OPEN</span>
      <span v-else>START BATTLE</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { ROLES } from '@/config/constants'

defineProps<{ isStarting: boolean }>()
defineEmits<{ start: [] }>()

// Same order as battleStore.headerSlots: top, jungle, mid, adc, support
const roleRows = ROLES.map((r) => ({
  key: r.key,
  roleLabel: r.key.toUpperCase(),
  color: r.color,
}))

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function rowStyle(role: { color: string }, filled: boolean): CSSProperties {
  if (!filled) return { borderLeft: `3px solid ${hexToRgba(role.color, 0.3)}` }
  return {
    borderLeft: `3px solid ${role.color}`,
    background: `linear-gradient(90deg, ${hexToRgba(role.color, 0.12)}, rgba(0, 0, 0, 0.25))`,
  }
}

const battleStore = useBattleStore()
const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)
const hasFullTeam = computed(() => teamProgress.value >= 5)
const isBattleLive = computed(() => battleStore.isAutoBattleInitialized)
</script>

<style scoped>
.roster-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(212, 160, 32, 0.12);
  border-radius: 5px;
  padding: 14px 16px;
}

.roster-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.roster-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #d4a020;
}

.ready-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 2px 9px;
  border-radius: 4px;
}
.ready-badge--full {
  color: #52b830;
  border: 1px solid rgba(74, 138, 40, 0.5);
  background: rgba(74, 138, 40, 0.12);
}
.ready-badge--open {
  color: #cc6050;
  border: 1px solid rgba(204, 96, 80, 0.4);
  background: rgba(204, 96, 80, 0.1);
}

.roster-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.roster-row {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px 0 0;
  border-radius: 5px;
  min-height: 68px;
}
.roster-row--filled {
  border-top: 1px solid rgba(0, 0, 0, 0.35);
  border-right: 1px solid rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(0, 0, 0, 0.35);
}
.roster-row--empty {
  background: rgba(14, 10, 4, 0.6);
  border-top: 1px dashed rgba(90, 60, 20, 0.4);
  border-right: 1px dashed rgba(90, 60, 20, 0.4);
  border-bottom: 1px dashed rgba(90, 60, 20, 0.4);
  opacity: 0.75;
}

/* Splash portrait: full row height, fades into the role-tinted card */
.row-champ-img {
  align-self: stretch;
  width: 96px;
  object-fit: cover;
  flex-shrink: 0;
  -webkit-mask-image: linear-gradient(to right, #000 55%, transparent 100%);
  mask-image: linear-gradient(to right, #000 55%, transparent 100%);
}

.row-empty-slot {
  align-self: stretch;
  width: 96px;
  margin: 6px 0 6px 6px;
  border-radius: 4px;
  border: 2px dashed rgba(90, 60, 20, 0.5);
  flex-shrink: 0;
}

.row-names {
  flex: 1;
  min-width: 0;
  padding-left: 12px;
}

.row-champ-name {
  font-size: 17px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}
.row-champ-name--empty {
  color: #5a4820;
}

.row-role-label {
  font-size: 11px;
  letter-spacing: 2px;
}

/* ── Start button ── */
.start-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 3px;
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border: 2px solid #4a8a28;
  border-radius: 5px;
  color: #8ee060;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(74, 138, 40, 0.3);
  transition: all 0.15s;
}
.start-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #28401a, #1a2a10);
  border-color: #6ec040;
  box-shadow: 0 0 32px rgba(82, 184, 48, 0.55);
}
.start-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.start-btn--locked {
  background: linear-gradient(to bottom, #150e06, #0e0904) !important;
  border-color: #3a2010 !important;
  color: #4a3018 !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  font-size: 14px;
}

.start-btn-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.start-btn-lock {
  width: 20px;
  height: 20px;
  object-fit: contain;
  opacity: 0.7;
}
</style>
