<script setup lang="ts">
/**
 * The champion picker, as the RIGHT column of the role details page.
 *
 * It is the modal's grid without the modal: search, the trait/origin/tier
 * filter panel and the tier sections all survived the move, only narrower —
 * three cards per row instead of five, and the slot rail is gone because the
 * details page already has a roster strip naming the seat being filled.
 *
 * Two events leave here: `preview` on hover/focus, which the compare column
 * beside it turns into a side-by-side against the champion currently seated,
 * and `select` on click, which assigns.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import RpgSearchBar from '@/components/ui/RpgSearchBar.vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { CHAMPION_TRAITS, TRAIT_DEFINITIONS } from '@/config/champions/championTraits'
import { ORIGIN_SYNERGIES, getChampionOrigin } from '@/config/champions/championOrigins'
import {
  getChampionTier,
  getChampionStarLevel,
  CHAMPION_TIERS_BY_STAR,
} from '@/config/champions/championTiers'
import { CHAMPION_DATA, CHAMPION_ROLES, getChampionRoles } from '@/config/champions/championData'
import {
  ROLE_BY_KEY,
  ROLES,
  CHAMPION_PICKER_CARD_MIN_WIDTH,
  CHAMPION_PICKER_CARD_HEIGHT,
  CHAMPION_PICKER_GRID_GAP,
  CHAMPION_PICKER_OVERSCAN_ROWS,
} from '@/config/constants'
import { useVirtualGrid } from '@/composables/ui/useVirtualGrid'
import type { ChampionRole } from '@/types'

const props = defineProps<{
  /** Role whose champions are on offer — the pool is filtered to it. */
  roleKey: ChampionRole
  /** Slot index of that role, used to read what is already seated. */
  roleIndex: number
  /** -1 = the role's main seat, 0…n = an ally sub-slot. */
  subSlot: number
}>()

const emit = defineEmits<{
  select: [champion: string]
  /**
   * Card under the cursor or keyboard focus. Only ever a name, never a
   * clearing null: the compare column keeps the last one on screen after the
   * pointer leaves, which is what makes its Assign button reachable.
   */
  preview: [champion: string]
}>()

const cardMinWidthPx = `${CHAMPION_PICKER_CARD_MIN_WIDTH}px`
const cardHeightPx = `${CHAMPION_PICKER_CARD_HEIGHT}px`
const gridGapPx = `${CHAMPION_PICKER_GRID_GAP}px`

const battleStore = useBattleStore()
const expeditionStore = useExpeditionStore()
const levelStore = useChampionLevelStore()

const searchQuery = ref('')
/** Multi-select trait/origin filter — AND semantics, mirrors the Champion Shop. */
const activeTraits = ref<string[]>([])
/** Active cosmic-tier chip — 'all' or a star level. */
const activeTier = ref<'all' | number>('all')
const traitFilterOpen = ref(false)

const roleLabel = computed(() => ROLE_BY_KEY[props.roleKey]?.label ?? '')

/** Owned champions that can play this role — Bard never fills a team slot. */
const rolePool = computed(() =>
  battleStore.ownedChampions.filter(
    (c) => c !== 'Bard' && getChampionRoles(c).includes(props.roleKey),
  ),
)

// ── Filters ──────────────────────────────────────────────────────────────────
const tierEntries = computed(() => CHAMPION_TIERS_BY_STAR)

const availableTraits = computed(() => {
  const seen = new Set<string>()
  for (const name of rolePool.value) {
    for (const tid of CHAMPION_TRAITS[name] ?? []) seen.add(tid)
  }
  return TRAIT_DEFINITIONS.filter((t) => seen.has(t.id))
})

