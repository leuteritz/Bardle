<template>
  <div class="flex flex-col w-full h-full p-4 space-y-4">
    <!-- ─── Tab Selector (identisch zum Kaufmengen-Selector) ─── -->
    <div
      class="sticky top-0 z-10 flex items-center justify-center gap-2 p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <span class="mr-2 text-xs font-bold tracking-widest uppercase text-white/50">Champions</span>
      <div class="flex gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
        <button
          v-for="t in tabs"
          :key="t.id"
          @click="tab = t.id"
          class="relative px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-300 overflow-hidden flex items-center gap-2"
          :class="
            tab === t.id
              ? 'text-white shadow-lg shadow-violet-500/40'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          "
        >
          <!-- Active background gradient -->
          <span
            v-if="tab === t.id"
            class="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600"
          />
          <!-- Shimmer sweep on active -->
          <span
            v-if="tab === t.id"
            class="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"
          />
          <span class="relative z-10">{{ t.icon }}</span>
          <span class="relative z-10 hidden sm:inline">{{ t.label }}</span>
        </button>
      </div>
    </div>

    <!-- ─── Content ─── -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <ChampionShopComponent v-if="tab === 'shop'" />
      <ChampionTeamComponent v-else />
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
    const tabs = [
      { id: 'shop', label: 'Shop', icon: '🛒' },
      { id: 'team', label: 'Team', icon: '⚔️' },
    ]
    return { tab, tabs }
  },
}
</script>

<style scoped>
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
