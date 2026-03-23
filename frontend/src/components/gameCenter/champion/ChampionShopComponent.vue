<template>
  <div class="flex flex-col w-full h-full gap-3 p-4">
    <!-- ── Search ── -->
    <div class="relative">
      <span
        class="absolute text-xs -translate-y-1/2 pointer-events-none left-3 top-1/2 text-white/20"
        >⌕</span
      >
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Champion suchen…"
        class="w-full pl-7 pr-3 py-2 text-sm rounded-xl bg-white/[0.03] border border-white/[0.07] text-white/60 placeholder-white/20 focus:outline-none focus:border-blue-400/30 transition-colors duration-200"
      />
    </div>

    <!-- ── Role Filter ── -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="role in roles"
        :key="role.value"
        @click="activeRole = role.value"
        class="px-2.5 py-0.5 text-xs font-bold rounded-lg border transition-all duration-200"
        :class="
          activeRole === role.value
            ? 'bg-violet-500/15 border-violet-400/30 text-violet-300/80'
            : 'bg-white/[0.02] border-white/[0.06] text-white/25 hover:text-white/45 hover:border-white/10'
        "
      >
        {{ role.label }}
      </button>
    </div>

    <p v-if="loadError" class="text-[11px] text-center text-red-400/70">{{ loadError }}</p>

    <!-- ── Champion Grid ── -->
    <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
      <!-- Leer-Zustand -->
      <div
        v-if="filteredChampions.length === 0"
        class="flex flex-col items-center justify-center gap-3 py-10"
      >
        <div
          class="w-12 h-12 rounded-2xl border border-dashed border-white/[0.08] flex items-center justify-center"
        >
          <span class="text-xl opacity-20">🔍</span>
        </div>
        <p class="text-sm text-white/20">Kein Champion gefunden.</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-2 md:grid-cols-3">
        <div
          v-for="champion in filteredChampions"
          :key="champion.name"
          class="relative overflow-hidden transition-all duration-300 border group rounded-xl"
          :class="getCardClass(champion.name)"
          @click="handleBuy(champion.name)"
        >
          <!-- Shimmer (kaufbar) -->
          <div
            v-if="
              isUnlocked(champion.name) &&
              !isOwned(champion.name) &&
              canAffordChampion(champion.name)
            "
            class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.04] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
          />

          <div class="flex flex-col items-center gap-2 p-3">
            <!-- Champion Icon -->
            <div
              class="relative flex items-center justify-center w-16 h-16 transition-transform duration-300 group-hover:scale-105"
              :class="
                isUnlocked(champion.name) &&
                !isOwned(champion.name) &&
                canAffordChampion(champion.name)
                  ? 'bg-gradient-to-br from-cyan-500/[0.12] to-blue-500/[0.06] border-cyan-400/15'
                  : 'bg-white/[0.03] border-white/[0.07]'
              "
            >
              <div
                v-if="
                  isUnlocked(champion.name) &&
                  !isOwned(champion.name) &&
                  canAffordChampion(champion.name)
                "
                class="absolute inset-0"
              />
              <img
                :src="battleStore.getChampionImage(champion.name)"
                :alt="champion.name"
                class="relative z-10 object-cover rounded-lg w-14 h-14"
              />
            </div>

            <!-- Name -->
            <span
              class="text-sm font-bold leading-tight tracking-wide text-center"
              :class="
                isOwned(champion.name) || isLocked(champion.name)
                  ? 'text-white/25'
                  : 'text-white/65'
              "
            >
              {{ truncate(champion.name, 10) }}
            </span>

            <!-- Role Badges -->
            <div class="flex flex-wrap justify-center gap-1">
              <span
                v-for="role in getChampionRoles(champion.name)"
                :key="role"
                class="px-1.5 py-0.5 text-[9px] rounded-md bg-white/[0.04] text-white/25 border border-white/[0.06]"
              >
                {{ role }}
              </span>
            </div>

            <!-- Material-Kosten -->
            <div
              v-if="isUnlocked(champion.name) && !isOwned(champion.name)"
              class="flex flex-wrap justify-center w-full gap-1"
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
                {{ getMaterialName(String(matId)) }}:
                {{ inventoryStore.collectedMaterials[String(matId)] ?? 0 }}/{{ qty }}
              </span>
            </div>

            <!-- Aktion Button -->
            <button
              class="w-full py-1.5 text-[10px] font-black rounded-lg border transition-all duration-200"
              :class="getButtonClass(champion.name)"
              :disabled="!canClickBuy(champion.name)"
            >
              <span v-if="isOwned(champion.name)" class="text-white/20">✓ Rekrutiert</span>
              <span v-else-if="isUnlocked(champion.name)">Rekrutieren</span>
              <span v-else class="text-white/15">🔒 Gesperrt</span>
            </button>
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
import { truncate } from '../../../config/numberFormat'
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
          if (activeRole.value !== 'all' && !getChampionRoles(c.name).includes(activeRole.value))
            return false
          if (searchQuery.value.trim()) {
            return c.name.toLowerCase().includes(searchQuery.value.toLowerCase().trim())
          }
          return true
        })
        .sort((a, b) => {
          const aUnlocked = isOwned(a.name) || isUnlocked(a.name) ? 0 : 1
          const bUnlocked = isOwned(b.name) || isUnlocked(b.name) ? 0 : 1
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
      getLockedTooltip,
      getCardClass,
      getButtonClass,
    }
  },
})
</script>

<style scoped>
.cost-badge {
  font-size: 0.6rem;
  padding: 0.1rem 0.35rem;
  border-radius: 0.3rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.cost-badge--ok {
  background: rgba(16, 185, 129, 0.09);
  border: 1px solid rgba(16, 185, 129, 0.18);
  color: rgba(110, 231, 183, 0.75);
}

.cost-badge--missing {
  background: rgba(239, 68, 68, 0.09);
  border: 1px solid rgba(239, 68, 68, 0.18);
  color: rgba(252, 165, 165, 0.75);
}

.champion-locked {
  position: relative;
}

.locked-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.35rem 0.6rem;
  background: rgba(5, 3, 18, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 0.5rem;
  font-size: 0.55rem;
  color: rgba(200, 220, 255, 0.6);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.champion-locked:hover .locked-tooltip {
  opacity: 1;
}
</style>
