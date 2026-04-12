<template>
  <div class="relative flex flex-col w-full h-full p-4 space-y-3 overflow-hidden">
    <!-- ══ UNIVERSE ANIMATION (eigene Komponente) ══ -->
    <PlanetSearchComponent ref="universeAnim" :variant="planetVariant" />

    <!-- ══ START SCREEN ══ -->
    <Transition name="start-fade">
      <div
        v-if="!battleStore.isAutoBattleInitialized && !isUniverseAnimating && !isStarting"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 start-screen"
      >
        <div class="start-crest">
          <img src="/img/menu/BATTLE.png" class="start-crest-img" alt="Battle" />
        </div>
        <div class="start-title">RANKED QUEUE</div>

        <!-- ── TEAM ROSTER ──────────────────────────────────────── -->
        <div class="roster-wrap">
          <div class="roster-header">
            <span class="roster-label">DEIN TEAM</span>
            <div class="roster-progress-bar-wrap">
              <div
                class="roster-progress-bar"
                :style="{ width: `${(teamProgress / 5) * 100}%` }"
                :class="hasFullTeam ? 'bar--full' : 'bar--incomplete'"
              />
            </div>
            <span class="roster-count" :class="hasFullTeam ? 'count--full' : 'count--incomplete'">
              {{ teamProgress }}/5
            </span>
          </div>

          <div class="roster-slots">
            <div
              v-for="(role, idx) in ROLES"
              :key="role.key"
              class="roster-slot"
              :class="battleStore.headerSlots[idx] ? 'slot--filled' : 'slot--empty'"
            >
              <!-- Gefüllt -->
              <template v-if="battleStore.headerSlots[idx]">
                <img
                  :src="battleStore.getChampionImage(battleStore.headerSlots[idx]!)"
                  class="slot-champ-img"
                  :alt="battleStore.headerSlots[idx]!"
                />
                <span class="slot-champ-name">
                  {{ battleStore.headerSlots[idx] }}
                </span>
              </template>

              <!-- Leer -->
              <template v-else>
                <span class="slot-empty-icon">{{ role.icon }}</span>
                <div class="slot-pulse-ring" />
              </template>

              <!-- Rollen-Badge immer sichtbar -->
              <span
                class="slot-role-badge"
                :class="
                  battleStore.headerSlots[idx]
                    ? 'slot-role-badge--filled'
                    : 'slot-role-badge--empty'
                "
              >
                {{ role.label }}
              </span>
            </div>
          </div>

          <!-- Hinweis -->
          <Transition name="hint-fade" mode="out-in">
            <p v-if="!hasFullTeam" key="incomplete" class="roster-hint">
              Wähle im Header für jede Rolle einen Champion aus – erst dann öffnet sich die Queue.
            </p>
            <p v-else key="ready" class="roster-hint roster-hint--ready">
              ✓ Dein Team ist vollständig – bereit für die Arena!
            </p>
          </Transition>
        </div>

        <!-- ── START BUTTON ── -->
        <button
          class="start-btn"
          :class="{ 'start-btn--locked': !hasFullTeam }"
          :disabled="isStarting || !hasFullTeam"
          :title="!hasFullTeam ? `Noch ${5 - teamProgress} Rolle(n) offen` : ''"
          @click="startBattle"
        >
          <span class="start-btn-icon">
            <template v-if="isStarting">⏳</template>
            <template v-else-if="!hasFullTeam">🔒</template>
            <img v-else src="/img/menu/BATTLE.png" class="start-btn-img" alt="Battle" />
          </span>
          <span v-if="isStarting">WIRD GESTARTET…</span>
          <span v-else-if="!hasFullTeam">
            NOCH {{ 5 - teamProgress }} SLOT{{ 5 - teamProgress !== 1 ? 'S' : '' }} OFFEN
          </span>
          <span v-else>KAMPF STARTEN</span>
        </button>
      </div>
    </Transition>

    <!-- ══ BATTLE UI ══ -->
    <template v-if="battleStore.isAutoBattleInitialized && !isUniverseAnimating">
      <!-- ── PLANET BATTLE BACKGROUND ──────────────────────────────────────── -->
      <div class="absolute inset-0 z-0 pointer-events-none planet-battle-bg" aria-hidden="true">
        <div class="starfield" aria-hidden="true" />
        <div class="planet-sphere" :class="`planet-v${planetVariant}`">
          <div class="planet-atmo" />
          <div class="planet-terrain" :class="`terrain-v${planetVariant}`" />
          <div class="planet-cloud" />
          <div class="planet-highlight" />
          <div class="planet-rim" :class="`rim-v${planetVariant}`" />
        </div>
        <div class="planet-halo" :class="`halo-v${planetVariant}`" />
      </div>

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
            <!-- ── DEV: Admin Skip Button ── -->
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
import BattleShopModal from './BattleShopModal.vue'
import BattleResultModal from './BattleResultModal.vue'
import { useBattleStore } from '@/stores/battleStore'

