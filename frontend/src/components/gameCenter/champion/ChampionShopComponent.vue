<template>
  <div class="flex flex-col w-full h-full p-4 space-y-4">
    <!-- ─── Header Badge ─── -->
    <div
      class="flex items-center justify-between p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <span class="text-xs font-bold tracking-widest uppercase text-white/50">Champion Shop</span>
      <span
        class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
      >
        {{ availableChampions.length }} verfügbar
      </span>
    </div>

    <p v-if="loadError" class="text-xs text-center text-red-400">{{ loadError }}</p>

    <!-- ─── Champions Grid ─── -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <!-- Empty State -->
      <div
        v-if="availableChampions.length === 0"
        class="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
      >
        <span class="text-4xl">🎉</span>
        <h3
          class="text-sm font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
        >
          Alle Champions gekauft!
        </h3>
        <p class="text-xs text-blue-400">Du besitzt bereits alle verfügbaren Champions.</p>
      </div>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div
          v-for="champion in availableChampions"
          :key="champion.name"
          @click="buyChampion(champion.name)"
          class="group relative overflow-hidden rounded-2xl transition-all duration-300 border backdrop-blur-md hover:scale-[1.015] hover:-translate-y-0.5"
          :class="
            !champion.owned && canAfford
              ? 'bg-gradient-to-br from-emerald-900/30 via-green-900/20 to-teal-900/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_35px_rgba(16,185,129,0.3)] cursor-pointer'
              : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 opacity-55 grayscale cursor-not-allowed'
          "
        >
          <!-- Shimmer Sweep -->
          <div
            v-if="!champion.owned && canAfford"
            class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
          />
          <!-- Glow Pulse Border -->
          <div
            v-if="!champion.owned && canAfford"
            class="absolute inset-0 border pointer-events-none rounded-2xl border-emerald-400/40 animate-pulse"
          />

          <div class="flex flex-col items-center gap-2 p-3">
            <!-- Icon -->
            <div
              class="relative flex items-center justify-center w-16 h-16 transition-transform duration-300 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-white/15 group-hover:scale-110"
            >
              <div
                v-if="!champion.owned && canAfford"
                class="absolute inset-0 rounded-xl blur-md opacity-60 bg-gradient-to-br from-emerald-400/40 to-teal-400/20"
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

            <!-- Buy Button -->
            <button
              class="relative w-full px-2 py-2 overflow-hidden text-xs font-bold transition-all duration-300 border group/btn rounded-xl"
              :class="
                champion.owned
                  ? 'bg-gray-800/50 border-gray-600/20 text-gray-400 cursor-not-allowed'
                  : canAfford
                    ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400/50 text-white shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/50 hover:from-emerald-400 active:scale-95'
                    : 'bg-gray-800/50 border-gray-600/20 text-gray-500 cursor-not-allowed'
              "
              :disabled="champion.owned || !canAfford"
            >
              <!-- Button Shimmer -->
              <div
                v-if="!champion.owned && canAfford"
                class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"
              />
              <div class="relative flex items-center justify-center gap-1.5">
                <template v-if="!champion.owned">
                  <img src="/img/BardAbilities/BardChime.png" class="w-4 h-4 drop-shadow-sm" />
                  <span class="font-black tracking-tight">{{ formatNumber(CHAMPION_COST) }}</span>
                </template>
                <template v-else>
                  <span>✅</span>
                  <span>Gekauft</span>
                </template>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, defineComponent, computed } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'
import { useGameStore } from '../../../stores/gameStore'
import { formatNumber, truncate } from '../../../config/numberFormat'
import { fetchChampionNames } from '../../../utils/champions'

const CHAMPION_COST = 500

interface Champion {
  name: string
  owned: boolean
}

export default defineComponent({
  name: 'ChampionShopComponent',
  setup() {
    const champions = ref<Champion[]>([])
    const battleStore = useBattleStore()
    const gameStore = useGameStore()
    const loadError = ref<string | null>(null)

    async function loadChampions() {
      try {
        const names = await fetchChampionNames()
        champions.value = names.map((name) => ({
          name,
          owned: battleStore.ownedChampions.includes(name),
        }))
      } catch {
        loadError.value = 'Champions konnten nicht geladen werden.'
      }
    }

    function buyChampion(name: string) {
      if (!battleStore.ownedChampions.includes(name) && gameStore.chimes >= CHAMPION_COST) {
        gameStore.chimes -= CHAMPION_COST
        battleStore.ownedChampions.push(name)
        const champ = champions.value.find((c) => c.name === name)
        if (champ) champ.owned = true
      }
    }

    const canAfford = computed(() => gameStore.chimes >= CHAMPION_COST)
    const availableChampions = computed(() =>
      champions.value.filter((c) => !battleStore.ownedChampions.includes(c.name)),
    )

    onMounted(() => loadChampions())

    return {
      champions,
      buyChampion,
      availableChampions,
      battleStore,
      gameStore,
      canAfford,
      loadError,
      CHAMPION_COST,
      formatNumber,
      truncate,
    }
  },
})
</script>
