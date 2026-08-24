<template>
  <div class="relative flex flex-col w-full h-full overflow-hidden">
    <!-- ══ PHASE 2 · PLANET SEARCH (warp overlay, triggers itself) ══ -->
    <PlanetSearchComponent ref="universeAnim" :variant="planetVariant" />

    <!-- ══ PHASE 1 · LANDING (career stats + start) ══
         `isRiftReady` ist bei laufendem Kampf immer wahr — das Sperrpanel kann
         also nur den Landing-Screen ersetzen, nie eine Kampfphase verdecken. -->
    <Transition name="start-fade">
      <RiftLockedPanel v-if="landingShowing && !battleStore.isRiftReady" />
      <BattleLandingScreen
        v-else-if="landingShowing"
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

    <!-- ══ Ladeschleier ══
         Deckt, was beim Öffnen des Tabs entsteht — je nach Spielstand das
         Rift-Board oder der Landing-Screen — und blendet danach über dem
         fertigen weg. Er trägt Farbe und Wappen der LAUFENDEN Phase, nicht der
         beim Aufziehen gültigen: endet der Kampf während seiner Standzeit,
         wechselt er mit. -->
    <Transition name="btl-reveal">
      <BattleTabLoader
        v-if="loaderVisible"
        :phase-key="battleStore.currentBattlePhase"
        :variant="loaderVariant"
        :started-at="loaderStartedAt"
      />
    </Transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import PlanetSearchComponent from './PlanetSearchComponent.vue'
import PlanetBattleBackgroundComponent from './PlanetBattleBackgroundComponent.vue'
import BattleLandingScreen from './landing/BattleLandingScreen.vue'
import RiftLockedPanel from './landing/RiftLockedPanel.vue'
import BattleLoadingScreen from './loading/BattleLoadingScreen.vue'
import RiftBattleBoard from './rift/RiftBattleBoard.vue'
import HonorResultScreen from './result/HonorResultScreen.vue'
import BattleTabLoader from './BattleTabLoader.vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useUiStore } from '@/stores/core/uiStore'
import {
  LOADING_PHASE_POLL_MS,
  PLANET_SEARCH_ANIM_DURATION_MS,
  UNIVERSE_ANIM_MIN_REMAINING_MS,
  BATTLE_TAB_LOADER_SETTLE_FRAMES,
  BATTLE_TAB_LOADER_MIN_MS,
  BATTLE_TAB_LOADER_REPEAT_MIN_MS,
  BATTLE_TAB_LANDING_LOADER_MIN_MS,
} from '@/config/constants'
import { gameNow, gameTimeout } from '@/utils/game/gameClock'

