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
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.group-icon {
  flex-shrink: 0;
}

.group-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
}

.group-rows {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 22px;
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
  font-size: 17px;
  font-weight: 700;
  color: #e8e2d0;
  line-height: 1.15;
}

.row-label {
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #8a8070;
  white-space: normal;
  line-height: 1.3;
}
</style>
