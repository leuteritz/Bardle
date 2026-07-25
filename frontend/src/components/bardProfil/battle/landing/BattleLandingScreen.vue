<template>
  <div class="landing-screen">
    <!-- Shared cosmic backdrop, same as every other tab -->
    <CosmicStageBackground />
    <div class="stage-vignette" />

    <!-- ── Secondary: ladder record ribbon ── -->
    <LadderRecordRibbon class="landing-layer" />

    <!-- ── Focus 1: rank + LP ── -->
    <RankBandPanel class="landing-layer" />

    <!-- ── Focus 2: team roster, full stage width ── -->
    <TeamRosterPanel class="roster-slot landing-layer" />

    <!-- ── Focus 3: the start button ── -->
    <div class="action-bar landing-layer">
      <div class="action-rule action-rule--left" />
      <button
        class="battle-btn"
        :class="{
          'battle-btn--locked': !hasFullTeam && !isBattleLive,
          'battle-btn--live': isBattleLive && !isStarting,
        }"
        :disabled="isStarting || (!hasFullTeam && !isBattleLive)"
        :title="!hasFullTeam && !isBattleLive ? `${5 - teamProgress} role(s) still open` : ''"
        @click="$emit('start')"
      >
        <span class="battle-btn-face">
          <Icon
            v-if="isStarting"
            icon="game-icons:sundial"
            width="24"
            height="24"
            class="battle-btn-icon"
            style="color: #e8c040"
          />
          <img
            v-else-if="!hasFullTeam && !isBattleLive"
            src="/img/lock.png"
            alt="Locked"
            class="battle-btn-lock"
          />
          <span v-else-if="isBattleLive" class="battle-btn-live-dot" />
          <img v-else src="/img/menu/BATTLE.png" alt="Battle" class="battle-btn-img" />

          <span v-if="isStarting">STARTING…</span>
          <span v-else-if="isBattleLive">RETURN TO LIVE BATTLE</span>
          <span v-else-if="!hasFullTeam">
            {{ 5 - teamProgress }} SLOT{{ 5 - teamProgress !== 1 ? 'S' : '' }} OPEN
          </span>
          <span v-else>START BATTLE</span>
        </span>
        <span class="battle-btn-sub">
          {{ buttonSubline }}
        </span>
      </button>
      <div class="action-rule action-rule--right" />
    </div>

    <!-- ── Secondary: career ledger along the bottom edge ── -->
    <div class="stats-row landing-layer">
      <StatGroupPanel
        title="COMBAT"
        icon="game-icons:sword-clash"
        color="#cc6050"
        :rows="combatRows"
      />
      <StatGroupPanel
        title="FARM &amp; ECONOMY"
        icon="game-icons:crown-coin"
        color="#e8c040"
        :rows="economyRows"
      />
      <StatGroupPanel
        title="OBJECTIVES"
        icon="game-icons:stone-tower"
        color="#a855f7"
        :rows="objectiveRows"
      />
      <StatGroupPanel
        title="VISION &amp; TIME"
        icon="game-icons:semi-closed-eye"
        color="#5b8dd9"
        :rows="visionRows"
      />
      <MultikillCardsRow />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { useBattleScoreboardStats } from '@/composables/useBattleScoreboardStats'
import { formatNumber } from '@/config/numberFormat'
import { BATTLE_STAT_GAME_ICONS, BATTLE_STAT_IMAGES } from '@/config/constants'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import LadderRecordRibbon from './LadderRecordRibbon.vue'
import RankBandPanel from './RankBandPanel.vue'
import MultikillCardsRow from './MultikillCardsRow.vue'
import StatGroupPanel, { type StatRow } from './StatGroupPanel.vue'
import TeamRosterPanel from './TeamRosterPanel.vue'

const props = defineProps<{ isStarting: boolean }>()
defineEmits<{ start: [] }>()

const battleStore = useBattleStore()

// Battle action button state (mirrors headerSlots readiness)
const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)
const hasFullTeam = computed(() => teamProgress.value >= 5)
const isBattleLive = computed(() => battleStore.isAutoBattleInitialized)

/** Second line inside the button — says what the click actually does. */
const buttonSubline = computed(() => {
  if (props.isStarting) return 'SEARCHING FOR A PLANET'
  if (isBattleLive.value) return 'BATTLE IN PROGRESS'
  if (!hasFullTeam.value) return 'FILL EVERY ROLE TO QUEUE UP'
  return `QUEUE WITH ${teamProgress.value} CHAMPIONS`
})

// Career totals merged with the running battle — shared with the bottom-bar
// scoreboard via useBattleScoreboardStats so both always show the same numbers.
const { live, kills, deaths, assists, playtimeGameSeconds, kdaStr, killPartPct } =
  useBattleScoreboardStats()

