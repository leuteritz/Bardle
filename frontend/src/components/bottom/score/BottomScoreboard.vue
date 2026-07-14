<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { useBattleScoreboardStats } from '@/composables/useBattleScoreboardStats'
import { formatNumber } from '@/config/numberFormat'
import {
  GAME_STATE,
  OBJECTIVE_FIGHT_STATUS,
  SCOREBOARD_STAT_COLORS,
  RANK_EMBLEM_IMAGES,
  RANK_TIER_COLORS,
} from '@/config/constants'

const battleStore = useBattleStore()
const uiStore = useUiStore()

const { kills, deaths, assists, gold, cs, dragons, barons, turrets } =
  useBattleScoreboardStats()

interface ScoreStat {
  key: string
  value: string
  color: string
  label: string
  icon?: string
  gameIcon?: string
}

const leftStats = computed<ScoreStat[]>(() => [
  { key: 'kills', value: formatNumber(kills.value), color: SCOREBOARD_STAT_COLORS.kills, label: 'Kills' },
  { key: 'deaths', value: formatNumber(deaths.value), color: SCOREBOARD_STAT_COLORS.deaths, label: 'Deaths' },
  { key: 'assists', value: formatNumber(assists.value), color: SCOREBOARD_STAT_COLORS.assists, label: 'Assists' },
  { key: 'gold', value: formatNumber(gold.value), color: SCOREBOARD_STAT_COLORS.gold, label: 'Gold', icon: '/img/BardGold.png' },
  { key: 'cs', value: formatNumber(cs.value), color: SCOREBOARD_STAT_COLORS.cs, label: 'CS' },
])

const rightStats = computed<ScoreStat[]>(() => [
  { key: 'turrets', value: formatNumber(turrets.value), color: SCOREBOARD_STAT_COLORS.turrets, label: 'Turrets', gameIcon: 'game-icons:tower-fall' },
  { key: 'dragons', value: formatNumber(dragons.value), color: SCOREBOARD_STAT_COLORS.dragons, label: 'Dragons', icon: '/img/dragon.png' },
  { key: 'barons', value: formatNumber(barons.value), color: SCOREBOARD_STAT_COLORS.barons, label: 'Barons', icon: '/img/baron.png' },
])

/* ── Rank + win/loss cells (right side, next to the crest) ── */
const { currentRank, totalWins, totalLosses } = storeToRefs(battleStore)

const isApexTier = computed(() =>
  ['Master', 'Grandmaster', 'Challenger'].includes(currentRank.value.tier),
)
const rankLabel = computed(() =>
  isApexTier.value
    ? currentRank.value.tier
    : `${currentRank.value.tier} ${currentRank.value.division}`,
)
const rankEmblem = computed(
  () => RANK_EMBLEM_IMAGES[currentRank.value.tier] ?? RANK_EMBLEM_IMAGES.Iron,
)
const rankColor = computed(() => RANK_TIER_COLORS[currentRank.value.tier] ?? '#d4a020')

function openBattleTab() {
  uiStore.setBardTab('battle')
}

/* ── Overflow guard: the LONGEST value across ALL cells (combat stats,
   rank tier, win/loss record) sets one shared char count on the scoreboard
   root, so every value shrinks together and stays the same size
   (see .sb-stat-value). Icons count as ~2 chars. ── */
function valChars(stat: ScoreStat): number {
  return stat.value.length + (stat.icon || stat.gameIcon ? 2 : 0)
}
const wlCombined = computed(
  () => formatNumber(totalWins.value).length + formatNumber(totalLosses.value).length + 4,
)
/* long records stack W over L — half the line, still readable */
const wlStacked = computed(() => wlCombined.value > 12)
const wlChars = computed(() =>
  wlStacked.value
    ? Math.max(formatNumber(totalWins.value).length, formatNumber(totalLosses.value).length) + 1
    : wlCombined.value,
)
const sharedValChars = computed(() =>
  Math.max(
    ...leftStats.value.map(valChars),
    ...rightStats.value.map(valChars),
    rankLabel.value.length + 2 /* emblem sits beside the text */,
    wlChars.value,
  ),
)

/* ══════════════════════════════════════════════════════════════════════
   Live battle-status line (compact, under the BARDLE crest) — ported
   from the previous bottom stats bar so no live info is lost.
   ══════════════════════════════════════════════════════════════════════ */
