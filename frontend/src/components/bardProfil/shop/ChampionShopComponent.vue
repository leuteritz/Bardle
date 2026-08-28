<template>
  <div ref="atlasRef" class="cs-atlas">
    <ShopFacetRail
      class="cs-atlas-facets"
      :groups="facetGroups"
      :folded="facetsFolded"
      :affordable-only="affordableOnly"
      :affordable-count="affordableCount"
      :domain="activeDomain"
      :domain-counts="domainCounts"
      :query="normalizedQuery"
      @toggle="onFacetToggle"
      @fold="setFacetsFolded"
      @update:affordable-only="affordableOnly = $event"
      @update:domain="showDomain"
    />

    <!-- ── Grid: the open tab, and nothing else ── -->
    <div
      ref="gridRef"
      class="cs-atlas-grid rpg-scrollbar"
      :class="{ 'is-scrolling': gridScrolling }"
      @scroll.passive="onGridScroll"
    >
      <!-- ══ The head of the column: the search ══
           It reads BOTH halves and can send the player to the other one, so it
           belongs to no single zone — it stands over the sections it filters.
           Outside the transition below (`out-in`: what unmounts on every domain
           swap jumps) and without a `v-if`: the field has to stand exactly when
           nothing was found. The control row sits ABOVE the field because a
           sticky box leaves its BOTTOM part standing. -->
      <div class="cs-search-hero" role="search" aria-label="Search the shop">
        <!-- Holds its height even empty — it IS the fold. -->
        <div class="cs-hero-acts">
          <button
            v-if="hasActiveFilter"
            class="cs-hero-btn cs-hero-btn--reset"
            v-tip="'Clear every filter'"
            @click="clearFilters"
          >
            <Icon icon="lucide:rotate-ccw" width="15" height="15" />
            Reset
          </button>
          <span v-else class="cs-hero-gap" />
          <button
            v-if="canCollapseAll && !domainNarrowed"
            class="cs-hero-btn"
            :class="{ 'cs-hero-btn--on': allTiersCollapsed }"
            :aria-label="allTiersCollapsed ? 'Expand all sections' : 'Collapse all sections'"
            @click="toggleAllTiers"
          >
            <Icon
              :icon="allTiersCollapsed ? 'lucide:chevrons-up-down' : 'lucide:chevrons-down-up'"
              width="15"
              height="15"
            />
            {{ allTiersCollapsed ? 'Expand all' : 'Collapse all' }}
          </button>
        </div>

        <div class="cs-hero-plinth">
          <RpgSearchBar
            ref="searchInputRef"
            v-model="searchQuery"
            class="cs-hero-field"
            size="lg"
            placeholder="Search champions, traits or items..."
            aria-label="Search champions, traits and items"
            @clear="resetSearch"
          >
            <template #trailing>
              <span class="cs-hits" :class="{ 'cs-hits--empty': domainHitCount === 0 }">
                {{ domainHitCount }}
              </span>
            </template>
          </RpgSearchBar>
        </div>
      </div>

    <Transition name="cs-domain-swap" mode="out-in">

    <!-- ══ Champions ══ -->
    <div v-if="activeDomain === 'champions'" key="champions">
      <!-- Empty: current role has no matches but cross-role does -->
      <div v-if="crossRoleOnly" class="cross-role-only-state">
        <p class="empty-label">Not in this role</p>
      </div>
      <!-- Empty: no champion matches this half's filters. The count on the other
           tab is the only thing that can still be wrong about the search, so the
           empty state offers it as a way out instead of just stating a negative. -->
      <div
        v-else-if="noChampionsFound"
        class="flex flex-col items-center justify-center gap-4 py-12"
      >
        <div class="flex items-center justify-center empty-icon-box w-14 h-14">
          <Icon icon="lucide:search-x" width="32" height="32" style="color: #7a4e20; opacity: 0.4" />
        </div>
        <p class="empty-label">No champions found.</p>
        <button v-if="visibleItemsCount > 0" class="cs-empty-jump" @click="showDomain('items')">
          <Icon icon="ph:backpack-fill" width="16" height="16" />
          {{ visibleItemsCount }} matching item{{ visibleItemsCount === 1 ? '' : 's' }}
          <span class="cs-empty-jump-arrow">→</span>
        </button>
      </div>

      <div v-else class="tier-groups">
        <!-- Tier section: header (click to collapse) + its own grid -->
        <div
          v-for="group in tierGroups"
          :key="group.tier"
          class="tier-group"
          :data-tier-section="group.tier"
        >
          <!-- Tier section: collapsible header (click to toggle) + its grid -->
          <div
            class="tier-header"
            :class="{ 'is-collapsed': isTierCollapsed(group.tier), 'is-galaxy-locked': group.isGalaxyLocked, 'is-active-tier': group.isActive }"
            :style="{ '--tier-c': group.color }"
            role="button"
            :tabindex="group.isGalaxyLocked ? -1 : 0"
            :aria-expanded="group.isGalaxyLocked ? false : !isTierCollapsed(group.tier)"
            :aria-disabled="group.isGalaxyLocked"
            v-tip="group.isGalaxyLocked ? `Unlocked in Galaxy ${group.requiredGalaxy}` : ''"
            @click="toggleTier(group.tier)"
            @keydown.enter.prevent="toggleTier(group.tier)"
            @keydown.space.prevent="toggleTier(group.tier)"
          >
            <Icon
              v-if="group.isGalaxyLocked"
              icon="lucide:lock"
              class="tier-header-lock"
              width="14"
              height="14"
            />
            <span v-else class="tier-header-chevron">▾</span>
            <Icon :icon="group.icon" class="tier-header-icon" width="15" height="15" />
            <span class="tier-header-label">{{ group.label }}</span>
            <span class="tier-header-stars">★{{ group.starLevel }}</span>
            <span
              class="tier-header-chance"
              :class="{ 'is-locked': group.spawnPercent == null }"
              v-tip="
                group.spawnPercent == null
                  ? 'Tier locked — does not spawn yet'
                  : `This tier's current spawn chance`
              "
            >
              {{ group.spawnPercent != null ? group.spawnPercent + '%' : 'Locked' }}
            </span>
            <span class="tier-header-line"></span>
            <span v-if="group.isGalaxyLocked" class="tier-header-req">
              <Icon icon="lucide:lock" class="tier-req-icon" width="16" height="16" />
              Galaxy {{ group.requiredGalaxy }}
            </span>
            <span v-else class="tier-header-counter">
              <span class="tier-header-count">{{ tierOwned(group.tier) }}/{{ tierTotal(group.tier) }}</span>
            </span>
          </div>
          <Transition @enter="onTierEnter" @after-enter="onTierAfterEnter" @leave="onTierLeave">
            <div v-if="!isTierCollapsed(group.tier)" class="tier-body-inner">
              <div v-if="group.champions.length" class="cs-cards">
                <ChampionShopCard
                  v-for="champion in group.champions"
                  :key="champion.name"
                  :name="champion.name"
                  :image="battleStore.getChampionImage(champion.name, { size: 'lg' })"
                  :role="CHAMPION_ROLES[champion.name]"
                  :role-badge="ROLE_BADGE[CHAMPION_ROLES[champion.name] as keyof typeof ROLE_BADGE]"
                  :tier-color="getTierColor(champion.name)"
                  :tier-name="getChampionDetail(champion.name).cosmic.name"
                  :star-level="getChampionDetail(champion.name).starLevel"
                  :card-class="getCardClass(champion.name)"
                  :owned="isOwned(champion.name)"
                  :locked="isLocked(champion.name)"
                  :buyable="isUnlocked(champion.name) && canAffordChampion(champion.name)"
                  :selected="selectedChampion === champion.name"
                  :is-new="isNew(champion.name)"
                  :locked-tooltip="getLockedTooltip(champion.name)"
                  @select="openChampion"
                  @hover="dismissNewOnHover"
                />
              </div>
              <p v-else class="tier-all-recruited">All recruited ✓</p>
            </div>
          </Transition>
        </div>

      </div>

      <!-- ── Cross-role search results ── -->
      <Transition name="cross-role-fade">
        <div v-if="crossRoleChampions.length > 0" class="cross-role-section">
          <div class="cross-role-divider">
            <span class="cross-role-divider-label">Other Roles</span>
          </div>
          <div class="cs-cards">
            <ChampionShopCard
              v-for="champion in crossRoleChampions"
              :key="'cross-' + champion.name"
              class="cross-role-card"
              :name="champion.name"
              :image="battleStore.getChampionImage(champion.name, { size: 'lg' })"
              :role="CHAMPION_ROLES[champion.name]"
              :role-badge="ROLE_BADGE[CHAMPION_ROLES[champion.name] as keyof typeof ROLE_BADGE]"
              :tier-color="getTierColor(champion.name)"
              :tier-name="getChampionDetail(champion.name).cosmic.name"
              :star-level="getChampionDetail(champion.name).starLevel"
              :card-class="getCardClass(champion.name)"
              :owned="isOwned(champion.name)"
              :locked="isLocked(champion.name)"
              :buyable="isUnlocked(champion.name) && canAffordChampion(champion.name)"
              :selected="selectedChampion === champion.name"
              :is-new="isNew(champion.name)"
              :locked-tooltip="getLockedTooltip(champion.name)"
              @select="openChampion"
              @hover="dismissNewOnHover"
            />
          </div>
        </div>
      </Transition>
    </div>

    <!-- ══ Items ══ -->
    <div v-else key="items">
      <div
        v-if="noItemsFound"
        class="flex flex-col items-center justify-center gap-4 py-12"
      >
        <div class="flex items-center justify-center empty-icon-box w-14 h-14">
          <Icon icon="lucide:search-x" width="32" height="32" style="color: #7a4e20; opacity: 0.4" />
        </div>
        <p class="empty-label">No items found.</p>
        <button
          v-if="reachableChampionCount > 0"
          class="cs-empty-jump"
          @click="showDomain('champions')"
        >
          <Icon icon="ph:users-three-fill" width="16" height="16" />
          {{ reachableChampionCount }} matching champion{{ reachableChampionCount === 1 ? '' : 's' }}
          <span class="cs-empty-jump-arrow">→</span>
        </button>
      </div>

      <!-- ── Item sections: same collapsible headers, one per category ── -->
      <div v-else class="tier-groups">
          <div v-for="group in itemGroups" :key="'cat-' + group.id" class="tier-group">
            <div
              class="tier-header"
              :class="{ 'is-collapsed': isItemCatCollapsed(group.id) }"
              :style="{ '--tier-c': group.color }"
              role="button"
              tabindex="0"
              :aria-expanded="!isItemCatCollapsed(group.id)"
              @click="toggleItemCatSection(group.id)"
              @keydown.enter.prevent="toggleItemCatSection(group.id)"
              @keydown.space.prevent="toggleItemCatSection(group.id)"
            >
              <span class="tier-header-chevron">▾</span>
              <img :src="group.image" :alt="group.label" class="item-cat-header-img" />
              <span class="tier-header-label">{{ group.label }}</span>
              <span class="tier-header-line"></span>
              <span class="tier-header-counter">
                <span class="tier-header-count">{{ group.ownedCount }}/{{ group.totalCount }}</span>
              </span>
            </div>
            <Transition @enter="onTierEnter" @after-enter="onTierAfterEnter" @leave="onTierLeave">
              <div v-if="!isItemCatCollapsed(group.id)" class="tier-body-inner">
                <div class="cs-cards">
                  <ItemShopCard
                    v-for="item in group.items"
                    :key="item.id"
                    :id="item.id"
                    :name="item.name"
                    :icon="item.icon"
                    :rarity-label="item.rarityLabel"
                    :rarity-color="item.rarityColor"
                    :category-label="group.label"
                    :category-image="group.image"
                    :category-color="group.color"
                    :owned-count="item.ownedCount"
                    :is-set="!!item.setId"
                    :buyable="item.buyable"
                    :selected="selectedItem === item.id"
                    @select="openItem"
                  />
                </div>
              </div>
            </Transition>
          </div>
      </div>
    </div>

    </Transition>
    </div>

    <!-- ══ Detail column ══
         A column, not a layer. It used to slide OVER the grid because 900px of
         rail could not carry both; across the full tab it stands beside the
         cards and browsing never has to be undone to read one. Which means the
         empty state is now a state the player SEES — hence the overview card
         rather than a blank panel.
         Typing in the search still only SELECTS the best hit (its card lights
         up in the grid); that selection now shows here for free, which is what
         the layer could never do without burying the list. -->
    <aside class="cs-atlas-detail">
      <Transition name="cs-detail-swap" mode="out-in">
        <ItemDetailPanel
          v-if="itemDetail"
          key="item"
          wide
          :detail="itemDetail"
          :index="selectedIndex"
          :total="visibleEntries.length"
          @prev="selectPrev"
          @next="selectNext"
          @back="closeDetail"
          @buy="handleBuyItem"
        />
        <ChampionDetailPanel
          v-else-if="detail"
          key="champion"
          wide
          :detail="detail"
          :index="selectedIndex"
          :total="visibleEntries.length"
          :take-seat="takeSeat"
          @update:take-seat="takeSeat = $event"
          @prev="selectPrev"
          @next="selectNext"
          @back="closeDetail"
          @buy="handleBuy"
        />
        <ShopOverviewCard
          v-else
          key="overview"
          :domain="activeDomain"
          :owned="overviewOwned"
          :total="overviewTotal"
          :galaxy="overviewGalaxy"
          :next-tier="overviewNextTier"
          :picks="overviewPicks"
          :sets="overviewSets"
          :empty-hint="overviewEmptyHint"
          @pick="onOverviewPick"
        />
      </Transition>
    </aside>
  </div>
