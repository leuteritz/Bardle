<template>
  <!-- Hero #1 of the landing stage: rank identity and LP, the biggest thing on screen -->
  <div class="rank-hero" :style="{ borderColor: rankColorDim }">
    <div class="hero-aura" :style="{ background: auraBg }" />
    <div class="hero-topline" :style="{ background: toplineBg }" />

    <div class="hero-main">
      <!-- Headline career numbers flank the rank, which stays centred. -->
      <RankStatColumn class="hero-flank" :group="leftGroup" align="left" />

      <div class="hero-column">
        <div class="hero-core">
          <div class="rank-emblem">
            <div class="emblem-glow" :style="{ background: emblemGlowBg }" />
            <div class="emblem-ring" :style="{ borderColor: rankColorDim }" />
            <div
              class="emblem-ring emblem-ring--counter"
              :style="{ borderColor: rankColorFaint }"
            />
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
      </div>

      <RankStatColumn class="hero-flank" :group="rightGroup" align="right" />
    </div>

    <!-- Tier ladder — the whole climb from Iron to Challenger. Spans the full
         band width so the crests can be shown large; they stand on a rail whose
         cleared stretch is tinted in the current tier's colour. -->
    <div class="tier-ladder">
      <span class="ladder-line" />
      <span
        class="ladder-line ladder-line--done"
        :style="{
          width: ladderDonePercent + '%',
          background: `linear-gradient(to right, ${rankColorDeep}, ${rankColor})`,
          boxShadow: railGlow,
        }"
      />

      <!-- Division milestones inside each tier (…IV → III → II → I), so the rail
           advances between the crests instead of jumping a whole tier at a time -->
      <span
        v-for="tick in divisionTicks"
        :key="tick.key"
        class="division-tick"
        :class="{ 'division-tick--reached': tick.reached }"
        :style="{
          left: tick.left + '%',
          ...(tick.reached ? { background: rankColor, boxShadow: tickGlow } : {}),
        }"
        :title="tick.title"
      />
      <div
        v-for="(tier, i) in RANK_TIERS"
        :key="tier"
        class="ladder-step"
        :class="{
          'ladder-step--current': i === currentTierIndex,
          'ladder-step--cleared': i < currentTierIndex,
          'ladder-step--apex': i >= apexFromIndex,
        }"
        :style="stepStyle(i)"
        :title="tier"
      >
        <!-- Major tick under the crest — thicker and brighter the higher the tier -->
        <span class="tier-mark" />

        <span class="tier-pip">
          <span class="pip-halo" />
          <img :src="RANK_EMBLEM_IMAGES[tier]" :alt="tier" class="tier-pip-img" />
        </span>
        <span class="step-caption">
          <span
            class="tier-label"
            :style="i === currentTierIndex ? { color: rankColor } : undefined"
          >
            {{ tier.toUpperCase() }}
          </span>
          <span class="tier-date">{{ reachedOn(tier) }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import RankStatColumn, { type RankStatGroup } from './RankStatColumn.vue'
import {
  LP_NORMAL_PROMOTION_THRESHOLD,
  LP_MASTER_PROMOTION_THRESHOLD,
  LP_GRANDMASTER_PROMOTION_THRESHOLD,
  RANK_TIERS,
  RANK_DIVISIONS,
  RANK_EMBLEM_IMAGES,
  RANK_TIER_COLORS,
} from '@/config/constants'

defineProps<{
  leftGroup: RankStatGroup
  rightGroup: RankStatGroup
}>()

const battleStore = useBattleStore()
const { currentRank, tierReachedAt } = storeToRefs(battleStore)

/** Date the player first climbed onto a tier — blank while it is still locked. */
function reachedOn(tier: string): string {
  const ts = tierReachedAt.value[tier]
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

const rankImage = computed(
  () => RANK_EMBLEM_IMAGES[currentRank.value.tier] ?? RANK_EMBLEM_IMAGES.Iron,
)
const rankColor = computed(() => RANK_TIER_COLORS[currentRank.value.tier] ?? '#d4a020')
const rankColorDim = computed(() => rankColor.value + '55')
const rankColorFaint = computed(() => rankColor.value + '22')
const rankColorDeep = computed(() => rankColor.value + '66')

const auraBg = computed(
  () =>
    `radial-gradient(ellipse at 50% 120%, ${rankColor.value}22, transparent 68%),` +
    ` radial-gradient(ellipse at 12% 0%, ${rankColor.value}17, transparent 60%)`,
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
const railGlow = computed(() => `0 0 12px ${rankColor.value}80`)
const tickGlow = computed(() => `0 0 6px ${rankColor.value}99`)

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

// Ladder geometry: every tier owns an equal slice of the ladder width and its
// crest sits in the middle of that slice, so the rail runs from half a slice in
// on the left to half a slice in on the right.
const ladderStepPct = 100 / RANK_TIERS.length
const railStartPct = ladderStepPct / 2

/** How far into the current tier the player stands, 0…1. Divisions and the LP
 *  inside them are both counted, so the rail creeps forward with every win —
 *  the apex tiers have no divisions and go by their own LP threshold. */
const tierFraction = computed(() => {
  const { tier, division, lp } = currentRank.value
  if (tier === 'Challenger') return 1
  if (tier === 'Master') return Math.min(1, lp / LP_MASTER_PROMOTION_THRESHOLD)
  if (tier === 'Grandmaster') return Math.min(1, lp / LP_GRANDMASTER_PROMOTION_THRESHOLD)
  const divIdx = Math.max(0, RANK_DIVISIONS.indexOf(division as (typeof RANK_DIVISIONS)[number]))
  const perTier = RANK_DIVISIONS.length * LP_NORMAL_PROMOTION_THRESHOLD
  return Math.min(1, (divIdx * LP_NORMAL_PROMOTION_THRESHOLD + lp) / perTier)
})

/** Progress along the whole ladder in tier units (e.g. 5.5 = halfway Emerald). */
const ladderProgress = computed(
  () => Math.max(0, currentTierIndex.value) + tierFraction.value,
)

/** Filled length of the rail as a percentage of the ladder width. The rail runs
 *  edge to edge, so the fill starts left of Iron and reaches past Challenger. */
const ladderDonePercent = computed(() =>
  Math.min(100, railStartPct + ladderProgress.value * ladderStepPct),
)

/** Master and up — the tiers that get the loudest treatment. */
const apexFromIndex = RANK_TIERS.indexOf('Master')

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
  return hex + a.toString(16).padStart(2, '0')
}

/** Per-tier escalation: the further right a crest sits, the larger it stands,
 *  the wider its aura and the harder it glows — the ladder should read as a
 *  climb toward something grander, not ten equal icons. Tiers already earned
 *  burn brighter than the ones still locked. */
function stepStyle(i: number): Record<string, string> {
  const color = RANK_TIER_COLORS[RANK_TIERS[i]] ?? '#d4a020'
  const t = i / (RANK_TIERS.length - 1) // 0 at Iron … 1 at Challenger
  const earned = i <= currentTierIndex.value
  const halo = earned ? 0.09 + t * 0.3 : 0.03 + t * 0.13
  const glow = earned ? 4 + t * 13 : 2 + t * 7
  return {
    '--tier-accent': color,
    '--tier-scale': (0.8 + t * 0.28).toFixed(3),
    '--tier-halo': `radial-gradient(circle, ${withAlpha(color, halo)}, transparent 70%)`,
    '--tier-glow': `drop-shadow(0 0 ${glow.toFixed(1)}px ${withAlpha(color, earned ? 0.75 : 0.3)})`,
    // major tick on the rail: taller, thicker and hotter toward Challenger
    '--mark-h': `${(12 + t * 11).toFixed(1)}px`,
    '--mark-w': `${(2 + t * 2).toFixed(1)}px`,
    '--mark-bg': earned ? color : withAlpha(color, 0.3),
    '--mark-glow': earned ? `0 0 ${(4 + t * 9).toFixed(1)}px ${withAlpha(color, 0.8)}` : 'none',
  }
}

interface DivisionTick {
  key: string
  left: number
  reached: boolean
  title: string
}

/** One tick per division promotion inside a tier (III, II, I — IV is the tier's
 *  own crest). Master and above have no divisions, so they get no ticks. */
const divisionTicks = computed<DivisionTick[]>(() => {
  const ticks: DivisionTick[] = []
  const dividedTiers = RANK_TIERS.indexOf('Master')
  for (let t = 0; t < dividedTiers; t++) {
    for (let d = 1; d < RANK_DIVISIONS.length; d++) {
      const at = t + d / RANK_DIVISIONS.length
      ticks.push({
        key: `${RANK_TIERS[t]}-${RANK_DIVISIONS[d]}`,
        left: railStartPct + at * ladderStepPct,
        reached: ladderProgress.value >= at,
        title: `${RANK_TIERS[t]} ${RANK_DIVISIONS[d]}`,
      })
    }
  }
  return ticks
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
  /* grows into whatever height the capped roster leaves over, so the flanks and
     the tier ladder get more air on tall screens instead of stretching cards */
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.5vh, 20px);
  padding: clamp(13px, 2vh, 24px) clamp(18px, 2vw, 34px) clamp(11px, 1.7vh, 20px);
  /* translucent so the cosmic starfield reads straight through the band */
  background: rgba(14, 12, 7, 0.42);
  border: 1px solid;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px rgba(29, 23, 16, 0.7),
    0 10px 32px rgba(0, 0, 0, 0.45);
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

/* ── Upper row: flank · rank · flank ── */
.hero-main {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: clamp(14px, 1.6vw, 30px);
}

/* ── Flanks: headline career numbers left and right of the rank ── */
.hero-flank {
  position: relative;
  z-index: 1;
  flex: 0 0 clamp(126px, 10.5vw, 200px);
  min-width: 0;
}

/* ── Centred column: rank, LP and the tier ladder ── */
.hero-column {
  position: relative;
  flex: 1;
  min-width: 0;
  max-width: clamp(420px, 56vw, 980px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

/* ── Tier ladder: the crests stand on a shared rail, unframed and large. Ten
   equal steps, so every crest centre lands on 5% + k·10% of the width. ── */
.tier-ladder {
  --pip: clamp(46px, 6.4vh, 92px);
  --rail-gap: clamp(6px, 0.8vh, 11px);
  --pip-head: clamp(10px, 1.5vh, 22px);
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 100%;
  display: flex;
  align-items: flex-start;
  /* headroom for the enlarged current crest, which grows upward off the rail */
  padding-top: var(--pip-head);
  border-top: 1px solid #2b2312;
}

/* The rail runs the full band width and softens at both ends, so it reads as a
   beam passing through the ladder rather than a bar that starts at Iron. */
.ladder-line {
  position: absolute;
  top: calc(var(--pip-head) + var(--pip) + var(--rail-gap));
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(to right, #221b0f, #3a2f1c);
  border-radius: 4px;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
}
/* Only the tail fades — the head of the fill stays a crisp, lit edge */
.ladder-line--done {
  right: auto;
  height: 3px;
  margin-top: -0.5px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 44px, #000 100%);
  mask-image: linear-gradient(to right, transparent, #000 44px, #000 100%);
}

/* Division milestones: short notches across the rail, lit once passed */
.division-tick {
  position: absolute;
  top: calc(var(--pip-head) + var(--pip) + var(--rail-gap) - 4px);
  width: 2px;
  height: 10px;
  margin-left: -1px;
  background: #3a2f1c;
  border-radius: 2px;
  transition:
    background 0.35s ease,
    box-shadow 0.35s ease;
}
.division-tick--reached {
  height: 12px;
  top: calc(var(--pip-head) + var(--pip) + var(--rail-gap) - 5px);
}

.ladder-step {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* the rail runs through this gap, so the crest appears to stand on it; the
     extra 12px keeps the tallest major tick clear of the caption */
  gap: calc(var(--rail-gap) * 2 + 12px);
}

/* Major tick: the crest's own mark on the rail, scaling with the tier.
   The step box already starts below the ladder's padding, so the rail sits at
   pip + rail-gap inside it — no --pip-head in this offset. */
.tier-mark {
  position: absolute;
  left: 50%;
  top: calc(var(--pip) + var(--rail-gap) + 1px - var(--mark-h) / 2);
  width: var(--mark-w);
  height: var(--mark-h);
  margin-left: calc(var(--mark-w) / -2);
  background: var(--mark-bg);
  box-shadow: var(--mark-glow);
  border-radius: 2px;
  transition:
    background 0.35s ease,
    box-shadow 0.35s ease;
}

.tier-pip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--pip);
  height: var(--pip);
  flex-shrink: 0;
  /* grows up from the rail instead of sinking through it */
  transform-origin: bottom center;
  /* later tiers stand taller than earlier ones — see stepStyle() */
  transform: scale(var(--tier-scale, 1));
  transition: transform 0.25s ease;
}
.ladder-step--current .tier-pip {
  transform: scale(calc(var(--tier-scale, 1) * 1.22));
}

.pip-halo {
  position: absolute;
  inset: -26%;
  border-radius: 50%;
  background: var(--tier-halo);
  pointer-events: none;
}
/* Master and up keep a slow breathing aura, so the top of the ladder never
   looks quite as inert as the tiers below it */
.ladder-step--apex .pip-halo {
  animation: apex-breathe 4.5s ease-in-out infinite;
}
.ladder-step--current .pip-halo {
  inset: -34%;
}

.tier-pip-img {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.3;
  filter: grayscale(85%) brightness(0.6) var(--tier-glow);
  transition:
    opacity 0.25s ease,
    filter 0.25s ease;
}
.ladder-step--cleared .tier-pip-img {
  opacity: 0.85;
  filter: grayscale(8%) var(--tier-glow);
}
.ladder-step--current .tier-pip-img {
  opacity: 1;
  filter: var(--tier-glow);
}

@keyframes apex-breathe {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.94);
  }
  50% {
    opacity: 1;
    transform: scale(1.06);
  }
}

/* Name + date form one caption block, so the rail gap stays between crest and
   caption instead of splitting the two lines apart. */
.step-caption {
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.tier-label {
  max-width: 100%;
  font-size: clamp(8px, 1.1vh, 13px);
  font-weight: 700;
  letter-spacing: 1.2px;
  color: #5c4d30;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.25s ease;
}
/* Earned tiers wear their own colour — the passed stretch of the ladder reads
   as a bronze → silver → gold → … gradient at a glance */
.ladder-step--cleared .tier-label {
  color: var(--tier-accent);
  opacity: 0.82;
}
.ladder-step--current .tier-label {
  letter-spacing: 2.2px;
}
/* Even locked, the apex tiers carry a hint of their colour */
.ladder-step--apex .tier-label {
  color: color-mix(in srgb, var(--tier-accent) 45%, #5c4d30);
}
.ladder-step--apex.ladder-step--cleared .tier-label {
  color: var(--tier-accent);
}

/* Date the tier was first reached — quiet, a caption under its name */
.tier-date {
  max-width: 100%;
  margin-top: 2px;
  font-size: clamp(9px, 1.15vh, 13px);
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #6a5a38;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ladder-step--cleared .tier-date {
  color: #b09660;
}
.ladder-step--current .tier-date {
  color: #e8c040;
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
  background: rgba(12, 10, 6, 0.72);
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
  .tier-ladder {
    --pip: 54px;
    --pip-head: 10px;
    --rail-gap: 7px;
  }
}

@media (max-height: 880px) {
  .rank-emblem {
    width: 62px;
    height: 62px;
  }
  .tier-label {
    font-size: 7px;
    letter-spacing: 0.5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .emblem-ring,
  .ladder-step--apex .pip-halo {
    animation: none;
  }
}
</style>
