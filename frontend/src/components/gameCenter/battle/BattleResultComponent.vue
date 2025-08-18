<template>
  <div
    class="relative w-full h-full overflow-hidden bg-center bg-no-repeat bg-cover bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
    style="
      background-image:
        linear-gradient(rgba(30, 27, 75, 0.7), rgba(88, 28, 135, 0.8)), url('img/BardBattle.png');
      background-color: #1e1b4b;
    "
  >
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute w-32 h-32 bg-purple-500 rounded-full top-4 left-4 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute bg-pink-500 rounded-full top-4 right-4 w-28 h-28 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute w-24 h-24 bg-yellow-500 rounded-full bottom-4 left-1/2 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <!-- Kompakter Battle Result Header -->
    <div
      class="flex flex-row items-center justify-between w-full p-2 border-b shadow-lg backdrop-blur-lg bg-white/10 border-white/20"
    >
      <!-- Battle Counter -->
      <div class="flex flex-col items-center justify-center w-1/4">
        <span
          class="text-lg font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
          >Battle #{{ currentBattleId }}</span
        >
      </div>

      <!-- Kompakter Battle Result -->
      <div class="flex flex-col items-center justify-center w-1/2 h-20 text-center">
        <h2
          class="font-bold transition-opacity duration-300 text-1xl battle-title drop-shadow-lg"
          :class="[
            currentResult.won ? 'text-green-400' : 'text-red-400',
            showBattleResult ? 'opacity-100' : 'opacity-0',
          ]"
        >
          <span class="text-base">{{ currentResult.won ? '🏆' : '💀' }}</span>
          <div
            class="mt-1 text-base text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
          >
            {{ currentResult.won ? 'VICTORY!' : 'DEFEAT!' }}
          </div>
        </h2>
        <div
          v-if="showLpChange && showBattleResult"
          class="flex items-center justify-center px-2 py-1 font-bold transition-all duration-300 border rounded-xl lp-change-container backdrop-blur-sm"
          :class="[
            currentLpChange >= 0
              ? 'text-green-300 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/30'
              : 'text-red-300 bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/30',
          ]"
        >
          <span class="mr-2 text-sm">{{ currentLpChange >= 0 ? '📈' : '📉' }}</span>
          <span>{{ currentLpChange >= 0 ? '+' : '' }}{{ currentLpChange }} LP</span>
        </div>
      </div>

      <!-- Kompakte Auto Battle Controls -->
      <div class="flex flex-col items-center w-1/4">
        <div
          v-if="isAutoBattleActive"
          class="flex items-center px-4 py-2 text-xs font-bold border shadow-lg countdown-container bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 rounded-xl backdrop-blur-sm"
        >
          <span class="mr-2 text-lg animate-spin">⏱️</span>
          <span class="text-purple-300">
            Nächstes Battle:
            <strong
              class="text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
              >{{ timeUntilNextBattle }}s</strong
            >
          </span>
        </div>
      </div>
    </div>

    <!-- Kompakte Battle Display -->
    <div class="relative z-10 flex flex-row p-4 space-x-2 battle-display">
      <!-- Chat Panel -->
      <div class="flex items-center justify-center w-1/4">
        <div
          class="p-2 transition-all duration-300 border shadow-lg chat-panel-wrapper bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-xl border-purple-400/30 backdrop-blur-sm"
        >
          <ChatPanelComponent />
        </div>
      </div>

      <!-- Kompakte LoL Loading Screen -->
      <div class="w-1/2">
        <div
          class="flex flex-col items-center justify-center p-4 border shadow-2xl bg-gradient-to-br from-white/10 to-purple-500/10 rounded-2xl border-purple-400/30 backdrop-blur-lg"
        >
          <!-- Team 1 -->
          <div class="mb-4">
            <div class="flex flex-row items-end justify-center space-x-3">
              <div
                v-for="(champ, idx) in battleStore.team1"
                :key="'team1-' + idx"
                class="flex flex-col items-center champion-card"
              >
                <div
                  class="relative flex items-center justify-center w-20 h-20 transition-all duration-300 group hover:scale-110"
                >
                  <div
                    class="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 animate-pulse opacity-60"
                  ></div>
                  <img
                    :src="battleStore.getChampionImage(champ.name)"
                    class="relative z-10 object-cover w-16 h-16 transition-all duration-300 border-2 border-blue-400 rounded-full drop-shadow-xl"
                    :alt="champ.name"
                  />
                  <div
                    v-if="champ.name === 'Bard'"
                    class="absolute inset-0 border-4 border-purple-400 rounded-full pointer-events-none animate-pulse"
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
                    class="absolute bottom-0 right-0 z-20 w-8 h-8 border rounded-full bg-white/90 border-purple-400/50 drop-shadow-lg backdrop-blur-sm"
                    :alt="champ.rank + ' Border'"
                  />
                </div>
                <span
                  class="px-2 py-1 mt-2 text-sm font-bold text-purple-300 border rounded-lg bg-gradient-to-r from-purple-500/20 to-purple-600/10 border-purple-400/30 backdrop-blur-sm"
                  :title="champ.name"
                >
                  {{ champ.name.length > 8 ? champ.name.slice(0, 8) + '...' : champ.name }}
                </span>
                <div
                  class="flex flex-row items-center gap-2 px-2 py-1 mt-1 text-xs border rounded border-white/20 bg-gradient-to-r from-white/10 to-purple-500/10 backdrop-blur-sm"
                >
                  <span class="font-bold text-green-300">{{ champ.kills }}K</span>
                  <span class="font-bold text-red-300">{{ champ.deaths }}D</span>
                  <span class="font-bold text-blue-300">{{ champ.assists }}A</span>
                </div>
              </div>
            </div>
          </div>

          <!-- VS Divider -->
          <div
            class="my-4 text-3xl font-extrabold text-transparent vs-divider bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text drop-shadow-lg animate-pulse"
          >
            ⚔️ VS ⚔️
          </div>

          <!-- Team 2 -->
          <div class="mt-4">
            <div class="flex flex-row items-start justify-center space-x-3">
              <div
                v-for="(champ, idx) in battleStore.team2"
                :key="'team2-' + idx"
                class="flex flex-col items-center champion-card"
              >
                <div
                  class="relative flex items-center justify-center w-20 h-20 transition-all duration-300 group hover:scale-110"
                >
                  <div
                    class="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-red-600 animate-pulse opacity-60"
                  ></div>
                  <img
                    :src="battleStore.getChampionImage(champ.name)"
                    class="relative z-10 object-cover w-16 h-16 transition-all duration-300 border-2 border-red-400 rounded-full drop-shadow-xl"
                    :alt="champ.name"
                  />
                  <img
                    v-if="champ.rank"
                    :src="getBorderImage(champ.rank)"
                    class="absolute bottom-0 right-0 z-20 w-8 h-8 border rounded-full bg-white/90 border-red-400/50 drop-shadow-lg backdrop-blur-sm"
                    :alt="champ.rank + ' Border'"
                  />
                </div>
                <span
                  class="px-2 py-1 mt-2 text-sm font-bold text-red-300 border rounded-lg border-red-400/30 bg-gradient-to-r from-red-500/20 to-red-600/10 backdrop-blur-sm"
                >
                  {{ champ.name.length > 8 ? champ.name.slice(0, 8) + '...' : champ.name }}
                </span>
                <div
                  class="flex flex-row items-center gap-2 px-2 py-1 mt-1 text-xs border rounded border-white/20 bg-gradient-to-r from-white/10 to-red-500/10 backdrop-blur-sm"
                >
                  <span class="font-bold text-green-300">{{ champ.kills }}K</span>
                  <span class="font-bold text-red-300">{{ champ.deaths }}D</span>
                  <span class="font-bold text-blue-300">{{ champ.assists }}A</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MiniMap -->
      <div class="flex items-center justify-center w-1/4">
        <div
          class="p-2 transition-all duration-300 border shadow-lg minimap-wrapper bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-xl border-purple-400/30 backdrop-blur-sm"
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
import { defineComponent, computed } from 'vue'
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

  setup() {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()

    const score = computed(() => ({
      team1Kills: battleStore.team1.reduce((sum, champ) => sum + champ.kills, 0),
      team2Kills: battleStore.team2.reduce((sum, champ) => sum + champ.kills, 0),
    }))

    const showBattleResult = computed(() => timeUntilNextBattle.value <= 2)

    // Auto Battle State
    const isAutoBattleActive = computed(() => battleStore.autoBattleEnabled)
    const timeUntilNextBattle = computed(() => battleStore.timeUntilNextBattle)
    const currentBattleId = computed(() => battleStore.currentBattleId)

    const currentResult = computed(() => battleStore.lastAutoBattleResult)

    const currentLpChange = computed(() => {
      if (battleStore.lastAutoBattleResult) {
        return battleStore.currentRank.lp - battleStore.autoBattleOldLP
      }
      return null
    })

    const showLpChange = computed(() => {
      return currentLpChange.value !== null && battleStore.lastAutoBattleResult
    })

    const currentMmrChange = computed(() => {
      if (battleStore.lastAutoBattleResult) {
        return battleStore.mmr - battleStore.autoBattleOldMMR
      }
    })

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

    return {
      currentResult,
      currentLpChange,
      currentMmrChange,
      isAutoBattleActive,
      timeUntilNextBattle,
      currentBattleId,
      getBorderImage,
      gameStore,
      battleStore,
      score,
      showBattleResult,
      showLpChange,
    }
  },
})
</script>

<style scoped>
/* Futuristische Animationen */
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}

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
  filter: drop-shadow(0 2px 4px rgba(168, 85, 247, 0.6));
}

.countdown-container {
  animation: countdownPulse 1s ease-in-out infinite;
}

@keyframes countdownPulse {
  0%,
  100% {
    box-shadow: 0 2px 8px rgba(168, 85, 247, 0.3);
  }
  50% {
    box-shadow: 0 4px 12px rgba(168, 85, 247, 0.5);
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
  box-shadow: 0 8px 25px rgba(168, 85, 247, 0.3);
}

/* Glassmorphism */
.backdrop-blur-lg {
  backdrop-filter: blur(16px);
}
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}
</style>
