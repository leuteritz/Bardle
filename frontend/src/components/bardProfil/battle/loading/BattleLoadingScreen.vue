<template>
  <!-- ══ PHASE · LOADING ══
       The lobby between "planet found" and the first game-second: both line-ups
       face off, every champion summons itself in, and the phase clock in the
       header states exactly when the rift opens. Purely presentational — the
       phase runs on timestamps in battleStore and ends without this screen. -->
  <div class="loading-screen">
    <CosmicStageBackground />
    <div class="stage-vignette" />

    <!-- ── Header: what is happening and how long it still takes ── -->
    <div class="load-head layer">
      <span class="head-rule" />
      <div class="head-badge">
        <Icon
          :icon="BATTLE_PHASES.loading.icon ?? ''"
          width="32"
          height="32"
          class="head-icon"
        />
        <span class="head-title">CHAMPION SUMMONING</span>
        <span class="head-dot">·</span>
        <span class="head-match">MATCH #{{ battleStore.currentBattleId }}</span>
      </div>
      <span class="head-rule" />
      <div class="head-clock">
        <span class="clock-value">{{ remainingSeconds }}</span>
        <span class="clock-unit">S</span>
      </div>
    </div>

    <div class="head-track layer">
      <div class="head-fill" :style="{ '--fill': Math.round(progress * 100) / 100 }" />
    </div>

    <!-- ── Blue side: the player's squad ── -->
    <section class="team-block layer">
      <header class="team-head team-head--blue">
        <Icon icon="game-icons:helmet" width="24" height="24" class="team-icon" />
        <span class="team-name">YOUR TEAM</span>
        <div class="team-chips">
          <span v-for="chip in blueChips" :key="chip.label" class="team-chip">
            <span class="chip-label">{{ chip.label }}</span>
            <span class="chip-value" :style="chip.color ? { color: chip.color } : undefined">
              {{ chip.value }}
            </span>
          </span>
        </div>
      </header>
      <div class="team-row">
        <LoadingChampionCard
          v-for="(card, idx) in blueCards"
          :key="`blue-${idx}-${card.name}`"
          :card="card"
          side="blue"
          :percent="percentFor('blue', idx)"
        />
      </div>
    </section>

    <!-- ── The face-off: match odds between the two rows ── -->
    <div class="vs-band layer">
      <div class="odds-side odds-side--blue">
        <span class="odds-label">VICTORY CHANCE</span>
        <span class="odds-value odds-value--blue">{{ blueOddsPct }}%</span>
      </div>

      <div class="odds-core">
        <div class="odds-track">
          <div class="odds-fill odds-fill--blue" :style="{ width: `${blueOddsPct}%` }" />
          <div class="odds-fill odds-fill--red" :style="{ width: `${100 - blueOddsPct}%` }" />
          <span class="odds-marker" :style="{ left: `${blueOddsPct}%` }" />
        </div>
        <span class="vs-mark">VS</span>
      </div>

      <div class="odds-side odds-side--red">
        <span class="odds-label">DEFEAT CHANCE</span>
        <span class="odds-value odds-value--red">{{ 100 - blueOddsPct }}%</span>
      </div>
    </div>

    <!-- ── Red side: the scouted opposition ── -->
    <section class="team-block layer">
      <header class="team-head team-head--red">
        <Icon icon="game-icons:helmet" width="24" height="24" class="team-icon" />
        <span class="team-name">ENEMY TEAM</span>
        <div class="team-chips">
          <span v-for="chip in redChips" :key="chip.label" class="team-chip">
            <span class="chip-label">{{ chip.label }}</span>
            <span class="chip-value" :style="chip.color ? { color: chip.color } : undefined">
              {{ chip.value }}
            </span>
          </span>
        </div>
      </header>
      <div class="team-row">
        <LoadingChampionCard
          v-for="(card, idx) in redCards"
          :key="`red-${idx}-${card.name}`"
          :card="card"
          side="red"
          :percent="percentFor('red', idx)"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import LoadingChampionCard from './LoadingChampionCard.vue'
import { useBattleStore } from '@/stores/battleStore'
import { useBattlePhase } from '@/composables/useBattlePhase'
import { formatNumber } from '@/config/numberFormat'
import {
  BATTLE_PHASES,
  HOT_WIN_STREAK_THRESHOLD,
  LOADING_CARD_SPEED_FACTORS,
  LOADING_ENEMY_FALLBACK_TIER,
  LOADING_PHASE_TICK_MS,
  LOADING_THREAT_LABELS,
  LOADING_THREAT_STAR_BOUNDS,
  RANK_TIER_COLORS,
  RANK_TIER_SHORT,
} from '@/config/constants'
import { CHAMPION_DATA } from '@/config/championData'
import { getChampionStarLevel } from '@/config/championTiers'
import { TRAIT_DEFINITIONS } from '@/config/championTraits'
import { ORIGIN_COLORS } from '@/config/championOrigins'
import type { ChampionState, LoadingScreenCard, LoadingScreenStat } from '@/types'