const ROLES = [
  { key: 'top', label: 'TOP', icon: '⚔️' },
  { key: 'jungle', label: 'JGL', icon: '🌿' },
  { key: 'mid', label: 'MID', icon: '🎯' },
  { key: 'bot', label: 'BOT', icon: '🏹' },
  { key: 'support', label: 'SUP', icon: '🛡️' },
] as const

export default defineComponent({
  name: 'BattleResultComponent',
  components: {
    MiniMapComponent,
    ChatPanelComponent,
    ScoreboardComponent,
    PlanetSearchComponent,
    BattleShopModal,
    BattleResultModal,
  },

  setup() {
    const battleStore = useBattleStore()

    const isStarting = ref(false)
    const isUniverseAnimating = ref(false)

    // Template ref to the child animation component
    const universeAnim = ref<{ trigger: () => Promise<void> } | null>(null)

    // ── Team-Vollständigkeit ──────────────────────────────────────────────────

    const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)

    const hasFullTeam = computed(() => teamProgress.value >= 5)

    // ── Universe Animation ────────────────────────────────────────────────────

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
      if (isStarting.value || !hasFullTeam.value) return
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
      ROLES,
      teamProgress,
      hasFullTeam,
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
.start-crest-img {
  width: 120px;
  height: 120px;
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
   TEAM ROSTER
   ═══════════════════════════════════════════ */
.roster-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 20px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #2a1a06;
  border-radius: 6px;
  min-width: 340px;
}

.roster-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.roster-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #5a4a2a;
  text-transform: uppercase;
  flex-shrink: 0;
}

.roster-progress-bar-wrap {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 99px;
  overflow: hidden;
}

.roster-progress-bar {
  height: 100%;
  border-radius: 99px;
  transition:
    width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    background 0.4s;
}
.bar--incomplete {
  background: linear-gradient(to right, #7a3020, #cc6050);
  box-shadow: 0 0 6px rgba(204, 96, 80, 0.5);
}
.bar--full {
  background: linear-gradient(to right, #2a7020, #52b830);
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.6);
}

.roster-count {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  transition:
    color 0.3s,
    text-shadow 0.3s;
}
.count--incomplete {
  color: #cc6050;
  text-shadow: 0 0 8px rgba(204, 96, 80, 0.4);
}
.count--full {
  color: #52b830;
  text-shadow: 0 0 10px rgba(82, 184, 48, 0.6);
}

.roster-slots {
  display: flex;
  gap: 8px;
}

.roster-slot {
  position: relative;
  width: 56px;
  height: 72px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition:
    box-shadow 0.3s,
    border-color 0.3s,
    transform 0.2s;
}

.slot--filled {
  background: linear-gradient(160deg, #192e10, #0e1e08);
  border: 1px solid #4a8a28;
  box-shadow:
    0 0 14px rgba(74, 138, 40, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transform: translateY(0);
}
.slot--filled:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 18px rgba(74, 138, 40, 0.5);
}

.slot--empty {
  background: rgba(16, 10, 4, 0.7);
  border: 1px dashed #3a2010;
}

.slot-champ-img {
  width: 38px;
  height: 38px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid rgba(74, 138, 40, 0.4);
}

.slot-champ-name {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #6ec040;
  text-align: center;
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
}

.slot-empty-icon {
  font-size: 20px;
  opacity: 0.3;
  line-height: 1;
}

.slot-role-badge {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
  border-radius: 3px;
  padding: 1px 5px;
  line-height: 1.4;
}
.slot-role-badge--filled {
  color: #6ec040;
  background: rgba(74, 138, 40, 0.2);
  border: 1px solid rgba(74, 138, 40, 0.25);
}
.slot-role-badge--empty {
  color: #4a3a1a;
  background: rgba(40, 20, 8, 0.6);
  border: 1px solid rgba(60, 30, 10, 0.3);
}

/* Pulsing ring for empty slots */
.slot-pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 9px;
  border: 1px solid rgba(90, 60, 20, 0.25);
  animation: slotPulse 2.4s ease-in-out infinite;
  pointer-events: none;
}

/* Roster hint text */
.roster-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  text-align: center;
  line-height: 1.6;
  max-width: 300px;
  min-height: 18px;
}
.roster-hint--ready {
  color: #52b830;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.35);
}

/* ═══════════════════════════════════════════
   START BUTTON
   ═══════════════════════════════════════════ */
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

.start-btn--locked {
  background: linear-gradient(to bottom, #150e06, #0e0904) !important;
  border-color: #3a2010 !important;
  color: #4a3018 !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  transform: none !important;
  letter-spacing: 1.5px;
  font-size: 13px;
}
.start-btn--locked:hover {
  transform: none !important;
}

.start-btn-icon {
  font-size: 18px;
  line-height: 1;
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
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.25s ease;
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
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
@keyframes slotPulse {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(1);
  }
  50% {
    opacity: 0.65;
    transform: scale(1.07);
  }
}

/* ─── prefers-reduced-motion ── */
@media (prefers-reduced-motion: reduce) {
  .start-crest,
  .planet-cloud,
  .starfield,
  .slot-pulse-ring {
    animation: none !important;
  }
}
</style>
