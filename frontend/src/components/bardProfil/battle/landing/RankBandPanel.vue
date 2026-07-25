<template>
  <!-- Hero #1 of the landing stage: rank identity and LP, the biggest thing on screen -->
  <div class="rank-hero" :style="{ borderColor: rankColorDim }">
    <div class="hero-aura" :style="{ background: auraBg }" />
    <div class="hero-topline" :style="{ background: toplineBg }" />

    <div class="hero-core">
      <div class="rank-emblem">
        <div class="emblem-glow" :style="{ background: emblemGlowBg }" />
        <div class="emblem-ring" :style="{ borderColor: rankColorDim }" />
        <div class="emblem-ring emblem-ring--counter" :style="{ borderColor: rankColorFaint }" />
        <img
          :src="rankImage"
          :alt="currentRank.tier"
          class="emblem-img"
          :style="{ filter: emblemGlow }"
        />
      </div>

      <div class="rank-identity">
        <span class="rank-kicker">RANKED LADDER</span>
        <div class="rank-name" :style="{ color: rankColor, textShadow: nameGlow }">
          {{ rankTitle }}
        </div>
      </div>

      <!-- Full tier ladder — shows at a glance how far the climb still goes -->
      <div class="tier-ladder">
        <span
          v-for="(tier, i) in RANK_TIERS"
          :key="tier"
          class="tier-pip"
          :class="{
            'tier-pip--current': i === currentTierIndex,
            'tier-pip--cleared': i < currentTierIndex,
          }"
          :title="tier"
        >
          <img :src="RANK_EMBLEM_IMAGES[tier]" :alt="tier" class="tier-pip-img" />
        </span>
      </div>

      <div class="lp-tower">
        <span class="lp-num" :style="{ color: rankColor, textShadow: nameGlow }">
          {{ currentRank.lp }}
        </span>
        <span class="lp-unit">LEAGUE POINTS</span>
      </div>
    </div>

    <!-- LP progress toward the next rank -->
    <div class="lp-block">
      <div class="lp-meta">
        <span class="lp-meta-scale">{{ lpScaleLabel }}</span>
        <span class="lp-meta-goal">{{ promotionGoal }}</span>
      </div>
      <div class="lp-track">
        <div
          class="lp-fill"
          :style="{
            width: lpPercent + '%',
            background: `linear-gradient(to right, ${rankColorDeep}, ${rankColor})`,
            boxShadow: `0 0 14px ${rankColor}`,
          }"
        >
          <span class="lp-tip" :style="{ background: rankColor, boxShadow: `0 0 10px ${rankColor}` }" />
        </div>
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
  RANK_EMBLEM_IMAGES,
  RANK_TIER_COLORS,
} from '@/config/constants'

const battleStore = useBattleStore()
const { currentRank } = storeToRefs(battleStore)

const rankImage = computed(
  () => RANK_EMBLEM_IMAGES[currentRank.value.tier] ?? RANK_EMBLEM_IMAGES.Iron,
)
const rankColor = computed(() => RANK_TIER_COLORS[currentRank.value.tier] ?? '#d4a020')
const rankColorDim = computed(() => rankColor.value + '55')
const rankColorFaint = computed(() => rankColor.value + '22')
const rankColorDeep = computed(() => rankColor.value + '66')

const auraBg = computed(
  () =>
    `radial-gradient(ellipse at 50% 120%, ${rankColor.value}2e, transparent 68%),` +
    ` radial-gradient(ellipse at 12% 0%, ${rankColor.value}1f, transparent 60%)`,
)
const toplineBg = computed(
  () => `linear-gradient(to right, transparent, ${rankColor.value}, transparent)`,
)
const emblemGlow = computed(
  () => `drop-shadow(0 0 10px ${rankColor.value}) drop-shadow(0 0 26px ${rankColor.value}77)`,
)
const emblemGlowBg = computed(
  () => `radial-gradient(circle, ${rankColor.value}3d, transparent 70%)`,
)
const nameGlow = computed(() => `0 0 26px ${rankColor.value}59`)

const isHighTier = computed(() =>
  ['Master', 'Grandmaster', 'Challenger'].includes(currentRank.value.tier),
)

const rankTitle = computed(() => {
  const tier = currentRank.value.tier.toUpperCase()
  return isHighTier.value ? tier : `${tier} ${currentRank.value.division}`
})

