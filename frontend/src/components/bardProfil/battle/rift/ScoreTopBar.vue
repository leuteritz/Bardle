<template>
  <div
    class="score-bar score-bar--clickable"
    title="View career stats"
    @click="battleStore.isViewingLanding = true"
  >
    <!-- Blue side -->
    <div class="side side--blue">
      <span class="side-name side-name--blue">BARD'S VANGUARD</span>
      <div class="side-stats">
        <span class="stat" title="Turrets destroyed"><Icon icon="game-icons:watchtower" width="14" height="14" class="stat-icon" /> {{ battleStore.team1Turrets }}</span>
        <span class="stat" title="Inhibitors destroyed"><Icon icon="game-icons:floating-crystal" width="14" height="14" class="stat-icon stat-icon--inhib" /> {{ battleStore.team1Inhibs }}</span>
        <span class="stat"><img src="/img/dragon.png" alt="Drakes" class="stat-img" /> {{ battleStore.team1Drakes + battleStore.team1Barons }}</span>
        <span class="stat stat--gold">◈ {{ formatNumber(battleStore.team1Gold) }}</span>
        <span class="stat stat--level">Lv {{ battleStore.team1AvgLevel }}</span>
      </div>
    </div>

    <!-- Center: kills + timer -->
    <div class="center">
      <span class="kills kills--blue">{{ battleStore.team1Kills }}</span>
      <div class="timer-block">
        <div class="timer-eyebrow">GAME TIME</div>
        <div class="timer-value">{{ battleStore.formatTime(battleStore.battleTime) }}</div>
      </div>
      <span class="kills kills--red">{{ battleStore.team2Kills }}</span>
    </div>

    <!-- Red side -->
    <div class="side side--red">
      <span class="side-name side-name--red">CRIMSON PACT</span>
      <div class="side-stats side-stats--red">
        <span class="stat stat--level">Lv {{ battleStore.team2AvgLevel }}</span>
        <span class="stat stat--gold">{{ formatNumber(battleStore.team2Gold) }} ◈</span>
        <span class="stat">{{ battleStore.team2Drakes + battleStore.team2Barons }} <img src="/img/dragon.png" alt="Drakes" class="stat-img" /></span>
        <span class="stat" title="Inhibitors destroyed">{{ battleStore.team2Inhibs }} <Icon icon="game-icons:floating-crystal" width="14" height="14" class="stat-icon stat-icon--inhib" /></span>
        <span class="stat" title="Turrets destroyed">{{ battleStore.team2Turrets }} <Icon icon="game-icons:watchtower" width="14" height="14" class="stat-icon" /></span>
      </div>
    </div>
  </div>

  <!-- Live win chance strip -->
  <div class="winprob-strip">
    <div class="winprob-fill" :style="{ width: winProbPercent + '%' }" />
    <span class="winprob-label">WIN {{ winProbPercent }}%</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { formatNumber } from '@/config/numberFormat'

const battleStore = useBattleStore()
const winProbPercent = computed(() => Math.round(battleStore.currentWinProbability * 100))
</script>

<style scoped>
.score-bar {
  display: flex;
  align-items: stretch;
  height: 60px;
  flex-shrink: 0;
  border-bottom: 2px solid #3e200a;
  background: #0d0c08;
}

.score-bar--clickable {
  cursor: pointer;
  transition: filter 0.15s;
}
.score-bar--clickable:hover {
  filter: brightness(1.25);
}

.side {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  min-width: 0;
}
.side--blue {
  background: linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.03));
}
.side--red {
  flex-direction: row-reverse;
  background: linear-gradient(to left, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.03));
}

.side-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.side-name--blue { color: #93c5fd; }
.side-name--red { color: #fca5a5; }

.side-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
  font-size: 14px;
  color: #8ab0e0;
}
.side-stats--red {
  margin-left: 0;
  margin-right: auto;
  color: #e0a0a0;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.stat--gold { color: #e8c040; }
.stat--level { color: #e8e2d0; }

.stat-icon { opacity: 0.8; }
.stat-icon--inhib { color: #e884d8; }
.stat-img {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  object-fit: cover;
}

.center {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 22px;
  background: #0d0c08;
  border-left: 2px solid #3e200a;
  border-right: 2px solid #3e200a;
  flex-shrink: 0;
}

.kills {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  min-width: 44px;
  text-align: center;
}
.kills--blue { color: #93c5fd; }
.kills--red { color: #fca5a5; }

.timer-block {
  text-align: center;
}
.timer-eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  color: #6a5820;
}
.timer-value {
  font-size: 22px;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.5);
}

/* ── Win probability strip ── */
.winprob-strip {
  position: relative;
  height: 8px;
  flex-shrink: 0;
  background: rgba(239, 68, 68, 0.25);
  border-bottom: 2px solid #3e200a;
  overflow: hidden;
}
.winprob-fill {
  height: 100%;
  background: linear-gradient(to right, #1d4ed8, #3b82f6);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.7);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.winprob-label {
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 10px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  pointer-events: none;
}
</style>
