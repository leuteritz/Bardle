<template>
  <div class="flex flex-col w-full h-full p-4 space-y-3 overflow-hidden">
    <!-- Battle Header Bar -->
    <div class="battle-header flex items-center justify-between p-3 flex-shrink-0">
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
        class="countdown-badge flex items-center gap-2 px-3 py-1"
      >
        <span class="text-xs animate-spin">⏱️</span>
        <span class="text-xs font-black"> {{ timeUntilNextBattle }}s </span>
      </div>

      <!-- Live-Indikator -->
      <div
        v-if="battleStore.battlePhase === 'playing'"
        class="live-badge flex items-center gap-1.5 px-2 py-1"
      >
        <div class="live-dot w-1.5 h-1.5 rounded-full animate-pulse" />
        <span class="text-xs font-black">LIVE</span>
      </div>
    </div>

    <!-- Two-column layout: MiniMap left | Chat+Scoreboard right -->
    <div class="flex flex-row flex-1 min-h-0 gap-3">
      <!-- Left: MiniMap square, fills available height -->
      <div class="flex items-center justify-center flex-1 min-w-0 min-h-0">
        <MiniMapComponent
          class="w-full max-h-full aspect-square"
          :battle-id="currentBattleId"
          :score="score"
        />
      </div>
      <!-- Right: Chat top + Scoreboard bottom, equal height split -->
      <div class="flex flex-col flex-shrink-0 h-full gap-3 w-72">
        <ChatPanelComponent class="flex-1 min-h-0" />
        <ScoreboardComponent class="flex-1 min-h-0" />
      </div>
    </div>
  </div>

  <!-- Result Modal (Teleport) -->
  <Teleport to="body">
    <div
      v-if="battleStore.battlePhase === 'result'"
      class="fixed inset-0 z-[9999] flex items-center justify-center rpg-overlay"
    >
      <div
        class="result-modal relative w-full max-w-sm p-6 mx-4 text-center rpg-frame"
        :class="lastResult.won ? 'result-modal--win' : 'result-modal--loss'"
      >
        <div class="rpg-accent-bar mb-4" />
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
            class="result-btn px-5 py-2 text-sm font-black"
          >
            Weiter →
          </button>
          <button
            @click="battleStore.toggleAutoSkip()"
            class="result-btn px-4 py-2 text-sm font-black"
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
import { defineComponent, computed } from 'vue'
import MiniMapComponent from './MiniMapComponent.vue'
import ChatPanelComponent from './ChatPanelComponent.vue'
import ScoreboardComponent from './ScoreboardComponent.vue'
import { useBattleStore } from '../../../stores/battleStore'

export default defineComponent({
  name: 'BattleResultComponent',
  components: { MiniMapComponent, ChatPanelComponent, ScoreboardComponent },
  setup() {
    const battleStore = useBattleStore()

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
    }
  },
})
</script>

<style scoped>
.battle-header {
  background: var(--rpg-bg-header);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.battle-id-badge {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  color: var(--rpg-text-muted);
}

.last-result--win {
  background: rgba(82, 184, 48, 0.12);
  border: 1px solid rgba(82, 184, 48, 0.3);
  border-radius: 4px;
  color: var(--rpg-green-top);
}

.last-result--loss {
  background: rgba(204, 96, 80, 0.12);
  border: 1px solid rgba(204, 96, 80, 0.3);
  border-radius: 4px;
  color: var(--rpg-red);
}

.countdown-badge {
  background: rgba(91, 141, 217, 0.15);
  border: 1px solid rgba(91, 141, 217, 0.3);
  border-radius: 4px;
  color: var(--rpg-text-muted);
}

.live-badge {
  background: rgba(82, 184, 48, 0.1);
  border: 1px solid rgba(82, 184, 48, 0.2);
  border-radius: 4px;
  color: var(--rpg-green-top);
}

.live-dot {
  background: var(--rpg-green-top);
}

.result-modal--win {
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 0 30px rgba(82, 184, 48, 0.3);
}

.result-modal--loss {
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 0 30px rgba(204, 96, 80, 0.3);
}

.result-text--win {
  color: var(--rpg-green-top);
  text-shadow: 0 0 12px rgba(82, 184, 48, 0.4);
}

.result-text--loss {
  color: var(--rpg-red);
  text-shadow: 0 0 12px rgba(204, 96, 80, 0.4);
}

.lp-badge {
  border-radius: 4px;
  border: 1px solid;
}

.lp-badge--pos {
  background: rgba(82, 184, 48, 0.15);
  border-color: rgba(82, 184, 48, 0.3);
  color: var(--rpg-green-top);
}

.lp-badge--neg {
  background: rgba(204, 96, 80, 0.15);
  border-color: rgba(204, 96, 80, 0.3);
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
  background: #252520;
  border-color: var(--rpg-wood-mid);
  color: #fff;
  transform: scale(1.03);
}

.result-btn:active {
  transform: scale(0.96);
}

.result-btn--active {
  background: rgba(168, 126, 216, 0.15);
  border-color: rgba(168, 126, 216, 0.35);
  color: #c4a0ee;
}
</style>
