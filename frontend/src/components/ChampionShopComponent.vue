<script lang="ts">
import { ref, onMounted, defineComponent, computed } from 'vue'
import { useBattleStore } from '../stores/battleStore'

// Champion-Typ
interface Champion {
  name: string
  owned: boolean
}

export default defineComponent({
  name: 'ChampionShopComponent',
  setup() {
    const champions = ref<Champion[]>([])
    const battleStore = useBattleStore()
    async function loadChampions() {
      const response = await fetch('/src/config/champion.csv')
      if (!response.ok) throw new Error('Fehler beim Laden der Champion-Liste')
      const text = await response.text()
      champions.value = text
        .split('\n')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .map((name) => ({ name, owned: battleStore.ownedChampions.includes(name) }))
    }

    function buyChampion(name: string) {
      if (!battleStore.ownedChampions.includes(name)) {
        battleStore.ownedChampions.push(name)
        const champ = champions.value.find((c) => c.name === name)
        if (champ) champ.owned = true
        console.log(battleStore.ownedChampions)
      }
    }

    // Nur Champions anzeigen, die noch nicht gekauft wurden
    const availableChampions = computed(() =>
      champions.value.filter((c) => !battleStore.ownedChampions.includes(c.name)),
    )

    onMounted(() => {
      loadChampions()
    })

    return {
      champions,
      buyChampion,
      availableChampions,
    }
  },
})
</script>

<template>
  <div class="min-h-[300px] max-w-2xl p-6 mx-auto shadow-2xl bg-white/95 rounded-2xl">
    <h2 class="mb-4 text-3xl font-bold text-center text-amber-800">Champion-Shop</h2>
    <div class="grid grid-cols-2 gap-4 pr-2 overflow-y-auto md:grid-cols-3">
      <div
        v-for="champion in availableChampions"
        :key="champion.name"
        class="flex flex-col items-center p-3 transition border rounded-lg shadow bg-amber-50 hover:shadow-lg"
      >
        <div class="mb-2 text-lg font-semibold">{{ champion.name }}</div>
        <button
          class="px-3 py-1 font-bold text-white bg-green-500 rounded hover:bg-green-600 disabled:bg-gray-400"
          :disabled="champion.owned"
          @click="buyChampion(champion.name)"
        >
          {{ champion.owned ? 'Gekauft' : 'Kaufen' }}
        </button>
      </div>
    </div>
  </div>
</template>
