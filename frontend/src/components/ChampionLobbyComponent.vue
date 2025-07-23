<template>
  <div class="fixed inset-0 flex items-center justify-center z-100 bg-black/40">
    <div
      class="relative w-full max-w-4xl p-8 border-4 shadow-2xl bg-gradient-to-br from-amber-100 via-yellow-200 to-orange-100 rounded-3xl border-amber-400"
    >
      <div class="flex items-center justify-between mb-6">
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
        <button
          class="absolute flex items-center justify-center w-10 h-10 text-2xl font-bold text-white rounded-full top-4 right-4 bg-amber-700 hover:bg-amber-800"
          @click="$emit('close')"
        >
          ×
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

  emits: ['close'],
  setup() {
    const tab = ref('shop')

    return { tab }
  },
}
</script>
