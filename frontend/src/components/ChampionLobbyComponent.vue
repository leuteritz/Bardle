<template>
  <div
    class="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 rounded-xl"
  >
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute w-32 h-32 bg-blue-500 rounded-full top-4 left-4 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute bg-violet-500 rounded-full top-4 right-4 w-28 h-28 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute w-24 h-24 bg-yellow-500 rounded-full bottom-4 left-1/2 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <div class="relative z-10 w-full h-full p-4">
      <!-- Kompakte Tab Navigation -->
      <div class="flex items-center justify-center mb-4">
        <div
          class="flex p-1 border shadow-lg tab-container bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-xl border-blue-400/30 backdrop-blur-sm"
        >
          <button
            :class="tab === 'shop' ? 'tab-active' : 'tab-inactive'"
            class="flex items-center gap-2 px-4 py-2 mr-2 text-sm font-bold transition-all duration-300 rounded-lg tab-button"
            @click="tab = 'shop'"
          >
            <span class="text-base">🛒</span>
            <span class="hidden sm:inline">Shop</span>
          </button>
          <button
            :class="tab === 'team' ? 'tab-active' : 'tab-inactive'"
            class="flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all duration-300 rounded-lg tab-button"
            @click="tab = 'team'"
          >
            <span class="text-base">⚔️</span>
            <span class="hidden sm:inline">Team</span>
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content-wrapper h-[calc(100%-4rem)]">
        <div v-if="tab === 'shop'" class="h-full tab-content">
          <ChampionShopComponent />
        </div>
        <div v-else class="h-full tab-content">
          <ChampionTeamComponent />
        </div>
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

<style scoped>
.tab-active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8));
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
  transform: scale(1.05);
}

.tab-inactive {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(59, 130, 246, 0.1));
  color: rgba(59, 130, 246, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
}

.content-wrapper {
  animation: contentSlide 0.6s ease-out;
}

.tab-content {
  animation: tabFadeIn 0.5s ease-out;
}

@keyframes contentSlide {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes tabFadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
