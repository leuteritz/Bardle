<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useStatCatalog } from '@/composables/ui/useStatCatalog'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import JourneySubNav from './JourneySubNav.vue'
import JourneyOverview from './JourneyOverview.vue'
import JourneyRecordsPage from './JourneyRecordsPage.vue'
import JourneyWayfinderPage from './JourneyWayfinderPage.vue'
import JourneyAugmentsPage from './JourneyAugmentsPage.vue'
import type { JourneySubpageId, StatCategoryId } from '@/types'

/**
 * Journey — Übersicht plus drei Unterseiten. Die Übersicht bleibt immer
 * gemountet (Sonne, Ticker); die anderen mounten beim ersten Besuch und werden
 * danach nur versteckt — dasselbe Muster wie die Tab-Layer im Profil.
 */
const uiStore = useUiStore()

const subpage = ref<JourneySubpageId>('overview')
const mounted = reactive(new Set<JourneySubpageId>(['overview']))
watch(subpage, (p) => mounted.add(p), { immediate: true })

/** Eine KPI-Kachel landet auf ihrer Kategorie (null = nur die Seite). */
const recordsFocus = ref<StatCategoryId | null>(null)
function openRecords(category: StatCategoryId | null): void {
  recordsFocus.value = category
  subpage.value = 'records'
}
watch(subpage, (p) => {
  if (p !== 'records') recordsFocus.value = null
})

/** Kennzahlen der Übersicht — unfiltriert; Records hält seine eigene, gefilterte Sicht. */
const { categories } = useStatCatalog(ref(''))

// verlassen → zurück auf die Übersicht
watch(
  () => uiStore.bardActiveTab === 'bard',
  (visible) => {
    if (!visible) subpage.value = 'overview'
  },
)
</script>

<template>
  <div class="jt-root">
    <CosmicStageBackground />
    <div class="jt-frame">
      <JourneySubNav v-model="subpage" />
      <div class="jt-pages">
        <JourneyOverview
          v-show="subpage === 'overview'"
          :categories="categories"
          @open-records="openRecords"
        />
        <JourneyRecordsPage
          v-if="mounted.has('records')"
          v-show="subpage === 'records'"
          :focus-category="recordsFocus"
        />
        <JourneyWayfinderPage v-if="mounted.has('wayfinder')" v-show="subpage === 'wayfinder'" />
        <JourneyAugmentsPage v-if="mounted.has('augments')" v-show="subpage === 'augments'" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.jt-root {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #111008;
  color: var(--rpg-text);
}

.jt-frame {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.jt-pages {
  flex: 1;
  min-height: 0;
  display: grid;
}
/* alle Seiten liegen in derselben Zelle; v-show blendet, das Grid hält die Höhe */
.jt-pages > * {
  grid-area: 1 / 1;
  min-height: 0;
  min-width: 0;
}
</style>
