<template>
  <div class="landing-screen">
    <!-- ── Rank band ── -->
    <RankBandPanel />

    <!-- ── Main split ── -->
    <div class="landing-main">
      <!-- Left: performance -->
      <div class="perf-col">
        <MultikillCardsRow />
        <div class="group-grid">
          <StatGroupPanel title="COMBAT" icon="game-icons:sword-clash" color="#cc6050" :rows="combatRows" />
          <StatGroupPanel title="FARM &amp; ECONOMY" icon="game-icons:crown-coin" color="#e8c040" :rows="economyRows" />
          <StatGroupPanel title="OBJECTIVES" icon="game-icons:stone-tower" color="#a855f7" :rows="objectiveRows" />
          <StatGroupPanel title="VISION &amp; TIME" icon="game-icons:semi-closed-eye" color="#5b8dd9" :rows="visionRows" />
        </div>
      </div>

      <!-- Right: roster -->
      <TeamRosterPanel class="roster-col" />
    </div>

    <!-- ── Central battle action bar ── -->
    <div class="action-bar">
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
        <Icon
          v-if="isStarting"
          icon="game-icons:sundial"
          width="24"
          height="24"
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
      </button>
      <div class="action-rule action-rule--right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { useBattleScoreboardStats } from '@/composables/useBattleScoreboardStats'
import { formatNumber } from '@/config/numberFormat'
import RankBandPanel from './RankBandPanel.vue'
import MultikillCardsRow from './MultikillCardsRow.vue'
import StatGroupPanel, { type StatRow } from './StatGroupPanel.vue'
import TeamRosterPanel from './TeamRosterPanel.vue'

defineProps<{ isStarting: boolean }>()
defineEmits<{ start: [] }>()

const battleStore = useBattleStore()

// Battle action button state (mirrors headerSlots readiness)
const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)
const hasFullTeam = computed(() => teamProgress.value >= 5)
const isBattleLive = computed(() => battleStore.isAutoBattleInitialized)

// Career totals merged with the running battle — shared with the bottom-bar
// scoreboard via useBattleScoreboardStats so both always show the same numbers.
const { live, kills, deaths, assists, playtimeGameSeconds, kdaStr, killPartPct } =
  useBattleScoreboardStats()

function perMinute(total: number): number {
  return playtimeGameSeconds.value > 0 ? total / (playtimeGameSeconds.value / 60) : 0
}

const combatRows = computed<StatRow[]>(() => [
  { label: 'Kills', value: formatNumber(kills.value), color: '#6ee7b7' },
  { label: 'Deaths', value: formatNumber(deaths.value), color: '#fca5a5' },
  { label: 'Assists', value: formatNumber(assists.value), color: '#93c5fd' },
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
  { label: 'Total CS', value: formatNumber(battleStore.allTime.cs + live.value.cs) },
  { label: 'CS / min', value: perMinute(battleStore.allTime.cs + live.value.cs).toFixed(1), color: '#e8c040' },
  { label: 'Total Gold', value: formatNumber(battleStore.allTime.gold + live.value.gold), color: '#e8c040' },
  { label: 'Gold / min', value: formatNumber(Math.round(perMinute(battleStore.allTime.gold + live.value.gold))) },
  { label: 'Champ Dmg', value: formatNumber(battleStore.allTime.damage + live.value.damage) },
  { label: 'Dmg / min', value: formatNumber(Math.round(perMinute(battleStore.allTime.damage + live.value.damage))) },
  { label: 'Healing', value: formatNumber(battleStore.allTime.healing + live.value.healing) },
  { label: 'Dmg Taken', value: formatNumber(battleStore.allTime.damageTaken + live.value.damageTaken) },
])

const objectiveRows = computed<StatRow[]>(() => [
  { label: 'Dragons', value: formatNumber(battleStore.allTime.dragons + live.value.dragons), color: '#6ee0a0' },
  { label: 'Barons', value: formatNumber(battleStore.allTime.barons + live.value.barons), color: '#c9a0f5' },
  { label: 'Turrets', value: formatNumber(battleStore.allTime.turrets + live.value.turrets) },
  { label: 'Inhibitors', value: formatNumber(battleStore.allTime.inhibitors + live.value.inhibitors) },
  { label: 'Nexus Kills', value: formatNumber(battleStore.totalWins) },
  { label: 'Honors Given', value: formatNumber(battleStore.allTime.honorsGiven) },
])

