<template>
  <div class="stat-group">
    <div class="group-header" :style="{ color: color }">
      <Icon :icon="icon" width="24" height="24" class="group-icon" />
      <span class="group-title">{{ title }}</span>
    </div>
    <div class="group-rows">
      <div v-for="row in rows" :key="row.label" class="group-row">
        <span class="row-value" :style="row.color ? { color: row.color } : undefined">{{ row.value }}</span>
        <span class="row-label">{{ row.label }}</span>
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
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(212, 160, 32, 0.12);
  border-radius: 5px;
  padding: clamp(8px, 1.3vh, 13px) clamp(12px, 1.1vw, 18px);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: clamp(4px, 0.7vh, 8px);
  flex-shrink: 0;
}

.group-icon {
  flex-shrink: 0;
}

.group-title {
  font-size: clamp(11px, 1.3vh, 13px);
  font-weight: 700;
  letter-spacing: 2px;
}

.group-rows {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(4px, 0.8vh, 10px) clamp(14px, 1.3vw, 22px);
  align-content: space-evenly;
  min-height: 0;
}

/* Stacked tile: big value on top, label beneath — labels own the full
   column width and may wrap, so nothing ever truncates. */
.group-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.row-value {
  font-size: clamp(13px, 1.6vh, 16px);
  font-weight: 700;
  color: #e8e2d0;
  line-height: 1.15;
}

.row-label {
  font-size: clamp(8px, 1vh, 10px);
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #8a8070;
  white-space: normal;
  line-height: 1.25;
}

/* short viewports: value and label share one line — halves the row height
   so all four groups fit the 2×2 grid without spilling over */
@media (max-height: 999px) {
  .group-row {
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
  }
  .row-label {
    font-size: 8px;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
