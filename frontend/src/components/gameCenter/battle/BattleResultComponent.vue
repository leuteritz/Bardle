<template>
  <div class="flex flex-col w-full p-4 space-y-3 overflow-y-auto">
    <!-- ─── Battle Header Bar ─── -->
    <div
      class="flex items-center justify-between p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <span
        class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
      >
        Battle #{{ currentBattleId }}
      </span>

      <!-- Letztes Ergebnis kompakt (während nächster Battle) -->
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

      <!-- Countdown (während Playing) -->
      <div
        v-if="isAutoBattleActive && battleStore.battlePhase === 'playing'"
        class="flex items-center gap-2 px-3 py-1 border rounded-xl backdrop-blur-sm bg-blue-500/20 border-blue-400/30"
      >
        <span class="text-xs animate-spin">⏱️</span>
        <span class="text-xs font-black text-blue-200"> {{ timeUntilNextBattle }}s </span>
      </div>

      <!-- Live-Indikator während Battle -->
      <div
        v-if="battleStore.battlePhase === 'playing'"
        class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-400/20"
      >
        <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span class="text-xs font-black text-emerald-300">LIVE</span>
      </div>
    </div>

    <!-- ─── Teams Side-by-Side ─── -->
    <div
      class="group relative overflow-hidden rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
    >
      <div
        class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
      />

      <div class="p-3 grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
        <!-- Team 1 (Blau) -->
        <div>
          <span
            class="inline-block mb-2 px-2 py-0.5 text-xs font-black rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 tracking-wider"
            >🔵 Dein Team</span
          >
          <div class="flex flex-wrap justify-center gap-2">
            <div
              v-for="(champ, idx) in battleStore.team1"
              :key="'team1-' + idx"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="relative flex items-center justify-center w-14 h-14 transition-transform duration-300 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-blue-400/30 hover:scale-110"
              >
                <div
                  class="absolute inset-0 rounded-xl blur-md opacity-40 bg-gradient-to-br from-blue-400/40 to-blue-600/20"
                />
                <img
                  :src="battleStore.getChampionImage(champ.name)"
                  :alt="champ.name"
                  class="relative z-10 object-cover rounded-lg w-10 h-10 drop-shadow-lg"
                />
                <span
                  v-if="champ.name === 'Bard'"
                  class="absolute z-20 text-xs -translate-x-1/2 -top-2.5 left-1/2"
                  >👑</span
                >
                <img
                  v-if="champ.rank"
                  :src="getBorderImage(champ.rank)"
                  class="absolute z-20 border rounded-full w-5 h-5 -bottom-1 -right-1 border-blue-400/50 bg-white/90"
                />
              </div>
              <span
                class="text-[10px] font-black leading-tight text-center text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text max-w-[56px] truncate"
              >
                {{ champ.name }}
              </span>
              <div
                class="flex items-center gap-0.5 px-1 py-0.5 rounded-md border bg-white/5 border-white/10 text-[9px]"
              >
                <span class="font-bold text-emerald-300">{{ champ.kills }}</span>
                <span class="text-white/30">/</span>
                <span class="font-bold text-red-300">{{ champ.deaths }}</span>
                <span class="text-white/30">/</span>
                <span class="font-bold text-blue-300">{{ champ.assists }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- VS Divider (vertikal) -->
        <div class="flex flex-col items-center justify-start pt-6 gap-1">
          <div class="flex-1 w-px bg-white/10 min-h-[40px]" />
          <span
            class="text-xs font-black tracking-widest text-transparent bg-gradient-to-b from-blue-200 via-violet-200 to-red-300 bg-clip-text writing-vertical"
            style="writing-mode: vertical-rl; text-orientation: mixed"
            >⚔️</span
          >
          <span
            class="text-[10px] font-black tracking-widest text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-red-300 bg-clip-text"
            >VS</span
          >
          <span
            class="text-xs font-black text-transparent bg-gradient-to-b from-red-300 via-violet-200 to-blue-200 bg-clip-text"
            style="writing-mode: vertical-lr; text-orientation: mixed"
            >⚔️</span
          >
          <div class="flex-1 w-px bg-white/10 min-h-[40px]" />
        </div>

        <!-- Team 2 (Rot) -->
        <div>
          <span
            class="inline-block mb-2 px-2 py-0.5 text-xs font-black rounded-full bg-red-500/20 border border-red-400/30 text-red-200 tracking-wider"
            >🔴 Gegner</span
          >
          <div class="flex flex-wrap justify-center gap-2">
            <div
              v-for="(champ, idx) in battleStore.team2"
              :key="'team2-' + idx"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="relative flex items-center justify-center w-14 h-14 transition-transform duration-300 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-red-400/30 hover:scale-110"
              >
                <div
                  class="absolute inset-0 rounded-xl blur-md opacity-40 bg-gradient-to-br from-red-400/40 to-red-600/20"
                />
                <img
                  :src="battleStore.getChampionImage(champ.name)"
                  :alt="champ.name"
                  class="relative z-10 object-cover rounded-lg w-10 h-10 drop-shadow-lg"
                />
                <img
                  v-if="champ.rank"
                  :src="getBorderImage(champ.rank)"
                  class="absolute z-20 border rounded-full w-5 h-5 -bottom-1 -right-1 border-red-400/50 bg-white/90"
                />
              </div>
              <span class="text-[10px] font-black leading-tight text-center text-red-300 max-w-[56px] truncate">
                {{ champ.name }}
              </span>
              <div
                class="flex items-center gap-0.5 px-1 py-0.5 rounded-md border bg-white/5 border-white/10 text-[9px]"
              >
                <span class="font-bold text-emerald-300">{{ champ.kills }}</span>
                <span class="text-white/30">/</span>
                <span class="font-bold text-red-300">{{ champ.deaths }}</span>
                <span class="text-white/30">/</span>
                <span class="font-bold text-blue-300">{{ champ.assists }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Chat + Minimap Row ─── -->
    <div class="grid grid-cols-2 gap-3">
      <ChatPanelComponent />
      <MiniMapComponent :battle-id="currentBattleId" :score="score" />
    </div>
  </div>

  <!-- ─── Result Modal (Teleport) ─── -->
  <Teleport to="body">
    <div
      v-if="battleStore.battlePhase === 'result'"
      class="fixed inset-0 z-50 flex items-center justify-center"
      style="background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px)"
    >
      <div
        class="relative max-w-sm w-full mx-4 rounded-3xl border p-6 text-center shadow-2xl"
        :class="
          lastResult.won
            ? 'bg-gradient-to-br from-emerald-900/80 to-black/90 border-emerald-400/40'
            : 'bg-gradient-to-br from-red-900/80 to-black/90 border-red-400/40'
        "
      >
        <div class="text-5xl mb-2">{{ lastResult.won ? '🏆' : '💀' }}</div>
        <div
          class="text-3xl font-black tracking-widest mb-3"
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
            class="px-5 py-2 rounded-xl text-sm font-black border transition-all duration-200 hover:scale-105 active:scale-95 bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
          >
            Weiter →
          </button>
          <button
            @click="battleStore.toggleAutoSkip()"
            class="px-4 py-2 rounded-xl text-sm font-black border transition-all duration-200 hover:scale-105 active:scale-95"
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
import { useBattleStore } from '../../../stores/battleStore'
import { RANK_BORDER_IMAGES } from '../../../config/constants'

export default defineComponent({
  name: 'BattleResultComponent',
  components: { MiniMapComponent, ChatPanelComponent },
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

    function getBorderImage(rank: string) {
      return RANK_BORDER_IMAGES[rank] ?? RANK_BORDER_IMAGES.Iron
    }

    return {
      lastResult,
      lpChange,
      isAutoBattleActive,
      timeUntilNextBattle,
      currentBattleId,
      getBorderImage,
      battleStore,
      score,
    }
  },
})
</script>
