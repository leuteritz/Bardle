<template>
  <div class="rpg-frame flex flex-col h-full">
    <!-- ── Header: Search + Role Filter ── -->
    <div class="rpg-header cs-header">
      <div class="cs-search-row">
        <div class="rpg-search-wrap">
          <Icon icon="game-icons:magnifying-glass" width="14" height="14" class="rpg-search-icon" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search champion or trait..."
            class="rpg-search w-full pl-9 pr-9 py-2.5"
            :aria-expanded="filterOpen"
            aria-label="Search champions and traits"
            @blur="onSearchBlur"
            @focus="onSearchFocus"
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
            'filter-toggle-btn--open': filterOpen,
            'filter-toggle-btn--active': hasActiveFilter,
          }"
          :title="filterOpen ? 'Hide filters' : 'Show filters'"
          aria-label="Toggle filters"
          @click="filterOpen = !filterOpen"
        >
          <Icon icon="game-icons:toggles" width="16" height="16" />
          <span class="filter-toggle-label">Filter</span>
          <span class="filter-toggle-chevron">{{ filterOpen ? '▾' : '▴' }}</span>
          <span v-if="hasActiveFilter && !filterOpen" class="filter-active-dot"></span>
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

        <button v-if="showClose" class="modal-close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- ── Active filter summary: always visible while filters are set ── -->
      <div v-if="hasActiveFilter" class="cs-active-filters">
        <button class="trait-chip trait-chip--clear-all" @click="clearFilters">
          × Clear filters
        </button>
        <span class="filter-sep"></span>
        <span class="cs-active-label">Active:</span>
        <button
          v-if="activeRoleDef"
          class="trait-chip trait-chip--active"
          :style="`--chip-color: ${activeRoleDef.color}`"
          title="Remove role filter"
          @click="setActiveRole('all')"
        >
          <img :src="activeRoleDef.image" :alt="activeRoleDef.label" class="role-chip-img" />
          {{ activeRoleDef.short }}
          <span class="chip-dismiss">×</span>
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

      <!-- ── Filter panel: labeled category sections ── -->
      <Transition name="filter-panel">
      <div v-show="filterOpen" class="cs-filter-panel">

        <!-- Section: Role -->
        <div class="filter-divider">
          <span class="filter-divider-label">Role</span>
        </div>
        <div class="cs-filter-row cs-filter-row--wrap">
          <button
            v-for="r in roleChips"
            :key="r.key"
            class="trait-chip role-chip"
            :class="{
              'trait-chip--active': activeRole === r.key,
              'trait-chip--disabled': !r.available,
            }"
            :style="`--chip-color: ${r.color}`"
            :disabled="!r.available"
            :title="r.available ? r.label : 'No champions in shop'"
            @click="setActiveRole(activeRole === r.key ? 'all' : (r.key as any))"
          >
            <img :src="r.image" :alt="r.label" class="role-chip-img" />
            {{ r.short }}
          </button>
        </div>

        <!-- Section: Tier -->
        <div class="filter-divider">
          <span class="filter-divider-label">Tier</span>
        </div>
        <div class="cs-filter-row cs-filter-row--wrap">
          <button
            v-for="t in tierChips"
            :key="t.starLevel"
            class="trait-chip"
            :class="{
              'trait-chip--active': activeTier === t.starLevel,
              'trait-chip--disabled': t.locked || !t.available,
            }"
            :style="`--chip-color: ${t.color}`"
            :disabled="t.locked || !t.available"
            :title="
              t.locked
                ? `Locked — unlocks by Galaxy ${t.requiredGalaxy}`
                : !t.available
                  ? 'No champions in shop'
                  : `★${t.starLevel} ${t.name}`
            "
            @click="activeTier = activeTier === t.starLevel ? 'all' : t.starLevel"
          >
            <Icon :icon="t.icon" class="trait-chip-icon" />
            {{ t.name }}
          </button>
        </div>

        <!-- Row 2: Trait chips (all visible; unavailable ones greyed out) -->
        <div class="filter-divider">
          <span class="filter-divider-label">Traits</span>
        </div>
        <div v-if="noTraitFound" class="trait-empty-state">No trait found</div>
        <div v-else class="cs-filter-row cs-filter-row--wrap">
          <TransitionGroup tag="div" name="chip" class="chip-group">
            <button
              v-for="trait in traitChips"
              :key="trait.id"
              v-show="!hasSearchTraitMatch || searchMatchedTraits.has(trait.id)"
              class="trait-chip"
              :class="{
                'trait-chip--active': activeTraits.includes(trait.id),
                'trait-chip--disabled': !trait.available,
                'trait-chip--search-match': searchMatchedTraits.has(trait.id) && !activeTraits.includes(trait.id),
                'trait-chip--cross-role': activeRole !== 'all' && searchQuery.trim() && !roleTraitIds.has(trait.id),
              }"
              :style="`--chip-color: ${trait.color}`"
              :disabled="!trait.available"
              :title="trait.available ? `${filterChampionCount[trait.id] ?? 0} Champions${activeRole !== 'all' && !roleTraitIds.has(trait.id) ? ' (other roles)' : ''}` : 'No champions in shop'"
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

        <!-- Row 3: Origin chips (all visible; unavailable ones greyed out) -->
        <div class="filter-divider">
          <span class="filter-divider-label">Origins</span>
        </div>
        <div class="cs-filter-row cs-filter-row--wrap">
          <TransitionGroup tag="div" name="chip" class="chip-group">
            <button
              v-for="origin in originChips"
              :key="origin.origin"
              v-show="!hasSearchTraitMatch || searchMatchedTraits.has(origin.origin)"
              class="trait-chip"
              :class="{
                'trait-chip--active': activeTraits.includes(origin.origin),
                'trait-chip--disabled': !origin.available,
                'trait-chip--search-match': searchMatchedTraits.has(origin.origin) && !activeTraits.includes(origin.origin),
                'trait-chip--cross-role': activeRole !== 'all' && searchQuery.trim() && !roleOriginIds.has(origin.origin),
              }"
              :style="`--chip-color: ${origin.color}`"
              :disabled="!origin.available"
              :title="origin.available ? `${filterChampionCount[origin.origin] ?? 0} Champions${activeRole !== 'all' && !roleOriginIds.has(origin.origin) ? ' (other roles)' : ''}` : 'No champions in shop'"
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

      </div>
      </Transition>
    </div>

    <!-- ── Champion Grid ── -->
    <div class="flex-1 min-h-0 overflow-y-auto rpg-scrollbar cs-grid">
      <!-- Empty: current role has no matches but cross-role does -->
      <div
        v-if="filteredChampions.length === 0 && crossRoleChampions.length > 0"
        class="cross-role-only-state"
      >
        <p class="empty-label">Not in this role</p>
      </div>
      <!-- Empty: nothing anywhere -->
      <div
        v-else-if="filteredChampions.length === 0 && crossRoleChampions.length === 0"
        class="flex flex-col items-center justify-center gap-4 py-12"
      >
        <div class="flex items-center justify-center empty-icon-box w-14 h-14">
          <Icon icon="game-icons:magnifying-glass" width="32" height="32" style="color: #7a4e20; opacity: 0.4" />
        </div>
        <p class="empty-label">No champion found.</p>
      </div>

      <div v-else class="tier-groups">
        <!-- Tier section: header (click to collapse) + its own grid -->
        <div v-for="group in tierGroups" :key="group.tier" class="tier-group">
          <!-- Tier section: collapsible header (click to toggle) + its grid -->
          <div
            class="tier-header"
            :class="{ 'is-collapsed': isTierCollapsed(group.tier), 'is-galaxy-locked': group.isGalaxyLocked, 'is-active-tier': group.isActive }"
            :style="{ '--tier-c': group.color }"
            role="button"
            :tabindex="group.isGalaxyLocked ? -1 : 0"
            :aria-expanded="group.isGalaxyLocked ? false : !isTierCollapsed(group.tier)"
            :aria-disabled="group.isGalaxyLocked"
            :title="group.isGalaxyLocked ? `Unlocked in Galaxy ${group.requiredGalaxy}` : ''"
            @click="toggleTier(group.tier)"
            @keydown.enter.prevent="toggleTier(group.tier)"
            @keydown.space.prevent="toggleTier(group.tier)"
          >
            <Icon
              v-if="group.isGalaxyLocked"
              icon="game-icons:padlock"
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
              :title="
                group.spawnPercent == null
                  ? 'Tier locked — does not spawn yet'
                  : `This tier's current spawn chance`
              "
            >
              {{ group.spawnPercent != null ? group.spawnPercent + '%' : 'Locked' }}
            </span>
            <span class="tier-header-line"></span>
            <span v-if="group.isGalaxyLocked" class="tier-header-req">
              <Icon icon="game-icons:padlock" class="tier-req-icon" width="16" height="16" />
              Galaxy {{ group.requiredGalaxy }}
            </span>
            <span v-else class="tier-header-counter">
              <span class="tier-header-count">{{ tierOwned(group.tier) }}/{{ tierTotal(group.tier) }}</span>
            </span>
          </div>
          <Transition @enter="onTierEnter" @after-enter="onTierAfterEnter" @leave="onTierLeave">
            <div v-show="!isTierCollapsed(group.tier)" class="tier-body-inner">
              <div v-if="group.champions.length" class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
              <!-- Grid slot: fixed height, holds layout space -->
              <div
                v-for="(champion, index) in group.champions"
                :key="champion.name"
                class="champion-card-slot"
                :class="[getCardClass(champion.name), { 'card-expanded': hoveredChampion === champion.name, 'is-last-row': isLastRow(index, group.champions.length), 'is-first-row': isFirstRow(index) }]"
                :data-role="CHAMPION_ROLES[champion.name]"
                @click="handleBuy(champion.name)"
                @mouseenter="onCardHoverAndDismiss(champion.name)"
                @mouseleave="onCardLeave"
              >
          <!-- Visual card: expands absolutely out of grid slot on hover -->
          <div class="card-inner">

            <!-- Tier badge: top-left — Cosmic/Champion Tier (★N) -->
            <div
              v-if="!isOwned(champion.name)"
              class="tier-badge"
              :style="{ '--tier-c': getTierColor(champion.name) }"
              :title="getChampionDetail(champion.name).cosmic.name"
            >
              {{ getChampionTierLabel(champion.name) }}
            </div>

            <!-- Image layer: clipped to card-inner bounds -->
            <div class="card-img-layer">
              <img
                :src="battleStore.getChampionImage(champion.name)"
                :alt="champion.name"
                loading="lazy"
                decoding="async"
                class="absolute inset-0 object-cover object-top w-full h-full rpg-img card-img-scale"
                :class="isLocked(champion.name) ? 'grayscale' : ''"
              />

              <img
                v-if="isLocked(champion.name)"
                src="/img/lock.png"
                alt="Locked"
                class="lock-overlay"
              />

              <div
                class="absolute inset-0 card-overlay"
                :class="
                  isUnlocked(champion.name) && canAffordChampion(champion.name)
                    ? 'card-overlay--buyable'
                    : 'card-overlay--default'
                "
              />

              <div
                v-if="
                  isUnlocked(champion.name) &&
                  !isOwned(champion.name) &&
                  canAffordChampion(champion.name)
                "
                class="absolute inset-0 pointer-events-none card-shimmer card-shimmer-anim"
              />
            </div>

            <!-- Content: always anchored to bottom of card-inner -->
            <div class="card-content">
              <div class="flex flex-col">
                <!-- 1. Name — always visible -->
                <span
                  class="text-sm font-black leading-tight tracking-wide champion-name"
                  :class="
                    isOwned(champion.name) || isLocked(champion.name)
                      ? 'champion-name--dim'
                      : 'champion-name--bright'
                  "
                >
                  {{ truncate(champion.name, 12) }}
                </span>

                <!-- 2. Trait/origin badges — revealed on expand, zero space when collapsed -->
                <div class="card-traits-section">
                  <div
                    v-for="trait in getChampionDetail(champion.name).traits"
                    :key="trait.id"
                    class="card-trait-badge"
                    :style="{ '--tc': trait.color }"
                  >
                    <Icon :icon="trait.icon" class="card-trait-icon" />
                    <span>{{ trait.name }}</span>
                  </div>
                  <div
                    v-if="getChampionDetail(champion.name).origin"
                    class="card-trait-badge"
                    :style="{ '--tc': getChampionDetail(champion.name).origin!.color }"
                  >
                    <Icon
                      :icon="getChampionDetail(champion.name).origin!.icon"
                      class="card-trait-icon"
                    />
                    <span>{{ getChampionDetail(champion.name).origin!.origin }}</span>
                  </div>
                </div>

                <!-- 3. Costs + Button -->
                <div class="card-bottom-section">
                  <div
                    v-if="isUnlocked(champion.name) && !isOwned(champion.name)"
                    class="flex flex-wrap gap-1"
                  >
                    <span
                      v-for="(qty, matId) in getMaterialCost(champion.name)"
                      :key="matId"
                      class="cost-badge"
                      :class="
                        hasEnoughMaterial(String(matId), qty as number)
                          ? 'cost-badge--ok'
                          : 'cost-badge--missing'
                      "
                    >
                      <img
                        :src="getMaterialImage(String(matId))"
                        :alt="getMaterialName(String(matId))"
                        class="rpg-img inline-block w-3.5 h-3.5 object-contain align-middle"
                      />
                      {{ formatNumber(inventoryStore.collectedMaterials[String(matId)] ?? 0) }}/{{
                        formatNumber(qty as number)
                      }}
                    </span>
                    <span
                      class="cost-badge chimes-cost-badge"
                      :class="canAffordChimes(champion.name) ? 'cost-badge--ok' : 'cost-badge--missing'"
                      :title="canAffordChimes(champion.name) ? '' : 'Not enough Chimes'"
                    >
                      <img src="/img/BardAbilities/BardChime.png" alt="Chimes" class="rpg-img inline-block w-4 h-4 object-contain align-middle" />
                      {{ formatNumber(gameStore.chimes) }}/{{ formatNumber(getChimesPrice(champion.name)) }}
                    </span>
                  </div>

                </div>
              </div>
            </div>

            <!-- Locked Tooltip -->
            <div v-if="isLocked(champion.name)" class="locked-tooltip">
              {{ getLockedTooltip(champion.name) }}
            </div>

          </div>

          <!-- New champion badge (outside card-inner so it's not clipped) -->
          <Transition name="champion-badge-fade">
            <RpgNotifyBadge
              v-if="isNew(champion.name)"
              :count="1"
              variant="shop"
              label="New champion"
            />
          </Transition>
            </div>
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
          <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            <div
              v-for="champion in crossRoleChampions"
              :key="'cross-' + champion.name"
              class="champion-card-slot cross-role-card"
              :class="[getCardClass(champion.name), { 'card-expanded': hoveredChampion === champion.name }]"
              :data-role="CHAMPION_ROLES[champion.name]"
              @click="handleBuy(champion.name)"
              @mouseenter="onCardHoverAndDismiss(champion.name)"
              @mouseleave="onCardLeave"
            >
              <div class="card-inner">
                <!-- Role badge pill — inside card-inner so it tracks the expanding card edge -->
                <div
                  class="role-badge-pill"
                  :style="{ background: ROLE_BADGE[CHAMPION_ROLES[champion.name] as keyof typeof ROLE_BADGE]?.color }"
                >
                  {{ ROLE_BADGE[CHAMPION_ROLES[champion.name] as keyof typeof ROLE_BADGE]?.label }}
                </div>
                <!-- Tier badge: top-left — Cosmic/Champion Tier (★N) -->
                <div
                  v-if="!isOwned(champion.name)"
                  class="tier-badge"
                  :style="{ '--tier-c': getTierColor(champion.name) }"
                  :title="getChampionDetail(champion.name).cosmic.name"
                >
                  {{ getChampionTierLabel(champion.name) }}
                </div>
                <div class="card-img-layer">
                  <img
                    :src="battleStore.getChampionImage(champion.name)"
                    :alt="champion.name"
                    loading="lazy"
                    decoding="async"
                    class="absolute inset-0 object-cover object-top w-full h-full rpg-img card-img-scale"
                    :class="isLocked(champion.name) ? 'grayscale' : ''"
                  />
                  <img
                    v-if="isLocked(champion.name)"
                    src="/img/lock.png"
                    alt="Locked"
                    class="lock-overlay"
                  />
                  <div
                    class="absolute inset-0 card-overlay"
                    :class="
                      isUnlocked(champion.name) && canAffordChampion(champion.name)
                        ? 'card-overlay--buyable'
                        : 'card-overlay--default'
                    "
                  />
                  <div
                    v-if="isUnlocked(champion.name) && !isOwned(champion.name) && canAffordChampion(champion.name)"
                    class="absolute inset-0 pointer-events-none card-shimmer card-shimmer-anim"
                  />
                </div>

                <div class="card-content">
                  <div class="flex flex-col">
                    <span
                      class="text-sm font-black leading-tight tracking-wide champion-name"
                      :class="
                        isOwned(champion.name) || isLocked(champion.name)
                          ? 'champion-name--dim'
                          : 'champion-name--bright'
                      "
                    >
                      {{ truncate(champion.name, 12) }}
                    </span>

                    <div class="card-traits-section">
                      <div
                        v-for="trait in getChampionDetail(champion.name).traits"
                        :key="trait.id"
                        class="card-trait-badge"
                        :style="{ '--tc': trait.color }"
                      >
                        <Icon :icon="trait.icon" class="card-trait-icon" />
                        <span>{{ trait.name }}</span>
                      </div>
                      <div
                        v-if="getChampionDetail(champion.name).origin"
                        class="card-trait-badge"
                        :style="{ '--tc': getChampionDetail(champion.name).origin!.color }"
                      >
                        <Icon
                          :icon="getChampionDetail(champion.name).origin!.icon"
                          class="card-trait-icon"
                        />
                        <span>{{ getChampionDetail(champion.name).origin!.origin }}</span>
                      </div>
                    </div>

                    <div class="card-bottom-section">
                      <div
                        v-if="isUnlocked(champion.name) && !isOwned(champion.name)"
                        class="flex flex-wrap gap-1"
                      >
                        <span
                          v-for="(qty, matId) in getMaterialCost(champion.name)"
                          :key="matId"
                          class="cost-badge"
                          :class="
                            hasEnoughMaterial(String(matId), qty as number)
                              ? 'cost-badge--ok'
                              : 'cost-badge--missing'
                          "
                        >
                          <img
                            :src="getMaterialImage(String(matId))"
                            :alt="getMaterialName(String(matId))"
                            class="rpg-img inline-block w-3.5 h-3.5 object-contain align-middle"
                          />
                          {{ formatNumber(inventoryStore.collectedMaterials[String(matId)] ?? 0) }}/{{
                            formatNumber(qty as number)
                          }}
                        </span>
                        <span
                          class="cost-badge chimes-cost-badge"
                          :class="canAffordChimes(champion.name) ? 'cost-badge--ok' : 'cost-badge--missing'"
                          :title="canAffordChimes(champion.name) ? '' : 'Not enough Chimes'"
                        >
                          <img src="/img/BardAbilities/BardChime.png" alt="Chimes" class="rpg-img inline-block w-4 h-4 object-contain align-middle" />
                          {{ formatNumber(gameStore.chimes) }}/{{ formatNumber(getChimesPrice(champion.name)) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="isLocked(champion.name)" class="locked-tooltip">
                  {{ getLockedTooltip(champion.name) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onUnmounted, defineComponent, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '../../../stores/battleStore'
import { useInventoryStore } from '../../../stores/inventoryStore'
import { useGameStore } from '../../../stores/gameStore'
import { useUiStore } from '../../../stores/uiStore'
import RpgNotifyBadge from '../../ui/RpgNotifyBadge.vue'
import { truncate, formatNumber } from '../../../config/numberFormat'
import { getChampionRoles, CHAMPION_ROLES } from '../../../config/championRoles'
import { CHAMPION_TRAITS, TRAIT_DEFINITIONS } from '../../../config/championTraits'
import { ORIGIN_SYNERGIES, getChampionOrigin } from '../../../config/championOrigins'
import { getChampionTier, getChampionStarLevel, getChampionChimesPrice, requiredGalaxyForTier, isChampionTierUnlocked, championTierSpawnPercent, CHAMPION_TIERS_BY_STAR } from '../../../config/championTiers'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { MATERIALS } from '../../../config/materials'
import { getHomePlanetConfig } from '../../../config/championHomePlanets'
import { PLANET_TYPE_NAMES, CHIMES_COST_ICON, ROLES } from '../../../config/constants'
import { getChampionNames } from '../../../config/championData'
import { useActionToast } from '../../../composables/useActionToast'
import type { ChampionRole } from '../../../types'


export default defineComponent({
  name: 'ChampionShopComponent',
  components: { Icon, RpgNotifyBadge },
  props: {
    initialRole: { type: String, default: 'all' },
    showClose: { type: Boolean, default: false },
  },
  emits: ['roleChange', 'close'],
  setup(props, { emit }) {
    const championNames = ref<string[]>(getChampionNames())
    const battleStore = useBattleStore()
    const inventoryStore = useInventoryStore()
    const gameStore = useGameStore()
    const uiStore = useUiStore()
    const galaxyStore = useGalaxyStore()
    const { showToast } = useActionToast()
    const activeRole = ref<ChampionRole | 'all'>(props.initialRole as ChampionRole | 'all')
    const searchQuery = ref('')
    const activeTraits = ref<string[]>([])
    // Active cosmic-tier filter chip — 'all' or a star level (1..MAX_STAR_LEVEL).
    const activeTier = ref<'all' | number>('all')
    const filterOpen = ref(false)
    const searchInputRef = ref<HTMLInputElement | null>(null)
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

    watch(
      () => uiStore.pendingChampionSearch,
      (name) => {
        if (name) {
          searchQuery.value = name
          uiStore.clearPendingChampionSearch()
        }
      },
      { immediate: true },
    )

    watch(
      () => props.initialRole,
      (val) => {
        activeRole.value = val as ChampionRole | 'all'
      },
    )

    watch(activeRole, () => {
      if (activeTraits.value.length === 0) return
      const filtered = activeTraits.value.filter(
        (t) => poolTraitIds.value.has(t) || poolOriginIds.value.has(t),
      )
      if (filtered.length !== activeTraits.value.length) activeTraits.value = filtered
    })

    function setActiveRole(role: ChampionRole | 'all') {
      activeRole.value = role
      emit('roleChange', role)
    }

    function toggleTrait(id: string) {
      activeTraits.value = activeTraits.value.includes(id)
        ? activeTraits.value.filter((t) => t !== id)
        : [...activeTraits.value, id]
    }

    function clearTraits() {
      activeTraits.value = []
    }

    /** Clears role + tier + trait filters but keeps the search text. */
    function clearFilters() {
      activeTraits.value = []
      activeTier.value = 'all'
      setActiveRole('all')
    }

    function resetSearch() {
      searchQuery.value = ''
      activeTraits.value = []
      activeTier.value = 'all'
      setActiveRole('all')
    }

    let blurTimer: ReturnType<typeof setTimeout> | null = null
    function onSearchBlur() {
      blurTimer = setTimeout(() => {
        if (!searchQuery.value.trim() && activeTraits.value.length === 0) {
          filterOpen.value = false
        }
      }, 200)
    }
    function onSearchFocus() {
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = null }
    }

    function onChipKeydown(event: KeyboardEvent, traitId: string) {
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
      } else if (event.key === 'Escape') {
        event.preventDefault()
        filterOpen.value = false
        searchInputRef.value?.focus()
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleTrait(traitId)
      }
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

    function getMaterialCost(name: string): Record<string, number> {
      return recruitableByName.value.get(name)?.materialCost ?? {}
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

    function getChampionTierLabel(name: string): string {
      return `★${getChampionStarLevel(name)}`
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

    function handleBuy(name: string) {
      if (!canClickBuy(name)) return
      battleStore.recruitChampion(name)
      showToast(`${name} recruited!`)
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

    function getCardClass(name: string): string {
      if (isOwned(name)) return 'card-owned'
      if (isUnlocked(name) && canAffordChampion(name)) return 'card-buyable'
      if (isUnlocked(name)) return 'card-unlocked'
      return 'card-locked'
    }

const shopChampionNames = computed(() =>
      battleStore.recruitableChampions.map((r) => r.name)
    )

    // Role-only pool (no search expansion) — used for cross-role chip detection and watch validation
    const roleChampionNames = computed(() =>
      activeRole.value === 'all'
        ? shopChampionNames.value
        : shopChampionNames.value.filter((name) => CHAMPION_ROLES[name] === activeRole.value),
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
        available: shopChampionNames.value.some((name) => CHAMPION_ROLES[name] === r.key),
      })),
    )

    // When search matches a trait/origin globally, expand chip pool to all roles
    const chipPool = computed(() => {
      if (activeRole.value !== 'all' && searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim()
        const anyTraitMatch = TRAIT_DEFINITIONS.some((t) => t.name.toLowerCase().includes(q))
        const anyOriginMatch = Object.keys(ORIGIN_SYNERGIES).some((o) => o.toLowerCase().includes(q))
        if (anyTraitMatch || anyOriginMatch) return shopChampionNames.value
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

    // Which trait/origin IDs belong to the current role (not cross-role)
    const roleTraitIds = computed(() => {
      const seen = new Set<string>()
      for (const name of roleChampionNames.value) {
        for (const tid of (CHAMPION_TRAITS[name] ?? [])) seen.add(tid)
      }
      return seen
    })

    const roleOriginIds = computed(() => {
      const seen = new Set<string>()
      for (const name of roleChampionNames.value) {
        const o = getChampionOrigin(name)
        if (o && ORIGIN_SYNERGIES[o]) seen.add(o)
      }
      return seen
    })

    watch(shopChampionNames, () => {
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

    watch(searchQuery, (q) => {
      if (q.trim()) {
        filterOpen.value = true
      } else if (activeTraits.value.length === 0) {
        filterOpen.value = false
      }
    })

    const filteredChampions = computed(() => {
      return championNames.value
        .map((name) => ({ name }))
        .filter((c) => {
          if (isOwned(c.name)) return false
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
      const tiers = searchOrFilterActive.value
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

    // ── Collapsible tier sections (collapsed by default) ──
    const ALL_TIER_KEYS = CHAMPION_TIERS_BY_STAR.map((t) => t.starLevel)
    const collapsedTiers = ref(new Set<number>(ALL_TIER_KEYS))
    // While searching/filtering, force every tier open so matches are never hidden.
    const searchOrFilterActive = computed(
      () => searchQuery.value.trim() !== '' || hasActiveFilter.value,
    )
    function isTierCollapsed(tier: number): boolean {
      // Galaxy-locked tiers never expand, regardless of search/collapse state.
      if (isTierGalaxyLocked(tier)) return true
      return searchOrFilterActive.value ? false : collapsedTiers.value.has(tier)
    }
    function toggleTier(tier: number) {
      if (isTierGalaxyLocked(tier)) return
      const next = new Set(collapsedTiers.value)
      if (next.has(tier)) next.delete(tier)
      else next.add(tier)
      collapsedTiers.value = next
    }
    // Collapse-all only governs the tiers the player can actually open.
    const allTiersCollapsed = computed(() => {
      if (searchOrFilterActive.value) return false
      const unlocked = tierGroups.value.filter((g) => !g.isGalaxyLocked)
      return unlocked.length > 0 && unlocked.every((g) => collapsedTiers.value.has(g.tier))
    })
    function toggleAllTiers() {
      const unlockedKeys = tierGroups.value.filter((g) => !g.isGalaxyLocked).map((g) => g.tier)
      const next = new Set(collapsedTiers.value)
      if (allTiersCollapsed.value) for (const k of unlockedKeys) next.delete(k)
      else for (const k of unlockedKeys) next.add(k)
      collapsedTiers.value = next
    }

    // Tier expand/collapse animation — animate height 0 ↔ scrollHeight, then clear
    // inline styles so an open tier is overflow:visible (hover-expanded cards spill out).
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

    // Auto-open the tier of any freshly-unlocked (recruitable) champion so the new
    // champion is visible among its tier — mirrors the "New champion" badge set.
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
      { immediate: true, deep: true },
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
    const noTraitFound = computed(
      () => searchQuery.value.trim() !== '' && !hasSearchTraitMatch.value,
    )
    const hasActiveFilter = computed(
      () =>
        activeTraits.value.length > 0 || activeTier.value !== 'all' || activeRole.value !== 'all',
    )

    // ── Active filter summary chips (shown even with the panel collapsed) ──
    const activeRoleDef = computed(() =>
      activeRole.value === 'all' ? null : (ROLES.find((r) => r.key === activeRole.value) ?? null),
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

    const unlockedCount = computed(() => {
      return battleStore.recruitableChampions.length
    })

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
      }, 75)
    }

    // ── Window width for last-row detection ──
    const windowWidth = ref(window.innerWidth)
    function onWindowResize() { windowWidth.value = window.innerWidth }

    const colCount = computed(() => {
      if (windowWidth.value >= 768) return 4
      if (windowWidth.value >= 640) return 3
      return 2
    })

    // Row detection per tier group: drives the hover-expand up/down direction
    // so first-row cards expand downward and last-row cards expand upward.
    function isFirstRow(i: number): boolean {
      return i < colCount.value
    }
    function isLastRow(i: number, len: number): boolean {
      const cols = colCount.value
      return i >= Math.floor((len - 1) / cols) * cols
    }

    // ── Card expand state ──
    const hoveredChampion = ref<string | null>(null)

    function getChampionDetail(name: string) {
      const traitIds = CHAMPION_TRAITS[name] ?? []
      const traits = TRAIT_DEFINITIONS.filter((t) => (traitIds as string[]).includes(t.id))
      const originKey = getChampionOrigin(name)
      const origin = originKey ? ORIGIN_SYNERGIES[originKey] ?? null : null
      const cosmic = getChampionTier(name)
      const starLevel = getChampionStarLevel(name)
      return { traits, origin, cosmic, starLevel }
    }

    function onCardHoverAndDismiss(name: string) {
      dismissNewOnHover(name)
      hoveredChampion.value = name
    }

    function onCardLeave() {
      hoveredChampion.value = null
    }

    onMounted(() => {
      window.addEventListener('resize', onWindowResize)
    })
    onUnmounted(() => window.removeEventListener('resize', onWindowResize))

    return {
      filteredChampions,
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
      isFirstRow,
      isLastRow,
      traitChips,
      originChips,
      filterChampionCount,
      roleTraitIds,
      roleOriginIds,
      searchMatchedTraits,
      hasSearchTraitMatch,
      noTraitFound,
      filterOpen,
      hasActiveFilter,
      activeRoleDef,
      activeTierDef,
      activeTraitChips,
      unlockedCount,
      battleStore,
      inventoryStore,
      gameStore,
      truncate,
      CHAMPION_ROLES,
      roleChips,
      getChampionRoles,
      activeRole,
      searchQuery,
      activeTraits,
      activeTier,
      tierChips,
      isOwned,
      isUnlocked,
      isLocked,
      getMaterialCost,
      getChimesPrice,
      getTierColor,
      getChampionTierLabel,
      canAffordChimes,
      canAffordChampion,
      canClickBuy,
      handleBuy,
      hasEnoughMaterial,
      getMaterialName,
      getMaterialImage,
      formatNumber,
      getLockedTooltip,
      getCardClass,
      setActiveRole,
      resetSearch,
      toggleTrait,
      clearTraits,
      clearFilters,
      onSearchBlur,
      onSearchFocus,
      onChipKeydown,
      searchInputRef,
      isNew,
      hoveredChampion,
      getChampionDetail,
      onCardHoverAndDismiss,
      onCardLeave,
      crossRoleChampions,
      ROLE_BADGE,
      CHIMES_COST_ICON,
    }
  },
})
</script>

<style scoped>
/* modal-panel already frames — suppress rpg-frame double border */
.rpg-frame {
  border: none;
  box-shadow: none;
  --text-transition-dur: 0.22s;
}
.rpg-header {
  border-bottom-width: 1px;
  border-bottom-color: rgba(92, 51, 16, 0.5);
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

/* ══ Grid slot — invisible, holds layout space only ══ */
.champion-card-slot {
  height: 140px;
  position: relative;
  z-index: 1;
}
.champion-card-slot.card-expanded {
  z-index: 20;
}

/* Card state: pointer-events / opacity / filter on the slot */
.card-owned {
  opacity: 0.55;
  filter: grayscale(30%);
  cursor: default;
  pointer-events: none;
}
.card-buyable { cursor: pointer; }
.card-unlocked {
  opacity: 0.7;
  cursor: default;
  transition: opacity 0.2s ease;
}
.card-unlocked:hover {
  opacity: 1;
}
.card-locked {
  opacity: 0.4;
  filter: grayscale(55%);
  cursor: not-allowed;
  pointer-events: none;
}

/* ══ Visual card — expands absolutely out of the grid slot ══ */
.card-inner {
  position: absolute;
  inset: 0;
  border-radius: var(--bp-radius);
  border: 1px solid var(--rpg-wood-mid);
  overflow: hidden;
  transition:
    bottom 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    top 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    left 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    right 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}
/* ── Role-specific card borders ── */
.champion-card-slot[data-role="top"]     { --role-c: #e05050; --role-c-hi: #f07070; }
.champion-card-slot[data-role="jungle"]  { --role-c: #50c060; --role-c-hi: #70d880; }
.champion-card-slot[data-role="mid"]     { --role-c: #5090e8; --role-c-hi: #70a8f8; }
.champion-card-slot[data-role="adc"]     { --role-c: #e89840; --role-c-hi: #f0b060; }
.champion-card-slot[data-role="support"] { --role-c: #b8c8d8; --role-c-hi: #d0dde8; }

.champion-card-slot[data-role] .card-inner {
  border-color: var(--role-c);
}

/* Role hover glow — excluded on buyable/owned so state styles always dominate */
.champion-card-slot[data-role="top"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #f07070;
  box-shadow: inset 0 0 0 1px rgba(224,80,80,0.25), 0 0 14px rgba(224,80,80,0.35);
}
.champion-card-slot[data-role="jungle"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #70d880;
  box-shadow: inset 0 0 0 1px rgba(80,192,96,0.25), 0 0 14px rgba(80,192,96,0.40);
}
.champion-card-slot[data-role="mid"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #70a8f8;
  box-shadow: inset 0 0 0 1px rgba(80,144,232,0.30), 0 0 16px rgba(80,144,232,0.45);
}
.champion-card-slot[data-role="adc"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #f0b060;
  box-shadow: inset 0 0 0 1px rgba(232,152,64,0.25), 0 0 16px rgba(232,152,64,0.40);
}
.champion-card-slot[data-role="support"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #d0dde8;
  box-shadow: inset 0 0 0 1px rgba(184,200,216,0.30), 0 0 16px rgba(184,200,216,0.35);
}

/* Buyable pulse — role inset glow complements the gold buyable border.
   Shadows are static on pseudo-elements; only opacity animates (compositor-only,
   no per-frame repaints — animating box-shadow directly caused scroll jank). */
.card-buyable.champion-card-slot:not(.card-expanded)::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--bp-radius);
  pointer-events: none;
  box-shadow: 0 0 26px rgba(232, 192, 64, 0.12);
  animation: card-glow-pulse 2.5s ease-in-out infinite;
}
.card-buyable.champion-card-slot:not(.card-expanded) .card-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--role-c, #e8c040) 35%, transparent);
  animation: card-ring-pulse 2.5s ease-in-out infinite;
}
@keyframes card-glow-pulse {
  0%, 100% { opacity: 0; }
  50%      { opacity: 1; }
}
@keyframes card-ring-pulse {
  0%, 100% { opacity: 0.43; }
  50%      { opacity: 1; }
}

.card-buyable .card-inner {
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 20px rgba(232, 192, 64, 0.12);
}
.card-buyable.card-expanded .card-inner {
  border-color: #e8c040;
  box-shadow:
    0 0 38px rgba(232, 192, 64, 0.55),
    0 0 70px rgba(200, 144, 64, 0.25),
    inset 0 0 0 2px rgba(232, 192, 64, 0.58),
    0 20px 50px rgba(0, 0, 0, 0.95);
}
.card-expanded .card-inner {
  bottom: -100px;
  left: -50px;
  right: -50px;
  border-color: #c89040;
  box-shadow:
    inset 0 0 0 1px #5c3310,
    0 20px 50px rgba(0, 0, 0, 0.95),
    0 0 30px rgba(200, 144, 64, 0.18);
}

/* ── Edge-column overflow prevention ── */
/* Mobile: 2-col grid */
@media (max-width: 639px) {
  .champion-card-slot:nth-child(2n+1).card-expanded .card-inner { left: 0; right: -100px; }
  .champion-card-slot:nth-child(2n).card-expanded .card-inner   { left: -100px; right: 0; }
}
/* Small: 3-col grid */
@media (min-width: 640px) and (max-width: 767px) {
  .champion-card-slot:nth-child(3n+1).card-expanded .card-inner { left: 0; right: -100px; }
  .champion-card-slot:nth-child(3n).card-expanded .card-inner   { left: -100px; right: 0; }
}
/* Medium+: 4-col grid */
@media (min-width: 768px) {
  .champion-card-slot:nth-child(4n+1).card-expanded .card-inner { left: 0; right: -100px; }
  .champion-card-slot:nth-child(4n).card-expanded .card-inner   { left: -100px; right: 0; }
}

/* Last-row cards expand upward instead of downward */
.is-last-row.card-expanded .card-inner {
  top: -100px;
  bottom: 0;
}
/* First-row cards always expand downward, overriding is-last-row when only one row exists */
.is-first-row.card-expanded .card-inner {
  top: 0;
  bottom: -100px;
}


/* ── Image layer: clipped within card-inner ── */
.card-img-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--bp-radius);
}

/* Image scale on expand via card-expanded parent */
.card-img-scale {
  transition: transform 0.5s ease;
}
.card-expanded .card-img-scale {
  transform: scale(1.04);
}

/* ── Gradient overlays ── */
.card-overlay {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.45) 50%,
    rgba(0, 0, 0, 0.15) 100%
  );
}
.card-overlay--buyable {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.35) 50%,
    transparent 100%
  );
}
.card-overlay--default {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.45) 50%,
    rgba(0, 0, 0, 0.1) 100%
  );
}

/* ── Shimmer ── */
.card-shimmer {
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.07), transparent);
}
.card-shimmer-anim {
  transform: translateX(-100%);
  transition: transform 0.7s ease;
}
.card-buyable:hover .card-shimmer-anim {
  transform: translateX(100%);
}

/* ── Card content: always anchored to bottom of card-inner ── */
.card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  z-index: 10;
  transition: transform var(--text-transition-dur) ease;
  will-change: transform;
}
.card-expanded .card-content {
  transform: translateY(-2px);
}

/* ── Champion name ── */
.champion-name {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
  transition: transform var(--text-transition-dur) ease, text-shadow var(--text-transition-dur) ease;
  will-change: transform;
}
.champion-name--bright { color: rgba(255, 255, 255, 0.95); }
.champion-name--dim { color: rgba(255, 255, 255, 0.45); }
.card-expanded .champion-name--bright {
  transform: scale(1.08);
  transform-origin: left bottom;
  text-shadow:
    0 2px 8px rgba(0, 0, 0, 0.9),
    0 0 12px rgba(232, 192, 64, 0.25);
}
.card-expanded .champion-name--dim {
  transform: scale(1.06);
  transform-origin: left bottom;
}

/* ── Lock-Icon Overlay ── */
.lock-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  width: 32px;
  height: 32px;
  object-fit: contain;
  z-index: 12;
  opacity: 0.85;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.9));
  pointer-events: none;
}

