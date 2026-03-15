ww
<template>
  <div
    class="relative h-full p-4 overflow-hidden border shop-container bg-gradient-to-br from-white/5 to-blue-500/10 rounded-2xl border-blue-400/30 backdrop-blur-sm"
  >
    <!-- Header -->
    <div class="mb-4 text-center">
      <h2
        class="mb-2 text-2xl font-extrabold text-transparent shop-title bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
      >
        🛒 Champion Shop
      </h2>
      <div
        class="w-24 h-0.5 mx-auto rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
      ></div>
      <p class="mt-2 text-sm font-semibold text-blue-300">
        Erweitere dein Team mit mächtigen Champions!
      </p>
    </div>

    <!-- Champions Grid -->
    <div class="champions-grid h-[calc(100%-8rem)] overflow-y-auto pr-2 custom-scrollbar">
      <div class="grid grid-cols-2 gap-4 p-2 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="champion in availableChampions"
          :key="champion.name"
          class="relative flex flex-col items-center p-3 transition-all duration-500 border shadow-lg champion-card bg-gradient-to-br from-white/10 to-blue-500/5 rounded-xl border-blue-400/30 hover:scale-105 hover:shadow-blue-500/50 backdrop-blur-sm"
        >
          <!-- Champion Avatar -->
          <div class="relative flex items-center justify-center w-12 h-12 mb-2 shadow-lg">
            <img
              :src="battleStore.getChampionImage(champion.name)"
              class="relative z-10 object-cover w-16 h-16 rounded-xl"
              :alt="champion.name"
            />
          </div>

          <!-- Champion Name -->
          <div class="mb-2 text-center champion-name">
            <span
              class="text-sm font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
            >
              {{ champion.name.length > 10 ? champion.name.slice(0, 10) + '...' : champion.name }}
            </span>
          </div>

          <!-- Buy Button -->
          <button
            class="w-full px-2 py-1.5 text-xs font-bold text-white transition-all duration-300 shadow-md buy-button rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              champion.owned
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:scale-105 hover:shadow-green-400/50'
            "
            :disabled="champion.owned"
            @click="buyChampion(champion.name)"
          >
            <span v-if="!champion.owned" class="flex items-center justify-center gap-1">
              <span>💰</span>
              <span>Kaufen</span>
            </span>
            <span v-else class="flex items-center justify-center gap-1">
              <span>✅</span>
              <span>Gekauft</span>
            </span>
          </button>

          <!-- Glow Effect -->
          <div
            class="absolute inset-0 transition-opacity duration-500 opacity-0 pointer-events-none rounded-xl bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 champion-glow"
          ></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="availableChampions.length === 0" class="py-8 text-center empty-state">
        <div class="mb-3 text-4xl">🎉</div>
        <h3
          class="mb-2 text-lg font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
        >
          Alle Champions gekauft!
        </h3>
        <p class="text-sm text-blue-400">Du besitzt bereits alle verfügbaren Champions.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, defineComponent, computed } from 'vue'
import { useBattleStore } from '../stores/battleStore'

interface Champion {
  name: string
  owned: boolean
}

export default defineComponent({
  name: 'ChampionShopComponent',
  setup() {
    const champions = ref<Champion[]>([])
    const battleStore = useBattleStore()

    async function loadChampions() {
      const response = await fetch('/src/config/champion.csv')
      if (!response.ok) throw new Error('Fehler beim Laden der Champion-Liste')
      const text = await response.text()
      champions.value = text
        .split('\n')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .map((name) => ({ name, owned: battleStore.ownedChampions.includes(name) }))
    }

    function buyChampion(name: string) {
      if (!battleStore.ownedChampions.includes(name)) {
        battleStore.ownedChampions.push(name)
        const champ = champions.value.find((c) => c.name === name)
        if (champ) champ.owned = true
      }
    }

    const availableChampions = computed(() =>
      champions.value.filter((c) => !battleStore.ownedChampions.includes(c.name)),
    )

    onMounted(() => {
      loadChampions()
    })

    return {
      champions,
      buyChampion,
      availableChampions,
      battleStore,
    }
  },
})
</script>

<style scoped>
.champion-card:nth-child(odd) {
  animation-delay: -2s;
}

.champion-card:hover .champion-glow {
  opacity: 1;
}

@keyframes cardFloat {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes avatarRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
