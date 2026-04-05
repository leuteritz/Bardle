<template>
  <div class="relative flex flex-col w-full h-full p-4 space-y-3 overflow-hidden">
    <!-- ══ UNIVERSE ANIMATION (eigene Komponente) ══ -->
    <PlanetSearchComponent ref="universeAnim" :variant="planetVariant" />

    <!-- ══ START SCREEN ══ -->
    <Transition name="start-fade">
      <div
        v-if="!battleStore.isAutoBattleInitialized && !isUniverseAnimating && !isStarting"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 start-screen"
      >
        <div class="start-crest">
          <img src="/img/menu/BATTLE.png" class="start-crest-img" alt="Battle" />
        </div>
        <div class="start-title">RANKED QUEUE</div>
        <p class="start-desc">
          Bard betritt die Arena. Der Auto-Battle läuft im Hintergrund weiter –<br />
          auch wenn du den Tab schließt.
        </p>
        <button class="start-btn" :disabled="isStarting" @click="startBattle">
          <span class="start-btn-icon">
            <template v-if="isStarting">⏳</template>
            <img v-else src="/img/menu/BATTLE.png" class="start-btn-img" alt="Battle" />
          </span>
          {{ isStarting ? 'WIRD GESTARTET...' : 'KAMPF STARTEN' }}
        </button>
      </div>
    </Transition>

    <!-- ══ BATTLE UI ══ -->
    <template v-if="battleStore.isAutoBattleInitialized && !isUniverseAnimating">
      <!-- ── PLANET BATTLE BACKGROUND ─────────────────────────────────────── -->
      <div class="absolute inset-0 z-0 pointer-events-none planet-battle-bg" aria-hidden="true">
        <!-- Starfield -->
        <div class="starfield" aria-hidden="true" />

        <!-- Planet sphere -->
        <div class="planet-sphere" :class="`planet-v${planetVariant}`">
          <div class="planet-atmo" />
          <div class="planet-terrain" :class="`terrain-v${planetVariant}`" />
          <div class="planet-cloud" />
          <div class="planet-highlight" />
          <div class="planet-rim" :class="`rim-v${planetVariant}`" />
        </div>

        <!-- Atmospheric glow halo (outside sphere, in background) -->
        <div class="planet-halo" :class="`halo-v${planetVariant}`" />
      </div>

      <!-- Two-column layout: MiniMap left | Chat+Scoreboard right -->
      <div class="relative z-10 flex flex-row flex-1 min-h-0 gap-3">
        <!-- Left: MiniMap -->
        <div class="flex flex-col items-center justify-center flex-1 min-w-0 min-h-0">
          <!-- Status Bar above MiniMap -->
          <div class="status-bar">
            <div class="status-chip">
              <span class="status-chip-icon">{{ rankIcon }}</span>
              <div class="status-chip-body">
                <span class="status-chip-label">RANG</span>
                <span class="status-chip-rank-row">
                  <span
                    class="status-chip-value"
                    :class="`rank-tier--${battleStore.currentRank.tier.toLowerCase()}`"
                  >
                    {{ battleStore.currentRank.tier }} {{ battleStore.currentRank.division }}
                  </span>
                  <span class="status-lp-badge">{{ battleStore.currentRank.lp }} LP</span>
                </span>
              </div>
            </div>
            <div class="status-divider" />
            <div class="status-chip">
              <div class="status-chip-body">
                <span class="status-chip-label">SAISON</span>
                <span class="status-chip-wl">
                  <span class="status-val-win">{{ battleStore.totalWins }}W</span>
                  <span class="status-wl-slash">/</span>
                  <span class="status-val-loss">{{ battleStore.totalLosses }}L</span>
                </span>
              </div>
            </div>
            <div class="status-divider" />
            <div class="status-chip">
              <div class="status-chip-body">
                <span class="status-chip-label">WIN CHANCE</span>
                <span class="status-chip-value status-chip-chance">
                  {{ Math.round(battleStore.currentWinProbability * 100) }}%
                </span>
              </div>
            </div>
          </div>
          <MiniMapComponent
            class="w-full max-h-full aspect-square"
            :battle-id="currentBattleId"
            :score="score"
          />
        </div>
        <!-- Right: Chat + Scoreboard -->
        <div class="flex flex-col flex-shrink-0 h-full gap-3 w-72">
          <ChatPanelComponent class="flex-1 min-h-0" />
          <ScoreboardComponent class="flex-1 min-h-0" />
        </div>
      </div>
    </template>
  </div>

  <!-- Result Modal (Teleport) -->
  <Teleport to="body">
    <div
      v-if="battleStore.battlePhase === 'result' && battleStore.showAutoBattleResult"
      class="fixed inset-0 z-[9999] flex items-center justify-center rpg-overlay"
    >
      <div
        class="relative w-full max-w-sm p-6 mx-4 text-center result-modal rpg-frame"
        :class="lastResult.won ? 'result-modal--win' : 'result-modal--loss'"
      >
        <div class="mb-4 rpg-accent-bar" />
        <div class="mb-2 text-5xl">{{ lastResult.won ? '🏆' : '💀' }}</div>
        <div
          class="mb-3 text-3xl font-black tracking-widest"
          :class="lastResult.won ? 'result-text--win' : 'result-text--loss'"
        >
          {{ lastResult.won ? 'VICTORY!' : 'DEFEAT!' }}
        </div>
        <div
          class="lp-badge inline-flex items-center gap-1 px-4 py-1.5 text-sm font-black mb-5"
          :class="lpChange >= 0 ? 'lp-badge--pos' : 'lp-badge--neg'"
        >
          {{ lpChange >= 0 ? '+' : '' }}{{ lpChange }} LP
        </div>
        <div class="flex items-center justify-center gap-3">
          <button
            @click="battleStore.manualDismissResult()"
            class="px-5 py-2 text-sm font-black result-btn"
          >
            Weiter →
          </button>
          <button
            @click="battleStore.toggleAutoSkip()"
            class="px-4 py-2 text-sm font-black result-btn"
            :class="battleStore.autoSkipEnabled ? 'result-btn--active' : ''"
          >
            {{ battleStore.autoSkipEnabled ? '⏭️ Auto-Skip AN' : '⏸️ Auto-Skip AUS' }}
            <span
              v-if="battleStore.autoSkipEnabled && battleStore.resultCountdown > 0"
              class="ml-1 text-xs opacity-70"
            >
              ({{ battleStore.resultCountdown }}s)
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import MiniMapComponent from './MiniMapComponent.vue'
import ChatPanelComponent from './ChatPanelComponent.vue'
import ScoreboardComponent from './ScoreboardComponent.vue'
import PlanetSearchComponent from './PlanetSearchComponent.vue'
import { useBattleStore } from '../../../stores/battleStore'

