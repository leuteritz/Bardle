<template>
  <div class="relative z-50 w-full">
    <!-- Ultra-Kompakte Tab Navigation -->
    <div class="flex justify-center mb-2">
      <div class="flex rounded-lg shadow-sm p-0.5">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="
            activeTab === tab.id
              ? 'bg-amber-400 text-amber-900 shadow-sm'
              : 'text-amber-500 hover:bg-amber-200'
          "
          class="flex items-center gap-1 px-3 py-1.5 font-semibold transition rounded-md text-lg"
          @click="activeTab = tab.id"
        >
          <span>{{ tab.icon }}</span>
          <span class="hidden sm:inline">{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- Ultra-Kompakter Content -->
    <div
      class="w-full h-[600px] p-4 backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl"
    >
      <component :is="currentComponent" />
    </div>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent, computed, onMounted } from 'vue'
import ChampionLobbyComponent from '../ChampionLobbyComponent.vue'
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
