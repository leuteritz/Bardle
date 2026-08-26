<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { MATERIALS } from '@/config/economy/materials'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import RpgBadgeTooltip from '../ui/RpgBadgeTooltip.vue'
import MaterialStatsTooltip from './MaterialStatsTooltip.vue'
import {
  MATERIAL_COLOR,
  MATERIAL_PLACEHOLDER_LABELS,
  HEADER_MATERIALS_GRID_COLUMNS,
  MATERIAL_EMPTY_GLYPH,
  MATERIAL_TOOLTIP_WIDTH,
  MATERIAL_TOOLTIP_GAP_PX,
  HEADER_TOOLTIP_CLEAR_SELECTOR,
} from '@/config/constants'

const inventoryStore = useInventoryStore()

const materials = computed(() =>
  MATERIALS.map((m) => {
    const count = inventoryStore.collectedMaterials[m.id] ?? 0
    return {
      ...m,
      count,
      // Kurzform in der Spalte — der exakte Wert samt Historie steht im
      // Hover-Panel (MaterialStatsTooltip), nicht mehr im title-Attribut.
      label: count === 0 ? MATERIAL_EMPTY_GLYPH : formatNumberCompact(count),
    }
  }),
)

const gridStyle = { gridTemplateColumns: `repeat(${HEADER_MATERIALS_GRID_COLUMNS}, minmax(0, 1fr))` }
</script>

<template>
  <div class="mat-grid" :style="gridStyle">
    <RpgBadgeTooltip
      v-for="m in materials"
      :key="m.id"
      :width="MATERIAL_TOOLTIP_WIDTH"
      :gap="MATERIAL_TOOLTIP_GAP_PX"
      :clear-ancestor="HEADER_TOOLTIP_CLEAR_SELECTOR"
    >
      <div class="mat-cell" :class="{ 'mat-cell--empty': m.count === 0 }">
        <img v-if="m.image" :src="m.image" class="mat-icon rpg-img" :alt="m.name" />
        <span v-else class="mat-ph" :style="{ color: MATERIAL_COLOR[m.id] }">
          {{ MATERIAL_PLACEHOLDER_LABELS[m.id] ?? m.name.slice(0, 2).toUpperCase() }}
        </span>
        <span class="mat-count" :style="{ color: MATERIAL_COLOR[m.id] }">
          {{ m.label }}
        </span>
      </div>
      <template #tip>
        <MaterialStatsTooltip :material-id="m.id" />
      </template>
    </RpgBadgeTooltip>
  </div>
</template>

<style scoped>
/* ================================================================
   Materialleiste — 2 × 5 rahmenlose Zellen, Maße an --header-height
   gekoppelt wie im Universe-Block rechts. Der Engpass ist hier NICHT
   die Höhe (davon bleibt reichlich übrig), sondern die Spaltenbreite:
   der Header deckelt bei 1400px, während der Profil-Button links mit
   der Header-Höhe wächst — auf 4K bleiben pro Spalte rund 76px.
   ================================================================ */
.mat-grid {
  display: grid;
  /* Zeilenabstand aus der Header-Höhe: auf 2K/4K wird der Header höher, ohne
     dass die Spalten breiter werden — die Luft geht also nach oben/unten. */
  gap: min(calc(var(--header-height) * 0.15), 18px) clamp(4px, 0.31vw, 8px);
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
  gap: clamp(2px, 0.16vw, 6px);
  flex-wrap: nowrap;
  min-width: 0;
  overflow: hidden;
  transition:
    opacity 0.18s,
    filter 0.18s;
}

/* Leere Bestände treten zurück, behalten aber ihre Materialfarbe — der
   frühere grayscale-Filter machte die Reihe grau statt ruhig. */
.mat-cell--empty {
  opacity: 0.36;
}

.mat-cell:hover {
  opacity: 1;
}

.mat-icon {
  width: min(calc(var(--header-height) * 0.28), 30px);
  height: min(calc(var(--header-height) * 0.28), 30px);
  min-width: 18px;
  min-height: 18px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.55));
  user-select: none;
  transform: translateZ(0);
  transition: transform 0.18s ease;
}

.mat-cell:hover .mat-icon {
  transform: scale(1.1) translateZ(0);
}

/* Platzhalter für Materialien ohne Artwork — gleiche Kantenlänge wie ein
   Icon, damit die Spaltenflucht steht. */
.mat-ph {
  width: min(calc(var(--header-height) * 0.28), 30px);
  height: min(calc(var(--header-height) * 0.28), 30px);
  min-width: 18px;
  min-height: 18px;
  flex-shrink: 0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, #241b12, #16110b);
  border: 1px solid rgba(200, 144, 64, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 200, 80, 0.06);
  font-family: ui-monospace, Menlo, monospace;
  font-size: min(calc(var(--header-height) * 0.11), 13px);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: none;
  transition: border-color 0.18s ease;
}

.mat-cell:hover .mat-ph {
  border-color: rgba(232, 192, 64, 0.55);
}

.mat-count {
  font-size: min(calc(var(--header-height) * 0.165), 17px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
</style>
