<template>
  <div class="flex flex-col w-full h-full p-4 space-y-4">
    <!-- ─── Battle Header Bar ─── -->
    <div
      class="flex items-center justify-between p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <span
        class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
      >
        Battle #{{ currentBattleId }}
      </span>

      <!-- Result Badge -->
      <div
        v-if="showBattleResult"
        class="flex items-center gap-2 px-3 py-1 transition-all duration-300 border rounded-xl backdrop-blur-sm"
        :class="
          currentResult.won
            ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
            : 'bg-red-500/20 border-red-400/30 text-red-300'
        "
      >
        <span>{{ currentResult.won ? '🏆' : '💀' }}</span>
        <span class="text-xs font-black tracking-wider">
          {{ currentResult.won ? 'VICTORY!' : 'DEFEAT!' }}
        </span>
        <span
          v-if="showLpChange"
          class="text-xs font-black"
          :class="currentLpChange >= 0 ? 'text-emerald-300' : 'text-red-300'"
        >
          {{ currentLpChange >= 0 ? '+' : '' }}{{ currentLpChange }} LP
        </span>
      </div>

      <!-- Countdown -->
      <div
        v-if="isAutoBattleActive"
        class="flex items-center gap-2 px-3 py-1 border rounded-xl backdrop-blur-sm bg-blue-500/20 border-blue-400/30"
      >
        <span class="text-xs animate-spin">⏱️</span>
        <span class="text-xs font-black text-blue-200"> {{ timeUntilNextBattle }}s </span>
      </div>
    </div>

    <!-- ─── Teams + VS ─── -->
    <div
      class="group relative overflow-hidden rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
    >
      <div
        class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
      />

      <div class="p-4 space-y-4">
        <!-- Team 1 -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <span
              class="px-2 py-0.5 text-xs font-black rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 tracking-wider"
              >🔵 Dein Team</span
            >
          </div>
          <div class="flex flex-wrap justify-center gap-3">
            <div
              v-for="(champ, idx) in battleStore.team1"
              :key="'team1-' + idx"
              class="flex flex-col items-center gap-1"
            >
              <div
                class="relative flex items-center justify-center w-16 h-16 transition-transform duration-300 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-blue-400/30 hover:scale-110"
              >
                <div
                  class="absolute inset-0 rounded-xl blur-md opacity-40 bg-gradient-to-br from-blue-400/40 to-blue-600/20"
                />
                <img
                  :src="battleStore.getChampionImage(champ.name)"
                  :alt="champ.name"
                  class="relative z-10 object-cover w-10 h-10 rounded-lg drop-shadow-lg"
                />
                <span
                  v-if="champ.name === 'Bard'"
                  class="absolute z-20 text-sm -translate-x-1/2 -top-3 left-1/2"
                  >👑</span
                >
                <img
                  v-if="champ.rank"
                  :src="getBorderImage(champ.rank)"
                  class="absolute z-20 w-6 h-6 border rounded-full -bottom-1 -right-1 border-blue-400/50 bg-white/90"
                />
              </div>
              <span
                class="text-[10px] font-black text-center bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent leading-tight"
              >
                {{ champ.name.length > 7 ? champ.name.slice(0, 7) + '…' : champ.name }}
              </span>
              <div
                class="flex items-center gap-1 px-1.5 py-0.5 rounded-lg border bg-white/5 border-white/10"
              >
                <span class="text-[9px] font-bold text-emerald-300">{{ champ.kills }}K</span>
                <span class="text-[9px] text-white/30">/</span>
                <span class="text-[9px] font-bold text-red-300">{{ champ.deaths }}D</span>
                <span class="text-[9px] text-white/30">/</span>
                <span class="text-[9px] font-bold text-blue-300">{{ champ.assists }}A</span>
              </div>
            </div>
          </div>
        </div>

        <!-- VS Divider -->
        <div class="flex items-center gap-3">
          <div class="flex-1 h-px bg-white/10" />
          <span
            class="text-xs font-black tracking-widest text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
            >⚔️ VS ⚔️</span
          >
          <div class="flex-1 h-px bg-white/10" />
        </div>

        <!-- Team 2 -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <span
              class="px-2 py-0.5 text-xs font-black rounded-full bg-red-500/20 border border-red-400/30 text-red-200 tracking-wider"
              >🔴 Gegner</span
            >
          </div>
          <div class="flex flex-wrap justify-center gap-3">
            <div
              v-for="(champ, idx) in battleStore.team2"
              :key="'team2-' + idx"
              class="flex flex-col items-center gap-1"
            >
              <div
                class="relative flex items-center justify-center w-16 h-16 transition-transform duration-300 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-red-400/30 hover:scale-110"
              >
                <div
                  class="absolute inset-0 rounded-xl blur-md opacity-40 bg-gradient-to-br from-red-400/40 to-red-600/20"
                />
                <img
                  :src="battleStore.getChampionImage(champ.name)"
                  :alt="champ.name"
                  class="relative z-10 object-cover w-10 h-10 rounded-lg drop-shadow-lg"
                />
                <img
                  v-if="champ.rank"
                  :src="getBorderImage(champ.rank)"
                  class="absolute z-20 w-6 h-6 border rounded-full -bottom-1 -right-1 border-red-400/50 bg-white/90"
                />
              </div>
              <span class="text-[10px] font-black text-center text-red-300 leading-tight">
                {{ champ.name.length > 7 ? champ.name.slice(0, 7) + '…' : champ.name }}
              </span>
              <div
                class="flex items-center gap-1 px-1.5 py-0.5 rounded-lg border bg-white/5 border-white/10"
              >
                <span class="text-[9px] font-bold text-emerald-300">{{ champ.kills }}K</span>
                <span class="text-[9px] text-white/30">/</span>
                <span class="text-[9px] font-bold text-red-300">{{ champ.deaths }}D</span>
                <span class="text-[9px] text-white/30">/</span>
                <span class="text-[9px] font-bold text-blue-300">{{ champ.assists }}A</span>
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
</template>