const battleStore = useBattleStore()

// The phase clock ticks fast here: the summoning bars glide instead of stepping.
const { remainingSeconds, progress } = useBattlePhase(LOADING_PHASE_TICK_MS)

/* ── Scouted opponent ──
   predetermineOutcome() leaves the opponent's rank as one label ("Gold II");
   its tier drives the enemy card frames the same way the player's does. */
const opponentLabel = computed(() => battleStore.currentOpponentLabel || 'UNRANKED SQUAD')
const opponentTier = computed(() => {
  const tier = battleStore.currentOpponentLabel.split(' ')[0]
  return tier && tier in RANK_TIER_COLORS ? tier : LOADING_ENEMY_FALLBACK_TIER
})

/** Trait marks of a champion, straight from the static champion data. */
function traitsOf(name: string) {
  const traitIds = CHAMPION_DATA[name]?.traits ?? []
  return TRAIT_DEFINITIONS.filter((t) => traitIds.includes(t.id)).map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    color: t.color,
  }))
}

/** Career KDA of an own champion — 'Perfect' without a single death. */
function careerKda(name: string): string {
  const career = battleStore.championCareer[name]
  if (!career || career.battles === 0) return '—'
  if (career.deaths === 0) return career.kills + career.assists > 0 ? 'Perfect' : '—'
  return ((career.kills + career.assists) / career.deaths).toFixed(1)
}

/** Own champions load with their career record — the three numbers that matter. */
function ownStats(name: string): LoadingScreenStat[] {
  const career = battleStore.championCareer[name]
  return [
    { label: 'BATTLES', value: career ? formatNumber(career.battles) : '—' },
    { label: 'KDA', value: careerKda(name), color: '#e8c040' },
    { label: 'MVP', value: career ? formatNumber(career.mvps) : '—', color: '#e8c040' },
  ]
}

/** Enemies have no history here — they get their scouting report instead. */
function enemyStats(name: string): LoadingScreenStat[] {
  const star = getChampionStarLevel(name)
  const threat =
    star <= LOADING_THREAT_STAR_BOUNDS.low
      ? { text: LOADING_THREAT_LABELS.low, color: '#74d448' }
      : star <= LOADING_THREAT_STAR_BOUNDS.medium
        ? { text: LOADING_THREAT_LABELS.medium, color: '#e8c040' }
        : { text: LOADING_THREAT_LABELS.high, color: '#cc6050' }
  return [
    {
      label: 'RANK',
      value: RANK_TIER_SHORT[opponentTier.value] ?? opponentTier.value.toUpperCase(),
      color: RANK_TIER_COLORS[opponentTier.value],
    },
    { label: 'THREAT', value: threat.text, color: threat.color },
  ]
}

function buildCard(champ: ChampionState, frameTier: string, own: boolean): LoadingScreenCard {
  const origin = CHAMPION_DATA[champ.name]?.origin
  return {
    name: champ.name,
    role: champ.role,
    frameTier,
    starLevel: getChampionStarLevel(champ.name),
    origin: origin ?? 'Runeterra',
    originColor: (origin && ORIGIN_COLORS[origin]) || '#8a8a6a',
    traits: traitsOf(champ.name),
    stats: own ? ownStats(champ.name) : enemyStats(champ.name),
  }
}

const blueCards = computed<LoadingScreenCard[]>(() =>
  battleStore.team1
    .filter((c) => c.name)
    .map((c) => buildCard(c, battleStore.currentRank.tier, true)),
)

const redCards = computed<LoadingScreenCard[]>(() =>
  battleStore.team2.filter((c) => c.name).map((c) => buildCard(c, opponentTier.value, false)),
)

/**
 * Per-tile progress: one shared phase clock, one fixed speed factor per slot.
 * Every champion is summoned before the phase ends, they just arrive in their
 * own order — a lobby never loads evenly.
 */
function percentFor(side: 'blue' | 'red', idx: number): number {
  const factor = LOADING_CARD_SPEED_FACTORS[side][idx] ?? 1
  return Math.min(100, Math.floor(progress.value * 100 * factor))
}

