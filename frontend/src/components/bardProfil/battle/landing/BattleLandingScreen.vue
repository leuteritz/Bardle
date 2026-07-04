<template>
  <div class="landing-screen">
    <!-- ── Header ── -->
    <div class="landing-header">
      <img src="/img/menu/BATTLE.png" alt="Battle" class="header-crest" />
      <div class="header-title">RANKED QUEUE</div>
      <div class="header-right">
        <div class="header-season">RANKED · SOLO / DUO</div>
        <div class="header-summary">Career summary · {{ battleStore.totalBattles }} ranked games</div>
      </div>
    </div>

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

      <!-- Right: roster + start -->
      <TeamRosterPanel class="roster-col" :is-starting="isStarting" @start="$emit('start')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { formatNumber } from '@/config/numberFormat'
import RankBandPanel from './RankBandPanel.vue'
import MultikillCardsRow from './MultikillCardsRow.vue'
import StatGroupPanel, { type StatRow } from './StatGroupPanel.vue'
import TeamRosterPanel from './TeamRosterPanel.vue'

defineProps<{ isStarting: boolean }>()
defineEmits<{ start: [] }>()

const battleStore = useBattleStore()

const kdaStr = computed(() => {
  if (battleStore.totalDeaths === 0)
    return battleStore.totalKills + battleStore.totalAssists > 0 ? 'Perfect' : '—'
  return battleStore.careerKda.toFixed(2)
})

const combatRows = computed<StatRow[]>(() => [
  { label: 'Kills', value: formatNumber(battleStore.totalKills), color: '#6ee7b7' },
  { label: 'Deaths', value: formatNumber(battleStore.totalDeaths), color: '#fca5a5' },
  { label: 'Assists', value: formatNumber(battleStore.totalAssists), color: '#93c5fd' },
  { label: 'KDA', value: kdaStr.value, color: '#e8c040' },
  { label: 'Kill Part.', value: `${Math.round(battleStore.avgKillParticipation * 100)}%` },
  { label: 'Largest Spree', value: formatNumber(battleStore.allTime.largestSpree) },
  { label: 'First Bloods', value: formatNumber(battleStore.allTime.firstBloods) },
  { label: 'Solo Kills', value: formatNumber(battleStore.allTime.soloKills) },
])

const economyRows = computed<StatRow[]>(() => [
  { label: 'Total CS', value: formatNumber(battleStore.allTime.cs) },
  { label: 'CS / min', value: battleStore.csPerMinute.toFixed(1), color: '#e8c040' },
  { label: 'Total Gold', value: formatNumber(battleStore.allTime.gold), color: '#e8c040' },
  { label: 'Gold / min', value: formatNumber(Math.round(battleStore.goldPerMinute)) },
  { label: 'Champ Dmg', value: formatNumber(battleStore.allTime.damage) },
  { label: 'Dmg / min', value: formatNumber(Math.round(battleStore.damagePerMinute)) },
  { label: 'Healing', value: formatNumber(battleStore.allTime.healing) },
  { label: 'Dmg Taken', value: formatNumber(battleStore.allTime.damageTaken) },
])

const objectiveRows = computed<StatRow[]>(() => [
  { label: 'Dragons', value: formatNumber(battleStore.allTime.dragons), color: '#6ee0a0' },
  { label: 'Barons', value: formatNumber(battleStore.allTime.barons), color: '#c9a0f5' },
  { label: 'Turrets', value: formatNumber(battleStore.allTime.turrets) },
  { label: 'Inhibitors', value: formatNumber(battleStore.allTime.inhibitors) },
  { label: 'Nexus Kills', value: formatNumber(battleStore.totalWins) },
  { label: 'Honors Given', value: formatNumber(battleStore.allTime.honorsGiven) },
])

const visionRows = computed<StatRow[]>(() => [
  { label: 'Vision Score', value: battleStore.avgVisionScore.toFixed(1) },
  { label: 'Wards Placed', value: formatNumber(battleStore.allTime.wardsPlaced) },
  { label: 'Wards Killed', value: formatNumber(battleStore.allTime.wardsKilled) },
  { label: 'Control Wards', value: formatNumber(battleStore.allTime.controlWards) },
  { label: 'Longest Game', value: longestGameStr.value },
  { label: 'Playtime', value: playtimeStr.value },
])

const longestGameStr = computed(() => {
  const s = battleStore.allTime.longestGameSeconds
  if (s <= 0) return '—'
  return battleStore.formatTime(s)
})

const playtimeStr = computed(() => {
  // totalBattleTime is stored in game-seconds (60x real time)
  const realSeconds = battleStore.totalBattleTime / 60
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
  gap: 12px;
  padding: 20px 24px;
  background: radial-gradient(circle at 50% 0%, #171208, #0b0a07 72%);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* ── Header ── */
.landing-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.header-crest {
  width: 44px;
  height: 44px;
  object-fit: contain;
  animation: crest-pulse 3s ease-in-out infinite;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 7px;
  color: #d4a020;
  text-shadow: 0 0 24px rgba(212, 160, 32, 0.45);
}

.header-right {
  margin-left: auto;
  text-align: right;
  line-height: 1.3;
}

.header-season {
  font-size: 11px;
  letter-spacing: 3px;
  color: #6a5820;
}

.header-summary {
  font-size: 13px;
  color: rgba(232, 226, 208, 0.55);
}

/* ── Main split ── */
.landing-main {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 14px;
}

.perf-col {
  flex: 1.5;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  min-width: 0;
}

.group-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
}

.roster-col {
  flex: 1;
  min-width: 300px;
}

@keyframes crest-pulse {
  0%, 100% {
    filter: drop-shadow(0 0 10px rgba(200, 150, 30, 0.4));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 22px rgba(210, 160, 20, 0.85));
    transform: scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .header-crest { animation: none; }
}
</style>
