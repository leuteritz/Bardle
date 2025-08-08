<template>
  <div
    class="w-full h-full overflow-hidden bg-center bg-no-repeat bg-cover"
    style="background-image: url('img/BardBattle.png'); background-color: #f7fafc"
  >
    <!-- Kompakter Battle Result Header -->
    <div class="flex flex-row items-center justify-between w-full p-4 text-center">
      <!-- Battle Counter -->
      <div class="flex flex-col items-center w-1/4">
        <span class="text-xs font-medium text-amber-700">Battle #{{ currentBattleId }}</span>
        <div class="w-12 h-0.5 bg-amber-300 rounded-full mt-1">
          <div
            class="h-full transition-all duration-500 rounded-full bg-amber-500"
            :style="{ width: `${(currentBattleId % 10) * 10}%` }"
          ></div>
        </div>
      </div>

      <!-- Kompakter Battle Result -->
      <div class="flex flex-col items-center w-1/2">
        <h2
          class="font-bold transition-opacity duration-300 text-1xl battle-title drop-shadow-md"
          :class="[
            currentResult.won ? 'text-green-600' : 'text-red-600',
            showBattleResult ? 'opacity-100' : 'opacity-0',
          ]"
        >
          <span class="text-2xl">{{ currentResult.won ? '🏆' : '💀' }}</span>
          <div class="mt-1 text-xl">{{ currentResult.won ? 'VICTORY!' : 'DEFEAT!' }}</div>
        </h2>
        <div
          class="flex items-center justify-center px-2 py-1 font-bold transition-all duration-300 border rounded-xl lp-change-container"
          :class="[
            currentLpChange >= 0
              ? 'text-green-800 bg-gradient-to-r from-green-100 to-green-200 border-green-300'
              : 'text-red-800 bg-gradient-to-r from-red-100 to-red-200 border-red-300',
            showBattleResult && currentLpChange !== 0 ? 'opacity-100' : 'opacity-0',
          ]"
        >
          <span class="mr-2 text-sm">{{ currentLpChange >= 0 ? '📈' : '📉' }}</span>
          <span>{{ currentLpChange >= 0 ? '+' : '' }}{{ currentLpChange }} LP</span>
        </div>
      </div>

      <!-- Kompakte Auto Battle Controls -->
      <div class="flex flex-col items-center w-1/4 space-x-4">
        <div
          v-if="isAutoBattleActive"
          class="flex items-center px-4 py-2 text-xs font-bold border shadow-md countdown-container bg-gradient-to-r from-white to-amber-50 border-amber-300 rounded-xl"
        >
          <span class="mr-2 text-lg animate-spin">⏱️</span>
          <span class="text-amber-800">
            Nächstes Battle: <strong class="text-amber-900">{{ timeUntilNextBattle }}s</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- Kompakte Battle Display -->
    <div class="flex flex-row space-x-2 battle-display">
      <!-- Chat Panel -->
      <div class="flex items-center justify-center w-1/4">
        <div
          class="p-2 border shadow-md chat-panel-wrapper bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-amber-300"
        >
          <ChatPanelComponent :team1="team1" :team2="team2" :battle-id="currentBattleId" />
        </div>
      </div>

      <!-- Kompakte LoL Loading Screen -->
      <div class="w-1/2">
        <div
          class="flex flex-col items-center justify-center p-4 border shadow-inner bg-gradient-to-br from-white/80 to-amber-50/80 rounded-2xl border-amber-200"
        >
          <!-- Team 1 -->
          <div class="mb-4">
            <div class="flex flex-row items-end justify-center space-x-3">
              <div
                v-for="(champ, idx) in team1"
                :key="'team1-' + idx"
                class="flex flex-col items-center champion-card"
              >
                <div
                  class="relative flex items-center justify-center w-20 h-20 transition-all duration-300 group hover:scale-110"
                >
                  <div
                    class="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 animate-pulse"
                  ></div>
                  <img
                    :src="getChampionImage(champ.name)"
                    class="relative z-10 object-cover w-16 h-16 transition-all duration-300 border-2 border-blue-500 rounded-full drop-shadow-lg"
                    :alt="champ.name"
                  />
                  <div
                    v-if="champ.name === 'Bard'"
                    class="absolute inset-0 border-4 rounded-full pointer-events-none border-amber-500 animate-pulse"
                    style="z-index: 15"
                  ></div>
                  <div
                    v-if="champ.name === 'Bard'"
                    class="absolute text-2xl transform -translate-x-1/2 leader-crown -top-3 left-1/2 animate-bounce"
                  >
                    👑
                  </div>
                  <img
                    v-if="champ.rank"
                    :src="getBorderImage(champ.rank)"
                    class="absolute bottom-0 right-0 z-20 w-8 h-8 bg-white border border-white rounded-full drop-shadow-md"
                    :alt="champ.rank + ' Border'"
                  />
                </div>
                <span
                  class="px-2 py-1 mt-2 text-sm font-bold text-gray-900 border rounded-lg bg-gradient-to-r from-white to-amber-50 border-amber-200"
                  :title="champ.name"
                >
                  {{ champ.name.length > 8 ? champ.name.slice(0, 8) + '...' : champ.name }}
                </span>
                <div
                  class="flex flex-row items-center gap-2 px-2 py-1 mt-1 text-xs border border-gray-200 rounded bg-gradient-to-r from-white to-gray-50"
                >
                  <span class="font-bold text-green-700">{{ champ.kills }}K</span>
                  <span class="font-bold text-red-700">{{ champ.deaths }}D</span>
                  <span class="font-bold text-blue-700">{{ champ.assists }}A</span>
                </div>
              </div>
            </div>
          </div>

          <!-- VS Divider -->
          <div
            class="my-4 text-3xl font-extrabold vs-divider text-amber-700 drop-shadow-md animate-pulse"
          >
            ⚔️ VS ⚔️
          </div>

          <!-- Team 2 -->
          <div class="mt-4">
            <div class="flex flex-row items-start justify-center space-x-3">
              <div
                v-for="(champ, idx) in team2"
                :key="'team2-' + idx"
                class="flex flex-col items-center champion-card"
              >
                <div
                  class="relative flex items-center justify-center w-20 h-20 transition-all duration-300 group hover:scale-110"
                >
                  <div
                    class="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-red-600 animate-pulse"
                  ></div>
                  <img
                    :src="getChampionImage(champ.name)"
                    class="relative z-10 object-cover w-16 h-16 transition-all duration-300 border-2 border-red-500 rounded-full drop-shadow-lg"
                    :alt="champ.name"
                  />
                  <img
                    v-if="champ.rank"
                    :src="getBorderImage(champ.rank)"
                    class="absolute bottom-0 right-0 z-20 w-8 h-8 bg-white border border-white rounded-full drop-shadow-md"
                    :alt="champ.rank + ' Border'"
                  />
                </div>
                <span
                  class="px-2 py-1 mt-2 text-sm font-bold text-gray-900 border border-blue-200 rounded-lg bg-gradient-to-r from-white to-blue-50"
                >
                  {{ champ.name.length > 8 ? champ.name.slice(0, 8) + '...' : champ.name }}
                </span>
                <div
                  class="flex flex-row items-center gap-2 px-2 py-1 mt-1 text-xs border border-gray-200 rounded bg-gradient-to-r from-white to-gray-50"
                >
                  <span class="font-bold text-green-700">{{ champ.kills }}K</span>
                  <span class="font-bold text-red-700">{{ champ.deaths }}D</span>
                  <span class="font-bold text-blue-700">{{ champ.assists }}A</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MiniMap -->
      <div class="flex items-center justify-center w-1/4">
        <div
          class="p-2 border shadow-md minimap-wrapper bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-amber-300"
        >
          <MiniMapComponent :battle-id="currentBattleId" :score="score" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Script bleibt unverändert
