<template>
  <div class="">
    <!-- Battle Result Header -->
    <div
      class="relative flex flex-row items-center justify-between w-full px-2 mb-6 text-center"
      style="min-height: 3.5rem"
    >
      <h2
        class="mx-auto text-4xl font-bold"
        :class="currentResult.won ? 'text-green-600' : 'text-red-600'"
      >
        {{ currentResult.won ? 'VICTORY!' : 'DEFEAT!' }}
      </h2>
      <BattleMessageComponent />
      <span
        v-if="typeof currentLpChange === 'number' && currentLpChange !== 0"
        class="min-w-[90px] text-2xl font-bold border rounded-lg shadow px-4 py-1 flex items-center justify-center absolute right-0"
        :class="
          currentLpChange >= 0
            ? 'text-green-700 bg-green-100 border-green-300'
            : 'text-red-700 bg-red-100 border-red-300'
        "
        style="right: 0"
      >
        {{ currentLpChange >= 0 ? '+' : '' }}{{ currentLpChange }} LP
      </span>
    </div>

    <!-- Auto Battle Controls -->
    <div class="flex items-center justify-center mb-4 space-x-4">
      <div
        v-if="isAutoBattleActive"
        class="flex items-center px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg border-amber-300"
      >
        <span class="mr-2">⏱️</span>
        Nächstes Battle in: <strong class="ml-1">{{ timeUntilNextBattle }}s</strong>
      </div>

      <button
        v-if="!isAutoBattleActive"
        @click="simulateNewBattle"
        class="px-4 py-2 font-semibold text-blue-700 transition bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200"
      >
        🎲 Manual Battle
      </button>
    </div>

    <!-- Rest of your existing battle display... -->
    <div
      class="flex flex-row bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 rounded-2xl border-amber-300/40 backdrop-blur-md"
    >
      <!-- Chat Panel -->
      <div class="flex items-center justify-center w-1/4 min-h-max">
        <ChatPanelComponent :team1="team1" :team2="team2" :battle-id="currentBattleId" />
      </div>

      <!-- LoL Loading Screen (5 vs 5) -->
      <div class="w-1/2 border-l-2 border-r-2 min-h-max">
        <!-- Main Content -->
        <div class="flex flex-col items-center justify-center p-4">
          <!-- Team 1 (oben) -->
          <div class="flex flex-row items-end justify-center mb-4 space-x-4">
            <div
              v-for="(champ, idx) in team1"
              :key="'team1-' + idx"
              class="flex flex-col items-center"
            >
              <div
                class="relative flex items-center justify-center w-24 h-24 transition-transform duration-300 group hover:scale-110"
              >
                <img
                  :src="getChampionImage(champ.name)"
                  class="object-cover w-24 h-24 transition-all duration-300 border-4 border-blue-500 rounded-full drop-shadow-lg group-hover:shadow-2xl"
                  style="z-index: 1"
                  :alt="champ.name"
                />
                <div
                  v-if="champ.name === 'Bard'"
                  class="absolute inset-0 border-4 rounded-full pointer-events-none border-amber-500"
                  style="z-index: 2"
                ></div>
                <img
                  v-if="champ.rank"
                  :src="getBorderImage(champ.rank)"
                  class="absolute bottom-0 right-0 w-10 h-10 bg-white border-2 border-white rounded-full drop-shadow-lg"
                  style="z-index: 3"
                  :alt="champ.rank + ' Border'"
                />
              </div>
              <span
                class="mt-2 text-base font-bold text-gray-900 bg-white/80 px-2 py-0.5 rounded drop-shadow-lg border border-amber-200"
                :title="champ.name"
              >
                {{ champ.name.length > 10 ? champ.name.slice(0, 10) + '...' : champ.name }}
              </span>
              <span
                class="text-xs mt-1 text-gray-700 bg-white/70 px-2 py-0.5 rounded shadow border border-gray-200 flex flex-row gap-2 items-center"
              >
                <span class="font-semibold text-green-700">{{ champ.kills }} K</span>
                <span class="font-semibold text-red-700">{{ champ.deaths }} D</span>
                <span class="font-semibold text-blue-700">{{ champ.assists }} A</span>
              </span>
            </div>
          </div>

          <div class="mb-2 text-2xl font-bold text-amber-700">VS</div>

          <div class="flex flex-row items-start justify-center mt-2 space-x-4">
            <div
              v-for="(champ, idx) in team2"
              :key="'team2-' + idx"
              class="flex flex-col items-center"
            >
              <div
                class="relative flex items-center justify-center w-24 h-24 transition-transform duration-300 group hover:scale-110"
              >
                <img
                  :src="getChampionImage(champ.name)"
                  class="object-cover w-24 h-24 transition-all duration-300 border-4 border-red-500 rounded-full shadow-xl group-hover:shadow-2xl"
                  style="z-index: 1"
                  :alt="champ.name"
                />
                <img
                  v-if="champ.rank"
                  :src="getBorderImage(champ.rank)"
                  class="absolute bottom-0 right-0 w-10 h-10 bg-white border-2 border-white rounded-full shadow-md"
                  style="z-index: 2"
                  :alt="champ.rank + ' Border'"
                />
              </div>
              <span
                class="mt-2 text-base font-bold text-gray-900 bg-white/80 px-2 py-0.5 rounded shadow-sm border border-blue-200"
              >
                {{ champ.name }}
              </span>
              <span
                class="text-xs mt-1 text-gray-700 bg-white/70 px-2 py-0.5 rounded shadow border border-gray-200 flex flex-row gap-2 items-center"
              >
                <span class="font-semibold text-green-700">{{ champ.kills }} K</span>
                <span class="font-semibold text-red-700">{{ champ.deaths }} D</span>
                <span class="font-semibold text-blue-700">{{ champ.assists }} A</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center w-1/4 min-h-max">
        <MiniMapComponent :battle-id="currentBattleId" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useGameStore } from '../../../stores/gameStore'
