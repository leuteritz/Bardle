<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { StatCategoryId, StatCategoryView } from '@/types'

/** Die 15 Kategorien als stehende Leiste — reine Anzeige, der Aufrufer rollt. */
defineProps<{
  categories: StatCategoryView[]
  activeId: StatCategoryId | null
  /** Bei aktiver Suche zeigen die Zähler Treffer, leere Kategorien sind stumm. */
  searching: boolean
}>()

const emit = defineEmits<{ pick: [id: StatCategoryId] }>()
</script>

<template>
  <nav class="st-rail rpg-scrollbar" aria-label="Stat categories">
    <button
      v-for="cat in categories"
      :key="cat.id"
      class="st-rail-row"
      :class="{
        'is-active': cat.id === activeId,
        'is-empty': searching && cat.stats.length === 0,
      }"
      :style="{ '--accent': cat.accent }"
      type="button"
      :disabled="searching && cat.stats.length === 0"
      v-tip="cat.blurb"
      @click="emit('pick', cat.id)"
    >
      <Icon :icon="cat.icon" class="st-rail-ico" width="20" height="20" aria-hidden="true" />
      <span class="st-rail-name">{{ cat.label }}</span>
      <span v-ink-center class="st-rail-count">
        {{ searching ? cat.stats.length : cat.totalCount }}
      </span>
    </button>
  </nav>
</template>

<style scoped>
.st-rail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  padding: 10px 8px 14px 10px;
  background: #141008;
  border-right: 1px solid #2c1806;
}

/* Die Zeilen teilen die volle Höhe unter sich auf — die Leiste endet sonst
   nach 15 Zeilen und lässt den Rest der Spalte leer. */
.st-rail-row {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 32px;
  max-height: 56px;
  padding: 7px 9px;
  text-align: left;
  background: transparent;
  border: 0;
  border-left: 3px solid color-mix(in srgb, var(--accent) 28%, #241a0c);
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}
.st-rail-row:hover:not(:disabled) {
  background: #17110a;
}
.st-rail-row.is-active {
  background: #1a1008;
  border-left-color: var(--accent);
}

.st-rail-ico {
  flex-shrink: 0;
  color: color-mix(in srgb, var(--accent) 65%, #6a5a3a);
}
.st-rail-row.is-active .st-rail-ico {
  color: var(--accent);
}

.st-rail-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a7a58;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-rail-row.is-active .st-rail-name {
  color: var(--accent);
}

.st-rail-count {
  flex-shrink: 0;
  min-width: 26px;
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  color: #6b5a34;
}
.st-rail-row.is-active .st-rail-count {
  color: #e8e4d8;
}

.st-rail-row.is-empty {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-height: 1100px) {
  .st-rail {
    padding: 7px 6px 10px 8px;
  }
  .st-rail-row {
    gap: 7px;
    padding: 5px 7px;
  }
  .st-rail-name {
    font-size: 11px;
  }
}
</style>
