<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { MATERIALS } from '@/config/materials'
import { formatNumber } from '@/config/numberFormat'

const inventoryStore = useInventoryStore()

const materials = computed(() =>
  MATERIALS.map((m) => ({ ...m, count: inventoryStore.collectedMaterials[m.id] ?? 0 })),
)

// Individuelle Farbe pro Material-ID
const MATERIAL_COLOR: Record<string, string> = {
  stardust: '#fde68a', // warmes Goldgelb  – Sternstaub
  moon_crystal: '#bae6fd', // eisiges Hellblau  – Mondkristall
  nebula_quartz: '#6ee7b7', // mintgrün          – Nebelquarz
  solar_essence: '#fb923c', // leuchtendes Orange – Sonnenessenz
  void_shard: '#a78bfa', // tiefes Violett    – Leerscherbe
  dark_matter: '#f472b6', // pinkmagenta       – Dunkle Materie
}
</script>

<template>
  <div class="mat-grid">
    <div
      v-for="m in materials"
      :key="m.id"
      class="mat-cell"
      :class="{ 'mat-cell--empty': m.count === 0 }"
      :title="m.name"
    >
      <img :src="m.image" class="mat-icon rpg-img" :alt="m.name" />
      <span class="mat-count" :style="{ color: MATERIAL_COLOR[m.id] }">
        {{ formatNumber(m.count) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.mat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 8px;
  padding: 6px 10px;
  width: 100%;
  min-width: 0;
  height: 100%;
  align-content: center;
  box-sizing: border-box;
}

.mat-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
  overflow: hidden;
  transition: opacity 0.15s;
}

.mat-cell--empty {
  opacity: 0.25;
  filter: grayscale(0.8);
}

.mat-icon {
  width: clamp(18px, 3vw, 32px);
  height: clamp(18px, 3vw, 32px);
  min-width: 18px;
  min-height: 18px;
  object-fit: contain;
  flex-shrink: 1;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.5));
  user-select: none;
}

.mat-count {
  font-size: clamp(0.75rem, 1.2vw, 1.2rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}
</style>
