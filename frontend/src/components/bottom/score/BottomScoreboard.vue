<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { useBattleScoreboardStats } from '@/composables/useBattleScoreboardStats'
import { useBattlePhase } from '@/composables/useBattlePhase'
import {
  useScoreboardFit,
  MEASURE_FONT_PX,
  type ScoreboardFitSource,
  type ScoreboardCrestSource,
} from '@/composables/useScoreboardFit'
import { formatNumber } from '@/config/numberFormat'
import {
  BATTLE_PHASES,
  OBJECTIVE_FIGHT_STATUS,
  SCOREBOARD_STAT_COLORS,
  SCOREBOARD_FIT,
  SCOREBOARD_CREST,
  SCOREBOARD_CELL_LABELS,
  GAME_TITLE,
  CREST_STAR_IMAGE,
  CREST_SEPARATOR,
  BOTTOM_BAR_CENTER_TOP_Y,
  RANK_EMBLEM_IMAGES,
  RANK_TIER_COLORS,
  RANK_TIERS,
  RANK_TIER_SHORT,
  RANK_DIVISION_DIGITS,
  APEX_RANK_TIERS,
  BATTLE_STAT_GAME_ICONS,
  BATTLE_STAT_IMAGES,
} from '@/config/constants'
import { DRAKE_TYPES } from '@/config/drakes'

const battleStore = useBattleStore()
const uiStore = useUiStore()

const { kills, deaths, assists, gold, cs, dragons, barons, turrets } =
  useBattleScoreboardStats()

interface ScoreStat {
  key: keyof typeof SCOREBOARD_CELL_LABELS
  value: string
  color: string
  label: string
  labelShort: string
  icon?: string
  gameIcon?: string
}

/** Caption pair of a cell — full word plus the compact form the fit may pick. */
function captionOf(key: keyof typeof SCOREBOARD_CELL_LABELS) {
  return { label: SCOREBOARD_CELL_LABELS[key].full, labelShort: SCOREBOARD_CELL_LABELS[key].short }
}

const leftStats = computed<ScoreStat[]>(() => [
  { key: 'kills', value: formatNumber(kills.value), color: SCOREBOARD_STAT_COLORS.kills, ...captionOf('kills'), gameIcon: BATTLE_STAT_GAME_ICONS.kills },
  { key: 'deaths', value: formatNumber(deaths.value), color: SCOREBOARD_STAT_COLORS.deaths, ...captionOf('deaths'), gameIcon: BATTLE_STAT_GAME_ICONS.deaths },
  { key: 'assists', value: formatNumber(assists.value), color: SCOREBOARD_STAT_COLORS.assists, ...captionOf('assists'), gameIcon: BATTLE_STAT_GAME_ICONS.assists },
  { key: 'gold', value: formatNumber(gold.value), color: SCOREBOARD_STAT_COLORS.gold, ...captionOf('gold'), icon: BATTLE_STAT_IMAGES.gold },
  { key: 'cs', value: formatNumber(cs.value), color: SCOREBOARD_STAT_COLORS.cs, ...captionOf('cs'), gameIcon: BATTLE_STAT_GAME_ICONS.cs },
])

const rightStats = computed<ScoreStat[]>(() => [
  { key: 'turrets', value: formatNumber(turrets.value), color: SCOREBOARD_STAT_COLORS.turrets, ...captionOf('turrets'), gameIcon: BATTLE_STAT_GAME_ICONS.turrets },
  { key: 'dragons', value: formatNumber(dragons.value), color: SCOREBOARD_STAT_COLORS.dragons, ...captionOf('dragons'), icon: BATTLE_STAT_IMAGES.dragons },
  { key: 'barons', value: formatNumber(barons.value), color: SCOREBOARD_STAT_COLORS.barons, ...captionOf('barons'), icon: BATTLE_STAT_IMAGES.barons },
])

/** The caption a cell renders right now — the fit decides full vs. compact. */
function captionText(stat: { label: string; labelShort: string }): string {
  return fit.value.shortLabels ? stat.labelShort : stat.label
}

/* ── Rank + win/loss cells (right side, next to the crest) ── */
const { currentRank, totalWins, totalLosses } = storeToRefs(battleStore)

function isApexTier(tier: string): boolean {
  return (APEX_RANK_TIERS as readonly string[]).includes(tier)
}
/* Short, near-equal-width label ("IRON 4", "DIAM 1", "GM", "CHAL"). The full
   name stays available in the tooltip. */
