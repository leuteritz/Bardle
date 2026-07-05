<template>
  <div class="result-overlay" :class="resultClass">
    <div class="result-rays" />
    <button class="result-close" title="Close summary" @click="battleStore.dismissObjectiveResult()">✕</button>
    <div class="result-content">
      <span class="result-label">{{ resultLabel }}</span>

      <div class="summary-panel">
        <div class="panel-goldline" />

        <!-- Post-game awards -->
        <div class="award-grid">
          <div
            v-for="(a, i) in awards"
            :key="a.key"
            class="award-card"
            :class="`award--${a.key}`"
            :style="{ '--i': i }"
          >
            <div class="award-portrait-wrap">
              <img
                :src="battleStore.getChampionImage(a.fighter.name)"
                class="award-portrait"
                :class="fighterTeam(a.fighter) === 'own' ? 'award-portrait--own' : 'award-portrait--enemy'"
                :alt="a.fighter.name"
              />
              <span class="award-badge">
                <Icon :icon="a.icon" width="12" height="12" />
              </span>
            </div>
            <span class="award-label">{{ a.label }}</span>
            <span class="award-name">{{ a.fighter.name }}</span>
            <span class="award-value">{{ a.valueText }}</span>
          </div>
        </div>

        <!-- Team damage split -->
        <div class="team-split">
          <div class="team-split-own" :style="{ width: ownShare + '%' }" />
          <div class="team-split-mid" />
          <span class="team-split-val team-split-val--own">{{ fmt(ownDamage) }}</span>
          <span class="team-split-val team-split-val--enemy">{{ fmt(enemyDamage) }}</span>
        </div>

        <div class="summary-chips">
          <span class="sum-chip">{{ fightDurationText }}</span>
          <span v-if="playerDamage > 0" class="sum-chip sum-chip--gold">CLICKS {{ fmt(playerDamage) }}</span>
          <span v-if="downsCount > 0" class="sum-chip sum-chip--red">DOWNS {{ downsCount }}</span>
        </div>
      </div>

      <span v-if="resultEffectText" class="result-effect">{{ resultEffectText }}</span>
    </div>
    <!-- Drains over the summary display time — shows how long the stats stay -->
    <div class="result-timer">
      <div class="result-timer-fill" :style="{ animationDuration: OBJECTIVE_RESULT_DELAY_MS + 'ms' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { ObjectiveFighter } from '@/types'
import { useBattleStore } from '@/stores/battleStore'
import { OBJECTIVE_RESULT_DELAY_MS } from '@/config/constants'
import { DRAKE_TYPES } from '@/config/drakes'

interface Award {
  key: string
  label: string
  icon: string
  fighter: ObjectiveFighter
  valueText: string
}

const battleStore = useBattleStore()

const isDrake = computed(() => battleStore.activeObjective === 'drake')
const drakeDef = computed(() => DRAKE_TYPES[battleStore.activeDrakeType ?? 'infernal'])

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

const fightersAll = computed(() => [
  ...(battleStore.objectiveFighters?.t1 ?? []),
  ...(battleStore.objectiveFighters?.t2 ?? []),
])

const resultLabel = computed(() => {
  const r = battleStore.objectiveResult
  if (r === 'player') return 'YOUR HANDS SECURED IT!'
  if (r === 'own') return 'SECURED'
  return 'LOST TO THE ENEMY'
})

const resultClass = computed(() => {
  const r = battleStore.objectiveResult
  if (r === 'player') return 'result-overlay--player'
  if (r === 'own') return 'result-overlay--own'
  return 'result-overlay--enemy'
})

/** Which side a fighter belongs to — for team-colored portrait rings. */
function fighterTeam(f: ObjectiveFighter): 'own' | 'enemy' {
  return battleStore.objectiveFighters?.t1.includes(f) ? 'own' : 'enemy'
}

const topFighter = computed(() => {
  const all = fightersAll.value.filter((f) => f.alive)
  if (all.length === 0) return null
  return all.reduce((best, f) => (f.damage > best.damage ? f : best))
})

/** The fighter who soaked the most boss/taunt damage this fight. */
const tankFighter = computed(() => {
  const all = fightersAll.value.filter((f) => f.alive && f.damageTaken > 0)
  if (all.length === 0) return null
  return all.reduce((best, f) => (f.damageTaken > best.damageTaken ? f : best))
})

