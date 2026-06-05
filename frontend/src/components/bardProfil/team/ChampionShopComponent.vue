<template>
  <div class="rpg-frame flex flex-col h-full">
    <!-- ── Header: Search + Role Filter ── -->
    <div class="rpg-header cs-header">
      <div class="cs-search-row">
        <div class="relative flex-1">
          <span class="search-icon">⌕</span>
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
            :class="{ 'trait-chip--active': activeTrait === 'all' && activeRole === 'all' }"
            @click="activeTrait = 'all'; setActiveRole('all')"
          >Alle</button>

          <div class="filter-group-label">Traits</div>
          <TransitionGroup tag="div" name="chip" class="chip-group">
            <button
              v-for="trait in availableTraits"
              :key="trait.id"
              v-show="!hasSearchTraitMatch || searchMatchedTraits.has(trait.id)"
              class="trait-chip"
              :class="{ 'trait-chip--active': activeTrait === trait.id || searchMatchedTraits.has(trait.id) }"
              :style="(activeTrait === trait.id || searchMatchedTraits.has(trait.id)) ? `--chip-color: ${trait.color}` : ''"
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
                :style="(activeTrait === origin.origin || searchMatchedTraits.has(origin.origin)) ? `--chip-color: ${origin.color}` : ''"
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
        <div
          v-for="champion in filteredChampions"
          :key="champion.name"
          class="relative overflow-hidden champion-card group"
          :class="getCardClass(champion.name)"
          @click="handleBuy(champion.name)"
        >
          <!-- Hintergrundbild -->
          <img
            :src="battleStore.getChampionImage(champion.name)"
            :alt="champion.name"
            class="absolute inset-0 object-cover object-top w-full h-full transition-transform duration-500 rpg-img group-hover:scale-105"
            :class="isLocked(champion.name) ? 'grayscale' : ''"
          />

          <!-- Lock-Overlay -->
          <img
            v-if="isLocked(champion.name)"
            src="/img/lock.png"
            alt="Locked"
            class="lock-overlay"
          />

          <!-- Gradient Overlay -->
          <div
            class="absolute inset-0 card-overlay"
            :class="
              isUnlocked(champion.name) && canAffordChampion(champion.name)
                ? 'card-overlay--buyable'
                : 'card-overlay--default'
            "
          />

          <!-- Shimmer -->
          <div
            v-if="
              isUnlocked(champion.name) &&
              !isOwned(champion.name) &&
              canAffordChampion(champion.name)
            "
            class="absolute inset-0 pointer-events-none card-shimmer translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
          />

          <!-- Content -->
          <div class="relative z-10 flex flex-col justify-between h-full p-2">
            <!-- Unterer Bereich -->
            <div class="flex flex-col gap-2 mt-auto">
              <!-- Name -->
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

              <!-- Material-Kosten -->
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

              <!-- Button -->
              <button
                class="w-full card-btn"
                :class="getButtonClass(champion.name)"
                :disabled="!canClickBuy(champion.name)"
              >
                <span v-if="isOwned(champion.name)">In Team</span>
                <span v-else-if="isUnlocked(champion.name) && canAffordChampion(champion.name)">Recruit</span>
                <span v-else-if="isUnlocked(champion.name)">Materials Missing</span>
                <span v-else>Locked</span>
              </button>
            </div>
          </div>

          <!-- Locked Tooltip -->
          <div v-if="isLocked(champion.name)" class="locked-tooltip">
            {{ getLockedTooltip(champion.name) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, defineComponent, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '../../../stores/battleStore'
import { useInventoryStore } from '../../../stores/inventoryStore'
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
  components: { Icon },
  props: {
    initialRole: { type: String, default: 'all' },
    showClose: { type: Boolean, default: false },
  },
  emits: ['roleChange', 'close'],
  setup(props, { emit }) {
    const championNames = ref<string[]>([])
    const battleStore = useBattleStore()
    const inventoryStore = useInventoryStore()
    const { showToast } = useActionToast()
    const loadError = ref<string | null>(null)
    const activeRole = ref<ChampionRole | 'all'>(props.initialRole as ChampionRole | 'all')
    const searchQuery = ref('')
    const activeTrait = ref<string>('all')
    const traitFilterOpen = ref(false)

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

    function getButtonClass(name: string): string {
      if (isOwned(name)) return 'btn-owned'
      if (isUnlocked(name) && canAffordChampion(name)) return 'btn-buyable'
      return 'btn-locked'
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

    onMounted(() => loadChampions())

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
      getButtonClass,
      setActiveRole,
      traitFilterOpen,
    }
  },
})
</script>

