<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { CHAMPION_TRAITS, TRAIT_DEFINITIONS } from '@/config/championTraits'
import { ORIGIN_SYNERGIES, getChampionOrigin } from '@/config/championOrigins'
import { CHAMPION_DATA } from '@/config/championData'
import { CHIMES_PRICE_TIERS } from '@/config/constants'
import type { ChimesTier } from '@/types'

const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Supp']

const props = withDefaults(
  defineProps<{
    activeRole: string
    roleFilteredChampions: string[]
    headerSlots: (string | null)[]
    secondarySlots?: (string | null)[][]
    activeSlotIndex: number
    activeSubSlot?: number
    selectorTab?: 'main' | 'ally1' | 'ally2'
    showClose?: boolean
  }>(),
  {
    secondarySlots: () => [[null, null], [null, null], [null, null], [null, null], [null, null]],
    activeSubSlot: -1,
    selectorTab: 'main',
    showClose: false,
  },
)

const emit = defineEmits<{
  select: [champion: string]
  'tab-change': [tab: 'main' | 'ally1' | 'ally2']
  close: []
}>()

const battleStore = useBattleStore()
const searchQuery = ref('')
const activeTrait = ref<string>('all')
const activeTier = ref<'all' | ChimesTier>('all')
const traitFilterOpen = ref(false)

const tierEntries = computed(
  () =>
    Object.entries(CHIMES_PRICE_TIERS) as [
      ChimesTier,
      { chimesPrice: number; label: string; color: string; multiplier: number },
    ][],
)

// Champion currently assigned to each selector tab for the active role.
// main → header slot, ally1/ally2 → secondary sub-slots 0/1.
const tabChampions = computed<Record<'main' | 'ally1' | 'ally2', string | null>>(() => ({
  main: props.headerSlots[props.activeSlotIndex] ?? null,
  ally1: props.secondarySlots?.[props.activeSlotIndex]?.[0] ?? null,
  ally2: props.secondarySlots?.[props.activeSlotIndex]?.[1] ?? null,
}))

const availableTraits = computed(() => {
  const seen = new Set<string>()
  for (const name of props.roleFilteredChampions) {
    for (const tid of (CHAMPION_TRAITS[name] ?? [])) seen.add(tid)
  }
  return TRAIT_DEFINITIONS.filter((t) => seen.has(t.id))
})

const availableOrigins = computed(() => {
  const seen = new Set<string>()
  for (const name of props.roleFilteredChampions) {
    const o = getChampionOrigin(name)
    if (o && ORIGIN_SYNERGIES[o]) seen.add(o)
  }
  return (Object.values(ORIGIN_SYNERGIES) as Array<{ origin: string; name: string; icon: string; color: string }>)
    .filter((o) => seen.has(o.origin))
    .sort((a, b) => a.origin.localeCompare(b.origin))
})

const searchMatchedTraits = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return new Set<string>()
  const matched = new Set<string>(
    TRAIT_DEFINITIONS.filter((t) => t.name.toLowerCase().includes(q)).map((t) => t.id),
  )
  for (const origin of Object.keys(ORIGIN_SYNERGIES)) {
    if (origin.toLowerCase().includes(q)) matched.add(origin)
  }
  return matched
})
const hasSearchTraitMatch = computed(() => searchMatchedTraits.value.size > 0)

// Mirrors the Champion Shop filter toggle: lit dot / active state when a
// trait or origin is selected.
const hasActiveFilter = computed(() => activeTrait.value !== 'all' || activeTier.value !== 'all')

function resetSearch() {
  searchQuery.value = ''
  activeTrait.value = 'all'
  activeTier.value = 'all'
}

// Auto-open the filter panel while searching, auto-collapse when cleared and
// no trait is active — same behaviour as ChampionShopComponent.
watch(searchQuery, (q) => {
  if (q.trim()) {
    traitFilterOpen.value = true
  } else if (activeTrait.value === 'all') {
    traitFilterOpen.value = false
  }
})