const {
  isAutoBattleInitialized,
  autoBattleEnabled,
  battlePhase,
  battleTime,
  showAutoBattleResult,
  battlePhaseStartTimestamp,
  resultPhaseStartTimestamp,
  searchingPhaseStartTimestamp,
  lastLpChange,
  lastAutoBattleResult,
  activeObjective,
  objectiveModalOpen,
  objectiveHP,
  objectiveMaxHP,
  objectiveOwnDamage,
  objectiveEnemyDamage,
  objectiveResult,
} = storeToRefs(battleStore)

const now = ref(Date.now())
let _nowTicker: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  _nowTicker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (_nowTicker) clearInterval(_nowTicker)
})

type PhaseKey = 'idle' | 'searching' | 'battle' | 'honor'

const phaseKey = computed<PhaseKey>(() => {
  if (!isAutoBattleInitialized.value) return 'idle'
  if (showAutoBattleResult.value) return 'honor'
  if (battlePhase.value === 'playing' && battlePhaseStartTimestamp.value > 0) return 'battle'
  if (searchingPhaseStartTimestamp.value > 0 && battlePhaseStartTimestamp.value === 0)
    return 'searching'
  return 'idle'
})

const gameStateDisplay = computed(() => {
  const _now = now.value
  if (
    searchingPhaseStartTimestamp.value > 0 &&
    !showAutoBattleResult.value &&
    battlePhaseStartTimestamp.value === 0
  ) {
    const elapsed = Math.min(5, Math.floor((_now - searchingPhaseStartTimestamp.value) / 1000))
    const min = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const sec = (elapsed % 60).toString().padStart(2, '0')
    return {
      label: GAME_STATE.SEARCHING.label,
      text: `${min}:${sec}`,
      color: GAME_STATE.SEARCHING.color,
    }
  }
  if (!isAutoBattleInitialized.value) {
    return null
  }
  if (showAutoBattleResult.value) {
    const elapsed = Math.max(0, Math.floor((_now - resultPhaseStartTimestamp.value) / 1000))
    const min = Math.floor(elapsed / 60).toString().padStart(2, '0')
    return { label: GAME_STATE.HONOR.label, text: `${min}:00`, color: GAME_STATE.HONOR.color }
  }
  if (battlePhase.value === 'playing' && battlePhaseStartTimestamp.value > 0) {
    const min = Math.floor(battleTime.value / 60).toString().padStart(2, '0')
    const { label, color } = GAME_STATE.BATTLE
    return { label, text: `${min}:00`, color }
  }
  return null
})

const objectiveFightDisplay = computed(() => {
  const objective = activeObjective.value
  if (!objective || (!objectiveModalOpen.value && objectiveResult.value === null)) return null
  const { label, image } = OBJECTIVE_FIGHT_STATUS[objective]
  if (objectiveResult.value !== null) {
    const won = objectiveResult.value !== 'enemy'
    return {
      label,
      icon: image,
      text: won ? OBJECTIVE_FIGHT_STATUS.securedText : OBJECTIVE_FIGHT_STATUS.lostText,
      color: won ? OBJECTIVE_FIGHT_STATUS.leadColor : OBJECTIVE_FIGHT_STATUS.behindColor,
      resolved: true,
    }
  }
  const hpPct =
    objectiveMaxHP.value > 0 ? Math.round((objectiveHP.value / objectiveMaxHP.value) * 100) : 0
  const leading = objectiveOwnDamage.value >= objectiveEnemyDamage.value
  return {
    label,
    icon: image,
    text: `${hpPct}%`,
    color: leading ? OBJECTIVE_FIGHT_STATUS.leadColor : OBJECTIVE_FIGHT_STATUS.behindColor,
    resolved: false,
  }
})

const resultBadge = computed(() => {
  if (phaseKey.value !== 'honor' || !lastAutoBattleResult.value) return null
  const won = lastAutoBattleResult.value.won
  const lp = lastLpChange.value
  return {
    label: won ? 'W' : 'L',
    lp: lp >= 0 ? `+${lp}` : `${lp}`,
    color: won ? '#74d448' : '#cc6050',
    glow: won ? 'rgba(116, 212, 72, 0.6)' : 'rgba(204, 96, 80, 0.6)',
  }
})

