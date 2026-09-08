<script setup lang="ts">
import JourneyHeaderBand from './JourneyHeaderBand.vue'
import SunStage from './SunStage.vue'
import WayfinderNowCard from './WayfinderNowCard.vue'
import KpiCard from './KpiCard.vue'
import type { StatCategoryId, StatCategoryView } from '@/types'

/**
 * Die Übersicht des Journey-Reiters: Kopfband, Sonne links, Wayfinder und
 * Kennzahlen rechts, Buffs unten. Scrollt nie — die Sonne nimmt den Rest.
 */
defineProps<{ categories: StatCategoryView[] }>()
const emit = defineEmits<{ 'open-records': [category: StatCategoryId | null] }>()
</script>

<template>
  <div class="jt-overview">
    <JourneyHeaderBand />
    <div class="jt-main">
      <SunStage />
      <aside class="jt-aside">
        <WayfinderNowCard />
        <KpiCard :categories="categories" @open="emit('open-records', $event)" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.jt-overview {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.jt-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(580px, 39vw, 820px);
  min-height: 0;
  min-width: 0;
}

.jt-main > :first-child {
  border-right: 1px solid #2c1806;
}

.jt-aside {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  padding: 18px 20px 16px;
  border-left: 1px solid #2c1806;
}

@media (max-height: 1100px) {
  .jt-aside {
    gap: 11px;
    padding: 14px 16px 12px;
  }
}
</style>