</template>


<script lang="ts">
import { ref, defineComponent, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useUiStore } from '@/stores/core/uiStore'
import ChampionShopCard from './ChampionShopCard.vue'
import ChampionDetailPanel from './ChampionDetailPanel.vue'
import ItemShopCard from './ItemShopCard.vue'
import ItemDetailPanel from './ItemDetailPanel.vue'
import RpgSearchBar from '@/components/ui/RpgSearchBar.vue'
import ShopFacetRail from './ShopFacetRail.vue'
import ShopOverviewCard from './ShopOverviewCard.vue'
import { useItemStore } from '@/stores/economy/itemStore'
import { SHOP_ITEMS, ITEM_CATEGORIES, ITEM_RARITIES, ITEM_SETS } from '@/config/economy/items'
import { getChampionRoles, CHAMPION_ROLES, getChampionNames } from '@/config/champions/championData'
import { CHAMPION_TRAITS, TRAIT_DEFINITIONS } from '@/config/champions/championTraits'
import { ORIGIN_SYNERGIES, getChampionOrigin } from '@/config/champions/championOrigins'
import { getChampionTier, getChampionStarLevel, getChampionChimesPrice, requiredGalaxyForTier, isChampionTierUnlocked, championTierSpawnPercent, CHAMPION_TIERS_BY_STAR } from '@/config/champions/championTiers'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { MATERIALS } from '@/config/economy/materials'
import { getHomePlanetConfig } from '@/config/champions/championHomePlanets'
import {
  PLANET_TYPE_NAMES,
  ROLES,
  MATERIAL_COLOR,
  SHOP_JUMP_SCROLL_OFFSET_PX,
  SHOP_HERO_FOLD_H,
  SHOP_HERO_PINNED_H,
  SHOP_HERO_FIELD_MAX_W,
  SHOP_JUMP_EXPAND_SETTLE_MS,
  SHOP_SCROLL_SETTLE_MS,
  CHAMPION_NEW_BADGE_DISMISS_MS,
  SHOP_ATLAS_FACET_RAIL_WIDTH,
  SHOP_ATLAS_FACET_RAIL_COLLAPSED,
  SHOP_ATLAS_FACET_AUTOFOLD_WIDTH,
  SHOP_ATLAS_DETAIL_MIN_WIDTH,
  SHOP_ATLAS_DETAIL_PCT,
  SHOP_ATLAS_DETAIL_MAX_WIDTH,
  SHOP_ATLAS_CARD_MIN_WIDTH,
  SHOP_ATLAS_CARD_HEIGHT,
  SHOP_ATLAS_GRID_GAP,
  ROLE_BY_KEY,
} from '@/config/constants'
import { recruitSeatFor, type RecruitSeat } from '@/utils/game/recruitSeat'
import { useHerald } from '@/composables/ui/useHerald'
import type {
  ChampionRole,
  ShopChampionDetail,
  ShopItemDetail,
  ItemCategory,
  ItemRarity,
  PlanetType,
  ShopFacetGroup,
  ShopOverviewPick,
  ShopOverviewSet,
  ShopOverviewTier,
} from '@/types'


