<template>
  <!-- The root is the stage's size container: everything below measures itself
       against the modal's content box (cqh), never against the window. -->
  <div class="landing-root">
    <!-- Shared cosmic backdrop, same as every other tab -->
    <CosmicStageBackground />
    <div class="stage-vignette" />

    <!-- Temporary admin tool, moved here from the admin tab so it sits next to
         the rank band it manipulates. Absolutely positioned: it must never
         take part in the layout. -->
    <button class="admin-rankup" title="Admin: force one rank promotion" @click="adminRankUp">
      <Icon icon="ph:arrow-fat-up-fill" width="24" height="24" class="admin-rankup-icon" />
      RANK UP
    </button>

    <div class="landing-screen">
      <!-- ── Focus 1: rank + LP, flanked by the headline career numbers ── -->
      <RankBandPanel class="landing-layer" :left-group="ladderGroup" :right-group="legendGroup" />

      <!-- ── Focus 2: team roster, full stage width ── -->
      <TeamRosterPanel class="roster-slot landing-layer" />

      <!-- ── Focus 3: the start button ── -->
      <div class="action-bar landing-layer">
        <div class="action-rule action-rule--left" />
        <button
          class="battle-btn"
          :class="{ 'battle-btn--live': isBattleLive && !isStarting }"
          :disabled="isStarting"
          @click="$emit('start')"
        >
          <span class="battle-btn-edge" />
          <span class="battle-btn-face">
            <Icon
              v-if="isStarting"
              icon="ph:hourglass-high-fill"
              width="24"
              height="24"
              class="battle-btn-icon"
              style="color: #e8c040"
            />
            <span v-else-if="isBattleLive" class="battle-btn-live-dot" />
            <img v-else src="/img/menu/BATTLE-128.png" alt="Battle" class="battle-btn-img" />

            <span v-if="isStarting" v-ink-center>STARTING…</span>
            <span v-else-if="isBattleLive" v-ink-center>RETURN TO LIVE BATTLE</span>
            <span v-else v-ink-center>START BATTLE</span>
          </span>
        </button>
        <div class="action-rule action-rule--right" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useBattleScoreboardStats } from '@/composables/battle/useBattleScoreboardStats'
import { formatNumber } from '@/config/ui/numberFormat'
import { BATTLE_STAT_GAME_ICONS, HOT_WIN_STREAK_THRESHOLD } from '@/config/constants'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import RankBandPanel from './RankBandPanel.vue'
import { type RankStatGroup } from './RankStatColumn.vue'
import TeamRosterPanel from './TeamRosterPanel.vue'

defineProps<{ isStarting: boolean }>()
defineEmits<{ start: [] }>()

const battleStore = useBattleStore()

// Der gesperrte Zustand liegt nicht mehr hier: unter fünf besetzten Rollen
// tritt `RiftLockedPanel` an die Stelle dieses Screens.
const isBattleLive = computed(() => battleStore.isAutoBattleInitialized)

/** Admin-only shortcut: force a single promotion so the rank-up herald and the
 *  tier ladder can be exercised without grinding battles. */
function adminRankUp() {
  battleStore.adminPromoteRank()
}

// Career totals merged with the running battle — shared with the bottom-bar
// scoreboard via useBattleScoreboardStats so both always show the same numbers.
const { live, kills, kdaStr } = useBattleScoreboardStats()

const winRateStr = computed(() =>
  battleStore.totalBattles === 0
    ? '0.0'
    : ((battleStore.totalWins / battleStore.totalBattles) * 100).toFixed(1),
)

/** Win share for the split bar — 50/50 before the first game, so an empty
 *  record never reads as an all-loss season. */
const winSharePct = computed(() =>
  battleStore.totalBattles === 0
    ? 50
    : (battleStore.totalWins / battleStore.totalBattles) * 100,
)

// ── The two flanks of the rank band ──
// Left is the ladder record that explains the rank in the middle; right is the
// career the player brags about. Five numbers a side, large enough to read at a
// glance — the exhaustive breakdown belongs in Bard Stats, not on this screen.
const ladderGroup = computed<RankStatGroup>(() => ({
  title: 'LADDER',
  // Die Gruppenköpfe stehen auf clamp(14px, 2cqh, 20px) — auf Full HD also am
  // unteren Rand. Beides deshalb gefüllt und einmotivig statt Krone-auf-Münze.
  icon: 'ph:ranking-fill',
  color: '#e8c040',
  rows: [
    { label: 'Wins', value: formatNumber(battleStore.totalWins), color: '#52b830' },
    { label: 'Losses', value: formatNumber(battleStore.totalLosses), color: '#cc6050' },
    {
      label: 'Winrate',
      value: `${winRateStr.value}%`,
      color: '#e8c040',
      bar: winSharePct.value,
    },
    {
      // the personal best rides along in the label instead of costing a row
      label:
        battleStore.bestWinStreak > 0
          ? `Streak · best ${battleStore.bestWinStreak}W`
          : 'Win Streak',
      value: `${battleStore.currentWinStreak}W`,
      color: battleStore.currentWinStreak >= HOT_WIN_STREAK_THRESHOLD ? '#f06820' : undefined,
    },
    { label: 'MMR', value: formatNumber(battleStore.mmr) },
  ],
}))