const availableOrigins = computed(() => {
  const seen = new Set<string>()
  for (const name of rolePool.value) {
    const o = getChampionOrigin(name)
    if (o && ORIGIN_SYNERGIES[o]) seen.add(o)
  }
  return (
    Object.values(ORIGIN_SYNERGIES) as Array<{
      origin: string
      name: string
      icon: string
      color: string
    }>
  )
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
const noTraitFound = computed(() => searchQuery.value.trim() !== '' && !hasSearchTraitMatch.value)

const hasActiveFilter = computed(
  () => activeTraits.value.length > 0 || activeTier.value !== 'all',
)

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

function clearFilters() {
  activeTraits.value = []
  activeTier.value = 'all'
}

function resetSearch() {
  searchQuery.value = ''
  clearFilters()
}

/** Arrow-key navigation between filter chips (mirrors the Shop). */
function onChipKeydown(event: KeyboardEvent) {
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

// Auto-open the filter panel while searching, auto-collapse when cleared and no
// trait is active — same behaviour as the Champion Shop.
watch(searchQuery, (q) => {
  if (q.trim()) {
    traitFilterOpen.value = true
  } else if (activeTraits.value.length === 0) {
    traitFilterOpen.value = false
  }
})

const filteredChampions = computed(() => {
  let list = rolePool.value

  if (activeTraits.value.length > 0) {
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

// ── Tier sections ────────────────────────────────────────────────────────────
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

/** Owned per tier — the pool is already owned-by-role, before the UI filters. */
const ownedByTier = computed(() => {
  const map = new Map<number, number>()
  for (const name of rolePool.value) {
    map.set(getChampionStarLevel(name), (map.get(getChampionStarLevel(name)) ?? 0) + 1)
  }
  return map
})
/** Everything that exists in this role, per tier — the denominator. */
const totalByTier = computed(() => {
  const map = new Map<number, number>()
  for (const name of Object.keys(CHAMPION_DATA)) {
    if (name === 'Bard') continue
    if (CHAMPION_ROLES[name] !== props.roleKey) continue
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

const collapsedTiers = ref(new Set<number>())
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

// ── Grid virtualisation ──────────────────────────────────────────────────────
// The pool holds every owned champion of the role, and the column scrolls far
// past its own height — only the rows near the viewport are rendered, the rest
// is padding of exactly the height the missing rows would have had.
const bodyEl = ref<HTMLElement | null>(null)
const virtualSections = computed(() =>
  tierGroups.value.map((g) => ({
    key: g.tier,
    items: g.champions,
    collapsed: isTierCollapsed(g.tier),
  })),
)
const { setGridEl, windowOf } = useVirtualGrid({
  scrollEl: bodyEl,
  sections: virtualSections,
  minColumnWidth: CHAMPION_PICKER_CARD_MIN_WIDTH,
  rowHeight: CHAMPION_PICKER_CARD_HEIGHT,
  gap: CHAMPION_PICKER_GRID_GAP,
  overscanRows: CHAMPION_PICKER_OVERSCAN_ROWS,
})
const renderGroups = computed(() =>
  tierGroups.value.map((group, i) => ({ ...group, slice: windowOf(virtualSections.value[i]) })),
)

// A just-recruited champion's tier opens on mount, so the newest card is never
// behind a collapsed header.
onMounted(() => {
  const recruited = battleStore.recruitedChampions
  const latest = recruited[recruited.length - 1]
  if (latest && rolePool.value.includes(latest)) {
    const next = new Set(collapsedTiers.value)
    next.delete(getChampionStarLevel(latest))
    collapsedTiers.value = next
  }
})

// ── Card state ───────────────────────────────────────────────────────────────
function isSeatedHere(champion: string): boolean {
  if (props.subSlot === -1) return battleStore.headerSlots[props.roleIndex] === champion
  return (battleStore.secondarySlots[props.roleIndex] ?? [])[props.subSlot] === champion
}

/**
 * Ist der Champion gerade unterwegs? Dann ist die Karte gesperrt und nicht nur
 * gedimmt: „sitzt woanders" darf man anklicken und der Champion zieht um,
 * „unterwegs" wird abgelehnt — ein still verschluckter Klick wäre schlimmer als
 * eine graue Karte.
 */
function isAway(champion: string): boolean {
  return expeditionStore.championsOnExpedition.includes(champion)
}

/** Role short label of the seat that already holds this champion, if any. */
function takenLabel(champion: string): string | null {
  if (isSeatedHere(champion)) return null
  const mainIdx = battleStore.headerSlots.indexOf(champion)
  if (mainIdx >= 0) return ROLES[mainIdx]?.short ?? null
  for (let r = 0; r < battleStore.secondarySlots.length; r++) {
    if ((battleStore.secondarySlots[r] ?? []).includes(champion)) return ROLES[r]?.short ?? null
  }
  return null
}

/**
 * The champion's level, shown from 2 upward. It belongs on the card because it
 * is half the answer to "which of mine should sit here": a tier-3 champion at
 * level 20 out-stats a tier-5 at level 1, and the compare column can only say
 * so about the one card under the cursor.
 */
function levelOf(name: string): number {
  return levelStore.levelOf(name)
}

function championTraits(name: string) {
  const traitIds = CHAMPION_TRAITS[name] ?? []
  return TRAIT_DEFINITIONS.filter((t) => (traitIds as string[]).includes(t.id))
}
function championOriginDef(name: string) {
  const originKey = getChampionOrigin(name)
  return originKey ? (ORIGIN_SYNERGIES[originKey] ?? null) : null
}

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="csg-root">
    <!-- ── search + filter header ── -->
    <div class="csg-header">
      <div class="cs-search-row">
        <RpgSearchBar
          v-model="searchQuery"
          class="cs-search-bar"
          :placeholder="`Search ${roleLabel} champion or trait...`"
          aria-label="Search champions and traits"
          :aria-expanded="traitFilterOpen"
          @clear="resetSearch"
        />

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
          <Icon icon="lucide:sliders-horizontal" width="18" height="18" />
          <span class="filter-toggle-chevron">{{ traitFilterOpen ? '▾' : '▴' }}</span>
          <span v-if="hasActiveFilter && !traitFilterOpen" class="filter-active-dot"></span>
        </button>

        <button
          v-if="tierGroups.length > 1"
          class="tier-collapse-all"
          :class="{ 'tier-collapse-all--active': allTiersCollapsed }"
          :title="allTiersCollapsed ? 'Expand all tiers' : 'Collapse all tiers'"
          :aria-label="allTiersCollapsed ? 'Expand all tiers' : 'Collapse all tiers'"
          @click="toggleAllTiers"
        >
          <Icon
            :icon="allTiersCollapsed ? 'lucide:chevrons-up-down' : 'lucide:chevrons-down-up'"
            width="18"
            height="18"
          />
        </button>
      </div>

      <!-- active filters stay visible with the panel collapsed -->
      <div v-if="hasActiveFilter" class="cs-active-filters">
        <button class="trait-chip trait-chip--clear-all" @click="clearFilters">
          × Clear filters
        </button>
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

      <Transition name="filter-panel">
        <div v-show="traitFilterOpen" class="cs-filter-panel">
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

          <template v-if="availableTraits.length">
            <div class="filter-divider">
              <span class="filter-divider-label">Traits</span>
            </div>
            <div v-if="noTraitFound" class="trait-empty-state">No trait found</div>
            <div v-else class="cs-filter-row cs-filter-row--wrap">
              <TransitionGroup tag="div" name="chip" class="chip-group">
                <button
                  v-for="trait in availableTraits"
                  v-show="!hasSearchTraitMatch || searchMatchedTraits.has(trait.id)"
                  :key="trait.id"
                  class="trait-chip"
                  :class="{
                    'trait-chip--active': activeTraits.includes(trait.id),
                    'trait-chip--search-match':
                      searchMatchedTraits.has(trait.id) && !activeTraits.includes(trait.id),
                  }"
                  :style="`--chip-color: ${trait.color}`"
                  tabindex="0"
                  @click="toggleTrait(trait.id)"
                  @keydown="onChipKeydown($event)"
                >
                  <Icon :icon="trait.icon" class="trait-chip-icon" />
                  {{ trait.name }}
                </button>
              </TransitionGroup>
            </div>
          </template>

          <template v-if="availableOrigins.length">
            <div class="filter-divider">
              <span class="filter-divider-label">Origins</span>
            </div>
            <div class="cs-filter-row cs-filter-row--wrap">
              <TransitionGroup tag="div" name="chip" class="chip-group">
                <button
                  v-for="origin in availableOrigins"
                  v-show="!hasSearchTraitMatch || searchMatchedTraits.has(origin.origin)"
                  :key="origin.origin"
                  class="trait-chip"
                  :class="{
                    'trait-chip--active': activeTraits.includes(origin.origin),
                    'trait-chip--search-match':
                      searchMatchedTraits.has(origin.origin) &&
                      !activeTraits.includes(origin.origin),
                  }"
                  :style="`--chip-color: ${origin.color}`"
                  tabindex="0"
                  @click="toggleTrait(origin.origin)"
                  @keydown="onChipKeydown($event)"
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

    <!-- ── grid ── -->
    <div ref="bodyEl" class="csg-body">
      <div v-if="filteredChampions.length === 0" class="csg-empty">
        <Icon icon="game-icons:telescope" width="34" height="34" class="csg-empty-icon" />
        <span>
          {{
            rolePool.length === 0
              ? `No ${roleLabel} champions recruited yet`
              : 'No champion found.'
          }}
        </span>
      </div>

      <div v-else class="csg-tier-groups">
        <div v-for="group in renderGroups" :key="group.tier" class="csg-tier-group">
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
              <span class="tier-header-count">
                {{ tierOwned(group.tier) }}/{{ tierTotal(group.tier) }}
              </span>
            </span>
          </div>

          <div
            v-show="!isTierCollapsed(group.tier)"
            :ref="(el) => setGridEl(group.tier, el)"
            class="csg-grid"
            :style="{
              paddingTop: `${group.slice.padTop}px`,
              paddingBottom: `${group.slice.padBottom}px`,
            }"
          >
            <button
              v-for="champion in group.slice.items"
              :key="champion"
              class="csg-card"
              :class="{
                'csg-card--seated': isSeatedHere(champion),
                'csg-card--taken': !!takenLabel(champion),
                'csg-card--away': isAway(champion),
              }"
              :disabled="isAway(champion)"
              :data-role="CHAMPION_ROLES[champion]"
              type="button"
              :title="champion"
              @click="emit('select', champion)"
              @mouseenter="emit('preview', champion)"
              @focus="emit('preview', champion)"
            >
              <img
                :src="battleStore.getChampionImage(champion, { size: 'lg' })"
                :alt="champion"
                class="csg-card-img"
                loading="lazy"
                decoding="async"
                @error="onImgError"
              />
              <span class="csg-card-fade" aria-hidden="true" />

              <span
                class="csg-card-tier"
                :style="{ '--tier-c': getChampionTier(champion).color }"
                :title="getChampionTier(champion).name"
              >
                ★{{ getChampionStarLevel(champion) }}
              </span>

              <span class="csg-card-body">
                <span class="csg-card-name">{{ champion }}</span>
                <span class="csg-card-icons">
                  <span
                    v-for="trait in championTraits(champion)"
                    :key="trait.id"
                    class="csg-card-icon"
                    :title="trait.name"
                    :style="{ color: trait.color }"
                  >
                    <Icon :icon="trait.icon" width="14" height="14" />
                  </span>
                  <span
                    v-if="championOriginDef(champion)"
                    class="csg-card-icon"
                    :title="championOriginDef(champion)!.origin"
                    :style="{ color: championOriginDef(champion)!.color }"
                  >
                    <Icon :icon="championOriginDef(champion)!.icon" width="14" height="14" />
                  </span>
                  <span v-if="levelOf(champion) > 1" class="csg-card-level">
                    Lv {{ levelOf(champion) }}
                  </span>
                </span>
              </span>

              <span v-if="isSeatedHere(champion)" class="csg-card-band">✓ In this seat</span>
              <span v-else-if="isAway(champion)" class="csg-card-away">Away</span>
              <span v-else-if="takenLabel(champion)" class="csg-card-taken">
                {{ takenLabel(champion) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.csg-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

/* ── header ──
   Search row, filter toggle, panel and chips are the shared .cs-* / .trait-chip
   classes from rpg-theme.css, so this filter and the Champion Shop's stay in
   step. Only the spacing around them belongs to this column. */
.csg-header {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex-shrink: 0;
  padding: 0 0 10px;
}
.csg-header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(to right, #c89040, rgba(200, 144, 64, 0.35) 55%, transparent);
}
/* The column is half as wide as the modal was: the toggle drops its word and
   keeps its icon, which is what the narrow row can pay for. */
.csg-header :deep(.filter-toggle-btn) {
  flex-shrink: 0;
}
.cs-active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

/* ── body ── */
.csg-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: 10px;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.csg-body::-webkit-scrollbar {
  width: 7px;
}
.csg-body::-webkit-scrollbar-track {
  background: #111;
}
.csg-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 4px;
}

.csg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  min-height: 200px;
  font-size: 13px;
  letter-spacing: 0.05em;
  color: rgba(200, 144, 64, 0.4);
  text-align: center;
}
.csg-empty-icon {
  color: rgba(200, 144, 64, 0.32);
}

.csg-tier-group + .csg-tier-group {
  margin-top: 10px;
}

/* Columns, gap and card height are bound from the CHAMPION_PICKER_* constants
   the windowing reads — see useVirtualGrid: the slice is only correct while the
   CSS and those numbers agree, so neither side gets its own copy. */
.csg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(v-bind(cardMinWidthPx), 1fr));
  gap: v-bind(gridGapPx);
  align-content: start;
}

/* ── card ── */
.csg-card {
  position: relative;
  height: v-bind(cardHeightPx);
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #3e3a30;
  background: #0c0906;
  text-align: left;
  /* Only transform and opacity move on hover — a dozen cards are on screen at
     once over a board that keeps orbiting. */
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}
.csg-card[data-role='top'] { border-color: #e05050; }
.csg-card[data-role='jungle'] { border-color: #50c060; }
.csg-card[data-role='mid'] { border-color: #5090e8; }
.csg-card[data-role='adc'] { border-color: #e89840; }
.csg-card[data-role='support'] { border-color: #b8c8d8; }
.csg-card:hover,
.csg-card:focus-visible {
  transform: translateY(-2px);
  outline: none;
}
/* The seated champion is the one the compare column calls CURRENT — gold, the
   same colour that names it over there. */
.csg-card--seated {
  border-color: #e8c040;
}
/* Unterwegs: die Haus-Sperrschreibweise, damit die Karte nicht nur leiser,
   sondern erkennbar zu ist. */
.csg-card--away {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
  pointer-events: none;
}
.csg-card-away {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 2px 0;
  background: rgba(14, 10, 4, 0.9);
  border-top: 1px solid #5c3310;
  color: #c89040;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
}

.csg-card--taken {
  opacity: 0.5;
}
.csg-card--taken:hover {
  opacity: 0.85;
}

.csg-card-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
}
.csg-card-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(8, 6, 3, 0.95) 0%,
    rgba(8, 6, 3, 0.45) 46%,
    rgba(8, 6, 3, 0.05) 100%
  );
  pointer-events: none;
}

.csg-card-tier {
  position: absolute;
  top: 5px;
  left: 5px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid color-mix(in srgb, var(--tier-c) 70%, #111);
  color: var(--tier-c);
  font-size: 11px;
  font-weight: 900;
  line-height: 1.25;
  pointer-events: none;
}

/* Last in the icon row, pushed to its right edge — sharing the row rather than
   floating over it is what keeps it off the trait icons on a card this narrow.
   It never shrinks; a fourth trait icon is clipped before the level is. */
.csg-card-level {
  flex-shrink: 0;
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(200, 144, 64, 0.55);
  color: #e8c040;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
  pointer-events: none;
}

.csg-card-body {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
}
.csg-card-name {
  font-size: 14px;
  color: #f0e4c4;
  line-height: 1.1;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.csg-card--taken .csg-card-name {
  color: rgba(240, 228, 196, 0.6);
}
.csg-card-icons {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}
.csg-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid color-mix(in srgb, currentColor 55%, transparent);
}

.csg-card-band {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  padding: 2px 0;
  text-align: center;
  background: #e8c040;
  color: #1a1204;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1.3;
  pointer-events: none;
}
.csg-card-taken {
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 2px 5px;
  border-radius: 3px;
  background: rgba(14, 10, 4, 0.9);
  border: 1px solid rgba(200, 144, 64, 0.35);
  color: rgba(200, 144, 64, 0.8);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.2;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .csg-card,
  .csg-card:hover,
  .csg-card:focus-visible {
    transform: none !important;
  }
}
</style>