import { useGameStore } from '../../../stores/gameStore'
import { ref, onMounted, defineComponent, computed } from 'vue'
import MiniMapComponent from './MiniMapComponent.vue'
import ChatPanelComponent from './ChatPanelComponent.vue'
import BattleMessageComponent from './BattleMessageComponent.vue'
import { useBattleStore } from '../../../stores/battleStore'

export default defineComponent({
  name: 'BattleResultComponent',
  components: {
    MiniMapComponent,
    ChatPanelComponent,
    BattleMessageComponent,
  },
  props: {
    result: { type: Object, required: true },
    mmrChange: { type: Number, required: true },
    lpChange: { type: Number, required: true },
  },
  setup(props) {
    const team1 = ref<any[]>([])
    const team2 = ref<any[]>([])
    const gameStore = useGameStore()
    const battleStore = useBattleStore()

    const score = computed(() => ({
      team1Kills: team1.value.reduce((sum, champ) => sum + champ.kills, 0),
      team2Kills: team2.value.reduce((sum, champ) => sum + champ.kills, 0),
    }))

    const showBattleResult = computed(() => timeUntilNextBattle.value <= 1)

    // Auto Battle State
    const isAutoBattleActive = computed(() => battleStore.autoBattleEnabled)
    const timeUntilNextBattle = computed(() => battleStore.timeUntilNextBattle)
    const currentBattleId = computed(() => battleStore.currentBattleId)

    const currentResult = computed(() => battleStore.lastAutoBattleResult || props.result)
    const currentLpChange = computed(() => {
      if (battleStore.lastAutoBattleResult) {
        return gameStore.currentRank.lp - battleStore.autoBattleOldLP
      }
      return props.lpChange
    })
    const currentMmrChange = computed(() => {
      if (battleStore.lastAutoBattleResult) {
        return gameStore.mmr - battleStore.autoBattleOldMMR
      }
      return props.mmrChange
    })

    // Alle bestehenden Funktionen bleiben gleich...
    async function loadChampions() {
      const response = await fetch('/src/config/champion.csv')
      const text = await response.text()
      return text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    }

    function getRandomChampions(champions: string[], count: number) {
      const arr = [...champions]
      const result = []
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * arr.length)
        result.push(arr.splice(idx, 1)[0])
      }
      return result
    }

    function getBorderImage(rank: string) {
      switch (rank) {
        case 'Iron':
          return '/img/RankBorder/RankIron.png'
        case 'Gold':
          return '/img/RankBorder/RankGold.png'
        case 'Silver':
          return '/img/RankBorder/RankSilver.png'
        case 'Bronze':
          return '/img/RankBorder/RankBronze.png'
        case 'Emerald':
          return '/img/RankBorder/RankEmerald.png'
        case 'Diamond':
          return '/img/RankBorder/RankDiamand.png'
        case 'Master':
          return '/img/RankBorder/RankMaster.png'
        case 'Grandmaster':
          return '/img/RankBorder/RankGrandMaster.png'
        case 'Challenger':
          return '/img/RankBorder/RankChallenger.png'
        case 'Platinum':
          return '/img/RankBorder/RankPlatin.png'
      }
    }

    function getChampionImage(name: string) {
      switch (name) {
        case 'Bard':
          return '/img/BardAbilities/Bard.png'
        case name:
          return '/img/champion/' + name + '.jpg'
        default:
          return '/img/Enemy.png'
      }
    }

    function getStats() {
      return { kills: 0, deaths: 0, assists: 0 }
    }

    async function refreshTeams() {
      loadChampions().then((champions) => {
        const selected = getRandomChampions(champions, 5)
        team1.value = [
          { name: 'Bard', rank: gameStore.currentRank.tier, ...getStats() },
          ...battleStore.selectedChampions.map((name) => ({ name, rank: 'Silver', ...getStats() })),
        ]
        team2.value = selected.map((name) => ({ name, rank: 'Silver', ...getStats() }))
      })
    }

    function randomStatsTick() {
      team1.value.forEach((champ) => {
        if (Math.random() < 0.5) champ.kills += Math.round(Math.random() * 3)
        if (Math.random() < 0.3) champ.deaths += Math.round(Math.random() * 2)
        if (Math.random() < 0.7) champ.assists += Math.round(Math.random() * 7)
      })

      team2.value.forEach((champ) => {
        if (Math.random() < 0.5) champ.kills += Math.round(Math.random() * 3)
        if (Math.random() < 0.3) champ.deaths += Math.round(Math.random() * 2)
        if (Math.random() < 0.7) champ.assists += Math.round(Math.random() * 7)
      })

      setTimeout(randomStatsTick, gameStore.gameSpeed)
    }

    onMounted(async () => {
      await refreshTeams()
      await battleStore.initializePersistentAutoBattle()
      randomStatsTick()
    })

    return {
      team1,
      team2,
      currentResult,
      currentLpChange,
      currentMmrChange,
      isAutoBattleActive,
      timeUntilNextBattle,
      currentBattleId,
      getChampionImage,
      getBorderImage,
      refreshTeams,
      gameStore,
      battleStore,
      score,
      showBattleResult,
    }
  },
})
</script>

<style scoped>
/* Kompakte Animationen - reduzierte Intensität */
.battle-container {
  animation: fadeInScale 0.6s ease-out forwards;
}

@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.battle-title {
  animation: titlePulse 2s ease-in-out infinite;
}

@keyframes titlePulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.lp-change-container {
  animation: lpBounce 0.5s ease-out;
}

@keyframes lpBounce {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

.leader-crown {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.countdown-container {
  animation: countdownPulse 1s ease-in-out infinite;
}

@keyframes countdownPulse {
  0%,
  100% {
    box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
  }
  50% {
    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.5);
  }
}

.champion-card {
  animation: cardFloat 4s ease-in-out infinite;
}

@keyframes cardFloat {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-4px);
  }
}

.chat-panel-wrapper:hover,
.minimap-wrapper:hover {
  transform: scale(1.02);
}
</style>
