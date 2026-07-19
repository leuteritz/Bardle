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
  BATTLE_RESULT_COUNTDOWN_SECONDS,
  OBJECTIVE_FIGHT_STATUS,
  SCOREBOARD_STAT_COLORS,
  RANK_EMBLEM_IMAGES,
  RANK_TIER_COLORS,
  BATTLE_STAT_GAME_ICONS,
  BATTLE_STAT_IMAGES,
} from '@/config/constants'
import { DRAKE_TYPES } from '@/config/drakes'

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
  { key: 'kills', value: formatNumber(kills.value), color: SCOREBOARD_STAT_COLORS.kills, label: 'Kills', gameIcon: BATTLE_STAT_GAME_ICONS.kills },
  { key: 'deaths', value: formatNumber(deaths.value), color: SCOREBOARD_STAT_COLORS.deaths, label: 'Deaths', gameIcon: BATTLE_STAT_GAME_ICONS.deaths },
  { key: 'assists', value: formatNumber(assists.value), color: SCOREBOARD_STAT_COLORS.assists, label: 'Assists', gameIcon: BATTLE_STAT_GAME_ICONS.assists },
  { key: 'gold', value: formatNumber(gold.value), color: SCOREBOARD_STAT_COLORS.gold, label: 'Gold', icon: BATTLE_STAT_IMAGES.gold },
  { key: 'cs', value: formatNumber(cs.value), color: SCOREBOARD_STAT_COLORS.cs, label: 'CS', gameIcon: BATTLE_STAT_GAME_ICONS.cs },
])

const rightStats = computed<ScoreStat[]>(() => [
  { key: 'turrets', value: formatNumber(turrets.value), color: SCOREBOARD_STAT_COLORS.turrets, label: 'Turrets', gameIcon: BATTLE_STAT_GAME_ICONS.turrets },
  { key: 'dragons', value: formatNumber(dragons.value), color: SCOREBOARD_STAT_COLORS.dragons, label: 'Dragons', icon: BATTLE_STAT_IMAGES.dragons },
  { key: 'barons', value: formatNumber(barons.value), color: SCOREBOARD_STAT_COLORS.barons, label: 'Barons', icon: BATTLE_STAT_IMAGES.barons },
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

/* ── Overflow guard: the LONGEST numeric value across the stat cells sets
   one shared char count on the scoreboard root, so all numbers shrink
   together and stay the same size (see .sb-stat-value). The rank cell is
   deliberately excluded: its long tier names ("Grandmaster") would drag
   every number down — it is wider (flex 1.6) and fits its own text via a
   local --val-chars override. ── */
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
    ...leftStats.value.map((s) => s.value.length),
    ...rightStats.value.map((s) => s.value.length),
    wlChars.value,
  ),
)
const rankChars = computed(() => rankLabel.value.length)

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
  activeDrakeType,
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

/** Kompaktes m:ss ohne führende Null bei den Minuten ("0:04", "12:00"). */
function shortTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