<script lang="ts">
import { useGameStore } from '../../../stores/gameStore'
import { defineComponent, computed } from 'vue'
import MiniMapComponent from './MiniMapComponent.vue'
import ChatPanelComponent from './ChatPanelComponent.vue'
import { useBattleStore } from '../../../stores/battleStore'
import { RANK_BORDER_IMAGES } from '../../../config/constants'

export default defineComponent({
  name: 'BattleResultComponent',
  components: { MiniMapComponent, ChatPanelComponent },
  setup() {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()

    const score = computed(() => ({
      team1Kills: battleStore.team1.reduce((sum, c) => sum + c.kills, 0),
      team2Kills: battleStore.team2.reduce((sum, c) => sum + c.kills, 0),
    }))

    const isAutoBattleActive = computed(() => battleStore.autoBattleEnabled)
    const timeUntilNextBattle = computed(() => battleStore.timeUntilNextBattle)
    const currentBattleId = computed(() => battleStore.currentBattleId)
    const showBattleResult = computed(
      () => battleStore.lastAutoBattleResult !== null && battleStore.timeUntilNextBattle >= 2,
    )
    const currentResult = computed(() => battleStore.lastAutoBattleResult || { won: false })
    const currentLpChange = computed(() =>
      battleStore.lastAutoBattleResult ? battleStore.lastLpChange : null,
    )
    const showLpChange = computed(
      () => currentLpChange.value !== null && battleStore.lastAutoBattleResult !== null,
    )

    function getBorderImage(rank: string) {
      return RANK_BORDER_IMAGES[rank] ?? RANK_BORDER_IMAGES.Iron
    }

    return {
      currentResult,
      currentLpChange,
      isAutoBattleActive,
      timeUntilNextBattle,
      currentBattleId,
      getBorderImage,
      gameStore,
      battleStore,
      score,
      showBattleResult,
      showLpChange,
    }
  },
})
</script>
