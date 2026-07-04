<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { useUiStore } from '@/stores/uiStore'
import { ROLES, GAME_STATE, OBJECTIVE_FIGHT_STATUS } from '@/config/constants'

const battleStore = useBattleStore()
const roleBehaviorStore = useRoleBehaviorStore()
const uiStore = useUiStore()

function fmtCd(ms: number): string {
  const s = Math.ceil(ms / 1000)
  if (s <= 0) return ''
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

const roleAbilities = computed(() =>
  ROLES.map((roleData, i) => {
    const role = roleData.key
    const hasChampion = battleStore.headerSlots[i] != null
    let cdMs = 0
    let isFlashing = false

    if (role === 'top') {
      cdMs = roleBehaviorStore.tankShieldBrokenMs
      isFlashing = roleBehaviorStore.tankShieldActive && cdMs <= 0
    } else if (role === 'jungle') {
      cdMs = roleBehaviorStore.jungleBuffCooldownMs
      isFlashing = roleBehaviorStore.jungleBuffFlashActive
    } else if (role === 'mid') {
      cdMs = roleBehaviorStore.midCurseCooldownMs
      isFlashing = roleBehaviorStore.midCurseFlashActive
    } else if (role === 'adc') {
      cdMs = roleBehaviorStore.adcBurstCooldownMs
      isFlashing = roleBehaviorStore.adcBurstActive
    } else {
      cdMs = roleBehaviorStore.supportHealCooldownMs
      isFlashing = roleBehaviorStore.supportPlanetHealActive
    }

    return {
      role,
      image: roleData.image,
      short: roleData.short,
      color: roleData.orbit.color,
      hasChampion,
      onCooldown: cdMs > 0 && !isFlashing,
      timer: fmtCd(cdMs),
      isFlashing,
    }
  }),
)

const {
  currentRank,
  totalWins,
  totalLosses,
  isAutoBattleInitialized,
  currentWinProbability,
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

// ── Phase tracking for transition flash animation ──────────────────────
type PhaseKey = 'idle' | 'searching' | 'battle' | 'honor'

const phaseKey = computed<PhaseKey>(() => {
  if (!isAutoBattleInitialized.value) return 'idle'
  if (showAutoBattleResult.value) return 'honor'
  if (battlePhase.value === 'playing' && battlePhaseStartTimestamp.value > 0) return 'battle'
  if (searchingPhaseStartTimestamp.value > 0 && battlePhaseStartTimestamp.value === 0)
    return 'searching'
  return 'idle'
})


// ── Game-state display (timer + phase label) ───────────────────────────
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
    return { label: '', text: '—', color: '#6a4418' }
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
  return { label: '', text: '—', color: '#6a4418' }
})

// ── Objective-fight display (drake/baron — replaces the frozen timer) ──
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

// ── Last-result badge (shown during honor phase) ───────────────────────
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

// ── Rank ──────────────────────────────────────────────────────────────
const rankLabel = computed(() => {
  const { tier, division } = currentRank.value
  if (tier === 'Master' || tier === 'Grandmaster' || tier === 'Challenger') return tier
  return `${tier} ${division}`
})

const lpValue = computed(() => currentRank.value.lp)

const RANK_IMAGE_MAP: Record<string, string> = {
  Iron: '/img/RankBorder/RankIron.png',
  Bronze: '/img/RankBorder/RankBronze.png',
  Silver: '/img/RankBorder/RankSilver.png',
  Gold: '/img/RankBorder/RankGold.png',
  Platinum: '/img/RankBorder/RankPlatin.png',
  Emerald: '/img/RankBorder/RankEmerald.png',
  Diamond: '/img/RankBorder/RankDiamand.png',
  Master: '/img/RankBorder/RankMaster.png',
  Grandmaster: '/img/RankBorder/RankGrandMaster.png',
  Challenger: '/img/RankBorder/RankChallenger.png',
}

