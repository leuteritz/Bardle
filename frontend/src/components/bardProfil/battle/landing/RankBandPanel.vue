<template>
  <div class="rank-band" :style="{ borderColor: rankColorDim, background: bandBg }">
    <!-- ── Zone 1: Rank identity ── -->
    <div class="rank-emblem">
      <div class="emblem-ring" :style="{ borderColor: rankColorDim }" />
      <img :src="rankImage" :alt="currentRank.tier" class="emblem-img" :style="{ filter: emblemGlow }" />
    </div>

    <div class="rank-info">
      <div class="rank-name" :style="{ color: rankColor }">
        {{ currentRank.tier.toUpperCase() }}<template v-if="!isHighTier"> {{ currentRank.division }}</template>
      </div>
      <div class="lp-line">
        <div class="lp-track">
          <div class="lp-fill" :style="{ width: lpPercent + '%', background: rankColor, boxShadow: `0 0 8px ${rankColor}` }" />
        </div>
        <span class="lp-value">{{ currentRank.lp }} LP</span>
      </div>
      <div class="rank-goal">{{ promotionGoal }}</div>
    </div>

    <!-- ── Zone 2: Rank stats ── -->
    <div class="band-divider" />

    <div class="stats-zone">
      <div class="stats-row">
        <div class="stat-col">
          <div class="stat-num stat-num--win">{{ totalWins }}</div>
          <div class="stat-label">WINS</div>
        </div>
        <div class="stat-col">
          <div class="stat-num stat-num--loss">{{ totalLosses }}</div>
          <div class="stat-label">LOSSES</div>
        </div>
        <div class="stat-col">
          <div class="stat-num stat-num--gold">{{ winRateStr }}%</div>
          <div class="stat-label">WINRATE</div>
        </div>
        <div class="stat-col">
          <div class="stat-num stat-num--gold" :class="{ 'streak-fire': currentWinStreak >= 3 }">
            {{ currentWinStreak }}W
          </div>
          <div class="stat-label">STREAK</div>
        </div>
      </div>
      <div class="stats-sub">
        {{ totalBattles }} GAMES · MMR {{ mmr }} · BEST STREAK {{ bestWinStreak }}W
      </div>
    </div>

    <!-- ── Zone 3: Next battle win chance ── -->
    <div class="band-divider" />

    <div class="chance-zone">
      <div class="card-eyebrow">NEXT BATTLE</div>
      <div class="card-row">
        <div class="card-track">
          <div class="card-base-tick" :style="{ left: baseTickPercent + '%' }" />
          <div class="card-fill card-fill--start" :style="{ width: startChancePercent + '%' }" />
        </div>
        <span class="card-value card-value--start">{{ startChancePercent }}%</span>
      </div>
      <div class="card-sub" :class="{ 'card-sub--boosted': startBonusPercent > 0 }">
        <template v-if="startBonusPercent > 0">
          BASE {{ basePercent }}% + {{ startBonusPercent }}% FROM UPGRADES
        </template>
        <template v-else>STARTING WIN CHANCE</template>
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
  RANK_TIERS,
  RANK_DIVISIONS,
  BATTLE_BASE_START_WIN_CHANCE,
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

const lpCap = computed(() => {
  const tier = currentRank.value.tier
  if (tier === 'Master') return LP_MASTER_PROMOTION_THRESHOLD
  if (tier === 'Grandmaster') return LP_GRANDMASTER_PROMOTION_THRESHOLD
  return LP_NORMAL_PROMOTION_THRESHOLD
})

const lpPercent = computed(() => {
  if (currentRank.value.tier === 'Challenger') return 100
  return Math.min(100, Math.max(0, (currentRank.value.lp / lpCap.value) * 100))
})

/** Where the player is headed next — the idle-game carrot under the LP bar. */
const promotionGoal = computed(() => {
  const { tier, division, lp } = currentRank.value
  if (tier === 'Challenger') return 'TOP OF THE LADDER'
  const lpNeeded = Math.max(0, lpCap.value - lp)
  if (tier === 'Master') return `${lpNeeded} LP TO GRANDMASTER`
  if (tier === 'Grandmaster') return `${lpNeeded} LP TO CHALLENGER`
  const divIdx = RANK_DIVISIONS.indexOf(division as (typeof RANK_DIVISIONS)[number])
  if (divIdx >= 0 && divIdx < RANK_DIVISIONS.length - 1) {
    return `${lpNeeded} LP TO ${tier.toUpperCase()} ${RANK_DIVISIONS[divIdx + 1]}`
  }
  const tierIdx = RANK_TIERS.indexOf(tier as (typeof RANK_TIERS)[number])
  const nextTier = RANK_TIERS[tierIdx + 1] ?? 'Master'
  return `${lpNeeded} LP TO ${nextTier.toUpperCase()}`
})

const winRateStr = computed(() =>
  totalBattles.value === 0 ? '0.0' : ((totalWins.value / totalBattles.value) * 100).toFixed(1),
)

// ── Next battle win chance ──
const basePercent = Math.round(BATTLE_BASE_START_WIN_CHANCE * 100)
const baseTickPercent = basePercent
const startChancePercent = computed(() => Math.round(battleStore.nextBattleStartWinChance * 100))
const startBonusPercent = computed(() => startChancePercent.value - basePercent)
</script>

<style scoped>
.rank-band {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 12px 18px;
  flex-shrink: 0;
  border: 1px solid;
  border-radius: 5px;
}

/* ── Zone 1: Emblem + rank identity ── */
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

.rank-info {
  min-width: 190px;
}

.rank-name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1.1;
}

.lp-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
}

.lp-track {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.lp-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.lp-value {
  font-size: 11px;
  font-weight: 700;
  color: #e8e2d0;
  flex-shrink: 0;
}

.rank-goal {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #c8a058;
  margin-top: 4px;
}

/* ── Divider between zones ── */
.band-divider {
  align-self: stretch;
  width: 1px;
  margin: 4px 0;
  background: rgba(212, 160, 32, 0.15);
  flex-shrink: 0;
}

/* ── Zone 2: Rank stats ── */
.stats-zone {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.stats-row {
  display: flex;
  justify-content: center;
  gap: 34px;
}

.stat-col {
  text-align: center;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}
.stat-num--win { color: #52b830; }
.stat-num--loss { color: #cc6050; }
.stat-num--gold { color: #e8c040; }
.streak-fire {
  color: #f06820;
  animation: streak-pulse 1.6s ease-in-out infinite;
}

.stat-label {
  font-size: 10px;
  letter-spacing: 2px;
  color: #a08448;
  margin-top: 4px;
}

.stats-sub {
  font-size: 10px;
  letter-spacing: 1.5px;
  color: rgba(232, 226, 208, 0.55);
  margin-top: 8px;
}

/* ── Zone 3: Next battle win chance ── */
.chance-zone {
  flex-shrink: 0;
  min-width: 220px;
  padding-right: 4px;
  text-align: right;
}

.card-eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  color: #a08448;
}

.card-row {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 6px;
}

.card-track {
  position: relative;
  width: 140px;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.card-base-tick {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: rgba(255, 255, 255, 0.28);
  z-index: 1;
}

.card-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-fill--start {
  background: linear-gradient(to right, #7a6010, #d4a020);
  box-shadow: 0 0 10px rgba(212, 160, 32, 0.45);
}

.card-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  min-width: 52px;
}

.card-value--start {
  color: #e8c040;
}

.card-sub {
  font-size: 10px;
  letter-spacing: 1.5px;
  color: rgba(232, 226, 208, 0.55);
  margin-top: 5px;
}

.card-sub--boosted {
  color: #52b830;
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
