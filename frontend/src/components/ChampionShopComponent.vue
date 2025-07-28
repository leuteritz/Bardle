<template>
  <div
    class="relative max-w-4xl p-8 mx-auto border-4 shadow-2xl shop-container bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-3xl border-amber-300"
  >
    <!-- Header -->
    <div class="mb-8 text-center">
      <h2 class="mb-4 text-5xl font-extrabold shop-title text-amber-800 drop-shadow-lg">
        🛒 Champion Shop
      </h2>
      <div
        class="w-32 h-1 mx-auto rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
      ></div>
      <p class="mt-4 text-lg font-semibold text-amber-700">
        Erweitere dein Team mit mächtigen Champions!
      </p>
    </div>

    <!-- Champions Grid -->
    <div class="champions-grid max-h-[400px] overflow-y-auto pr-4">
      <div class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="champion in availableChampions"
          :key="champion.name"
          class="relative flex flex-col items-center p-6 transition-all duration-500 border-2 shadow-lg champion-card bg-gradient-to-br from-white to-amber-50 rounded-2xl border-amber-200 hover:scale-105 hover:shadow-amber-300/50 hover:shadow-xl"
        >
          <!-- Champion Avatar Placeholder -->
          <div
            class="relative flex items-center justify-center w-20 h-20 mb-4 border-4 rounded-full shadow-lg champion-avatar bg-gradient-to-br from-amber-200 to-yellow-300 border-amber-400"
          >
            <span class="text-2xl">⚔️</span>
            <div
              class="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/30"
            ></div>
          </div>

          <!-- Champion Name -->
          <div class="mb-4 text-center champion-name">
            <span class="text-lg font-bold text-amber-900 drop-shadow-sm">
              {{ champion.name.length > 12 ? champion.name.slice(0, 12) + '...' : champion.name }}
            </span>
          </div>

          <!-- Buy Button -->
          <button
            class="w-full px-4 py-3 font-bold text-white transition-all duration-300 shadow-lg buy-button rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              champion.owned
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105 hover:shadow-green-400/50'
            "
            :disabled="champion.owned"
            @click="buyChampion(champion.name)"
          >
            <span v-if="!champion.owned" class="flex items-center justify-center gap-2">
              <span>💰</span>
              <span>Kaufen</span>
            </span>
            <span v-else class="flex items-center justify-center gap-2">
              <span>✅</span>
              <span>Gekauft</span>
            </span>
          </button>

          <!-- Glow Effect -->
          <div
            class="absolute inset-0 transition-opacity duration-500 opacity-0 pointer-events-none rounded-2xl bg-gradient-to-r from-amber-400/0 via-amber-400/20 to-amber-400/0 champion-glow"
          ></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="availableChampions.length === 0" class="py-12 text-center empty-state">
        <div class="mb-4 text-6xl">🎉</div>
        <h3 class="mb-2 text-2xl font-bold text-amber-800">Alle Champions gekauft!</h3>
        <p class="text-amber-700">Du besitzt bereits alle verfügbaren Champions.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, defineComponent, computed } from 'vue'
import { useBattleStore } from '../stores/battleStore'

// Champion-Typ
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
        console.log(battleStore.ownedChampions)
      }
    }

    // Nur Champions anzeigen, die noch nicht gekauft wurden
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
.shop-container {
  animation: shopSlideIn 0.8s ease-out;
  position: relative;
  overflow: hidden;
}

.shop-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(251, 191, 36, 0.1), transparent);
  animation: shimmer 5s linear infinite;
  pointer-events: none;
}

@keyframes shopSlideIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

.shop-title {
  animation: titleBounce 2s ease-in-out infinite;
}

@keyframes titleBounce {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.champions-grid {
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.5) transparent;
}

.champions-grid::-webkit-scrollbar {
  width: 8px;
}

.champions-grid::-webkit-scrollbar-track {
  background: rgba(251, 191, 36, 0.1);
  border-radius: 10px;
}

.champions-grid::-webkit-scrollbar-thumb {
  background: rgba(251, 191, 36, 0.5);
  border-radius: 10px;
}

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
    transform: translateY(-5px);
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

.buy-button {
  position: relative;
  overflow: hidden;
}

.buy-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.buy-button:hover::before {
  left: 100%;
}

.empty-state {
  animation: emptyBounce 1s ease-out;
}

@keyframes emptyBounce {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