const currentTierIndex = computed(() =>
  RANK_TIERS.indexOf(currentRank.value.tier as (typeof RANK_TIERS)[number]),
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

/** Left end of the LP bar: how far along the current tier the player stands. */
const lpScaleLabel = computed(() =>
  currentRank.value.tier === 'Challenger'
    ? `${currentRank.value.lp} LP`
    : `${currentRank.value.lp} / ${lpCap.value} LP`,
)

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
</script>

<style scoped>
.rank-hero {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.5vh, 18px);
  padding: clamp(14px, 2.2vh, 26px) clamp(18px, 2vw, 34px) clamp(12px, 1.8vh, 20px);
  background: #12100a;
  border: 1px solid;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #1d1710,
    0 10px 32px rgba(0, 0, 0, 0.6);
}

.hero-aura {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-topline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  pointer-events: none;
}

/* ── Emblem · rank name · LP tower ── */
.hero-core {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(16px, 2vw, 34px);
}

.rank-emblem {
  position: relative;
  width: clamp(84px, 12vh, 132px);
  height: clamp(84px, 12vh, 132px);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emblem-glow {
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  pointer-events: none;
}

.emblem-ring {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 2px solid;
  border-right-color: transparent !important;
  animation: emblem-spin 22s linear infinite;
}
.emblem-ring--counter {
  inset: -13px;
  border-width: 1px;
  border-left-color: transparent !important;
  animation-duration: 34s;
  animation-direction: reverse;
}

.emblem-img {
  position: relative;
  width: 90%;
  height: 90%;
  object-fit: contain;
}

.rank-identity {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 0.6vh, 8px);
}

.rank-kicker {
  font-size: clamp(9px, 1.15vh, 12px);
  font-weight: 700;
  letter-spacing: 5px;
  color: #8a7040;
}

.rank-name {
  font-size: clamp(30px, 5vh, 58px);
  font-weight: 700;
  letter-spacing: 3px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Tier ladder: Iron → Challenger, current tier lit ── */
.tier-ladder {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(4px, 0.7vw, 12px);
  padding: 0 clamp(8px, 1vw, 20px);
}

.tier-pip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(20px, 2.8vh, 32px);
  height: clamp(20px, 2.8vh, 32px);
  flex-shrink: 0;
}

.tier-pip-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.22;
  filter: grayscale(80%);
  transition:
    opacity 0.25s ease,
    filter 0.25s ease,
    transform 0.25s ease;
}
.tier-pip--cleared .tier-pip-img {
  opacity: 0.5;
  filter: grayscale(35%);
}
.tier-pip--current .tier-pip-img {
  opacity: 1;
  filter: none;
  transform: scale(1.5);
}

.lp-tower {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding-left: clamp(12px, 1.4vw, 24px);
  border-left: 1px solid #2b2312;
}

.lp-num {
  font-size: clamp(34px, 5.6vh, 66px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 1px;
}

.lp-unit {
  font-size: clamp(8px, 1.05vh, 11px);
  font-weight: 700;
  letter-spacing: 3px;
  color: #a08448;
}

/* ── LP progress ── */
.lp-block {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.7vh, 8px);
}

.lp-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.lp-meta-scale {
  font-size: clamp(9px, 1.2vh, 12px);
  font-weight: 700;
  letter-spacing: 2px;
  color: #b8ad92;
}

.lp-meta-goal {
  font-size: clamp(9px, 1.2vh, 12px);
  font-weight: 700;
  letter-spacing: 2px;
  color: #c8a058;
  white-space: nowrap;
}

.lp-track {
  position: relative;
  height: clamp(9px, 1.3vh, 14px);
  background: #0c0a06;
  border: 1px solid #2b2312;
  border-radius: 5px;
  overflow: hidden;
}

.lp-fill {
  position: relative;
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.lp-tip {
  position: absolute;
  top: -1px;
  right: 0;
  bottom: -1px;
  width: 2px;
}

@keyframes emblem-spin {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Full HD and flatter viewports: tighten the hero so roster and button keep room */
@media (max-height: 1100px) {
  .rank-hero {
    gap: 9px;
    padding: 12px 20px 10px;
  }
  .rank-emblem {
    width: 82px;
    height: 82px;
  }
  .rank-name {
    font-size: clamp(26px, 3.8vh, 40px);
  }
  .lp-num {
    font-size: clamp(30px, 4.4vh, 46px);
  }
}

@media (max-height: 880px) {
  .rank-emblem {
    width: 66px;
    height: 66px;
  }
  .rank-kicker {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .emblem-ring {
    animation: none;
  }
}
</style>