/**
 * State-based, not display-based: the status owns the title slot for the
 * whole auto-battle lifecycle. searchingPhaseStartTimestamp is set
 * synchronously on the Battle Start click, so the swap happens instantly —
 * before the intro animation and any phase displays exist.
 */
const hasLiveStatus = computed(
  () =>
    isAutoBattleInitialized.value ||
    autoBattleEnabled.value ||
    searchingPhaseStartTimestamp.value > 0,
)
</script>

<template>
  <div class="scoreboard" :style="{ '--val-chars': sharedValChars }">
    <!-- LEFT · combat stats -->
    <div
      class="sb-stats sb-stats--left"
      role="button"
      tabindex="0"
      title="Open Battle Stats"
      @click="openBattleTab"
      @keydown.enter="openBattleTab"
      @keydown.space.prevent="openBattleTab"
    >
      <div v-for="stat in leftStats" :key="stat.key" class="sb-stat">
        <span class="sb-stat-label">{{ stat.label }}</span>
        <span class="sb-stat-value" :style="{ color: stat.color }">
          <img v-if="stat.icon" :src="stat.icon" :alt="stat.label" class="sb-stat-icon" />
          {{ stat.value }}
        </span>
      </div>
    </div>

    <!-- CENTER · title crest -->
    <div class="sb-crest">
      <div class="sb-crest-rule-row">
        <span class="sb-crest-rule sb-crest-rule--left" />
        <img src="/img/star.png" alt="" class="sb-crest-star" />
        <span class="sb-crest-rule sb-crest-rule--right" />
      </div>
      <!-- title slot: game title when idle, promoted live status when active -->
      <Transition name="crest-swap" mode="out-in">
        <div v-if="hasLiveStatus" key="live" class="sb-live-title">
          <template v-if="objectiveFightDisplay">
            <img
              :src="objectiveFightDisplay.icon"
              :alt="objectiveFightDisplay.label"
              class="sb-live-icon"
              :class="{ 'sb-status-icon--live': !objectiveFightDisplay.resolved }"
            />
            <span class="sb-live-text" :style="{ color: objectiveFightDisplay.color }">
              {{ objectiveFightDisplay.label }} · {{ objectiveFightDisplay.text }}
            </span>
          </template>
          <template v-else-if="resultBadge">
            <span
              class="sb-live-text sb-live-text--badge"
              :style="{ color: resultBadge.color, '--live-glow': resultBadge.glow }"
            >
              {{ resultBadge.label }}&thinsp;{{ resultBadge.lp }}&thinsp;LP
            </span>
          </template>
          <template v-else-if="gameStateDisplay">
            <span v-if="phaseKey === 'searching'" class="sb-scan-dots sb-scan-dots--big" aria-hidden="true">
              <span class="sb-scan-dot" />
              <span class="sb-scan-dot" />
              <span class="sb-scan-dot" />
            </span>
            <span class="sb-live-text" :style="{ color: gameStateDisplay.color }">
              {{ gameStateDisplay.label }} · {{ gameStateDisplay.text }}
            </span>
          </template>
          <!-- fallback: battle loop is live but no phase display yet -->
          <template v-else>
            <span class="sb-scan-dots sb-scan-dots--big" aria-hidden="true">
              <span class="sb-scan-dot" />
              <span class="sb-scan-dot" />
              <span class="sb-scan-dot" />
            </span>
            <span class="sb-live-text" :style="{ color: GAME_STATE.SEARCHING.color }">
              {{ GAME_STATE.SEARCHING.label }}
            </span>
          </template>
        </div>
        <div v-else key="title" class="sb-title">BARDLE</div>
      </Transition>
    </div>

    <!-- RIGHT · economy / objective stats -->
    <div
      class="sb-stats sb-stats--right"
      role="button"
      tabindex="0"
      title="Open Battle Stats"
      @click="openBattleTab"
      @keydown.enter="openBattleTab"
      @keydown.space.prevent="openBattleTab"
    >
      <!-- Rank cell: emblem + tier-colored value -->
      <div class="sb-stat sb-stat--rank">
        <img :src="rankEmblem" :alt="rankLabel" class="sb-rank-emblem" />
        <div class="sb-rank-text">
          <span class="sb-stat-label">Rank</span>
          <span class="sb-stat-value" :style="{ color: rankColor }">
            {{ rankLabel }}
          </span>
        </div>
      </div>

      <!-- Win / loss cell: two-tone value -->
      <div class="sb-stat">
        <span class="sb-stat-label">
          <span class="sb-label-long">Win / Loss</span>
          <span class="sb-label-short">W / L</span>
        </span>
        <span
          class="sb-stat-value sb-wl-value"
          :class="{ 'sb-wl-value--stacked': wlStacked }"
        >
          <span class="sb-wl-win">{{ formatNumber(totalWins) }}W</span>
          <span v-if="!wlStacked" class="sb-wl-sep">·</span>
          <span class="sb-wl-loss">{{ formatNumber(totalLosses) }}L</span>
        </span>
      </div>

      <div v-for="stat in rightStats" :key="stat.key" class="sb-stat">
        <span class="sb-stat-label">{{ stat.label }}</span>
        <span class="sb-stat-value" :style="{ color: stat.color }">
          <img v-if="stat.icon" :src="stat.icon" :alt="stat.label" class="sb-stat-icon" />
          <Icon
            v-else-if="stat.gameIcon"
            :icon="stat.gameIcon"
            width="24"
            height="24"
            class="sb-stat-icon"
          />
          {{ stat.value }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  /* typography tracks the strip's own width (container queries), so cells
     can never overlap the crest and wide viewports are used fully */
  --sb-val-size: clamp(13px, 2.1cqw, 26px);
  --sb-label-size: clamp(8px, 0.95cqw, 11px);
  --sb-title-size: clamp(16px, 2.5cqw, 30px);

  position: absolute;
  left: calc(440px * var(--hud-scale, 1));
  right: calc(440px * var(--hud-scale, 1));
  /* strip edge (364) + 3px for the gold frame stroke that bites into the
     top — keeps label-to-top and value-to-bottom optically equal */
  top: calc(367px * var(--hud-scale, 1));
  bottom: 0;
  z-index: 2;
  container-type: inline-size;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  min-width: 0;
  pointer-events: none;
}