function shortTier(tier: string): string {
  return RANK_TIER_SHORT[tier] ?? tier.slice(0, 4).toUpperCase()
}
/**
 * Every label the rank cell can ever show. The fit budgets for the WIDEST of
 * them instead of the current one, so climbing the ladder repaints the cell —
 * it never resizes it. One digit stands in for all four divisions: the value
 * row renders tabular numerals, where every digit is the same width.
 */
const RANK_LABEL_CANDIDATES = RANK_TIERS.map((tier) =>
  isApexTier(tier) ? shortTier(tier) : `${shortTier(tier)} 4`,
)

const rankLabel = computed(() =>
  isApexTier(currentRank.value.tier)
    ? shortTier(currentRank.value.tier)
    : `${shortTier(currentRank.value.tier)} ${RANK_DIVISION_DIGITS[currentRank.value.division] ?? currentRank.value.division}`,
)
/** Unabbreviated rank for tooltip + emblem alt text. */
const rankFullLabel = computed(() =>
  isApexTier(currentRank.value.tier)
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

/* ── Win / loss cell ── */
const winText = computed(() => `${formatNumber(totalWins.value)}W`)
const lossText = computed(() => `${formatNumber(totalLosses.value)}L`)
/** Non-breaking so the separator measures exactly as it renders. */
const WL_SEPARATOR = '\u00A0/\u00A0'
/* A long record stacks W over L — half the line, still readable, and it keeps
   the other nine cells from having to shrink to a single cell's worst case. */
const wlStacked = computed(
  () =>
    winText.value.length + lossText.value.length + WL_SEPARATOR.length >
    SCOREBOARD_FIT.WIN_LOSS_STACK_CHARS,
)

/* ══════════════════════════════════════════════════════════════════════
   Live battle-status line — it owns the crest's title slot for the whole
   auto-battle lifecycle, so no live info is lost when the game is running.
   ══════════════════════════════════════════════════════════════════════ */
const {
  isAutoBattleInitialized,
  autoBattleEnabled,
  battleTime,
  searchingPhaseStartTimestamp,
  lastLpChange,
  lastAutoBattleResult,
  activeObjective,
  activeDrakeType,
  objectiveModalOpen,
  objectiveHP,
  objectiveMaxHP,
  objectiveOwnDamage,
  objectiveEnemyDamage,
  objectiveResult,
} = storeToRefs(battleStore)

/* Phase, its clock and its remaining seconds all come from the store's phase
   machine (battleStore.currentBattlePhase) — the bottom bar only renders it,
   so it can never disagree with the battle tab. */
const {
  phase: phaseKey,
  config: phaseConfig,
  elapsedMs,
  remainingSeconds,
  progress: phaseProgress,
} = useBattlePhase(1000)

/** Kompaktes m:ss ohne führende Null bei den Minuten ("0:04", "12:00"). */
function shortTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

const gameStateDisplay = computed(() => {
  const { label, color, durationMs } = phaseConfig.value
  switch (phaseKey.value) {
    case 'searching': {
      // counts up to the search duration — the phase's own progress, clamped so
      // a late clock tick can never overshoot the window
      const elapsed = Math.min(
        Math.floor((durationMs ?? 0) / 1000),
        Math.floor(elapsedMs.value / 1000),
      )
      return { text: `${label}${CREST_SEPARATOR}${shortTime(elapsed)}`, color }
    }
    case 'loading':
      // counts down to the rift opening, same clock the loading screen shows
      return { text: `${label}${CREST_SEPARATOR}${shortTime(remainingSeconds.value)}`, color }
    case 'battle':
      // Spielzeit tickt in Minutenschritten (60x-Zeitraffer) — Sekunden wären Rauschen
      return { text: `${label}${CREST_SEPARATOR}${Math.floor(battleTime.value / 60)}:00`, color }
    case 'honor':
      // Countdown wie im Honor-Screen des Battle-Tabs: bei 0 beginnt die
      // nächste Planet-Search-Phase
      return { text: `${label}${CREST_SEPARATOR}${shortTime(remainingSeconds.value)}`, color }
    default:
      return null
  }
})

const objectiveFightDisplay = computed(() => {
  const objective = activeObjective.value
  if (!objective || (!objectiveModalOpen.value && objectiveResult.value === null)) return null
  const { image } = OBJECTIVE_FIGHT_STATUS[objective]
  // Kürzester eindeutiger Name: beim Drake der Typ ("Infernal", "Elder"), sonst "Baron"
  const name =
    objective === 'drake'
      ? DRAKE_TYPES[activeDrakeType.value ?? 'infernal'].label.split(' ')[0]
      : OBJECTIVE_FIGHT_STATUS.baron.label.split(' ')[0]
  if (objectiveResult.value !== null) {
    const won = objectiveResult.value !== 'enemy'
    return {
      name,
      icon: image,
      text: `${name} ${won ? '✓' : '✗'}`,
      color: won ? OBJECTIVE_FIGHT_STATUS.leadColor : OBJECTIVE_FIGHT_STATUS.behindColor,
      resolved: true,
    }
  }
  const hpPct =
    objectiveMaxHP.value > 0 ? Math.round((objectiveHP.value / objectiveMaxHP.value) * 100) : 0
  const leading = objectiveOwnDamage.value >= objectiveEnemyDamage.value
  return {
    name,
    icon: image,
    text: `${name}${CREST_SEPARATOR}${hpPct}%`,
    color: leading ? OBJECTIVE_FIGHT_STATUS.leadColor : OBJECTIVE_FIGHT_STATUS.behindColor,
    resolved: false,
  }
})

/** Wie lange das Win/Lose-Badge den Titel-Slot hält, bevor die
 *  Honor-Phase mit Sekundenzähler übernimmt (Result-Pause insgesamt:
 *  BATTLE_RESULT_PAUSE_MS = 8s). */
const RESULT_BADGE_MS = 3000

const resultBadge = computed(() => {
  if (phaseKey.value !== 'honor' || !lastAutoBattleResult.value) return null
  // Nach ein paar Sekunden den Slot an die Honor-Anzeige übergeben
  if (elapsedMs.value > RESULT_BADGE_MS) return null
  const won = lastAutoBattleResult.value.won
  const lp = lastLpChange.value
  return {
    // schmale Leerzeichen: das Badge bleibt eine Einheit, ohne zu zerfallen
    text: `${won ? 'Win' : 'Lose'} ${lp >= 0 ? `+${lp}` : lp} LP`,
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

/**
 * What the status line says right now, and what leads it. A phase without its
 * own display (the landing screen) still announces the search — the crest never
 * shows an empty slot once the battle loop is live.
 */
const liveStatus = computed(() => {
  const display = gameStateDisplay.value
  if (!display) {
    return { text: BATTLE_PHASES.searching.label, color: BATTLE_PHASES.searching.color, glyph: null }
  }
  // the search keeps its scan dots, every other phase leads with its own glyph
  return {
    text: display.text,
    color: display.color,
    glyph: phaseKey.value === 'searching' ? null : phaseConfig.value.icon,
  }
})

/* ══════════════════════════════════════════════════════════════════════
   Auto-fit — every number as large as its cell allows, all of them equal.

   The strip measures its own halves and every string it is about to render,
   then derives ONE shared value size plus the per-cell width weights (see
   utils/scoreboardFit.ts). Nothing here is a guessed glyph width, so the
   numbers grow to fill Full HD, 2K and 4K instead of stopping at a hardcoded
   ceiling — and nothing is ever clipped, because the fit is what decides.
   ══════════════════════════════════════════════════════════════════════ */
const RANK_CELL = { key: 'rank' as const, ...captionOf('rank') }
const WIN_LOSS_CELL = { key: 'winLoss' as const, ...captionOf('winLoss') }

const rootRef = ref<HTMLElement | null>(null)
const probeValueRef = ref<HTMLElement | null>(null)
const probeRankRef = ref<HTMLElement | null>(null)
const probeLabelRef = ref<HTMLElement | null>(null)
const probeTitleRef = ref<HTMLElement | null>(null)
const probeStatusRef = ref<HTMLElement | null>(null)

const fitCells = computed<{ left: ScoreboardFitSource[]; right: ScoreboardFitSource[] }>(() => ({
  left: leftStats.value.map((stat) => ({
    key: stat.key,
    text: stat.value,
    label: stat.label,
    labelShort: stat.labelShort,
    probe: 'value' as const,
  })),
  right: [
    {
      ...RANK_CELL,
      text: RANK_LABEL_CANDIDATES,
      probe: 'rank' as const,
    },
    {
      ...WIN_LOSS_CELL,
      text: wlStacked.value
        ? [winText.value, lossText.value]
        : `${winText.value}${WL_SEPARATOR}${lossText.value}`,
      probe: 'value' as const,
      stacked: wlStacked.value,
    },
    ...rightStats.value.map((stat) => ({
      key: stat.key,
      text: stat.value,
      label: stat.label,
      labelShort: stat.labelShort,
      probe: 'value' as const,
    })),
  ],
}))

/**
 * The widest the status line can still grow to in the running phase — NOT the
 * string of this second. The clock counts down inside the budget, so the line
 * is sized once per phase instead of resizing under the reader every tick.
 */
const statusBudget = computed(() => {
  const objective = objectiveFightDisplay.value
  if (objective) return `${objective.name}${CREST_SEPARATOR}${SCOREBOARD_CREST.OBJECTIVE_BUDGET}`
  if (resultBadge.value) return resultBadge.value.text
  if (!gameStateDisplay.value) return BATTLE_PHASES.searching.label
  const clock =
    phaseKey.value === 'battle'
      ? SCOREBOARD_CREST.CLOCK_BUDGET_BATTLE
      : SCOREBOARD_CREST.CLOCK_BUDGET
  return `${phaseConfig.value.label}${CREST_SEPARATOR}${clock}`
})

/* What the crest has to hold: one line at a time, each with the ornament that
   stands beside it. Both are budgeted, so the swap between them never resizes
   anything the other one owns. */
const crestSources = computed<{ title: ScoreboardCrestSource; status: ScoreboardCrestSource }>(
  () => ({
    title: {
      text: GAME_TITLE,
      // a star on either side of the title
      ornamentEm: 2 * (SCOREBOARD_CREST.STAR_EM + SCOREBOARD_CREST.GAP_EM),
      probe: 'title',
    },
    status: {
      // reserved whether the line leads with a glyph, the scan dots or (the
      // result badge) nothing at all — so the badge never resizes the line
      text: statusBudget.value,
      ornamentEm: SCOREBOARD_CREST.GLYPH_EM + SCOREBOARD_CREST.GAP_EM,
      probe: 'status',
    },
  }),
)

const { fit } = useScoreboardFit({
  root: rootRef,
  probes: {
    value: probeValueRef,
    rank: probeRankRef,
    label: probeLabelRef,
    title: probeTitleRef,
    status: probeStatusRef,
  },
  cells: fitCells,
  crest: crestSources,
})

/** Probes render at the reference size the em math divides by. */
const probeStyle = { fontSize: `${MEASURE_FONT_PX}px`, display: 'inline-block' }

function px(value: number): string {
  return `${Math.round(value * 100) / 100}px`
}

/* Strip geometry that does not depend on the fit: where the strip starts and
   how much air it keeps to the bar's frame stroke. The stroke is drawn at a
   fixed width (BOTTOM_FRAME_W_SHADOW), so its clearance must NOT scale with
   --hud-scale — a scaled 3px let the frame cover the caption row on laptops. */
const stripVars = {
  '--sb-strip-top': px(BOTTOM_BAR_CENTER_TOP_Y),
  '--sb-pad-top': px(SCOREBOARD_FIT.STRIP_PAD_TOP_PX),
  '--sb-pad-bottom': px(SCOREBOARD_FIT.STRIP_PAD_BOTTOM_PX),
  '--sb-pad-x': px(SCOREBOARD_FIT.STRIP_PAD_X_PX),
  /* the caption's line box is exactly the band the fit reserved for it, so the
     letters sit inside it instead of painting over its edges */
  '--sb-label-line': String(SCOREBOARD_FIT.LABEL_LINE_FACTOR),
  /* Crest geometry in em of its own line — the very numbers the fit budgeted
     with, handed to the CSS so the two can never drift apart. */
  '--sb-crest-pad': `${SCOREBOARD_CREST.PAD_EM}em`,
  '--sb-crest-gap': `${SCOREBOARD_CREST.GAP_EM}em`,
  '--sb-crest-star': `${SCOREBOARD_CREST.STAR_EM}em`,
  '--sb-crest-glyph': `${SCOREBOARD_CREST.GLYPH_EM}em`,
  '--sb-crest-rail': `${SCOREBOARD_CREST.RAIL_EM}em`,
}

const fitVars = computed(() => ({
  ...stripVars,
  '--sb-value-size': px(fit.value.valueSize),
  '--sb-stacked-size': px(fit.value.stackedValueSize),
  '--sb-label-size': px(fit.value.labelSize),
  '--sb-row-gap': px(fit.value.rowGap),
  '--sb-icon-size': px(fit.value.iconSize),
  '--sb-icon-gap': px(fit.value.iconGap),
  '--sb-cell-pad': px(fit.value.cellPad),
  /* Fixed slot for the rank text: emblem and label start at a constant x for
     every tier, so a promotion never nudges the emblem sideways. */
  '--sb-rank-slot': px((fit.value.em.rank ?? 0) * fit.value.valueSize),
  '--sb-crest-w': px(fit.value.crestWidth),
  '--sb-title-size': px(fit.value.crestTitleSize),
  '--sb-status-size': px(fit.value.crestStatusSize),
  /* em base of the crest's own ornaments — the size of the line it is showing */
  '--sb-crest-size': px(
    hasLiveStatus.value ? fit.value.crestStatusSize : fit.value.crestTitleSize,
  ),
}))

/** flex-grow weight of one cell — its share of the half's width. */
function cellStyle(key: string) {
  return { flexGrow: fit.value.grow[key] ?? 1 }
}

/* Below their legibility floor the fit drops icons / labels rather than
   rendering a speck (every cell keeps its tooltip). */
const showIcons = computed(() => fit.value.iconSize > 0)
const showLabels = computed(() => fit.value.labelSize > 0)
const iconPx = computed(() => Math.round(fit.value.iconSize))
/** Render size of the crest glyph — the em box the fit budgeted for it. */
const crestGlyphPx = computed(() =>
  Math.round(fit.value.crestStatusSize * SCOREBOARD_CREST.GLYPH_EM),
)

/* Progress of the running phase, drawn as a hairline along the crest's bottom
   edge: it grows from the middle outward in the phase's own colour. It sits in
   the slack the fit already keeps below the line (TEXT_HEIGHT_FRACTION), so it
   costs the text neither width nor size. */
const phaseProgressStyle = computed(() => ({
  transform: `scaleX(${phaseProgress.value})`,
  background: phaseConfig.value.color,
}))

</script>

<template>
  <div ref="rootRef" class="scoreboard" :style="fitVars">
    <!-- Hidden probes: the fit renders each string here once, at a known size,
         to learn its true width (see useScoreboardFit). -->
    <div class="sb-probes" aria-hidden="true">
      <span ref="probeValueRef" class="sb-stat-value sb-probe" :style="probeStyle" />
      <span ref="probeRankRef" class="sb-stat-value sb-rank-value sb-probe" :style="probeStyle" />
      <span ref="probeLabelRef" class="sb-stat-label sb-probe" :style="probeStyle" />
      <span ref="probeTitleRef" class="sb-title sb-probe" :style="probeStyle" />
      <span ref="probeStatusRef" class="sb-live-text sb-probe" :style="probeStyle" />
    </div>

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
      <div
        v-for="stat in leftStats"
        :key="stat.key"
        class="sb-stat"
        :style="cellStyle(stat.key)"
        :title="stat.label"
      >
        <span v-if="showLabels" class="sb-stat-label">{{ captionText(stat) }}</span>
        <div class="sb-stat-main">
          <img
            v-if="showIcons && stat.icon"
            :src="stat.icon"
            :alt="stat.label"
            class="sb-stat-icon"
          />
          <Icon
            v-else-if="showIcons && stat.gameIcon"
            :icon="stat.gameIcon"
            :width="iconPx"
            :height="iconPx"
            class="sb-stat-icon"
            :style="{ color: stat.color }"
          />
          <span class="sb-stat-value" :style="{ color: stat.color }">{{ stat.value }}</span>
        </div>
      </div>
    </div>

    <!-- CENTER · title crest — one line, as large as its box and the strip
         height allow (see SCOREBOARD_CREST / utils/scoreboardFit). The rails at
         both ends live off the width the line did NOT need and double as the
         running phase's progress track. -->
    <div class="sb-crest">
      <span class="sb-crest-rail sb-crest-rail--left" aria-hidden="true" />

      <div class="sb-crest-slot">
        <!-- title slot: game title when idle, promoted live status when active -->
        <!-- type="transition": .sb-title trägt eine infinite Flicker-Animation (6s);
             ohne explizites type wartet Vue auf deren animationend, das nie feuert,
             und der Swap hängt bis zum 6s-Fallback-Timeout. -->
        <Transition name="crest-swap" mode="out-in" type="transition">
          <div v-if="hasLiveStatus" key="live" class="sb-crest-line sb-crest-line--live">
            <template v-if="objectiveFightDisplay">
              <img
                :src="objectiveFightDisplay.icon"
                alt=""
                class="sb-crest-glyph"
                :class="{ 'sb-status-icon--live': !objectiveFightDisplay.resolved }"
              />
              <span class="sb-live-text" :style="{ color: objectiveFightDisplay.color }">
                {{ objectiveFightDisplay.text }}
              </span>
            </template>
            <template v-else-if="resultBadge">
              <span
                class="sb-live-text sb-live-text--badge"
                :style="{ color: resultBadge.color, '--live-glow': resultBadge.glow }"
              >
                {{ resultBadge.text }}
              </span>
            </template>
            <template v-else>
              <!-- every phase leads with its own registry glyph; the search,
                   which is a phase of waiting, keeps its scan dots -->
              <Icon
                v-if="liveStatus.glyph"
                :icon="liveStatus.glyph"
                :width="crestGlyphPx"
                :height="crestGlyphPx"
                class="sb-crest-glyph sb-status-icon--live"
                :style="{ color: liveStatus.color }"
              />
              <span v-else class="sb-scan-dots" aria-hidden="true">
                <span class="sb-scan-dot" />
                <span class="sb-scan-dot" />
                <span class="sb-scan-dot" />
              </span>
              <span class="sb-live-text" :style="{ color: liveStatus.color }">
                {{ liveStatus.text }}
              </span>
            </template>
          </div>

          <div v-else key="title" class="sb-crest-line sb-crest-line--title">
            <img :src="CREST_STAR_IMAGE" alt="" class="sb-crest-star" />
            <span v-ink-center="fit.crestTitleSize" class="sb-title">{{ GAME_TITLE }}</span>
            <img :src="CREST_STAR_IMAGE" alt="" class="sb-crest-star" />
          </div>
        </Transition>
      </div>

      <span class="sb-crest-rail sb-crest-rail--right" aria-hidden="true" />

      <!-- progress of the running phase, along the crest's bottom edge -->
      <span v-if="hasLiveStatus" class="sb-crest-progress" aria-hidden="true">
        <i class="sb-crest-progress-fill" :style="phaseProgressStyle" />
      </span>
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
      <!-- Rank cell: emblem + tier-colored value, budgeted for the widest tier -->
      <div
        class="sb-stat sb-stat--rank"
        :style="cellStyle('rank')"
        :title="`${RANK_CELL.label} · ${rankFullLabel}`"
      >
        <span v-if="showLabels" class="sb-stat-label">{{ captionText(RANK_CELL) }}</span>
        <div class="sb-stat-main">
          <img v-if="showIcons" :src="rankEmblem" :alt="rankFullLabel" class="sb-stat-icon" />
          <span class="sb-stat-value sb-rank-value" :style="{ color: rankColor }">
            {{ rankLabel }}
          </span>
        </div>
      </div>

      <!-- Win / loss cell: two-tone value -->
      <div class="sb-stat" :style="cellStyle('winLoss')" :title="WIN_LOSS_CELL.label">
        <span v-if="showLabels" class="sb-stat-label">{{ captionText(WIN_LOSS_CELL) }}</span>
        <div class="sb-stat-main">
          <Icon
            v-if="showIcons"
            :icon="BATTLE_STAT_GAME_ICONS.winLoss"
            :width="iconPx"
            :height="iconPx"
            class="sb-stat-icon"
            style="color: #e8c040"
          />
          <span class="sb-stat-value sb-wl-value" :class="{ 'sb-wl-value--stacked': wlStacked }">
            <span class="sb-wl-win">{{ winText }}</span>
            <span v-if="!wlStacked" class="sb-wl-sep">&nbsp;/&nbsp;</span>
            <span class="sb-wl-loss">{{ lossText }}</span>
          </span>
        </div>
      </div>

      <div
        v-for="stat in rightStats"
        :key="stat.key"
        class="sb-stat"
        :style="cellStyle(stat.key)"
        :title="stat.label"
      >
        <span v-if="showLabels" class="sb-stat-label">{{ captionText(stat) }}</span>
        <div class="sb-stat-main">
          <img
            v-if="showIcons && stat.icon"
            :src="stat.icon"
            :alt="stat.label"
            class="sb-stat-icon"
          />
          <Icon
            v-else-if="showIcons && stat.gameIcon"
            :icon="stat.gameIcon"
            :width="iconPx"
            :height="iconPx"
            class="sb-stat-icon"
            :style="{ color: stat.color }"
          />
          <span class="sb-stat-value" :style="{ color: stat.color }">{{ stat.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  /* Nothing here is sized by CSS math: --sb-value-size, --sb-icon-size,
     --sb-label-size, --sb-cell-pad, --sb-icon-gap, --sb-row-gap, --sb-rank-slot
     and the crest's --sb-crest-w / --sb-title-size / --sb-status-size all arrive
     from the fit, measured against this very strip (see useScoreboardFit). */
  position: absolute;
  left: calc(440px * var(--hud-scale, 1));
  right: calc(440px * var(--hud-scale, 1));
  /* Starts exactly on the strip edge; the clearance to the frame stroke above
     it is the UNSCALED --sb-pad-top below — the stroke is unscaled too, so a
     scaled offset shrank the caption's air away on laptop viewports. */
  top: calc(var(--sb-strip-top, 364px) * var(--hud-scale, 1));
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  /* the fit budgets against exactly these paddings (STRIP_PAD_*_PX) */
  padding: var(--sb-pad-top, 7px) var(--sb-pad-x, 12px) var(--sb-pad-bottom, 4px);
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
.sb-stats:hover .sb-stat-icon {
  filter: brightness(1.15) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))
    drop-shadow(0 0 6px currentcolor);
}

/* Unified cell: big leading icon + [label above value] column, everything on
   one vertical center line. flex-basis stays 0 and the GROW weight carries the
   whole width decision — it is handed in per cell, proportional to what that
   cell's own text needs, so no cell hoards room a longer neighbour is missing. */
.sb-stat {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sb-row-gap, 3px);
  min-width: 0;
  padding-inline: var(--sb-cell-pad, 4px);
  /* a value crossing a digit boundary (999 → 1.0K) re-weights its cell; the
     ease keeps that a glide instead of a jump */
  transition: flex-grow 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.sb-stat + .sb-stat {
  border-left: 1px solid rgba(122, 78, 32, 0.3);
}

/* label sits ABOVE this row, so icon + value share the full cell width
   and the label is never squeezed beside the icon */
.sb-stat-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sb-icon-gap, 6px);
  min-width: 0;
  max-width: 100%;
}

.sb-stat-icon {
  /* as tall as the value row, capped by its share of the cell — the fit
     resolves both against the real strip, FHD → 2K → 4K */
  width: var(--sb-icon-size);
  height: var(--sb-icon-size);
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  transition:
    filter 0.2s ease,
    width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Win / loss cell ── */
.sb-stat-value.sb-wl-value.sb-wl-value--stacked {
  flex-direction: column;
  gap: 1px;
  line-height: 1.05;
  /* two lines share the row the others fill with one */
  font-size: var(--sb-stacked-size);
}
.sb-wl-win {
  color: #74d448;
}
.sb-wl-loss {
  color: #cc6050;
}
/* Slash, matching the cell's own "WIN / LOSS" label. Slightly smaller than the
   numbers so it separates them without competing with them. */
.sb-wl-sep {
  color: #7a6a44;
  font-size: 0.82em;
}

.sb-stat-value {
  display: flex;
  align-items: center;
  /* ONE size for every cell, measured — never estimated — against the real
     strip, so the numbers run as large as the tightest cell can hold and stay
     identical across all ten of them. No gap: the fit measures the rendered
     string, and a flex gap would be width the probe never saw. */
  font-size: var(--sb-value-size);
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  transition:
    filter 0.2s ease,
    font-size 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Rank is a short uppercase word, not a number — a touch of tracking keeps
   the capitals legible, and the div digit stays glued to its tier. */
.sb-rank-value {
  letter-spacing: 0.05em;
  font-weight: 700;
}

/* The emblem must not travel when the label beside it changes length — with a
   plain centered group, "GM" would pull it right and "BRON 3" push it left.
   Fix: the value sits left-aligned in a slot as wide as the WIDEST tier label
   (measured, then scaled to the shared value size). Emblem + gap + slot
   therefore measure the same for every tier, so the group stays centered in the
   cell while emblem and text start at a constant x — and the emblem-to-text
   distance is plain var(--sb-icon-gap), same as every other cell. */
.sb-stat--rank .sb-rank-value {
  flex: 0 1 auto;
  /* measured width of the widest tier label, at the shared value size */
  width: var(--sb-rank-slot);
  justify-content: flex-start;
  min-width: 0;
}

.sb-stat-label {
  /* The caption row is reserved before the numbers are sized and every cell is
     weighted wide enough for its own word — so it is never truncated and, on
     desktop widths, never dropped either. */
  font-size: var(--sb-label-size);
  letter-spacing: 0.16em;
  font-weight: 700;
  color: #c9a95c;
  text-transform: uppercase;
  line-height: var(--sb-label-line, 1.15);
  white-space: nowrap;
  max-width: 100%;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

/* ── Title crest ──
   Width and both line sizes come from the fit. The box is exactly as wide as
   the halves left over, and the line inside it is exactly as large as that box
   and the strip height allow — same measured logic as the cells, one line
   instead of caption + value, which is why the middle can run so much larger. */
.sb-crest {
  position: relative;
  flex: 0 0 auto;
  width: var(--sb-crest-w, 340px);
  height: 100%;
  /* em base for everything ornamental in here: the size of the line on show */
  font-size: var(--sb-crest-size, 24px);
  display: flex;
  align-items: center;
  justify-content: center;
  /* exactly the air the fit budgeted at both ends (SCOREBOARD_CREST.PAD_EM) */
  gap: var(--sb-crest-pad, 0.3em);
  pointer-events: none;
  user-select: none;
  /* a value crossing a digit boundary re-weights the cells and hands the crest
     a little more or less room — same glide the cells themselves use */
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

/* The line itself: natural width, centered, never wrapped. */
.sb-crest-slot {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.sb-crest-line {
  display: flex;
  align-items: center;
  gap: var(--sb-crest-gap, 0.32em);
  line-height: 1;
  white-space: nowrap;
  /* a phase whose text needs more room resizes the line — as a glide, like a
     stat cell crossing a digit boundary */
  transition: font-size 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.sb-crest-line--title {
  font-size: var(--sb-title-size, 30px);
}
.sb-crest-line--live {
  font-size: var(--sb-status-size, 18px);
}

/* ── Rails ──
   Pure leftover: flex:1 with min-width 0, so they take the width the line did
   not need and vanish rather than push it. A short line gets its flanking gold
   dashes, a long one gets the pixels instead. */
.sb-crest-rail {
  flex: 1 1 0;
  min-width: 0;
  max-width: var(--sb-crest-rail, 1.4em);
  height: max(2px, calc(3px * var(--hud-scale, 1)));
}
.sb-crest-rail--left {
  background: linear-gradient(90deg, transparent, #c89040);
}
.sb-crest-rail--right {
  background: linear-gradient(90deg, #c89040, transparent);
}

/* ── Phase progress ──
   Along the bottom edge, inside the slack the fit keeps below the line — it
   takes nothing from the text and shows how far the running phase has come. */
.sb-crest-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: max(2px, calc(3px * var(--hud-scale, 1)));
  overflow: hidden;
  background: #2a1a0a;
}
.sb-crest-progress-fill {
  display: block;
  height: 100%;
  /* grows from the middle outward, like the crest itself */
  transform-origin: center;
  /* 1s = the status clock's own tick, so it glides instead of stepping */
  transition:
    transform 1s linear,
    background 0.4s ease;
}

.sb-crest-star {
  width: var(--sb-crest-star, 0.58em);
  height: var(--sb-crest-star, 0.58em);
  flex-shrink: 0;
  object-fit: contain;
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.8));
}

.sb-title {
  letter-spacing: 0.22em;
  color: #e8c040;
  line-height: 1;
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
.sb-live-text {
  /* size comes from .sb-crest-line--live — the fit measured this very string */
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1;
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

/* Ornament leading the status — objective artwork or the phase's game-icon.
   Both stand in the same em box the fit budgeted for them. */
.sb-crest-glyph {
  width: var(--sb-crest-glyph, 1em);
  height: var(--sb-crest-glyph, 1em);
  flex-shrink: 0;
  object-fit: contain;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.9));
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
  /* Flicker-Animation aussetzen: sie animiert ebenfalls opacity und würde
     die Fade-Transition überschreiben (CSS-Animation schlägt Transition). */
  animation: none;
}
.crest-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.crest-swap-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* Stand-in for the phase glyph while the search runs — same em box, so the
   line measures identically whether it leads with dots or with an icon. */
.sb-scan-dots {
  width: var(--sb-crest-glyph, 1em);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.13em;
}

.sb-scan-dot {
  width: 0.2em;
  height: 0.2em;
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

/* ── Measuring probes ──
   Off-layout copies of the value / rank / label typography. The fit writes a
   string in, reads the width back and divides by the probe's font size to get
   an em width — true glyph widths instead of an assumed average. Hidden via
   visibility (not display:none) so they still lay out and can be measured. */
.sb-probes {
  position: absolute;
  top: 0;
  left: 0;
  height: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}
.sb-probes .sb-probe {
  position: absolute;
  white-space: pre;
  line-height: 1;
  /* The probes must measure the string, not the box: .sb-stat-label carries
     max-width: 100% and the probe host is a zero-width absolute box, which
     clamped every label measurement to 0 — the fit then believed the captions
     cost nothing in width and let them run into each other. */
  max-width: none;
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
  /* resizing cells snap instead of gliding */
  .sb-stat,
  .sb-stat-icon,
  .sb-stat-value,
  .sb-crest,
  .sb-crest-line,
  .sb-crest-progress-fill {
    transition: none;
  }
}
</style>
