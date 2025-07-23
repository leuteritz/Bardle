<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useBattleStore } from '../stores/battleStore'

export default defineComponent({
  name: 'ChampionTeamComponent',
  setup() {
    const battleStore = useBattleStore()

    // Champions, die gewählt werden können (ohne Bard)
    const selectableChampions = computed(() =>
      battleStore.ownedChampions.filter(
        (c) => c !== 'Bard' && !battleStore.selectedChampions.includes(c),
      ),
    )

    function addChampion(champion: string) {
      if (
        battleStore.selectedChampions.length < 4 &&
        !battleStore.selectedChampions.includes(champion)
      ) {
        battleStore.selectedChampions.push(champion)
      }
    }
    function removeChampion(champion: string) {
      battleStore.selectedChampions = battleStore.selectedChampions.filter((c) => c !== champion)
    }

    return {
      battleStore,
      selectableChampions,
      addChampion,
      removeChampion,
    }
  },
})
</script>

<template>
  <div class="p-6 bg-white/95 rounded-2xl shadow-2xl max-w-2xl mx-auto min-h-[300px]">
    <h2 class="mb-4 text-2xl font-bold text-center text-amber-800">Dein Team</h2>
    <div class="flex flex-row items-center justify-center gap-4 mb-6">
      <div class="flex flex-col items-center">
        <img src="/img/BardAbilities/Bard.png" alt="Bard" class="w-14 h-14" />
        <span class="font-bold text-amber-700">Bard</span>
      </div>
      <span class="text-2xl font-bold text-amber-700">+</span>
      <div class="flex flex-row gap-2">
        <div
          v-for="champion in battleStore.selectedChampions"
          :key="champion"
          class="flex flex-col items-center"
        >
          <div class="relative">
            <div
              class="flex items-center justify-center border-2 rounded-full w-14 h-14 bg-amber-100 border-amber-400"
            >
              <span class="font-bold text-amber-700">{{ champion }}</span>
            </div>
            <button
              class="absolute flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full -top-2 -right-2 hover:bg-red-700"
              @click="removeChampion(champion)"
            >
              ×
            </button>
          </div>
        </div>
        <div
          v-for="n in 4 - battleStore.selectedChampions.length"
          :key="'empty-' + n"
          class="flex items-center justify-center bg-gray-200 border-2 border-gray-300 rounded-full opacity-50 w-14 h-14"
        ></div>
      </div>
    </div>
    <div class="mb-2 font-semibold text-center text-amber-800">
      Wähle bis zu 4 Champions für dein Team:
    </div>
    <div class="flex flex-wrap justify-center gap-2 max-h-[180px] overflow-y-auto pr-1">
      <button
        v-for="champion in selectableChampions"
        :key="champion"
        class="px-3 py-1 font-bold text-white bg-green-500 rounded hover:bg-green-600 disabled:bg-gray-400"
        @click="addChampion(champion)"
        :disabled="battleStore.selectedChampions.length >= 4"
      >
        {{ champion }}
      </button>
    </div>
  </div>
</template>
