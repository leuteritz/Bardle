<template>
  <!-- One flank of the rank band: a handful of headline career numbers, kept
       large enough to read at a glance from across the screen. -->
  <div class="stat-column" :class="`stat-column--${align}`">
    <div class="column-header">
      <Icon :icon="group.icon" width="24" height="24" class="column-icon" :style="{ color: group.color }" />
      <span class="column-title" :style="{ color: group.color }">{{ group.title }}</span>
    </div>

    <div class="column-rows">
      <div v-for="row in group.rows" :key="row.label" class="column-row">
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
        <span class="row-label">{{ row.label }}</span>
        <!-- Optional share bar (win/loss split) directly under its number -->
        <span v-if="row.bar !== undefined" class="row-bar">
          <span class="row-bar-fill" :style="{ width: row.bar + '%' }" />
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

export interface RankStatRow {
  label: string
  value: string
  color?: string
  /* canonical battle-stat visuals (BATTLE_STAT_GAME_ICONS / BATTLE_STAT_IMAGES)
     so the landing page mirrors the scoreboards' iconography */
  gameIcon?: string
  image?: string
  /** 0–100: renders a slim share bar under the row (used for the win/loss split) */
  bar?: number
}

export interface RankStatGroup {
  title: string
  icon: string
  color: string
  rows: RankStatRow[]
}

defineProps<{
  group: RankStatGroup
  align: 'left' | 'right'
}>()
</script>

<style scoped>
.stat-column {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.9vh, 11px);
  min-width: 0;
}
.stat-column--left {
  align-items: flex-start;
  text-align: left;
}
.stat-column--right {
  align-items: flex-end;
  text-align: right;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-bottom: clamp(4px, 0.6vh, 7px);
  border-bottom: 1px solid #2b2312;
  align-self: stretch;
}
.stat-column--right .column-header {
  flex-direction: row-reverse;
}

.column-icon {
  width: clamp(15px, 2vh, 20px);
  height: clamp(15px, 2vh, 20px);
  flex-shrink: 0;
}

.column-title {
  font-size: clamp(10px, 1.25vh, 13px);
  font-weight: 700;
  letter-spacing: 3px;
  white-space: nowrap;
}

/* Centred as one compact block — spreading four numbers over a tall band would
   read as scattered rather than as a group. */
.column-rows {
  flex: 1;
  min-height: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(8px, 1.2vh, 18px);
}

.column-row {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.stat-column--right .column-row {
  align-items: flex-end;
}

/* Win/loss split — the loss share is the exposed track behind the fill */
.row-bar {
  align-self: stretch;
  margin-top: 4px;
  height: 5px;
  background: #4a2018;
  border: 1px solid #241d10;
  border-radius: 4px;
  overflow: hidden;
}

.row-bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(to right, #2e7a1a, #52b830);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.row-value-line {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.stat-column--right .row-value-line {
  flex-direction: row-reverse;
}

.row-icon {
  width: clamp(15px, 1.9vh, 20px);
  height: clamp(15px, 1.9vh, 20px);
  flex-shrink: 0;
  object-fit: contain;
  color: #b0a890;
  opacity: 0.9;
}

.row-value {
  font-size: clamp(20px, 2.9vh, 34px);
  font-weight: 700;
  color: #e8e2d0;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-label {
  font-size: clamp(9px, 1.1vh, 12px);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #8a8070;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Full HD and flatter: the flanks tighten so the rank band leaves the roster
   cards enough height — the numbers stay large, only the air between them goes. */
@media (max-height: 1100px) {
  .column-rows {
    gap: 6px;
  }
  .row-value {
    font-size: 24px;
  }
  .column-header {
    padding-bottom: 4px;
  }
  .row-bar {
    margin-top: 3px;
    height: 4px;
  }
}
</style>
