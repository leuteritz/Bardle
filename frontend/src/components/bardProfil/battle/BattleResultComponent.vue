<template>
  <div class="relative flex flex-col w-full h-full overflow-hidden">
    <!-- ══ PHASE 2 · PLANET SEARCH (warp overlay, triggers itself) ══ -->
    <PlanetSearchComponent ref="universeAnim" :variant="planetVariant" />

    <!-- ══ PHASE 1 · LANDING (career stats + start) ══ -->
    <Transition name="start-fade">
      <BattleLandingScreen
        v-if="
          (!battleStore.isAutoBattleInitialized || battleStore.isViewingLanding) &&
          !isUniverseAnimating &&
          !isStarting
        "
        :is-starting="isStarting"
        @start="startBattle"
      />
    </Transition>

    <!-- ══ PHASE 3 · CHAMPION LOADING (both line-ups, phase clock) ══ -->
    <Transition name="loading-fade">
      <BattleLoadingScreen v-if="isLoadingPhase" />
    </Transition>

    <!-- ══ PHASE 4 · RIFT BATTLE (broadcast board) ══ -->
    <template
      v-if="
        battleStore.isAutoBattleInitialized &&
        !isUniverseAnimating &&
        !isLoadingPhase &&
        !battleStore.isViewingLanding
      "
    >
      <PlanetBattleBackgroundComponent :variant="planetVariant" />

      <RiftBattleBoard />

      <!-- ══ PHASE 5 · HONOR / RESULT ══ -->
      <Transition name="honor-fade">
        <HonorResultScreen v-if="battleStore.showAutoBattleResult" />
      </Transition>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, ref, watch } from 'vue'
import PlanetSearchComponent from './PlanetSearchComponent.vue'
import PlanetBattleBackgroundComponent from './PlanetBattleBackgroundComponent.vue'
import BattleLandingScreen from './landing/BattleLandingScreen.vue'
import BattleLoadingScreen from './loading/BattleLoadingScreen.vue'
import RiftBattleBoard from './rift/RiftBattleBoard.vue'
import HonorResultScreen from './result/HonorResultScreen.vue'
import { useBattleStore } from '@/stores/battleStore'
import {
  LOADING_PHASE_POLL_MS,
  PLANET_SEARCH_ANIM_DURATION_MS,
  UNIVERSE_ANIM_MIN_REMAINING_MS,
} from '@/config/constants'

export default defineComponent({
  name: 'BattleResultComponent',
  components: {
    PlanetSearchComponent,
    PlanetBattleBackgroundComponent,
    BattleLandingScreen,
    BattleLoadingScreen,
    RiftBattleBoard,
    HonorResultScreen,
  },

  setup() {
    const battleStore = useBattleStore()

    const isStarting = ref(false)
    const isUniverseAnimating = ref(false)
    const universeAnim = ref<{ trigger: () => Promise<void>; stopAnimation: () => void } | null>(
      null,
    )

    async function runUniverseAnimation(): Promise<void> {
      isUniverseAnimating.value = true
      const t0 = Date.now()
      await universeAnim.value?.trigger()
      // Wird das Bard-Modal während der Suchphase geschlossen, unmountet die
      // PlanetSearchComponent und resolved ihr Animations-Promise sofort
      // (stopAnimation). Die Suchphase ist aber Teil des Spielablaufs, nicht
      // nur Deko: restliche Dauer real abwarten, sonst springt der Gamestatus
      // direkt ins Battle. Im Normalfall (Animation komplett) ist remaining ≤ 0.
      const remaining = PLANET_SEARCH_ANIM_DURATION_MS - (Date.now() - t0)
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining))
      isUniverseAnimating.value = false
    }

    /**
     * Loading phase: the store owns both its start and its end (timestamp +
     * timer + syncFromTimestamps rescue), this only waits it out so the caller
     * keeps its linear phase chain. Closing the tab mid-phase therefore changes
     * nothing about when the match starts.
     */
    async function awaitLoadingPhase(): Promise<void> {
      battleStore.beginLoadingPhase()
      while (
        battleStore.loadingPhaseStartTimestamp > 0 &&
        battleStore.battlePhaseStartTimestamp === 0 &&
        !battleStore.showAutoBattleResult
      ) {
        await new Promise((r) => setTimeout(r, LOADING_PHASE_POLL_MS))
      }
    }

    watch(
      () => battleStore.simulationReadyToStart,
      async (newVal) => {
        if (newVal && battleStore.isAutoBattleInitialized) {
          battleStore.simulationReadyToStart = false
          await runUniverseAnimation()
          await awaitLoadingPhase()
          battleStore.beginSimulation()
        }
      },
    )

    // Re-entering the battle tab mid-search: the component remounts with
    // isUniverseAnimating=false while the search phase (driven by timestamps,
    // it kept running in the background) is still active — without this the
    // tab would jump straight to the battle board. Resume the warp visual for
    // the remaining search time; beginSimulation() is NOT called here, the
    // original (still pending) chain from before the unmount handles that.
    onMounted(async () => {
      if (
        !battleStore.isAutoBattleInitialized ||
        battleStore.searchingPhaseStartTimestamp <= 0 ||
        battleStore.battlePhaseStartTimestamp > 0 ||
        battleStore.showAutoBattleResult
      ) {
        return
      }
      const remaining =
        PLANET_SEARCH_ANIM_DURATION_MS -
        (Date.now() - battleStore.searchingPhaseStartTimestamp)
      if (remaining < UNIVERSE_ANIM_MIN_REMAINING_MS) return
      isUniverseAnimating.value = true
      void universeAnim.value?.trigger()
      const deadline = Date.now() + remaining
      while (
        Date.now() < deadline &&
        battleStore.battlePhaseStartTimestamp === 0 &&
        !battleStore.showAutoBattleResult
      ) {
        await new Promise((r) => setTimeout(r, 100))
      }
      universeAnim.value?.stopAnimation()
      isUniverseAnimating.value = false
      // Hand the stage straight to the loading screen instead of waiting for
      // the store's rescue poll — the phase is due the moment the warp ends.
      if (battleStore.battlePhaseStartTimestamp === 0 && !battleStore.showAutoBattleResult) {
        battleStore.beginLoadingPhase()
      }
    })

    const startBattle = async () => {
      if (isStarting.value) return
      if (battleStore.isAutoBattleInitialized) {
        // Battle loop already running — just return from the landing peek to the live view.
        battleStore.isViewingLanding = false
        return
      }
      isStarting.value = true
      battleStore.searchingPhaseStartTimestamp = Date.now()
      await runUniverseAnimation()
      await battleStore.initializePersistentAutoBattle()
      // The loading screen takes over from here; releasing isStarting first
      // lets the landing fall away behind it.
      isStarting.value = false
      await awaitLoadingPhase()
      battleStore.beginSimulation()
    }

    const planetVariant = computed(() => battleStore.currentBattleId % 5)

    /** Loading screen owns the stage for its whole phase (see battleStore). */
    const isLoadingPhase = computed(() => battleStore.currentBattlePhase === 'loading')

    return {
      battleStore,
      isStarting,
      isUniverseAnimating,
      isLoadingPhase,
      universeAnim,
      planetVariant,
      startBattle,
    }
  },
})
</script>

<style scoped>
/* Landing screen fade */
.start-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.start-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

/* Loading screen fade — arrives with the planet, leaves into the rift */
.loading-fade-enter-active {
  transition: opacity 0.35s ease;
}
.loading-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.loading-fade-enter-from {
  opacity: 0;
}
.loading-fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
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
