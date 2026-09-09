<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import StatsColumnHeader from './StatsColumnHeader.vue'
import StatCategoryRail from './StatCategoryRail.vue'
import StatCategoryFlow from './StatCategoryFlow.vue'
import { useStatCatalog } from '@/composables/ui/useStatCatalog'
import { useTotalBonusChips } from '@/composables/ui/useTotalBonusChips'
import type { JourneyStatsAnchorId, StatCategoryId } from '@/types'

/** Stats: der ganze Katalog auf einmal — Kategorienleiste links, Bänder rechts. */
const props = defineProps<{ focusCategory: StatCategoryId | null }>()

const search = ref('')
const scroller = ref<HTMLElement | null>(null)
const activeId = ref<JourneyStatsAnchorId | null>(null)

const { categories, totalStatCount, matchCount } = useStatCatalog(search)
const { chips: bonusChips } = useTotalBonusChips()
const searching = computed(() => search.value.trim().length > 0)

/* Das Bonus-Band steht nur, wenn es etwas zu zeigen gibt — und nie neben einer
   Trefferliste: die Boni stehen nicht im Katalog, ein Trefferzähler wäre gelogen. */
const showBonus = computed(() => !searching.value && bonusChips.value.length > 0)

/* Die Marken sind ≤ 15 Knoten; einmal eingesammelt, statt sie je Rollbild neu
   aus 300 Kacheln zu suchen. */
let marks: HTMLElement[] = []
let raf = 0

function collectMarks(): void {
  marks = scroller.value ? [...scroller.value.querySelectorAll<HTMLElement>('[data-cat]')] : []
  syncActive()
}

function syncActive(): void {
  const el = scroller.value
  if (!el) return
  const line = el.scrollTop + 12
  let id: JourneyStatsAnchorId | null = null
  let best = -1
  for (const mark of marks) {
    // In der Trefferansicht liegen mehrere Marken in DERSELBEN Zeile — von
    // gleich hohen gewinnt die erste, sonst führt die Leiste zu weit vor.
    if (mark.offsetTop > line) break
    if (mark.offsetTop > best) {
      best = mark.offsetTop
      id = mark.dataset.cat as JourneyStatsAnchorId
    }
  }
  activeId.value = id ?? ((marks[0]?.dataset.cat as JourneyStatsAnchorId) ?? null)
}

function onScroll(): void {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    syncActive()
  })
}

// den eigenen Container rollen, nie scrollIntoView (das Modal ist teils außerhalb)
function goTo(id: JourneyStatsAnchorId): void {
  const el = scroller.value
  const target = el?.querySelector<HTMLElement>(`[data-cat="${id}"]`)
  if (el && target) el.scrollTop = target.offsetTop - 6
  activeId.value = id
}

async function focus(id: StatCategoryId): Promise<void> {
  search.value = ''
  await nextTick()
  collectMarks()
  goTo(id)
}

watch(
  () => props.focusCategory,
  (id) => {
    if (id) focus(id)
  },
)

// Marken ändern sich nur mit der Suche und mit dem Erscheinen des Bonus-Bandes —
// der Sekundentakt tut es nicht.
watch([search, showBonus], async () => {
  await nextTick()
  collectMarks()
})

onMounted(() => {
  if (props.focusCategory) focus(props.focusCategory)
  else collectMarks()
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="jt-page">
    <StatsColumnHeader v-model="search" title="Stats" placeholder="Search stats…">
      <template #meta>
        <span class="st-count">
          <template v-if="searching">{{ matchCount }} of {{ totalStatCount }} stats</template>
          <template v-else>{{ totalStatCount }} stats · {{ categories.length }} categories</template>
        </span>
      </template>
    </StatsColumnHeader>

    <div class="st-main">
      <StatCategoryRail
        :categories="categories"
        :active-id="activeId"
        :searching="searching"
        :show-bonus="showBonus"
        :bonus-count="bonusChips.length"
        @pick="goTo"
      />
      <div ref="scroller" class="st-flow rpg-scrollbar" @scroll.passive="onScroll">
        <StatCategoryFlow
          :categories="categories"
          :query="search"
          :bonus-chips="showBonus ? bonusChips : []"
        />
      </div>
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

.st-count {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7a58;
  white-space: nowrap;
}

/* Leiste links, Fluss rechts — beide tragen die volle Resthöhe. */
.st-main {
  flex: 1;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  min-height: 0;
  min-width: 0;
}

/* Der Scroller ist der Bezugspunkt für `offsetTop` der Kategoriemarken. */
.st-flow {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 20px;
}

@media (max-height: 1100px) {
  .st-main {
    grid-template-columns: 228px minmax(0, 1fr);
  }
  .st-count {
    font-size: 11px;
  }
  .st-flow {
    padding: 0 12px 14px;
  }
}
</style>
