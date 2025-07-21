<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useGameStore } from './stores/gameStore'
import { useBattleStore } from './stores/battleStore'
import LevelComponent from './components/LevelComponent.vue'
import BattleResultComponent from './components/battle/BattleResultComponent.vue'
import StatsPanelComponent from './components/StatsPanelComponent.vue'
import AbilityBarComponent from './components/AbilityBarComponent.vue'
import BardHudComponent from './components/BardHudComponent.vue'

const gameStore = useGameStore()
const battleStore = useBattleStore()

const title = ref('Bardle')

const chimeGainPos = ref({ x: 0, y: 0 })
const chimeGainKey = ref(0)

// AutoBattle result state
const showAutoBattleResult = ref(false)
const autoBattleResult = ref(null)
const autoBattleMmrChange = ref(0)
const autoBattleLpChange = ref(0)
const autoBattleResultKey = ref(0)

const autoBattleResultComponentRef = ref(null)

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

function handleAutoBattleResult() {
  if (battleStore.lastAutoBattleResult && battleStore.showAutoBattleResult) {
    // Verwende die im Store gespeicherten alten Werte
    const oldMMR = battleStore.autoBattleOldMMR
    const oldLP = battleStore.autoBattleOldLP

    autoBattleMmrChange.value = gameStore.mmr - oldMMR
    autoBattleLpChange.value = gameStore.currentRank.lp - oldLP

    autoBattleResult.value = battleStore.lastAutoBattleResult
    showAutoBattleResult.value = true
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
    class="relative flex flex-col items-center justify-center w-full h-screen bg-gradient-to-br from-amber-100 via-yellow-200 to-orange-200 font-['MedievalSharp']"
  >
    <!-- Hauptinhalt -->
    <div class="flex flex-row items-stretch justify-center w-full h-full">
      <!-- Linke Spalte: LevelComponent und Click-Buttons -->
      <div class="flex flex-col items-start justify-center w-1/5 min-w-[200px] p-4">
        <LevelComponent />

        <!-- Click-Buttons für Chimes und Meeps -->
        <div class="absolute gap-1 left-10">
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

      <h1 class="absolute font-bold text-center top-10 text-7xl text-amber-800 drop-shadow-lg">
        {{ title }}
      </h1>

      <!-- Mitte: BattleResultComponent und Battle-Button -->
      <div class="flex flex-col items-center justify-center flex-1 px-4">
        <div class="flex flex-col items-center justify-center w-full max-w-5xl mb-24">
          <!-- AutoBattle Result Component -->
          <BattleResultComponent
            v-if="autoBattleResult"
            ref="autoBattleResultComponentRef"
            :key="autoBattleResultKey"
            :result="autoBattleResult"
            :show-result="showAutoBattleResult"
            :mmr-change="autoBattleMmrChange"
            :lp-change="autoBattleLpChange"
            @close="closeAutoBattleResult"
          />
          <div class="flex flex-col items-center gap-4 mt-8">
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

      <!-- Rechte Spalte: Leer für Balance -->
      <div class="w-1/5 min-w-[250px] p-4"></div>
    </div>

    <!-- Neue HUD-Leiste unten links: BardHud + StatsPanel -->
    <div class="absolute z-50 flex flex-row items-end bottom-12 left-2">
      <StatsPanelComponent />
    </div>

    <!-- AbilityBarComponent fest in der Mitte -->
    <div
      class="absolute z-50 grid items-center grid-cols-2 gap-4 -translate-x-1/2 bottom-12 left-1/2"
    >
      <div class="mr-[200px]">
        <BardHudComponent />
      </div>
      <div class="">
        <AbilityBarComponent />
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
