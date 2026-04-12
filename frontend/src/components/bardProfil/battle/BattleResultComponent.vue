<template>
  <div class="relative flex flex-col w-full h-full p-4 space-y-3 overflow-hidden">
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

      <!-- Two-column layout: MiniMap left | Chat+Scoreboard right -->
      <div class="relative z-10 flex flex-row flex-1 min-h-0 gap-3">
        <!-- Left: MiniMap + Shop -->
        <div class="flex flex-col items-center flex-1 min-w-0 min-h-0">
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
            <button
              v-if="battleStore.battlePhase === 'playing'"
              class="admin-skip-btn"
              title="[DEV] Zur 40s-Marke springen"
              @click="battleStore.adminSkipToEnd()"
            >
              ⚡ Skip
            </button>
          </div>
          <MiniMapComponent
            class="w-full max-h-full aspect-square"
            :battle-id="currentBattleId"
            :score="score"
          />
          <BattleShopModal class="w-full mt-2" />
        </div>

        <!-- Right: Chat + Scoreboard -->
        <div class="flex flex-col flex-shrink-0 h-full gap-3 w-72">
          <ChatPanelComponent class="flex-1 min-h-0" />
          <ScoreboardComponent class="flex-1 min-h-0" />
        </div>
      </div>
    </template>
  </div>

  <!-- Result Modal -->
  <BattleResultModal />
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import MiniMapComponent from './MiniMapComponent.vue'
import ChatPanelComponent from './ChatPanelComponent.vue'
import ScoreboardComponent from './ScoreboardComponent.vue'
import PlanetSearchComponent from './PlanetSearchComponent.vue'
import PlanetBattleBackgroundComponent from './PlanetBattleBackgroundComponent.vue'
import BattleStartScreenComponent from './BattleStartScreenComponent.vue'
import BattleShopModal from './BattleShopModal.vue'
import BattleResultModal from './BattleResultModal.vue'
import { useBattleStore } from '@/stores/battleStore'

export default defineComponent({
  name: 'BattleResultComponent',
  components: {
    MiniMapComponent,
    ChatPanelComponent,
    ScoreboardComponent,
    PlanetSearchComponent,
    PlanetBattleBackgroundComponent,
    BattleStartScreenComponent,
    BattleShopModal,
    BattleResultModal,
  },

  setup() {
    const battleStore = useBattleStore()

    const isStarting = ref(false)
    const isUniverseAnimating = ref(false)
    const universeAnim = ref<{ trigger: () => Promise<void> } | null>(null)

    async function runUniverseAnimation(): Promise<void> {
      isUniverseAnimating.value = true
      await universeAnim.value?.trigger()
      isUniverseAnimating.value = false
    }

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

    const startBattle = async () => {
      if (isStarting.value) return
      isStarting.value = true
      await runUniverseAnimation()
      await battleStore.initializePersistentAutoBattle()
      isStarting.value = false
    }

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
      rankIcon,
    }
  },
})
</script>

<style scoped>
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
.admin-skip-btn {
  margin-left: 8px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 900;
  background: #1a0e00;
  border: 1px solid #7a4e20;
  color: #c89040;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0.5px;
  opacity: 0.7;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.admin-skip-btn:hover {
  opacity: 1;
  border-color: #c89040;
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
</style>
