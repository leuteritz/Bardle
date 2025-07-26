<template>
  <div class="w-full">
    <div class="w-full max-w-4xl p-8 mx-auto">
      <div class="flex items-center justify-center mb-6">
        <button
          :class="tab === 'shop' ? 'bg-amber-400 text-amber-900' : 'bg-white text-amber-700'"
          class="flex items-center gap-2 px-6 py-2 mr-2 font-bold transition border-2 shadow rounded-xl border-amber-300 hover:bg-amber-200"
          @click="tab = 'shop'"
        >
          Champion Shop
        </button>
        <button
          :class="tab === 'team' ? 'bg-amber-400 text-amber-900' : 'bg-white text-amber-700'"
          class="flex items-center gap-2 px-6 py-2 font-bold transition border-2 shadow rounded-xl border-amber-300 hover:bg-amber-200"
          @click="tab = 'team'"
        >
          Team
        </button>
      </div>
      <div v-if="tab === 'shop'">
        <ChampionShopComponent />
      </div>
      <div v-else>
        <ChampionTeamComponent />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref } from 'vue'
import ChampionShopComponent from './ChampionShopComponent.vue'
import ChampionTeamComponent from './ChampionTeamComponent.vue'

export default {
  name: 'ChampionLobbyComponent',
  components: { ChampionShopComponent, ChampionTeamComponent },

  setup() {
    const tab = ref('shop')

    return { tab }
  },
}
</script>