import { ref, onMounted, defineComponent } from 'vue'
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
    const currentBattleId = ref(0)

    // Auto Battle State
    const isAutoBattleActive = ref(false)
    const autoBattleCountdown = ref<any>(null)
    const timeUntilNextBattle = ref(0)
    const autoBattleInterval = 7000 // 7 Sekunden

    // Current Battle State
    const currentResult = ref(props.result)
    const currentLpChange = ref(props.lpChange)
    const currentMmrChange = ref(props.mmrChange)
    const oldMmr = ref(gameStore.mmr)
    const oldLp = ref(gameStore.currentRank.lp)

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
        default:
          return '/img/Enemy.png'
      }
    }

    function getStats() {
      return {
        kills: 0,
        deaths: 0,
        assists: 0,
      }
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

    async function simulateNewBattle() {
      console.log('Simulating new battle...')

      // Speichere alte Werte
      oldMmr.value = gameStore.mmr
      oldLp.value = gameStore.currentRank.lp

      // Simuliere Battle
      const battleResult = await battleStore.simulateBattle(gameStore.mmr)

      // Berechne Änderungen
      const newMmrChange = gameStore.mmr - oldMmr.value
      const newLpChange = gameStore.currentRank.lp - oldLp.value

      // Update current battle state
      currentResult.value = battleResult
      currentMmrChange.value = newMmrChange
      currentLpChange.value = newLpChange

      // Increment battle ID to trigger chat reload
      currentBattleId.value++

      // Refresh teams für neue Anzeige
      await refreshTeams()

      console.log('Battle completed:', {
        won: battleResult.won,
        mmrChange: newMmrChange,
        lpChange: newLpChange,
      })
    }

    function startCountdown() {
      timeUntilNextBattle.value = autoBattleInterval / 1000

      autoBattleCountdown.value = setInterval(() => {
        timeUntilNextBattle.value--
        if (timeUntilNextBattle.value <= 0) {
          clearInterval(autoBattleCountdown.value)
        }
      }, 1000)
    }

    async function startAutoBattle() {
      if (isAutoBattleActive.value) return

      isAutoBattleActive.value = true
      console.log('Starting auto battle...')

      const runBattleCycle = async () => {
        if (!isAutoBattleActive.value) return

        // Simuliere neuen Battle
        await simulateNewBattle()

        // Starte Countdown für nächsten Battle
        startCountdown()

        // Schedule nächsten Battle
        setTimeout(runBattleCycle, autoBattleInterval)
      }

      // Ersten Battle sofort ausführen
      await runBattleCycle()
    }

    function randomStatsTick() {
      ;[team1.value, team2.value].forEach((team) => {
        team.forEach((champ) => {
          if (Math.random() < 0.5) champ.kills += Math.round(Math.random() * 3)
          if (Math.random() < 0.3) champ.deaths += Math.round(Math.random() * 2)
          if (Math.random() < 0.7) champ.assists += Math.round(Math.random() * 7)
        })
      })
      setTimeout(randomStatsTick, gameStore.gameSpeed)
    }

    onMounted(async () => {
      await refreshTeams()
      startAutoBattle()
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
      simulateNewBattle,
      gameStore,
      battleStore,
      startAutoBattle,
    }
  },
})
</script>