export default defineComponent({
  name: 'ChampionShopComponent',
  components: {
    Icon,
    ChampionShopCard,
    ChampionDetailPanel,
    ItemShopCard,
    ItemDetailPanel,
    RpgSearchBar,
    ShopFacetRail,
    ShopOverviewCard,
  },
  props: {
    /**
     * Bumped by the tab root when Escape should drop the selection rather than
     * close the whole profile. Only the tab listens for keys — see the same
     * token on the details page's inline picker.
     */
    closeDetailToken: { type: Number, default: 0 },
    /**
     * Bumped every time the tab becomes visible. The shop is mounted once and
     * only hidden afterwards, so `onMounted` fires a single time per session —
     * without this the second visit would find the first one's search, selection
     * and scroll position, and "highest recruitable tier" goes stale one galaxy
     * later.
     */
    visitToken: { type: Number, default: 0 },
  },
  emits: ['detailState'],
  setup(props, { emit }) {
    const championNames = ref<string[]>(getChampionNames())
    const battleStore = useBattleStore()
    const inventoryStore = useInventoryStore()
    const gameStore = useGameStore()
    const uiStore = useUiStore()
    const galaxyStore = useGalaxyStore()
    const { announceReceipt } = useHerald()
    const itemStore = useItemStore()
    const activeRole = ref<ChampionRole | 'all'>('all')
    const searchQuery = ref('')
    const activeTraits = ref<string[]>([])
    // Active cosmic-tier filter chip — 'all' or a star level (1..MAX_STAR_LEVEL).
    const activeTier = ref<'all' | number>('all')
    // Item-domain filter chips (unified shop): categories + rarities, multi-select.
    const activeItemCats = ref<ItemCategory[]>([])
    const activeRarities = ref<ItemRarity[]>([])
    const activeSets = ref<string[]>([])
    /**
     * The one cut that applies to both halves: hide everything the player
     * cannot pay for right now. It sits above the domain facets in the rail
     * because it asks a different kind of question than they do — not what
     * kind of thing this is, but whether it is a decision at all today.
     */
    const affordableOnly = ref(false)
    /**
     * Which half of the shop is on screen. Declared up here with the filter
     * state because that is what it is: the coarsest filter of them all, above
     * search and chips, and half the panel below reads it.
     */
    const activeDomain = ref<'champions' | 'items'>('champions')
    const searchInputRef = ref<InstanceType<typeof RpgSearchBar> | null>(null)
    // Tier chips / sections are the 6 Champion Tiers (weak→strong), not price tiers.
    // Galaxy-locked tiers stay visible but greyed out (same lock as the grid sections);
    // tiers with no purchasable champion left grey out like trait/origin chips.
    const tierChips = computed(() =>
      CHAMPION_TIERS_BY_STAR.map((t) => ({
        ...t,
        locked: isTierGalaxyLocked(t.starLevel),
        requiredGalaxy: requiredGalaxyForTier(t.starLevel),
        available: chipPool.value.some((name) => getChampionStarLevel(name) === t.starLevel),
      })),
    )
    function tierRank(name: string): number {
      return getChampionStarLevel(name)
    }

    const ROLE_BADGE = {
      top:     { label: 'TOP', color: '#e05050' },
      jungle:  { label: 'JGL', color: '#52b830' },
      mid:     { label: 'MID', color: '#5090e8' },
      adc:     { label: 'ADC', color: '#e89840' },
      support: { label: 'SUP', color: '#b8c8d8' },
    } as const

    watch(activeRole, () => {
      if (activeTraits.value.length === 0) return
      const filtered = activeTraits.value.filter(
        (t) => poolTraitIds.value.has(t) || poolOriginIds.value.has(t),
      )
      if (filtered.length !== activeTraits.value.length) activeTraits.value = filtered
    })

    function setActiveRole(role: ChampionRole | 'all') {
      activeRole.value = role
    }

    function toggleTrait(id: string) {
      activeTraits.value = activeTraits.value.includes(id)
        ? activeTraits.value.filter((t) => t !== id)
        : [...activeTraits.value, id]
    }

    function toggleItemCat(id: ItemCategory) {
      activeItemCats.value = activeItemCats.value.includes(id)
        ? activeItemCats.value.filter((c) => c !== id)
        : [...activeItemCats.value, id]
    }

    function toggleRarity(id: ItemRarity) {
      activeRarities.value = activeRarities.value.includes(id)
        ? activeRarities.value.filter((r) => r !== id)
        : [...activeRarities.value, id]
    }

    /** Clears role + tier + trait + item filters but keeps the search text. */
    function clearFilters() {
      activeTraits.value = []
      activeTier.value = 'all'
      activeItemCats.value = []
      activeRarities.value = []
      activeSets.value = []
      affordableOnly.value = false
      setActiveRole('all')
    }

    function resetSearch() {
      searchQuery.value = ''
      clearFilters()
    }

    function isOwned(name: string): boolean {
      return battleStore.ownedChampions.includes(name)
    }

    function isUnlocked(name: string): boolean {
      return battleStore.recruitableChampions.some((r) => r.name === name)
    }

    function isLocked(name: string): boolean {
      return !isOwned(name) && !isUnlocked(name)
    }

    // Memoized lookup — these run per card per render; a .find() scan here is O(n²)
    const recruitableByName = computed(
      () => new Map(battleStore.recruitableChampions.map((r) => [r.name, r])),
    )

    /**
     * A champion only gets a recruit entry once its home planet is rescued, so
     * for a locked one the entry is missing — the price is not. It is fixed data
     * on the home-planet config, and the locked panel shows it so the player can
     * farm towards a champion long before it becomes buyable.
     */
    function getMaterialCost(name: string): Record<string, number> {
      return (
        recruitableByName.value.get(name)?.materialCost ??
        getHomePlanetConfig(name)?.materialCost ??
        {}
      )
    }

    function getChimesPrice(name: string): number {
      const recruit = recruitableByName.value.get(name)
      if (recruit) return recruit.chimesPrice
      return getChampionChimesPrice(name)
    }

    // Card tier badge → the champion's Cosmic/Champion Tier (★N) — the single tier.
    function getTierColor(name: string): string {
      return getChampionTier(name).color
    }

    function canAffordChimes(name: string): boolean {
      return gameStore.chimes >= getChimesPrice(name)
    }

    function canAffordChampion(name: string): boolean {
      const cost = getMaterialCost(name)
      return Object.keys(cost).length > 0 && inventoryStore.hasMaterials(cost) && canAffordChimes(name)
    }

    function canClickBuy(name: string): boolean {
      return isUnlocked(name) && !isOwned(name) && canAffordChampion(name)
    }

    function nameRelevance(name: string, q: string): number {
      if (!q) return 3
      const n = name.toLowerCase()
      if (n === q) return 0
      if (n.startsWith(q)) return 1
      if (n.includes(q)) return 2
      return 3
    }

    /**
     * Der frisch Gekaufte nimmt seinen Hauptsitz, wenn der leer ist — eine
     * unbesetzte Rolle hat im Orbit gar kein Rollenverhalten. Einen Sitzenden
     * verdrängt er nur, wenn `takeSeat` vor dem Kauf gesetzt wurde.
     */
    function seatRecruit(name: string, seat: RecruitSeat): RecruitSeat | null {
      if (seat.kind === 'none') return null
      if (seat.kind === 'held' && !takeSeat.value) return null
      return battleStore.setHeaderSlot(seat.roleIndex, name) ? seat : null
    }

    function recruitSubline(name: string, seated: RecruitSeat | null): string {
      const tier = getChampionTier(name).name
      if (!seated || seated.kind === 'none') return tier
      const role = ROLE_BY_KEY[seated.roleKey].label
      return seated.kind === 'held'
        ? `Seated as ${role} · ${seated.occupant} benched`
        : `${tier} · Seated as ${role}`
    }

    function handleBuy(name: string) {
      if (!canClickBuy(name)) return
      const idx = visibleChampionList.value.indexOf(name)
      const price = getChimesPrice(name)
      const seat = recruitSeatFor(name, battleStore.headerSlots)
      battleStore.recruitChampion(name)
      const seated = seatRecruit(name, seat)
      announceReceipt({
        kind: 'recruit',
        headline: name,
        subline: recruitSubline(name, seated),
        // `md` (256 px) wie die Zeremonie: dasselbe Portrait zweimal in
        // derselben Stufe ist ein Cache-Treffer, keine zweite Ladung.
        portraitSrc: battleStore.getChampionImage(name, { size: 'md' }),
        delta: { value: -price, unit: 'chimes' },
      })
      // Keep the detail panel in place: jump to the champion that now occupies
      // the recruited champion's list position (or the last one).
      const list = visibleChampionList.value
      if (list.length > 0 && idx >= 0) {
        selectedChampion.value = list[Math.min(idx, list.length - 1)]
      }
    }

    function hasEnoughMaterial(matId: string, qty: number): boolean {
      return (inventoryStore.collectedMaterials[matId] ?? 0) >= qty
    }

    function getMaterialName(matId: string): string {
      return MATERIALS.find((m) => m.id === matId)?.name ?? matId
    }

    function getMaterialImage(matId: string): string {
      return MATERIALS.find((m) => m.id === matId)?.image ?? ''
    }

    function getLockedTooltip(name: string): string {
      const config = getHomePlanetConfig(name)
      if (!config) return 'Rescue a planet to unlock.'
      const planetName = PLANET_TYPE_NAMES[config.planetType] ?? config.planetType
      return `Rescue a ${planetName} to unlock this champion.`
    }

    /** Where the champion is from — the planet that has to fall for it. */
    function getHomePlanet(name: string): { type: PlanetType; name: string } | null {
      const config = getHomePlanetConfig(name)
      if (!config) return null
      return {
        type: config.planetType,
        name: PLANET_TYPE_NAMES[config.planetType] ?? config.planetType,
      }
    }

    function getCardClass(name: string): string {
      if (isOwned(name)) return 'card-owned'
      if (isUnlocked(name) && canAffordChampion(name)) return 'card-buyable'
      if (isUnlocked(name)) return 'card-unlocked'
      return 'card-locked'
    }

const shopChampionNames = computed(() =>
      battleStore.recruitableChampions.map((r) => r.name)
    )

    /**
     * What the grid can hold: everything not owned yet, locked cards included.
     *
     * The facets used to be measured against the RECRUITABLE pool instead, back
     * when they lived in a drawer and only said whether a chip was worth
     * offering. Standing open with a count beside every row, that pool lies: the
     * grid draws locked champions too, so a facet reading 0 next to five visible
     * cards of that trait is simply wrong. A facet counts what it would leave
     * standing — nothing else.
     */
    const gridChampionNames = computed(() => championNames.value.filter((n) => !isOwned(n)))

    // Role-only pool (no search expansion) — used for cross-role chip detection and watch validation
    const roleChampionNames = computed(() =>
      activeRole.value === 'all'
        ? gridChampionNames.value
        : gridChampionNames.value.filter((name) => CHAMPION_ROLES[name] === activeRole.value),
    )

    // Role chips: greyed out when no purchasable champion of that role exists.
    // Availability uses the UNFILTERED shop pool (chipPool is already role-scoped).
    const roleChips = computed(() =>
      ROLES.map((r) => ({
        key: r.key,
        label: r.label,
        short: r.short,
        color: r.color,
        image: r.image,
        available: gridChampionNames.value.some((name) => CHAMPION_ROLES[name] === r.key),
      })),
    )

    // When search matches a trait/origin globally, expand chip pool to all roles
    const chipPool = computed(() => {
      if (activeRole.value !== 'all' && searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim()
        const anyTraitMatch = TRAIT_DEFINITIONS.some((t) => t.name.toLowerCase().includes(q))
        const anyOriginMatch = Object.keys(ORIGIN_SYNERGIES).some((o) => o.toLowerCase().includes(q))
        if (anyTraitMatch || anyOriginMatch) return gridChampionNames.value
      }
      return roleChampionNames.value
    })

    // Trait/origin ids present in the current chip pool (purchasable champions)
    const poolTraitIds = computed(() => {
      const seen = new Set<string>()
      for (const name of chipPool.value) {
        for (const tid of (CHAMPION_TRAITS[name] ?? [])) seen.add(tid)
      }
      return seen
    })
    const poolOriginIds = computed(() => {
      const seen = new Set<string>()
      for (const name of chipPool.value) {
        const o = getChampionOrigin(name)
        if (o && ORIGIN_SYNERGIES[o]) seen.add(o)
      }
      return seen
    })

    // All chips stay visible; unavailable ones render greyed-out and disabled.
    // Sort: available first, alphabetical within each group.
    const traitChips = computed(() =>
      TRAIT_DEFINITIONS.map((t) => ({ ...t, available: poolTraitIds.value.has(t.id) })).sort(
        (a, b) =>
          a.available === b.available ? a.name.localeCompare(b.name) : a.available ? -1 : 1,
      ),
    )
    const originChips = computed(() =>
      (Object.values(ORIGIN_SYNERGIES) as Array<{ origin: string; name: string; icon: string; color: string }>)
        .map((o) => ({ ...o, available: poolOriginIds.value.has(o.origin) }))
        .sort((a, b) =>
          a.available === b.available ? a.origin.localeCompare(b.origin) : a.available ? -1 : 1,
        ),
    )

    const filterChampionCount = computed(() => {
      const counts: Record<string, number> = {}
      for (const name of chipPool.value) {
        for (const tid of (CHAMPION_TRAITS[name] ?? [])) {
          counts[tid] = (counts[tid] ?? 0) + 1
        }
        const o = getChampionOrigin(name)
        if (o && ORIGIN_SYNERGIES[o]) {
          counts[o] = (counts[o] ?? 0) + 1
        }
      }
      return counts
    })

    watch(gridChampionNames, () => {
      // Drop the tier filter once its last purchasable champion is gone.
      if (
        activeTier.value !== 'all' &&
        !chipPool.value.some((name) => getChampionStarLevel(name) === activeTier.value)
      ) {
        activeTier.value = 'all'
      }
      if (activeTraits.value.length === 0) return
      const filtered = activeTraits.value.filter(
        (t) => poolTraitIds.value.has(t) || poolOriginIds.value.has(t),
      )
      if (filtered.length !== activeTraits.value.length) activeTraits.value = filtered
    })

    const filteredChampions = computed(() => {
      return championNames.value
        .map((name) => ({ name }))
        .filter((c) => {
          if (isOwned(c.name)) return false
          if (affordableOnly.value && !(isUnlocked(c.name) && canAffordChampion(c.name)))
            return false
          if (activeRole.value !== 'all' && !getChampionRoles(c.name).includes(activeRole.value))
            return false
          if (activeTraits.value.length > 0) {
            const champTraits = CHAMPION_TRAITS[c.name] ?? []
            const champOrigin = getChampionOrigin(c.name)
            const hit = activeTraits.value.some(
              (t) => (champTraits as string[]).includes(t) || champOrigin === t,
            )
            if (!hit) return false
          }
          if (activeTier.value !== 'all') {
            if (getChampionStarLevel(c.name) !== activeTier.value) return false
          }
          if (searchQuery.value.trim()) {
            const q = searchQuery.value.toLowerCase().trim()
            const nameMatch = c.name.toLowerCase().includes(q)
            const traitMatch = (CHAMPION_TRAITS[c.name] ?? []).some((tid) => {
              const def = TRAIT_DEFINITIONS.find((t) => t.id === tid)
              return def?.name.toLowerCase().includes(q)
            })
            const originMatch = (getChampionOrigin(c.name) ?? '').toLowerCase().includes(q)
            return nameMatch || traitMatch || originMatch
          }
          return true
        })
        .sort((a, b) => {
          const tr = tierRank(a.name) - tierRank(b.name)
          if (tr !== 0) return tr
          const ua = isUnlocked(a.name) ? 0 : 1
          const ub = isUnlocked(b.name) ? 0 : 1
          if (ua !== ub) return ua - ub
          return a.name.localeCompare(b.name)
        })
    })

    // ── Galaxy gate (Shop-display only) ──
    // Star levels the player has already met (owns or has discovered as recruitable),
    // independent of the role filter — so an owned champion never re-locks its tier.
    const discoveredTierStars = computed(() => {
      const stars = new Set<number>()
      for (const name of battleStore.ownedChampions) {
        if (name === 'Bard') continue
        stars.add(getChampionStarLevel(name))
      }
      for (const r of battleStore.recruitableChampions) {
        stars.add(getChampionStarLevel(r.name))
      }
      return stars
    })
    // A tier is galaxy-locked until the player reaches its required galaxy. Two
    // always-unlock escape hatches keep it coherent with linear spawning:
    //  • tiers up to the current galaxy's spawn level are already reachable, so the
    //    active/feeding tier is never shown locked;
    //  • a tier whose champion was already met is revealed regardless.
    // The required-galaxy label therefore reads as an upper-bound "by Galaxy X" teaser.
    function isTierGalaxyLocked(tier: number): boolean {
      return !isChampionTierUnlocked(
        tier,
        galaxyStore.currentGalaxy,
        galaxyStore.requiredStarLevel,
        discoveredTierStars.value,
      )
    }

    // Group the filtered champions into Champion Tier buckets (ascending star level),
    // preserving the alphabetical order from filteredChampions within each tier.
    // All 6 tiers render as rows (incl. galaxy-locked teasers); while searching or
    // filtering, only tiers with matches are shown so results stay focused.
    // spawnPercent = this tier's live spawn chance (null when not yet spawning).
    const tierGroups = computed(() => {
      const groups = new Map<number, { name: string }[]>()
      for (const c of filteredChampions.value) {
        const star = getChampionStarLevel(c.name)
        const bucket = groups.get(star) ?? groups.set(star, []).get(star)!
        bucket.push(c)
      }
      const activeStar = galaxyStore.requiredStarLevel
      const galaxy = galaxyStore.currentGalaxy
      const tiers = championNarrowed.value
        ? CHAMPION_TIERS_BY_STAR.filter((t) => groups.has(t.starLevel))
        : CHAMPION_TIERS_BY_STAR
      return tiers.map((t) => ({
        tier: t.starLevel,
        starLevel: t.starLevel,
        label: t.name,
        color: t.color,
        icon: t.icon,
        champions: groups.get(t.starLevel) ?? [],
        requiredGalaxy: requiredGalaxyForTier(t.starLevel),
        isGalaxyLocked: isTierGalaxyLocked(t.starLevel),
        isActive: t.starLevel === activeStar,
        spawnPercent: championTierSpawnPercent(t.starLevel, galaxy),
      }))
    })

    // ── Tier collection progress (owned / total), scoped to the active role ──
    // Role-scoped and independent of search/trait/tier-chip filters, so it reads
    // as stable "Fortschritt pro Tier" and updates instantly on recruit.
    const shopTotalByTier = computed(() => {
      const map = new Map<number, number>()
      for (const name of championNames.value) {
        if (name === 'Bard') continue
        if (activeRole.value !== 'all' && !getChampionRoles(name).includes(activeRole.value)) continue
        const tier = getChampionStarLevel(name)
        map.set(tier, (map.get(tier) ?? 0) + 1)
      }
      return map
    })
    const shopOwnedByTier = computed(() => {
      const map = new Map<number, number>()
      for (const name of battleStore.ownedChampions) {
        if (name === 'Bard') continue
        if (activeRole.value !== 'all' && !getChampionRoles(name).includes(activeRole.value)) continue
        const tier = getChampionStarLevel(name)
        map.set(tier, (map.get(tier) ?? 0) + 1)
      }
      return map
    })
    function tierOwned(tier: number): number {
      return shopOwnedByTier.value.get(tier) ?? 0
    }
    function tierTotal(tier: number): number {
      return shopTotalByTier.value.get(tier) ?? 0
    }

    // ── Collapsible tier sections ──
    // Every tier starts collapsed when the shop opens; the "Champions" quick-jump
    // expands the highest unlocked tier on demand.
    const ALL_TIER_KEYS = CHAMPION_TIERS_BY_STAR.map((t) => t.starLevel)
    const collapsedTiers = ref(new Set<number>(ALL_TIER_KEYS))
    // When a new tier becomes active (galaxy progress) while the shop is open,
    // expand it right away.
    watch(
      () => galaxyStore.requiredStarLevel,
      (star) => {
        if (!collapsedTiers.value.has(star)) return
        const next = new Set(collapsedTiers.value)
        next.delete(star)
        collapsedTiers.value = next
      },
    )
    // ── Narrowing, counted per domain ──
    // The two tabs are filtered by different chips, so "is this list narrowed"
    // has to be asked per tab: a rarity chip must not force the champion tiers
    // open, and a role chip must not force the item categories open. Only the
    // search text is common to both — it reads names on either side.
    // Declared here, above their first reader (tierGroups), because a watcher
    // further down runs immediately and would otherwise hit them in their TDZ.
    const championFiltersActive = computed(
      () =>
        activeTraits.value.length > 0 ||
        activeTier.value !== 'all' ||
        activeRole.value !== 'all' ||
        affordableOnly.value,
    )
    const itemFiltersActive = computed(
      () =>
        activeItemCats.value.length > 0 ||
        activeRarities.value.length > 0 ||
        activeSets.value.length > 0 ||
        affordableOnly.value,
    )
    /** While searching/filtering, force every tier open so matches are never hidden. */
    const championNarrowed = computed(
      () => searchQuery.value.trim() !== '' || championFiltersActive.value,
    )
    /** Same for the item categories, driven by the item chips. */
    const itemNarrowed = computed(
      () => searchQuery.value.trim() !== '' || itemFiltersActive.value,
    )
    function isTierCollapsed(tier: number): boolean {
      // Galaxy-locked tiers never expand, regardless of search/collapse state.
      if (isTierGalaxyLocked(tier)) return true
      return championNarrowed.value ? false : collapsedTiers.value.has(tier)
    }
    function toggleTier(tier: number) {
      if (isTierGalaxyLocked(tier)) return
      const next = new Set(collapsedTiers.value)
      if (next.has(tier)) next.delete(tier)
      else next.add(tier)
      collapsedTiers.value = next
    }
    // Collapse-all governs the sections of the OPEN tab only — the button sits
    // above one list, and folding away rows nobody can see would leave the other
    // tab in a state the player never asked for and would find on arriving.
    const allTiersCollapsed = computed(() => {
      if (activeDomain.value === 'items') {
        if (itemNarrowed.value) return false
        return ITEM_CATEGORIES.every((c) => collapsedItemCats.value.has(c.id))
      }
      if (championNarrowed.value) return false
      const unlocked = tierGroups.value.filter((g) => !g.isGalaxyLocked)
      return unlocked.length > 0 && unlocked.every((g) => collapsedTiers.value.has(g.tier))
    })
    function toggleAllTiers() {
      const collapsed = allTiersCollapsed.value
      if (activeDomain.value === 'items') {
        const nextCats = new Set(collapsedItemCats.value)
        for (const c of ITEM_CATEGORIES) {
          if (collapsed) nextCats.delete(c.id)
          else nextCats.add(c.id)
        }
        collapsedItemCats.value = nextCats
        return
      }
      const unlockedKeys = tierGroups.value.filter((g) => !g.isGalaxyLocked).map((g) => g.tier)
      const next = new Set(collapsedTiers.value)
      for (const k of unlockedKeys) {
        if (collapsed) next.delete(k)
        else next.add(k)
      }
      collapsedTiers.value = next
    }
    /** Only worth offering where the open tab actually has sections to fold. */
    const canCollapseAll = computed(() =>
      activeDomain.value === 'items' ? itemGroups.value.length > 1 : tierGroups.value.length > 1,
    )
    /* A narrowed list forces every section open (isTierCollapsed), so folding
       means nothing there — the button used to stand and write into a set
       nobody could see. */
    const domainNarrowed = computed(() =>
      activeDomain.value === 'items' ? itemNarrowed.value : championNarrowed.value,
    )
    const heroFoldPx = computed(() => `${SHOP_HERO_FOLD_H}px`)
    const heroPinnedPx = computed(() => `${SHOP_HERO_PINNED_H}px`)
    const heroFieldMaxPx = computed(() => `${SHOP_HERO_FIELD_MAX_W}px`)

    // Tier expand/collapse animation — animate height 0 ↔ scrollHeight, then clear
    // inline styles so an open tier is overflow:visible (hover-expanded cards spill out).
    //
    // The bodies are v-if, not v-show: collapsed used to mean "rendered and
    // hidden", which put all 165 champion cards in the DOM the moment the shop
    // opened — 133 ms of mount for rows nobody was looking at. Now a section
    // costs its cards only while it is open, and the transition still runs
    // because @enter/@leave fire on create and destroy just the same.
    function onTierEnter(el: Element) {
      const node = el as HTMLElement
      node.style.height = '0'
      node.style.overflow = 'hidden'
      void node.offsetHeight // force reflow so the start height is applied
      node.style.height = `${node.scrollHeight}px`
    }
    function onTierAfterEnter(el: Element) {
      const node = el as HTMLElement
      node.style.height = ''
      node.style.overflow = ''
    }
    function onTierLeave(el: Element) {
      const node = el as HTMLElement
      node.style.height = `${node.scrollHeight}px`
      node.style.overflow = 'hidden'
      void node.offsetHeight
      node.style.height = '0'
    }

    // Auto-open the tier of a champion that unlocks WHILE the shop is open so
    // the new champion is visible among its tier — mirrors the "New champion"
    // badge set. Not immediate: on open every tier stays collapsed.
    watch(
      () => battleStore.newlyUnlockedChampions,
      (names) => {
        if (!names?.length) return
        const next = new Set(collapsedTiers.value)
        for (const name of names) {
          next.delete(getChampionStarLevel(name))
        }
        collapsedTiers.value = next
      },
      { deep: true },
    )

    const crossRoleChampions = computed(() => {
      const q = searchQuery.value.toLowerCase().trim()
      if (!q || activeRole.value === 'all') return []
      return championNames.value
        .filter((name) => {
          if (isOwned(name)) return false
          const role = CHAMPION_ROLES[name] as ChampionRole | undefined
          if (!role || role === activeRole.value) return false
          const nameMatch = name.toLowerCase().includes(q)
          const traitMatch = (CHAMPION_TRAITS[name] ?? []).some((tid) => {
            const def = TRAIT_DEFINITIONS.find((t) => t.id === tid)
            return def?.name.toLowerCase().includes(q)
          })
          const originMatch = (getChampionOrigin(name) ?? '').toLowerCase().includes(q)
          return nameMatch || traitMatch || originMatch
        })
        .sort((a, b) => {
          const q = searchQuery.value.toLowerCase().trim()
          const rna = nameRelevance(a, q)
          const rnb = nameRelevance(b, q)
          if (rna !== rnb) return rna - rnb
          const aUnlocked = isUnlocked(a) ? 0 : 1
          const bUnlocked = isUnlocked(b) ? 0 : 1
          if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked
          const rla = ROLE_BADGE[CHAMPION_ROLES[a] as keyof typeof ROLE_BADGE]?.label ?? ''
          const rlb = ROLE_BADGE[CHAMPION_ROLES[b] as keyof typeof ROLE_BADGE]?.label ?? ''
          if (rla !== rlb) return rla.localeCompare(rlb)
          return a.localeCompare(b)
        })
        .map((name) => ({ name }))
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
    const hasActiveFilter = computed(
      () =>
        activeTraits.value.length > 0 ||
        activeTier.value !== 'all' ||
        activeRole.value !== 'all' ||
        activeItemCats.value.length > 0 ||
        activeRarities.value.length > 0 ||
        activeSets.value.length > 0 ||
        affordableOnly.value,
    )

    // ── Items: search + chip filtering, grouped by category ──
    const RARITY_BY_ID = new Map(ITEM_RARITIES.map((r) => [r.id, r]))
    const RARITY_RANK = new Map(ITEM_RARITIES.map((r, i) => [r.id, i]))

    const filteredItems = computed(() =>
      SHOP_ITEMS.filter((item) => {
        if (activeItemCats.value.length > 0 && !activeItemCats.value.includes(item.category))
          return false
        if (activeRarities.value.length > 0 && !activeRarities.value.includes(item.rarity))
          return false
        if (activeSets.value.length > 0 && !(item.setId && activeSets.value.includes(item.setId)))
          return false
        if (affordableOnly.value && !canAffordItem(item.id)) return false
        if (searchQuery.value.trim()) {
          const q = searchQuery.value.toLowerCase().trim()
          return (
            item.name.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.rarity.includes(q)
          )
        }
        return true
      }),
    )

    function canAffordItem(itemId: string): boolean {
      const item = SHOP_ITEMS.find((i) => i.id === itemId)
      if (!item) return false
      if (gameStore.chimes < itemStore.itemPrice(itemId)) return false
      if (item.materialCost && !inventoryStore.hasMaterials(item.materialCost)) return false
      return true
    }

    // Category buckets in ITEM_CATEGORIES order; while searching/filtering only
    // categories with matches render (mirrors the champion tier sections).
    // Cards sort rarity → price so progression reads top-to-bottom.
    const itemGroups = computed(() => {
      const byCat = new Map<ItemCategory, typeof filteredItems.value>()
      for (const item of filteredItems.value) {
        const bucket = byCat.get(item.category) ?? byCat.set(item.category, []).get(item.category)!
        bucket.push(item)
      }
      const cats = itemNarrowed.value
        ? ITEM_CATEGORIES.filter((c) => (byCat.get(c.id)?.length ?? 0) > 0)
        : ITEM_CATEGORIES
      return cats.map((c) => ({
        ...c,
        ownedCount: SHOP_ITEMS.filter(
          (i) => i.category === c.id && (itemStore.ownedItems[i.id] ?? 0) > 0,
        ).length,
        totalCount: SHOP_ITEMS.filter((i) => i.category === c.id).length,
        items: (byCat.get(c.id) ?? [])
          .slice()
          .sort(
            (a, b) =>
              (RARITY_RANK.get(a.rarity) ?? 0) - (RARITY_RANK.get(b.rarity) ?? 0) ||
              a.price - b.price,
          )
          .map((item) => ({
            ...item,
            rarityLabel: RARITY_BY_ID.get(item.rarity)?.label ?? item.rarity,
            rarityColor: RARITY_BY_ID.get(item.rarity)?.color ?? '#e8c040',
            ownedCount: itemStore.ownedItems[item.id] ?? 0,
            buyable: canAffordItem(item.id),
          })),
      }))
    })

    /**
     * How many item cards the Items tab holds under the current search and item
     * chips. It is the tab's badge, so it has to stay true while the player is
     * standing in the OTHER tab — that number is the only thing telling them a
     * search landed over there.
     */
    const visibleItemsCount = computed(() =>
      itemGroups.value.reduce((sum, g) => sum + g.items.length, 0),
    )

    /**
     * Champions the player can actually get their hands on right now: the ones
     * whose tier already spawns in this galaxy, so they can be found on a planet
     * and bought here once they are. The tab used to count every champion in the
     * game that is not owned yet — a number that says nothing about what is
     * reachable and never moves except by recruiting.
     *
     * Galaxy-locked tiers are excluded (their champions cannot be found yet);
     * owned champions are already out, tierGroups drops them. Search and filter
     * chips narrow it like they narrow the grid, so the number always counts the
     * cards actually on screen.
     */
    const reachableChampionCount = computed(() =>
      tierGroups.value.reduce((sum, g) => (g.isGalaxyLocked ? sum : sum + g.champions.length), 0),
    )

    /** Both halves at once — the rail shows them side by side, so the split
     *  stays honest without the player having to switch to find out. */
    const domainCounts = computed(() => ({
      champions: reachableChampionCount.value,
      items: visibleItemsCount.value,
    }))
    /** What the open half is holding — the number inside the search field. */
    const domainHitCount = computed(() =>
      activeDomain.value === 'items' ? visibleItemsCount.value : reachableChampionCount.value,
    )
    /** `highlightSegments` expects it lowercased and trimmed. */
    const normalizedQuery = computed(() => searchQuery.value.toLowerCase().trim())

    // ── Grid empty states, one per tab ──
    // tierGroups / itemGroups only drop sections while the domain is narrowed;
    // unnarrowed they always list every tier and category (with "All recruited ✓"
    // inside), so an empty list here really does mean "nothing matched".
    const crossRoleOnly = computed(
      () => tierGroups.value.length === 0 && crossRoleChampions.value.length > 0,
    )
    const noChampionsFound = computed(
      () => tierGroups.value.length === 0 && crossRoleChampions.value.length === 0,
    )
    const noItemsFound = computed(() => itemGroups.value.length === 0)

    // ── Collapsible item category sections (all start collapsed) ──
    const collapsedItemCats = ref(new Set<ItemCategory>(ITEM_CATEGORIES.map((c) => c.id)))
    function isItemCatCollapsed(cat: ItemCategory): boolean {
      return itemNarrowed.value ? false : collapsedItemCats.value.has(cat)
    }
    function toggleItemCatSection(cat: ItemCategory) {
      const next = new Set(collapsedItemCats.value)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      collapsedItemCats.value = next
    }

    // ── The two tabs ──
    const gridRef = ref<HTMLElement | null>(null)

    // Puts the highest unlocked tier's header (freshly expanded) at the very
    // top of the grid.
    function scrollToTierTop(tier: number) {
      const grid = gridRef.value
      if (!grid) return
      const section = grid.querySelector<HTMLElement>(`[data-tier-section="${tier}"]`)
      if (!section) return
      const raw =
        section.getBoundingClientRect().top -
        grid.getBoundingClientRect().top +
        grid.scrollTop -
        // the pinned search field covers the top edge, so the header clears it too
        (SHOP_JUMP_SCROLL_OFFSET_PX + SHOP_HERO_PINNED_H)
      // Short of the fold the field is not pinned yet and the header stands clear
      // of the whole block anyway — scrolling that hair would only fold the
      // control row away on arrival, for nothing.
      grid.scrollTo({ top: raw <= SHOP_HERO_FOLD_H ? 0 : raw, behavior: 'smooth' })
    }

    /**
     * Opens a tab. Each one lands the player where its next decision is rather
     * than on a stack of closed rows:
     *  • Champions — on the highest unlocked tier that still has someone to
     *    recruit, expanded, its header at the top edge. A tier whose champions
     *    are all recruited is skipped: landing on "All recruited ✓" answers
     *    nothing; only if every tier is cleared does the last one stand.
     *  • Items — on the first category (Weapons), open, at the top. The items
     *    now start at the grid's top edge, so that is a plain scroll reset.
     */
    let jumpSettleTimer: ReturnType<typeof setTimeout> | null = null
    function showDomain(target: 'champions' | 'items') {
      const grid = gridRef.value
      if (!grid) return
      activeDomain.value = target
      if (jumpSettleTimer !== null) {
        clearTimeout(jumpSettleTimer)
        jumpSettleTimer = null
      }
      if (target === 'items') {
        const firstCat = itemGroups.value[0]?.id
        if (firstCat && collapsedItemCats.value.has(firstCat)) {
          const next = new Set(collapsedItemCats.value)
          next.delete(firstCat)
          collapsedItemCats.value = next
        }
        grid.scrollTop = 0
        return
      }
      const unlocked = tierGroups.value.filter((g) => !g.isGalaxyLocked)
      const stocked = unlocked.filter((g) => g.champions.length > 0)
      const pool = stocked.length > 0 ? stocked : unlocked
      const highest = pool[pool.length - 1]
      if (!highest) {
        grid.scrollTop = 0
        return
      }
      if (collapsedTiers.value.has(highest.tier)) {
        const next = new Set(collapsedTiers.value)
        next.delete(highest.tier)
        collapsedTiers.value = next
      }
      // The tab swap remounts the list, so the first pass measures a grid that
      // is only half built; correct once the expand animation settled too.
      nextTick(() => scrollToTierTop(highest.tier))
      jumpSettleTimer = setTimeout(() => {
        jumpSettleTimer = null
        scrollToTierTop(highest.tier)
      }, SHOP_JUMP_EXPAND_SETTLE_MS)
    }

    // While the list scrolls, card pulse animations pause and card hover is
    // suppressed (via .is-scrolling) — dozens of animated glows plus hover-expand
    // transitions firing under the cursor otherwise tank the frame rate.
    const gridScrolling = ref(false)
    let gridScrollTimer: ReturnType<typeof setTimeout> | null = null
    onUnmounted(() => {
      if (gridScrollTimer !== null) clearTimeout(gridScrollTimer)
    })

    function onGridScroll() {
      gridScrolling.value = true
      if (gridScrollTimer !== null) clearTimeout(gridScrollTimer)
      gridScrollTimer = setTimeout(() => {
        gridScrolling.value = false
        gridScrollTimer = null
      }, SHOP_SCROLL_SETTLE_MS)
    }

    const newChampionNames = computed(() =>
      new Set(
        battleStore.newlyUnlockedChampions.filter((n) =>
          battleStore.recruitableChampions.some((r) => r.name === n),
        ),
      ),
    )

    function isNew(name: string): boolean {
      return newChampionNames.value.has(name)
    }

    let hoverTimer: ReturnType<typeof setTimeout> | null = null
    function dismissNewOnHover(name: string) {
      if (!isNew(name)) return
      if (hoverTimer !== null) clearTimeout(hoverTimer)
      hoverTimer = setTimeout(() => {
        battleStore.dismissNewChampion(name)
        hoverTimer = null
      }, CHAMPION_NEW_BADGE_DISMISS_MS)
    }

    function getChampionDetail(name: string) {
      const traitIds = CHAMPION_TRAITS[name] ?? []
      const traits = TRAIT_DEFINITIONS.filter((t) => (traitIds as string[]).includes(t.id))
      const originKey = getChampionOrigin(name)
      const origin = originKey ? ORIGIN_SYNERGIES[originKey] ?? null : null
      const cosmic = getChampionTier(name)
      const starLevel = getChampionStarLevel(name)
      return { traits, origin, cosmic, starLevel }
    }

    // ── Detail panel selection ──
    // Defined last in setup: the immediate watch below reads through
    // visibleEntries → tierGroups → championNarrowed, so every computed above
    // must already be initialized (TDZ) before it first runs.
    const selectedChampion = ref<string | null>(null)
    const selectedItem = ref<string | null>(null)

    // Der Schalter der Sitz-Zeile gilt genau für die aktuelle Auswahl und fällt
    // bei jedem Wechsel zurück — sonst verdrängt er beim nächsten Champion
    // einen Sitzenden, den niemand gemeint hat.
    const takeSeat = ref(false)
    watch(selectedChampion, () => {
      takeSeat.value = false
    })

    // Flat, tier-ordered list of every champion currently shown in the grid
    // (unlocked tier sections first, cross-role search results appended) —
    // handleBuy re-points the detail panel through this list.
    const visibleChampionList = computed(() => {
      const names: string[] = []
      for (const g of tierGroups.value) {
        if (g.isGalaxyLocked) continue
        for (const c of g.champions) names.push(c.name)
      }
      for (const c of crossRoleChampions.value) {
        if (!names.includes(c.name)) names.push(c.name)
      }
      return names
    })

    // Grid order for the detail panel's ← / →, scoped to the OPEN tab: champion
    // tiers then cross-role hits, or the item sections. Stepping out of one
    // domain into the other would walk past a tab boundary the player just drew
    // — and land the panel on a card that is not in the list behind it.
    type ShopEntry = { kind: 'champion' | 'item'; id: string }
    const visibleEntries = computed<ShopEntry[]>(() => {
      const entries: ShopEntry[] = []
      if (activeDomain.value === 'items') {
        for (const g of itemGroups.value) {
          for (const item of g.items) entries.push({ kind: 'item', id: item.id })
        }
        return entries
      }
      for (const g of tierGroups.value) {
        if (g.isGalaxyLocked) continue
        for (const c of g.champions) entries.push({ kind: 'champion', id: c.name })
      }
      for (const c of crossRoleChampions.value) {
        if (!entries.some((e) => e.kind === 'champion' && e.id === c.name)) {
          entries.push({ kind: 'champion', id: c.name })
        }
      }
      return entries
    })

    const selectedIndex = computed(() => {
      if (selectedItem.value) {
        return visibleEntries.value.findIndex(
          (e) => e.kind === 'item' && e.id === selectedItem.value,
        )
      }
      if (selectedChampion.value) {
        return visibleEntries.value.findIndex(
          (e) => e.kind === 'champion' && e.id === selectedChampion.value,
        )
      }
      return -1
    })

    function selectChampion(name: string) {
      selectedChampion.value = name
      selectedItem.value = null
    }

    function selectItem(id: string) {
      selectedItem.value = id
      selectedChampion.value = null
    }

    // ── Detail column ──
    // Selecting and opening used to be two things, because opening meant
    // covering the grid. The column stands beside it now, so a selection IS
    // the open page — and the search, which only ever selected, gets to show
    // its hit for free.
    const hasSelection = computed(() => !!(selectedChampion.value || selectedItem.value))

    function openChampion(name: string) {
      selectChampion(name)
    }

    function openItem(id: string) {
      selectItem(id)
    }

    /** Escape's first stop: drop the subject, the overview card takes over. */
    function closeDetail() {
      selectedChampion.value = null
      selectedItem.value = null
    }

    watch(hasSelection, (open) => emit('detailState', open), { immediate: true })
    watch(
      () => props.closeDetailToken,
      () => closeDetail(),
    )

    /**
     * Jeder Besuch faengt frisch an — nicht jede Sitzung.
     *
     * Der Reiter bleibt nach dem ersten Oeffnen gemountet, `onMounted` liefe
     * also genau einmal. Was der Spieler beim letzten Mal gesucht und gewaehlt
     * hat, ist beim naechsten Betreten kein Zustand mehr, sondern ein Rest: eine
     * Galaxie weiter steht die hoechste rekrutierbare Stufe woanders.
     *
     * Zurueckgesetzt wird beim BETRETEN und nicht beim Verlassen, und das ist
     * der Unterschied zum Team-Tab: dort raeumt der Reiter selbst auf, hier
     * kommt der Deep-Link (`pendingChampionSearch`) im selben Flush wie der
     * Reiterwechsel. Ein Reset beim Verlassen liefe mit ihm um die Wette,
     * `openAtHighestTier` tritt dagegen von sich aus zurueck, sobald eine Suche
     * oder eine Auswahl steht.
     *
     * `immediate` ersetzt den Mount-Aufruf: der Reiter wird DURCH das Oeffnen
     * gemountet, sein erster Besuch beginnt also mit ihm.
     */
    watch(
      () => props.visitToken,
      () => {
        searchQuery.value = ''
        closeDetail()
        nextTick(openAtHighestTier)
      },
      { immediate: true },
    )

    // Deep-link from a notify-badge tooltip: fill the search with the champion
    // name — the search watcher below then auto-selects it (exact match) in the
    // detail panel. Placed after selectedChampion so its immediate run is safe.
    watch(
      () => uiStore.pendingChampionSearch,
      (name) => {
        if (!name) return
        searchQuery.value = name
        uiStore.clearPendingChampionSearch()
      },
      { immediate: true },
    )

    function applyEntry(entry: ShopEntry) {
      if (entry.kind === 'champion') selectChampion(entry.id)
      else selectItem(entry.id)
    }

    // Resolve an entry's display name (champion name, or item name by id).
    function entryName(entry: ShopEntry): string {
      if (entry.kind === 'champion') return entry.id
      return SHOP_ITEMS.find((i) => i.id === entry.id)?.name ?? entry.id
    }

    // Auto-select the first search hit so the detail panel updates live as the
    // player types. Prefers an exact name match (so a full name or a tooltip
    // deep-link lands on that exact champion/item), else the first visible card
    // in grid order. An empty query keeps the "no auto-select until click"
    // default view.
    //
    // The search is the one thing the tabs must NOT be allowed to cut in half:
    // it reads names on both sides, and a query that only lands in the closed
    // tab would otherwise read as "no results" while the badge next door says
    // otherwise. So a search with nothing here and something there moves the
    // player over. Only in that direction — with hits on this side, staying put
    // is what they asked for.
    watch(
      searchQuery,
      (raw) => {
        const q = raw.trim().toLowerCase()
        if (!q) return
        if (visibleEntries.value.length === 0) {
          const other = activeDomain.value === 'champions' ? 'items' : 'champions'
          const otherHits =
            other === 'items' ? visibleItemsCount.value : reachableChampionCount.value
          if (otherHits > 0) activeDomain.value = other
        }
        const list = visibleEntries.value
        if (list.length === 0) return
        const exact = list.find((e) => entryName(e).toLowerCase() === q)
        applyEntry(exact ?? list[0])
      },
      { immediate: true },
    )

    /**
     * Opening state: the shop lands ON the highest tier the player can actually
     * recruit from — expanded, its header at the top of the grid, its first
     * champion selected — instead of on six collapsed rows that all have to be
     * opened by hand. That tier is where the next purchase is; everything under
     * it is already owned or already passed.
     *
     * The pick inside the tier prefers a champion that is affordable right now,
     * so the selection is a decision the player can act on rather than the
     * alphabetically first name.
     *
     * That pick fills the detail column straight away. It costs the grid
     * nothing to do so — which is exactly what the old layer could not say.
     */
    function openAtHighestTier() {
      // a deep link (notify badge → pendingChampionSearch) has already aimed the
      // shop somewhere; it wins
      if (searchQuery.value.trim() || selectedChampion.value || selectedItem.value) return
      const open = tierGroups.value.filter((g) => !g.isGalaxyLocked && g.champions.length > 0)
      const highest = open[open.length - 1]
      if (!highest) return
      const pick = highest.champions.find((c) => canClickBuy(c.name)) ?? highest.champions[0]
      if (pick) selectChampion(pick.name)
      // expands the tier and puts its header at the top edge (settle included)
      showDomain('champions')
    }


    function selectPrev() {
      const list = visibleEntries.value
      if (list.length === 0) return
      const i = selectedIndex.value
      applyEntry(list[(i - 1 + list.length) % list.length])
    }

    function selectNext() {
      const list = visibleEntries.value
      if (list.length === 0) return
      applyEntry(list[(selectedIndex.value + 1) % list.length])
    }

    // Without a search the panel shows its empty state until the player clicks a
    // card (search auto-select is handled by the searchQuery watcher above).
    // Here we only clear the selection when it goes stale (filtered out; a bought
    // champion is re-pointed by handleBuy before this runs).
    watch(visibleEntries, (list) => {
      if (
        selectedChampion.value &&
        !list.some((e) => e.kind === 'champion' && e.id === selectedChampion.value)
      ) {
        selectedChampion.value = null
      }
      if (selectedItem.value && !list.some((e) => e.kind === 'item' && e.id === selectedItem.value)) {
        selectedItem.value = null
      }
    })

    // Selecting a champion (card click or prev/next) expands its tier section
    // so the highlighted card is always visible in the grid.
    watch(selectedChampion, (name) => {
      if (!name) return
      const star = getChampionStarLevel(name)
      if (collapsedTiers.value.has(star) && !isTierGalaxyLocked(star)) {
        const next = new Set(collapsedTiers.value)
        next.delete(star)
        collapsedTiers.value = next
      }
    })

    // Same for items: expand the selected item's category section.
    watch(selectedItem, (id) => {
      if (!id) return
      const item = SHOP_ITEMS.find((i) => i.id === id)
      if (item && collapsedItemCats.value.has(item.category)) {
        const next = new Set(collapsedItemCats.value)
        next.delete(item.category)
        collapsedItemCats.value = next
      }
    })

    /** Die Sitz-Zeile des Detail-Panels: welche Rolle, und wer dort schon sitzt. */
    function championSeat(name: string): ShopChampionDetail['seat'] {
      const seat = recruitSeatFor(name, battleStore.headerSlots)
      if (seat.kind === 'none') return null
      const role = ROLE_BY_KEY[seat.roleKey]
      return {
        roleLabel: role.label,
        roleColor: role.color,
        roleIcon: role.icon,
        occupant:
          seat.kind === 'held'
            ? {
                name: seat.occupant,
                image: battleStore.getChampionImage(seat.occupant, { size: 'md' }),
              }
            : null,
      }
    }

    // Everything the detail panel renders for the selected champion.
    const detail = computed<ShopChampionDetail | null>(() => {
      const name = selectedChampion.value
      if (!name) return null
      const d = getChampionDetail(name)
      const role = CHAMPION_ROLES[name] as keyof typeof ROLE_BADGE | undefined
      const badge = role ? ROLE_BADGE[role] : undefined
      const cost = getMaterialCost(name)
      const materials = Object.entries(cost).map(([id, qty]) => ({
        id,
        name: getMaterialName(id),
        image: getMaterialImage(id),
        need: qty,
        have: inventoryStore.collectedMaterials[id] ?? 0,
        ok: hasEnoughMaterial(id, qty),
        color: MATERIAL_COLOR[id],
      }))
      return {
        name,
        image: battleStore.getChampionImage(name, { size: 'lg' }),
        roleLabel: badge?.label ?? '',
        roleColor: badge?.color ?? '#c89040',
        traits: d.traits,
        origin: d.origin,
        starLevel: d.starLevel,
        tierName: d.cosmic.name,
        tierColor: d.cosmic.color,
        tierIcon: d.cosmic.icon,
        tierDescription: d.cosmic.description,
        spawnPercent: championTierSpawnPercent(d.starLevel, galaxyStore.currentGalaxy),
        locked: isLocked(name),
        lockedHint: getLockedTooltip(name),
        homePlanet: getHomePlanet(name),
        materials,
        chimes: {
          need: getChimesPrice(name),
          have: gameStore.chimes,
          ok: canAffordChimes(name),
        },
        canBuy: canClickBuy(name),
        seat: championSeat(name),
      }
    })

    // Everything the item detail panel renders for the selected item.
    const itemDetail = computed<ShopItemDetail | null>(() => {
      const id = selectedItem.value
      if (!id) return null
      const item = SHOP_ITEMS.find((i) => i.id === id)
      if (!item) return null
      const cat = ITEM_CATEGORIES.find((c) => c.id === item.category)
      const rar = RARITY_BY_ID.get(item.rarity)
      const set = item.setId ? ITEM_SETS.find((s) => s.setId === item.setId) : undefined
      const materials = Object.entries(item.materialCost ?? {}).map(([matId, qty]) => ({
        id: matId,
        name: getMaterialName(matId),
        image: getMaterialImage(matId),
        need: qty,
        have: inventoryStore.collectedMaterials[matId] ?? 0,
        ok: hasEnoughMaterial(matId, qty),
        color: MATERIAL_COLOR[matId],
      }))
      return {
        id: item.id,
        name: item.name,
        icon: item.icon,
        description: item.description,
        category: item.category,
        categoryLabel: cat?.label ?? item.category,
        categoryImage: cat?.image ?? '',
        categoryColor: cat?.color ?? '#7a4e20',
        rarity: item.rarity,
        rarityLabel: rar?.label ?? item.rarity,
        rarityColor: rar?.color ?? '#e8c040',
        ownedCount: itemStore.ownedItems[item.id] ?? 0,
        set: set
          ? {
              name: set.setName,
              icon: set.icon,
              description: set.description,
              active: itemStore.activeSetBonuses.some((b) => b.setId === set.setId),
            }
          : null,
        materials,
        chimes: {
          need: itemStore.itemPrice(item.id),
          have: gameStore.chimes,
          ok: gameStore.chimes >= itemStore.itemPrice(item.id),
        },
        canBuy: canAffordItem(item.id),
      }
    })

    function handleBuyItem(id: string) {
      if (!canAffordItem(id)) return
      const item = SHOP_ITEMS.find((i) => i.id === id)
      if (!item) return
      itemStore.buyItem(id)
      announceReceipt({
        kind: 'purchase',
        headline: item.name,
        subline: item.description,
        // `item.icon` ist ein BILDPFAD, kein Iconify-Name — als `icon`
        // übergeben rendert er eine leere Fläche. Und ein Schwert wird
        // eingepasst, nicht rund beschnitten.
        portraitSrc: item.icon,
        imageRound: false,
        delta: { value: -itemStore.itemPrice(id), unit: 'chimes' },
        // Sechs Käufe in Folge ergeben EINE Karte mit der Gesamtausgabe — die
        // war früher nirgends abzulesen.
        mergeKey: 'purchase/item',
      })
    }

    // ══ Atlas: three zones, one bar ═════════════════════════════════════════
    const atlasRef = ref<HTMLElement | null>(null)
    /**
     * Explicit fold, or `null` for "let the width decide". Kept apart from the
     * measured default on purpose: once the player has folded or unfolded the
     * rail themselves, resizing the window must not undo that decision.
     */
    const userFacetsFolded = ref<boolean | null>(null)
    const atlasWidth = ref(0)
    const facetsFolded = computed(
      () =>
        userFacetsFolded.value ??
        (atlasWidth.value > 0 && atlasWidth.value < SHOP_ATLAS_FACET_AUTOFOLD_WIDTH),
    )
    function setFacetsFolded(folded: boolean) {
      userFacetsFolded.value = folded
    }

    /**
     * The three zones share one budget: whatever the facets and the detail take,
     * the grid gets the rest. Written as one string rather than three custom
     * properties so the columns can never be measured mid-swap against a stale
     * sibling.
     */
    const atlasColumns = computed(() => {
      const facet = facetsFolded.value ? SHOP_ATLAS_FACET_RAIL_COLLAPSED : SHOP_ATLAS_FACET_RAIL_WIDTH
      return `${facet}px minmax(0, 1fr) clamp(${SHOP_ATLAS_DETAIL_MIN_WIDTH}px, ${SHOP_ATLAS_DETAIL_PCT}%, ${SHOP_ATLAS_DETAIL_MAX_WIDTH}px)`
    })
    const cardMinWidthPx = computed(() => `${SHOP_ATLAS_CARD_MIN_WIDTH}px`)
    const cardHeightPx = computed(() => `${SHOP_ATLAS_CARD_HEIGHT}px`)
    const gridGapPx = computed(() => `${SHOP_ATLAS_GRID_GAP}px`)

    let atlasObserver: ResizeObserver | null = null
    onMounted(() => {
      const el = atlasRef.value
      if (!el || typeof ResizeObserver === 'undefined') return
      atlasObserver = new ResizeObserver((entries) => {
        // Versteckt (`display: none`) meldet der Beobachter 0. Das ist keine
        // Breite, sondern die Abwesenheit einer — uebernaehme man sie, faende
        // `facetsFolded` beim Wiedereinblenden einen Frame lang keine Schwelle
        // und die eingeklappte Leiste spraenge auf.
        const w = entries[0]?.contentRect.width ?? 0
        if (w > 0) atlasWidth.value = w
      })
      atlasObserver.observe(el)
    })
    onUnmounted(() => {
      atlasObserver?.disconnect()
      atlasObserver = null
    })

    // ── Facets ──────────────────────────────────────────────────────────────
    // Counts come from the UNFILTERED pool on purpose: a count that shrank as
    // its own chip narrowed the list would answer a question nobody asked, and
    // the number a player wants from a facet is "how many are there", not "how
    // many survive what I already picked".
    const setPartCounts = computed(() => {
      const owned = new Map<string, number>()
      const total = new Map<string, number>()
      for (const item of SHOP_ITEMS) {
        if (!item.setId) continue
        total.set(item.setId, (total.get(item.setId) ?? 0) + 1)
        if ((itemStore.ownedItems[item.id] ?? 0) > 0) {
          owned.set(item.setId, (owned.get(item.setId) ?? 0) + 1)
        }
      }
      return { owned, total }
    })

    const facetGroups = computed<ShopFacetGroup[]>(() => {
      if (activeDomain.value === 'items') {
        return [
          {
            id: 'category',
            label: 'Category',
            icon: 'lucide:layers',
            chips: ITEM_CATEGORIES.map((c) => ({
              id: c.id,
              label: c.label,
              color: c.color,
              image: c.image,
              count: SHOP_ITEMS.filter((i) => i.category === c.id).length,
              active: activeItemCats.value.includes(c.id),
            })),
          },
          {
            id: 'rarity',
            label: 'Rarity',
            icon: 'lucide:gem',
            chips: ITEM_RARITIES.map((r) => ({
              id: r.id,
              label: r.label,
              color: r.color,
              count: SHOP_ITEMS.filter((i) => i.rarity === r.id).length,
              active: activeRarities.value.includes(r.id),
            })),
          },
          {
            id: 'set',
            label: 'Sets',
            icon: 'lucide:link',
            chips: ITEM_SETS.map((s) => ({
              id: s.setId,
              label: s.setName,
              icon: s.icon.startsWith('/') ? undefined : s.icon,
              image: s.icon.startsWith('/') ? s.icon : undefined,
              color: '#b87ed8',
              count: setPartCounts.value.total.get(s.setId) ?? 0,
              active: activeSets.value.includes(s.setId),
              title: s.description,
            })),
          },
        ]
      }
      return [
        {
          id: 'role',
          label: 'Role',
          icon: 'lucide:users',
          chips: roleChips.value.map((r) => ({
            id: r.key,
            label: r.label,
            color: r.color,
            image: r.image,
            count: gridChampionNames.value.filter((n) => CHAMPION_ROLES[n] === r.key).length,
            active: activeRole.value === r.key,
            disabled: !r.available,
            title: r.available ? r.label : 'No champions in shop',
          })),
        },
        {
          id: 'tier',
          label: 'Tier',
          icon: 'lucide:star',
          chips: tierChips.value.map((t) => ({
            id: String(t.starLevel),
            label: `★${t.starLevel} ${t.name}`,
            color: t.color,
            icon: t.icon,
            count: chipPool.value.filter((n) => getChampionStarLevel(n) === t.starLevel).length,
            active: activeTier.value === t.starLevel,
            disabled: t.locked || !t.available,
            locked: t.locked,
            title: t.locked
              ? `Locked — unlocks by Galaxy ${t.requiredGalaxy}`
              : t.available
                ? `★${t.starLevel} ${t.name}`
                : 'No champions in shop',
          })),
        },
        {
          id: 'trait',
          label: 'Traits',
          icon: 'lucide:sparkles',
          // Typing a trait NAME narrows the facet list to what it matched: the
          // search reads chips too, and leaving fifteen of them standing while
          // one is meant would make the player find it twice.
          chips: traitChips.value
            .filter((t) => !hasSearchTraitMatch.value || searchMatchedTraits.value.has(t.id))
            .map((t) => ({
            id: t.id,
            label: t.name,
            color: t.color,
            icon: t.icon,
            count: filterChampionCount.value[t.id] ?? 0,
            active: activeTraits.value.includes(t.id),
            disabled: !t.available,
          })),
        },
        {
          id: 'origin',
          label: 'Origins',
          icon: 'lucide:map-pin',
          chips: originChips.value
            .filter((o) => !hasSearchTraitMatch.value || searchMatchedTraits.value.has(o.origin))
            .map((o) => ({
            id: o.origin,
            label: o.origin,
            color: o.color,
            icon: o.icon,
            count: filterChampionCount.value[o.origin] ?? 0,
            active: activeTraits.value.includes(o.origin),
            disabled: !o.available,
          })),
        },
      ]
    })

    function onFacetToggle(groupId: string, chipId: string) {
      switch (groupId) {
        case 'role':
          setActiveRole(activeRole.value === chipId ? 'all' : (chipId as ChampionRole))
          break
        case 'tier': {
          const star = Number(chipId)
          activeTier.value = activeTier.value === star ? 'all' : star
          break
        }
        case 'trait':
        case 'origin':
          toggleTrait(chipId)
          break
        case 'category':
          toggleItemCat(chipId as ItemCategory)
          break
        case 'rarity':
          toggleRarity(chipId as ItemRarity)
          break
        case 'set':
          activeSets.value = activeSets.value.includes(chipId)
            ? activeSets.value.filter((id) => id !== chipId)
            : [...activeSets.value, chipId]
          break
      }
    }

    /** Cards the player could pay for right now, independent of every filter —
     *  including the affordable filter itself, which would make it circular. */
    const affordableCount = computed(() =>
      activeDomain.value === 'items'
        ? SHOP_ITEMS.filter((i) => canAffordItem(i.id)).length
        : shopChampionNames.value.filter((n) => canClickBuy(n)).length,
    )

    // ── Overview card (detail column, nothing picked) ────────────────────────
    const overviewOwned = computed(() =>
      activeDomain.value === 'items'
        ? SHOP_ITEMS.filter((i) => (itemStore.ownedItems[i.id] ?? 0) > 0).length
        : battleStore.ownedChampions.filter((n) => n !== 'Bard').length,
    )
    const overviewTotal = computed(() =>
      activeDomain.value === 'items'
        ? SHOP_ITEMS.length
        : championNames.value.filter((n) => n !== 'Bard').length,
    )
    const overviewGalaxy = computed(() => galaxyStore.currentGalaxy)

    /** The next wall, not the next step: the lowest tier still galaxy-locked. */
    const overviewNextTier = computed<ShopOverviewTier | null>(() => {
      const next = CHAMPION_TIERS_BY_STAR.find((t) => isTierGalaxyLocked(t.starLevel))
      if (!next) return null
      return {
        starLevel: next.starLevel,
        name: next.name,
        icon: next.icon,
        color: next.color,
        requiredGalaxy: requiredGalaxyForTier(next.starLevel),
      }
    })

    const OVERVIEW_PICK_LIMIT = 3
    const overviewPicks = computed<ShopOverviewPick[]>(() => {
      if (activeDomain.value === 'items') {
        return SHOP_ITEMS.filter((i) => canAffordItem(i.id))
          .sort((a, b) => itemStore.itemPrice(a.id) - itemStore.itemPrice(b.id))
          .slice(0, OVERVIEW_PICK_LIMIT)
          .map((i) => {
            const rarity = ITEM_RARITIES.find((r) => r.id === i.rarity)
            return {
              kind: 'item' as const,
              id: i.id,
              name: i.name,
              image: i.icon.startsWith('/') ? i.icon : undefined,
              icon: i.icon.startsWith('/') ? undefined : i.icon,
              color: rarity?.color ?? '#e8c040',
              sub: `${rarity?.label ?? i.rarity} · ${itemStore.itemPrice(i.id).toLocaleString()} chimes`,
            }
          })
      }
      return shopChampionNames.value
        .filter((n) => canClickBuy(n))
        .sort((a, b) => getChampionStarLevel(b) - getChampionStarLevel(a) || a.localeCompare(b))
        .slice(0, OVERVIEW_PICK_LIMIT)
        .map((name) => ({
          kind: 'champion' as const,
          id: name,
          name,
          image: battleStore.getChampionImage(name, { size: 'sm' }),
          color: getTierColor(name),
          sub: `★${getChampionStarLevel(name)} · ${getChimesPrice(name).toLocaleString()} chimes`,
        }))
    })

    const overviewSets = computed<ShopOverviewSet[]>(() =>
      ITEM_SETS.map((s) => ({
        id: s.setId,
        name: s.setName,
        icon: s.icon.startsWith('/') ? undefined : s.icon,
        image: s.icon.startsWith('/') ? s.icon : undefined,
        description: s.description,
        ownedParts: setPartCounts.value.owned.get(s.setId) ?? 0,
        totalParts: setPartCounts.value.total.get(s.setId) ?? 0,
        active: itemStore.activeSetBonuses.some((b) => b.setId === s.setId),
      })),
    )

    /**
      * Why the picks are empty, when they are. "Nothing affordable" is the wrong
      * answer for a fresh save: the player may be sitting on billions of chimes
      * and still have nobody to spend them on, because no home planet has fallen
      * yet. An empty state that names the wrong cause sends them to farm the
      * wrong thing.
      */
    const overviewEmptyHint = computed(() => {
      if (activeDomain.value === 'items') {
        return 'Nothing affordable yet — chimes are still gathering.'
      }
      if (shopChampionNames.value.length === 0) {
        return 'No champion unlocked yet — rescue a home planet in the orbit to bring one into the shop.'
      }
      return 'Nothing affordable yet — chimes and materials are still gathering.'
    })

    function onOverviewPick(kind: 'champion' | 'item', id: string) {
      if (kind === 'champion') selectChampion(id)
      else selectItem(id)
    }

    return {
      tierGroups,
      tierOwned,
      tierTotal,
      isTierCollapsed,
      toggleTier,
      allTiersCollapsed,
      toggleAllTiers,
      onTierEnter,
      onTierAfterEnter,
      onTierLeave,
      hasActiveFilter,
      battleStore,
      CHAMPION_ROLES,
      searchQuery,
      isOwned,
      isUnlocked,
      isLocked,
      getTierColor,
      canAffordChampion,
      handleBuy,
      getLockedTooltip,
      getCardClass,
      resetSearch,
      clearFilters,
      searchInputRef,
      isNew,
      dismissNewOnHover,
      getChampionDetail,
      crossRoleChampions,
      selectedChampion,
      openChampion,
      openItem,
      closeDetail,
      gridScrolling,
      selectPrev,
      selectNext,
      selectedIndex,
      visibleEntries,
      detail,
      takeSeat,
      ROLE_BADGE,
      // ── Unified shop: items ──
      itemGroups,
      crossRoleOnly,
      noChampionsFound,
      noItemsFound,
      reachableChampionCount,
      domainCounts,
      domainHitCount,
      normalizedQuery,
      isItemCatCollapsed,
      toggleItemCatSection,
      selectedItem,
      itemDetail,
      handleBuyItem,
      visibleItemsCount,
      gridRef,
      activeDomain,
      showDomain,
      canCollapseAll,
      domainNarrowed,
      heroFoldPx,
      heroPinnedPx,
      heroFieldMaxPx,
      onGridScroll,
      // ── Atlas ──
      atlasRef,
      atlasColumns,
      cardMinWidthPx,
      cardHeightPx,
      gridGapPx,
      facetsFolded,
      setFacetsFolded,
      facetGroups,
      onFacetToggle,
      affordableOnly,
      affordableCount,
      overviewOwned,
      overviewTotal,
      overviewGalaxy,
      overviewNextTier,
      overviewPicks,
      overviewSets,
      overviewEmptyHint,
      onOverviewPick,
    }
  },
})
</script>

<style scoped>
/* ══ Atlas ══════════════════════════════════════════════════════════════════
   Three zones, no bar over them. The shop covers the whole tab now, so this is
   the frame — nothing else draws a border around it. The search that used to
   head all three now stands at the top of the grid column, over the sections it
   filters.

   `container-type` and not a media query: the profile modal is inset by
   `--hud-panel-size` on both sides, so the width that decides whether the facet
   rail fits is the ATLAS's, not the viewport's. Two machines on the same
   monitor at different UI scales get different answers, and only the container
   knows which. */
.cs-atlas {
  container-type: inline-size;
  /* fixed-px content designed for 1920×1080 — zoom down on smaller desktops,
     same factor the rest of the team tab uses */
  zoom: var(--team-ui-scale, 1);
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: v-bind(atlasColumns);
  grid-template-rows: minmax(0, 1fr);
  /* No surface of its own: the tab's shared starfield lies behind the atlas. */
  background: transparent;
  --text-transition-dur: 0.22s;
  --cs-card-h: v-bind(cardHeightPx);
  /* Deckung über dem Sternfeld: --cs-veil trägt die Zonenflächen,
     --cs-block die Karten darauf. Höher = ruhiger, niedriger = mehr Himmel. */
  --cs-veil: 0.55;
  --cs-block: 0.76;
}

/* How many cards the open half is holding, inside the field. Red at zero, which
   is the moment the other tab is worth a look. */
.cs-hits {
  min-width: 26px;
  padding: 0 6px;
  font-size: 14px;
  font-weight: 900;
  color: #e8c040;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.cs-hits--empty {
  color: #cc6050;
}

/* ── The three zones ── */
.cs-atlas-facets {
  min-height: 0;
}
/* The starfield IS the grid's surface — the one zone that opens onto it, the
   way the stage does in the planets tab. `.cs-hero-plinth` stays opaque: cards
   scroll under it. */
.cs-atlas-grid {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  background: transparent;
}
.cs-atlas-detail {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgba(20, 16, 10, var(--cs-veil));
  border-left: 2px solid #5c3310;
}
/* The column swaps subjects, it does not slide in and out — only its content
   changes, so the exchange is a beat rather than a movement. */
.cs-detail-swap-enter-active {
  transition:
    opacity 0.17s ease-out,
    transform 0.17s ease-out;
}
.cs-detail-swap-leave-active {
  transition:
    opacity 0.09s ease-in,
    transform 0.09s ease-in;
}
.cs-detail-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.cs-detail-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .cs-detail-swap-enter-from,
  .cs-detail-swap-leave-to {
    transform: none;
  }
}

/* ── Empty state ── */
.empty-icon-box {
  border: 1px dashed var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
}
.empty-label {
  font-size: 0.875rem;
  color: var(--rpg-text-dim);
}

/* Card visuals live in ChampionShopCard.vue. While the shop list scrolls
   (.is-scrolling on the grid itself), freeze the card pulse glows and skip card
   hit-testing — otherwise the animated shadows firing under the cursor cause
   per-frame repaints that tank the scroll frame rate. */
.is-scrolling .champion-card-slot,
.is-scrolling .item-card-slot {
  pointer-events: none;
  --pulse-play: paused;
}

/* ── Item sections: category icon in the tier-style header ── */
.item-cat-header-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.7));
}

