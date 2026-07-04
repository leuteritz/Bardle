<template>
  <div class="stat-group">
    <div class="group-header" :style="{ color: color }">
      <Icon :icon="icon" width="24" height="24" class="group-icon" />
      <span class="group-title">{{ title }}</span>
      <span v-if="live" class="live-dot" title="Updating live" />
    </div>
    <div class="group-rows">
      <div v-for="row in rows" :key="row.label" class="group-row">
        <span class="row-label">{{ row.label }}</span>
        <span class="row-value" :style="row.color ? { color: row.color } : undefined">{{ row.value }}</span>
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
  live?: boolean
}>()
</script>

<style scoped>
.stat-group {
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(212, 160, 32, 0.12);
  border-radius: 5px;
  padding: 12px 14px;
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #52b830;
  box-shadow: 0 0 6px rgba(82, 184, 48, 0.8);
  margin-left: auto;
  animation: live-pulse 1.4s ease-in-out infinite;
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .live-dot { animation: none; }
}

.group-rows {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  align-content: center;
  min-height: 0;
}

.group-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.row-label {
  font-size: 12px;
  color: #8a8070;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-value {
  font-size: 13px;
  color: #e8e2d0;
  white-space: nowrap;
}
</style>
