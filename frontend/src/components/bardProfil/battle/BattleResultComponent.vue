<template>
  <div class="relative flex flex-col w-full h-full overflow-hidden">
    <!-- ══ UNIVERSE ANIMATION ══ -->
    <PlanetSearchComponent ref="universeAnim" :variant="planetVariant" />

    <!-- ══ START SCREEN ══ -->
    <Transition name="start-fade">
      <BattleStartScreenComponent
        v-if="!battleStore.isAutoBattleInitialized && !isUniverseAnimating && !isStarting"
        :is-starting="isStarting"
        @start="startBattle"
      />
    </Transition>

    <!-- ══ BATTLE UI ══ -->
    <template v-if="battleStore.isAutoBattleInitialized && !isUniverseAnimating">
      <!-- ── PLANET BATTLE BACKGROUND ── -->
      <PlanetBattleBackgroundComponent :variant="planetVariant" />

      <!-- Minimap fills the entire tab -->
      <div class="relative z-10 flex flex-1 min-h-0">
        <BattleMapComponent
          class="w-full h-full"
          :battle-id="currentBattleId"
          :score="score"
          :chat-open="showChat"
          @toggle-chat="showChat = !showChat"
        />

        <!--
          Chat is a collapsible overlay anchored to the bottom-left of the map.
          Moved out of the main layout column so the minimap gets full space.
          Players toggle it via the chat button on the minimap.
        -->
        <Transition name="chat-slide">
          <BattleChatComponent
            v-if="showChat"
            class="absolute bottom-0 left-0 z-40 chat-overlay"
          />
        </Transition>
      </div>

      <!-- Cinematic kill announcement banner — overlays the entire battle area -->
      <BattleKillBannerComponent />
    </template>
  </div>

  <!-- Result Modal -->
  <BattleResultModal />
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import BattleMapComponent from './BattleMapComponent.vue'
import BattleChatComponent from './BattleChatComponent.vue'
import PlanetSearchComponent from './PlanetSearchComponent.vue'
import PlanetBattleBackgroundComponent from './PlanetBattleBackgroundComponent.vue'
import BattleStartScreenComponent from './BattleStartScreenComponent.vue'
import BattleResultModal from './BattleResultModal.vue'
import BattleKillBannerComponent from './BattleKillBannerComponent.vue'
import { useBattleStore } from '@/stores/battleStore'

export default defineComponent({
  name: 'BattleResultComponent',
  components: {
    BattleMapComponent,
    BattleChatComponent,
    PlanetSearchComponent,
    PlanetBattleBackgroundComponent,
    BattleStartScreenComponent,
    BattleResultModal,
    BattleKillBannerComponent,
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

    const score = computed(() => ({
      team1Kills: battleStore.team1.reduce((sum, c) => sum + c.kills, 0),
      team2Kills: battleStore.team2.reduce((sum, c) => sum + c.kills, 0),
    }))

    const currentBattleId = computed(() => battleStore.currentBattleId)
    const planetVariant = computed(() => battleStore.currentBattleId % 5)

    return {
      battleStore,
      isStarting,
      isUniverseAnimating,
      universeAnim,
      planetVariant,
      startBattle,
      score,
      currentBattleId,
      showChat,
    }
  },
})
</script>

<style scoped>
/* Chat overlay panel anchored bottom-left over the minimap */
.chat-overlay {
  width: 280px;
  max-height: 220px;
  border: 4px solid #7a4e20;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310, 0 8px 24px rgba(0, 0, 0, 0.85);
  border-radius: 4px;
}

/* Slide-up transition for chat overlay */
.chat-slide-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.chat-slide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

/* Start screen fade */
.start-fade-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}
.start-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