/* ── Tab swap ──
   The two halves replace each other in place, so the exchange gets the same
   beat the filter panel above it uses: the leaving list drops away, the
   arriving one settles in from just above. Only opacity/transform — the orbit
   keeps running behind the rail. */
.cs-domain-swap-enter-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}
.cs-domain-swap-leave-active {
  transition:
    opacity 0.09s ease-in,
    transform 0.09s ease-in;
}
.cs-domain-swap-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.cs-domain-swap-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* ── Empty state: the way over to the other tab ──
   Reads as a lead, not as a button bar: the count is the message, the arrow
   only says where it goes. */
.cs-empty-jump {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #c89040;
  background: #1a1008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
}
.cs-empty-jump:hover {
  color: #e8c060;
  background: #221408;
  border-color: #7a4e20;
}
.cs-empty-jump-arrow {
  font-size: 14px;
  line-height: 1;
  opacity: 0.7;
}

/* ── Grid area ──
   Same horizontal inset as the tier headers, so cards and section rules share
   one left edge. */
.cs-atlas-grid {
  padding: 12px 14px;
}

/* ── Search hero ──
   Stands at the top of the SCROLLER, not of the tab. The negative margins
   cancel the scroller's own padding so the plinth reaches both edges, and the
   sticky offset is that padding PLUS the fold: the block rides up by exactly
   the control row before it pins, which leaves the field standing and the row
   gone. No scroll listener and no height transition — a height that changed per
   frame would reflow every card below it. */
