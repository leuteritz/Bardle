<template>
  <div class="result-overlay" :class="resultClass">
    <div class="result-rays" />
    <button class="result-close" title="Close summary" @click="battleStore.dismissObjectiveResult()">✕</button>
    <div class="result-content">
      <span class="result-label">{{ resultLabel }}</span>

      <div class="summary-panel">
        <div v-if="topFighter" class="summary-hero">
          <img
            :src="battleStore.getChampionImage(topFighter.name)"
            class="summary-portrait"
            :class="fighterTeam(topFighter) === 'own' ? 'summary-portrait--own' : 'summary-portrait--enemy'"
            :alt="topFighter.name"
          />
          <div class="summary-hero-info">
            <span class="summary-hero-label">TOP DAMAGE</span>
            <span class="summary-hero-name">{{ topFighter.name }}</span>
          </div>
          <span class="summary-hero-value summary-hero-value--gold">{{ fmt(Math.round(topFighter.damage)) }}</span>
        </div>
        <div v-if="tankFighter" class="summary-hero">
          <img
            :src="battleStore.getChampionImage(tankFighter.name)"
            class="summary-portrait"
            :class="fighterTeam(tankFighter) === 'own' ? 'summary-portrait--own' : 'summary-portrait--enemy'"
            :alt="tankFighter.name"
          />
          <div class="summary-hero-info">
            <span class="summary-hero-label">MOST PUNISHED</span>
            <span class="summary-hero-name">{{ tankFighter.name }}</span>
          </div>
          <span class="summary-hero-value summary-hero-value--red">{{ fmt(Math.round(tankFighter.damageTaken)) }}</span>
        </div>

        <div class="summary-chips">
          <span class="sum-chip sum-chip--own">YOUR TEAM {{ fmt(ownDamage) }}</span>
          <span class="sum-chip sum-chip--enemy">ENEMY {{ fmt(enemyDamage) }}</span>
          <span class="sum-chip">{{ fightDurationText }}</span>
          <span v-if="playerDamage > 0" class="sum-chip sum-chip--gold">CLICKS {{ fmt(playerDamage) }}</span>
          <span v-if="totalCurseDamage > 0" class="sum-chip sum-chip--curse">CURSE {{ fmt(totalCurseDamage) }}</span>
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
import type { ObjectiveFighter } from '@/types'
import { useBattleStore } from '@/stores/battleStore'
import { OBJECTIVE_RESULT_DELAY_MS } from '@/config/constants'
import { DRAKE_TYPES } from '@/config/drakes'

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

/** Which side a fighter belongs to — for team-colored portrait frames. */
function fighterTeam(f: ObjectiveFighter): 'own' | 'enemy' {
  return battleStore.objectiveFighters?.t1.includes(f) ? 'own' : 'enemy'
}

const downsCount = computed(() => fightersAll.value.filter((f) => f.down).length)

const totalCurseDamage = computed(() =>
  Math.round(battleStore.objectiveCurseDamage.own + battleStore.objectiveCurseDamage.enemy),
)

const fightDurationText = computed(
  () => (battleStore.objectiveFightDurationMs / 1000).toFixed(1) + 's',
)

const ownDamage = computed(() => Math.round(battleStore.objectiveOwnDamage))
const enemyDamage = computed(() => Math.round(battleStore.objectiveEnemyDamage))
const playerDamage = computed(() => Math.round(battleStore.objectivePlayerDamage))

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
.result-overlay--player { background: rgba(20, 14, 2, 0.85); }
.result-overlay--own { background: rgba(8, 18, 4, 0.85); }
.result-overlay--enemy { background: rgba(22, 8, 6, 0.85); }

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
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 440px;
  padding: 12px 18px;
  background: #16140e;
  border: 1px solid #5c3310;
  border-radius: 4px;
}

.summary-hero {
  display: flex;
  align-items: center;
  gap: 12px;
}
.summary-portrait {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  flex-shrink: 0;
}
.summary-portrait--own {
  border: 2px solid #60a5fa;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
}
.summary-portrait--enemy {
  border: 2px solid #f87171;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.55);
}
.summary-hero-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.summary-hero-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #8a8070;
}
.summary-hero-name {
  font-size: 17px;
  color: #c0b090;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.summary-hero-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.summary-hero-value--gold {
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.5);
}
.summary-hero-value--red {
  color: #f08070;
  text-shadow: 0 0 10px rgba(204, 96, 80, 0.5);
}

.summary-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  border-top: 1px solid #3e200a;
  padding-top: 10px;
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
.sum-chip--own { color: #8ee060; }
.sum-chip--enemy { color: #f08070; }
.sum-chip--gold { color: #e8c040; }
.sum-chip--curse { color: #c9a0f5; }
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

@keyframes result-drain {
  0% { width: 100%; }
  100% { width: 0%; }
}

@media (prefers-reduced-motion: reduce) {
  .result-rays,
  .result-label,
  .result-timer-fill {
    animation: none !important;
  }
}
</style>