const visionRows = computed<StatRow[]>(() => [
  { label: 'Vision Score', value: battleStore.avgVisionScore.toFixed(1) },
  { label: 'Wards Placed', value: formatNumber(battleStore.allTime.wardsPlaced + live.value.wardsPlaced) },
  { label: 'Wards Killed', value: formatNumber(battleStore.allTime.wardsKilled + live.value.wardsKilled) },
  { label: 'Control Wards', value: formatNumber(battleStore.allTime.controlWards + live.value.controlWards) },
  { label: 'Longest Game', value: longestGameStr.value },
  { label: 'Playtime', value: playtimeStr.value },
])

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
.landing-screen {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: clamp(7px, 1.1vh, 12px);
  padding: clamp(10px, 1.6vh, 18px) clamp(14px, 1.4vw, 24px);
  background: radial-gradient(circle at 50% 0%, #171208, #0b0a07 72%);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* ── Main split ── */
.landing-main {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: clamp(8px, 0.9vw, 14px);
}

.perf-col {
  flex: 1.5;
  display: flex;
  flex-direction: column;
  gap: clamp(7px, 1.1vh, 12px);
  min-height: 0;
  min-width: 0;
}

.group-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: clamp(7px, 1.1vh, 12px);
}

.roster-col {
  flex: 1;
  min-width: clamp(260px, 22vw, 300px);
}

/* ── Central battle action bar ── */
.action-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 2px 0 4px;
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
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-width: clamp(300px, 28vw, 420px);
  padding: clamp(9px, 1.3vh, 14px) clamp(22px, 2.2vw, 34px);
  font-family: inherit;
  font-size: clamp(15px, 1.8vh, 18px);
  font-weight: 700;
  letter-spacing: 4px;
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border: 2px solid #4a8a28;
  border-radius: 5px;
  color: #8ee060;
  cursor: pointer;
  box-shadow: 0 0 24px rgba(74, 138, 40, 0.35);
  transition: all 0.15s;
  animation: battle-btn-glow 2.6s ease-in-out infinite;
}
.battle-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #28401a, #1a2a10);
  border-color: #6ec040;
  box-shadow: 0 0 40px rgba(82, 184, 48, 0.6);
}
.battle-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.battle-btn--locked {
  background: linear-gradient(to bottom, #150e06, #0e0904) !important;
  border-color: #3a2010 !important;
  color: #4a3018 !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  animation: none;
  font-size: 15px;
}

.battle-btn--live {
  background: linear-gradient(to bottom, #2e1e08, #1c1204);
  border-color: #c89040;
  color: #e8c040;
  box-shadow: 0 0 24px rgba(200, 144, 64, 0.35);
  animation: battle-btn-glow-live 2.6s ease-in-out infinite;
}
.battle-btn--live:hover:not(:disabled) {
  background: linear-gradient(to bottom, #3e2a0c, #241806);
  border-color: #e8c060;
  box-shadow: 0 0 40px rgba(232, 192, 64, 0.5);
}

.battle-btn-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}
.battle-btn-lock {
  width: 20px;
  height: 20px;
  object-fit: contain;
  opacity: 0.7;
}

.battle-btn-live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e8c040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.9);
  animation: live-dot-pulse 1.4s ease-in-out infinite;
}

@keyframes battle-btn-glow {
  0%, 100% { box-shadow: 0 0 18px rgba(74, 138, 40, 0.3); }
  50% { box-shadow: 0 0 36px rgba(82, 184, 48, 0.55); }
}

@keyframes battle-btn-glow-live {
  0%, 100% { box-shadow: 0 0 18px rgba(200, 144, 64, 0.3); }
  50% { box-shadow: 0 0 36px rgba(232, 192, 64, 0.5); }
}

@keyframes live-dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .battle-btn,
  .battle-btn--live { animation: none; }
  .battle-btn-live-dot { animation: none; }
}
</style>