/* ── Cost badges — identical in resting and expanded states ── */
.cost-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  padding: 0.15rem 0.4rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--bp-radius);
  transition:
    background var(--text-transition-dur) ease,
    border-color var(--text-transition-dur) ease,
    color var(--text-transition-dur) ease;
}
.cost-badge--ok {
  color: #e8c040;
  background: rgba(232, 192, 64, 0.10);
  border-color: rgba(232, 192, 64, 0.45);
}
.cost-badge--missing {
  color: #cc6050;
  background: rgba(204, 96, 80, 0.10);
  border-color: rgba(204, 96, 80, 0.45);
}

/* Chimes cost badge: larger and sky-teal to distinguish from material gold */
.chimes-cost-badge {
  font-size: 0.9rem;
  padding: 0.2rem 0.5rem;
}
.chimes-cost-badge.cost-badge--ok {
  color: #5cc8e8;
  background: rgba(92, 200, 232, 0.10);
  border-color: rgba(92, 200, 232, 0.35);
}
.chimes-cost-badge.cost-badge--missing {
  color: #cc6050;
  background: rgba(204, 96, 80, 0.10);
  border-color: rgba(204, 96, 80, 0.45);
}


/* ── Locked tooltip ── */
.locked-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.4rem 0.75rem;
  background: var(--rpg-bg-tooltip);
  border: 2px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  font-size: 0.6rem;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
}
.card-inner:hover .locked-tooltip {
  opacity: 1;
}