/* ── Team readouts flanking the crest ── */
const blueOddsPct = computed(() => Math.round(battleStore.liveWinMomentum * 100))

const blueChips = computed(() => [
  {
    label: 'RANK',
    value: `${battleStore.currentRank.tier} ${battleStore.currentRank.division}`,
    color: RANK_TIER_COLORS[battleStore.currentRank.tier],
  },
  { label: 'MMR', value: formatNumber(battleStore.mmr) },
  {
    label: 'WINRATE',
    value: `${battleStore.winRate.toFixed(1)}%`,
    color: '#e8c040',
  },
  {
    label: 'STREAK',
    value: `${battleStore.currentWinStreak}W`,
    color:
      battleStore.currentWinStreak >= HOT_WIN_STREAK_THRESHOLD ? '#f06820' : undefined,
  },
])

const redChips = computed(() => [
  {
    label: 'RANK',
    value: opponentLabel.value,
    color: RANK_TIER_COLORS[opponentTier.value],
  },
  { label: 'SQUAD', value: `${redCards.value.length} CHAMPIONS` },
  { label: 'ODDS', value: `${100 - blueOddsPct.value}%`, color: '#cc6050' },
])
</script>

<style scoped>
/* Same stage as the landing screen: flat deep-space base, starfield on top of
   it, every content layer above via .layer. */
.loading-screen {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: clamp(5px, 0.9vh, 12px);
  padding: clamp(9px, 1.4vh, 18px) clamp(14px, 1.4vw, 26px);
  background: #0a0906;
  overflow: hidden;
}

.stage-vignette {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 50% at 50% 50%, rgba(91, 141, 217, 0.08), transparent 72%),
    radial-gradient(ellipse 90% 60% at 50% 118%, rgba(10, 9, 6, 0.9), transparent 70%);
}

.layer {
  position: relative;
  z-index: 1;
}

/* ── Header ── */
.load-head {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 18px);
  flex-shrink: 0;
}

.head-badge {
  display: flex;
  align-items: center;
  gap: clamp(6px, 0.6vw, 12px);
  flex-shrink: 0;
}

.head-icon {
  width: clamp(19px, 2.4vh, 30px);
  height: clamp(19px, 2.4vh, 30px);
  color: #5b8dd9;
  filter: drop-shadow(0 0 8px rgba(91, 141, 217, 0.55));
  animation: head-pulse 1.6s ease-in-out infinite;
}

.head-title {
  font-size: clamp(15px, 2.2vh, 28px);
  letter-spacing: 6px;
  line-height: 1;
  color: #e8c040;
  text-shadow: 0 0 20px rgba(232, 192, 64, 0.3);
}

.head-dot {
  color: #5c3310;
}

.head-match {
  font-size: clamp(9px, 1.2vh, 14px);
  font-weight: 700;
  letter-spacing: 2px;
  color: #9a8250;
}

