<script setup lang="ts">
/**
 * The shop's left column — every facet of the open domain, standing open.
 *
 * The filters used to live in a drawer above the grid: opening it pushed the
 * cards down, so narrowing a list moved the list. Across the full tab there is
 * room to just leave them out, and a facet you can see is one you remember you
 * set.
 *
 * Chips are ROWS here, not pills. The column is ~208px; wrapped pills would
 * break "Void Sovereign" across two lines and turn a facet list into a shape
 * puzzle. A row has a fixed anchor for the icon, the name and the count, so the
 * eye runs down one edge — and the count is what makes the facet honest: it says
 * what picking it would leave over.
 *
 * The rail knows nothing about champions or items. It renders the groups it is
 * handed and reports back which chip was hit; what a facet MEANS stays with the
 * shop, which is the only place that can resolve it against the catalog.
 */
import { Icon } from '@iconify/vue'
import type { ShopFacetGroup } from '@/types'

defineProps<{
  groups: ShopFacetGroup[]
  folded: boolean
  /** Shown above every group — the one cut that applies to both domains. */
  affordableOnly: boolean
  affordableCount: number
}>()

const emit = defineEmits<{
  toggle: [groupId: string, chipId: string]
  fold: [folded: boolean]
  'update:affordableOnly': [value: boolean]
}>()
</script>

<template>
  <aside class="cs-facets" :class="{ 'cs-facets--folded': folded }">
    <button
      class="cs-facets-grip"
      v-tip="folded ? 'Show filters' : 'Hide filters'"
      :aria-label="folded ? 'Show filters' : 'Hide filters'"
      :aria-expanded="!folded"
      @click="emit('fold', !folded)"
    >
      <Icon icon="lucide:sliders-horizontal" width="16" height="16" />
      <span v-if="!folded" class="cs-facets-grip-label">Filters</span>
      <span class="cs-facets-grip-arrow">{{ folded ? '›' : '‹' }}</span>
    </button>

    <div class="cs-facets-scroll rpg-scrollbar">
      <!-- Affordable — above the groups because it cuts across all of them:
           what the player can pay for right now is a different question from
           what kind of thing it is. -->
      <button
        class="cs-facet-row cs-facet-row--afford"
        :class="{ 'cs-facet-row--active': affordableOnly }"
        v-tip="`${affordableCount} affordable right now`"
        @click="emit('update:affordableOnly', !affordableOnly)"
      >
        <Icon icon="game-icons:coins" width="18" height="18" class="cs-facet-icon" />
        <span class="cs-facet-label">Affordable</span>
        <span class="cs-facet-count">{{ affordableCount }}</span>
      </button>

      <div v-for="group in groups" :key="group.id" class="cs-facet-group">
        <div class="filter-divider">
          <span class="filter-divider-label">{{ group.label }}</span>
        </div>
        <p v-if="group.chips.length === 0" class="trait-empty-state">Nothing here yet</p>
        <button
          v-for="chip in group.chips"
          :key="chip.id"
          class="cs-facet-row"
          :class="{
            'cs-facet-row--active': chip.active,
            'cs-facet-row--disabled': chip.disabled,
          }"
          :style="{ '--chip-color': chip.color ?? '#c89040' }"
          :disabled="chip.disabled"
          v-tip="chip.title ?? chip.label"
          @click="emit('toggle', group.id, chip.id)"
        >
          <img v-if="chip.image" :src="chip.image" :alt="chip.label" class="cs-facet-img" />
          <Icon v-else-if="chip.icon" :icon="chip.icon" width="18" height="18" class="cs-facet-icon" />
          <span class="cs-facet-label">{{ chip.label }}</span>
          <Icon
            v-if="chip.locked"
            icon="lucide:lock"
            width="13"
            height="13"
            class="cs-facet-lock"
          />
          <span v-else-if="chip.count != null" class="cs-facet-count">{{ chip.count }}</span>
        </button>
      </div>
    </div>

    <!-- Folded: the group icons stay so the column still says WHICH facets it
         holds. Clicking one is the fastest way back to the whole list. -->
    <div class="cs-facets-stubs">
      <button
        v-for="group in groups"
        :key="'stub-' + group.id"
        class="cs-facet-stub"
        :class="{ 'cs-facet-stub--set': group.chips.some((c) => c.active) }"
        v-tip="group.label"
        :aria-label="`Show ${group.label} filters`"
        @click="emit('fold', false)"
      >
        <Icon :icon="group.icon" width="20" height="20" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.cs-facets {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #12100a;
  border-right: 2px solid #5c3310;
}
.cs-facets-grip {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 9px 10px;
  background: #1e1006;
  border: none;
  border-bottom: 2px solid #5c3310;
  color: #c89040;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s;
}
.cs-facets-grip:hover {
  color: #e8c040;
}
.cs-facets-grip-label {
  flex: 1;
  text-align: left;
}
.cs-facets-grip-arrow {
  font-size: 13px;
  opacity: 0.75;
}
.cs-facets--folded .cs-facets-grip {
  justify-content: center;
  padding: 9px 0;
}
.cs-facets--folded .cs-facets-grip-arrow {
  display: none;
}

.cs-facets-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 7px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cs-facets--folded .cs-facets-scroll {
  display: none;
}

.cs-facet-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cs-facet-group .filter-divider {
  margin: 7px 0 3px;
}

/* One row, three anchors: mark, name, number. The left border is where the
   facet's own colour lives — a full tinted fill on every row would make the
   column louder than the cards it filters. */
.cs-facet-row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 4px 7px;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #b09a74;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.13s,
    color 0.13s,
    border-color 0.13s;
}
.cs-facet-row:hover:not(:disabled) {
  background: #1c1a12;
  color: #e8dcc0;
  border-left-color: var(--chip-color, #c89040);
}
.cs-facet-row--active {
  background: color-mix(in srgb, var(--chip-color, #e8c040) 20%, #12100a);
  border-color: color-mix(in srgb, var(--chip-color, #e8c040) 45%, transparent);
  border-left-color: var(--chip-color, #e8c040);
  color: #fff4dc;
}
.cs-facet-row--disabled {
  opacity: 0.34;
  cursor: not-allowed;
}
.cs-facet-row--afford {
  --chip-color: #52b830;
  margin-bottom: 2px;
}
.cs-facet-icon {
  flex-shrink: 0;
  color: var(--chip-color, #c89040);
}
.cs-facet-row--active .cs-facet-icon {
  color: #fff;
}
.cs-facet-img {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  object-fit: contain;
}
.cs-facet-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-facet-count {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #7a6848;
}
.cs-facet-row--active .cs-facet-count {
  color: #e8c040;
}
.cs-facet-lock {
  flex-shrink: 0;
  color: #7a4e20;
}

/* ── Folded stubs ── */
.cs-facets-stubs {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
}
.cs-facets--folded .cs-facets-stubs {
  display: flex;
}
.cs-facet-stub {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #3e200a;
  border-radius: 4px;
  background: #16140e;
  color: #8a6030;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.cs-facet-stub:hover {
  color: #e8c040;
  border-color: #5c3310;
}
/* A folded rail must still admit that a filter is set — otherwise an empty grid
   has no visible cause. */
.cs-facet-stub--set {
  color: #e8c040;
  border-color: #c89040;
}
</style>