const RANK_GLOW_MAP: Record<string, string> = {
  Iron: '#a8a09a',
  Bronze: '#cd7f4f',
  Silver: '#b8cdd6',
  Gold: '#f0b429',
  Platinum: '#4dd0b8',
  Emerald: '#4caf76',
  Diamond: '#6ec6f0',
  Master: '#b566e8',
  Grandmaster: '#e84040',
  Challenger: '#a8d8f0',
}

const rankImage = computed(() => RANK_IMAGE_MAP[currentRank.value.tier] ?? '/img/RankBorder/RankIron.png')

const rankGlowColor = computed(() => RANK_GLOW_MAP[currentRank.value.tier] ?? '#a8a09a')

const rankIconFilter = computed(() => {
  const c = rankGlowColor.value
  return `drop-shadow(0 0 4px ${c}) drop-shadow(0 0 8px ${c}80)`
})

// ── Win chance ────────────────────────────────────────────────────────
const liveWinChance = computed<number | null>(() => {
  if (!isAutoBattleInitialized.value) return null

  if (battleStore.battlePhase === 'result') {
    return battleStore.predeterminedWin ? 100 : 0
  }

  const base = currentWinProbability.value
  const t1Kills = battleStore.team1.reduce((s, c) => s + c.kills, 0)
  const t2Kills = battleStore.team2.reduce((s, c) => s + c.kills, 0)
  const totalK = t1Kills + t2Kills
  const killAdj = totalK > 0 ? ((t1Kills - t2Kills) / totalK) * 0.25 : 0

  let objAdj = 0
  if (battleStore.drakeKilledByTeam === 1) objAdj += 0.05
  else if (battleStore.drakeKilledByTeam === 2) objAdj -= 0.05
  if (battleStore.baronKilledByTeam === 1) objAdj += 0.08
  else if (battleStore.baronKilledByTeam === 2) objAdj -= 0.08

  return Math.round(Math.max(0.05, Math.min(0.95, base + killAdj + objAdj)) * 100)
})

const winChanceColor = computed(() => {
  const v = liveWinChance.value
  if (v === null) return '#888888'
  if (v <= 0) return '#cc6050'
  if (v >= 100) return '#74d448'
  if (v >= 60) return '#74d448'
  if (v >= 40) return '#e8c040'
  return '#cc6050'
})
</script>

