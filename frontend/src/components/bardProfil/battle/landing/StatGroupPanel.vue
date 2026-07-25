<template>
  <!-- Ledger panel: one career category as a compact two-column label/value list.
       Deliberately quiet — the stage's focus belongs to rank, roster and start button. -->
  <div class="stat-group">
    <div class="group-header">
      <Icon :icon="icon" width="24" height="24" class="group-icon" :style="{ color }" />
      <span class="group-title" :style="{ color }">{{ title }}</span>
    </div>
    <div class="group-rows">
      <div v-for="row in rows" :key="row.label" class="group-row">
        <span class="row-label">{{ row.label }}</span>
        <span class="row-value-line">
          <img v-if="row.image" :src="row.image" :alt="row.label" class="row-icon" />
          <Icon
            v-else-if="row.gameIcon"
            :icon="row.gameIcon"
            width="24"
            height="24"
            class="row-icon"
            :style="row.color ? { color: row.color } : undefined"
          />
          <span class="row-value" :style="row.color ? { color: row.color } : undefined">
            {{ row.value }}
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

export interface StatRow {
  label: string
  value: string
  color?: string
  /* canonical battle-stat visuals (BATTLE_STAT_GAME_ICONS / BATTLE_STAT_IMAGES)
     so the landing page mirrors the scoreboards' iconography */
  gameIcon?: string
  image?: string
}

defineProps<{
  title: string
  icon: string
  color: string
  rows: StatRow[]
}>()
</script>

<style scoped>
.stat-group {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: clamp(8px, 1.2vh, 14px) clamp(9px, 0.8vw, 15px);
  background: #0f0d08;
  border: 1px solid #241d10;
  border-radius: 5px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding-bottom: clamp(4px, 0.7vh, 8px);
  margin-bottom: clamp(4px, 0.7vh, 8px);
  border-bottom: 1px solid #241d10;
}

.group-icon {
  width: clamp(14px, 1.8vh, 18px);
  height: clamp(14px, 1.8vh, 18px);
  flex-shrink: 0;
}

.group-title {
  font-size: clamp(9px, 1.15vh, 12px);
  font-weight: 700;
  letter-spacing: 2.5px;
}

/* Two columns keep the panel short — the ledger must never steal height from
   the roster cards above it. */
.group-rows {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-content: space-between;
  gap: clamp(2px, 0.4vh, 5px) clamp(10px, 0.9vw, 18px);
}

/* Label left, value right — reads as a ledger, scannable at a glance */
.group-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.row-label {
  font-size: clamp(8px, 1vh, 10px);
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #8a8070;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-value-line {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.row-icon {
  width: clamp(11px, 1.4vh, 14px);
  height: clamp(11px, 1.4vh, 14px);
  flex-shrink: 0;
  object-fit: contain;
  color: #b0a890;
  opacity: 0.9;
}

.row-value {
  font-size: clamp(11px, 1.45vh, 14px);
  font-weight: 700;
  color: #e8e2d0;
  line-height: 1.15;
  white-space: nowrap;
}
</style>
