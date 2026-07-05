<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { useBattleScoreboardStats } from '@/composables/useBattleScoreboardStats'
import { formatNumber } from '@/config/numberFormat'
import {
  GAME_STATE,
  OBJECTIVE_FIGHT_STATUS,
  SCOREBOARD_STAT_COLORS,
} from '@/config/constants'

const battleStore = useBattleStore()
const uiStore = useUiStore()

const {
  kills,
  deaths,
  assists,
  kdaStr,
  killPartPct,
  gold,
  cs,
  damage,
  dragons,
  barons,
} = useBattleScoreboardStats()

interface ScoreStat {
  key: string
  value: string
  color: string
  label: string
  icon?: string
}

const leftStats = computed<ScoreStat[]>(() => [
  { key: 'kills', value: formatNumber(kills.value), color: SCOREBOARD_STAT_COLORS.kills, label: 'Kills' },
  { key: 'deaths', value: formatNumber(deaths.value), color: SCOREBOARD_STAT_COLORS.deaths, label: 'Deaths' },
  { key: 'assists', value: formatNumber(assists.value), color: SCOREBOARD_STAT_COLORS.assists, label: 'Assists' },
  { key: 'kda', value: kdaStr.value, color: SCOREBOARD_STAT_COLORS.kda, label: 'KDA' },
  { key: 'killPart', value: `${killPartPct.value}%`, color: SCOREBOARD_STAT_COLORS.killPart, label: 'Kill %' },
])

const rightStats = computed<ScoreStat[]>(() => [
  { key: 'gold', value: formatNumber(gold.value), color: SCOREBOARD_STAT_COLORS.gold, label: 'Gold', icon: '/img/BardGold.png' },
  { key: 'cs', value: formatNumber(cs.value), color: SCOREBOARD_STAT_COLORS.cs, label: 'CS' },
  { key: 'dmg', value: formatNumber(damage.value), color: SCOREBOARD_STAT_COLORS.dmg, label: 'Dmg' },
  { key: 'dragons', value: formatNumber(dragons.value), color: SCOREBOARD_STAT_COLORS.dragons, label: 'Dragons', icon: '/img/dragon.png' },
  { key: 'barons', value: formatNumber(barons.value), color: SCOREBOARD_STAT_COLORS.barons, label: 'Barons', icon: '/img/baron.png' },
])

function openBattleTab() {
  uiStore.setBardTab('battle')
}

/* ══════════════════════════════════════════════════════════════════════
   Live battle-status line (compact, under the BARDLE crest) — ported
   from the previous bottom stats bar so no live info is lost.
   ══════════════════════════════════════════════════════════════════════ */