<template>
  <div class="stats-grid">
    <!-- LEFT: Role Abilities -->
    <div class="bbstats">
      <template v-for="(ab, idx) in roleAbilities" :key="ab.role">
        <div v-if="idx > 0" class="bbstat-divider" />
        <div
          class="bbstat-item ability-slot"
          :class="{
            'ability-slot--cooldown': ab.onCooldown && ab.hasChampion,
            'ability-slot--flash': ab.isFlashing,
            'ability-slot--inactive': !ab.hasChampion,
          }"
          :style="{ '--role-color': ab.color }"
          role="button"
          tabindex="0"
          @click="uiStore.requestOpenRolesTab(idx)"
          @keydown.enter="uiStore.requestOpenRolesTab(idx)"
          @keydown.space.prevent="uiStore.requestOpenRolesTab(idx)"
        >
          <img :src="ab.image" :alt="ab.short" class="ability-role-icon" />
          <span class="bbstat-label ability-label">{{ ab.short }}</span>
          <span class="ability-cd-wrap">
            <span class="ability-cd-val" aria-hidden="true">
              {{ ab.hasChampion ? ab.timer || '' : '' }}
            </span>
            <span class="ability-cd-ghost" aria-hidden="true">59s</span>
          </span>
        </div>
      </template>
    </div>

    <!-- CENTER: Title -->
    <div class="title-center">BARDLE</div>

    <!-- RIGHT: Stats -->
    <div
      class="stats-right"
      role="button"
      tabindex="0"
      title="Open Battle Stats"
      @click="uiStore.setBardTab('battle')"
      @keydown.enter="uiStore.setBardTab('battle')"
      @keydown.space.prevent="uiStore.setBardTab('battle')"
    >
      <!-- RANK (always visible) -->
      <div class="bbstat-item rank-slot">
        <div class="rank-slot-inner">
          <span class="bbstat-val">{{ rankLabel }}</span>
          <span class="bbstat-label">RANK</span>
          <img
            :src="rankImage"
            :alt="currentRank.tier"
            class="bbstat-stat-icon bbstat-rank-icon"
            :style="{ filter: rankIconFilter }"
          />
        </div>
      </div>
      <div class="bbstat-divider" />

      <!-- LP -->
      <div class="bbstat-item">
        <span class="bbstat-val bbstat-val--gold">{{ lpValue }}</span>
        <span class="bbstat-label">LP</span>
        <img src="/img/stats/lp.png" alt="lp" class="bbstat-stat-icon" />
      </div>
      <div class="bbstat-divider" />

      <!-- W/L -->
      <div class="bbstat-item">
        <span class="bbstat-val bbstat-val--win">{{ totalWins }}</span>
        <span class="bbstat-sep">/</span>
        <span class="bbstat-val bbstat-val--loss">{{ totalLosses }}</span>
        <span class="bbstat-label">W/L</span>
        <img src="/img/stats/winloose.png" alt="w/l" class="bbstat-stat-icon" />
      </div>
      <div class="bbstat-divider" />

      <!-- BATTLE STATUS — phase + opponent + timer -->
      <div
        class="bbstat-item battle-status"
      >
        <!-- Objective fight (drake/baron) — HP race replaces the frozen timer -->
        <template v-if="objectiveFightDisplay">
          <span
            class="battle-timer"
            :style="{ color: objectiveFightDisplay.color }"
          >{{ objectiveFightDisplay.text }}</span>
          <span class="bbstat-label">{{ objectiveFightDisplay.label }}</span>
          <img
            :src="objectiveFightDisplay.icon"
            :alt="objectiveFightDisplay.label"
            class="bbstat-stat-icon"
            :class="{ 'objective-icon--live': !objectiveFightDisplay.resolved }"
          />
        </template>

        <template v-else>
          <!-- Honor result badge -->
          <Transition name="badge-slide">
            <span
              v-if="resultBadge"
              class="result-badge"
              :style="{ color: resultBadge.color, '--badge-glow': resultBadge.glow }"
            >
              {{ resultBadge.label }}&thinsp;{{ resultBadge.lp }}&thinsp;LP
            </span>
          </Transition>

          <!-- Searching pulse dots -->
          <span v-if="phaseKey === 'searching'" class="scan-dots" aria-hidden="true">
            <span class="scan-dot" />
            <span class="scan-dot" />
            <span class="scan-dot" />
          </span>

          <!-- Phase + timer -->
          <span
            class="battle-timer"
            :style="{ color: gameStateDisplay.color }"
          >{{ gameStateDisplay.text }}</span>

          <img src="/img/stats/gamestate.png" alt="state" class="bbstat-stat-icon" />
        </template>
      </div>
      <div class="bbstat-divider" />

      <!-- WIN% -->
      <div class="bbstat-item">
        <span class="bbstat-val" :style="{ color: winChanceColor, transition: 'color 0.4s ease' }">
          {{ liveWinChance !== null ? liveWinChance + '%' : '—' }}
        </span>
        <span class="bbstat-label">WIN%</span>
        <img
          src="/img/stats/winchance.png"
          alt="win%"
          class="bbstat-stat-icon"
          :style="{ filter: `drop-shadow(0 0 3px ${winChanceColor})` }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  --stat-val-size: 22px;
  --label-size: 22px;
  --icon-size: 15px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
}

.bbstats {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr auto 1fr;
  align-items: center;
  width: 100%;
  overflow: visible;
  padding-inline-end: 16px;
}

.stats-right {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr auto 1fr;
  align-items: center;
  width: 100%;
  overflow: visible;
  padding-inline-start: 16px;
  position: relative;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.18s ease;
}

