<template>
  <div class="flex flex-col w-full h-full p-4 space-y-4">
    <!-- ─── Header Badge ─── -->
    <div
      class="flex items-center justify-between p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <span class="text-xs font-bold tracking-widest uppercase text-white/50">Champion Shop</span>
      <span
        class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/30 text-cyan-200 tracking-wider"
      >
        {{ unlockedCount }} freigeschaltet
      </span>
    </div>

    <!-- ─── Search ─── -->
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Champion suchen…"
      class="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white/80 placeholder-white/30 focus:outline-none focus:border-blue-400/50"
    />

    <!-- ─── Role Filter ─── -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="role in roles"
        :key="role.value"
        @click="activeRole = role.value"
        class="px-2.5 py-1 text-xs font-bold rounded-full border transition-all"
        :class="
          activeRole === role.value
            ? 'bg-violet-500/40 border-violet-400/60 text-violet-200'
            : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
        "
      >
        {{ role.label }}
      </button>
    </div>

    <p v-if="loadError" class="text-xs text-center text-red-400">{{ loadError }}</p>

    <!-- ─── Champions Grid ─── -->
    <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <!-- No filter match -->
      <div
        v-if="filteredChampions.length === 0"
        class="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
      >
        <span class="text-4xl">🔍</span>
        <p class="text-xs text-white/40">Kein Champion gefunden.</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div
          v-for="champion in filteredChampions"
          :key="champion.name"
          class="group relative overflow-hidden rounded-2xl transition-all duration-300 border backdrop-blur-md"
          :class="getCardClass(champion.name)"
          @click="handleBuy(champion.name)"
        >
          <!-- Shimmer Sweep (unlocked + affordable) -->
          <div
            v-if="isUnlocked(champion.name) && !isOwned(champion.name) && canAffordChampion(champion.name)"
            class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
          />
          <!-- Glow Pulse Border -->
          <div
            v-if="isUnlocked(champion.name) && !isOwned(champion.name) && canAffordChampion(champion.name)"
            class="absolute inset-0 border pointer-events-none rounded-2xl border-cyan-400/40 animate-pulse"
          />

          <div class="flex flex-col items-center gap-2 p-3">
            <!-- Icon -->
            <div
              class="relative flex items-center justify-center w-16 h-16 transition-transform duration-300 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-white/15 group-hover:scale-110"
            >
              <div
                v-if="isUnlocked(champion.name) && !isOwned(champion.name) && canAffordChampion(champion.name)"
                class="absolute inset-0 rounded-xl blur-md opacity-60 bg-gradient-to-br from-cyan-400/40 to-blue-400/20"
              />
              <img
                :src="battleStore.getChampionImage(champion.name)"
                :alt="champion.name"
                class="relative z-10 object-cover w-10 h-10 rounded-lg drop-shadow-lg"
              />
            </div>

            <!-- Name -->
            <h3
              class="text-xs font-black leading-tight tracking-wide text-center text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
            >
              {{ truncate(champion.name, 10) }}
            </h3>

            <!-- Role Badges -->
            <div class="flex gap-1 flex-wrap justify-center">
              <span
                v-for="role in getChampionRoles(champion.name)"
                :key="role"
                class="px-1.5 py-0.5 text-[10px] rounded-full bg-white/10 text-white/40 border border-white/10"
              >
                {{ role }}
              </span>
            </div>

            <!-- Material Cost (unlocked but not owned) -->
            <div v-if="isUnlocked(champion.name) && !isOwned(champion.name)" class="flex flex-wrap gap-1 justify-center w-full">
              <span
                v-for="(qty, matId) in getMaterialCost(champion.name)"
                :key="matId"
                class="cost-badge"
                :class="hasEnoughMaterial(String(matId), qty as number) ? 'cost-badge--ok' : 'cost-badge--missing'"
              >
                {{ getMaterialName(String(matId)) }}: {{ inventoryStore.collectedMaterials[String(matId)] ?? 0 }}/{{ qty }}
              </span>
            </div>

            <!-- Buy / Status Button -->
            <button
              class="relative w-full px-2 py-2 overflow-hidden text-xs font-bold transition-all duration-300 border group/btn rounded-xl"
              :class="getButtonClass(champion.name)"
              :disabled="!canClickBuy(champion.name)"
            >
              <div class="relative flex items-center justify-center gap-1.5">
                <template v-if="isOwned(champion.name)">
                  <span>✅</span>
                  <span>Gekauft</span>
                </template>
                <template v-else-if="isUnlocked(champion.name)">
                  <span>Rekrutieren</span>
                </template>
                <template v-else>
                  <span>🔒</span>
                  <span>Gesperrt</span>
                </template>
              </div>
            </button>
          </div>

          <!-- Tooltip for locked champions -->
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
  font-size: 0.55rem;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  font-weight: 600;
}

.cost-badge--ok {
  background: rgba(80, 200, 120, 0.15);
  color: rgba(120, 230, 150, 0.9);
}

.cost-badge--missing {
  background: rgba(255, 80, 80, 0.15);
  color: rgba(255, 130, 130, 0.9);
}

.champion-locked {
  position: relative;
}

.locked-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.4rem 0.6rem;
  background: rgba(0, 5, 20, 0.95);
  border: 1px solid rgba(100, 180, 255, 0.25);
  border-radius: 0.5rem;
  font-size: 0.55rem;
  color: rgba(150, 200, 255, 0.9);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
}

.champion-locked:hover .locked-tooltip {
  opacity: 1;
}
</style>
