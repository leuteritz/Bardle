<template>
  <div class="flex flex-col w-full h-full gap-3 p-4">
    <!-- ── Search ── -->
    <div class="relative">
      <span
        class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/25 pointer-events-none"
        >⌕</span
      >
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Champion suchen…"
        class="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/10 text-white/70 placeholder-white/25 focus:outline-none focus:border-blue-400/40 transition-colors duration-200"
      />
    </div>

    <!-- ── Role Filter ── -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="role in roles"
        :key="role.value"
        @click="activeRole = role.value"
        class="px-3 py-1 text-xs font-bold transition-all duration-200 border rounded-xl"
        :class="
          activeRole === role.value
            ? 'bg-violet-500/20 border-violet-400/35 text-violet-300/90'
            : 'bg-white/[0.03] border-white/10 text-white/35 hover:text-white/55 hover:border-white/15'
        "
      >
        {{ role.label }}
      </button>
    </div>

    <p v-if="loadError" class="text-xs text-center text-red-400/70">{{ loadError }}</p>

    <!-- ── Champion Grid ── -->
    <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
      <div
        v-if="filteredChampions.length === 0"
        class="flex flex-col items-center justify-center gap-4 py-12"
      >
        <div
          class="flex items-center justify-center border border-dashed w-14 h-14 rounded-2xl border-white/10"
        >
          <span class="text-2xl opacity-20">🔍</span>
        </div>
        <p class="text-sm text-white/25">Kein Champion gefunden.</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        <div
          v-for="champion in filteredChampions"
          :key="champion.name"
          class="relative overflow-hidden transition-all duration-300 border rounded-2xl group champion-card"
          :class="getCardClass(champion.name)"
          @click="handleBuy(champion.name)"
        >
          <!-- Hintergrundbild -->
          <img
            :src="battleStore.getChampionImage(champion.name)"
            :alt="champion.name"
            class="absolute inset-0 object-cover object-top w-full h-full transition-transform duration-500 group-hover:scale-105"
            :class="isLocked(champion.name) ? 'grayscale' : ''"
          />

          <!-- Gradient Overlay -->
          <div
            class="absolute inset-0"
            :class="
              isOwned(champion.name)
                ? 'bg-gradient-to-t from-black/85 via-black/45 to-black/15'
                : isUnlocked(champion.name) && canAffordChampion(champion.name)
                  ? 'bg-gradient-to-t from-black/90 via-black/35 to-transparent'
                  : 'bg-gradient-to-t from-black/85 via-black/45 to-black/10'
            "
          />

          <!-- Shimmer -->
          <div
            v-if="
              isUnlocked(champion.name) &&
              !isOwned(champion.name) &&
              canAffordChampion(champion.name)
            "
            class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.07] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
          />

          <!-- Content -->
          <div class="relative z-10 flex flex-col justify-between h-full p-2">
            <!-- Rollen oben rechts -->
            <div class="flex flex-wrap self-end justify-end gap-1">
              <span
                v-for="role in getChampionRoles(champion.name)"
                :key="role"
                class="px-2 py-0.5 text-[9px] font-semibold rounded-md bg-black/50 text-white/55 border border-white/10 backdrop-blur-sm"
              >
                {{ role }}
              </span>
            </div>

            <!-- Unterer Bereich -->
            <div class="flex flex-col gap-2 mt-auto">
              <!-- Name -->
              <span
                class="text-sm font-black leading-tight tracking-wide drop-shadow-lg"
                :class="
                  isOwned(champion.name) || isLocked(champion.name)
                    ? 'text-white/45'
                    : 'text-white/95'
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
                    class="inline-block w-3.5 h-3.5 object-contain align-middle"
                  />
                  {{ formatNumber(inventoryStore.collectedMaterials[String(matId)] ?? 0) }}/{{ formatNumber(qty as number) }}
                </span>
              </div>

              <!-- Button -->
              <button
                class="w-full"
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
      if (isOwned(name)) {
        return 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 opacity-55 cursor-default'
      }
      if (isUnlocked(name) && canAffordChampion(name)) {
        return 'bg-gradient-to-br from-cyan-900/30 via-blue-900/20 to-teal-900/10 border-cyan-500/30 shadow-[0_0_20px_rgba(0,180,255,0.15)] hover:shadow-[0_0_35px_rgba(0,180,255,0.3)] hover:scale-[1.015] hover:-translate-y-0.5 cursor-pointer'
      }
      if (isUnlocked(name)) {
        return 'bg-gradient-to-br from-white/5 to-white/[0.02] border-cyan-500/15 opacity-70 cursor-default'
      }
      // Locked
      return 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 opacity-40 grayscale cursor-default champion-locked'
    }

    function getButtonClass(name: string): string {
      if (isOwned(name)) {
        return 'bg-gray-800/50 border-gray-600/20 text-gray-400 cursor-not-allowed'
      }
      if (isUnlocked(name) && canAffordChampion(name)) {
        return 'bg-gradient-to-b from-cyan-500 to-blue-600 border-cyan-400/50 text-white shadow-lg shadow-cyan-900/50 hover:shadow-cyan-500/50 hover:from-cyan-400 active:scale-95'
      }
      return 'bg-gray-800/50 border-gray-600/20 text-gray-500 cursor-not-allowed'
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
.champion-card {
  min-height: 140px;
  height: 140px;
}

.cost-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 0.35rem;
  font-weight: 700;
}
.cost-badge--ok {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.22);
  color: rgba(110, 231, 183, 0.8);
}
.cost-badge--missing {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.22);
  color: rgba(252, 165, 165, 0.8);
}
.locked-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.4rem 0.75rem;
  background: rgba(5, 3, 18, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.6rem;
  font-size: 0.6rem;
  color: rgba(200, 220, 255, 0.65);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
.champion-card:hover .locked-tooltip {
  opacity: 1;
}
</style>