.stats-right:focus-visible {
  outline: none;
}

.bbstat-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.bbstat-stat-icon {
  width: 35px;
  height: 35px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(200, 140, 40, 0.7));
  transition: filter 0.4s ease;
}

.bbstat-rank-icon {
  width: 42px;
  height: 42px;
  transition: filter 0.5s ease;
}

.bbstat-divider {
  width: 1px;
  height: 20px;
  margin-inline: 3px;
  background: linear-gradient(
    to bottom,
    transparent,
    #5c3210 30%,
    #7a4818 50%,
    #5c3210 70%,
    transparent
  );
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.bbstat-icon {
  font-size: var(--icon-size);
  color: #9a6830;
  line-height: 1;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(200, 140, 40, 0.7));
}

/* ── Label: hidden by default, shown on hover ────────────────────────── */
.bbstat-label {
  font-size: var(--label-size);
  color: #6a4418;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  line-height: 1;
  flex-shrink: 0;
  white-space: nowrap;
  display: inline-block;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    max-width 0.22s ease,
    opacity 0.18s ease;
}

.stats-grid:hover .bbstat-label {
  max-width: 120px;
  opacity: 1;
}

/* ── Ability label colors on hover ──────────────────────────────────── */
.stats-grid:hover
  .ability-slot:not(.ability-slot--cooldown):not(.ability-slot--flash):not(.ability-slot--inactive)
  .ability-label {
  color: var(--role-color, #e8c040);
  text-shadow: 0 0 5px var(--role-color, #e8c040);
}

.stats-grid:hover .ability-slot--cooldown .ability-label {
  color: #6a4418;
  text-shadow: none;
}

.bbstat-val {
  font-size: var(--stat-val-size);
  color: #d4a838;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow:
    0 0 4px rgba(220, 170, 50, 0.8),
    0 0 10px rgba(200, 140, 30, 0.5);
}
.bbstat-val--gold {
  color: #fbbf24;
  text-shadow:
    0 0 4px rgba(251, 191, 36, 0.8),
    0 0 10px rgba(251, 191, 36, 0.5);
}
.bbstat-val--win {
  color: #74d448;
  text-shadow:
    0 0 4px rgba(116, 212, 72, 0.8),
    0 0 10px rgba(116, 212, 72, 0.5);
}
.bbstat-val--loss {
  color: #a04848;
  text-shadow: 0 0 4px rgba(160, 60, 60, 0.6);
}

.bbstat-sep {
  font-size: var(--label-size);
  color: #5c3a14;
  line-height: 1;
}

/* ── Ability Slots ──────────────────────────────────────────────────── */
.ability-slot {
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.18s ease;
}

.ability-slot:hover {
  background: color-mix(in srgb, var(--role-color, #e8c040) 12%, transparent);
}

.ability-slot:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--role-color, #e8c040) 15%, transparent);
}

.ability-role-icon {
  width: 35px;
  height: 35px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(200, 160, 60, 0.7));
  transition:
    filter 0.2s,
    opacity 0.2s;
}

.ability-label {
  flex-shrink: 0;
  white-space: nowrap;
  transition:
    max-width 0.22s ease,
    opacity 0.18s ease,
    color 0.2s,
    text-shadow 0.2s;
}

.ability-cd-wrap {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ability-cd-val {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--stat-val-size);
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: #d4a838;
  text-shadow:
    0 0 4px rgba(220, 170, 50, 0.8),
    0 0 10px rgba(200, 140, 30, 0.5);
  visibility: hidden;
  transition:
    color 0.2s,
    text-shadow 0.2s;
}

.ability-cd-ghost {
  font-size: var(--stat-val-size);
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: transparent;
  user-select: none;
  pointer-events: none;
}

/* ── Cooldown ───────────────────────────────────────────────────────── */
.ability-slot--cooldown .ability-role-icon {
  filter: grayscale(55%) brightness(0.55) drop-shadow(0 0 2px rgba(100, 80, 20, 0.4));
  opacity: 0.7;
}
.ability-slot--cooldown .ability-cd-val {
  visibility: visible;
  color: #7a5810;
  text-shadow: none;
}

/* ── Flash ──────────────────────────────────────────────────────────── */
.ability-slot--flash .ability-role-icon {
  filter: drop-shadow(0 0 6px var(--role-color, #e8c040))
    drop-shadow(0 0 12px var(--role-color, #e8c040));
  animation: ability-icon-flash 0.45s ease-out;
}
.ability-slot--flash .ability-label {
  color: var(--role-color, #e8c040);
  text-shadow: 0 0 8px var(--role-color, #e8c040);
  animation: ability-val-flash 0.45s ease-out;
}
.ability-slot--flash .ability-cd-val {
  visibility: hidden;
}

/* ── Inactive ───────────────────────────────────────────────────────── */
.ability-slot--inactive {
  opacity: 0.3;
  filter: grayscale(80%);
}

/* ══════════════════════════════════════════════════════════════════════
   BATTLE STATUS COMPOUND ITEM
   ══════════════════════════════════════════════════════════════════════ */

.battle-status {
  position: relative;
  gap: 5px;
}

/* ── Battle timer ─────────────────────────────────────────────────── */
.battle-timer {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  line-height: 1;
  letter-spacing: 0.5px;
  transition: color 0.4s ease;
}

/* ── Objective fight icon pulse (drake/baron, while fight is live) ───── */
.objective-icon--live {
  animation: objective-icon-pulse 1.2s ease-in-out infinite;
}

@keyframes objective-icon-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 3px rgba(200, 140, 40, 0.7));
  }
  50% {
    filter: drop-shadow(0 0 7px rgba(200, 140, 40, 0.95));
  }
}

/* ── Result badge (shown during honor phase) ────────────────────────── */
.result-badge {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.4px;
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

/* ── Searching scan dots ─────────────────────────────────────────────── */
.scan-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-inline-end: 2px;
}

.scan-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #9a6830;
  animation: scan-pulse 1.2s ease-in-out infinite;
}
.scan-dot:nth-child(2) { animation-delay: 0.2s; }
.scan-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes scan-pulse {
  0%, 80%, 100% {
    background: #5c3a14;
    transform: scale(0.8);
  }
  40% {
    background: #c89040;
    transform: scale(1.15);
    box-shadow: 0 0 4px rgba(200, 140, 40, 0.7);
  }
}

/* ── Animations ─────────────────────────────────────────────────────── */
@keyframes ability-icon-flash {
  0% {
    filter: drop-shadow(0 0 14px var(--role-color, #e8c040)) brightness(1.4);
  }
  100% {
    filter: drop-shadow(0 0 6px var(--role-color, #e8c040));
  }
}

@keyframes ability-val-flash {
  0% {
    text-shadow:
      0 0 16px var(--role-color, #e8c040),
      0 0 32px var(--role-color, #e8c040);
  }
  100% {
    text-shadow: 0 0 8px var(--role-color, #e8c040);
  }
}

/* ── Rank slot ───────────────────────────────────────────────────────── */
.rank-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}
.rank-slot-inner {
  display: contents;
}

/* ── Title ──────────────────────────────────────────────────────────── */
.title-center {
  text-align: center;
  color: #e8c040;
  font-size: 30px;
  letter-spacing: 10px;
  white-space: nowrap;
  padding-inline: 16px;
  text-shadow:
    0 0 2px #fffbe8,
    0 0 5px #ffe060,
    0 0 12px rgba(232, 192, 64, 1),
    0 0 24px rgba(210, 155, 30, 0.85),
    0 0 45px rgba(180, 120, 16, 0.6),
    0 0 80px rgba(140, 90, 10, 0.35);
  animation: title-flicker 6s ease-in-out infinite;
}

@keyframes title-flicker {
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
</style>