const gameStateDisplay = computed(() => {
  const _now = now.value
  if (
    searchingPhaseStartTimestamp.value > 0 &&
    !showAutoBattleResult.value &&
    battlePhaseStartTimestamp.value === 0
  ) {
    // max(0, …): der 1s-now-Ticker kann beim Klick noch hinter dem frisch
    // gesetzten Timestamp liegen — ohne Clamp stünde kurz "-1:-1" im Titel.
    const elapsed = Math.min(
      5,
      Math.max(0, Math.floor((_now - searchingPhaseStartTimestamp.value) / 1000)),
    )
    return {
      text: `${GAME_STATE.SEARCHING.label} · ${shortTime(elapsed)}`,
      color: GAME_STATE.SEARCHING.color,
    }
  }
  if (!isAutoBattleInitialized.value) {
    return null
  }
  if (showAutoBattleResult.value) {
    // Countdown wie im Honor-Screen des Battle-Tabs: von 8 runter auf 0,
    // bei 0 beginnt die nächste Planet-Search-Phase
    const elapsed = Math.max(0, Math.floor((_now - resultPhaseStartTimestamp.value) / 1000))
    const remaining = Math.max(0, BATTLE_RESULT_COUNTDOWN_SECONDS - elapsed)
    return {
      text: `${GAME_STATE.HONOR.label} · ${shortTime(remaining)}`,
      color: GAME_STATE.HONOR.color,
    }
  }
  if (battlePhase.value === 'playing' && battlePhaseStartTimestamp.value > 0) {
    // Spielzeit tickt in Minutenschritten (60x-Zeitraffer) — Sekunden wären Rauschen
    return {
      text: `${GAME_STATE.BATTLE.label} · ${Math.floor(battleTime.value / 60)}:00`,
      color: GAME_STATE.BATTLE.color,
    }
  }
  return null
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
  if (
    resultPhaseStartTimestamp.value > 0 &&
    now.value - resultPhaseStartTimestamp.value > RESULT_BADGE_MS
  )
    return null
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
      : (gameStateDisplay.value?.text ?? GAME_STATE.SEARCHING.label))
  return text.length + 2
})
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
      <div v-for="stat in leftStats" :key="stat.key" class="sb-stat" :title="stat.label">
        <span class="sb-stat-label">{{ stat.label }}</span>
        <div class="sb-stat-main">
          <img v-if="stat.icon" :src="stat.icon" :alt="stat.label" class="sb-stat-icon" />
          <Icon
            v-else-if="stat.gameIcon"
            :icon="stat.gameIcon"
            width="32"
            height="32"
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
            <span v-if="phaseKey === 'searching'" class="sb-scan-dots sb-scan-dots--big" aria-hidden="true">
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
      <!-- Rank cell: emblem + tier-colored value; wider + own text fit -->
      <div class="sb-stat sb-stat--rank" title="Rank">
        <span class="sb-stat-label">Rank</span>
        <div class="sb-stat-main">
          <img :src="rankEmblem" :alt="rankLabel" class="sb-stat-icon" />
          <span
            class="sb-stat-value"
            :style="{ color: rankColor, '--val-chars': rankChars }"
          >
            {{ rankLabel }}
          </span>
        </div>
      </div>

      <!-- Win / loss cell: two-tone value -->
      <div class="sb-stat" title="Win / Loss">
        <span class="sb-stat-label">Win / Loss</span>
        <div class="sb-stat-main">
          <Icon
            :icon="BATTLE_STAT_GAME_ICONS.winLoss"
            width="32"
            height="32"
            class="sb-stat-icon"
            style="color: #e8c040"
          />
          <span
            class="sb-stat-value sb-wl-value"
            :class="{ 'sb-wl-value--stacked': wlStacked }"
          >
            <span class="sb-wl-win">{{ formatNumber(totalWins) }}W</span>
            <span v-if="!wlStacked" class="sb-wl-sep">·</span>
            <span class="sb-wl-loss">{{ formatNumber(totalLosses) }}L</span>
          </span>
        </div>
      </div>

      <div v-for="stat in rightStats" :key="stat.key" class="sb-stat" :title="stat.label">
        <span class="sb-stat-label">{{ stat.label }}</span>
        <div class="sb-stat-main">
          <img v-if="stat.icon" :src="stat.icon" :alt="stat.label" class="sb-stat-icon" />
          <Icon
            v-else-if="stat.gameIcon"
            :icon="stat.gameIcon"
            width="32"
            height="32"
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
  /* typography tracks the strip's own width (container queries), so cells
     can never overlap the crest and wide viewports are used fully */
  --sb-val-size: clamp(13px, 2.1cqw, 26px);
  --sb-label-size: clamp(9px, 1.1cqw, 13px);
  --sb-title-size: clamp(16px, 2.5cqw, 30px);
  /* width-fluid, but also capped by the strip's real height (79px ×
     hud-scale) minus the label row — short strips (ultrawide FHD) get
     smaller icons instead of clipping */
  --sb-icon-size: min(clamp(22px, 3cqw, 46px), calc(var(--bottom-center-strip-h, 79px) - 32px));
  --sb-gap: clamp(6px, 0.7cqw, 12px);
  --sb-crest-w: clamp(160px, 24cqw, 300px);
  /* width of one stat half (left/right group), used to derive the real
     per-cell text budget for the value font-size fit */
  --sb-half-w: calc((100cqw - var(--sb-crest-w) - 24px) / 2);

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
.sb-stats:hover .sb-stat-icon {
  filter: brightness(1.15) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))
    drop-shadow(0 0 6px currentcolor);
}