/* ── Stat groups ── */
.sb-stats {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
  cursor: pointer;
  pointer-events: auto;
  border-radius: 4px;
}
.sb-stats:focus-visible {
  outline: none;
}
.sb-stats:hover .sb-stat-value {
  filter: brightness(1.15) drop-shadow(0 0 6px currentcolor);
}

.sb-stat {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(4px, 0.5cqw, 8px);
  min-width: 0;
  padding-inline: clamp(2px, 0.5cqw, 10px);
}
.sb-stat + .sb-stat {
  border-left: 1px solid rgba(122, 78, 32, 0.3);
}

/* ── Rank cell ── */
.sb-stat--rank {
  flex-direction: row;
  gap: max(5px, calc(8px * var(--hud-scale, 1)));
}

.sb-rank-emblem {
  width: clamp(20px, 2.8cqw, 38px);
  height: clamp(20px, 2.8cqw, 38px);
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
}

.sb-rank-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  /* same gap as .sb-stat so the Rank label sits on the shared baseline */
  gap: clamp(4px, 0.5cqw, 8px);
  min-width: 0;
}

/* ── Win / loss cell ── */
.sb-stat-value.sb-wl-value.sb-wl-value--stacked {
  flex-direction: column;
  gap: 1px;
  line-height: 1.05;
}
.sb-label-short {
  display: none;
}
.sb-wl-win {
  color: #74d448;
}
.sb-wl-loss {
  color: #cc6050;
}
.sb-wl-sep {
  color: #7a6a44;
  font-size: 0.7em;
}

.sb-stat-value {
  display: flex;
  align-items: center;
  gap: 4px;
  /* never wider than the cell: long values shrink with their char count
     (bound as --val-chars from the template) instead of overlapping */
  font-size: min(var(--sb-val-size), max(9px, calc(10cqw / var(--val-chars, 4))));
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  transition: filter 0.2s ease;
}

.sb-stat-icon {
  /* em-based: tracks the length-adjusted value size, so icon + digits
     together stay inside the cell */
  width: 0.85em;
  height: 0.85em;
  object-fit: contain;
  flex-shrink: 0;
}

