<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../stores/gameStore'
import AbilityComponent from './bottom/AbilityComponent.vue'
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
    class="flex flex-col items-center px-6 py-4 border-2 shadow-2xl rounded-2xl h-78 bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 border-amber-400 backdrop-blur-sm"
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

    <div class="mb-2 text-lg font-bold text-center text-amber-400">
      Skillpunkte: {{ gameStore.skillPoints }}
    </div>
  </div>
</template>
