<template>
  <div class="rpg-frame flex flex-col h-full">
    <!-- ── Header: Search + Role Filter ── -->
    <div class="rpg-header cs-header">
      <div class="relative">
        <span class="search-icon">⌕</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Champion suchen…"
          class="rpg-search w-full pl-9 pr-4 py-2.5"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="role in roles"
          :key="role.value"
          @click="activeRole = role.value"
          class="px-3 py-1 rpg-tab"
          :class="activeRole === role.value ? 'rpg-tab--active' : ''"
        >
          {{ role.label }}
        </button>
      </div>

      <p v-if="loadError" class="text-xs text-center load-error">{{ loadError }}</p>
    </div>

    <!-- ── Champion Grid ── -->
    <div class="flex-1 min-h-0 overflow-y-auto rpg-scrollbar cs-grid">
      <div
        v-if="filteredChampions.length === 0"
        class="flex flex-col items-center justify-center gap-4 py-12"
      >
        <div class="flex items-center justify-center empty-icon-box w-14 h-14">
          <span class="text-2xl opacity-20">🔍</span>
        </div>
        <p class="empty-label">Kein Champion gefunden.</p>
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
            <!-- Rollen oben rechts -->
            <div class="flex flex-wrap self-end justify-end gap-1">
              <span
                v-for="role in getChampionRoles(champion.name)"
                :key="role"
                class="px-2 py-0.5 role-tag"
              >
                {{ role }}
              </span>
            </div>

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
              ></button>
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
import { ref, onMounted, defineComponent, computed } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'
import { useInventoryStore } from '../../../stores/inventoryStore'
import { truncate, formatNumber } from '../../../config/numberFormat'
import { fetchChampionNames } from '../../../utils/champions'
import { getChampionRoles } from '../../../config/championRoles'
import { MATERIALS } from '../../../config/materials'
import { getHomePlanetConfig } from '../../../config/championHomePlanets'
import { PLANET_TYPE_NAMES } from '../../../config/constants'
import type { ChampionRole } from '../../../types'

const roles = [
  { value: 'all' as const, label: 'Alle' },
  { value: 'top' as const, label: 'Top' },
  { value: 'jungle' as const, label: 'Jungle' },
  { value: 'mid' as const, label: 'Mid' },
  { value: 'adc' as const, label: 'ADC' },
  { value: 'support' as const, label: 'Support' },
]

export default defineComponent({
  name: 'ChampionShopComponent',
  setup() {
    const championNames = ref<string[]>([])
    const battleStore = useBattleStore()
    const inventoryStore = useInventoryStore()
    const loadError = ref<string | null>(null)
    const activeRole = ref<ChampionRole | 'all'>('all')
    const searchQuery = ref('')

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

    const filteredChampions = computed(() => {
      return championNames.value
        .map((name) => ({ name }))
        .filter((c) => {
          if (isOwned(c.name)) return false
          if (activeRole.value !== 'all' && !getChampionRoles(c.name).includes(activeRole.value))
            return false
          if (searchQuery.value.trim()) {
            return c.name.toLowerCase().includes(searchQuery.value.toLowerCase().trim())
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

    const unlockedCount = computed(() => {
      return battleStore.recruitableChampions.length
    })

    onMounted(() => loadChampions())

    return {
      filteredChampions,
      unlockedCount,
      battleStore,
      inventoryStore,
      loadError,
      truncate,
      getChampionRoles,
      activeRole,
      searchQuery,
      roles,
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
    }
  },
})
</script>

<style scoped>
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
  cursor: default;
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
  cursor: default;
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

/* ── Role tag ── */
.role-tag {
  font-size: 9px;
  font-weight: 600;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: var(--rpg-text-muted);
  border: 1px solid #333;
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

/* ── Grid-Bereich ── */
.cs-grid {
  padding: 8px 10px;
}
</style>