<style scoped>
/* modal-panel already frames — suppress rpg-frame double border */
.rpg-frame {
  border: none;
  box-shadow: none;
}
/* Align header separator to modal standard (1px instead of global 3px) */
.rpg-header {
  border-bottom-width: 1px;
  border-bottom-color: rgba(92, 51, 16, 0.5);
}

/* ── Search icon ── */
.search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.875rem;
  color: var(--rpg-text-dim);
  pointer-events: none;
}

/* ── Load error ── */
.load-error {
  color: var(--rpg-red);
}

/* ── Empty state ── */
.empty-icon-box {
  border: 1px dashed var(--rpg-wood-mid);
  border-radius: 4px;
}
.empty-label {
  font-size: 0.875rem;
  color: var(--rpg-text-dim);
}

/* ── Champion card base ── */
.champion-card {
  min-height: 140px;
  height: 140px;
  border-radius: 4px;
  border: 1px solid var(--rpg-wood-mid);
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

/* Card state variants */
.card-owned {
  background: var(--rpg-bg-deep);
  border-color: var(--rpg-border-row);
  opacity: 0.55;
  filter: grayscale(30%);
  cursor: default;
  pointer-events: none;
}
.card-buyable {
  background: var(--rpg-bg-deep);
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 20px rgba(232, 192, 64, 0.12);
  cursor: pointer;
}
.card-buyable:hover {
  transform: scale(1.015) translateY(-2px);
  box-shadow: 0 0 35px rgba(232, 192, 64, 0.25);
}
.card-unlocked {
  background: var(--rpg-bg-deep);
  border-color: var(--rpg-wood-mid);
  opacity: 0.7;
  cursor: default;
}
.card-locked {
  background: var(--rpg-bg-deep);
  border-color: var(--rpg-border-row);
  opacity: 0.4;
  filter: grayscale(55%);
  cursor: not-allowed;
  pointer-events: none;
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

/* ── Champion name ── */
.champion-name {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
}
.champion-name--bright {
  color: rgba(255, 255, 255, 0.95);
}
.champion-name--dim {
  color: rgba(255, 255, 255, 0.45);
}

/* ── Cost badges ── */
.cost-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
}
.cost-badge--ok {
  background: var(--rpg-bg-green-subtle);
  border: 1px solid var(--rpg-green-bottom);
  color: var(--rpg-green-light);
}
.cost-badge--missing {
  background: var(--rpg-bg-red-subtle);
  border: 1px solid var(--rpg-red);
  color: var(--rpg-red);
}

/* ── Card buttons ── */
.card-btn {
  padding: 0.25rem 0;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    opacity 0.15s,
    transform 0.1s;
}
.btn-owned {
  background: var(--rpg-bg-row);
  border-color: var(--rpg-border-row);
  color: #555548;
  cursor: not-allowed;
}
.btn-buyable {
  background: linear-gradient(to bottom, var(--rpg-green-top), var(--rpg-green-bottom));
  border-color: var(--rpg-green-border);
  color: #fff;
}
.btn-buyable:hover {
  opacity: 0.9;
}
.btn-buyable:active {
  transform: scale(0.97);
}
.btn-locked {
  background: var(--rpg-bg-row);
  border-color: var(--rpg-border-row);
  color: var(--rpg-btn-disabled-border);
  cursor: not-allowed;
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
  border-radius: 4px;
  font-size: 0.6rem;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
}
.champion-card:hover .locked-tooltip {
  opacity: 1;
}

/* ── Header-Bar (Search + Rollen) ── */
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

/* ── Grid-Bereich ── */
.cs-grid {
  padding: 8px 10px;
}

/* ── Trait filter section ── */
.trait-filter-section {
  border: 1px solid #3e2a0a;
  border-radius: 4px;
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
.trait-filter-header:hover {
  background: #261408;
}

.trait-filter-title {
  font-size: 0.6rem;
  font-weight: 700;
  color: #c89040;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.trait-chevron {
  width: 14px;
  height: 14px;
  color: #7a5020;
}

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
  padding: 3px 8px;
  font-size: 0.6rem;
  font-weight: 700;
  border-radius: 4px;
  border: 1px solid #3e2a0a;
  background: #1c1a10;
  color: var(--rpg-text-dim);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  white-space: nowrap;
}
.trait-chip:hover {
  border-color: var(--rpg-wood-mid);
  color: var(--rpg-text-muted);
}
.trait-chip--active {
  background: color-mix(in srgb, var(--chip-color, #e8c040) 18%, #1c1a10);
  border-color: var(--chip-color, #e8c040);
  color: var(--chip-color, #e8c040);
}

.trait-chip-icon {
  width: 18px;
  height: 18px;
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
.filter-group-label:first-child {
  margin-top: 0;
}

.chip-group {
  display: contents;
}

.chip-enter-active,
.chip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

</style>
