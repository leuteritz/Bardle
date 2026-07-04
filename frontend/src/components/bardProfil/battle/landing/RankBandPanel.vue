<template>
  <div class="rank-band" :style="{ borderColor: rankColorDim, background: bandBg }">
    <!-- Rank emblem (image) -->
    <div class="rank-emblem">
      <div class="emblem-ring" :style="{ borderColor: rankColorDim }" />
      <img :src="rankImage" :alt="currentRank.tier" class="emblem-img" :style="{ filter: emblemGlow }" />
    </div>

    <!-- Rank text + LP bar -->
    <div class="rank-info">
      <div class="rank-name" :style="{ color: rankColor }">
        {{ currentRank.tier.toUpperCase() }}<template v-if="!isHighTier"> {{ currentRank.division }}</template>
      </div>
      <div class="rank-sub">{{ currentRank.lp }} LP · MMR {{ mmr }}</div>
      <div class="lp-track">
        <div class="lp-fill" :style="{ width: lpPercent + '%', background: rankColor, boxShadow: `0 0 8px ${rankColor}` }" />
      </div>
    </div>

    <!-- W/L/Streak -->
    <div class="wl-block">
      <div class="wl-item">
        <div class="wl-num wl-num--win">{{ totalWins }}<span class="wl-suffix">W</span></div>
        <div class="wl-sub">{{ winRateStr }}% WR</div>
      </div>
      <div class="wl-item">
        <div class="wl-num wl-num--loss">{{ totalLosses }}<span class="wl-suffix">L</span></div>
        <div class="wl-sub">{{ totalBattles }} games</div>
      </div>
      <div class="wl-item">
        <div class="wl-num wl-num--streak" :class="{ 'streak-fire': currentWinStreak >= 3 }">
          {{ currentWinStreak }}W
        </div>
        <div class="wl-sub">Best {{ bestWinStreak }}</div>
      </div>
    </div>

    <!-- Next match win chance -->
    <div class="chance-block">
      <div class="chance-eyebrow">NEXT MATCH · WIN CHANCE</div>
      <div class="chance-row">
        <div class="chance-track">
          <div class="chance-fill" :class="probClass" :style="{ width: winProbPercent + '%' }" />
        </div>
        <span class="chance-value" :class="probClass">{{ winProbPercent }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import {
  LP_NORMAL_PROMOTION_THRESHOLD,
  LP_MASTER_PROMOTION_THRESHOLD,
  LP_GRANDMASTER_PROMOTION_THRESHOLD,
} from '@/config/constants'

const battleStore = useBattleStore()
const { currentRank, mmr, totalWins, totalLosses, totalBattles, currentWinStreak, bestWinStreak } =
  storeToRefs(battleStore)

const RANK_IMAGE_MAP: Record<string, string> = {
  Iron: '/img/RankBorder/RankIron.png',
  Bronze: '/img/RankBorder/RankBronze.png',
  Silver: '/img/RankBorder/RankSilver.png',
  Gold: '/img/RankBorder/RankGold.png',
  Platinum: '/img/RankBorder/RankPlatin.png',
  Emerald: '/img/RankBorder/RankEmerald.png',
  Diamond: '/img/RankBorder/RankDiamand.png',
  Master: '/img/RankBorder/RankMaster.png',
  Grandmaster: '/img/RankBorder/RankGrandMaster.png',
  Challenger: '/img/RankBorder/RankChallenger.png',
}

const RANK_COLORS: Record<string, string> = {
  Iron: '#8a9098',
  Bronze: '#c87832',
  Silver: '#b0b8c4',
  Gold: '#d4a020',
  Platinum: '#4ab8c0',
  Emerald: '#3cbc78',
  Diamond: '#88d8f8',
  Master: '#b060f0',
  Grandmaster: '#f06028',
  Challenger: '#f0dc50',
}

const rankImage = computed(() => RANK_IMAGE_MAP[currentRank.value.tier] ?? RANK_IMAGE_MAP.Iron)
const rankColor = computed(() => RANK_COLORS[currentRank.value.tier] ?? '#d4a020')
const rankColorDim = computed(() => rankColor.value + '4d')
const bandBg = computed(
  () => `linear-gradient(to right, ${rankColor.value}22, rgba(0, 0, 0, 0.32) 55%)`,
)
const emblemGlow = computed(
  () => `drop-shadow(0 0 6px ${rankColor.value}) drop-shadow(0 0 14px ${rankColor.value}66)`,
)

const isHighTier = computed(() =>
  ['Master', 'Grandmaster', 'Challenger'].includes(currentRank.value.tier),
)

const lpPercent = computed(() => {
  const tier = currentRank.value.tier
  if (tier === 'Challenger') return 100
  let cap = LP_NORMAL_PROMOTION_THRESHOLD
  if (tier === 'Master') cap = LP_MASTER_PROMOTION_THRESHOLD
  else if (tier === 'Grandmaster') cap = LP_GRANDMASTER_PROMOTION_THRESHOLD
  return Math.min(100, Math.max(0, (currentRank.value.lp / cap) * 100))
})

const winRateStr = computed(() =>
  totalBattles.value === 0 ? '0.0' : ((totalWins.value / totalBattles.value) * 100).toFixed(1),
)

const winProbPercent = computed(() => Math.round(battleStore.currentWinProbability * 100))
const probClass = computed(() => {
  const p = battleStore.currentWinProbability
  if (p >= 0.65) return 'prob--high'
  if (p >= 0.45) return 'prob--mid'
  return 'prob--low'
})
</script>

<style scoped>
.rank-band {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 14px 22px;
  flex-shrink: 0;
  border: 1px solid;
  border-radius: 5px;
}

/* ── Emblem ── */
.rank-emblem {
  position: relative;
  width: 74px;
  height: 74px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emblem-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid;
  animation: emblem-spin 22s linear infinite;
  border-right-color: transparent !important;
}

.emblem-img {
  width: 68px;
  height: 68px;
  object-fit: contain;
}

/* ── Rank info ── */
.rank-info {
  min-width: 180px;
}

.rank-name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1.1;
}

