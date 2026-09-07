<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import StatsColumnHeader from './StatsColumnHeader.vue'
import StatCategoryAccordion from './StatCategoryAccordion.vue'
import type { StatCategoryId } from '@/types'

/** Records: der ganze Stat-Katalog, mit Suche; eine KPI-Kachel landet auf ihrer Kategorie. */
const props = defineProps<{ focusCategory: StatCategoryId | null }>()

const search = ref('')
const scroller = ref<HTMLElement | null>(null)

// den eigenen Container rollen, nie scrollIntoView (das Modal ist teils außerhalb)
watch(
  () => props.focusCategory,
  async (id) => {
    if (!id) return
    search.value = ''
    await nextTick()
    const el = scroller.value
    const target = el?.querySelector<HTMLElement>(`[data-cat="${id}"]`)
    if (el && target) el.scrollTop = target.offsetTop - el.offsetTop
  },
)
</script>

<template>
  <div class="jt-page">
    <StatsColumnHeader v-model="search" title="Records" placeholder="Search stats…" />
    <div ref="scroller" class="jt-body rpg-scrollbar">
      <StatCategoryAccordion class="jt-records" :query="search" :focus-category="focusCategory" />
    </div>
  </div>
</template>

<style scoped>
.jt-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100%;
}
.jt-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 16px;
}
.jt-records {
  width: 100%;
  max-width: 1100px;
  margin-inline: auto;
}
@media (min-width: 2400px) {
  .jt-records {
    max-width: 1400px;
  }
}
</style>