function perMinute(total: number): number {
  return playtimeGameSeconds.value > 0 ? total / (playtimeGameSeconds.value / 60) : 0
}

const combatRows = computed<StatRow[]>(() => [
  { label: 'Kills', value: formatNumber(kills.value), color: '#6ee7b7', gameIcon: BATTLE_STAT_GAME_ICONS.kills },
  { label: 'Deaths', value: formatNumber(deaths.value), color: '#fca5a5', gameIcon: BATTLE_STAT_GAME_ICONS.deaths },
  { label: 'Assists', value: formatNumber(assists.value), color: '#93c5fd', gameIcon: BATTLE_STAT_GAME_ICONS.assists },
  { label: 'KDA', value: kdaStr.value, color: '#e8c040' },
  { label: 'Kill Part.', value: `${killPartPct.value}%` },
  {
    label: 'Largest Spree',
    value: formatNumber(Math.max(battleStore.allTime.largestSpree, live.value.largestSpree)),
  },
  { label: 'First Bloods', value: formatNumber(battleStore.allTime.firstBloods + live.value.firstBloods) },
  { label: 'Solo Kills', value: formatNumber(battleStore.allTime.soloKills + live.value.soloKills) },
])

const economyRows = computed<StatRow[]>(() => [
  { label: 'Total CS', value: formatNumber(battleStore.allTime.cs + live.value.cs), gameIcon: BATTLE_STAT_GAME_ICONS.cs },
  { label: 'CS / min', value: perMinute(battleStore.allTime.cs + live.value.cs).toFixed(1), color: '#e8c040' },
  { label: 'Total Gold', value: formatNumber(battleStore.allTime.gold + live.value.gold), color: '#e8c040', image: BATTLE_STAT_IMAGES.gold },
  { label: 'Gold / min', value: formatNumber(Math.round(perMinute(battleStore.allTime.gold + live.value.gold))) },
  { label: 'Champ Dmg', value: formatNumber(battleStore.allTime.damage + live.value.damage), gameIcon: BATTLE_STAT_GAME_ICONS.damage },
  { label: 'Dmg / min', value: formatNumber(Math.round(perMinute(battleStore.allTime.damage + live.value.damage))) },
  { label: 'Healing', value: formatNumber(battleStore.allTime.healing + live.value.healing) },
  { label: 'Dmg Taken', value: formatNumber(battleStore.allTime.damageTaken + live.value.damageTaken) },
])

const objectiveRows = computed<StatRow[]>(() => [
  { label: 'Dragons', value: formatNumber(battleStore.allTime.dragons + live.value.dragons), color: '#6ee0a0', image: BATTLE_STAT_IMAGES.dragons },
  { label: 'Barons', value: formatNumber(battleStore.allTime.barons + live.value.barons), color: '#c9a0f5', image: BATTLE_STAT_IMAGES.barons },
  { label: 'Turrets', value: formatNumber(battleStore.allTime.turrets + live.value.turrets), gameIcon: BATTLE_STAT_GAME_ICONS.turrets },
  { label: 'Inhibitors', value: formatNumber(battleStore.allTime.inhibitors + live.value.inhibitors), gameIcon: BATTLE_STAT_GAME_ICONS.inhibitors },
  { label: 'Nexus Kills', value: formatNumber(battleStore.totalWins) },
  { label: 'Obj. / Game', value: objectivesPerGameStr.value, color: '#a855f7' },
  { label: 'Honors Given', value: formatNumber(battleStore.allTime.honorsGiven) },
])

const visionRows = computed<StatRow[]>(() => [
  { label: 'Vision Score', value: battleStore.avgVisionScore.toFixed(1) },
  { label: 'Wards Placed', value: formatNumber(battleStore.allTime.wardsPlaced + live.value.wardsPlaced) },
  { label: 'Wards Killed', value: formatNumber(battleStore.allTime.wardsKilled + live.value.wardsKilled) },
  { label: 'Control Wards', value: formatNumber(battleStore.allTime.controlWards + live.value.controlWards) },
  { label: 'Longest Game', value: longestGameStr.value },
  { label: 'Avg Game', value: avgGameStr.value },
  { label: 'Playtime', value: playtimeStr.value },
])

const objectivesPerGameStr = computed(() => {
  if (battleStore.totalBattles === 0) return '—'
  const total =
    battleStore.allTime.dragons +
    battleStore.allTime.barons +
    battleStore.allTime.turrets +
    battleStore.allTime.inhibitors
  return (total / battleStore.totalBattles).toFixed(1)
})

const avgGameStr = computed(() => {
  if (battleStore.totalBattles === 0) return '—'
  // playtime is tracked in game-seconds, same unit formatTime expects
  return battleStore.formatTime(Math.round(playtimeGameSeconds.value / battleStore.totalBattles))
})

