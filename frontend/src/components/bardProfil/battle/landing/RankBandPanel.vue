<template>
  <!-- Hero #1 of the landing stage: rank identity and LP, the biggest thing on screen -->
  <div class="rank-hero" :style="{ borderColor: rankColorDim }">
    <div class="hero-aura" :style="{ background: auraBg }" />
    <div class="hero-topline" :style="{ background: toplineBg }" />

    <!-- Everything lives in one centred column so the band never reads as a
         stretched-out strip on wide screens. -->
    <div class="hero-column">
      <span class="rank-kicker">RANKED LADDER</span>

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

        <div class="rank-name" :style="{ color: rankColor, textShadow: nameGlow }">
          {{ rankTitle }}
        </div>

        <div class="core-divider" :style="{ background: dividerBg }" />

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
            <span
              class="lp-tip"
              :style="{ background: rankColor, boxShadow: `0 0 10px ${rankColor}` }"
            />
          </div>
        </div>
      </div>

      <!-- Full tier ladder — shows at a glance how far the climb still goes -->
      <div class="tier-ladder">
        <span class="ladder-end">IRON</span>
        <div class="ladder-track">
          <span class="ladder-line" />
          <span
            class="ladder-line ladder-line--done"
            :style="{ width: ladderDonePercent + '%', background: rankColorDeep }"
          />
          <span
            v-for="(tier, i) in RANK_TIERS"
            :key="tier"
            class="tier-pip"
            :class="{
              'tier-pip--current': i === currentTierIndex,
              'tier-pip--cleared': i < currentTierIndex,
            }"
            :style="i === currentTierIndex ? { borderColor: rankColor, boxShadow: pipGlow } : undefined"
            :title="tier"
          >
            <img :src="RANK_EMBLEM_IMAGES[tier]" :alt="tier" class="tier-pip-img" />
          </span>
        </div>
        <span class="ladder-end">CHALLENGER</span>
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
const dividerBg = computed(
  () => `linear-gradient(to bottom, transparent, ${rankColor.value}66, transparent)`,
)
const pipGlow = computed(() => `0 0 14px ${rankColor.value}80`)

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

/** Filled portion of the ladder track — pips sit at even fractions of its width. */
const ladderDonePercent = computed(
  () => (Math.max(0, currentTierIndex.value) / (RANK_TIERS.length - 1)) * 100,
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
  padding: clamp(13px, 2vh, 24px) clamp(18px, 2vw, 34px) clamp(11px, 1.7vh, 20px);
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

/* ── Centred column: the band stays a compact hero, not a wide strip ── */
.hero-column {
  position: relative;
  width: 100%;
  max-width: clamp(520px, 70vw, 1200px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(9px, 1.3vh, 16px);
}

/* ── Emblem · rank name · LP tower, as one centred cluster ── */
.hero-core {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(14px, 1.6vw, 26px);
  max-width: 100%;
}

.core-divider {
  align-self: stretch;
  width: 1px;
  flex-shrink: 0;
  margin: clamp(4px, 0.6vh, 8px) 0;
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

.rank-kicker {
  font-size: clamp(9px, 1.15vh, 12px);
  font-weight: 700;
  letter-spacing: 6px;
  color: #8a7040;
}

.rank-name {
  min-width: 0;
  font-size: clamp(28px, 4.6vh, 54px);
  font-weight: 700;
  letter-spacing: 3px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Tier ladder: Iron → Challenger on a connected track ── */
.tier-ladder {
  width: 100%;
  display: flex;
  align-items: center;
  gap: clamp(6px, 0.7vw, 12px);
}

.ladder-end {
  flex-shrink: 0;
  font-size: clamp(7px, 0.9vh, 9px);
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #6a5a38;
}

.ladder-track {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ladder-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  margin-top: -1px;
  background: #241d10;
  border-radius: 4px;
}
.ladder-line--done {
  right: auto;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.tier-pip {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(19px, 2.5vh, 28px);
  height: clamp(19px, 2.5vh, 28px);
  flex-shrink: 0;
  background: #0c0a06;
  border: 1px solid #241d10;
  border-radius: 50%;
  transition:
    transform 0.25s ease,
    border-color 0.25s ease;
}
.tier-pip--current {
  transform: scale(1.35);
}

.tier-pip-img {
  width: 78%;
  height: 78%;
  object-fit: contain;
  opacity: 0.24;
  filter: grayscale(80%);
  transition:
    opacity 0.25s ease,
    filter 0.25s ease;
}
.tier-pip--cleared .tier-pip-img {
  opacity: 0.55;
  filter: grayscale(30%);
}
.tier-pip--current .tier-pip-img {
  opacity: 1;
  filter: none;
}

.lp-tower {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
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
  width: 100%;
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
    padding: 11px 20px 10px;
  }
  .hero-column {
    gap: 8px;
  }
  .rank-emblem {
    width: 76px;
    height: 76px;
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
    width: 62px;
    height: 62px;
  }
  .rank-kicker,
  .ladder-end {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .emblem-ring {
    animation: none;
  }
}
</style>
