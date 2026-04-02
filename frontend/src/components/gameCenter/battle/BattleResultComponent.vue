<template>
  <div class="relative flex flex-col w-full h-full p-4 space-y-3 overflow-hidden">
    <!-- ══ START SCREEN ══ -->
    <Transition name="start-fade">
      <div
        v-if="!battleStore.isAutoBattleInitialized"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 start-screen"
      >
        <div class="start-crest">⚔️</div>
        <div class="start-title">RANKED QUEUE</div>
        <p class="start-desc">
          Bard betritt die Arena. Der Auto-Battle läuft im Hintergrund weiter –<br />
          auch wenn du den Tab schließt.
        </p>
        <button class="start-btn" :disabled="isStarting" @click="startBattle">
          <span class="start-btn-icon">{{ isStarting ? '⏳' : '⚔️' }}</span>
          {{ isStarting ? 'WIRD GESTARTET...' : 'KAMPF STARTEN' }}
        </button>
      </div>
    </Transition>

    <!-- ══ BATTLE UI ══ -->
    <template v-if="battleStore.isAutoBattleInitialized">
      <!-- Battle Header Bar -->
      <div class="flex items-center justify-between flex-shrink-0 p-3 battle-header">
        <span class="battle-id-badge px-2 py-0.5 text-xs font-black tracking-wider">
          Battle #{{ currentBattleId }}
        </span>

        <!-- Letztes Ergebnis kompakt -->
        <div
          v-if="battleStore.battlePhase === 'playing' && battleStore.lastAutoBattleResult"
          class="flex items-center gap-1.5 px-2 py-1 text-xs font-black"
          :class="lastResult.won ? 'last-result--win' : 'last-result--loss'"
        >
          <span>{{ lastResult.won ? '🏆' : '💀' }}</span>
          <span>{{ lpChange >= 0 ? '+' : '' }}{{ lpChange }} LP</span>
        </div>

        <!-- Countdown -->
        <div
          v-if="isAutoBattleActive && battleStore.battlePhase === 'playing'"
          class="flex items-center gap-2 px-3 py-1 countdown-badge"
        >
          <span class="text-xs animate-spin">⏱️</span>
          <span class="text-xs font-black"> {{ timeUntilNextBattle }}s </span>
        </div>

        <!-- W/L Session Badge -->
        <div
          v-if="battleStore.battlePhase === 'playing'"
          class="flex items-center gap-1 px-2 py-1 wl-badge"
        >
          <span class="wl-win">{{ battleStore.totalWins }}W</span>
          <span class="wl-sep">/</span>
          <span class="wl-loss">{{ battleStore.totalLosses }}L</span>
        </div>
      </div>

      <!-- Two-column layout: MiniMap left | Chat+Scoreboard right -->
      <div class="flex flex-row flex-1 min-h-0 gap-3">
        <!-- Left: MiniMap -->
        <div class="flex items-center justify-center flex-1 min-w-0 min-h-0">
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
import { defineComponent, computed, ref } from 'vue'
import MiniMapComponent from './MiniMapComponent.vue'
import ChatPanelComponent from './ChatPanelComponent.vue'
import ScoreboardComponent from './ScoreboardComponent.vue'
import { useBattleStore } from '../../../stores/battleStore'

export default defineComponent({
  name: 'BattleResultComponent',
  components: { MiniMapComponent, ChatPanelComponent, ScoreboardComponent },
  setup() {
    const battleStore = useBattleStore()

    const isStarting = ref(false)
    const startBattle = async () => {
      if (isStarting.value) return
      isStarting.value = true
      await battleStore.initializePersistentAutoBattle()
      isStarting.value = false
    }

    const score = computed(() => ({
      team1Kills: battleStore.team1.reduce((sum, c) => sum + c.kills, 0),
      team2Kills: battleStore.team2.reduce((sum, c) => sum + c.kills, 0),
    }))

    const isAutoBattleActive = computed(() => battleStore.autoBattleEnabled)
    const timeUntilNextBattle = computed(() => battleStore.timeUntilNextBattle)
    const currentBattleId = computed(() => battleStore.currentBattleId)
    const lastResult = computed(() => battleStore.lastAutoBattleResult ?? { won: false })
    const lpChange = computed(() => battleStore.lastLpChange ?? 0)

    return {
      lastResult,
      lpChange,
      isAutoBattleActive,
      timeUntilNextBattle,
      currentBattleId,
      battleStore,
      score,
      startBattle,
      isStarting,
    }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   BATTLE HEADER
   ═══════════════════════════════════════════ */
.battle-header {
  background: var(--rpg-bg-header);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  box-shadow: 0 4px 12px #00000066;
}

.battle-id-badge {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  color: var(--rpg-text-muted);
}

.last-result--win {
  background: #52b8301f;
  border: 1px solid #52b8304d;
  border-radius: 4px;
  color: var(--rpg-green-top);
}

.last-result--loss {
  background: #cc60501f;
  border: 1px solid #cc60504d;
  border-radius: 4px;
  color: var(--rpg-red);
}

.countdown-badge {
  background: #5b8dd926;
  border: 1px solid #5b8dd94d;
  border-radius: 4px;
  color: var(--rpg-text-muted);
}

/* ═══════════════════════════════════════════
   W/L SESSION BADGE
   ═══════════════════════════════════════════ */
.wl-badge {
  background: #0a0a0a33;
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
}

.wl-win {
  font-size: 11px;
  font-weight: 900;
  color: var(--rpg-green-top);
  text-shadow: 0 0 8px #52b83066;
}

.wl-sep {
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.2);
}

.wl-loss {
  font-size: 11px;
  font-weight: 900;
  color: var(--rpg-red);
  text-shadow: 0 0 8px #cc605066;
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
</style>