export default defineComponent({
  name: 'BattleResultComponent',
  components: {
    MiniMapComponent,
    ChatPanelComponent,
    ScoreboardComponent,
    PlanetSearchComponent,
  },

  setup() {
    const battleStore = useBattleStore()

    const isStarting = ref(false)
    const isUniverseAnimating = ref(false)

    // Template ref to the child animation component
    const universeAnim = ref<{ trigger: () => Promise<void> } | null>(null)

    // ── Run the universe animation via the child component ────────────────────

    async function runUniverseAnimation(): Promise<void> {
      isUniverseAnimating.value = true
      await universeAnim.value?.trigger()
      isUniverseAnimating.value = false
    }

    // ── Watch: after a result is dismissed, transition to the next battle ─────

    watch(
      () => battleStore.showAutoBattleResult,
      async (newVal, oldVal) => {
        if (oldVal === true && newVal === false && battleStore.isAutoBattleInitialized) {
          battleStore.pauseBattleSimulation()
          await runUniverseAnimation()
          battleStore.startBattleSimulation()
        }
      },
    )

    // ── Start battle from the start screen ───────────────────────────────────

    const startBattle = async () => {
      if (isStarting.value) return
      isStarting.value = true
      await runUniverseAnimation()
      await battleStore.initializePersistentAutoBattle()
      isStarting.value = false
    }

    // ── Derived display values ────────────────────────────────────────────────

    const rankIcon = computed(() => {
      const icons: Record<string, string> = {
        Iron: '🔩',
        Bronze: '🥉',
        Silver: '🥈',
        Gold: '🥇',
        Platinum: '💎',
        Emerald: '🌿',
        Diamond: '💠',
        Master: '👑',
        Grandmaster: '🔱',
        Challenger: '⚡',
      }
      return icons[battleStore.currentRank.tier] ?? '🎯'
    })

    const score = computed(() => ({
      team1Kills: battleStore.team1.reduce((sum, c) => sum + c.kills, 0),
      team2Kills: battleStore.team2.reduce((sum, c) => sum + c.kills, 0),
    }))

    const currentBattleId = computed(() => battleStore.currentBattleId)
    const lastResult = computed(() => battleStore.lastAutoBattleResult ?? { won: false })
    const lpChange = computed(() => battleStore.lastLpChange ?? 0)
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
      lastResult,
      lpChange,
      rankIcon,
    }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   PLANET BATTLE BACKGROUND
   ═══════════════════════════════════════════ */
.planet-battle-bg {
  overflow: hidden;
  background: radial-gradient(ellipse at 22% 78%, #0b1424 0%, #05080e 100%);
}

/* ═══════════════════════════════════════════
   STARFIELD
   ═══════════════════════════════════════════ */
.starfield {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: starfieldTwinkle 9s ease-in-out infinite;
  background-image:
    radial-gradient(circle 1.2px at 16% 5%, rgba(255, 255, 255, 0.95) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 42% 15%, rgba(220, 235, 255, 0.9) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 72% 8%, rgba(255, 255, 255, 0.92) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 88% 22%, rgba(220, 235, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 28% 32%, rgba(255, 255, 255, 0.9) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 58% 42%, rgba(200, 220, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 85% 55%, rgba(255, 255, 255, 0.92) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 12% 65%, rgba(220, 235, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 38% 78%, rgba(255, 255, 255, 0.85) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 68% 68%, rgba(200, 220, 255, 0.9) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 92% 85%, rgba(255, 255, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 52% 92%, rgba(220, 235, 255, 0.85) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 8% 14%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 23% 8%, rgba(200, 215, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 38% 21%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 53% 11%, rgba(220, 230, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 68% 18%, rgba(255, 255, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 83% 8%, rgba(200, 215, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 97% 22%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 15% 38%, rgba(220, 230, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 30% 28%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 45% 42%, rgba(200, 215, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 60% 32%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 75% 45%, rgba(220, 230, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 90% 32%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 7% 58%, rgba(200, 215, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 22% 52%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 37% 62%, rgba(220, 230, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 52% 55%, rgba(255, 255, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 67% 65%, rgba(200, 215, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 82% 52%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 96% 62%, rgba(220, 230, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 18% 75%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 33% 85%, rgba(200, 215, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 48% 78%, rgba(255, 255, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 63% 88%, rgba(220, 230, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 78% 75%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 5% 8%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 13% 22%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 22% 5%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 31% 18%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 40% 11%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 49% 25%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 58% 7%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 67% 19%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 76% 13%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 85% 28%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 94% 6%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 3% 35%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 11% 42%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 20% 38%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 29% 48%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 38% 32%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 47% 45%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 56% 38%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 65% 48%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 74% 33%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 83% 45%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 92% 38%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 8% 55%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 17% 62%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 26% 58%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 35% 65%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 44% 52%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 53% 68%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 62% 55%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 71% 65%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 80% 58%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 89% 72%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 97% 55%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 4% 72%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 12% 78%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 21% 68%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 30% 82%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 39% 75%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 48% 88%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 57% 72%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 66% 85%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 75% 78%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 84% 92%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 93% 78%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 6% 95%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 25% 92%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 44% 97%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 63% 95%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 82% 97%, rgba(255, 255, 255, 0.42) 0%, transparent 100%);
}

/* ═══════════════════════════════════════════
   PLANET SPHERE
   ═══════════════════════════════════════════ */
.planet-sphere {
  position: absolute;
  width: 74%;
  aspect-ratio: 1;
  border-radius: 50%;
  bottom: -15%;
  left: -10%;
  background: radial-gradient(circle at 36% 30%, #2a4878, #0e1a3a, #060c1e);
}

.planet-v0 {
  background: radial-gradient(circle at 36% 30%, #2a4878 0%, #0e1a3a 45%, #060c1e 100%);
}
.planet-v1 {
  background: radial-gradient(circle at 36% 30%, #78340a 0%, #3a1404 45%, #160700 100%);
}
.planet-v2 {
  background: radial-gradient(circle at 36% 30%, #6e1010 0%, #2e0606 45%, #120202 100%);
}
.planet-v3 {
  background: radial-gradient(circle at 36% 30%, #0e4a1c 0%, #041e08 45%, #010a02 100%);
}
.planet-v4 {
  background: radial-gradient(circle at 36% 30%, #3c1260 0%, #180528 45%, #080010 100%);
}

.planet-atmo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 50% -5%, rgba(100, 160, 255, 0.22) 0%, transparent 55%);
  mix-blend-mode: screen;
}

.planet-terrain {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
}
.terrain-v0 {
  background:
    radial-gradient(ellipse 20% 13% at 44% 44%, rgba(15, 55, 110, 0.65) 0%, transparent 100%),
    radial-gradient(ellipse 14% 20% at 60% 54%, rgba(20, 70, 130, 0.55) 0%, transparent 100%),
    radial-gradient(ellipse 24% 11% at 34% 63%, rgba(10, 45, 90, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 11% 16% at 65% 36%, rgba(20, 40, 80, 0.45) 0%, transparent 100%);
}
.terrain-v1 {
  background:
    radial-gradient(ellipse 22% 12% at 42% 46%, rgba(120, 60, 10, 0.6) 0%, transparent 100%),
    radial-gradient(ellipse 13% 19% at 61% 52%, rgba(100, 40, 5, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 18% 10% at 35% 61%, rgba(80, 30, 8, 0.5) 0%, transparent 100%);
}
.terrain-v2 {
  background:
    radial-gradient(ellipse 18% 14% at 45% 45%, rgba(150, 20, 10, 0.6) 0%, transparent 100%),
    radial-gradient(ellipse 14% 18% at 62% 55%, rgba(120, 10, 5, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 20% 10% at 33% 62%, rgba(90, 15, 10, 0.5) 0%, transparent 100%);
}
.terrain-v3 {
  background:
    radial-gradient(ellipse 20% 13% at 44% 44%, rgba(15, 80, 25, 0.7) 0%, transparent 100%),
    radial-gradient(ellipse 14% 20% at 60% 54%, rgba(10, 65, 20, 0.6) 0%, transparent 100%),
    radial-gradient(ellipse 23% 11% at 34% 63%, rgba(20, 70, 15, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 11% 16% at 64% 37%, rgba(15, 55, 10, 0.5) 0%, transparent 100%);
}
.terrain-v4 {
  background:
    radial-gradient(ellipse 20% 13% at 44% 44%, rgba(70, 15, 110, 0.65) 0%, transparent 100%),
    radial-gradient(ellipse 14% 20% at 60% 54%, rgba(55, 10, 90, 0.55) 0%, transparent 100%),
    radial-gradient(ellipse 22% 11% at 34% 63%, rgba(80, 20, 100, 0.5) 0%, transparent 100%);
}

.planet-cloud {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  background:
    radial-gradient(ellipse 35% 5% at 55% 38%, rgba(255, 255, 255, 0.06) 0%, transparent 100%),
    radial-gradient(ellipse 25% 4% at 38% 56%, rgba(255, 255, 255, 0.04) 0%, transparent 100%);
  animation: cloudDrift 22s linear infinite;
}

.planet-highlight {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 26%, rgba(200, 230, 255, 0.1) 0%, transparent 42%);
}

.planet-rim {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  box-shadow:
    inset 0 0 40px rgba(60, 130, 255, 0.28),
    0 0 80px rgba(40, 100, 220, 0.24),
    0 0 160px rgba(30, 70, 180, 0.12);
  border: 1px solid rgba(80, 150, 255, 0.18);
}
.rim-v0 {
  box-shadow:
    inset 0 0 40px rgba(60, 130, 255, 0.28),
    0 0 80px rgba(40, 100, 220, 0.24),
    0 0 160px rgba(30, 70, 180, 0.12);
  border-color: rgba(80, 150, 255, 0.18);
}
.rim-v1 {
  box-shadow:
    inset 0 0 40px rgba(255, 130, 40, 0.28),
    0 0 80px rgba(220, 90, 20, 0.24),
    0 0 160px rgba(180, 60, 10, 0.12);
  border-color: rgba(255, 130, 60, 0.18);
}
.rim-v2 {
  box-shadow:
    inset 0 0 40px rgba(255, 60, 40, 0.3),
    0 0 80px rgba(220, 30, 20, 0.26),
    0 0 160px rgba(180, 10, 10, 0.14);
  border-color: rgba(255, 80, 60, 0.2);
}
.rim-v3 {
  box-shadow:
    inset 0 0 40px rgba(40, 200, 80, 0.28),
    0 0 80px rgba(20, 160, 50, 0.24),
    0 0 160px rgba(10, 120, 30, 0.12);
  border-color: rgba(60, 200, 80, 0.18);
}
.rim-v4 {
  box-shadow:
    inset 0 0 40px rgba(160, 60, 255, 0.3),
    0 0 80px rgba(120, 20, 220, 0.26),
    0 0 160px rgba(80, 0, 180, 0.14);
  border-color: rgba(160, 80, 255, 0.2);
}

/* ═══════════════════════════════════════════
   PLANET HALO
   ═══════════════════════════════════════════ */
.planet-halo {
  position: absolute;
  width: 86%;
  aspect-ratio: 1;
  border-radius: 50%;
  bottom: -28%;
  left: -16%;
  pointer-events: none;
  background: transparent;
}
.halo-v0 {
  box-shadow:
    0 0 100px 60px rgba(30, 80, 200, 0.12),
    0 0 200px 110px rgba(20, 60, 180, 0.07),
    0 0 320px 160px rgba(15, 45, 160, 0.04);
}
.halo-v1 {
  box-shadow:
    0 0 100px 60px rgba(200, 80, 20, 0.12),
    0 0 200px 110px rgba(180, 60, 10, 0.07),
    0 0 320px 160px rgba(160, 40, 5, 0.04);
}
.halo-v2 {
  box-shadow:
    0 0 100px 60px rgba(200, 20, 20, 0.14),
    0 0 200px 110px rgba(180, 10, 10, 0.08),
    0 0 320px 160px rgba(160, 5, 5, 0.05);
}
.halo-v3 {
  box-shadow:
    0 0 100px 60px rgba(20, 160, 50, 0.12),
    0 0 200px 110px rgba(10, 140, 30, 0.07),
    0 0 320px 160px rgba(5, 120, 20, 0.04);
}
.halo-v4 {
  box-shadow:
    0 0 100px 60px rgba(120, 30, 220, 0.14),
    0 0 200px 110px rgba(80, 0, 180, 0.08),
    0 0 320px 160px rgba(60, 0, 150, 0.05);
}

/* ═══════════════════════════════════════════
   STATUS BAR
   ═══════════════════════════════════════════ */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 0 0 6px;
  width: 100%;
  flex-shrink: 0;
}
.status-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px;
}
.status-chip-icon {
  font-size: 20px;
  line-height: 1;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.5));
}
.status-chip-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.status-chip-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #5a4a2a;
  text-transform: uppercase;
}
.status-chip-rank-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.status-chip-value {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #c8a060;
}
.status-lp-badge {
  font-size: 10px;
  font-weight: 700;
  color: #8a7040;
  letter-spacing: 0.5px;
  opacity: 0.85;
}
.status-chip-chance {
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.5);
}
.status-chip-wl {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 14px;
  font-weight: 900;
}
.status-wl-slash {
  color: #3e2a10;
  font-weight: 400;
  font-size: 12px;
}
.status-val-win {
  color: #52b830;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.45);
}
.status-val-loss {
  color: #cc6050;
  text-shadow: 0 0 8px rgba(204, 96, 80, 0.45);
}
.status-divider {
  width: 1px;
  height: 28px;
  background: linear-gradient(to bottom, transparent, #5c3310, transparent);
  flex-shrink: 0;
}

/* ── Rank tier accent colors ── */
.rank-tier--iron {
  color: #8a8a96;
  text-shadow: 0 0 8px rgba(138, 138, 150, 0.4);
}
.rank-tier--bronze {
  color: #c87840;
  text-shadow: 0 0 8px rgba(200, 120, 64, 0.4);
}
.rank-tier--silver {
  color: #b0b8c8;
  text-shadow: 0 0 8px rgba(176, 184, 200, 0.4);
}
.rank-tier--gold {
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.55);
}
.rank-tier--platinum {
  color: #50d0c8;
  text-shadow: 0 0 10px rgba(80, 208, 200, 0.5);
}
.rank-tier--emerald {
  color: #40c870;
  text-shadow: 0 0 10px rgba(64, 200, 112, 0.5);
}
.rank-tier--diamond {
  color: #70a8f8;
  text-shadow: 0 0 12px rgba(112, 168, 248, 0.55);
}
.rank-tier--master {
  color: #c878f0;
  text-shadow: 0 0 12px rgba(200, 120, 240, 0.55);
}
.rank-tier--grandmaster {
  color: #f87060;
  text-shadow: 0 0 12px rgba(248, 112, 96, 0.55);
}
.rank-tier--challenger {
  color: #f8e060;
  text-shadow: 0 0 14px rgba(248, 224, 96, 0.7);
}

/* ═══════════════════════════════════════════
   RESULT MODAL
   ═══════════════════════════════════════════ */
.result-modal--win {
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 0 30px #52b8304d;
}
.result-modal--loss {
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 0 30px #cc60504d;
}
.result-text--win {
  color: var(--rpg-green-top);
  text-shadow: 0 0 12px #52b83066;
}
.result-text--loss {
  color: var(--rpg-red);
  text-shadow: 0 0 12px #cc605066;
}

.lp-badge {
  border-radius: 4px;
  border: 1px solid;
}
.lp-badge--pos {
  background: #52b83026;
  border-color: #52b8304d;
  color: var(--rpg-green-top);
}
.lp-badge--neg {
  background: #cc605026;
  border-color: #cc60504d;
  color: var(--rpg-red);
}

.result-btn {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  color: var(--rpg-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.result-btn:hover {
  background: var(--rpg-bg-hover);
  border-color: var(--rpg-wood-mid);
  color: #fff;
  transform: scale(1.03);
}
.result-btn:active {
  transform: scale(0.96);
}
.result-btn--active {
  background: #a87ed826;
  border-color: #a87ed859;
  color: #c4a0ee;
}

/* ═══════════════════════════════════════════
   START SCREEN
   ═══════════════════════════════════════════ */
.start-screen {
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.start-crest {
  font-size: 72px;
  filter: drop-shadow(0 0 16px rgba(200, 150, 30, 0.6));
  animation: crestPulse 3s ease-in-out infinite;
}
.start-title {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 6px;
  color: #d4a020;
  text-shadow: 0 0 16px rgba(210, 160, 20, 0.5);
}
.start-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  line-height: 1.7;
  max-width: 340px;
}
.start-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 36px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 2px;
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border: 2px solid #4a8a28;
  border-radius: 4px;
  color: #6ec040;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow:
    0 0 16px rgba(74, 138, 40, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.start-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #28401a, #1a2a10);
  border-color: #6ec040;
  color: #8ee060;
  box-shadow:
    0 0 28px rgba(82, 184, 48, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: scale(1.04);
}
.start-btn:active:not(:disabled) {
  transform: scale(0.97);
}
.start-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  border-color: #3a6a20;
  color: #4a8028;
}
.start-btn-icon {
  font-size: 18px;
}
.start-crest-img {
  width: 250px;
  height: 250px;
  object-fit: contain;
  filter: drop-shadow(0 0 16px rgba(200, 150, 30, 0.6));
}
.start-btn-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: brightness(1.2);
}

/* ═══════════════════════════════════════════
   TRANSITIONS
   ═══════════════════════════════════════════ */
.start-fade-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}
.start-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

/* ═══════════════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════════════ */
@keyframes crestPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(200, 150, 30, 0.4));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 22px rgba(210, 160, 20, 0.75));
    transform: scale(1.06);
  }
}
@keyframes cloudDrift {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@keyframes starfieldTwinkle {
  0%,
  100% {
    opacity: 0.8;
  }
  25% {
    opacity: 1;
  }
  60% {
    opacity: 0.88;
  }
}

/* ─── prefers-reduced-motion ── */
@media (prefers-reduced-motion: reduce) {
  .start-crest,
  .planet-cloud,
  .starfield {
    animation: none !important;
  }
}
</style>
