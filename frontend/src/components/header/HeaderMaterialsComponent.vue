<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { MATERIALS } from '@/config/materials'
import { MATERIAL_RARITY_COLOR } from '@/composables/useRarityColors'

const inventoryStore = useInventoryStore()

const materials = computed(() =>
  MATERIALS.map((m) => ({ ...m, count: inventoryStore.collectedMaterials[m.id] ?? 0 })),
)
</script>

<template>
  <div class="mat-grid">
    <div
      v-for="m in materials"
      :key="m.id"
      class="mat-cell"
      :class="{ 'mat-cell--empty': m.count === 0 }"
    >
      <img :src="m.image" class="mat-icon rpg-img" :alt="m.name" />
      <span class="mat-count" :style="{ color: MATERIAL_RARITY_COLOR[m.rarity] }">
        {{ m.count }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.mat-grid {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: 6px 14px;
  align-items: center;
  align-self: stretch;
  padding: 8px 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

.mat-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s;
}

.mat-cell--empty {
  opacity: 0.3;
  filter: grayscale(0.7);
}

.mat-icon {
  width: clamp(28px, 3.2vw, 44px);
  height: clamp(28px, 3.2vw, 44px);
  object-fit: contain;
  flex-shrink: 0;
}

.mat-count {
  font-size: clamp(0.85rem, 1.1vw, 1.1rem);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  min-width: 22px;
}
</style>
