<template>
  <div class="w-full lobby-container">
    <div class="w-full max-w-5xl p-8 mx-auto">
      <!-- Tab Navigation -->
      <div class="flex items-center justify-center mb-8">
        <div
          class="flex p-2 border-2 shadow-lg tab-container bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl border-amber-300"
        >
          <button
            :class="tab === 'shop' ? 'tab-active' : 'tab-inactive'"
            class="flex items-center gap-3 px-8 py-4 mr-3 font-bold transition-all duration-300 tab-button rounded-xl"
            @click="tab = 'shop'"
          >
            <span class="text-2xl">🛒</span>
            <span class="text-lg">Champion Shop</span>
          </button>
          <button
            :class="tab === 'team' ? 'tab-active' : 'tab-inactive'"
            class="flex items-center gap-3 px-8 py-4 font-bold transition-all duration-300 tab-button rounded-xl"
            @click="tab = 'team'"
          >
            <span class="text-2xl">⚔️</span>
            <span class="text-lg">Team</span>
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content-wrapper">
        <div v-if="tab === 'shop'" class="tab-content">
          <ChampionShopComponent />
        </div>
        <div v-else class="tab-content">
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
.lobby-container {
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.tab-container {
  position: relative;
  overflow: hidden;
}

.tab-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(251, 191, 36, 0.1), transparent);
  animation: shimmer 4s linear infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

.tab-button {
  position: relative;
  overflow: hidden;
}

.tab-active {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #92400e;
  box-shadow: 0 8px 25px rgba(251, 191, 36, 0.4);
  transform: scale(1.05);
}

.tab-inactive {
  background: linear-gradient(135deg, #ffffff, #fef3c7);
  color: #b45309;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.tab-button:hover {
  transform: scale(1.1);
  box-shadow: 0 10px 30px rgba(251, 191, 36, 0.5);
}

.tab-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.tab-button:hover::before {
  left: 100%;
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