/* Unified cell: big leading icon + [label above value] column, everything
   on one vertical center line. Flex bases are static per breakpoint, so
   value/mode changes can never shift the group widths. */
.sb-stat {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(3px, 0.4cqw, 6px);
  min-width: 0;
  padding-inline: clamp(2px, 0.5cqw, 10px);
  /* text budget: cell width minus leading icon, gap and paddings — the
     value font-size fit below is computed against this real room */
  --sb-cell-w: calc(var(--sb-half-w) / 5);
  --sb-text-w: calc(var(--sb-cell-w) - var(--sb-icon-size) - var(--sb-gap) - clamp(4px, 1cqw, 20px));
}
.sb-stat + .sb-stat {
  border-left: 1px solid rgba(122, 78, 32, 0.3);
}

/* Rank holds long tier names ("Grandmaster") — wider cell so it never
   squeezes the numeric cells; its neighbors on the right side share the
   rest (5.6 flex units per half → cell budgets below match) */
.sb-stats--right .sb-stat {
  --sb-cell-w: calc(var(--sb-half-w) / 5.6);
}
.sb-stat--rank {
  flex-grow: 1.6;
  --sb-cell-w: calc(var(--sb-half-w) / 5.6 * 1.6);
}

/* label sits ABOVE this row, so icon + value share the full cell width
   and the label is never squeezed beside the icon */
.sb-stat-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sb-gap);
  min-width: 0;
  max-width: 100%;
}

.sb-stat-icon {
  /* fills the strip height on every desktop width: scales with the
     scoreboard's own width (container query units), FHD → 2K → 4K */
  width: var(--sb-icon-size);
  height: var(--sb-icon-size);
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  transition: filter 0.2s ease;
}

/* ── Win / loss cell ── */
.sb-stat-value.sb-wl-value.sb-wl-value--stacked {
  flex-direction: column;
  gap: 1px;
  line-height: 1.05;
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
  /* never wider than the cell: the shared char count (--val-chars, bound
     from the template; rank overrides it locally) divides the cell's real
     text budget. 0.62em ≈ average glyph width of the tabular digits. */
  font-size: min(
    var(--sb-val-size),
    max(10px, calc(var(--sb-text-w) / (var(--val-chars, 4) * 0.62)))
  );
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  transition: filter 0.2s ease;
}

.sb-stat-label {
  /* auto-fit instead of ellipsis: sized so the longest label ("WIN / LOSS",
     10 glyphs ≈ 9em incl. letter-spacing) always fits the cell — labels are
     never truncated, on any resolution */
  font-size: min(var(--sb-label-size), calc((var(--sb-cell-w) - 8px) / 9));
  letter-spacing: 0.16em;
  font-weight: 700;
  color: #c9a95c;
  text-transform: uppercase;
  line-height: 1;
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

/* Full-HD-wide strips: the icon becomes the label — drop the small-caps
   text row (each cell keeps its title tooltip), center icon + value on
   one line. Uncramped and the icons stay visible. */
@container (max-width: 1300px) {
  .sb-stat-label {
    display: none;
  }
  .sb-stat {
    /* no label row above — the icon may use almost the full strip height */
    --sb-icon-size: min(clamp(22px, 3cqw, 46px), calc(var(--bottom-center-strip-h, 79px) - 16px));
  }
  .sb-title {
    letter-spacing: 0.18em;
    padding-left: 0.18em;
  }
}

/* very narrow strips (small laptops): icons go too, numbers stay */
@container (max-width: 900px) {
  .sb-stat-icon {
    display: none;
  }
  .sb-stat {
    /* no icon anymore — give its room back to the text budget */
    --sb-text-w: calc(var(--sb-cell-w) - clamp(4px, 1cqw, 20px));
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