const legendGroup = computed<RankStatGroup>(() => ({
  title: 'LEGEND',
  icon: 'ph:medal-military-fill',
  color: '#cc6050',
  rows: [
    {
      label: 'Kills',
      value: formatNumber(kills.value),
      color: '#6ee7b7',
      gameIcon: BATTLE_STAT_GAME_ICONS.kills,
    },
    { label: 'KDA', value: kdaStr.value, color: '#e8c040' },
    {
      label: 'Champ Dmg',
      value: formatNumber(battleStore.allTime.damage + live.value.damage),
      gameIcon: BATTLE_STAT_GAME_ICONS.damage,
    },
    {
      label: 'Pentakills',
      value: formatNumber(
        battleStore.allTime.multikills.penta + battleStore.liveBattleStats.multikills.penta,
      ),
      color: '#ff9a40',
    },
    { label: 'MVP Awards', value: formatNumber(battleStore.allTime.mvpAwards), color: '#e8c040' },
  ],
}))
</script>

<style scoped>
/* Flat deep-space base — CosmicStageBackground paints its starfield on top of
   it (z-index 0), every content layer sits above via .landing-layer.

   ── Why a size container ──
   The battle tab lives inside the bard modal, which is only about 70% of the
   window tall. Sizing this stage in vh therefore handed the rank band a height
   budget it never actually gets, and the roster cards paid for it. Everything
   below (rank band, roster, stat flanks) measures itself in cqh against THIS
   box, so the same layout rules hold on a 13" MacBook and on 4K. */
.landing-root {
  position: absolute;
  inset: 0;
  z-index: 20;
  container-type: size;
  container-name: landing;
  overflow: hidden;
  background: #0a0906;
}

.landing-screen {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.1cqh, 14px);
  padding: clamp(8px, 1.5cqh, 18px) clamp(14px, 1.4vw, 26px);
  /* the budget below is dimensioned to fit; this is the safety net for
     viewports flatter than anything we target */
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* Soft warm pool behind the centre spine, drawn over the stars but under the
   content — gives the rank/roster/button column its own light. */
.stage-vignette {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 60% 55% at 50% 22%, rgba(200, 144, 64, 0.09), transparent 70%),
    radial-gradient(ellipse 90% 60% at 50% 120%, rgba(10, 9, 6, 0.9), transparent 70%);
}

.landing-layer {
  position: relative;
  z-index: 1;
}

/* ── Temporary admin shortcut ──
   Absolutely positioned in the top-right corner so it sits outside the flex
   flow and cannot shift a single pixel of the stage. */
.admin-rankup {
  position: absolute;
  /* bottom-right, level with the start button: the only spot where it covers
     nothing but a decorative rule */
  bottom: clamp(14px, 2.4cqh, 28px);
  right: clamp(14px, 1.4vw, 26px);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  background: linear-gradient(to bottom, #1e1808, #120e04);
  border: 1px solid #5c4410;
  border-radius: 4px;
  color: #e8c040;
  cursor: pointer;
  opacity: 0.55;
  transition:
    opacity 0.15s,
    background 0.15s,
    border-color 0.15s;
}
.admin-rankup:hover {
  opacity: 1;
  background: linear-gradient(to bottom, #2a2010, #1a1408);
  border-color: #c89040;
  color: #f4d868;
}

.admin-rankup-icon {
  width: 13px;
  height: 13px;
}

/* ── Roster: a fixed share of the stage, claimed before the rank band ──
   The cards used to be whatever the rank band left over, which on a flat
   viewport was almost nothing. Now the roster takes its cut of the container
   height first and the band lives on the remainder — the band's own contents
   compress for it (see RankBandPanel's container queries). The crown headroom
   rides on top, so the cards keep their height whatever tier is worn. */
.roster-slot {
  flex: 0 0 auto;
  min-width: 0;
  height: calc(clamp(160px, 38cqh, 330px) + var(--crown-space, 0px));
}

/* ── Focus 3: the start button ── */
.action-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(14px, 1.6vw, 26px);
}

.action-rule {
  flex: 1;
  height: 2px;
}
.action-rule--left {
  background: linear-gradient(to right, transparent, #5c3310 60%, #c89040);
}
.action-rule--right {
  background: linear-gradient(to left, transparent, #5c3310 60%, #c89040);
}

.battle-btn {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: clamp(270px, 23vw, 420px);
  padding: clamp(8px, 1.5cqh, 17px) clamp(30px, 3.2vw, 56px);
  font-family: inherit;
  background: linear-gradient(to bottom, #24380f 0%, #172708 52%, #0f1c06 100%);
  border: 2px solid #4a8a28;
  border-radius: 5px;
  box-shadow:
    inset 0 1px 0 rgba(160, 255, 120, 0.14),
    inset 0 0 0 1px #0e1a08,
    0 0 24px rgba(74, 138, 40, 0.35);
  color: #a8f078;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
  animation: battle-btn-glow 2.6s ease-in-out infinite;
}
.battle-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #2e4614 0%, #1d310b 52%, #142408 100%);
  border-color: #7ad84a;
  transform: translateY(-2px);
}
.battle-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.985);
}

/* Energy line along the bottom edge — the button's own signature accent */
.battle-btn-edge {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: linear-gradient(to right, transparent, #8ee060, transparent);
  opacity: 0.65;
  transition:
    height 0.15s ease,
    opacity 0.15s ease;
  pointer-events: none;
}
.battle-btn:hover:not(:disabled) .battle-btn-edge {
  height: 3px;
  opacity: 1;
}

/* Light streak — parked out of sight, sweeps once per hover cycle */
.battle-btn::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -45%;
  width: 32%;
  background: linear-gradient(to right, transparent, rgba(220, 255, 200, 0.16), transparent);
  transform: skewX(-18deg);
  pointer-events: none;
}
.battle-btn:hover:not(:disabled)::after {
  animation: battle-btn-sheen 1.2s ease-in-out infinite;
}

@keyframes battle-btn-sheen {
  0% {
    left: -45%;
  }
  100% {
    left: 130%;
  }
}

.battle-btn-face {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 1vw, 16px);
  font-size: clamp(15px, 2.1cqh, 25px);
  font-weight: 700;
  letter-spacing: 6px;
  line-height: 1.1;
  /* the trailing letter-space would push the label off centre */
  padding-left: 6px;
  text-shadow: 0 0 16px rgba(120, 220, 80, 0.35);
}

