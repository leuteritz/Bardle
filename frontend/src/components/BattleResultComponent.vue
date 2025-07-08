<template>
  <div
    v-if="showResult"
    class="relative w-full max-w-2xl p-8 mx-4 border shadow-2xl bg-white/95 backdrop-blur-sm rounded-3xl border-amber-200"
  >
    <!-- Close Button -->
    <button
      @click="closeResult"
      class="absolute text-2xl text-gray-500 transition-colors top-4 right-4 hover:text-gray-700"
    >
      ✕
    </button>

    <!-- Battle Result Header -->
    <div class="mb-6 text-center">
      <h2 class="mb-2 text-4xl font-bold" :class="result.won ? 'text-green-600' : 'text-red-600'">
        {{ result.won ? 'VICTORY!' : 'DEFEAT!' }}
      </h2>
      <p class="text-xl text-gray-600">Gegen {{ result.opponent.name }}</p>
    </div>

    <!-- Opponent Info -->
    <div class="p-4 mb-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl">
      <h3 class="mb-3 text-xl font-bold text-gray-800">Gegner Information</h3>
      <div class="grid grid-cols-2 gap-4 text-lg">
        <div>
          <span class="text-gray-600">Name:</span>
          <span class="ml-2 font-bold text-gray-800">{{ result.opponent.name }}</span>
        </div>
        <div>
          <span class="text-gray-600">MMR:</span>
          <span class="ml-2 font-bold text-gray-800">{{ Math.round(result.opponent.mmr) }}</span>
        </div>
        <div>
          <span class="text-gray-600">Kampfkraft:</span>
          <span class="ml-2 font-bold text-gray-800">{{ result.opponent.power }}</span>
        </div>
        <div>
          <span class="text-gray-600">Rang:</span>
          <span class="ml-2 font-bold text-gray-800"
            >{{ result.opponent.rank.tier }} {{ result.opponent.rank.division }}</span
          >
        </div>
      </div>
    </div>

    <!-- Battle Statistics -->
    <div class="p-4 mb-6 bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl">
      <h3 class="mb-3 text-xl font-bold text-blue-800">Kampf Statistiken</h3>
      <div class="grid grid-cols-2 gap-4 text-lg">
        <div>
          <span class="text-blue-600">Gewinnchance:</span>
          <span class="ml-2 font-bold text-blue-800"
            >{{ Math.round(result.winProbability * 100) }}%</span
          >
        </div>
        <div>
          <span class="text-blue-600">Ergebnis:</span>
          <span class="ml-2 font-bold" :class="result.won ? 'text-green-600' : 'text-red-600'">
            {{ result.won ? 'Gewonnen' : 'Verloren' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Ranking Changes -->
    <div class="p-4 mb-6 bg-gradient-to-r from-purple-100 to-purple-200 rounded-2xl">
      <h3 class="mb-3 text-xl font-bold text-purple-800">Ranglisten Änderungen</h3>
      <div class="grid grid-cols-2 gap-4 text-lg">
        <div>
          <span class="text-purple-600">MMR Änderung:</span>
          <span class="ml-2 font-bold" :class="mmrChange >= 0 ? 'text-green-600' : 'text-red-600'">
            {{ mmrChange >= 0 ? '+' : '' }}{{ mmrChange }}
          </span>
        </div>
        <div>
          <span class="text-purple-600">LP Änderung:</span>
          <span class="ml-2 font-bold" :class="lpChange >= 0 ? 'text-green-600' : 'text-red-600'">
            {{ lpChange >= 0 ? '+' : '' }}{{ lpChange }}
          </span>
        </div>
        <div class="col-span-2">
          <span class="text-purple-600">Neuer Rang:</span>
          <span class="ml-2 font-bold text-purple-800">
            {{ gameStore.currentRank.tier }} {{ gameStore.currentRank.division }} ({{
              gameStore.currentRank.lp
            }}
            LP)
          </span>
        </div>
      </div>
    </div>

    <!-- Rewards -->
    <div v-if="result.won" class="p-4 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-2xl">
      <h3 class="mb-3 text-xl font-bold text-yellow-800">Belohnungen</h3>
      <div class="text-lg">
        <span class="text-yellow-600">Meeps gewonnen:</span>
        <span class="ml-2 font-bold text-yellow-800">{{ result.meepsEarned || 0 }}</span>
      </div>
    </div>

    <!-- Continue Button -->
    <div class="text-center">
      <button
        @click="closeResult"
        class="px-8 py-4 text-xl font-bold text-white transition-all duration-300 border-2 shadow-lg border-amber-700 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl hover:shadow-xl hover:scale-105 hover:from-amber-400 hover:to-amber-500"
      >
        Weiter
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const props = defineProps<{
  result: any
  showResult: boolean
  mmrChange: number
  lpChange: number
}>()

const emit = defineEmits<{
  close: []
}>()

const gameStore = useGameStore()

function closeResult() {
  emit('close')
}
</script>

<script lang="ts">
export default {
  name: 'BattleResultComponent',
}
</script>
