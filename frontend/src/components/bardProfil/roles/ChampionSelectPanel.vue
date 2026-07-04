<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { CHAMPION_TRAITS, TRAIT_DEFINITIONS } from '@/config/championTraits'
import { ORIGIN_SYNERGIES, getChampionOrigin } from '@/config/championOrigins'
import { getChampionTier, getChampionStarLevel, CHAMPION_TIERS_BY_STAR } from '@/config/championTiers'
import { CHAMPION_DATA } from '@/config/championData'
import { CHAMPION_ROLES } from '@/config/championRoles'
import type { ChampionRole } from '@/types'

const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Supp']

const props = withDefaults(
  defineProps<{
    activeRole: string
    roleKey?: ChampionRole | null
    roleFilteredChampions: string[]
    headerSlots: (string | null)[]
    secondarySlots?: (string | null)[][]
    activeSlotIndex: number
    activeSubSlot?: number
    selectorTab?: 'main' | 'ally1' | 'ally2'
    showClose?: boolean
  }>(),
  {
    roleKey: null,
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
// Active cosmic-tier filter chip — 'all' or a star level (1..MAX_STAR_LEVEL).
const activeTier = ref<'all' | number>('all')
const traitFilterOpen = ref(false)

// Tier chips / sections are the 12 Champion Tiers (weak→strong), not price tiers.
const tierEntries = computed(() => CHAMPION_TIERS_BY_STAR)

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
    list = list.filter((c) => getChampionStarLevel(c) === activeTier.value)
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

// Group filtered champions into Champion Tier buckets (ascending star level),
// alphabetical order preserved within each tier — mirrors ChampionShopComponent.
const tierGroups = computed(() => {
  const groups = new Map<number, string[]>()
  for (const c of filteredChampions.value) {
    const star = getChampionStarLevel(c)
    const bucket = groups.get(star) ?? groups.set(star, []).get(star)!
    bucket.push(c)
  }
  return CHAMPION_TIERS_BY_STAR.filter((t) => groups.has(t.starLevel)).map((t) => ({
    tier: t.starLevel,
    starLevel: t.starLevel,
    label: t.name,
    color: t.color,
    icon: t.icon,
    champions: groups.get(t.starLevel)!,
  }))
})

// ── Tier collection progress (owned / total) ──
// Numerator: owned champions for this role, grouped by tier (roleFilteredChampions
// is already the owned-by-role pool, before the in-panel search/trait/tier filters).
const ownedByTier = computed(() => {
  const map = new Map<number, number>()
  for (const name of props.roleFilteredChampions) {
    if (name === 'Bard') continue
    const tier = getChampionStarLevel(name)
    map.set(tier, (map.get(tier) ?? 0) + 1)
  }
  return map
})
// Denominator: all champions that exist in this role, grouped by tier.
const totalByTier = computed(() => {
  const map = new Map<number, number>()
  for (const name of Object.keys(CHAMPION_DATA)) {
    if (name === 'Bard') continue
    if (props.roleKey && CHAMPION_ROLES[name] !== props.roleKey) continue
    const tier = getChampionStarLevel(name)
    map.set(tier, (map.get(tier) ?? 0) + 1)
  }
  return map
})
function tierOwned(tier: number): number {
  return ownedByTier.value.get(tier) ?? 0
}
function tierTotal(tier: number): number {
  return totalByTier.value.get(tier) ?? 0
}

// ── Collapsible tier sections (collapsed by default) ──
const ALL_TIER_KEYS = CHAMPION_TIERS_BY_STAR.map((t) => t.starLevel)
const collapsedTiers = ref(new Set<number>(ALL_TIER_KEYS))
// While searching/filtering, force every tier open so matches are never hidden.
const searchOrFilterActive = computed(
  () => searchQuery.value.trim() !== '' || hasActiveFilter.value,
)
function isTierCollapsed(tier: number): boolean {
  return searchOrFilterActive.value ? false : collapsedTiers.value.has(tier)
}
function toggleTier(tier: number) {
  const next = new Set(collapsedTiers.value)
  if (next.has(tier)) next.delete(tier)
  else next.add(tier)
  collapsedTiers.value = next
}
const allTiersCollapsed = computed(
  () =>
    !searchOrFilterActive.value &&
    tierGroups.value.length > 0 &&
    tierGroups.value.every((g) => collapsedTiers.value.has(g.tier)),
)
function toggleAllTiers() {
  collapsedTiers.value = allTiersCollapsed.value
    ? new Set()
    : new Set(tierGroups.value.map((g) => g.tier))
}

// Auto-open the tier of the most recently recruited (newly owned) champion, so a
// just-unlocked champion's section is open when assigning it to this role slot.
onMounted(() => {
  const recruited = battleStore.recruitedChampions
  const latest = recruited[recruited.length - 1]
  if (latest && props.roleFilteredChampions.includes(latest)) {
    const tier = getChampionStarLevel(latest)
    const next = new Set(collapsedTiers.value)
    next.delete(tier)
    collapsedTiers.value = next
  }
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

// Trait + origin details for a champion (mirrors ChampionShopComponent).
function getChampionDetail(name: string) {
  const traitIds = CHAMPION_TRAITS[name] ?? []
  const traits = TRAIT_DEFINITIONS.filter((t) => (traitIds as string[]).includes(t.id))
  const originKey = getChampionOrigin(name)
  const origin = originKey ? ORIGIN_SYNERGIES[originKey] ?? null : null
  const cosmic = getChampionTier(name)
  const starLevel = getChampionStarLevel(name)
  return { traits, origin, cosmic, starLevel }
}

// Card tier badge → the champion's Cosmic/Champion Tier (★N) — the single tier.
function getTierColor(name: string): string {
  return getChampionTier(name).color
}

function getChampionTierLabel(name: string): string {
  return `★${getChampionStarLevel(name)}`
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

        <!-- Collapse / expand all tier sections -->
        <button
          v-if="tierGroups.length > 1"
          class="tier-collapse-all"
          :class="{ 'tier-collapse-all--active': allTiersCollapsed }"
          :title="allTiersCollapsed ? 'Expand all tiers' : 'Collapse all tiers'"
          :aria-label="allTiersCollapsed ? 'Expand all tiers' : 'Collapse all tiers'"
          @click="toggleAllTiers"
          @keydown.enter.prevent="toggleAllTiers"
          @keydown.space.prevent="toggleAllTiers"
        >
          <Icon :icon="allTiersCollapsed ? 'game-icons:expand' : 'game-icons:contract'" width="16" height="16" />
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
              v-for="t in tierEntries"
              :key="t.starLevel"
              class="trait-chip"
              :class="{ 'trait-chip--active': activeTier === t.starLevel }"
              :style="`--chip-color: ${t.color}`"
              :title="`★${t.starLevel} ${t.name}`"
              @click="activeTier = t.starLevel"
            >
              <Icon :icon="t.icon" class="trait-chip-icon" />
              {{ t.name }}
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

      <div v-else class="csp-tier-groups">
        <div v-for="group in tierGroups" :key="group.tier" class="csp-tier-group">
          <!-- Tier header: cosmic identity + owned/total progress counter (click to collapse) -->
          <div
            class="tier-header"
            :class="{ 'is-collapsed': isTierCollapsed(group.tier) }"
            :style="{ '--tier-c': group.color }"
            role="button"
            tabindex="0"
            :aria-expanded="!isTierCollapsed(group.tier)"
            @click="toggleTier(group.tier)"
            @keydown.enter.prevent="toggleTier(group.tier)"
            @keydown.space.prevent="toggleTier(group.tier)"
          >
            <span class="tier-header-chevron">▾</span>
            <Icon :icon="group.icon" class="tier-header-icon" width="15" height="15" />
            <span class="tier-header-label">{{ group.label }}</span>
            <span class="tier-header-stars">★{{ group.starLevel }}</span>
            <span class="tier-header-line"></span>
            <span class="tier-header-counter">
              <span class="tier-header-count">{{ tierOwned(group.tier) }}/{{ tierTotal(group.tier) }}</span>
            </span>
          </div>

          <div v-show="!isTierCollapsed(group.tier)" class="csp-grid">
            <button
              v-for="champion in group.champions"
              :key="champion"
              class="csp-champ"
          :class="{
            'csp-champ--active': isActiveSelection(champion),
            'csp-champ--taken': !!takenLabel(champion),
          }"
          :data-role="CHAMPION_ROLES[champion]"
          @click="emit('select', champion)"
        >
          <!-- Image + gradient overlay -->
          <img
            :src="battleStore.getChampionImage(champion)"
            :alt="champion"
            class="csp-champ-img"
            @error="onImgError"
          />
          <div class="csp-champ-gradient card-overlay card-overlay--default" />
          <div class="csp-champ-shimmer card-shimmer card-shimmer-anim" />

          <!-- Tier badge: top-left — Cosmic/Champion Tier (★N) -->
          <div
            class="tier-badge"
            :style="{ '--tier-c': getTierColor(champion) }"
            :title="getChampionDetail(champion).cosmic.name"
          >
            {{ getChampionTierLabel(champion) }}
          </div>

          <!-- Content: name + always-visible trait/origin badges -->
          <div class="csp-champ-content">
            <span
              class="champion-name"
              :class="takenLabel(champion) ? 'champion-name--dim' : 'champion-name--bright'"
            >
              {{ champion }}
            </span>
            <div class="card-traits-section">
              <div
                v-for="trait in getChampionDetail(champion).traits"
                :key="trait.id"
                class="card-trait-badge"
                :style="{ '--tc': trait.color }"
              >
                <Icon :icon="trait.icon" class="card-trait-icon" />
                <span>{{ trait.name }}</span>
              </div>
              <div
                v-if="getChampionDetail(champion).origin"
                class="card-trait-badge"
                :style="{ '--tc': getChampionDetail(champion).origin!.color }"
              >
                <Icon :icon="getChampionDetail(champion).origin!.icon" class="card-trait-icon" />
                <span>{{ getChampionDetail(champion).origin!.origin }}</span>
              </div>
            </div>
          </div>

          <!-- Selected overlay -->
          <div v-if="isActiveSelection(champion)" class="csp-active-overlay">
            <span class="csp-check">✓</span>
          </div>
          <!-- Taken-in-another-slot badge -->
          <div v-else-if="takenLabel(champion)" class="csp-taken-badge">
            {{ takenLabel(champion) }}
          </div>
            </button>
          </div>
        </div>
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

/* ── Tabs ── (RPG action-bar styling, shared look with the Team tab) */
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

/* ── Tier groups (mirrors the Shop's tier sections; header styles shared in
   rpg-theme.css → .tier-header*) ── */
.csp-tier-group + .csp-tier-group {
  margin-top: 10px;
}

.csp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  align-content: start;
}

/* ── Champion Card ── (shares the Shop's visual DNA) */
.csp-champ {
  position: relative;
  height: 140px;
  border-radius: var(--bp-radius);
  cursor: pointer;
  overflow: hidden;
  border: 1px solid var(--rpg-wood-mid);
  background: #0c0906;
  padding: 0;
  transition:
    border-color 0.2s ease,
    box-shadow 0.25s ease,
    transform 0.18s ease;
}

/* Role-colored border (mirrors ChampionShopComponent data-role rules) */
.csp-champ[data-role='top']     { --role-c: #e05050; --role-c-hi: #f07070; }
.csp-champ[data-role='jungle']  { --role-c: #50c060; --role-c-hi: #70d880; }
.csp-champ[data-role='mid']     { --role-c: #5090e8; --role-c-hi: #70a8f8; }
.csp-champ[data-role='adc']     { --role-c: #e89840; --role-c-hi: #f0b060; }
.csp-champ[data-role='support'] { --role-c: #b8c8d8; --role-c-hi: #d0dde8; }
.csp-champ[data-role] {
  border-color: var(--role-c);
}

/* Per-role hover glow + subtle lift — excluded on active/taken so state wins */
.csp-champ:hover {
  transform: translateY(-2px) scale(1.025);
}
.csp-champ[data-role='top']:not(.csp-champ--active):not(.csp-champ--taken):hover {
  border-color: #f07070;
  box-shadow: inset 0 0 0 1px rgba(224, 80, 80, 0.25), 0 0 14px rgba(224, 80, 80, 0.35);
}
.csp-champ[data-role='jungle']:not(.csp-champ--active):not(.csp-champ--taken):hover {
  border-color: #70d880;
  box-shadow: inset 0 0 0 1px rgba(80, 192, 96, 0.25), 0 0 14px rgba(80, 192, 96, 0.4);
}
.csp-champ[data-role='mid']:not(.csp-champ--active):not(.csp-champ--taken):hover {
  border-color: #70a8f8;
  box-shadow: inset 0 0 0 1px rgba(80, 144, 232, 0.3), 0 0 16px rgba(80, 144, 232, 0.45);
}
.csp-champ[data-role='adc']:not(.csp-champ--active):not(.csp-champ--taken):hover {
  border-color: #f0b060;
  box-shadow: inset 0 0 0 1px rgba(232, 152, 64, 0.25), 0 0 16px rgba(232, 152, 64, 0.4);
}
.csp-champ[data-role='support']:not(.csp-champ--active):not(.csp-champ--taken):hover {
  border-color: #d0dde8;
  box-shadow: inset 0 0 0 1px rgba(184, 200, 216, 0.3), 0 0 16px rgba(184, 200, 216, 0.35);
}

/* Selected (active) — green, mirrors the Shop's green state language */
.csp-champ--active {
  border-color: #e8c040;
  box-shadow:
    0 0 22px rgba(110, 192, 64, 0.45),
    inset 0 0 0 2px rgba(110, 192, 64, 0.55);
}
.csp-champ--active[data-role] {
  border-color: var(--rpg-green-border);
}

/* Taken in another slot — dimmed + slight grayscale */
.csp-champ--taken {
  opacity: 0.45;
  filter: grayscale(35%);
}
.csp-champ--taken:hover {
  opacity: 0.7;
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

/* ── Gradient overlay (ported from Shop .card-overlay) ── */
.csp-champ-gradient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.card-overlay--default {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.45) 50%,
    rgba(0, 0, 0, 0.1) 100%
  );
}

/* ── Light shimmer sweep on hover (ported from Shop) ── */
.csp-champ-shimmer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.07), transparent);
  transform: translateX(-100%);
  transition: transform 0.7s ease;
}
.csp-champ:hover .csp-champ-shimmer {
  transform: translateX(100%);
}

/* ── Content: name + always-visible trait/origin badges ── */
.csp-champ-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
  padding: 6px 7px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  pointer-events: none;
}

/* Name typography (ported from Shop .champion-name).
   text-align:left overrides the <button>'s default centering. */
.champion-name {
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.1;
  text-align: left;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
}
.champion-name--bright { color: rgba(255, 255, 255, 0.95); }
.champion-name--dim { color: rgba(255, 255, 255, 0.45); }
.csp-champ--active .champion-name {
  color: #8ed84a;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(110, 192, 64, 0.3);
}

/* Trait/origin badges (ported from Shop .card-trait-badge) */
.card-traits-section {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.card-trait-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px 3px 4px;
  border-radius: var(--bp-radius);
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid var(--tc, #7a4e20);
  font-size: 0.52rem;
  font-weight: 700;
  line-height: 1;
  color: var(--tc, #e8c040);
  text-transform: uppercase;
  white-space: nowrap;
  box-shadow: 0 0 6px color-mix(in srgb, var(--tc, #7a4e20) 30%, transparent);
}
/* Champion Tier (star level) badge — slightly stronger fill to read as the primary tag */
.card-cosmic-badge {
  background: color-mix(in srgb, var(--tc, #7a4e20) 18%, rgba(0, 0, 0, 0.6));
}
.card-trait-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.9);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

/* ── Tier badge: top-left (ported from Shop .tier-badge) ── */
.tier-badge {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 4;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: var(--tier-c);
  background: rgba(0, 0, 0, 0.78);
  border: 1px solid color-mix(in srgb, var(--tier-c) 70%, #111);
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.2;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.7), 0 0 8px color-mix(in srgb, var(--tier-c) 25%, transparent);
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

@media (prefers-reduced-motion: reduce) {
  .csp-champ,
  .csp-champ-img,
  .csp-champ-shimmer {
    transition: border-color 0.2s ease, box-shadow 0.25s ease !important;
    transform: none !important;
  }
  .csp-champ:hover {
    transform: none !important;
  }
}
</style>