.sb-stat-label {
  font-size: var(--sb-label-size);
  letter-spacing: 0.16em;
  color: #7a6a44;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ── Title crest ── */
.sb-crest {
  /* fluid width, fixed per viewport size: sized for the longest live status
     so nothing around it ever shifts when the text or mode changes */
  flex: 0 0 auto;
  width: clamp(160px, 24cqw, 300px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  user-select: none;
}

.sb-crest-rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sb-crest-rule {
  height: 1px;
  width: max(20px, calc(34px * var(--hud-scale, 1)));
}
.sb-crest-rule--left {
  background: linear-gradient(90deg, transparent, #c89040);
}
.sb-crest-rule--right {
  background: linear-gradient(90deg, #c89040, transparent);
}

.sb-crest-star {
  width: max(11px, calc(15px * var(--hud-scale, 1)));
  height: max(11px, calc(15px * var(--hud-scale, 1)));
  object-fit: contain;
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.8));
}

.sb-title {
  font-size: var(--sb-title-size);
  letter-spacing: 0.3em;
  padding-left: 0.3em; /* optically recenters the letter-spaced text */
  color: #e8c040;
  line-height: 1.1;
  white-space: nowrap;
  text-shadow:
    0 0 6px #ffe060,
    0 0 18px rgba(232, 192, 64, 0.7),
    0 0 40px rgba(180, 120, 16, 0.45);
  animation: sb-title-flicker 6s ease-in-out infinite;
}

@keyframes sb-title-flicker {
  0%,
  92%,
  100% {
    opacity: 1;
  }
  94% {
    opacity: 0.85;
  }
  96% {
    opacity: 1;
  }
  98% {
    opacity: 0.9;
  }
}

/* ── Live status in the title slot ── */
.sb-live-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: max(5px, calc(8px * var(--hud-scale, 1)));
  /* match the BARDLE title box so the crest never shifts */
  min-height: calc(var(--sb-title-size) * 1.1);
  max-width: 100%;
  overflow: hidden;
}

.sb-live-text {
  font-size: clamp(12px, 1.7cqw, 21px);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  transition: color 0.4s ease;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.9),
    0 0 14px currentcolor;
}

.sb-live-text--badge {
  font-weight: 700;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.9),
    0 0 12px var(--live-glow, rgba(116, 212, 72, 0.6));
}

.sb-live-icon {
  width: clamp(13px, 1.8cqw, 22px);
  height: clamp(13px, 1.8cqw, 22px);
  object-fit: contain;
}

.sb-status-icon--live {
  animation: sb-objective-pulse 1.2s ease-in-out infinite;
}


@keyframes sb-objective-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 3px rgba(200, 140, 40, 0.7));
  }
  50% {
    filter: drop-shadow(0 0 7px rgba(200, 140, 40, 0.95));
  }
}

/* title ↔ live status swap */
.crest-swap-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.crest-swap-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.crest-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.crest-swap-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.sb-scan-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.sb-scan-dots--big {
  gap: 4px;
}
.sb-scan-dots--big .sb-scan-dot {
  width: 5px;
  height: 5px;
}

.sb-scan-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #9a6830;
  animation: sb-scan-pulse 1.2s ease-in-out infinite;
}
.sb-scan-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.sb-scan-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes sb-scan-pulse {
  0%,
  80%,
  100% {
    background: #5c3a14;
    transform: scale(0.8);
  }
  40% {
    background: #c89040;
    transform: scale(1.15);
    box-shadow: 0 0 4px rgba(200, 140, 40, 0.7);
  }
}

/* narrow strip: drop the emblem, shorten the W/L label and tighten the
   title so the rank cell ("Grandmaster") never crowds its neighbors */
@container (max-width: 1300px) {
  .sb-rank-emblem {
    display: none;
  }
  .sb-rank-text {
    align-items: center;
  }
  .sb-label-long {
    display: none;
  }
  .sb-label-short {
    display: inline;
  }
  .sb-title {
    letter-spacing: 0.18em;
    padding-left: 0.18em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sb-title,
  .sb-status-icon--live,
  .sb-scan-dot {
    animation: none;
  }
  .crest-swap-enter-active,
  .crest-swap-leave-active {
    transition: none;
  }
}
</style>