.head-rule {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, #5c3310, transparent);
}
.head-rule:first-child {
  background: linear-gradient(to left, #5c3310, transparent);
}

/* Countdown to the rift opening — the loudest number on the screen */
.head-clock {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.clock-value {
  font-size: clamp(20px, 3vh, 38px);
  font-weight: 700;
  line-height: 1;
  color: #93c5fd;
  text-shadow: 0 0 16px rgba(59, 130, 246, 0.5);
}
.clock-unit {
  font-size: clamp(9px, 1.2vh, 14px);
  font-weight: 700;
  letter-spacing: 1px;
  color: #5b8dd9;
}

/* ── Global phase bar ── */
.head-track {
  flex-shrink: 0;
  height: clamp(4px, 0.6vh, 7px);
  background: #14110a;
  border: 1px solid #2c2416;
  border-radius: 4px;
  overflow: hidden;
}

/* scaleX, not width — driven by the same 10Hz phase clock as the champion cards */
.head-fill {
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, #2b5ea8, #93c5fd);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
  transform-origin: left center;
  transform: scaleX(var(--fill, 0));
  transition: transform 0.12s linear;
}

/* ── Team blocks ── */
.team-block {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 0.5vh, 7px);
}

.team-head {
  display: flex;
  align-items: center;
  gap: clamp(6px, 0.7vw, 12px);
  flex-shrink: 0;
  padding-bottom: clamp(2px, 0.35vh, 5px);
  border-bottom: 1px solid;
}
.team-head--blue {
  border-color: rgba(59, 130, 246, 0.35);
}
.team-head--red {
  border-color: rgba(239, 68, 68, 0.35);
}

.team-icon {
  width: clamp(15px, 1.9vh, 23px);
  height: clamp(15px, 1.9vh, 23px);
  flex-shrink: 0;
}
.team-head--blue .team-icon {
  color: #93c5fd;
}
.team-head--red .team-icon {
  color: #fca5a5;
  transform: scaleX(-1);
}

.team-name {
  font-size: clamp(11px, 1.5vh, 18px);
  font-weight: 700;
  letter-spacing: 3px;
  line-height: 1;
  white-space: nowrap;
}
.team-head--blue .team-name {
  color: #93c5fd;
}
.team-head--red .team-name {
  color: #fca5a5;
}

/* Chips ride at the far end of the head line and wrap out of the way instead
   of pushing the team name around */
.team-chips {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(8px, 1.1vw, 22px);
  min-width: 0;
  overflow: hidden;
}

.team-chip {
  display: flex;
  align-items: baseline;
  gap: 5px;
  white-space: nowrap;
}

.chip-label {
  font-size: clamp(7px, 0.9vh, 10px);
  font-weight: 700;
  letter-spacing: 1.4px;
  color: rgba(232, 226, 208, 0.45);
}

.chip-value {
  font-size: clamp(10px, 1.4vh, 17px);
  font-weight: 700;
  line-height: 1;
  color: #e8e2d0;
  font-variant-numeric: tabular-nums;
}

/* ── Card row ── */
.team-row {
  /* --frame-scale: the ladder frame + crown read against a card of this size;
     the crown space above is reserved for the tallest crown in the game, so a
     promotion never shifts the row (same trick as the landing roster). */
  --frame-scale: 0.8;
  --crown-space: calc(31px * var(--frame-scale));
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(7px, 0.8vw, 15px);
  padding-top: var(--crown-space);
}

/* ── Face-off band ── */
.vs-band {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.4vw, 26px);
  padding: clamp(3px, 0.5vh, 7px) 0;
}

.odds-side {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-width: clamp(90px, 11vw, 190px);
}
.odds-side--red {
  align-items: flex-end;
  text-align: right;
}

.odds-label {
  font-size: clamp(7px, 0.9vh, 10px);
  font-weight: 700;
  letter-spacing: 1.6px;
  color: rgba(232, 226, 208, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-transform: uppercase;
}

.odds-value {
  font-size: clamp(15px, 2.2vh, 27px);
  font-weight: 700;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.odds-value--blue {
  color: #93c5fd;
  text-shadow: 0 0 14px rgba(59, 130, 246, 0.45);
}
.odds-value--red {
  color: #fca5a5;
  text-shadow: 0 0 14px rgba(239, 68, 68, 0.45);
}

/* The split bar carries the VS crest in its middle */
.odds-core {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.odds-track {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  height: clamp(5px, 0.7vh, 9px);
  background: #14110a;
  border: 1px solid #2c2416;
  border-radius: 4px;
  overflow: hidden;
}

.odds-fill {
  height: 100%;
  transition: width 0.4s ease;
}
.odds-fill--blue {
  background: linear-gradient(to right, #2b5ea8, #93c5fd);
}
.odds-fill--red {
  background: linear-gradient(to left, #a02020, #fca5a5);
}

.odds-marker {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  transform: translateX(-1px);
  background: #f0e6d0;
  box-shadow: 0 0 8px rgba(240, 230, 208, 0.8);
}

.vs-mark {
  position: relative;
  z-index: 1;
  padding: clamp(2px, 0.35vh, 5px) clamp(9px, 1vw, 16px);
  font-size: clamp(13px, 1.9vh, 23px);
  font-weight: 700;
  letter-spacing: 3px;
  line-height: 1;
  color: #e8c040;
  background: #0a0906;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 0 18px rgba(0, 0, 0, 0.9);
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.5);
}

@keyframes head-pulse {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

/* Full HD and flatter viewports: tighten the vertical rhythm, the rows keep
   every pixel they can get */
@media (max-height: 1100px) {
  .loading-screen {
    gap: 6px;
    padding: 8px 16px;
  }
  .team-row {
    --frame-scale: 0.7;
  }
  .vs-band {
    padding: 2px 0;
  }
}

/* 2K and taller: frame, crown and crest grow with the cards */
@media (min-height: 1250px) {
  .team-row {
    --frame-scale: 1;
  }
}

/* Narrow stages: the team chips are the first thing that may go */
@media (max-width: 1100px) {
  .team-chips {
    gap: 10px;
  }
  .chip-label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .head-icon {
    animation: none;
  }
  .head-fill,
  .odds-fill {
    transition: none;
  }
}
</style>