.rank-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.42);
  margin-top: 2px;
}

.lp-track {
  width: 100%;
  height: 6px;
  margin-top: 7px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.lp-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── W/L/Streak ── */
.wl-block {
  display: flex;
  gap: 26px;
  margin-left: 8px;
}

.wl-item {
  text-align: center;
}

.wl-num {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}
.wl-num--win { color: #52b830; }
.wl-num--loss { color: #cc6050; }
.wl-num--streak {
  color: #d4a020;
}
.streak-fire {
  color: #f06820;
  animation: streak-pulse 1.6s ease-in-out infinite;
}

.wl-suffix {
  font-size: 12px;
  color: #6a5820;
  margin-left: 1px;
}

.wl-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: #6a5820;
  margin-top: 3px;
}

/* ── Win chance ── */
.chance-block {
  margin-left: auto;
  text-align: right;
}

.chance-eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  color: #6a5820;
}

.chance-row {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 5px;
}

.chance-track {
  width: 150px;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.chance-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.chance-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  min-width: 52px;
}

.prob--high {
  background: linear-gradient(to right, #2a7020, #52b830);
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.5);
  color: #52b830;
}
.prob--mid {
  background: linear-gradient(to right, #7a6010, #d4a020);
  box-shadow: 0 0 10px rgba(212, 160, 32, 0.45);
  color: #d4a020;
}
.prob--low {
  background: linear-gradient(to right, #7a2010, #cc5030);
  box-shadow: 0 0 10px rgba(204, 80, 48, 0.45);
  color: #cc6050;
}

@keyframes emblem-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}

@keyframes streak-pulse {
  0%, 100% { text-shadow: 0 0 12px rgba(240, 104, 32, 0.45); }
  50% { text-shadow: 0 0 28px rgba(240, 104, 32, 0.95); }
}

@media (prefers-reduced-motion: reduce) {
  .emblem-ring, .streak-fire { animation: none; }
}
</style>