/** The mid whose Hex Curse dealt more damage — null when no curse ticked. */
const curseMaster = computed(() => {
  const { own, enemy } = battleStore.objectiveCurseDamage
  if (own <= 0 && enemy <= 0) return null
  const side = own >= enemy ? 'own' : 'enemy'
  const fighters = side === 'own' ? battleStore.objectiveFighters?.t1 : battleStore.objectiveFighters?.t2
  const mid = fighters?.find((f) => f.role === 'mid' && f.alive)
  if (!mid) return null
  return { fighter: mid, value: Math.round(Math.max(own, enemy)) }
})

/** The standing fighter who kept the highest HP fraction. */
const survivor = computed(() => {
  const standing = fightersAll.value.filter((f) => f.alive && !f.down && f.fightMaxHp > 0)
  if (standing.length === 0) return null
  const best = standing.reduce((b, f) => (f.fightHp / f.fightMaxHp > b.fightHp / b.fightMaxHp ? f : b))
  return { fighter: best, pct: Math.round((best.fightHp / best.fightMaxHp) * 100) }
})

const awards = computed<Award[]>(() => {
  const out: Award[] = []
  if (topFighter.value) {
    out.push({
      key: 'damage',
      label: 'TOP DAMAGE',
      icon: 'game-icons:quick-slash',
      fighter: topFighter.value,
      valueText: fmt(Math.round(topFighter.value.damage)),
    })
  }
  if (tankFighter.value) {
    out.push({
      key: 'punished',
      label: 'MOST PUNISHED',
      icon: 'game-icons:heart-shield',
      fighter: tankFighter.value,
      valueText: fmt(Math.round(tankFighter.value.damageTaken)),
    })
  }
  if (curseMaster.value) {
    out.push({
      key: 'curse',
      label: 'CURSE MASTER',
      icon: 'game-icons:cursed-star',
      fighter: curseMaster.value.fighter,
      valueText: fmt(curseMaster.value.value),
    })
  }
  if (survivor.value) {
    out.push({
      key: 'survivor',
      label: 'SURVIVOR',
      icon: 'game-icons:heart-beats',
      fighter: survivor.value.fighter,
      valueText: `${survivor.value.pct}% HP`,
    })
  }
  return out
})

const downsCount = computed(() => fightersAll.value.filter((f) => f.down).length)

const fightDurationText = computed(
  () => (battleStore.objectiveFightDurationMs / 1000).toFixed(1) + 's',
)

const ownDamage = computed(() => Math.round(battleStore.objectiveOwnDamage))
const enemyDamage = computed(() => Math.round(battleStore.objectiveEnemyDamage))
const playerDamage = computed(() => Math.round(battleStore.objectivePlayerDamage))

const ownShare = computed(() => {
  const total = ownDamage.value + enemyDamage.value
  if (total === 0) return 50
  return Math.round((ownDamage.value / total) * 100)
})

const resultEffectText = computed(() => {
  const r = battleStore.objectiveResult
  if (!isDrake.value || (r !== 'own' && r !== 'player')) return ''
  return drakeDef.value.effectText
})
</script>

<style scoped>
.result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  z-index: 20;
  overflow: hidden;
}
.result-overlay--player { background: rgba(20, 14, 2, 0.88); }
.result-overlay--own { background: rgba(8, 18, 4, 0.88); }
.result-overlay--enemy { background: rgba(22, 8, 6, 0.88); }

.result-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 720px;
  height: 720px;
  transform: translate(-50%, -50%);
  animation: rays-spin 14s linear infinite;
  pointer-events: none;
}
.result-overlay--player .result-rays {
  background: conic-gradient(from 0deg, transparent 0deg, rgba(232, 192, 64, 0.18) 14deg, transparent 28deg, transparent 62deg, rgba(232, 192, 64, 0.12) 76deg, transparent 90deg);
}
.result-overlay--own .result-rays {
  background: conic-gradient(from 0deg, transparent 0deg, rgba(82, 184, 48, 0.16) 14deg, transparent 28deg, transparent 62deg, rgba(82, 184, 48, 0.1) 76deg, transparent 90deg);
}
.result-overlay--enemy .result-rays {
  background: conic-gradient(from 0deg, transparent 0deg, rgba(204, 96, 80, 0.16) 14deg, transparent 28deg, transparent 62deg, rgba(204, 96, 80, 0.1) 76deg, transparent 90deg);
}