.cs-search-hero {
  position: sticky;
  top: calc(-12px - v-bind(heroFoldPx));
  z-index: 3;
  margin: -12px -14px 12px;
  padding-top: 12px;
}
.cs-hero-acts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: min(v-bind(heroFieldMaxPx), calc(100% - 28px));
  height: 28px;
  margin: 0 auto 10px;
}
/* Holds the space when there is no reset button, so `space-between` keeps
   Collapse all on the right instead of dropping it to the left. */
.cs-hero-gap {
  flex: 1;
}
/* The one opaque strip of the column — the rest of it opens onto the starfield.
   Its height is the pinned one: cards scroll under exactly this. */
.cs-hero-plinth {
  display: flex;
  align-items: center;
  height: v-bind(heroPinnedPx);
  padding: 0 14px;
  background: #111008;
  border-bottom: 1px solid #3e200a;
}
.cs-hero-field {
  width: 100%;
  max-width: v-bind(heroFieldMaxPx);
  margin: 0 auto;
}
.cs-hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 26px;
  padding: 0 10px;
  border: 1px solid #5c3310;
  border-radius: var(--bp-radius);
  background: #16120a;
  color: #c89040;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
}
.cs-hero-btn:hover {
  color: #e8c060;
  background: #221408;
  border-color: #7a4e20;
}
.cs-hero-btn--on {
  color: #e8c040;
  border-color: #7a4e20;
}
.cs-hero-btn--reset {
  color: #cc8070;
  border-color: #6a3020;
}
.cs-hero-btn--reset:hover {
  color: #ffdddd;
  border-color: #cc6050;
  background: rgba(60, 20, 14, 0.7);
}