.battle-btn--live {
  background: linear-gradient(to bottom, #392508 0%, #241704 52%, #180f03 100%);
  border-color: #c89040;
  color: #f0cf68;
  box-shadow:
    inset 0 1px 0 rgba(255, 220, 140, 0.16),
    inset 0 0 0 1px #1a1004,
    0 0 24px rgba(200, 144, 64, 0.35);
  animation: battle-btn-glow-live 2.6s ease-in-out infinite;
}
.battle-btn--live .battle-btn-edge {
  background: linear-gradient(to right, transparent, #e8c040, transparent);
}
.battle-btn--live .battle-btn-face {
  font-size: clamp(13px, 1.8cqh, 21px);
  text-shadow: 0 0 16px rgba(232, 192, 64, 0.35);
}
.battle-btn--live:hover:not(:disabled) {
  background: linear-gradient(to bottom, #4a3110 0%, #2e1e06 52%, #1e1304 100%);
  border-color: #f0d070;
}

.battle-btn-img {
  width: clamp(19px, 2.4cqh, 27px);
  height: clamp(19px, 2.4cqh, 27px);
  object-fit: contain;
}
.battle-btn-icon {
  width: clamp(16px, 2.1cqh, 23px);
  height: clamp(16px, 2.1cqh, 23px);
}
.battle-btn-live-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #e8c040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.9);
  animation: live-dot-pulse 1.4s ease-in-out infinite;
}

@keyframes battle-btn-glow {
  0%,
  100% {
    box-shadow:
      inset 0 1px 0 rgba(160, 255, 120, 0.14),
      inset 0 0 0 1px #0e1a08,
      0 0 18px rgba(74, 138, 40, 0.3);
  }
  50% {
    box-shadow:
      inset 0 1px 0 rgba(160, 255, 120, 0.14),
      inset 0 0 0 1px #0e1a08,
      0 0 44px rgba(82, 184, 48, 0.6);
  }
}

@keyframes battle-btn-glow-live {
  0%,
  100% {
    box-shadow:
      inset 0 1px 0 rgba(255, 220, 140, 0.16),
      inset 0 0 0 1px #1a1004,
      0 0 18px rgba(200, 144, 64, 0.3);
  }
  50% {
    box-shadow:
      inset 0 1px 0 rgba(255, 220, 140, 0.16),
      inset 0 0 0 1px #1a1004,
      0 0 44px rgba(232, 192, 64, 0.55);
  }
}

@keyframes live-dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

/* Flat stages (Full HD and below — the modal is only ~70% of the window tall,
   so ~780px of container is roughly a 1100px viewport): tighten the rhythm. */
@container landing (max-height: 780px) {
  .landing-screen {
    gap: 7px;
    padding: 8px 16px;
  }
  .battle-btn {
    padding: 7px 24px;
  }
}

/* MacBook-class stages: the button gives up its last bit of air to the cards */
@container landing (max-height: 620px) {
  .landing-screen {
    gap: 6px;
    padding: 7px 14px;
  }
  .battle-btn {
    padding: 6px 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .battle-btn,
  .battle-btn--live,
  .battle-btn-live-dot,
  .battle-btn:hover:not(:disabled)::after {
    animation: none;
  }
  .battle-btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>