const filteredChampions = computed(() => {
  let list = props.roleFilteredChampions

  if (activeTrait.value !== 'all') {
    list = list.filter((c) => {
      const traitMatch = (CHAMPION_TRAITS[c] ?? []).includes(activeTrait.value as never)
      const originMatch = getChampionOrigin(c) === activeTrait.value
      return traitMatch || originMatch
    })
  }

  if (activeTier.value !== 'all') {
    list = list.filter((c) => (CHAMPION_DATA[c]?.priceTier ?? 'epic') === activeTier.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter((c) => {
      const nameMatch = c.toLowerCase().includes(q)
      const traitMatch = (CHAMPION_TRAITS[c] ?? []).some((tid) => {
        const def = TRAIT_DEFINITIONS.find((t) => t.id === tid)
        return def?.name.toLowerCase().includes(q)
      })
      const originMatch = (getChampionOrigin(c) ?? '').toLowerCase().includes(q)
      return nameMatch || traitMatch || originMatch
    })
  }

  return [...list].sort((a, b) => a.localeCompare(b))
})

function isActiveSelection(champion: string): boolean {
  if (props.activeSubSlot === -1) {
    return props.headerSlots[props.activeSlotIndex] === champion
  }
  return props.secondarySlots?.[props.activeSlotIndex]?.[props.activeSubSlot] === champion
}

function takenLabel(champion: string): string | null {
  if (isActiveSelection(champion)) return null
  const mainIdx = props.headerSlots.indexOf(champion)
  if (mainIdx >= 0) return ROLES[mainIdx]
  if (props.secondarySlots) {
    for (let r = 0; r < props.secondarySlots.length; r++) {
      const sub = props.secondarySlots[r].indexOf(champion)
      if (sub >= 0) return `${ROLES[r]}·S${sub + 1}`
    }
  }
  return null
}

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="csp-root">
    <!-- ── Tabs ── -->
    <div class="csp-tabs">
      <button
        v-for="tab in [
          { id: 'main',  label: 'Main' },
          { id: 'ally1', label: 'Ally 1' },
          { id: 'ally2', label: 'Ally 2' },
        ]"
        :key="tab.id"
        class="csp-tab"
        :class="{ 'csp-tab--active': selectorTab === tab.id }"
        @click="emit('tab-change', tab.id as 'main' | 'ally1' | 'ally2')"
      >
        <img
          v-if="tabChampions[tab.id as 'main' | 'ally1' | 'ally2']"
          :src="battleStore.getChampionImage(tabChampions[tab.id as 'main' | 'ally1' | 'ally2']!)"
          :alt="tabChampions[tab.id as 'main' | 'ally1' | 'ally2']!"
          class="csp-tab-img"
          @error="onImgError"
        />
        <span v-else class="csp-tab-img csp-tab-img--empty">＋</span>
        <span class="csp-tab-gradient" />
        <span class="csp-tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- ── Search + Trait/Origin Filter (harmonized with Champion Shop) ── -->
    <div class="csp-filter-header">
      <div class="cs-search-row">
        <div class="rpg-search-wrap">
          <Icon icon="game-icons:magnifying-glass" width="14" height="14" class="rpg-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`Search ${activeRole} champion or trait...`"
            class="rpg-search w-full pl-9 pr-9 py-2.5"
            :aria-expanded="traitFilterOpen"
            aria-label="Search champions and traits"
          />
          <button
            class="search-clear-btn"
            :class="{ 'search-clear-btn--visible': searchQuery.length > 0 }"
            aria-label="Clear search"
            @click="resetSearch"
            @keydown.enter.prevent="resetSearch"
            @keydown.space.prevent="resetSearch"
          >✕</button>
        </div>

        <!-- Filter panel toggle -->
        <button
          class="filter-toggle-btn"
          :class="{
            'filter-toggle-btn--open': traitFilterOpen,
            'filter-toggle-btn--active': hasActiveFilter,
          }"
          :title="traitFilterOpen ? 'Hide filters' : 'Show filters'"
          aria-label="Toggle filters"
          @click="traitFilterOpen = !traitFilterOpen"
        >
          <Icon icon="game-icons:toggles" width="16" height="16" />
          <span class="filter-toggle-label">Filter</span>
          <span class="filter-toggle-chevron">{{ traitFilterOpen ? '▾' : '▴' }}</span>
          <span v-if="hasActiveFilter && !traitFilterOpen" class="filter-active-dot"></span>
        </button>

        <button v-if="showClose" class="modal-close-btn" @click="emit('close')">✕</button>
      </div>

      <!-- ── Collapsible filter panel ── -->
      <Transition name="filter-panel">
        <div v-show="traitFilterOpen" class="cs-filter-panel">
          <!-- Row 1: ALL reset + tier chips -->
          <div class="cs-filter-row">
            <button
              v-show="!hasSearchTraitMatch"
              class="trait-chip trait-chip--all"
              :class="{ 'trait-chip--active': activeTrait === 'all' && activeTier === 'all' }"
              @click="resetSearch"
            >ALL</button>
            <span v-show="!hasSearchTraitMatch" class="filter-sep"></span>
            <button
              v-for="[key, t] in tierEntries"
              :key="key"
              class="trait-chip"
              :class="{ 'trait-chip--active': activeTier === key }"
              :style="`--chip-color: ${t.color}`"
              @click="activeTier = key"
            >
              {{ t.label }}
            </button>
          </div>

          <!-- Row 2: Trait chips -->
          <template v-if="availableTraits.length">
            <div class="filter-divider">
              <span class="filter-divider-label">Traits</span>
            </div>
            <div class="cs-filter-row cs-filter-row--wrap">
              <TransitionGroup tag="div" name="chip" class="chip-group">
                <button
                  v-for="trait in availableTraits"
                  :key="trait.id"
                  v-show="!hasSearchTraitMatch || searchMatchedTraits.has(trait.id)"
                  class="trait-chip"
                  :class="{
                    'trait-chip--active': activeTrait === trait.id,
                    'trait-chip--search-match': searchMatchedTraits.has(trait.id) && activeTrait !== trait.id,
                  }"
                  :style="`--chip-color: ${trait.color}`"
                  @click="activeTrait = trait.id"
                >
                  <Icon :icon="trait.icon" class="trait-chip-icon" />
                  {{ trait.name }}
                </button>
              </TransitionGroup>
            </div>
          </template>

          <!-- Row 3: Origin chips -->
          <template v-if="availableOrigins.length">
            <div class="filter-divider">
              <span class="filter-divider-label">Origins</span>
            </div>
            <div class="cs-filter-row cs-filter-row--wrap">
              <TransitionGroup tag="div" name="chip" class="chip-group">
                <button
                  v-for="origin in availableOrigins"
                  :key="origin.origin"
                  v-show="!hasSearchTraitMatch || searchMatchedTraits.has(origin.origin)"
                  class="trait-chip"
                  :class="{
                    'trait-chip--active': activeTrait === origin.origin,
                    'trait-chip--search-match': searchMatchedTraits.has(origin.origin) && activeTrait !== origin.origin,
                  }"
                  :style="`--chip-color: ${origin.color}`"
                  @click="activeTrait = origin.origin"
                >
                  <Icon :icon="origin.icon" class="trait-chip-icon" />
                  {{ origin.origin }}
                </button>
              </TransitionGroup>
            </div>
          </template>
        </div>
      </Transition>
    </div>

    <!-- ── Grid ── -->
    <div class="csp-body">
      <div v-if="filteredChampions.length === 0" class="csp-empty">
        <Icon icon="game-icons:lyre" class="csp-empty-icon" />
        <span>{{
          roleFilteredChampions.length === 0
            ? `No ${activeRole} champions purchased!`
            : 'No champion found.'
        }}</span>
      </div>

      <div v-else class="csp-grid">
        <button
          v-for="champion in filteredChampions"
          :key="champion"
          class="csp-champ"
          :class="{
            'csp-champ--active': isActiveSelection(champion),
            'csp-champ--taken': !!takenLabel(champion),
          }"
          @click="emit('select', champion)"
        >
          <img
            :src="battleStore.getChampionImage(champion)"
            :alt="champion"
            class="csp-champ-img"
            @error="onImgError"
          />
          <div class="csp-champ-gradient" />
          <span class="csp-champ-name">{{ champion }}</span>
          <span class="csp-corner csp-corner--tl" />
          <span class="csp-corner csp-corner--br" />
          <div v-if="isActiveSelection(champion)" class="csp-active-overlay">
            <span class="csp-check">✓</span>
          </div>
          <div v-else-if="takenLabel(champion)" class="csp-taken-badge">
            {{ takenLabel(champion) }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.csp-root {
  --gold: #c89040;
  --gold-bright: #e8c060;
  --gold-dim: rgba(200, 144, 64, 0.32);
  --gold-glow: rgba(200, 144, 64, 0.2);
  --green: #6ec040;
  --green-glow: rgba(110, 192, 64, 0.32);
  --border: rgba(92, 51, 16, 0.45);

  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Tabs ── (mirrors ChampionSplashPanel .splash-action-bar / .action-bar-btn) */
.csp-tabs {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex-shrink: 0;
  background: rgba(6, 4, 1, 0.88);
  border-bottom: 1px solid rgba(122, 78, 32, 0.6);
  box-shadow:
    inset 0 -1px 0 rgba(92, 51, 16, 0.3),
    0 4px 20px rgba(0, 0, 0, 0.5);
  background-image: linear-gradient(
    to bottom,
    rgba(200, 144, 64, 0) calc(100% - 2px),
    rgba(200, 144, 64, 0.15) 100%
  );
}
.csp-tab {
  flex: 1;
  position: relative;
  height: 72px;
  padding: 0;
  background: #0c0906;
  border: none;
  cursor: pointer;
  color: rgba(200, 144, 64, 0.55);
  overflow: hidden;
  transition:
    color 0.15s,
    background 0.15s;
}
.csp-tab + .csp-tab {
  border-left: 1px solid rgba(92, 51, 16, 0.55);
}
.csp-tab::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 18%;
  right: 18%;
  height: 2px;
  background: rgba(200, 144, 64, 0);
  border-radius: 2px 2px 0 0;
  z-index: 4;
  transition: background 0.2s;
}
.csp-tab:hover::after {
  background: rgba(200, 144, 64, 0.65);
}
.csp-tab--active::after {
  background: rgba(200, 144, 64, 0.85);
}

/* Full-bleed champion image fills the whole tab button */
.csp-tab-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
  transition:
    transform 0.25s ease,
    filter 0.15s;
}
.csp-tab:hover .csp-tab-img {
  transform: scale(1.06);
  filter: brightness(1.08);
}
.csp-tab--active .csp-tab-img {
  filter: brightness(1.12) saturate(1.08);
}