/* ── Header-Bar ── */
.cs-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  flex-shrink: 0;
}
/* Shared search row + filter toggle + collapsible filter panel + chips live in
   rpg-theme.css (── Champion Filter ──), reused by ChampionSelectPanel. Only the
   shop-specific close-button override and grid padding remain scoped here. */
.cs-search-row .modal-close-btn {
  position: static;
  flex-shrink: 0;
  transform: none;
}

/* ── Grid area ── */
.cs-grid { padding: 8px 10px; }

.champion-badge-fade-leave-active {
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.champion-badge-fade-leave-to { opacity: 0; }

/* ══ Trait/origin badges ══ */
.card-traits-section {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  margin: 0;
  transition: max-height 0.3s ease, opacity 0.22s ease, margin 0.3s ease;
}
.card-expanded .card-traits-section {
  max-height: 120px;
  opacity: 1;
  margin: 4px 0 2px;
}
.card-bottom-section {
  display: flex;
  flex-direction: column;
}
.card-trait-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px 3px 5px;
  border-radius: var(--bp-radius);
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid var(--tc, #7a4e20);
  font-size: 0.58rem;
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
  border-width: 1px;
}
.card-trait-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.9);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

@media (prefers-reduced-motion: reduce) {
  .card-content,
  .champion-name,
  .cost-badge {
    transition: none !important;
  }
  .card-inner {
    animation: none !important;
    transition: border-color 0.25s ease, box-shadow 0.25s ease !important;
  }
  .champion-card-slot::after,
  .card-inner::after {
    animation: none !important;
  }
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

.role-badge-pill {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 15;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #111008;
  padding: 2px 5px;
  border-radius: 3px;
  line-height: 1.2;
  pointer-events: none;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
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

.tier-badge {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 15;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: var(--tier-c);
  background: rgba(0, 0, 0, 0.78);
  border: 1px solid color-mix(in srgb, var(--tier-c) 70%, #111);
  padding: 2px 6px;
  border-radius: 3px;
  line-height: 1.2;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.7), 0 0 8px color-mix(in srgb, var(--tier-c) 25%, transparent);
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

/* active filter summary bar (below the search row) */
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
</style>
