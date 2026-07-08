<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { MATERIALS } from '@/config/materials'
import { formatNumber } from '@/config/numberFormat'
import {
  MATERIAL_COLOR,
  MATERIAL_PLACEHOLDER_LABELS,
  HEADER_MATERIALS_GRID_COLUMNS,
} from '@/config/constants'

const inventoryStore = useInventoryStore()

const materials = computed(() =>
  MATERIALS.map((m) => ({ ...m, count: inventoryStore.collectedMaterials[m.id] ?? 0 })),
)

const gridStyle = { gridTemplateColumns: `repeat(${HEADER_MATERIALS_GRID_COLUMNS}, minmax(0, 1fr))` }
</script>

<template>
  <div class="mat-grid" :style="gridStyle">
    <div
      v-for="m in materials"
      :key="m.id"
      class="mat-cell"
      :class="{ 'mat-cell--empty': m.count === 0 }"
      :title="m.name"
    >
      <img v-if="m.image" :src="m.image" class="mat-icon rpg-img" :alt="m.name" />
      <span v-else class="mat-ph" :style="{ color: MATERIAL_COLOR[m.id] }">
        {{ MATERIAL_PLACEHOLDER_LABELS[m.id] ?? m.name.slice(0, 2).toUpperCase() }}
      </span>
      <span class="mat-count" :style="{ color: MATERIAL_COLOR[m.id] }">
        {{ formatNumber(m.count) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.mat-grid {
  display: grid;
  gap: clamp(3px, 0.5vw, 7px) clamp(6px, 1vw, 14px);
  padding: 6px 0;
  width: 100%;
  min-width: 0;
  height: 100%;
  align-content: center;
  box-sizing: border-box;
}

.mat-cell {
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.5vw, 7px);
  flex-wrap: nowrap;
  min-width: 0;
  overflow: hidden;
  transition: opacity 0.15s;
}

.mat-cell--empty {
  opacity: 0.32;
  filter: grayscale(0.6);
}

.mat-icon {
  width: clamp(16px, 1.9vw, 26px);
  height: clamp(16px, 1.9vw, 26px);
  min-width: 16px;
  min-height: 16px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.5));
  user-select: none;
}

/* Placeholder box for materials without artwork yet */
.mat-ph {
  width: clamp(16px, 1.9vw, 26px);
  height: clamp(16px, 1.9vw, 26px);
  flex-shrink: 0;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(45deg, #2b2117, #2b2117 3px, #1b150e 3px, #1b150e 6px);
  border: 1px solid rgba(255, 200, 80, 0.2);
  font-family: ui-monospace, Menlo, monospace;
  font-size: clamp(6px, 0.5vw, 7px);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: none;
}

.mat-count {
  font-size: clamp(0.68rem, 0.85vw, 0.92rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}
</style>