.result-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  color: #c0b090;
  background: rgba(13, 12, 8, 0.85);
  border: 1px solid #5c3310;
  border-radius: 4px;
  cursor: pointer;
  z-index: 2;
}
.result-close:hover {
  color: #e07060;
  border-color: #cc6050;
}

.result-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.result-label {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-align: center;
  animation: result-punch 0.4s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.result-overlay--player .result-label {
  color: #e8c040;
  text-shadow: 0 0 32px rgba(232, 192, 64, 0.9), 0 2px 8px rgba(0, 0, 0, 0.9);
}
.result-overlay--own .result-label {
  color: #6ec040;
  text-shadow: 0 0 32px rgba(110, 192, 64, 0.9), 0 2px 8px rgba(0, 0, 0, 0.9);
}
.result-overlay--enemy .result-label {
  color: #e07060;
  text-shadow: 0 0 32px rgba(224, 112, 96, 0.9), 0 2px 8px rgba(0, 0, 0, 0.9);
}

.summary-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 480px;
  padding: 14px 18px 12px;
  background: #16140e;
  border: 1px solid #5c3310;
  border-radius: 4px;
  overflow: hidden;
}
.panel-goldline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* ── Awards ──────────────────────────────────────────────────────────────── */
.award-grid {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}
.award-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 102px;
  padding: 8px 8px 7px;
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 4px;
  animation: award-in 0.4s ease both;
  animation-delay: calc(var(--i) * 0.12s);
}

.award-portrait-wrap {
  position: relative;
}
.award-portrait {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.award-portrait--own {
  border: 2px solid #60a5fa;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.55);
}
.award-portrait--enemy {
  border: 2px solid #f87171;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}
.award-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #16140e;
  border: 1px solid #3e200a;
  border-radius: 50%;
}

.award-label {
  margin-top: 4px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #8a8070;
  white-space: nowrap;
}
.award-name {
  font-size: 13px;
  color: #c0b090;
  max-width: 96px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.award-value {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Award theming: badge icon + value speak the award's color */
.award--damage .award-badge { color: #e8c040; border-color: #7a5a18; }
.award--damage .award-value { color: #e8c040; text-shadow: 0 0 8px rgba(232, 192, 64, 0.5); }
.award--punished .award-badge { color: #f08070; border-color: #7a3020; }
.award--punished .award-value { color: #f08070; text-shadow: 0 0 8px rgba(204, 96, 80, 0.5); }
.award--curse .award-badge { color: #c9a0f5; border-color: #5a3080; }
.award--curse .award-value { color: #c9a0f5; text-shadow: 0 0 8px rgba(168, 85, 247, 0.5); }
.award--survivor .award-badge { color: #8ee060; border-color: #2e6018; }
.award--survivor .award-value { color: #8ee060; text-shadow: 0 0 8px rgba(82, 184, 48, 0.5); }

/* ── Team damage split ───────────────────────────────────────────────────── */
.team-split {
  position: relative;
  height: 18px;
  border: 1px solid #3e200a;
  border-radius: 3px;
  background: linear-gradient(to bottom, #7a2818, #57201a);
  overflow: hidden;
}
.team-split-own {
  height: 100%;
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.55);
}
.team-split-mid {
  position: absolute;
  left: 50%;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: #e8c040;
  opacity: 0.7;
}
.team-split-val {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}
.team-split-val--own { left: 8px; }
.team-split-val--enemy { right: 8px; }

.summary-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}
.sum-chip {
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #a09060;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #3e200a;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sum-chip--gold { color: #e8c040; }
.sum-chip--red { color: #f08070; }

.result-effect {
  font-size: 16px;
  letter-spacing: 0.06em;
  color: var(--obj-color, #e8c040);
  text-shadow: 0 0 10px var(--obj-glow, rgba(232, 192, 64, 0.6));
}

/* Countdown until the summary auto-closes */
.result-timer {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 10px;
  height: 4px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 2px;
  overflow: hidden;
}
.result-timer-fill {
  height: 100%;
  background: linear-gradient(to right, #c89040, #e8c060);
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.6);
  animation: result-drain linear forwards;
}

@keyframes rays-spin {
  0% { transform: translate(-50%, -50%) rotate(0); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes result-punch {
  0% { opacity: 0; transform: scale(1.4); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes award-in {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes result-drain {
  0% { width: 100%; }
  100% { width: 0%; }
}

@media (prefers-reduced-motion: reduce) {
  .result-rays,
  .result-label,
  .result-timer-fill,
  .award-card {
    animation: none !important;
  }
}
</style>
