<template>
  <div class="relative w-full">
    <!-- Ultra-Kompakte Tab Navigation -->
    <div class="flex justify-center mb-2">
      <div class="flex bg-amber-100 rounded-lg border border-amber-300 shadow-sm p-0.5">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="
            activeTab === tab.id
              ? 'bg-amber-400 text-amber-900 shadow-sm'
              : 'text-amber-700 hover:bg-amber-200'
          "
          class="flex items-center gap-1 px-3 py-1.5 font-semibold transition rounded-md text-lg"
          @click="activeTab = tab.id"
        >
          <span>{{ tab.icon }}</span>
          <span class="hidden sm:inline">{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- Ultra-Kompakter Content -->
    <div
      class="w-full h-[600px] p-4 bg-gradient-to-br from-amber-100 via-yellow-100 to-orange-100 rounded-2xl"
    >
      <component :is="currentComponent" v-bind="currentProps" class="h-full" />
    </div>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent, computed, onMounted } from 'vue'
import ChampionLobbyComponent from '../ChampionLobbyComponent.vue'
import IdleGameComponent from './idle/IdleGameComponent.vue'
import BattleResultComponent from './battle/BattleResultComponent.vue'
import { useGameStore } from '../../stores/gameStore'
import { useBattleStore } from '../../stores/battleStore'

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
    const battleStore = useBattleStore()

    // Initial Battle State
    const initialBattleResult = ref(null)
    const initialMmrChange = ref(0)
    const initialLpChange = ref(0)
    const isInitialBattleReady = ref(false)

    const tabs = [
      { id: 'idle', label: 'Idle', icon: '🎵' },
      { id: 'battle', label: 'Battle', icon: '⚔️' },
      { id: 'champions', label: 'Champions', icon: '🏆' },
    ]

    const currentComponent = computed(() => {
      switch (activeTab.value) {
        case 'idle':
          return IdleGameComponent
        case 'battle':
          return BattleResultComponent
        case 'champions':
          return ChampionLobbyComponent
        default:
          return IdleGameComponent
      }
    })

    const currentProps = computed(() => {
      if (activeTab.value === 'battle' && isInitialBattleReady.value) {
        return {
          result: initialBattleResult.value,
          mmrChange: initialMmrChange.value,
          lpChange: initialLpChange.value,
        }
      } else if (activeTab.value === 'battle') {
        // Loading state bis der erste Battle simuliert ist
        return {
          result: {
            won: null,
            opponent: {
              name: 'Lade ersten Battle...',
              mmr: gameStore.mmr,
              power: gameStore.totalPower,
              rank: gameStore.currentRank,
            },
            winProbability: 0.5,
          },
          mmrChange: 0,
          lpChange: 0,
        }
      }
      return {}
    })

    // Ersten Battle beim Mount simulieren
    async function simulateInitialBattle() {
      const oldMmr = gameStore.mmr
      const oldLp = gameStore.currentRank.lp

      // Ersten Battle simulieren
      const battleResult = await battleStore.simulateBattle(gameStore.mmr)

      initialBattleResult.value = battleResult
      initialMmrChange.value = gameStore.mmr - oldMmr
      initialLpChange.value = gameStore.currentRank.lp - oldLp
      isInitialBattleReady.value = true
    }

    onMounted(async () => {
      // Ersten Battle sofort simulieren
      await simulateInitialBattle()
    })

    return {
      activeTab,
      tabs,
      currentComponent,
      currentProps,
      isInitialBattleReady,
    }
  },
})
</script>