/* ── Card grid ──
   auto-fill, not a fixed column count: the grid gets whatever the facet rail
   and the detail column leave over, and that number is different at Full HD
   than at 2K. Tailwind's sm:/md: breakpoints measured the VIEWPORT, which the
   profile modal is inset from on both sides — they were counting the wrong
   width. */
.cs-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(v-bind(cardMinWidthPx), 1fr));
  gap: v-bind(gridGapPx);
}

/* ── Cross-role search results ── */
.cross-role-section {
  margin-top: 14px;
}

.cross-role-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 0 2px;
}
.cross-role-divider::before,
.cross-role-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #5c3310, transparent);
}
.cross-role-divider-label {
  font-size: 10px;
  font-weight: 700;
  color: #7a6040;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.cross-role-card { opacity: 0.88; transition: opacity 0.18s ease; }
.cross-role-card:hover { opacity: 1; }

/* ── Tier section spacing (header styles shared in rpg-theme.css → .tier-header*) ── */
.tier-group + .tier-group { margin-top: 12px; }

/* Offscreen tier sections are neither painted nor layerized while the list
   scrolls; the browser keeps the last rendered height for stable scrollbars. */
.tier-group {
  content-visibility: auto;
  contain-intrinsic-size: auto 340px;
}
/* Hover-expanded cards can spill past the group box (single-row groups expand
   downward) — lift the paint containment while a card in the group is hovered
   so the expansion isn't clipped. */
.tier-group:has(.champion-card-slot:hover),
.tier-group:has(.item-card-slot:hover) {
  content-visibility: visible;
}

/* Smooth expand/collapse. JS hooks (onTierEnter/Leave) animate height between 0
   and scrollHeight, then clear inline styles so the open body is overflow:visible
   — letting the hover-expanded cards spill out of their slot as designed. The
   chevron rotation is shared in rpg-theme.css. */
.tier-body-inner {
  transition: height 0.28s ease;
}
.tier-all-recruited {
  padding: 4px 2px 8px;
  font-size: 12px;
  color: #6e7c52;
  letter-spacing: 0.03em;
}

/* ── Cross-role chip: trait/origin found in another role ── */
.trait-chip--cross-role {
  opacity: 0.55;
  border-style: dashed;
}
.trait-chip--cross-role:hover {
  opacity: 0.9;
}
.trait-chip--cross-role.trait-chip--active {
  opacity: 1;
  border-style: solid;
}

/* Live spawn-chance pill in the tier header: solid tier color when spawning,
   muted "Locked" outline when the tier is not yet available. */
.tier-header-chance {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #161208;
  background: var(--tier-c, #e8c040);
  padding: 1px 7px;
  border-radius: 4px;
  line-height: 1.5;
}

.tier-header-chance.is-locked {
  color: #b89a5a;
  background: transparent;
  border: 1px solid #5c3310;
}

.cross-role-fade-enter-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.cross-role-fade-leave-active {
  transition: opacity 0.15s ease;
}
.cross-role-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.cross-role-fade-leave-to {
  opacity: 0;
}

.cross-role-only-state {
  padding: 16px 8px 4px;
  text-align: center;
}

/* role filter chips — larger variant of the shared trait-chip style */
.trait-chip.role-chip {
  padding: 6px 14px;
  font-size: 12.5px;
  letter-spacing: 0.06em;
}
.role-chip-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
  flex-shrink: 0;
}
.role-chip .role-chip-img {
  width: 18px;
  height: 18px;
}

/* filter chip without purchasable champions — visible but locked */
.trait-chip--disabled {
  opacity: 0.35;
  filter: grayscale(60%);
  cursor: not-allowed;
}
.trait-chip--disabled:hover {
  opacity: 0.35;
}

</style>
