<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useGameStore } from './stores/gameStore'
import { useBattleStore } from './stores/battleStore'
import LevelComponent from './components/LevelComponent.vue'
import AbilityComponent from './components/AbilityComponent.vue'
import BattleResultComponent from './components/BattleResultComponent.vue'

const gameStore = useGameStore()
const battleStore = useBattleStore()

const chimeGainPos = ref({ x: 0, y: 0 })
const chimeGainKey = ref(0)

// Battle result state
const showBattleResult = ref(false)
const battleResult = ref(null)
const mmrChange = ref(0)
const lpChange = ref(0)

// AutoBattle result state
const showAutoBattleResult = ref(false)
const autoBattleResult = ref(null)
const autoBattleMmrChange = ref(0)
const autoBattleLpChange = ref(0)

function handleChimeClick(event) {
  gameStore.addChime()
  chimeGainPos.value = { x: event.clientX, y: event.clientY }
  chimeGainKey.value++
  if (gameStore.chimesForMeep >= gameStore.meepChimeRequirement) {
    setTimeout(() => {
      gameStore.addMeep()
      gameStore.chimesForMeep = 0
    }, 100) // Animation noch anzeigen lassen
  }
}

async function handleBattle() {
  const oldMMR = gameStore.mmr
  const oldLP = gameStore.currentRank.lp

  const result = await battleStore.simulateBattle(gameStore.mmr)

  // Calculate changes
  mmrChange.value = gameStore.mmr - oldMMR
  lpChange.value = gameStore.currentRank.lp - oldLP

  battleResult.value = result
  showBattleResult.value = true
}

function closeBattleResult() {
  showBattleResult.value = false
  battleResult.value = null
}

function handleAutoBattleResult() {
  if (battleStore.lastAutoBattleResult && battleStore.showAutoBattleResult) {
    const oldMMR = gameStore.mmr
    const oldLP = gameStore.currentRank.lp

    // Calculate changes
    autoBattleMmrChange.value = gameStore.mmr - oldMMR
    autoBattleLpChange.value = gameStore.currentRank.lp - oldLP

    autoBattleResult.value = battleStore.lastAutoBattleResult
    showAutoBattleResult.value = true

    // Reset battleStore state
    battleStore.lastAutoBattleResult = null
    battleStore.showAutoBattleResult = false
  }
}

function closeAutoBattleResult() {
  showAutoBattleResult.value = false
  autoBattleResult.value = null
}

onMounted(() => {
  setInterval(() => {
    gameStore.gernerateMeeps()
  }, 1000)
})

// Watch for AutoBattle results
watch(
  () => battleStore.showAutoBattleResult,
  (newValue) => {
    if (newValue) {
      handleAutoBattleResult()
    }
  },
)
</script>

<template>
  <div
    class="relative flex flex-row items-stretch justify-center w-full h-screen bg-gradient-to-br from-amber-100 via-yellow-200 to-orange-200 font-['MedievalSharp']"
  >
    <!-- Linke Spalte: LevelComponent und Click-Buttons -->
    <div class="flex flex-col items-start justify-center w-1/5 min-w-[200px] p-4">
      <LevelComponent />

      <!-- Click-Buttons für Chimes und Meeps -->
      <div class="flex flex-col items-center gap-6 mt-8">
        <div
          class="relative flex items-center justify-center w-24 h-24 transition-all duration-300 cursor-pointer hover:scale-110 hover:rotate-12"
        >
          <img
            src="/img/BardAbilities/BardChime.png"
            @click="handleChimeClick"
            class="object-contain w-full h-full p-2 drop-shadow-lg"
          />
        </div>
        <div
          class="flex items-center justify-center w-24 h-24 transition-all duration-300 cursor-pointer hover:scale-110 hover:rotate-12"
        >
          <img
            src="/img/BardAbilities/BardMeep.png"
            @click="gameStore.addMeep"
            class="object-contain w-full h-full p-2 drop-shadow-lg"
          />
        </div>
      </div>
    </div>

    <!-- Mitte: BattleResultComponent und Battle-Button -->
    <div class="flex flex-col items-center justify-center flex-1 px-4">
      <h1 class="mb-8 font-bold text-center text-7xl text-amber-800 drop-shadow-lg">
        Bard Idle Game
      </h1>
      <div class="flex flex-col items-center justify-center w-full max-w-2xl">
        <BattleResultComponent
          v-if="battleResult"
          :result="battleResult"
          :show-result="showBattleResult"
          :mmr-change="mmrChange"
          :lp-change="lpChange"
          @close="closeBattleResult"
        />

        <!-- AutoBattle Result Component -->
        <BattleResultComponent
          v-if="autoBattleResult"
          :result="autoBattleResult"
          :show-result="showAutoBattleResult"
          :mmr-change="autoBattleMmrChange"
          :lp-change="autoBattleLpChange"
          @close="closeAutoBattleResult"
        />
        <div class="flex flex-col items-center gap-4 mt-8">
          <button
            @click="handleBattle"
            class="px-10 py-6 text-2xl font-bold text-white transition-all duration-300 border-2 border-red-700 shadow-lg bg-gradient-to-r from-red-500 to-red-600 rounded-2xl hover:shadow-xl hover:scale-105 hover:from-red-400 hover:to-red-500"
          >
            Battle
          </button>

          <div class="flex gap-4">
            <button
              v-if="!battleStore.autoBattleEnabled"
              @click="battleStore.startAutoBattle()"
              class="px-6 py-3 text-lg font-bold text-white transition-all duration-300 border-2 border-green-700 shadow-lg bg-gradient-to-r from-green-500 to-green-600 rounded-xl hover:shadow-xl hover:scale-105 hover:from-green-400 hover:to-green-500"
            >
              Auto Battle Start
            </button>
            <button
              v-else
              @click="battleStore.stopAutoBattle()"
              class="px-6 py-3 text-lg font-bold text-white transition-all duration-300 border-2 border-orange-700 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:shadow-xl hover:scale-105 hover:from-orange-400 hover:to-orange-500"
            >
              Auto Battle Stop
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rechte Spalte: Statistiken -->
    <div class="flex flex-col items-end justify-center w-1/5 min-w-[250px] p-4">
      <div
        class="flex flex-col w-full max-w-xs gap-6 p-6 border shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl border-amber-200"
      >
        <div class="flex items-center gap-3">
          <span class="text-amber-600">Chimes:</span>
          <span class="text-3xl font-bold text-amber-800">{{ gameStore.chimes }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-blue-600">Meeps:</span>
          <span class="text-3xl font-bold text-blue-800">{{ gameStore.meeps }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-green-600">Meeps/s:</span>
          <span class="text-3xl font-bold text-green-800">{{ gameStore.meepsPerSecond }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-yellow-600">Gold:</span>
          <span class="text-3xl font-bold text-yellow-800">{{ gameStore.gold }}</span>
        </div>
      </div>
    </div>

    <!-- Chime Popup Animation -->
    <div
      :key="chimeGainKey"
      class="fixed z-50 text-2xl font-bold pointer-events-none text-amber-800 drop-shadow chime-popup"
      :style="{ left: chimeGainPos.x + 'px', top: chimeGainPos.y - 32 + 'px' }"
    >
      +{{ gameStore.chimesPerClick }}
    </div>
  </div>
</template>

<style scoped>
.chime-popup {
  animation: fadeUp 0.7s ease-out forwards;
}

@keyframes fadeUp {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}
</style>
