<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useGameStore } from './stores/gameStore'
import { useBattleStore } from './stores/battleStore'
import { titleMessages } from './config/messages'
import StatsPanelComponent from './components/bottom/StatsPanelComponent.vue'
import AbilityBarComponent from './components/bottom/AbilityBarComponent.vue'
import BardHudComponent from './components/bottom/BardHudComponent.vue'
import GameCenterComponent from './components/gameCenter/GameCenterComponent.vue'
import RankComponent from './components/RankComponent.vue'

const gameStore = useGameStore()
const battleStore = useBattleStore()

const title = ref('Bardle')

// AutoBattle result state
const showAutoBattleResult = ref(false)
const autoBattleResult = ref(null)
const autoBattleMmrChange = ref(0)
const autoBattleLpChange = ref(0)
const autoBattleResultKey = ref(0)

const autoBattleResultComponentRef = ref(null)

const currentMsg = ref('')

function getRandomMsg() {
  const randomMsg = titleMessages[Math.floor(Math.random() * titleMessages.length)]
  currentMsg.value = randomMsg
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
  getRandomMsg()
  setInterval(() => {
    gameStore.gernerateMeeps()
  }, 1000)

  setInterval(() => {
    getRandomMsg()
  }, 5000)
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
    class="flex flex-col justify-between p-4 w-full min-h-screen bg-gradient-to-br from-amber-100 via-yellow-200 to-orange-200 font-['MedievalSharp']"
  >
    <!-- Top -->
    <div class="grid w-full h-8 grid-cols-3 border-amber-400">
      <!-- Linke Spalte: RankComponent -->
      <div class="flex items-center justify-start col-span-1">
        <RankComponent
          :tier="gameStore.currentRank.tier"
          :division="gameStore.currentRank.division"
          :lp="gameStore.currentRank.lp"
        />
      </div>

      <!-- Titel -->
      <h1
        class="flex items-start justify-center col-span-1 text-6xl font-bold text-amber-800 drop-shadow-lg"
      >
        {{ title }}
      </h1>

      <!-- Rechte Spalte: Message -->
      <div class="flex items-start justify-end col-span-1 mt-16">
        <div
          class="flex items-start justify-center w-full h-full gap-2 rounded-xl border-amber-400/50"
        >
          <p
            class="text-xl cursor-default select-none text-amber-700 drop-shadow-lg hover:text-amber-800 hover:scale-105 animate-bounce"
          >
            {{ currentMsg }}
          </p>
        </div>
      </div>
    </div>

    <!-- Mitte -->
    <div class="flex justify-center w-full h-full">
      <div class="w-full max-w-6xl">
        <!-- Breitere Nutzung des verfügbaren Platzes -->
        <GameCenterComponent />
      </div>
    </div>

    <!-- Bottom Panel - Kompakter -->
    <div class="flex justify-center w-full">
      <div
        class="w-full max-w-4xl overflow-hidden border shadow-xl border-amber-400 bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 rounded-xl"
      >
        <!-- Main Content Grid - Reduzierte Höhe -->
        <div class="grid grid-cols-12 min-h-[140px]">
          <!-- Left Section: Bard HUD -->
          <div
            class="flex items-center justify-center col-span-3 p-1 border-r border-amber-500/30 bg-gradient-to-br from-amber-600/30 to-orange-600/30"
          >
            <div class="w-full max-w-[200px]">
              <BardHudComponent />
            </div>
          </div>

          <!-- Center Section: Ability Bar -->
          <div
            class="flex items-center justify-center col-span-6 p-1 bg-gradient-to-br from-amber-700/30 to-orange-700/30"
          >
            <div class="w-full max-w-lg">
              <AbilityBarComponent />
            </div>
          </div>

          <!-- Right Section: Stats Panel -->
          <div
            class="flex items-center justify-center col-span-3 p-1 border-l border-amber-500/30 bg-gradient-to-br from-amber-600/30 to-orange-600/30"
          >
            <div class="w-full">
              <StatsPanelComponent />
            </div>
          </div>
        </div>

        <!-- Dünnere Top border decoration -->
        <div class="h-0.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"></div>
      </div>
    </div>
  </div>
</template>
