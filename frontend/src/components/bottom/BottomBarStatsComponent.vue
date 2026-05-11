<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { ROLES, GAME_STATE } from '@/config/constants'

const battleStore = useBattleStore()
const roleBehaviorStore = useRoleBehaviorStore()

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
} = storeToRefs(battleStore)

const now = ref(Date.now())
let _nowTicker: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  _nowTicker = setInterval(() => {
    now.value = Date.now()
  }, 500)
})
onUnmounted(() => {
  if (_nowTicker) clearInterval(_nowTicker)
})

const gameStateDisplay = computed(() => {
  const _now = now.value
  if (
    searchingPhaseStartTimestamp.value > 0 &&
    !showAutoBattleResult.value &&
    battlePhaseStartTimestamp.value === 0
  ) {
    const elapsed = Math.min(5, Math.floor((_now - searchingPhaseStartTimestamp.value) / 1000))
    const min = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, '0')
    const sec = (elapsed % 60).toString().padStart(2, '0')
    return {
      icon: GAME_STATE.SEARCHING.icon,
      text: `${min}:${sec}`,
      color: GAME_STATE.SEARCHING.color,
    }
  }
  if (!isAutoBattleInitialized.value) {
    return { icon: '—', text: '', color: '#6a4418' }
  }
  if (showAutoBattleResult.value) {
    const elapsed = Math.max(0, Math.floor((_now - resultPhaseStartTimestamp.value) / 1000))
    const min = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, '0')
    const sec = (elapsed % 60).toString().padStart(2, '0')
    return { icon: '⭐', text: `${min}:${sec}`, color: GAME_STATE.HONOR.color }
  }
  if (battlePhase.value === 'playing' && battlePhaseStartTimestamp.value > 0) {
    const min = Math.floor(battleTime.value / 60)
      .toString()
      .padStart(2, '0')
    const sec = (battleTime.value % 60).toString().padStart(2, '0')
    const { icon, label, color } = GAME_STATE.BATTLE
    return { icon, text: `${label} ${min}:${sec}`, color }
  }
  return { icon: '—', text: '', color: '#6a4418' }
})

const rankLabel = computed(() => {
  const { tier, division } = currentRank.value
  if (tier === 'Master' || tier === 'Grandmaster' || tier === 'Challenger') return tier
  return `${tier} ${division}`
})

const lpValue = computed(() => currentRank.value.lp)

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

    <!-- RIGHT: Stats – kein führender Divider, RANK startet direkt -->
    <div class="stats-right">
      <div class="bbstat-item">
        <span class="bbstat-icon bbstat-icon--red">⚔</span>
        <span class="bbstat-label">RANK</span>
        <span class="bbstat-val">{{ rankLabel }}</span>
      </div>
      <div class="bbstat-divider" />
      <div class="bbstat-item">
        <span class="bbstat-icon bbstat-icon--gold">▲</span>
        <span class="bbstat-label">LP</span>
        <span class="bbstat-val bbstat-val--gold">{{ lpValue }}</span>
      </div>
      <div class="bbstat-divider" />
      <div class="bbstat-item">
        <span class="bbstat-icon">⚖</span>
        <span class="bbstat-label">W/L</span>
        <span class="bbstat-val bbstat-val--win">{{ totalWins }}</span>
        <span class="bbstat-sep">/</span>
        <span class="bbstat-val bbstat-val--loss">{{ totalLosses }}</span>
      </div>
      <div class="bbstat-divider" />
      <div class="bbstat-item">
        <span class="bbstat-icon">{{ gameStateDisplay.icon }}</span>
        <span
          class="bbstat-val"
          :style="{ color: gameStateDisplay.color, fontSize: '13px', whiteSpace: 'nowrap' }"
          >{{ gameStateDisplay.text }}</span
        >
      </div>
      <div class="bbstat-divider" />
      <div class="bbstat-item">
        <span class="bbstat-icon" :style="{ color: winChanceColor, transition: 'color 0.4s ease' }"
          >◎</span
        >
        <span class="bbstat-label">WIN%</span>
        <span class="bbstat-val" :style="{ color: winChanceColor, transition: 'color 0.4s ease' }">
          {{ liveWinChance !== null ? liveWinChance + '%' : '—' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  --stat-val-size: 17px;
  --label-size: 13px;
  --icon-size: 15px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
}

/* LEFT side: 5 slots + 4 dividers = 9 columns */
.bbstats {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr auto 1fr;
  align-items: center;
  width: 100%;
  overflow: visible;
  padding-inline-end: 6px;
}

/* RIGHT side: 5 slots + 4 dividers = 9 columns (kein führendes auto mehr) */
.stats-right {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr auto 1fr;
  align-items: center;
  width: 100%;
  overflow: visible;
  padding-inline-start: 6px;
}

.bbstat-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
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
.bbstat-icon--green {
  color: #74d448;
  filter: drop-shadow(0 0 3px rgba(116, 212, 72, 0.7));
}
.bbstat-icon--red {
  color: #ff7a50;
  filter: drop-shadow(0 0 3px rgba(255, 100, 60, 0.7));
}
.bbstat-icon--gold {
  color: #fbbf24;
  filter: drop-shadow(0 0 3px rgba(251, 191, 36, 0.7));
}

.bbstat-label {
  font-size: var(--label-size);
  color: #6a4418;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  line-height: 1;
  flex-shrink: 0;
  white-space: nowrap;
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
.bbstat-val--green {
  color: #74d448;
  text-shadow:
    0 0 4px rgba(116, 212, 72, 0.8),
    0 0 10px rgba(116, 212, 72, 0.5);
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
.ability-role-icon {
  width: 40px;
  height: 40px;
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
.ability-slot--cooldown .ability-label {
  color: #6a4418;
  text-shadow: none;
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

/* ── Ready ──────────────────────────────────────────────────────────── */
.ability-slot:not(.ability-slot--cooldown):not(.ability-slot--flash):not(.ability-slot--inactive)
  .ability-label {
  color: var(--role-color, #e8c040);
  text-shadow: 0 0 5px var(--role-color, #e8c040);
}

/* ── Animationen ────────────────────────────────────────────────────── */
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
