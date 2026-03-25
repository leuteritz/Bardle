<template>
  <div class="flex flex-col w-full h-full p-4 space-y-3 overflow-hidden">
    <!-- Battle Header Bar -->
    <div
      class="flex items-center justify-between p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex-shrink-0"
    >
      <span
        class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
      >
        Battle #{{ currentBattleId }}
      </span>

      <!-- Letztes Ergebnis kompakt -->
      <div
        v-if="battleStore.battlePhase === 'playing' && battleStore.lastAutoBattleResult"
        class="flex items-center gap-1.5 px-2 py-1 rounded-xl border text-xs font-black backdrop-blur-sm"
        :class="
          lastResult.won
            ? 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300'
            : 'bg-red-500/15 border-red-400/25 text-red-300'
        "
      >
        <span>{{ lastResult.won ? '🏆' : '💀' }}</span>
        <span>{{ lpChange >= 0 ? '+' : '' }}{{ lpChange }} LP</span>
      </div>

      <!-- Countdown -->
      <div
        v-if="isAutoBattleActive && battleStore.battlePhase === 'playing'"
        class="flex items-center gap-2 px-3 py-1 border rounded-xl backdrop-blur-sm bg-blue-500/20 border-blue-400/30"
      >
        <span class="text-xs animate-spin">⏱️</span>
        <span class="text-xs font-black text-blue-200"> {{ timeUntilNextBattle }}s </span>
      </div>

      <!-- Live-Indikator -->
      <div
        v-if="battleStore.battlePhase === 'playing'"
        class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-400/20"
      >
        <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span class="text-xs font-black text-emerald-300">LIVE</span>
      </div>
    </div>

    <!-- Main Content: Minimap + Chat | Scoreboard -->
    <div class="flex-1 grid grid-cols-[1fr_14rem] grid-rows-1 gap-3 min-h-0">
      <MiniMapComponent class="flex-1 min-h-0" :battle-id="currentBattleId" :score="score" />
      <!-- Left: Minimap + Chat stacked -->
      <div class="flex flex-col min-h-0 gap-3">
        <ChatPanelComponent class="flex-shrink-0 h-28" />
      </div>

      <!-- Right: Scoreboard -->
      <ScoreboardComponent />
    </div>
  </div>

  <!-- Result Modal (Teleport) -->
  <Teleport to="body">
    <div
      v-if="battleStore.battlePhase === 'result'"
      class="fixed inset-0 z-50 flex items-center justify-center"
      style="background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px)"
    >
      <div
        class="relative w-full max-w-sm p-6 mx-4 text-center border shadow-2xl rounded-3xl"
        :class="
          lastResult.won
            ? 'bg-gradient-to-br from-emerald-900/80 to-black/90 border-emerald-400/40'
            : 'bg-gradient-to-br from-red-900/80 to-black/90 border-red-400/40'
        "
      >
        <div class="mb-2 text-5xl">{{ lastResult.won ? '🏆' : '💀' }}</div>
        <div
          class="mb-3 text-3xl font-black tracking-widest"
          :class="lastResult.won ? 'text-emerald-300' : 'text-red-300'"
        >
          {{ lastResult.won ? 'VICTORY!' : 'DEFEAT!' }}
        </div>
        <div
          class="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-black border mb-5"
          :class="
            lpChange >= 0
              ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
              : 'bg-red-500/20 border-red-400/30 text-red-300'
          "
        >
          {{ lpChange >= 0 ? '+' : '' }}{{ lpChange }} LP
        </div>
        <div class="flex items-center justify-center gap-3">
          <button
            @click="battleStore.manualDismissResult()"
            class="px-5 py-2 text-sm font-black transition-all duration-200 border rounded-xl hover:scale-105 active:scale-95 bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
          >
            Weiter →
          </button>
          <button
            @click="battleStore.toggleAutoSkip()"
            class="px-4 py-2 text-sm font-black transition-all duration-200 border rounded-xl hover:scale-105 active:scale-95"
            :class="
              battleStore.autoSkipEnabled
                ? 'bg-violet-500/20 border-violet-400/30 text-violet-300'
                : 'bg-white/5 border-white/15 text-white/40'
            "
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
