<template>
  <div class="rpg-frame flex flex-col h-full">
    <!-- ── Header: Search + Role Filter ── -->
    <div class="rpg-header cs-header">
      <div class="cs-search-row">
        <div class="rpg-search-wrap">
          <Icon icon="game-icons:magnifying-glass" width="14" height="14" class="rpg-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Champion oder Trait suchen..."
            class="rpg-search w-full pl-9 pr-4 py-2.5"
          />
        </div>
        <button v-if="showClose" class="modal-close-btn" @click="$emit('close')">✕</button>
      </div>

      <p v-if="loadError" class="text-xs text-center load-error">{{ loadError }}</p>

      <div class="trait-filter-section">
        <div class="trait-filter-header" @click="traitFilterOpen = !traitFilterOpen">
          <span class="trait-filter-title">Filter</span>
          <Icon
            :icon="traitFilterOpen ? 'game-icons:plain-arrow' : 'game-icons:return-arrow'"
            class="trait-chevron"
          />
        </div>
        <div v-if="traitFilterOpen" class="trait-filter-body">
          <button
            v-show="!hasSearchTraitMatch"
            class="trait-chip"
            :class="{ 'trait-chip--active': activeTrait === 'all' }"
            @click="activeTrait = 'all'"
          >ALL</button>

          <div class="filter-group-label">Traits</div>
          <TransitionGroup tag="div" name="chip" class="chip-group">
            <button
              v-for="trait in availableTraits"
              :key="trait.id"
              v-show="!hasSearchTraitMatch || searchMatchedTraits.has(trait.id)"
              class="trait-chip"
              :class="{ 'trait-chip--active': activeTrait === trait.id || searchMatchedTraits.has(trait.id) }"
              :style="`--chip-color: ${trait.color}`"
              @click="activeTrait = trait.id"
            >
              <Icon :icon="trait.icon" class="trait-chip-icon" />
              {{ trait.name }}
            </button>
          </TransitionGroup>

          <template v-if="availableOrigins.length">
            <div class="filter-group-label">Origin</div>
            <TransitionGroup tag="div" name="chip" class="chip-group">
              <button
                v-for="origin in availableOrigins"
                :key="origin.origin"
                v-show="!hasSearchTraitMatch || searchMatchedTraits.has(origin.origin)"
                class="trait-chip"
                :class="{ 'trait-chip--active': activeTrait === origin.origin || searchMatchedTraits.has(origin.origin) }"
                :style="`--chip-color: ${origin.color}`"
                @click="activeTrait = origin.origin"
              >
                <Icon :icon="origin.icon" class="trait-chip-icon" />
                {{ origin.origin }}
              </button>
            </TransitionGroup>
          </template>

        </div>
      </div>
    </div>

    <!-- ── Champion Grid ── -->
    <div class="flex-1 min-h-0 overflow-y-auto rpg-scrollbar cs-grid">
      <div
        v-if="filteredChampions.length === 0"
        class="flex flex-col items-center justify-center gap-4 py-12"
      >
        <div class="flex items-center justify-center empty-icon-box w-14 h-14">
          <Icon icon="game-icons:magnifying-glass" width="32" height="32" style="color: #7a4e20; opacity: 0.4" />
        </div>
        <p class="empty-label">No champion found.</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        <!-- Grid slot: fixed height, holds layout space -->
        <div
          v-for="(champion, index) in filteredChampions"
          :key="champion.name"
          class="champion-card-slot"
          :class="[getCardClass(champion.name), { 'card-expanded': hoveredChampion === champion.name, 'is-last-row': lastRowIndices.has(index) }]"
          :data-role="CHAMPION_ROLES[champion.name]"
          @click="handleBuy(champion.name)"
          @mouseenter="onCardHoverAndDismiss(champion.name)"
          @mouseleave="onCardLeave"
        >
          <!-- Visual card: expands absolutely out of grid slot on hover -->
          <div class="card-inner">

            <!-- Image layer: clipped to card-inner bounds -->
            <div class="card-img-layer">
              <img
                :src="battleStore.getChampionImage(champion.name)"
                :alt="champion.name"
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
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onUnmounted, defineComponent, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '../../../stores/battleStore'
import { useInventoryStore } from '../../../stores/inventoryStore'
import { useUiStore } from '../../../stores/uiStore'
import RpgNotifyBadge from '../../ui/RpgNotifyBadge.vue'
import { truncate, formatNumber } from '../../../config/numberFormat'
import { fetchChampionNames } from '../../../utils/champions'
import { getChampionRoles, CHAMPION_ROLES } from '../../../config/championRoles'
import { CHAMPION_TRAITS, TRAIT_DEFINITIONS } from '../../../config/championTraits'
import { ORIGIN_SYNERGIES, getChampionOrigin } from '../../../config/championOrigins'
import { MATERIALS } from '../../../config/materials'
import { getHomePlanetConfig } from '../../../config/championHomePlanets'
import { PLANET_TYPE_NAMES } from '../../../config/constants'
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
    const championNames = ref<string[]>([])
    const battleStore = useBattleStore()
    const inventoryStore = useInventoryStore()
    const uiStore = useUiStore()
    const { showToast } = useActionToast()
    const loadError = ref<string | null>(null)
    const activeRole = ref<ChampionRole | 'all'>(props.initialRole as ChampionRole | 'all')
    const searchQuery = ref('')
    const activeTrait = ref<string>('all')
    const traitFilterOpen = ref(false)

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
      if (activeTrait.value === 'all') return
      const traitIds = new Set<string>(availableTraits.value.map((t) => t.id))
      const originIds = new Set<string>(availableOrigins.value.map((o) => o.origin))
      if (!traitIds.has(activeTrait.value) && !originIds.has(activeTrait.value)) {
        activeTrait.value = 'all'
      }
    })

    function setActiveRole(role: ChampionRole | 'all') {
      activeRole.value = role
      emit('roleChange', role)
    }

    async function loadChampions() {
      try {
        championNames.value = await fetchChampionNames()
      } catch {
        loadError.value = 'Champions konnten nicht geladen werden.'
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

    function getMaterialCost(name: string): Record<string, number> {
      const recruit = battleStore.recruitableChampions.find((r) => r.name === name)
      return recruit?.materialCost ?? {}
    }

    function canAffordChampion(name: string): boolean {
      const cost = getMaterialCost(name)
      return Object.keys(cost).length > 0 && inventoryStore.hasMaterials(cost)
    }

    function canClickBuy(name: string): boolean {
      return isUnlocked(name) && !isOwned(name) && canAffordChampion(name)
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
      if (!config) return 'Planet retten, um freizuschalten.'
      const planetName = PLANET_TYPE_NAMES[config.planetType] ?? config.planetType
      return `Rette einen ${planetName}, um diesen Champion freizuschalten.`
    }

    function getCardClass(name: string): string {
      if (isOwned(name)) return 'card-owned'
      if (isUnlocked(name) && canAffordChampion(name)) return 'card-buyable'
      if (isUnlocked(name)) return 'card-unlocked'
      return 'card-locked'
    }

const availableTraits = computed(() => {
      const relevant = activeRole.value === 'all'
        ? championNames.value
        : championNames.value.filter((name) => CHAMPION_ROLES[name] === activeRole.value)
      const seen = new Set<string>()
      for (const name of relevant) {
        for (const tid of (CHAMPION_TRAITS[name] ?? [])) seen.add(tid)
      }
      return TRAIT_DEFINITIONS.filter((t) => seen.has(t.id))
    })

    const availableOrigins = computed(() => {
      const relevant = activeRole.value === 'all'
        ? championNames.value
        : championNames.value.filter((name) => CHAMPION_ROLES[name] === activeRole.value)
      const seen = new Set<string>()
      for (const name of relevant) {
        const o = getChampionOrigin(name)
        if (o && ORIGIN_SYNERGIES[o]) seen.add(o)
      }
      return (Object.values(ORIGIN_SYNERGIES) as Array<{ origin: string; name: string; icon: string; color: string }>)
        .filter((o) => seen.has(o.origin))
        .sort((a, b) => a.origin.localeCompare(b.origin))
    })

    const filteredChampions = computed(() => {
      return championNames.value
        .map((name) => ({ name }))
        .filter((c) => {
          if (isOwned(c.name)) return false
          if (activeRole.value !== 'all' && !getChampionRoles(c.name).includes(activeRole.value))
            return false
          if (activeTrait.value !== 'all') {
            const traitMatch = (CHAMPION_TRAITS[c.name] ?? []).includes(activeTrait.value as never)
            const originMatch = getChampionOrigin(c.name) === activeTrait.value
            if (!traitMatch && !originMatch) return false
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
          const aUnlocked = isUnlocked(a.name) ? 0 : 1
          const bUnlocked = isUnlocked(b.name) ? 0 : 1
          if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked
          return a.name.localeCompare(b.name)
        })
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

    const lastRowIndices = computed(() => {
      const count = filteredChampions.value.length
      const cols = colCount.value
      const lastRowStart = Math.floor((count - 1) / cols) * cols
      const indices = new Set<number>()
      for (let i = lastRowStart; i < count; i++) indices.add(i)
      return indices
    })

    // ── Card expand state ──
    const hoveredChampion = ref<string | null>(null)

    function getChampionDetail(name: string) {
      const traitIds = CHAMPION_TRAITS[name] ?? []
      const traits = TRAIT_DEFINITIONS.filter((t) => (traitIds as string[]).includes(t.id))
      const originKey = getChampionOrigin(name)
      const origin = originKey ? ORIGIN_SYNERGIES[originKey] ?? null : null
      return { traits, origin }
    }

    function onCardHoverAndDismiss(name: string) {
      dismissNewOnHover(name)
      hoveredChampion.value = name
    }

    function onCardLeave() {
      hoveredChampion.value = null
    }

    onMounted(() => {
      loadChampions()
      window.addEventListener('resize', onWindowResize)
    })
    onUnmounted(() => window.removeEventListener('resize', onWindowResize))

    return {
      filteredChampions,
      availableTraits,
      availableOrigins,
      searchMatchedTraits,
      hasSearchTraitMatch,
      unlockedCount,
      battleStore,
      inventoryStore,
      loadError,
      truncate,
      CHAMPION_ROLES,
      getChampionRoles,
      activeRole,
      searchQuery,
      activeTrait,
      isOwned,
      isUnlocked,
      isLocked,
      getMaterialCost,
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
      traitFilterOpen,
      isNew,
      hoveredChampion,
      lastRowIndices,
      getChampionDetail,
      onCardHoverAndDismiss,
      onCardLeave,
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

/* ── Load error ── */
.load-error { color: var(--rpg-red); }

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

/* Buyable pulse — role inset glow complements the gold buyable border */
@keyframes role-pulse-top {
  0%, 100% { box-shadow: 0 0 20px rgba(232,192,64,0.12), inset 0 0 0 1px rgba(224,80,80,0.15); }
  50%       { box-shadow: 0 0 26px rgba(232,192,64,0.22), inset 0 0 0 1px rgba(224,80,80,0.35); }
}
@keyframes role-pulse-jungle {
  0%, 100% { box-shadow: 0 0 20px rgba(232,192,64,0.12), inset 0 0 0 1px rgba(80,192,96,0.15); }
  50%       { box-shadow: 0 0 26px rgba(232,192,64,0.22), inset 0 0 0 1px rgba(80,192,96,0.35); }
}
@keyframes role-pulse-mid {
  0%, 100% { box-shadow: 0 0 20px rgba(232,192,64,0.12), inset 0 0 0 1px rgba(80,144,232,0.15); }
  50%       { box-shadow: 0 0 26px rgba(232,192,64,0.22), inset 0 0 0 1px rgba(80,144,232,0.35); }
}
@keyframes role-pulse-adc {
  0%, 100% { box-shadow: 0 0 20px rgba(232,192,64,0.12), inset 0 0 0 1px rgba(232,152,64,0.15); }
  50%       { box-shadow: 0 0 26px rgba(232,192,64,0.22), inset 0 0 0 1px rgba(232,152,64,0.35); }
}
@keyframes role-pulse-support {
  0%, 100% { box-shadow: 0 0 20px rgba(232,192,64,0.12), inset 0 0 0 1px rgba(184,200,216,0.15); }
  50%       { box-shadow: 0 0 26px rgba(232,192,64,0.22), inset 0 0 0 1px rgba(184,200,216,0.35); }
}
.card-buyable.champion-card-slot[data-role="top"]:not(.card-expanded)     .card-inner { animation: role-pulse-top     2.5s ease-in-out infinite; }
.card-buyable.champion-card-slot[data-role="jungle"]:not(.card-expanded)  .card-inner { animation: role-pulse-jungle  2.5s ease-in-out infinite; }
.card-buyable.champion-card-slot[data-role="mid"]:not(.card-expanded)     .card-inner { animation: role-pulse-mid     2.5s ease-in-out infinite; }
.card-buyable.champion-card-slot[data-role="adc"]:not(.card-expanded)     .card-inner { animation: role-pulse-adc     2.5s ease-in-out infinite; }
.card-buyable.champion-card-slot[data-role="support"]:not(.card-expanded) .card-inner { animation: role-pulse-support 2.5s ease-in-out infinite; }

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
  font-size: 0.65rem;
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
  color: #e8c040;
  background: rgba(232, 192, 64, 0.10);
  border-color: rgba(232, 192, 64, 0.45);
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
.cs-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cs-search-row .modal-close-btn {
  position: static;
  flex-shrink: 0;
  transform: none;
}

/* ── Grid area ── */
.cs-grid { padding: 8px 10px; }

/* ── Trait filter ── */
.trait-filter-section {
  border: 1px solid #3e2a0a;
  border-radius: var(--bp-radius);
  background: #161410;
  overflow: hidden;
}
.trait-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  cursor: pointer;
  background: #1e1006;
  border-bottom: 1px solid #3e2a0a;
  user-select: none;
  transition: background 0.15s;
}
.trait-filter-header:hover { background: #261408; }
.trait-filter-title {
  font-size: 0.6rem;
  font-weight: 700;
  color: #c89040;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.trait-chevron { width: 14px; height: 14px; color: #7a5020; }
.trait-filter-body {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px;
}
.trait-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-radius: var(--bp-radius);
  border: 1px solid color-mix(in srgb, var(--chip-color, #7a4e20) 55%, #3e2a0a);
  background: rgba(0, 0, 0, 0.35);
  color: var(--chip-color, #e8c040);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}
.trait-chip:hover {
  background: color-mix(in srgb, var(--chip-color, #e8c040) 18%, #0e0c06);
  border-color: var(--chip-color, #c89040);
  color: var(--chip-color, #e8c040);
  box-shadow: 0 0 5px color-mix(in srgb, var(--chip-color, #e8c040) 25%, transparent);
}
.trait-chip:hover .trait-chip-icon {
  color: rgba(255, 255, 255, 0.92);
}
.trait-chip--active {
  background: color-mix(in srgb, var(--chip-color, #e8c040) 32%, #0e0c06);
  border-color: var(--chip-color, #e8c040);
  color: var(--chip-color, #e8c040);
  box-shadow: 0 0 8px color-mix(in srgb, var(--chip-color, #e8c040) 45%, transparent),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.trait-chip--active .trait-chip-icon {
  color: #fff;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--chip-color, #e8c040) 60%, transparent));
}
.trait-chip-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.88);
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85));
}
.filter-group-label {
  width: 100%;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
  padding: 3px 2px 2px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.35);
  margin: 3px 0 2px;
}
.filter-group-label:first-child { margin-top: 0; }
.chip-group { display: contents; }
.chip-enter-active, .chip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.chip-enter-from, .chip-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

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
}

</style>