const longestGameStr = computed(() => {
  const s = Math.max(battleStore.allTime.longestGameSeconds, live.value.battleSeconds)
  if (s <= 0) return '—'
  return battleStore.formatTime(s)
})

const playtimeStr = computed(() => {
  // playtime is tracked in game-seconds (60x real time)
  const realSeconds = playtimeGameSeconds.value / 60
  if (realSeconds < 60) return `${Math.round(realSeconds)}s`
  if (realSeconds < 3600) return `${Math.round(realSeconds / 60)}m`
  return `${(realSeconds / 3600).toFixed(1)}h`
})
</script>

<style scoped>
/* Flat deep-space base — CosmicStageBackground paints its starfield on top of
   it (z-index 0), every content layer sits above via .landing-layer. */
.landing-screen {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.2vh, 14px);
  padding: clamp(10px, 1.6vh, 18px) clamp(14px, 1.4vw, 26px);
  background: #0a0906;
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

/* ── Roster owns all the leftover height: the cards are the visual centrepiece ── */
.roster-slot {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* ── Career ledger: five quiet panels along the bottom edge ── */
.stats-row {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(8px, 0.9vw, 16px);
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
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  min-width: clamp(250px, 21vw, 380px);
  padding: clamp(7px, 1vh, 11px) clamp(20px, 2vw, 32px);
  font-family: inherit;
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border: 2px solid #4a8a28;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #0e1a08,
    0 0 24px rgba(74, 138, 40, 0.35);
  color: #8ee060;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
  animation: battle-btn-glow 2.6s ease-in-out infinite;
}
.battle-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #28401a, #1a2a10);
  border-color: #6ec040;
  box-shadow:
    inset 0 0 0 1px #0e1a08,
    0 0 44px rgba(82, 184, 48, 0.6);
}
.battle-btn:active:not(:disabled) {
  transform: scale(0.985);
}

.battle-btn-face {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 0.8vw, 13px);
  font-size: clamp(14px, 1.75vh, 20px);
  font-weight: 700;
  letter-spacing: 4px;
  line-height: 1.1;
}

.battle-btn-sub {
  font-size: clamp(7px, 0.9vh, 9px);
  font-weight: 700;
  letter-spacing: 2px;
  color: #5d8a44;
}

.battle-btn--locked {
  background: linear-gradient(to bottom, #150e06, #0e0904) !important;
  border-color: #3a2010 !important;
  color: #6a4a22 !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  animation: none;
}
.battle-btn--locked .battle-btn-sub {
  color: #4a3018;
}
.battle-btn--locked .battle-btn-face {
  font-size: clamp(13px, 1.6vh, 18px);
}

.battle-btn--live {
  background: linear-gradient(to bottom, #2e1e08, #1c1204);
  border-color: #c89040;
  color: #e8c040;
  box-shadow:
    inset 0 0 0 1px #1a1004,
    0 0 24px rgba(200, 144, 64, 0.35);
  animation: battle-btn-glow-live 2.6s ease-in-out infinite;
}
.battle-btn--live .battle-btn-sub {
  color: #a08448;
}
.battle-btn--live .battle-btn-face {
  font-size: clamp(13px, 1.6vh, 18px);
}
.battle-btn--live:hover:not(:disabled) {
  background: linear-gradient(to bottom, #3e2a0c, #241806);
  border-color: #e8c060;
  box-shadow:
    inset 0 0 0 1px #1a1004,
    0 0 44px rgba(232, 192, 64, 0.5);
}

.battle-btn-img {
  width: clamp(20px, 2.4vh, 27px);
  height: clamp(20px, 2.4vh, 27px);
  object-fit: contain;
}
.battle-btn-icon {
  width: clamp(17px, 2.1vh, 23px);
  height: clamp(17px, 2.1vh, 23px);
}
.battle-btn-lock {
  width: clamp(16px, 1.9vh, 21px);
  height: clamp(16px, 1.9vh, 21px);
  object-fit: contain;
  opacity: 0.7;
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
      inset 0 0 0 1px #0e1a08,
      0 0 18px rgba(74, 138, 40, 0.3);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px #0e1a08,
      0 0 40px rgba(82, 184, 48, 0.55);
  }
}

@keyframes battle-btn-glow-live {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 1px #1a1004,
      0 0 18px rgba(200, 144, 64, 0.3);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px #1a1004,
      0 0 40px rgba(232, 192, 64, 0.5);
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

/* Full HD and flatter viewports: tighten the vertical rhythm */
@media (max-height: 1100px) {
  .landing-screen {
    gap: 8px;
    padding: 9px 16px;
  }
  .battle-btn {
    padding: 7px 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .battle-btn,
  .battle-btn--live,
  .battle-btn-live-dot {
    animation: none;
  }
}
</style>
