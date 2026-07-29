<script setup lang="ts">
import RpgSearchBar from '@/components/ui/RpgSearchBar.vue'

/**
 * The header strip shared by all three Bard-Stats columns: gold headline on the
 * left, context search on the right. It lives in its own component because the
 * three headers must stay pixel-identical — same height, same type scale, same
 * behaviour at every desktop resolution. Only their column widths differ.
 */
defineProps<{
  /** gold headline — the column's name */
  title: string
  /** placeholder of the column's context search */
  placeholder: string
}>()

/** two-way bound query string, owned by the column that renders this header */
const search = defineModel<string>({ required: true })
</script>

<template>
  <header class="sf-p-head">
    <span class="sf-p-title">
      <span v-ink-center class="sf-p-label">{{ title }}</span>
    </span>
    <RpgSearchBar v-model="search" class="sf-search-wrap" size="sm" :placeholder="placeholder" />
  </header>
</template>

<style scoped>
.sf-p-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 12px;
  /* fixed height so all three section headers match exactly — only their
     column widths differ */
  min-height: 50px;
  border-bottom: 1px solid #2c1806;
}

/* Section titles carry the whole column, so they read as gold headlines, not
   as dim wood labels. `min-width: 0` lets the label ellipsise when a column is
   dragged narrow — without it the nowrap title would squeeze out the search. */
.sf-p-title {
  display: flex;
  align-items: center;
  min-width: 0;
}

.sf-p-label {
  min-width: 0;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-gold);
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.25);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Only the sizing lives here — every visual is the shared bar's own. The field
   shrinks before the title does, but never below a usable width. */
.sf-search-wrap {
  flex: 0 1 176px;
  min-width: 104px;
  max-width: 176px;
}

/* Full HD / WUXGA: the flattest viewports — reclaim rows, but keep the section
   titles well above the body type. */
@media (max-height: 1100px) {
  .sf-p-head {
    min-height: 44px;
    padding: 6px 12px;
  }
  .sf-p-label {
    font-size: 18px;
  }
}

/* 4K and taller: the default sizes would start to look lost on the huge canvas,
   so the titles scale up. The ceiling is not the viewport but the archive
   column, which stays 440px wide at every resolution — measured, the longest
   title ("Galaxy Archive") already needs 230px there at 25px, more than the
   column leaves next to the search box, so anything larger than this would
   ellipsise the headline instead of growing it. */
@media (min-height: 1600px) {
  .sf-p-head {
    min-height: 58px;
  }
  .sf-p-label {
    font-size: 23px;
    letter-spacing: 0.08em;
  }
  /* the shared bar's own type scale, nudged up for the 4K header row */
  .sf-search-wrap :deep(.sb-input) {
    font-size: 14px;
  }
}
</style>
