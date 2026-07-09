<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { CHAMPION_TRAITS, TRAIT_DEFINITIONS } from '@/config/championTraits'
import { ORIGIN_SYNERGIES, getChampionOrigin } from '@/config/championOrigins'
import { getChampionTier, getChampionStarLevel, CHAMPION_TIERS_BY_STAR } from '@/config/championTiers'
import { CHAMPION_DATA } from '@/config/championData'
import { CHAMPION_ROLES } from '@/config/championRoles'
import { createEmptyAllyRows, ROLE_BY_KEY } from '@/config/constants'
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
    /** -1 = main slot, 0..N-1 = ally sub-slot */
    activeSubSlot?: number
    showClose?: boolean
  }>(),
  {
    roleKey: null,
    secondarySlots: () => createEmptyAllyRows(),
    activeSubSlot: -1,
    showClose: false,
  },
)

const emit = defineEmits<{
  select: [champion: string]
  'tab-change': [subSlot: number]
  close: []
}>()

const battleStore = useBattleStore()
const searchQuery = ref('')
// Multi-select trait/origin filter — mirrors the Champion Shop filter exactly.
const activeTraits = ref<string[]>([])
// Active cosmic-tier filter chip — 'all' or a star level (1..MAX_STAR_LEVEL).
const activeTier = ref<'all' | number>('all')
const traitFilterOpen = ref(false)

// Tier chips / sections are the 12 Champion Tiers (weak→strong), not price tiers.
const tierEntries = computed(() => CHAMPION_TIERS_BY_STAR)

// Slot rail data: the active role's ally row (Main chip + A1..AN chips).
const allyRow = computed(
  () => props.secondarySlots?.[props.activeSlotIndex] ?? createEmptyAllyRows()[0],
)

/** Accent color of the active role — drives the slot rail's active state. */
const roleColor = computed(
  () => (props.roleKey ? ROLE_BY_KEY[props.roleKey]?.color : null) ?? '#e8c060',
)

/** Champion currently assigned to a slot tab (-1 = main, 0..N-1 = ally). */
function tabChampion(subSlot: number): string | null {
  if (subSlot === -1) return props.headerSlots[props.activeSlotIndex] ?? null
  return allyRow.value[subSlot] ?? null
}

const mainChampion = computed(() => tabChampion(-1))


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
const noTraitFound = computed(
  () => searchQuery.value.trim() !== '' && !hasSearchTraitMatch.value,
)

// Mirrors the Champion Shop filter toggle: lit dot / active state when a
// trait/origin or tier is selected.
const hasActiveFilter = computed(
  () => activeTraits.value.length > 0 || activeTier.value !== 'all',
)

// ── Active filter summary chips (shown even with the panel collapsed) ──
const activeTierDef = computed(() =>
  activeTier.value === 'all'
    ? null
    : (CHAMPION_TIERS_BY_STAR.find((t) => t.starLevel === activeTier.value) ?? null),
)
const activeTraitChips = computed(() =>
  activeTraits.value.map((id) => {
    const trait = TRAIT_DEFINITIONS.find((t) => t.id === id)
    if (trait) return { id, label: trait.name, icon: trait.icon, color: trait.color }
    const origin = ORIGIN_SYNERGIES[id as keyof typeof ORIGIN_SYNERGIES]
    return { id, label: id, icon: origin?.icon ?? '', color: origin?.color ?? '#c89040' }
  }),
)

function toggleTrait(id: string) {
  activeTraits.value = activeTraits.value.includes(id)
    ? activeTraits.value.filter((t) => t !== id)
    : [...activeTraits.value, id]
}

/** Clears tier + trait filters but keeps the search text (mirrors the Shop). */
function clearFilters() {
  activeTraits.value = []
  activeTier.value = 'all'
}

function resetSearch() {
  searchQuery.value = ''
  clearFilters()
}

/** Arrow-key navigation between filter chips (mirrors the Shop). */
function onChipKeydown(event: KeyboardEvent, _id: string) {
  const panel = (event.target as HTMLElement).closest('.cs-filter-panel')
  if (!panel) return
  const chips = Array.from(panel.querySelectorAll<HTMLElement>('.trait-chip[tabindex="0"]'))
  const idx = chips.indexOf(event.target as HTMLElement)
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    chips[(idx + 1) % chips.length]?.focus()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    chips[(idx - 1 + chips.length) % chips.length]?.focus()
  }
}

