<script setup lang="ts">
import RpgSearchBar from '@/components/ui/RpgSearchBar.vue'

/**
 * The header strip shared by every panel of the Bard-Stats deck: gold headline
 * on the left, optional readouts and context search on the right. It lives in
 * its own component because the headers must stay pixel-identical — same
 * height, same type scale, same behaviour at every desktop resolution. Only
 * their panel widths differ.
 *
 * Two parts are optional so the same strip fits all five call sites:
 * - no `placeholder` → no search field. The Solar dial is one figure; there is
 *   nothing in it to filter, and an inert field in its head only suggested
 *   otherwise.
 * - `#meta` → readouts that belong to the panel's title rather than its body
 *   (the Astral Codex puts its rank and stage count there). They sit right of
 *   the headline, pinned to the search.
 */
defineProps<{
  /** gold headline — the panel's name */
  title: string
  /** placeholder of the panel's context search; omit it to drop the field */
  placeholder?: string
}>()

/** two-way bound query string, owned by the panel that renders this header */
const search = defineModel<string>({ default: '' })
</script>

<template>
  <header class="sf-p-head">
    <span class="sf-p-title">
      <span v-ink-center class="sf-p-label">{{ title }}</span>
    </span>
    <span v-if="$slots.meta" class="sf-p-meta">
      <slot name="meta" />
    </span>
    <RpgSearchBar
      v-if="placeholder"
      v-model="search"
      class="sf-search-wrap"
      size="sm"
      :placeholder="placeholder"
    />
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

/* Readouts next to the headline. `margin-left: auto` beats the parent's
   space-between, so they never float in the middle of the strip: they park
   against the search box and travel with it when the panel narrows. */
.sf-p-meta {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  margin-left: auto;
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
    /* 47 = die 34px des kompakten Suchfelds plus Polster und Trennlinie. Die
       Zahl steht hier, weil sie sonst nur DIE Köpfe mit Suche träfen: gemessen
       fiel der suchlose Kopf über dem Sonnen-Dial auf 44 und stand damit als
       einziger drei Pixel flacher als seine vier Geschwister. */
    min-height: 47px;
    padding: 6px 12px;
  }
  .sf-p-label {
    font-size: 18px;
  }
}

/* 4K and taller: the default sizes would start to look lost on the huge canvas,
   so the titles scale up. The ceiling was measured back when the headlines ran
   two words ("Galaxy Archive" needed 230px at 25px in the 440px-wide archive
   column, more than it leaves next to the search box). The titles are single
   words now and have room to spare — the size stays where it is because it is
   tuned against the body type, not because the words no longer fit. */
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
