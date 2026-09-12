<script setup lang="ts">
import JourneyHeaderBand from './JourneyHeaderBand.vue'
import SunStage from './SunStage.vue'
import WayfinderNowCard from './WayfinderNowCard.vue'
import KpiCard from './KpiCard.vue'
import type { StatCategoryId, StatCategoryView } from '@/types'

/**
 * Die Übersicht des Journey-Reiters: links Kopfband, laufende Effekte und die
 * Sonne, rechts Wayfinder und Kennzahlen über die volle Höhe. Scrollt nie.
 */
defineProps<{ categories: StatCategoryView[] }>()
const emit = defineEmits<{ 'open-records': [category: StatCategoryId | null] }>()
</script>

<template>
  <div class="jt-overview">
    <div class="jt-left">
      <JourneyHeaderBand />
      <SunStage />
    </div>
    <aside class="jt-aside">
      <WayfinderNowCard />
      <KpiCard :categories="categories" @open="emit('open-records', $event)" />
    </aside>
  </div>
</template>

<style scoped>
.jt-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(580px, 39vw, 820px);
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.jt-left {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  min-width: 0;
  border-right: 1px solid #2c1806;
}

.jt-aside {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  min-width: 0;
  padding: 18px 20px 16px;
}

@media (max-height: 1100px) {
  .jt-aside {
    gap: 11px;
    padding: 14px 16px 12px;
  }
}
</style>
