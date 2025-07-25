<template>
  <div
    class="relative w-full p-8 mx-4 border-4 shadow-2xl bg-gradient-to-br from-amber-50 via-yellow-100 to-orange-100 backdrop-blur-sm rounded-3xl border-amber-300"
  >
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
      <BattleResultComponent
        ref="autoBattleResultComponentRef"
        :key="autoBattleResultKey"
        :result="autoBattleResult || { won: true, opponent: { name: 'Lade nächsten Kampf...' } }"
        :mmr-change="autoBattleMmrChange"
        :lp-change="autoBattleLpChange"
      />
    </div>

    <div v-else-if="activeTab === 'champions'" class="min-h-[600px]">
      <ChampionLobbyComponent />
    </div>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent, onMounted, watch, onUnmounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useBattleStore } from '../../stores/battleStore'
import ChampionLobbyComponent from '../ChampionLobbyComponent.vue'
import IdleGameComponent from './idle/IdleGameComponent.vue'
import BattleResultComponent from './battle/BattleResultComponent.vue'

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

    // AutoBattle result state
    const autoBattleResult = ref(null)
    const autoBattleMmrChange = ref(0)
    const autoBattleLpChange = ref(0)
    const autoBattleResultKey = ref(0)
    const autoBattleResultComponentRef = ref(null)

    function handleAutoBattleResult() {
      if (battleStore.lastAutoBattleResult && battleStore.showAutoBattleResult) {
        // Verwende die im Store gespeicherten alten Werte
        const oldMMR = battleStore.autoBattleOldMMR
        const oldLP = battleStore.autoBattleOldLP

        autoBattleMmrChange.value = gameStore.mmr - oldMMR
        autoBattleLpChange.value = gameStore.currentRank.lp - oldLP

        autoBattleResult.value = battleStore.lastAutoBattleResult
        autoBattleResultKey.value++

        // Champions neu generieren
        if (autoBattleResultComponentRef.value && autoBattleResultComponentRef.value.refreshTeams) {
          autoBattleResultComponentRef.value.refreshTeams()
        }

        // Reset battleStore state
        battleStore.lastAutoBattleResult = null
        battleStore.showAutoBattleResult = false
      }
    }

    // Auto Battle beim App-Start automatisch starten
    onMounted(() => {
      // Auto Battle sofort beim Laden der Komponente starten
      if (!battleStore.autoBattleEnabled) {
        console.log('Auto Battle started')
        battleStore.startAutoBattle()
        console.log(battleStore.showAutoBattleResult)
      }
    })

    // Watch for AutoBattle results - WICHTIG für kontinuierliche Kämpfe
    watch(
      () => battleStore.showAutoBattleResult,
      (newValue) => {
        console.log('Auto Battle result received', newValue)
        if (newValue) {
          console.log('Auto Battle result received')
          handleAutoBattleResult()
        }
      },
    )

    // Cleanup beim Unmount (optional, falls die Komponente entladen wird)
    onUnmounted(() => {
      // Auto Battle läuft weiter, auch wenn diese Komponente entladen wird
      // Kein battleStore.stopAutoBattle() hier!
    })

    return {
      activeTab,
      gameStore,
      battleStore,
      autoBattleResult,
      autoBattleMmrChange,
      autoBattleLpChange,
      autoBattleResultKey,
      autoBattleResultComponentRef,
    }
  },
})
</script>
