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
        </div>

        <!-- LP progress toward the next rank: one gauge that carries its own
             reading. The colour ramp sits on the track, not on the fill, so a
             given LP value always wears the same shade; the scale strokes stand
             as a ruler along its foot (LP_METER_ZONES · LP_METER_TICKS_PER_ZONE),
             leaving the chamber above them to the count. -->
        <div class="lp-block">
          <div class="lp-track" :class="lpTrackClass" :style="lpTrackStyle">
            <!-- the lit part: clipped, never resized, so the ramp stays put -->
            <div class="lp-ink" :style="{ clipPath: lpInkClip }">
              <span class="ink-grain" />
              <span class="ink-sheen" />
            </div>

            <!-- scale strokes, light and heavy, rising toward the right -->
            <span
              v-for="tick in lpTicks"
              :key="tick.key"
              class="lp-tick"
              :class="{ 'lp-tick--major': tick.major, 'lp-tick--passed': tick.passed }"
              :style="tick.style"
              :title="tick.title"
            />

            <!-- leading edge -->
            <span v-if="lpPercent > 0" class="lp-head" :style="{ left: lpPercent + '%' }">
              <span class="head-halo" />
              <span class="head-blade" />
            </span>

            <!-- The reading, standing inside the gauge it belongs to. Two
                 congruent layers: the lower one lit, for the dark stretch of
                 track; the upper one dark ink, cut at the SAME edge that cuts
                 the ramp (lpInkClip) — so the glyphs flip colour exactly where
                 the fill passes beneath them and stay legible on either ground.
                 One source for that edge, no second reckoning to drift.
                 Pattern taken from header/UniverseRescueTrack.vue. -->
            <div class="lp-readout">
              <span class="lp-count">
                <span class="lp-num" :style="{ color: rankColor, textShadow: nameGlow }">
                  {{ currentRank.lp }}
                </span>
                <span v-if="!isChallenger" class="lp-of">/ {{ lpCap }}</span>
              </span>
              <span v-ink-center class="lp-unit">{{ lpCaption }}</span>
            </div>
            <div
              class="lp-readout lp-readout--on-fill"
              :style="{ clipPath: lpInkClip }"
              aria-hidden="true"
            >
              <span class="lp-count">
                <span class="lp-num">{{ currentRank.lp }}</span>
                <span v-if="!isChallenger" class="lp-of">/ {{ lpCap }}</span>
              </span>
              <span v-ink-center class="lp-unit">{{ lpCaption }}</span>
            </div>

            <span class="lp-plinth" :style="{ background: plinthBg }" />
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
            v-ink-center
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
import { useBattleStore } from '@/stores/battle/battleStore'
import RankStatColumn, { type RankStatGroup } from './RankStatColumn.vue'
import {
  LP_NORMAL_PROMOTION_THRESHOLD,
  LP_MASTER_PROMOTION_THRESHOLD,
  LP_GRANDMASTER_PROMOTION_THRESHOLD,
  LP_METER_ZONES,
  LP_METER_TICKS_PER_ZONE,
  LP_PROMOTION_IMMINENT_PCT,
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

/** Challenger has no cap above it, so its readout is a bare LP count. */
const isChallenger = computed(() => currentRank.value.tier === 'Challenger')

const lpCap = computed(() => {
  const tier = currentRank.value.tier
  if (tier === 'Master') return LP_MASTER_PROMOTION_THRESHOLD
  if (tier === 'Grandmaster') return LP_GRANDMASTER_PROMOTION_THRESHOLD
  return LP_NORMAL_PROMOTION_THRESHOLD
})

const lpPercent = computed(() => {
  if (isChallenger.value) return 100
  return Math.min(100, Math.max(0, (currentRank.value.lp / lpCap.value) * 100))
})

/** The meter can never come to rest at its cap for a normal tier — updateLP()
 *  promotes the instant the threshold is hit. So „nearly there" is the state
 *  that has to carry the promotion, and a genuinely full bar means Challenger. */
const isImminent = computed(
  () => !isChallenger.value && lpPercent.value >= LP_PROMOTION_IMMINENT_PCT,
)

const lpTrackClass = computed(() => ({
  'lp-track--imminent': isImminent.value,
  'lp-track--apex': isChallenger.value,
}))

/** The caption doubles as the state's own announcement — the frame changes
 *  colour, but only a word says what the colour means. */
const lpCaption = computed(() => {
  if (isChallenger.value) return 'APEX — NO CAP'
  if (isImminent.value) return 'PROMOTION IN REACH'
  return 'LEAGUE POINTS'
})

/** Everything about the meter that only moves when the rank colour changes —
 *  the zone shading of the empty track and the ramp the lit part is cut from.
 *  Both are laid out across the FULL track width: the fill is clipped, never
 *  scaled, so 60 LP always wears the shade that belongs to 60 LP. */
const lpTrackStyle = computed<Record<string, string>>(() => {
  const c = rankColor.value
  const n = LP_METER_ZONES
  // stepped shading of the empty track — the zones stay readable without labels
  const zones: string[] = []
  for (let i = 0; i < n; i++) {
    const a = 0.018 + (n > 1 ? i / (n - 1) : 1) * 0.05
    zones.push(
      `rgba(255, 240, 200, ${a.toFixed(3)}) ${((i / n) * 100).toFixed(2)}% ${(((i + 1) / n) * 100).toFixed(2)}%`,
    )
  }
  return {
    '--lp-accent': c,
    '--lp-accent-soft': withAlpha(c, 0.45),
    '--lp-zones': `linear-gradient(to right, ${zones.join(', ')})`,
    // horizontal heat ramp × vertical volume — the further right, the hotter
    '--lp-ramp':
      `linear-gradient(to right, ${withAlpha(c, 0.34)}, ${withAlpha(c, 0.62)} 46%, ${withAlpha(c, 1)}),` +
      ` linear-gradient(to bottom, rgba(0, 0, 0, 0.42), rgba(255, 248, 222, 0.16) 48%, rgba(0, 0, 0, 0.5))`,
    '--lp-glow': `0 0 clamp(6px, 1cqh, 13px) ${withAlpha(c, 0.7)}`,
    '--lp-halo': `radial-gradient(circle, ${withAlpha(c, 0.55)}, transparent 70%)`,
  }
})

/** Right-hand cut of the lit part. `inset()` is a plain rectangle, so the
 *  clip stays cheap and the transition can run on it. */
const lpInkClip = computed(() => `inset(0 ${(100 - lpPercent.value).toFixed(2)}% 0 0)`)

interface LpTick {
  key: string
  major: boolean
  passed: boolean
  title: string
  style: Record<string, string>
}

/** The scale itself. Strokes stand on the plinth as a ruler along the foot of
 *  the gauge — light ones inside a zone, heavy ones on every zone edge. They
 *  are kept SHORT (a fifth of the track at most) because the chamber above them
 *  now holds the count; the escalation toward promotion is carried by their
 *  width and their light instead of by their height. */
const lpTicks = computed<LpTick[]>(() => {
  const steps = LP_METER_ZONES * LP_METER_TICKS_PER_ZONE
  const capped = isChallenger.value
  const ticks: LpTick[] = []
  // no stroke at 0 or at the far end — the track's own frame stands there
  for (let k = 1; k < steps; k++) {
    const t = k / steps
    const major = k % LP_METER_TICKS_PER_ZONE === 0
    const lp = Math.round(t * lpCap.value)
    ticks.push({
      key: `t${k}`,
      major,
      passed: lpPercent.value / 100 >= t,
      title: capped ? '' : `${lp} LP`,
      style: {
        left: `${(t * 100).toFixed(3)}%`,
        '--tick-h': major ? `${(13 + t * 7).toFixed(1)}%` : `${(9 + t * 5).toFixed(1)}%`,
        '--tick-w': major ? `${(2 + t * 1.6).toFixed(1)}px` : '1px',
        // ahead of the fill: a lit mark, brighter the closer to promotion
        '--tick-dim': `rgba(255, 240, 200, ${(major ? 0.16 + t * 0.3 : 0.075 + t * 0.155).toFixed(3)})`,
        // behind the fill: a notch, its right edge catching the rank colour
        '--tick-lit': withAlpha(rankColor.value, major ? 0.5 + t * 0.5 : 0.28 + t * 0.42),
      },
    })
  }
  return ticks
})

/** The rail the strokes stand on — dark at the start, rank-coloured at the end. */
const plinthBg = computed(
  () => `linear-gradient(to right, #241c0f, ${rankColorDeep.value} 55%, ${rankColor.value})`,
)
</script>

<style scoped>
.rank-hero {
  position: relative;
  /* lives on whatever the roster leaves over — every block inside is sized in
     cqh so the band genuinely compresses instead of clipping its own content */
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.5cqh, 20px);
  padding: clamp(8px, 2cqh, 24px) clamp(18px, 2vw, 34px) clamp(8px, 1.7cqh, 20px);
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
  min-height: 0;
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
  gap: clamp(5px, 1.3cqh, 16px);
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

.rank-emblem {
  position: relative;
  width: clamp(52px, 11cqh, 132px);
  height: clamp(52px, 11cqh, 132px);
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
  font-size: clamp(22px, 4.6cqh, 54px);
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
  --pip: clamp(30px, 6.8cqh, 92px);
  --rail-gap: clamp(4px, 0.8cqh, 11px);
  --pip-head: clamp(6px, 1.4cqh, 22px);
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
  font-size: clamp(8px, 1.1cqh, 13px);
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
  font-size: clamp(9px, 1.15cqh, 13px);
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

/* ── The reading, inside the gauge ──
   Two congruent layers, so the count survives whatever ground the fill puts
   under it: the base one lit for the dark track, the twin dark and clipped at
   the fill edge. Both cover the whole track and centre in the chamber ABOVE the
   foot rail (--lp-rail) — centring in the plain middle of the box would drop
   the caption onto the scale strokes. */
.lp-readout {
  position: absolute;
  inset: 0;
  /* NOT a percentage: percentage padding resolves against the WIDTH, and this
     track is ~750 px wide — `20%` came out as 150 px of padding and shoved the
     count clean out through the top of the bar. */
  padding-bottom: var(--lp-rail);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  pointer-events: none;
}

/* The dark twin: same geometry, inverted ink, cut at the fill edge. Its
   transition matches the ramp's exactly, so glyphs and fill flip as one. */
.lp-readout--on-fill {
  transition: clip-path 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-readout--on-fill .lp-num {
  color: #0b0904;
  text-shadow: 0 1px 0 rgba(255, 248, 222, 0.3);
}
.lp-readout--on-fill .lp-of {
  color: rgba(14, 10, 4, 0.8);
}
.lp-readout--on-fill .lp-unit {
  color: rgba(14, 10, 4, 0.82);
}

.lp-count {
  display: flex;
  align-items: baseline;
  gap: clamp(5px, 0.7vw, 11px);
}

.lp-num {
  font-size: clamp(21px, 4.2cqh, 54px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 1px;
  /* fixed digit widths — the two layers have to stay congruent while LP counts */
  font-variant-numeric: tabular-nums;
}

/* The scale's far end, kept a step behind the count itself */
.lp-of {
  font-size: clamp(11px, 1.9cqh, 23px);
  font-weight: 700;
  letter-spacing: 1px;
  color: #8a7444;
  font-variant-numeric: tabular-nums;
}

.lp-unit {
  font-size: clamp(7px, 0.95cqh, 11px);
  font-weight: 700;
  letter-spacing: 3px;
  color: #a08448;
  white-space: nowrap;
}

/* Promotion states speak through the caption too — a frame that changes colour
   without a word next to it does not say what the colour means. */
.lp-track--imminent .lp-readout:not(.lp-readout--on-fill) .lp-unit,
.lp-track--apex .lp-readout:not(.lp-readout--on-fill) .lp-unit {
  color: var(--lp-accent);
}

/* ── LP progress ── */
.lp-block {
  position: relative;
  width: 100%;
}

/* ── LP meter: one gauge, carrying its own reading ──
   The lit part is a heat ramp spanning the whole track that gets CLIPPED, never
   scaled — so the shade at 60 LP is the shade of 60 LP whatever the fill does.
   Every escalating layer (zone shading, ramp, stroke width, stroke light) is a
   static gradient set once per rank change; only the head halo and the sheen
   animate, and both move on opacity/transform alone. */
.lp-track {
  --track-h: clamp(52px, 9.2cqh, 112px);
  /* The foot rail the scale strokes stand in; the reading centres above it.
     A shade taller than the tallest stroke (20 % of the track, see lpTicks) so
     the caption keeps clear of the scale. Derived from --track-h, so the two
     compact tiers below inherit the proportion by setting the height alone. */
  --lp-rail: calc(var(--track-h) * 0.26);
  position: relative;
  height: var(--track-h);
  background:
    var(--lp-zones),
    linear-gradient(to bottom, rgba(16, 14, 9, 0.92), rgba(6, 5, 3, 0.95));
  border: 1px solid #2b2312;
  border-radius: 5px;
  /* chamfer: gold hairline inside the frame, then depth. All static — the only
     thing that moves here is the one-off switch into a promotion state. */
  box-shadow:
    inset 0 0 0 1px rgba(232, 192, 64, 0.1),
    inset 0 2px 3px rgba(0, 0, 0, 0.8),
    inset 0 0 16px rgba(0, 0, 0, 0.68);
  overflow: hidden;
  transition:
    border-color 0.4s ease,
    box-shadow 0.4s ease;
}

/* Promotion in reach, and the apex above it: the frame takes the rank's own
   colour. Reachable states — the meter never rests at the cap for a normal
   tier, so a rule pinned to 100 % would only ever fire for Challenger. */
.lp-track--imminent,
.lp-track--apex {
  border-color: var(--lp-accent);
  box-shadow:
    inset 0 0 0 1px var(--lp-accent-soft),
    inset 0 2px 3px rgba(0, 0, 0, 0.8),
    inset 0 0 22px rgba(0, 0, 0, 0.6);
}

/* Gate posts: a mark at 0 LP and one at the cap, so the scale has a visible
   start and end. One overlay, no extra elements — ::after is the last child,
   so it lands over track, ramp and strokes alike. */
.lp-track::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
        to bottom,
        transparent,
        rgba(255, 240, 200, 0.24) 20%,
        rgba(255, 240, 200, 0.24) 80%,
        transparent
      )
      left / 2px 100% no-repeat,
    linear-gradient(
        to bottom,
        transparent,
        var(--lp-accent-soft) 16%,
        var(--lp-accent-soft) 84%,
        transparent
      )
      right / 2px 100% no-repeat;
}

.lp-ink {
  position: absolute;
  inset: 0;
  background: var(--lp-ramp);
  transition: clip-path 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ribbing that thickens toward promotion — the mask does the escalating, so
   one static gradient covers the whole ramp. Kept lighter than it used to be:
   the count now sits over this stretch and the ribbing was eating its edges. */
.ink-grain {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    114deg,
    rgba(255, 246, 220, 0.3) 0 2px,
    transparent 2px 9px
  );
  -webkit-mask-image: linear-gradient(to right, transparent, #000);
  mask-image: linear-gradient(to right, transparent, #000);
  opacity: 0.26;
  pointer-events: none;
}

/* Light running along the lit stretch — clipped away outside it */
.ink-sheen {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 20%;
  background: linear-gradient(to right, transparent, rgba(255, 248, 222, 0.28), transparent);
  transform: translateX(-130%);
  animation: lp-ink-sheen 3.6s ease-in-out infinite;
  pointer-events: none;
}

/* ── The scale ──
   Strokes stand on the plinth and grow toward promotion: light ones inside a
   zone, heavy ones on a zone edge. Ahead of the fill they read as lit marks on
   a dark trough, behind it as notches cut into the ramp — so the scale stays
   legible on either ground. */
.lp-tick {
  position: absolute;
  bottom: 2px;
  width: var(--tick-w);
  height: var(--tick-h);
  margin-left: calc(var(--tick-w) / -2);
  border-radius: 1px;
  background: var(--tick-dim);
  pointer-events: none;
  transition:
    background 0.4s ease,
    box-shadow 0.4s ease;
}
.lp-tick--major {
  border-radius: 2px;
}
.lp-tick--passed {
  background: rgba(6, 4, 2, 0.5);
  box-shadow: 1px 0 0 var(--tick-lit);
}

/* ── Leading edge ── */
.lp-head {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  pointer-events: none;
  transition: left 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}

.head-blade {
  /* grows with the taller gauge, so the edge keeps its weight against the frame */
  --blade-w: clamp(3px, 0.45cqh, 5px);
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--blade-w);
  left: calc(var(--blade-w) / -2);
  border-radius: 2px;
  background: linear-gradient(to bottom, #fff8e0, var(--lp-accent) 52%, #fff8e0);
  box-shadow: var(--lp-glow);
}

.head-halo {
  position: absolute;
  top: 50%;
  left: 0;
  width: clamp(20px, 3.4cqh, 42px);
  height: clamp(20px, 3.4cqh, 42px);
  transform: translate(-50%, -50%);
  background: var(--lp-halo);
  opacity: 0.45;
  animation: lp-head-breathe 2.9s ease-in-out infinite;
}

/* Floor of the bar — dark at 0 LP, rank-coloured at the cap. Drawn last so it
   runs unbroken across lit and unlit stretches alike. */
.lp-plinth {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  pointer-events: none;
}

@keyframes lp-ink-sheen {
  0% {
    transform: translateX(-130%);
  }
  60%,
  100% {
    transform: translateX(520%);
  }
}

@keyframes lp-head-breathe {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.85;
  }
}

@keyframes emblem-spin {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Flat stages (Full HD and below): tighten the hero so roster and button keep
   room. Measured against the modal's content box, not the window — see
   .landing-root in BattleLandingScreen.vue. */
@container landing (max-height: 780px) {
  .rank-hero {
    padding: 10px 20px 9px;
    gap: 8px;
  }
  .hero-column {
    gap: 7px;
  }
  .rank-emblem {
    width: 72px;
    height: 72px;
  }
  .rank-name {
    font-size: clamp(24px, 3.8cqh, 40px);
  }
  .lp-num {
    font-size: clamp(26px, 4cqh, 38px);
  }
  /* Taller than the 40 px it was, because the count now lives inside — but the
     LP block as a whole still shrinks: bar plus separate readout used to run to
     about 91 px here, this is 68. */
  .lp-track {
    --track-h: 68px;
  }
  .tier-ladder {
    --pip: 44px;
    --pip-head: 8px;
    --rail-gap: 5px;
  }
  /* the tallest major tick shrinks with the rail, so the caption may move up */
  .ladder-step {
    gap: calc(var(--rail-gap) * 2 + 9px);
  }
}

/* MacBook-class stages (13"/14" laptops): the band gives up the last of its
   ornament — crest row and emblem shrink, the "first reached" dates step back —
   so the five champion cards still get a card-shaped tile. */
@container landing (max-height: 620px) {
  .rank-hero {
    padding: 8px 16px 7px;
    gap: 6px;
  }
  .hero-column {
    gap: 5px;
  }
  .rank-emblem {
    width: 58px;
    height: 58px;
  }
  .rank-name {
    font-size: 24px;
    letter-spacing: 2px;
  }
  .lp-num {
    font-size: 22px;
  }
  .lp-of {
    font-size: 11px;
  }
  /* was 30 px plus a ~46 px readout under it; one 56 px gauge instead */
  .lp-track {
    --track-h: 56px;
  }
  .tier-ladder {
    --pip: 32px;
    --pip-head: 6px;
    --rail-gap: 4px;
  }
  .ladder-step {
    gap: calc(var(--rail-gap) * 2 + 7px);
  }
  .tier-label {
    font-size: 8px;
    letter-spacing: 0.5px;
  }
  .tier-date {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .emblem-ring,
  .ladder-step--apex .pip-halo,
  .head-halo {
    animation: none;
  }
  .ink-sheen {
    animation: none;
    opacity: 0;
  }
}
</style>
