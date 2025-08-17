<template>
  <div
    class="relative h-full p-4 overflow-hidden border shop-container bg-gradient-to-br from-white/5 to-purple-500/10 rounded-2xl border-purple-400/30 backdrop-blur-sm"
  >
    <!-- Header -->
    <div class="mb-4 text-center">
      <h2
        class="mb-2 text-2xl font-extrabold text-transparent shop-title bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
      >
        🛒 Champion Shop
      </h2>
      <div
        class="w-24 h-0.5 mx-auto rounded-full bg-gradient-to-r from-purple-400 to-pink-500"
      ></div>
      <p class="mt-2 text-sm font-semibold text-purple-300">
        Erweitere dein Team mit mächtigen Champions!
      </p>
    </div>

    <!-- Champions Grid -->
    <div class="champions-grid h-[calc(100%-8rem)] overflow-y-auto pr-2 custom-scrollbar">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="champion in availableChampions"
          :key="champion.name"
          class="relative flex flex-col items-center p-3 transition-all duration-500 border shadow-lg champion-card bg-gradient-to-br from-white/10 to-purple-500/5 rounded-xl border-purple-400/30 hover:scale-105 hover:shadow-purple-500/50 backdrop-blur-sm"
        >
          <!-- Champion Avatar -->
          <div
            class="relative flex items-center justify-center w-12 h-12 mb-2 border-2 rounded-full shadow-lg champion-avatar bg-gradient-to-br from-purple-400/30 to-pink-500/30 border-purple-400/50"
          >
            <span class="text-lg">⚔️</span>
            <div
              class="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/20"
            ></div>
          </div>

          <!-- Champion Name -->
          <div class="mb-2 text-center champion-name">
            <span
              class="text-sm font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
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
            class="absolute inset-0 transition-opacity duration-500 opacity-0 pointer-events-none rounded-xl bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 champion-glow"
          ></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="availableChampions.length === 0" class="py-8 text-center empty-state">
        <div class="mb-3 text-4xl">🎉</div>
        <h3
          class="mb-2 text-lg font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
        >
          Alle Champions gekauft!
        </h3>
        <p class="text-sm text-purple-400">Du besitzt bereits alle verfügbaren Champions.</p>
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
    }
  },
})
</script>

<style scoped>
.champion-card {
  animation: cardFloat 4s ease-in-out infinite;
}

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

.champion-avatar {
  animation: avatarRotate 6s linear infinite;
}

@keyframes avatarRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 27, 75, 0.3);
  border-radius: 8px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(168, 85, 247, 0.8) 0%, rgba(236, 72, 153, 0.8) 100%);
  border-radius: 8px;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(168, 85, 247, 1) 0%, rgba(236, 72, 153, 1) 100%);
}
</style>
