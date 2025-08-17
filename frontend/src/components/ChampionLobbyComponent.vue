<template>
  <div
    class="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl"
  >
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute w-32 h-32 bg-purple-500 rounded-full top-4 left-4 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute bg-pink-500 rounded-full top-4 right-4 w-28 h-28 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute w-24 h-24 bg-yellow-500 rounded-full bottom-4 left-1/2 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <div class="relative z-10 w-full h-full p-4">
      <!-- Kompakte Tab Navigation -->
      <div class="flex items-center justify-center mb-4">
        <div
          class="flex p-1 border shadow-lg tab-container bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border-purple-400/30 backdrop-blur-sm"
        >
          <button
            :class="tab === 'shop' ? 'tab-active' : 'tab-inactive'"
            class="flex items-center gap-2 px-4 py-2 mr-2 text-sm font-bold transition-all duration-300 rounded-lg tab-button"
            @click="tab = 'shop'"
          >
            <span class="text-lg">🛒</span>
            <span class="hidden sm:inline">Shop</span>
          </button>
          <button
            :class="tab === 'team' ? 'tab-active' : 'tab-inactive'"
            class="flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all duration-300 rounded-lg tab-button"
            @click="tab = 'team'"
          >
            <span class="text-lg">⚔️</span>
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
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}

.tab-active {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8));
  color: white;
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
  transform: scale(1.05);
}

.tab-inactive {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(168, 85, 247, 0.1));
  color: rgba(168, 85, 247, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
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
