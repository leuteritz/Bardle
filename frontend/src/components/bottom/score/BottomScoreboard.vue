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
} from '@/composables/useScoreboardFit'
import { formatNumber } from '@/config/numberFormat'
import {
  BATTLE_PHASES,
  OBJECTIVE_FIGHT_STATUS,
  SCOREBOARD_STAT_COLORS,
  SCOREBOARD_FIT,
  SCOREBOARD_CELL_LABELS,
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
const leftRef = ref<HTMLElement | null>(null)
const rightRef = ref<HTMLElement | null>(null)
const probeValueRef = ref<HTMLElement | null>(null)
const probeRankRef = ref<HTMLElement | null>(null)
const probeLabelRef = ref<HTMLElement | null>(null)

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

const { fit } = useScoreboardFit({
  root: rootRef,
  left: leftRef,
  right: rightRef,
  probes: { value: probeValueRef, rank: probeRankRef, label: probeLabelRef },
  cells: fitCells,
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
  /* the caption's line box is exactly the band the fit reserved for it, so the
     letters sit inside it instead of painting over its edges */
  '--sb-label-line': String(SCOREBOARD_FIT.LABEL_LINE_FACTOR),
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

/* ══════════════════════════════════════════════════════════════════════
   Live battle-status line (compact, under the BARDLE crest) — ported
   from the previous bottom stats bar so no live info is lost.
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
const { phase: phaseKey, config: phaseConfig, elapsedMs, remainingSeconds } = useBattlePhase(1000)

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
      return { text: `${label} · ${shortTime(elapsed)}`, color }
    }
    case 'loading':
      // counts down to the rift opening, same clock the loading screen shows
      return { text: `${label} · ${shortTime(remainingSeconds.value)}`, color }
    case 'battle':
      // Spielzeit tickt in Minutenschritten (60x-Zeitraffer) — Sekunden wären Rauschen
      return { text: `${label} · ${Math.floor(battleTime.value / 60)}:00`, color }
    case 'honor':
      // Countdown wie im Honor-Screen des Battle-Tabs: bei 0 beginnt die
      // nächste Planet-Search-Phase
      return { text: `${label} · ${shortTime(remainingSeconds.value)}`, color }
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
      : 'Baron'
  if (objectiveResult.value !== null) {
    const won = objectiveResult.value !== 'enemy'
    return {
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
    icon: image,
    text: `${name} · ${hpPct}%`,
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
    label: won ? 'Win' : 'Lose',
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

/** Zeichenzahl des aktiven Status (+2 für Icon/Scan-Dots) — bindet die
 *  Schriftgröße an die Textlänge, damit jeder Status in den Crest passt. */
const liveChars = computed(() => {
  const text =
    objectiveFightDisplay.value?.text ??
    (resultBadge.value
      ? `${resultBadge.value.label} ${resultBadge.value.lp} LP`
      : (gameStateDisplay.value?.text ?? BATTLE_PHASES.searching.label))
  return text.length + 2
})
</script>

<template>
  <div ref="rootRef" class="scoreboard" :style="fitVars">
    <!-- Hidden probes: the fit renders each string here once, at a known size,
         to learn its true width (see useScoreboardFit). -->
    <div class="sb-probes" aria-hidden="true">
      <span ref="probeValueRef" class="sb-stat-value sb-probe" :style="probeStyle" />
      <span ref="probeRankRef" class="sb-stat-value sb-rank-value sb-probe" :style="probeStyle" />
      <span ref="probeLabelRef" class="sb-stat-label sb-probe" :style="probeStyle" />
    </div>

    <!-- LEFT · combat stats -->
    <div
      ref="leftRef"
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

    <!-- CENTER · title crest -->
    <div class="sb-crest">
      <div class="sb-crest-rule-row">
        <span class="sb-crest-rule sb-crest-rule--left" />
        <img src="/img/star.png" alt="" class="sb-crest-star" />
        <span class="sb-crest-rule sb-crest-rule--right" />
      </div>
      <!-- title slot: game title when idle, promoted live status when active -->
      <!-- type="transition": .sb-title trägt eine infinite Flicker-Animation (6s);
           ohne explizites type wartet Vue auf deren animationend, das nie feuert,
           und der Swap hängt bis zum 6s-Fallback-Timeout. -->
      <Transition name="crest-swap" mode="out-in" type="transition">
        <div
          v-if="hasLiveStatus"
          key="live"
          class="sb-live-title"
          :style="{ '--live-chars': liveChars }"
        >
          <template v-if="objectiveFightDisplay">
            <img
              :src="objectiveFightDisplay.icon"
              alt=""
              class="sb-live-icon"
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
              {{ resultBadge.label }}&thinsp;{{ resultBadge.lp }}&thinsp;LP
            </span>
          </template>
          <template v-else-if="gameStateDisplay">
            <!-- the loading phase gets its registry icon, the search its scan dots -->
            <Icon
              v-if="phaseKey === 'loading' && phaseConfig.icon"
              :icon="phaseConfig.icon"
              width="24"
              height="24"
              class="sb-live-glyph sb-status-icon--live"
              :style="{ color: phaseConfig.color }"
            />
            <span
              v-else-if="phaseKey === 'searching'"
              class="sb-scan-dots sb-scan-dots--big"
              aria-hidden="true"
            >
              <span class="sb-scan-dot" />
              <span class="sb-scan-dot" />
              <span class="sb-scan-dot" />
            </span>
            <span class="sb-live-text" :style="{ color: gameStateDisplay.color }">
              {{ gameStateDisplay.text }}
            </span>
          </template>
          <!-- fallback: battle loop is live but no phase display yet -->
          <template v-else>
            <span class="sb-scan-dots sb-scan-dots--big" aria-hidden="true">
              <span class="sb-scan-dot" />
              <span class="sb-scan-dot" />
              <span class="sb-scan-dot" />
            </span>
            <span class="sb-live-text" :style="{ color: BATTLE_PHASES.searching.color }">
              {{ BATTLE_PHASES.searching.label }}
            </span>
          </template>
        </div>
        <div v-else key="title" v-ink-center class="sb-title">BARDLE</div>
      </Transition>
    </div>

    <!-- RIGHT · economy / objective stats -->
    <div
      ref="rightRef"
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
  /* The stat halves are sized by measurement, not by CSS math: --sb-value-size,
     --sb-icon-size, --sb-label-size, --sb-cell-pad, --sb-icon-gap, --sb-row-gap
     and --sb-rank-slot all arrive from the fit (see useScoreboardFit). Only the
     crest still scales off the container's width — it holds prose, not numbers. */
  --sb-title-size: clamp(16px, 2.5cqw, 30px);
  --sb-crest-w: clamp(160px, 24cqw, 300px);

  position: absolute;
  left: calc(440px * var(--hud-scale, 1));
  right: calc(440px * var(--hud-scale, 1));
  /* Starts exactly on the strip edge; the clearance to the frame stroke above
     it is the UNSCALED --sb-pad-top below — the stroke is unscaled too, so a
     scaled offset shrank the caption's air away on laptop viewports. */
  top: calc(var(--sb-strip-top, 364px) * var(--hud-scale, 1));
  bottom: 0;
  z-index: 2;
  container-type: inline-size;
  display: flex;
  align-items: center;
  justify-content: center;
  /* the fit budgets against exactly these paddings (STRIP_PAD_TOP/BOTTOM_PX) */
  padding: var(--sb-pad-top, 7px) 12px var(--sb-pad-bottom, 4px);
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

/* ── Title crest ── */
.sb-crest {
  /* fluid width, fixed per viewport size: sized for the longest live status
     so nothing around it ever shifts when the text or mode changes */
  flex: 0 0 auto;
  width: var(--sb-crest-w);
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
  /* Längenabhängig: lange Status (z. B. "Planet Search · 0:04") schrumpfen so
     weit, dass sie immer in die Crest-Breite (clamp unten = .sb-crest width)
     passen; kurze ("Battle · 12:00") behalten die volle Größe. 0.75em ≈
     mittlere Zeichenbreite der Uppercase-Schrift inkl. letter-spacing. */
  font-size: min(
    clamp(12px, 1.7cqw, 21px),
    max(10px, calc((var(--sb-crest-w) - 24px) / (var(--live-chars, 16) * 0.75)))
  );
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

/* Phase glyph (game-icons) in the same slot as .sb-live-icon */
.sb-live-glyph {
  width: clamp(14px, 1.9cqw, 24px);
  height: clamp(14px, 1.9cqw, 24px);
  flex-shrink: 0;
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

/* Narrow strips get tighter title tracking — the stat cells need no breakpoint
   any more, the fit resolves them from the measured geometry. */
@container (max-width: 1300px) {
  .sb-title {
    letter-spacing: 0.18em;
    padding-left: 0.18em;
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
  .sb-stat-value {
    transition: none;
  }
}
</style>
