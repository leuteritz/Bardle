<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../stores/gameStore'
import AbilityComponent from './AbilityComponent.vue'
import RankComponent from './RankComponent.vue'

export default defineComponent({
  name: 'LevelComponent',
  components: {
    AbilityComponent,
    RankComponent,
  },
  setup() {
    const gameStore = useGameStore()

    return {
      gameStore,
    }
  },
})
</script>

<template>
  <div
    class="absolute flex flex-col items-center w-102 gap-3 px-6 py-4 text-xl font-bold text-white rounded-2xl shadow-2xl h-78 bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 top-4 left-4 font-['MedievalSharp'] border-2 border-amber-400 backdrop-blur-sm"
  >
    <div class="flex flex-row items-start justify-between w-full gap-6">
      <div class="flex items-center gap-3">
        <div class="relative">
          <img
            src="/img/BardAbilities/Bard.png"
            alt="Level"
            class="object-contain w-24 h-24 drop-shadow-lg"
          />
        </div>
        <div class="flex flex-col">
          <span class="text-2xl text-amber-100">Level {{ gameStore.level }}</span>
          <span class="text-sm font-normal text-amber-200">Bard's Journey</span>
        </div>
      </div>
      <RankComponent
        :tier="gameStore.currentRank.tier"
        :division="gameStore.currentRank.division"
        :lp="gameStore.currentRank.lp"
      />
    </div>
    <div class="text-center min-w-60">
      <div class="mb-1 text-sm font-normal text-amber-200">
        {{ gameStore.chimesToNextLevel }} Chimes bis Level {{ gameStore.level + 1 }}
      </div>
      <div class="w-full h-3 border rounded-full shadow-inner bg-amber-900/50 border-amber-800">
        <div
          class="h-3 transition-all duration-500 ease-out rounded-full shadow-lg bg-gradient-to-r from-yellow-400 to-yellow-300"
          :style="{ width: `${gameStore.levelProgress}%` }"
        ></div>
      </div>
    </div>
    <div
      class="w-4/5 h-1 mt-3 mb-2 rounded-full shadow-md bg-gradient-to-r from-yellow-400 via-yellow-200 to-orange-300"
    ></div>

    <div class="flex flex-row items-center justify-center gap-4 p-2 mt-2">
      <AbilityComponent
        v-for="(level, idx) in gameStore.abilityLevels"
        :key="idx"
        :icon="
          [
            '/img/BardAbilities/BardQ.png',
            '/img/BardAbilities/BardW.png',
            '/img/BardAbilities/BardE.png',
            '/img/BardAbilities/BardR.png',
          ][idx]
        "
        :ability="['Q', 'W', 'E', 'R'][idx]"
        :abilityLevel="level"
        :canUpgrade="gameStore.skillPoints > 0 && level < 5"
        @upgrade="gameStore.upgradeAbility(idx)"
      />
    </div>
    <div class="mb-2 text-lg font-bold text-center text-amber-400">
      Skillpunkte: {{ gameStore.skillPoints }}
    </div>
  </div>
</template>