.csp-tab-img--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: rgba(200, 144, 64, 0.3);
  background: #0c0906;
  border: 1px dashed rgba(92, 51, 16, 0.55);
}
.csp-tab:hover .csp-tab-img--empty {
  color: rgba(200, 144, 64, 0.55);
}

.csp-tab-gradient {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0) 58%);
  pointer-events: none;
}
.csp-tab--active .csp-tab-gradient {
  box-shadow: inset 0 0 0 1px rgba(200, 144, 64, 0.55);
}

.csp-tab-label {
  position: absolute;
  bottom: 5px;
  left: 0;
  right: 0;
  z-index: 3;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
  pointer-events: none;
}
.csp-tab:hover .csp-tab-label {
  color: #f0d870;
}
.csp-tab--active .csp-tab-label {
  color: #f0d870;
}

/* ── Search + filter header ──
   Search row, filter toggle, collapsible panel and chips are shared with
   ChampionShopComponent via .cs-* / .trait-chip classes in rpg-theme.css.
   This wrapper mirrors the shop's .cs-header spacing so both filters align. */
.csp-filter-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.3);
  flex-shrink: 0;
}

/* Close button flows inline at the end of the search row (mirrors the Shop) */
.cs-search-row .modal-close-btn {
  position: static;
  flex-shrink: 0;
  transform: none;
}

