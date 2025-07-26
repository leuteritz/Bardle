<template>
  <div class="relative w-full p-8 mx-4">
    <!-- Tab Navigation -->
    <div class="flex justify-center mb-6">
      <button
        :class="activeTab === 'idle' ? 'bg-amber-400 text-amber-900' : 'bg-white text-amber-700'"
        class="flex items-center gap-2 px-6 py-2 mr-2 font-bold transition border-2 shadow rounded-xl border-amber-300 hover:bg-amber-200"
        @click="activeTab = 'idle'"
      >
        🎵 Idle
      </button>
      <button
        :class="activeTab === 'battle' ? 'bg-amber-400 text-amber-900' : 'bg-white text-amber-700'"
        class="flex items-center gap-2 px-6 py-2 mr-2 font-bold transition border-2 shadow rounded-xl border-amber-300 hover:bg-amber-200"
        @click="activeTab = 'battle'"
      >
        ⚔️ Battle
      </button>
      <button
        :class="
          activeTab === 'champions' ? 'bg-amber-400 text-amber-900' : 'bg-white text-amber-700'
        "
        class="flex items-center gap-2 px-6 py-2 font-bold transition border-2 shadow rounded-xl border-amber-300 hover:bg-amber-200"
        @click="activeTab = 'champions'"
      >
        🏆 Champions
      </button>
    </div>

    <!-- Tab Content -->
    <div
      v-if="activeTab === 'idle'"
      class="flex flex-col items-center justify-center min-h-[600px]"
    >
      <IdleGameComponent />
    </div>

    <div v-else-if="activeTab === 'battle'" class="min-h-[600px]">
      <BattleResultComponent :result="initialBattleResult" :mmr-change="0" :lp-change="0" />
    </div>

    <div v-else-if="activeTab === 'champions'" class="min-h-[600px]">
      <ChampionLobbyComponent />
    </div>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent } from 'vue'
import ChampionLobbyComponent from '../ChampionLobbyComponent.vue'
import IdleGameComponent from './idle/IdleGameComponent.vue'
import BattleResultComponent from './battle/BattleResultComponent.vue'
import { useGameStore } from '../../stores/gameStore'

export default defineComponent({
  name: 'GameCenterComponent',
  components: {
    ChampionLobbyComponent,
    IdleGameComponent,
    BattleResultComponent,
  },

  setup() {
    const activeTab = ref('idle')
    const gameStore = useGameStore()
    // Initial Battle Result für die erste Anzeige
    const initialBattleResult = {
      won: true,
      opponent: {
        name: 'Bereit für Battle!',
        mmr: gameStore.mmr,
        power: gameStore.totalPower,
        rank: gameStore.currentRank,
      },
      winProbability: 0.5,
    }

    return {
      activeTab,
      initialBattleResult,
    }
  },
})
</script>
