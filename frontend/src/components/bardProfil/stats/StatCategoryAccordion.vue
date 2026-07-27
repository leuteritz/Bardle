<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useStatCatalog } from '@/composables/useStatCatalog'
import { STAT_CATEGORIES } from '@/config/statCategories'
import type { StatCategoryId } from '@/types'

const props = defineProps<{
  /** Free-text filter coming from the panel header search box. */
  query: string
}>()

const { categories, totalStatCount, matchCount } = useStatCatalog(toRef(props, 'query'))

/* Everything collapsed on open — the tab then shows all 16 categories at once
   as a table of contents; the search opens whatever it hits anyway. */
const openIds = ref<Set<StatCategoryId>>(new Set())

const isSearching = computed(() => props.query.trim().length > 0)

/** Categories that still hold a match — a search hides the empty ones entirely. */
const visibleCategories = computed(() =>
  isSearching.value ? categories.value.filter((c) => c.stats.length > 0) : categories.value,
)

function isOpen(id: StatCategoryId): boolean {
  /* While searching every remaining section is open: the point of a hit is
     seeing it, not having to click it. */
  return isSearching.value || openIds.value.has(id)
}

function toggle(id: StatCategoryId): void {
  if (isSearching.value) return
  const next = new Set(openIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openIds.value = next
}

function expandAll(): void {
  openIds.value = new Set(STAT_CATEGORIES.map((c) => c.id))
}

function collapseAll(): void {
  openIds.value = new Set()
}

/* Leaving the search returns to the collapsed default instead of leaving all
   16 sections that the search had forced open standing wide */
watch(isSearching, (searching, wasSearching) => {
  if (wasSearching && !searching) openIds.value = new Set()
})
</script>

<template>
  <div class="sc-root">
    <!-- Toolbar: how many stats are in view, plus expand/collapse -->
    <div class="sc-bar">
      <span class="sc-bar-count">
        <template v-if="isSearching">{{ matchCount }} of {{ totalStatCount }} stats</template>
        <template v-else>{{ totalStatCount }} stats · {{ categories.length }} categories</template>
      </span>
      <div v-if="!isSearching" class="sc-bar-actions">
        <button class="sc-bar-btn" type="button" title="Open every category" @click="expandAll">
          Expand
        </button>
        <button class="sc-bar-btn" type="button" title="Close every category" @click="collapseAll">
          Collapse
        </button>
      </div>
    </div>

    <div v-if="visibleCategories.length === 0" class="sc-empty">
      <Icon icon="game-icons:magnifying-glass" width="28" height="28" class="sc-empty-icon" />
      <span>No stat matches “{{ query }}”</span>
    </div>

    <section
      v-for="cat in visibleCategories"
      :key="cat.id"
      class="sc-cat"
      :class="{ 'is-open': isOpen(cat.id) }"
      :style="{ '--accent': cat.accent }"
    >
      <button
        class="sc-head"
        type="button"
        :title="cat.blurb"
        :aria-expanded="isOpen(cat.id)"
        @click="toggle(cat.id)"
      >
        <span class="sc-caret" aria-hidden="true" />
        <span class="sc-head-ico">
          <Icon :icon="cat.icon" width="36" height="36" />
        </span>
        <span class="sc-head-text">
          <span class="sc-head-name">{{ cat.label }}</span>
          <span class="sc-head-blurb">{{ cat.blurb }}</span>
        </span>
        <span v-ink-center class="sc-head-count">
          {{ isSearching ? `${cat.stats.length}/${cat.totalCount}` : cat.totalCount }}
        </span>
      </button>

      <div v-if="isOpen(cat.id)" class="sc-body">
        <div v-if="cat.stats.some((s) => s.highlight)" class="sc-highlights">
          <div
            v-for="stat in cat.stats.filter((s) => s.highlight)"
            :key="stat.key"
            class="sc-hl"
            :title="stat.hint ?? stat.label"
          >
            <span class="sc-hl-val">{{ stat.value }}</span>
            <span class="sc-hl-lbl">{{ stat.label }}</span>
          </div>
        </div>

        <div class="sc-rows">
          <div
            v-for="stat in cat.stats.filter((s) => !s.highlight)"
            :key="stat.key"
            class="sc-row"
            :title="stat.hint ?? undefined"
          >
            <span class="sc-row-lbl">{{ stat.label }}</span>
            <span class="sc-row-dots" aria-hidden="true" />
            <span class="sc-row-val">{{ stat.value }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   STAT CATALOG — the Journey column's category accordion.
   Every section carries its own --accent: rail, icon, count badge
   and highlight numbers all read from it, so a category stays
   recognizable while scrolling a long list.
══════════════════════════════════════════════════════════════ */
.sc-root {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ─── Toolbar ─── */
.sc-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 6px;
  border-bottom: 1px solid #241a0c;
}

.sc-bar-count {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sc-bar-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.sc-bar-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  background: #16130c;
  border: 1px solid #3e200a;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}
.sc-bar-btn:hover {
  color: #e8c040;
  border-color: #7a4e20;
  background: #1c1710;
}

/* ─── Category shell ─── */
.sc-cat {
  background: #141008;
  border: 1px solid #241a0c;
  border-left: 3px solid color-mix(in srgb, var(--accent) 45%, #241a0c);
  border-radius: 5px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.sc-cat.is-open {
  border-left-color: var(--accent);
  border-color: #3a2a12;
}

/* ─── Header row ─── */
.sc-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.sc-head:hover {
  background: #1a1409;
}
.sc-cat.is-open .sc-head {
  background: color-mix(in srgb, var(--accent) 7%, #17110a);
}

/* Pure-CSS caret so no icon budget is spent on 16 chevrons */
.sc-caret {
  flex-shrink: 0;
  width: 0;
  height: 0;
  border-left: 6px solid color-mix(in srgb, var(--accent) 70%, #6a5a3a);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transition: transform 0.18s ease;
}
.sc-cat.is-open .sc-caret {
  transform: rotate(90deg);
}

/* Bare glyph, no box: the icon IS the category mark, so it gets the full slot
   and carries its accent as light instead of as a frame. */
.sc-head-ico {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: color-mix(in srgb, var(--accent) 80%, #6a5a3a);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent) 25%, transparent));
  transition:
    color 0.18s,
    filter 0.18s;
}
.sc-head-ico svg {
  width: 100%;
  height: 100%;
}
.sc-cat.is-open .sc-head-ico,
.sc-head:hover .sc-head-ico {
  color: var(--accent);
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 55%, transparent));
}

.sc-head-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sc-head-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.15;
  text-transform: uppercase;
  color: #e8e0cc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sc-cat.is-open .sc-head-name {
  color: var(--accent);
}

.sc-head-blurb {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: var(--rpg-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sc-head-count {
  flex-shrink: 0;
  min-width: 38px;
  padding: 4px 8px;
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, #14100a);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}

/* ─── Body ─── */
.sc-body {
  padding: 8px 10px 10px;
  border-top: 1px solid #241a0c;
}

/* Headline numbers of a category — oversized, in the accent color */
.sc-highlights {
  display: grid;
  /* wide enough that a full label like "LEVEL PROGRESS" fits next to its
     oversized number instead of being cut — two per row in the default column */
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 6px;
  margin-bottom: 9px;
}

.sc-hl {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  padding: 7px 9px;
  background: #1c1c18;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, #2a1a08);
  border-radius: 4px;
}

.sc-hl-val {
  font-size: 25px;
  font-weight: 900;
  line-height: 1.05;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.sc-hl-lbl {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Regular stat lines — label, leader dots, value */
.sc-rows {
  display: flex;
  flex-direction: column;
}

.sc-row {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 5px 2px;
  border-bottom: 1px solid #1e1810;
}
.sc-row:last-child {
  border-bottom: none;
}
.sc-row:hover {
  background: #1a1610;
}

.sc-row-lbl {
  flex-shrink: 0;
  max-width: 62%;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dotted leader keeps label and value visually connected at any width */
.sc-row-dots {
  flex: 1;
  min-width: 8px;
  height: 1px;
  background-image: linear-gradient(to right, #3a2e1c 45%, transparent 45%);
  background-size: 5px 1px;
  background-repeat: repeat-x;
  transform: translateY(-4px);
}

.sc-row-val {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 900;
  color: #e8e0cc;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sc-cat.is-open .sc-row:hover .sc-row-val {
  color: var(--accent);
}

/* ─── Empty search state ─── */
.sc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 28px 16px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--rpg-text-dim);
}
.sc-empty-icon {
  color: #5c4a30;
}

/* Full HD is the flattest desktop viewport — trim the vertical rhythm so more
   rows stay visible without changing type sizes below readability. */
@media (max-height: 1100px) {
  .sc-head {
    padding: 6px 9px;
  }
  .sc-head-ico {
    width: 32px;
    height: 32px;
  }
  .sc-head-name {
    font-size: 15px;
  }
  .sc-body {
    padding: 7px 9px 8px;
  }
  .sc-row {
    padding: 4px 2px;
  }
  .sc-hl {
    padding: 6px 8px;
  }
  .sc-hl-val {
    font-size: 22px;
  }
}
</style>
