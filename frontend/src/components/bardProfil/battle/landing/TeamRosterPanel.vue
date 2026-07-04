<template>
  <div class="roster-panel">
    <div class="roster-head">
      <span class="roster-title">YOUR TEAM</span>
      <span class="ready-badge" :class="hasFullTeam ? 'ready-badge--full' : 'ready-badge--open'">
        {{ teamProgress }} / 5 {{ hasFullTeam ? 'READY' : 'OPEN' }}
      </span>
    </div>

    <div class="roster-rows">
      <div
        v-for="(role, idx) in ROLES"
        :key="role.key"
        class="roster-row"
        :class="battleStore.headerSlots[idx] ? 'roster-row--filled' : 'roster-row--empty'"
      >
        <img :src="role.image" :alt="role.label" class="row-role-icon" />
        <template v-if="battleStore.headerSlots[idx]">
          <img
            :src="battleStore.getChampionImage(battleStore.headerSlots[idx]!)"
            :alt="battleStore.headerSlots[idx]!"
            class="row-champ-img"
          />
          <div class="row-names">
            <div class="row-champ-name">{{ battleStore.headerSlots[idx] }}</div>
            <div class="row-role-label">{{ role.long }}</div>
          </div>
          <span class="row-ready">✓</span>
        </template>
        <template v-else>
          <div class="row-empty-circle" />
          <div class="row-names">
            <div class="row-champ-name row-champ-name--empty">Empty slot</div>
            <div class="row-role-label">{{ role.long }}</div>
          </div>
        </template>
      </div>
    </div>

    <button
      class="start-btn"
      :class="{ 'start-btn--locked': !hasFullTeam }"
      :disabled="isStarting || !hasFullTeam"
      :title="!hasFullTeam ? `${5 - teamProgress} role(s) still open` : ''"
      @click="$emit('start')"
    >
      <Icon
        v-if="isStarting"
        icon="game-icons:sundial"
        width="22"
        height="22"
        style="color: #e8c040"
      />
      <img v-else-if="!hasFullTeam" src="/img/lock.png" alt="Locked" class="start-btn-lock" />
      <img v-else src="/img/menu/BATTLE.png" alt="Battle" class="start-btn-img" />
      <span v-if="isStarting">STARTING…</span>
      <span v-else-if="!hasFullTeam">{{ 5 - teamProgress }} SLOT{{ 5 - teamProgress !== 1 ? 'S' : '' }} OPEN</span>
      <span v-else>START BATTLE</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'

defineProps<{ isStarting: boolean }>()
defineEmits<{ start: [] }>()

const ROLES = [
  { key: 'top', label: 'TOP', long: 'TOP · VANGUARD', image: '/img/roles/top.png' },
  { key: 'jungle', label: 'JGL', long: 'JUNGLE · SKIRMISHER', image: '/img/roles/jungle.png' },
  { key: 'mid', label: 'MID', long: 'MID · BURST MAGE', image: '/img/roles/mid.png' },
  { key: 'bot', label: 'BOT', long: 'BOT · MARKSMAN', image: '/img/roles/adc.png' },
  { key: 'support', label: 'SUP', long: 'SUPPORT · ROAMING', image: '/img/roles/supp.png' },
] as const

const battleStore = useBattleStore()
const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)
const hasFullTeam = computed(() => teamProgress.value >= 5)
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
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-radius: 5px;
  min-height: 52px;
}
.roster-row--filled {
  background: rgba(96, 165, 250, 0.05);
  border: 1px solid rgba(74, 138, 40, 0.28);
  border-left: 3px solid #4a8a28;
}
.roster-row--empty {
  background: rgba(14, 10, 4, 0.6);
  border: 1px dashed rgba(90, 60, 20, 0.4);
}

.row-role-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: 0.7;
  flex-shrink: 0;
}

.row-champ-img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #4a8a28;
  flex-shrink: 0;
}

.row-empty-circle {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px dashed rgba(90, 60, 20, 0.5);
  flex-shrink: 0;
}

.row-names {
  flex: 1;
  min-width: 0;
}

.row-champ-name {
  font-size: 14px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-champ-name--empty {
  color: #5a4820;
}

.row-role-label {
  font-size: 10px;
  color: #6a5820;
  letter-spacing: 2px;
}

.row-ready {
  color: #52b830;
  font-size: 15px;
  flex-shrink: 0;
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