// Auto-open the filter panel while searching, auto-collapse when cleared and
// no trait is active — same behaviour as ChampionShopComponent.
watch(searchQuery, (q) => {
  if (q.trim()) {
    traitFilterOpen.value = true
  } else if (activeTraits.value.length === 0) {
    traitFilterOpen.value = false
  }
})

const filteredChampions = computed(() => {
  let list = props.roleFilteredChampions

  if (activeTraits.value.length > 0) {
    // AND semantics: a champion must match EVERY selected trait/origin chip.
    list = list.filter((c) => {
      const champTraits = CHAMPION_TRAITS[c] ?? []
      const champOrigin = getChampionOrigin(c)
      return activeTraits.value.every(
        (t) => (champTraits as string[]).includes(t) || champOrigin === t,
      )
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

// ── Collapsible tier sections (open by default — no accordion friction on open) ──
const collapsedTiers = ref(new Set<number>())
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
      if (props.secondarySlots[r].includes(champion)) return ROLES[r]
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
    <!-- ── Slot rail: big Main chip first, compact ally chips after ── -->
    <div class="csp-slot-rail" :style="{ '--role-c': roleColor }">
      <button
        class="csp-slot csp-slot--main"
        :class="{ 'csp-slot--active': activeSubSlot === -1 }"
        :title="tabChampion(-1) ?? `Assign your ${activeRole} main champion`"
        @click="emit('tab-change', -1)"
      >
        <span class="csp-slot-portrait">
          <img
            v-if="mainChampion"
            :src="battleStore.getChampionImage(mainChampion)"
            :alt="mainChampion"
            class="csp-slot-img"
            @error="onImgError"
          />
          <span v-else class="csp-slot-plus">＋</span>
        </span>
        <span v-if="mainChampion" class="csp-slot-info">
          <span class="csp-slot-info-name">{{ mainChampion }}</span>
        </span>
      </button>

      <span class="csp-slot-rail-sep" aria-hidden="true"></span>

      <button
        v-for="(ally, k) in allyRow"
        :key="`slot-${k}`"
        class="csp-slot csp-slot--ally"
        :class="{ 'csp-slot--active': activeSubSlot === k }"
        :title="ally ?? `Assign Ally ${k + 1}`"
        @click="emit('tab-change', k)"
      >
        <span class="csp-slot-portrait csp-slot-portrait--round">
          <img
            v-if="ally"
            :src="battleStore.getChampionImage(ally)"
            :alt="ally"
            class="csp-slot-img"
            @error="onImgError"
          />
          <span v-else class="csp-slot-plus">＋</span>
        </span>
        <span v-if="ally" class="csp-slot-info csp-slot-info--ally">
          <span class="csp-slot-info-name">{{ ally }}</span>
        </span>
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

      <!-- ── Active filter summary: always visible while filters are set ── -->
      <div v-if="hasActiveFilter" class="cs-active-filters">
        <button class="trait-chip trait-chip--clear-all" @click="clearFilters">
          × Clear filters
        </button>
        <span class="filter-sep"></span>
        <span class="cs-active-label">Active:</span>
        <button
          v-if="activeTierDef"
          class="trait-chip trait-chip--active"
          :style="`--chip-color: ${activeTierDef.color}`"
          title="Remove tier filter"
          @click="activeTier = 'all'"
        >
          <Icon :icon="activeTierDef.icon" class="trait-chip-icon" />
          {{ activeTierDef.name }}
          <span class="chip-dismiss">×</span>
        </button>
        <button
          v-for="chip in activeTraitChips"
          :key="chip.id"
          class="trait-chip trait-chip--active"
          :style="`--chip-color: ${chip.color}`"
          :title="`Remove ${chip.label} filter`"
          @click="toggleTrait(chip.id)"
        >
          <Icon v-if="chip.icon" :icon="chip.icon" class="trait-chip-icon" />
          {{ chip.label }}
          <span class="chip-dismiss">×</span>
        </button>
      </div>

      <!-- ── Filter panel: labeled category sections (mirrors the Shop) ── -->
      <Transition name="filter-panel">
        <div v-show="traitFilterOpen" class="cs-filter-panel">
          <!-- Section: Tier -->
          <div class="filter-divider">
            <span class="filter-divider-label">Tier</span>
          </div>
          <div class="cs-filter-row cs-filter-row--wrap">
            <button
              v-for="t in tierEntries"
              :key="t.starLevel"
              class="trait-chip"
              :class="{ 'trait-chip--active': activeTier === t.starLevel }"
              :style="`--chip-color: ${t.color}`"
              :title="`★${t.starLevel} ${t.name}`"
              @click="activeTier = activeTier === t.starLevel ? 'all' : t.starLevel"
            >
              <Icon :icon="t.icon" class="trait-chip-icon" />
              {{ t.name }}
            </button>
          </div>

          <!-- Section: Traits -->
          <template v-if="availableTraits.length">
            <div class="filter-divider">
              <span class="filter-divider-label">Traits</span>
            </div>
            <div v-if="noTraitFound" class="trait-empty-state">No trait found</div>
            <div v-else class="cs-filter-row cs-filter-row--wrap">
              <TransitionGroup tag="div" name="chip" class="chip-group">
                <button
                  v-for="trait in availableTraits"
                  :key="trait.id"
                  v-show="!hasSearchTraitMatch || searchMatchedTraits.has(trait.id)"
                  class="trait-chip"
                  :class="{
                    'trait-chip--active': activeTraits.includes(trait.id),
                    'trait-chip--search-match': searchMatchedTraits.has(trait.id) && !activeTraits.includes(trait.id),
                  }"
                  :style="`--chip-color: ${trait.color}`"
                  tabindex="0"
                  @click="toggleTrait(trait.id)"
                  @keydown="onChipKeydown($event, trait.id)"
                >
                  <Icon :icon="trait.icon" class="trait-chip-icon" />
                  {{ trait.name }}
                  <span v-if="activeTraits.includes(trait.id)" class="chip-dismiss" @click.stop="toggleTrait(trait.id)">×</span>
                </button>
              </TransitionGroup>
            </div>
          </template>

          <!-- Section: Origins -->
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
                    'trait-chip--active': activeTraits.includes(origin.origin),
                    'trait-chip--search-match': searchMatchedTraits.has(origin.origin) && !activeTraits.includes(origin.origin),
                  }"
                  :style="`--chip-color: ${origin.color}`"
                  tabindex="0"
                  @click="toggleTrait(origin.origin)"
                  @keydown="onChipKeydown($event, origin.origin)"
                >
                  <Icon :icon="origin.icon" class="trait-chip-icon" />
                  {{ origin.origin }}
                  <span v-if="activeTraits.includes(origin.origin)" class="chip-dismiss" @click.stop="toggleTrait(origin.origin)">×</span>
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

          <!-- Content: name + trait/origin icon row (names in tooltips) -->
          <div
            class="csp-champ-content"
            :class="{ 'csp-champ-content--lifted': isActiveSelection(champion) }"
          >
            <span
              class="champion-name"
              :class="takenLabel(champion) ? 'champion-name--dim' : 'champion-name--bright'"
            >
              {{ champion }}
            </span>
            <div class="csp-trait-icons">
              <span
                v-for="trait in getChampionDetail(champion).traits"
                :key="trait.id"
                class="csp-trait-icon"
                :title="trait.name"
                :style="{ color: trait.color }"
              >
                <Icon :icon="trait.icon" width="16" height="16" />
              </span>
              <span
                v-if="getChampionDetail(champion).origin"
                class="csp-trait-icon"
                :title="getChampionDetail(champion).origin!.origin"
                :style="{ color: getChampionDetail(champion).origin!.color }"
              >
                <Icon :icon="getChampionDetail(champion).origin!.icon" width="16" height="16" />
              </span>
            </div>
          </div>

          <!-- Currently equipped in the active slot -->
          <div v-if="isActiveSelection(champion)" class="csp-equipped-band">✓ Equipped</div>
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

/* ── Slot rail ── Main chip first (big), ally chips after (compact).
   Active slot lights up in the role color (--role-c set on the rail root). */
.csp-slot-rail {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 10px 44px 10px 12px; /* right padding keeps clear of the floating close */
  background: #0c0906;
  border-bottom: 1px solid rgba(122, 78, 32, 0.6);
}
/* Slot = borderless group of portrait + per-champion info. State ring sits on
   the portrait; main square + bigger, allies round. */
.csp-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0;
  cursor: pointer;
  background: none;
  border: none;
  color: rgba(200, 144, 64, 0.65);
  transition: transform 0.15s;
}
.csp-slot:hover {
  color: #e8c060;
  transform: translateY(-1px);
}
/* Allies share the remaining rail width in equal parts → identical spacing,
   full header width used. Main keeps its natural (fixed) width. */
.csp-slot--main {
  flex-shrink: 0;
}
.csp-slot--ally {
  flex: 1 1 0;
  min-width: 0;
}
.csp-slot--active {
  color: var(--role-c);
}
.csp-slot-portrait {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
  background: #0a0704;
  border: 2px solid rgba(122, 78, 32, 0.55);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.csp-slot--main .csp-slot-portrait {
  width: 76px;
  height: 76px;
}
.csp-slot--ally .csp-slot-portrait {
  width: 54px;
  height: 54px;
}
.csp-slot-portrait--round {
  border-radius: 50%;
}
.csp-slot:hover .csp-slot-portrait {
  border-color: rgba(200, 144, 64, 0.8);
}
.csp-slot--active .csp-slot-portrait {
  border-color: var(--role-c);
  box-shadow: 0 0 14px color-mix(in srgb, var(--role-c) 45%, transparent);
}

/* Per-champion info beside each portrait */
.csp-slot-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  text-align: left;
}
.csp-slot-info {
  flex: 1;
}
.csp-slot-info-name {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.csp-slot--main .csp-slot-info-name {
  max-width: 130px;
}
.csp-slot-info--ally .csp-slot-info-name {
  font-size: 12px;
}
.csp-slot--active .csp-slot-info-name {
  color: var(--role-c);
}
.csp-slot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}
.csp-slot-plus {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: rgba(200, 144, 64, 0.4);
}
.csp-slot:hover .csp-slot-plus,
.csp-slot--active .csp-slot-plus {
  color: currentColor;
}
.csp-slot-rail-sep {
  width: 1px;
  align-self: stretch;
  margin: 4px 2px;
  background: rgba(122, 78, 32, 0.45);
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

/* active filter summary bar (below the search row — mirrors the Shop) */
.cs-active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 3px 2px 1px;
}
.cs-active-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(200, 164, 90, 0.55);
  margin-right: 2px;
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
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
  align-content: start;
}

/* ── Champion Card ── (shares the Shop's visual DNA) */
.csp-champ {
  position: relative;
  height: 210px;
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

/* Selected (active) — gold, matches the equipped band */
.csp-champ--active,
.csp-champ--active[data-role] {
  border-color: #e8c040;
  box-shadow:
    0 0 18px rgba(232, 192, 64, 0.35),
    inset 0 0 0 1px rgba(232, 192, 64, 0.5);
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

/* ── Content: name + trait/origin icon row ── */
.csp-champ-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
  padding: 7px 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  text-align: left;
  pointer-events: none;
  transition: bottom 0.15s;
}
/* Lift the content above the equipped band */
.csp-champ-content--lifted {
  bottom: 20px;
}

/* Name typography (ported from Shop .champion-name).
   text-align:left overrides the <button>'s default centering. */
.champion-name {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.1;
  text-align: left;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
}
.champion-name--bright { color: rgba(255, 255, 255, 0.95); }
.champion-name--dim { color: rgba(255, 255, 255, 0.45); }
.csp-champ--active .champion-name {
  color: #f0d870;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(232, 192, 64, 0.3);
}

/* Trait/origin icons — names live in the title tooltips, keeps cards clean */
.csp-trait-icons {
  display: flex;
  align-items: center;
  gap: 5px;
  pointer-events: auto;
}
.csp-trait-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid color-mix(in srgb, currentColor 55%, transparent);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

/* ── Tier badge: top-left (ported from Shop .tier-badge) ── */
.tier-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 4;
  font-size: 11px;
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

/* Equipped band — bottom strip on the champion currently in the active slot */
.csp-equipped-band {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 4;
  padding: 3px 0;
  text-align: center;
  background: #e8c040;
  color: #1a1204;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1.3;
  pointer-events: none;
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
