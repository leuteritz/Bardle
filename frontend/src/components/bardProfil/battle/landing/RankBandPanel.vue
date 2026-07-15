<template>
  <div class="rank-hero" :style="{ borderColor: rankColorDim, background: heroBg }">
    <!-- ── Rank identity: big emblem + big rank/LP ── -->
    <div class="hero-top">
      <div class="rank-emblem">
        <div class="emblem-glow" :style="{ background: emblemGlowBg }" />
        <div class="emblem-ring" :style="{ borderColor: rankColorDim }" />
        <img :src="rankImage" :alt="currentRank.tier" class="emblem-img" :style="{ filter: emblemGlow }" />
      </div>

      <div class="rank-identity">
        <div class="rank-name" :style="{ color: rankColor }">{{ rankTitle }}</div>
        <div class="lp-big">
          <span class="lp-num">{{ currentRank.lp }}</span>
          <span class="lp-unit">LP</span>
        </div>
      </div>
    </div>

    <!-- ── LP progress toward the next rank ── -->
    <div class="lp-block">
      <div class="lp-track">
        <div
          class="lp-fill"
          :style="{ width: lpPercent + '%', background: rankColor, boxShadow: `0 0 10px ${rankColor}` }"
        />
      </div>
      <span class="rank-goal">{{ promotionGoal }}</span>
    </div>

    <div class="hero-divider" />

    <!-- ── Ladder record ── -->
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
    <div class="stats-sub">{{ totalBattles }} GAMES · MMR {{ mmr }} · BEST STREAK {{ bestWinStreak }}W</div>
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
  RANK_EMBLEM_IMAGES,
  RANK_TIER_COLORS,
} from '@/config/constants'

const battleStore = useBattleStore()
const { currentRank, mmr, totalWins, totalLosses, totalBattles, currentWinStreak, bestWinStreak } =
  storeToRefs(battleStore)

const rankImage = computed(
  () => RANK_EMBLEM_IMAGES[currentRank.value.tier] ?? RANK_EMBLEM_IMAGES.Iron,
)
const rankColor = computed(() => RANK_TIER_COLORS[currentRank.value.tier] ?? '#d4a020')
const rankColorDim = computed(() => rankColor.value + '4d')
const heroBg = computed(
  () => `radial-gradient(circle at 18% 0%, ${rankColor.value}26, rgba(0, 0, 0, 0.35) 62%)`,
)
const emblemGlow = computed(
  () => `drop-shadow(0 0 8px ${rankColor.value}) drop-shadow(0 0 18px ${rankColor.value}66)`,
)
const emblemGlowBg = computed(
  () => `radial-gradient(circle, ${rankColor.value}33, transparent 70%)`,
)

const isHighTier = computed(() =>
  ['Master', 'Grandmaster', 'Challenger'].includes(currentRank.value.tier),
)

const rankTitle = computed(() => {
  const tier = currentRank.value.tier.toUpperCase()
  return isHighTier.value ? tier : `${tier} ${currentRank.value.division}`
})

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
</script>

<style scoped>
.rank-hero {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1vh, 11px);
  padding: clamp(10px, 1.6vh, 18px) clamp(12px, 1.2vw, 20px);
  border: 1px solid;
  border-radius: 5px;
}

/* ── Rank identity ── */
.hero-top {
  display: flex;
  align-items: center;
  gap: clamp(12px, 1.3vw, 22px);
}

.rank-emblem {
  position: relative;
  width: clamp(68px, 9.5vh, 100px);
  height: clamp(68px, 9.5vh, 100px);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emblem-glow {
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  pointer-events: none;
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
  width: 88%;
  height: 88%;
  object-fit: contain;
  position: relative;
}

.rank-identity {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(2px, 0.5vh, 6px);
}

.rank-name {
  font-size: clamp(22px, 3.4vh, 34px);
  font-weight: 700;
  letter-spacing: 2px;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-big {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.lp-num {
  font-size: clamp(20px, 3vh, 30px);
  font-weight: 700;
  line-height: 1;
  color: #e8e2d0;
}

.lp-unit {
  font-size: clamp(11px, 1.4vh, 14px);
  font-weight: 700;
  letter-spacing: 2px;
  color: #a08448;
}

/* ── LP progress: bar and promotion goal share one line ── */
.lp-block {
  display: flex;
  align-items: center;
  gap: clamp(8px, 0.8vw, 14px);
}

.lp-track {
  flex: 1;
  min-width: 0;
  height: clamp(7px, 1vh, 10px);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 5px;
  overflow: hidden;
}

.lp-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.rank-goal {
  flex-shrink: 0;
  font-size: clamp(9px, 1.2vh, 11px);
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #c8a058;
}

.hero-divider {
  height: 1px;
  background: rgba(212, 160, 32, 0.15);
}

/* ── Ladder record ── */
.stats-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 0 clamp(2px, 0.5vw, 10px);
}

.stat-col {
  text-align: center;
}

.stat-num {
  font-size: clamp(16px, 2.3vh, 23px);
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
  font-size: clamp(8px, 1vh, 10px);
  letter-spacing: 2px;
  color: #a08448;
  margin-top: 4px;
}

.stats-sub {
  font-size: clamp(8px, 1vh, 10px);
  letter-spacing: 1.5px;
  color: rgba(232, 226, 208, 0.55);
  text-align: center;
}

@keyframes emblem-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}

@keyframes streak-pulse {
  0%, 100% { text-shadow: 0 0 12px rgba(240, 104, 32, 0.45); }
  50% { text-shadow: 0 0 28px rgba(240, 104, 32, 0.95); }
}

/* short viewports: tighten the hero so the roster below keeps all 5 rows */
@media (max-height: 820px) {
  .rank-hero {
    gap: 5px;
    padding: 8px 12px;
  }
  .rank-emblem {
    width: 58px;
    height: 58px;
  }
  .stats-sub {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .emblem-ring, .streak-fire { animation: none; }
}
</style>