/* ── Body / Grid ── */
.csp-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px 12px;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #0d0a04;
}

.csp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  min-height: 220px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: rgba(200, 144, 64, 0.3);
}
.csp-empty-icon {
  font-size: 34px;
  opacity: 0.38;
}

.csp-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  align-content: start;
}

/* ── Champion Card ── */
.csp-champ {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: var(--bp-radius);
  cursor: pointer;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #0c0906;
  padding: 0;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.12s;
}
.csp-champ:hover {
  border-color: rgba(200, 144, 64, 0.9);
  box-shadow: 0 0 14px var(--gold-glow);
  transform: translateY(-2px) scale(1.025);
}
.csp-champ--active {
  border-color: var(--green);
  box-shadow: 0 0 16px var(--green-glow);
}
.csp-champ--taken {
  opacity: 0.42;
}

.csp-champ-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s;
  display: block;
}
.csp-champ:hover .csp-champ-img {
  transform: scale(1.08);
}

.csp-champ-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, transparent 52%);
  pointer-events: none;
  z-index: 1;
}

.csp-champ-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  padding: 0 3px 5px;
  font-size: 8px;
  font-weight: 900;
  color: rgba(215, 175, 75, 0.88);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.2;
  pointer-events: none;
}
.csp-champ:hover .csp-champ-name {
  color: #f0d060;
}
.csp-champ--active .csp-champ-name {
  color: #8ed84a;
}

/* Corner decorations */
.csp-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: rgba(200, 144, 64, 0.22);
  border-style: solid;
  pointer-events: none;
  z-index: 3;
  transition: border-color 0.15s;
}
.csp-champ:hover .csp-corner {
  border-color: rgba(200, 144, 64, 0.6);
}
.csp-champ--active .csp-corner {
  border-color: rgba(110, 192, 64, 0.5);
}
.csp-corner--tl {
  top: 2px;
  left: 2px;
  border-width: 1px 0 0 1px;
}
.csp-corner--br {
  bottom: 2px;
  right: 2px;
  border-width: 0 1px 1px 0;
}

/* Active overlay */
.csp-active-overlay {
  position: absolute;
  inset: 0;
  background: rgba(12, 36, 6, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}
.csp-check {
  font-size: 26px;
  color: var(--green);
  filter: drop-shadow(0 0 8px rgba(110, 192, 64, 0.9));
  line-height: 1;
}

/* Taken badge */
.csp-taken-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 4;
  padding: 2px 5px;
  background: rgba(14, 10, 4, 0.9);
  border: 1px solid rgba(200, 144, 64, 0.3);
  border-radius: 3px;
  font-size: 7px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.7);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1;
}
</style>
