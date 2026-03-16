<template>
  <div class="relative z-50 flex w-full">
    <!-- Tab Navigation (links) -->
    <div class="flex flex-col gap-1 px-2 py-3 border border-l-0 bg-white/5 border-white/15 rounded-r-2xl backdrop-blur-md">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="activeTab === tab.id ? 'tab-active' : 'tab-inactive'"
        class="tab-button flex flex-col items-center gap-1 px-3 py-2 font-semibold transition-all duration-300 rounded-lg text-sm"
        @click="activeTab = tab.id"
      >
        <span class="text-lg">{{ tab.icon }}</span>
        <span class="hidden sm:inline text-xs">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 h-[600px] p-4">
      <component :is="currentComponent" />
    </div>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent, computed, onMounted } from 'vue'
import ChampionLobbyComponent from './champion/ChampionLobbyComponent.vue'
import IdleGameComponent from './idle/IdleGameComponent.vue'
import BattleResultComponent from './battle/BattleResultComponent.vue'
import { useBattleStore } from '../../stores/battleStore'

export default defineComponent({
  name: 'GameCenterComponent',
  components: {
    ChampionLobbyComponent,
    IdleGameComponent,
    BattleResultComponent,
  },

  setup() {
    const activeTab = ref('idle')
    const battleStore = useBattleStore()

    const tabs = [
      { id: 'idle', label: 'Idle', icon: '🎵' },
      { id: 'battle', label: 'Battle', icon: '⚔️' },
      { id: 'champions', label: 'Champions', icon: '🏆' },
    ]

    const currentComponent = computed(() => {
      switch (activeTab.value) {
        case 'idle':
          return IdleGameComponent
        case 'battle':
          return BattleResultComponent
        case 'champions':
          return ChampionLobbyComponent
        default:
          return IdleGameComponent
      }
    })

    onMounted(async () => {
      await battleStore.initializePersistentAutoBattle()
    })

    return {
      activeTab,
      tabs,
      currentComponent,
    }
  },
})
</script>

<style scoped>
.tab-active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.85), rgba(234, 179, 8, 0.85));
  color: #1a1000;
  box-shadow: 0 0 14px rgba(251, 191, 36, 0.45);
  transform: scale(1.05);
}

.tab-inactive {
  background: transparent;
  color: rgba(251, 191, 36, 0.5);
}

.tab-button:hover {
  transform: scale(1.08);
  color: rgba(251, 191, 36, 0.9);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.2);
}
</style>
