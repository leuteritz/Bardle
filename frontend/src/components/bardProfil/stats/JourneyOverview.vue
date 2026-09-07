<script setup lang="ts">
import JourneyHeaderBand from './JourneyHeaderBand.vue'
import SunStage from './SunStage.vue'
import WayfinderNowCard from './WayfinderNowCard.vue'
import ActiveBuffsCard from './ActiveBuffsCard.vue'
import KpiBand from './KpiBand.vue'
import type { StatCategoryId, StatCategoryView } from '@/types'

/**
 * Die Übersicht des Journey-Reiters: Kopfband, Sonne links, Wayfinder und
 * Buffs rechts, Kennzahlen unten. Scrollt nie — die Sonne nimmt den Rest.
 */
defineProps<{ categories: StatCategoryView[] }>()
const emit = defineEmits<{ 'open-records': [category: StatCategoryId] }>()
</script>

<template>
  <div class="jt-overview">
    <JourneyHeaderBand />
    <div class="jt-main">
      <SunStage />
      <aside class="jt-aside">
        <WayfinderNowCard />
        <ActiveBuffsCard />
      </aside>
    </div>
    <KpiBand :categories="categories" @open="emit('open-records', $event)" />
  </div>
</template>

<style scoped>
.jt-overview {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.jt-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(340px, 26vw, 520px);
  min-height: 0;
  min-width: 0;
}

.jt-main > :first-child {
  border-right: 1px solid #2c1806;
}

.jt-aside {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  padding: 12px 14px 10px;
}

@media (max-height: 1100px) {
  .jt-aside {
    gap: 8px;
    padding: 10px 12px 8px;
  }
}
</style>