const {
  isAutoBattleInitialized,
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
</script>

<template>
  <div class="scoreboard">
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
        <span class="sb-stat-value" :style="{ color: stat.color }">
          <img v-if="stat.icon" :src="stat.icon" :alt="stat.label" class="sb-stat-icon" />
          {{ stat.value }}
        </span>
        <span class="sb-stat-bar" :style="{ background: stat.color }" />
        <span class="sb-stat-label">{{ stat.label }}</span>
      </div>
    </div>

    <!-- CENTER · title crest -->
    <div class="sb-crest">
      <div class="sb-crest-rule-row">
        <span class="sb-crest-rule sb-crest-rule--left" />
        <img src="/img/star.png" alt="" class="sb-crest-star" />
        <span class="sb-crest-rule sb-crest-rule--right" />
      </div>
      <div class="sb-title">BARDLE</div>

      <!-- compact live battle status where the old sublabel sat -->
      <div class="sb-status">
        <template v-if="objectiveFightDisplay">
          <img
            :src="objectiveFightDisplay.icon"
            :alt="objectiveFightDisplay.label"
            class="sb-status-icon"
            :class="{ 'sb-status-icon--live': !objectiveFightDisplay.resolved }"
          />
          <span class="sb-status-text" :style="{ color: objectiveFightDisplay.color }">
            {{ objectiveFightDisplay.label }} · {{ objectiveFightDisplay.text }}
          </span>
        </template>
        <template v-else-if="resultBadge">
          <Transition name="badge-slide" appear>
            <span
              class="sb-result-badge"
              :style="{ color: resultBadge.color, '--badge-glow': resultBadge.glow }"
            >
              {{ resultBadge.label }}&thinsp;{{ resultBadge.lp }}&thinsp;LP
            </span>
          </Transition>
        </template>
        <template v-else-if="gameStateDisplay">
          <span v-if="phaseKey === 'searching'" class="sb-scan-dots" aria-hidden="true">
            <span class="sb-scan-dot" />
            <span class="sb-scan-dot" />
            <span class="sb-scan-dot" />
          </span>
          <span class="sb-status-text" :style="{ color: gameStateDisplay.color }">
            {{ gameStateDisplay.label }} · {{ gameStateDisplay.text }}
          </span>
        </template>
      </div>
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
      <div v-for="stat in rightStats" :key="stat.key" class="sb-stat">
        <span class="sb-stat-value" :style="{ color: stat.color }">
          <img v-if="stat.icon" :src="stat.icon" :alt="stat.label" class="sb-stat-icon" />
          {{ stat.value }}
        </span>
        <span class="sb-stat-bar" :style="{ background: stat.color }" />
        <span class="sb-stat-label">{{ stat.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  /* scale typography with the HUD, but never below readable minimums */
  --sb-val-size: max(14px, calc(22px * var(--hud-scale, 1)));
  --sb-label-size: max(7px, calc(9px * var(--hud-scale, 1)));
  --sb-title-size: max(19px, calc(30px * var(--hud-scale, 1)));
  --sb-gap: max(10px, calc(20px * var(--hud-scale, 1)));

  position: absolute;
  left: calc(440px * var(--hud-scale, 1));
  right: calc(440px * var(--hud-scale, 1));
  top: calc(376px * var(--hud-scale, 1));
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(8px * var(--hud-scale, 1)) 28px 0;
  min-width: 0;
  pointer-events: none;
}

/* ── Stat groups ── */
.sb-stats {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--sb-gap);
  cursor: pointer;
  pointer-events: auto;
  border-radius: 4px;
}
.sb-stats--left {
  justify-content: flex-end;
}
.sb-stats--right {
  justify-content: flex-start;
}
.sb-stats:focus-visible {
  outline: none;
}
.sb-stats:hover .sb-stat-value {
  filter: brightness(1.15) drop-shadow(0 0 6px currentcolor);
}

.sb-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.sb-stat-value {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--sb-val-size);
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  transition: filter 0.2s ease;
}

.sb-stat-icon {
  width: max(13px, calc(19px * var(--hud-scale, 1)));
  height: max(13px, calc(19px * var(--hud-scale, 1)));
  object-fit: contain;
  flex-shrink: 0;
}

.sb-stat-bar {
  width: 22px;
  height: 2px;
  border-radius: 2px;
  opacity: 0.9;
}

.sb-stat-label {
  font-size: var(--sb-label-size);
  letter-spacing: 0.14em;
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
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 max(12px, calc(24px * var(--hud-scale, 1)));
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

/* ── Live battle status line ── */
.sb-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: max(10px, calc(13px * var(--hud-scale, 1)));
  line-height: 1;
}

.sb-status-text {
  font-size: max(8px, calc(10px * var(--hud-scale, 1)));
  letter-spacing: 0.18em;
  text-transform: uppercase;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  transition: color 0.4s ease;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.sb-status-icon {
  width: max(10px, calc(14px * var(--hud-scale, 1)));
  height: max(10px, calc(14px * var(--hud-scale, 1)));
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

.sb-result-badge {
  font-size: max(9px, calc(11px * var(--hud-scale, 1)));
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.14em;
  text-shadow: 0 0 8px var(--badge-glow, rgba(116, 212, 72, 0.6));
}

.badge-slide-enter-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.badge-slide-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.badge-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.badge-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.sb-scan-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
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

@media (prefers-reduced-motion: reduce) {
  .sb-title,
  .sb-status-icon--live,
  .sb-scan-dot {
    animation: none;
  }
}
</style>