export default defineComponent({
  name: 'BattleResultComponent',
  components: {
    PlanetSearchComponent,
    PlanetBattleBackgroundComponent,
    BattleLandingScreen,
    RiftLockedPanel,
    BattleLoadingScreen,
    RiftBattleBoard,
    HonorResultScreen,
    BattleTabLoader,
  },

  setup() {
    const battleStore = useBattleStore()
    const uiStore = useUiStore()

    const isStarting = ref(false)
    const isUniverseAnimating = ref(false)
    const universeAnim = ref<{ trigger: () => Promise<void>; stopAnimation: () => void } | null>(
      null,
    )

    /**
     * Steht gerade der Landing-Screen? Eine Wahrheit für zweierlei: sein eigenes
     * `v-if` und die Wahl des Schleier-Skeletts. Liefe beides getrennt, deckte
     * der Schleier irgendwann ein anderes Bild ab, als danach erscheint — und
     * ein Platzhalter mit fremden Maßen ersetzt den Ruckler nur durch einen
     * Sprung.
     */
    const landingShowing = computed(
      () =>
        (!battleStore.isAutoBattleInitialized || battleStore.isViewingLanding) &&
        !isUniverseAnimating.value &&
        !isStarting.value,
    )

    async function runUniverseAnimation(): Promise<void> {
      isUniverseAnimating.value = true
      const t0 = gameNow()
      await universeAnim.value?.trigger()
      // Wird das Bard-Modal während der Suchphase geschlossen, unmountet die
      // PlanetSearchComponent und resolved ihr Animations-Promise sofort
      // (stopAnimation). Die Suchphase ist aber Teil des Spielablaufs, nicht
      // nur Deko: restliche Dauer real abwarten, sonst springt der Gamestatus
      // direkt ins Battle. Im Normalfall (Animation komplett) ist remaining ≤ 0.
      const remaining = PLANET_SEARCH_ANIM_DURATION_MS - (gameNow() - t0)
      if (remaining > 0) await new Promise((r) => gameTimeout(() => r(null), remaining))
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
        (gameNow() - battleStore.searchingPhaseStartTimestamp)
      if (remaining < UNIVERSE_ANIM_MIN_REMAINING_MS) return
      isUniverseAnimating.value = true
      void universeAnim.value?.trigger()
      const deadline = gameNow() + remaining
      while (
        gameNow() < deadline &&
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

    /**
     * ── Ladeschleier ──
     *
     * Dieser Tab bleibt als einziger dauerhaft gemountet (die Simulation läuft
     * weiter, während niemand hinsieht) — sein Öffnen ist also kein Mount,
     * sondern das Wiedereinblenden eines `display: none`-Teilbaums. Genau das
     * ist hier teuer: verworfen werden Style, Layout und Layer des ganzen
     * laufenden Rift-Boards, und aufgebaut werden sie in einem Frame neu.
     * Die Messwerte stehen bei BATTLE_TAB_LOADER_MIN_MS.
     *
     * Anders als bei Team-Tab und Star-Fight-Arena läuft er deshalb bei JEDEM
     * Öffnen, nur kürzer, sobald das Board schon einmal stand — dort fiel die
     * Wiederholung auf Grundlast, hier bleibt sie bei 97 ms längstem Frame.
     */
    const loaderVisible = ref(false)
    const loaderStartedAt = ref(0)
    /** Stand das Board in dieser Sitzung schon einmal? Steuert nur die Standzeit. */
    const boardBuilt = ref(false)
    let revealTimer: ReturnType<typeof setTimeout> | null = null
    let revealFrame = 0

    /**
     * Zwei Bilder rechtfertigen einen Schleier: das Rift-Board und der
     * Landing-Screen. Suchphase und Champion-Ladebildschirm bekommen keinen —
     * beide sind selbst schon eine Inszenierung des Wartens, ein Schleier davor
     * verdeckte nur die Inszenierung.
     */
    const riftBoardShowing = computed(
      () =>
        battleStore.isAutoBattleInitialized &&
        !battleStore.isViewingLanding &&
        battleStore.currentBattlePhase === 'battle',
    )

    /** Welches Skelett der Schleier zeigt — die Maße folgen dem, was entsteht. */
    const loaderVariant = computed<'rift' | 'landing'>(() =>
      landingShowing.value ? 'landing' : 'rift',
    )

    function cancelLoader() {
      if (revealTimer !== null) {
        clearTimeout(revealTimer)
        revealTimer = null
      }
      cancelAnimationFrame(revealFrame)
    }

    /** Zählt Frames, bis das wiedereingeblendete Board auch gezeichnet ist. */
    function revealWhenPainted() {
      let left = BATTLE_TAB_LOADER_SETTLE_FRAMES
      const step = () => {
        if (--left > 0) {
          revealFrame = requestAnimationFrame(step)
          return
        }
        // Vor dem Landing wird kürzer gedeckt: dort entsteht weniger, und am
        // Ende wartet ein Startknopf — jede Millisekunde darüber hinaus hielte
        // den Spieler von der Handlung ab, für die er den Tab geöffnet hat.
        const landing = loaderVariant.value === 'landing'
        const minMs = landing
          ? BATTLE_TAB_LANDING_LOADER_MIN_MS
          : boardBuilt.value
            ? BATTLE_TAB_LOADER_REPEAT_MIN_MS
            : BATTLE_TAB_LOADER_MIN_MS
        const shown = performance.now() - loaderStartedAt.value
        revealTimer = setTimeout(
          () => {
            revealTimer = null
            // Der Merker gehört dem BOARD: hätte ein Landing-Öffnen ihn gesetzt,
            // liefe der erste echte Board-Aufbau schon mit der kurzen Standzeit.
            if (!landing) boardBuilt.value = true
            loaderVisible.value = false
          },
          Math.max(0, minMs - shown),
        )
      }
      revealFrame = requestAnimationFrame(step)
    }

    // Der Auslöser ist die SICHTBARKEIT des Tabs, nicht ein bestimmter Weg
    // dorthin: Scoreboard, Tab-Leiste, Kürzel und Return-Button teilen sich
    // denselben Aufbau und damit denselben Schleier. `immediate` deckt das
    // allererste Öffnen ab, bei dem diese Komponente selbst erst entsteht.
    watch(
      () => uiStore.bardActiveTab === 'battle',
      (visible) => {
        cancelLoader()
        if (!visible) {
          // Ein noch laufender Ladevorgang gehört zu einem Tab, der bereits zu
          // ist — beim nächsten Öffnen zieht der Schleier ohnehin neu auf.
          loaderVisible.value = false
          return
        }
        if (!riftBoardShowing.value && !landingShowing.value) return
        loaderStartedAt.value = performance.now()
        loaderVisible.value = true
        revealWhenPainted()
      },
      { immediate: true },
    )

    onBeforeUnmount(cancelLoader)

    const startBattle = async () => {
      if (isStarting.value) return
      if (battleStore.isAutoBattleInitialized) {
        // Battle loop already running — just return from the landing peek to the live view.
        battleStore.isViewingLanding = false
        return
      }
      isStarting.value = true
      battleStore.searchingPhaseStartTimestamp = gameNow()
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
      landingShowing,
      universeAnim,
      planetVariant,
      startBattle,
      loaderVisible,
      loaderVariant,
      loaderStartedAt,
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

/* Ladeschleier: nur Aufdecken, kein Einblenden. Eine Enter-Blende hieße, den
   Aufbau eine Blendendauer lang halbdurchsichtig zu zeigen — also genau das,
   was verdeckt werden soll. */
.btl-reveal-leave-active {
  transition: opacity 0.3s ease;
}
.btl-reveal-leave-to {
  opacity: 0;
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
