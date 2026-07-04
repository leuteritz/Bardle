<template>
  <div class="relative flex flex-col w-full h-full overflow-hidden">
    <!-- ══ PHASE 2 · PLANET SEARCH (warp overlay, triggers itself) ══ -->
    <PlanetSearchComponent ref="universeAnim" :variant="planetVariant" />

    <!-- ══ PHASE 1 · LANDING (career stats + start) ══ -->
    <Transition name="start-fade">
      <BattleLandingScreen
        v-if="!battleStore.isAutoBattleInitialized && !isUniverseAnimating && !isStarting"
        :is-starting="isStarting"
        @start="startBattle"
      />
    </Transition>

    <!-- ══ PHASE 3 · RIFT BATTLE (broadcast board) ══ -->
    <template v-if="battleStore.isAutoBattleInitialized && !isUniverseAnimating">
      <PlanetBattleBackgroundComponent :variant="planetVariant" />

      <RiftBattleBoard :chat-open="showChat" @toggle-chat="showChat = !showChat" />

      <!-- Objective modal overlays the board when dragon/baron spawns -->
      <ObjectiveModalComponent />

      <!-- Collapsible chat overlay -->
      <Transition name="chat-slide">
        <BattleChatComponent v-if="showChat" class="absolute bottom-0 left-0 z-40 chat-overlay" />
      </Transition>

      <!-- ══ PHASE 4 · HONOR / RESULT ══ -->
      <Transition name="honor-fade">
        <HonorResultScreen v-if="battleStore.showAutoBattleResult" />
      </Transition>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import PlanetSearchComponent from './PlanetSearchComponent.vue'
import PlanetBattleBackgroundComponent from './PlanetBattleBackgroundComponent.vue'
import BattleChatComponent from './BattleChatComponent.vue'
import ObjectiveModalComponent from './ObjectiveModalComponent.vue'
import BattleLandingScreen from './landing/BattleLandingScreen.vue'
import RiftBattleBoard from './rift/RiftBattleBoard.vue'
import HonorResultScreen from './result/HonorResultScreen.vue'
import { useBattleStore } from '@/stores/battleStore'

export default defineComponent({
  name: 'BattleResultComponent',
  components: {
    PlanetSearchComponent,
    PlanetBattleBackgroundComponent,
    BattleChatComponent,
    ObjectiveModalComponent,
    BattleLandingScreen,
    RiftBattleBoard,
    HonorResultScreen,
  },

  setup() {
    const battleStore = useBattleStore()

    const isStarting = ref(false)
    const isUniverseAnimating = ref(false)
    const universeAnim = ref<{ trigger: () => Promise<void> } | null>(null)
    const showChat = ref(false)

    async function runUniverseAnimation(): Promise<void> {
      isUniverseAnimating.value = true
      await universeAnim.value?.trigger()
      isUniverseAnimating.value = false
    }

    watch(
      () => battleStore.simulationReadyToStart,
      async (newVal) => {
        if (newVal && battleStore.isAutoBattleInitialized) {
          battleStore.simulationReadyToStart = false
          await runUniverseAnimation()
          battleStore.beginSimulation()
        }
      },
    )

    const startBattle = async () => {
      if (isStarting.value) return
      isStarting.value = true
      battleStore.searchingPhaseStartTimestamp = Date.now()
      await runUniverseAnimation()
      await battleStore.initializePersistentAutoBattle()
      battleStore.beginSimulation()
      isStarting.value = false
    }

    const planetVariant = computed(() => battleStore.currentBattleId % 5)

    return {
      battleStore,
      isStarting,
      isUniverseAnimating,
      universeAnim,
      planetVariant,
      startBattle,
      showChat,
    }
  },
})
</script>

<style scoped>
/* Chat overlay panel anchored bottom-left over the board */
.chat-overlay {
  width: 280px;
  max-height: 220px;
  border: 4px solid #7a4e20;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310, 0 8px 24px rgba(0, 0, 0, 0.85);
  border-radius: 4px;
}

.chat-slide-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.chat-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

/* Landing screen fade */
.start-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.start-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

/* Honor screen fade */
.honor-fade-enter-active {
  transition: opacity 0.35s ease;
}
.honor-fade-leave-active {
  transition: opacity 0.25s ease;
}
.honor-fade-enter-from,
.honor-fade-leave-to {
  opacity: 0;
}
</style>
