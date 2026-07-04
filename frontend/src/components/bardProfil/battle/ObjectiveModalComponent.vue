<template>
  <Transition name="obj-pop">
    <div v-if="show" class="objective-overlay">
      <div class="objective-modal" :class="isDrake ? 'modal--drake' : 'modal--baron'">
        <!-- Gold accent bar -->
        <div class="accent-bar" />

        <!-- Spawn banner header with instant-resolve buttons -->
        <div class="obj-header">
          <button
            class="force-btn force-btn--ally"
            :disabled="battleStore.objectiveResult !== null"
            title="Instantly slay — your team takes it"
            @click="battleStore.forceResolveObjective(1)"
          >
            SECURE ✦
          </button>
          <span class="obj-title" :class="isDrake ? 'title--drake' : 'title--baron'">{{ objectiveTitle }}</span>
          <button
            class="force-btn force-btn--enemy"
            :disabled="battleStore.objectiveResult !== null"
            title="Instantly slay — enemy team takes it"
            @click="battleStore.forceResolveObjective(2)"
          >
            ✦ CONCEDE
          </button>
        </div>

        <!-- Alive-count strip: the fight is locked at these numbers -->
        <div class="alive-strip">
          <span class="alive-pips">
            <span v-for="p in aliveOwn" :key="'o' + p" class="alive-pip alive-pip--own" />
          </span>
          <span class="alive-versus">
            <span class="alive-count alive-count--own">{{ aliveOwn }}</span>
            <Icon icon="game-icons:duel" width="26" height="26" class="alive-versus-icon" />
            <span class="alive-count alive-count--enemy">{{ aliveEnemy }}</span>
          </span>
          <span class="alive-pips alive-pips--enemy">
            <span v-for="p in aliveEnemy" :key="'e' + p" class="alive-pip alive-pip--enemy" />
          </span>
        </div>

        <!-- Arena row: own fighters | boss | enemy fighters -->
        <div class="arena-row">
          <TransitionGroup name="fighter" tag="div" class="fighters-col">
            <div
              v-for="(f, i) in fightersOwn"
              :key="'f1' + f.idx"
              class="fighter-card fighter-card--own"
              :class="[{ 'fighter-card--dead': !f.alive }, cardRankClass(f, i)]"
            >
              <div class="fighter-portrait-wrap">
                <img
                  :src="battleStore.getChampionImage(f.name)"
                  class="fighter-portrait fighter-portrait--own"
                  :class="{ 'fighter-portrait--dead': !f.alive }"
                  :alt="f.name"
                />
                <span v-if="!f.alive" class="fighter-dead-badge">✕</span>
              </div>
              <div class="fighter-info">
                <span class="fighter-name">{{ f.name }}</span>
                <span class="fighter-damage" :class="{ 'fighter-damage--dead': !f.alive }">
                  {{ fmt(Math.round(f.damage)) }}
                </span>
                <span v-if="f.alive" class="fighter-dps">{{ fighterDps(f) }}/s</span>
              </div>
              <span v-if="rankOf(f, i)" class="fighter-rank-badge fighter-rank-badge--own" :class="`rank--${rankOf(f, i)}`">
                <Icon icon="game-icons:sport-medal" width="28" height="28" />
              </span>
            </div>
          </TransitionGroup>

          <!-- Arena: aura + rune ring + embers + boss -->
          <div
            class="boss-arena"
            @click="handleClick"
            @mousedown="imgPressed = true"
            @mouseup="imgPressed = false"
            @mouseleave="imgPressed = false"
          >
          <div class="arena-aura" :class="isDrake ? 'aura--drake' : 'aura--baron'" />
          <div class="rune-ring rune-ring--outer" :class="isDrake ? 'ring--drake' : 'ring--baron'" />
          <div class="rune-ring rune-ring--inner" :class="isDrake ? 'ring--drake' : 'ring--baron'" />
          <span v-for="e in 6" :key="e" class="ember" :class="[`ember--${e}`, isDrake ? 'ember--drake' : 'ember--baron']" />

          <img
            :src="isDrake ? '/img/dragon.png' : '/img/baron.png'"
            class="boss-img"
            :class="{
              'boss-img--pressed': imgPressed,
              'boss-img--drake': isDrake,
              'boss-img--baron': !isDrake,
            }"
            :alt="objectiveTitle"
          />
          <div v-if="hitFlash" class="hit-flash" />

          <!-- Floating crit numbers -->
          <TransitionGroup name="dmg-float" tag="div" class="dmg-floats">
            <span v-for="f in damageFloats" :key="f.id" class="dmg-float" :style="{ '--rot': f.rot + 'deg', left: f.left + '%' }">
              -{{ f.value }}
            </span>
          </TransitionGroup>
          </div>

          <TransitionGroup name="fighter" tag="div" class="fighters-col fighters-col--enemy">
            <div
              v-for="(f, i) in fightersEnemy"
              :key="'f2' + f.idx"
              class="fighter-card fighter-card--enemy"
              :class="[{ 'fighter-card--dead': !f.alive }, cardRankClass(f, i)]"
            >
              <span v-if="rankOf(f, i)" class="fighter-rank-badge fighter-rank-badge--enemy" :class="`rank--${rankOf(f, i)}`">
                <Icon icon="game-icons:sport-medal" width="28" height="28" />
              </span>
              <div class="fighter-info fighter-info--enemy">
                <span class="fighter-name">{{ f.name }}</span>
                <span class="fighter-damage" :class="{ 'fighter-damage--dead': !f.alive }">
                  {{ fmt(Math.round(f.damage)) }}
                </span>
                <span v-if="f.alive" class="fighter-dps">{{ fighterDps(f) }}/s</span>
              </div>
              <div class="fighter-portrait-wrap">
                <img
                  :src="battleStore.getChampionImage(f.name)"
                  class="fighter-portrait fighter-portrait--enemy"
                  :class="{ 'fighter-portrait--dead': !f.alive }"
                  :alt="f.name"
                />
                <span v-if="!f.alive" class="fighter-dead-badge">✕</span>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- Segmented HP bar -->
        <div class="hp-section" :class="{ 'hp-section--shake': hpShake }">
          <div class="hp-segments">
            <div
              v-for="s in HP_SEGMENTS"
              :key="s"
              class="hp-segment"
              :class="[
                segmentFill(s) > 0 ? (isDrake ? 'seg--drake' : 'seg--baron') : 'seg--empty',
              ]"
              :style="segmentFill(s) > 0 && segmentFill(s) < 1 ? { opacity: 0.35 + segmentFill(s) * 0.65 } : undefined"
            />
          </div>
          <div class="hp-text">{{ Math.ceil(battleStore.objectiveHP) }} / {{ battleStore.objectiveMaxHP }}</div>
        </div>

        <!-- Damage race: most total damage secures it — no last-hit steals -->
        <div class="race-section">
          <div class="race-labels">
            <span class="race-label race-label--own">YOUR TEAM {{ fmt(ownDamage) }} · {{ ownDps }}/s</span>
            <span class="race-label race-label--enemy">ENEMY {{ fmt(enemyDamage) }} · {{ enemyDps }}/s</span>
          </div>
          <div class="race-track">
            <div class="race-own" :style="{ width: ownShare + '%' }">
              <div class="race-player" :style="{ width: playerShareOfOwn + '%' }" />
            </div>
            <div class="race-midmark" />
          </div>
          <div class="race-caption">
            <span v-if="playerDamage > 0" class="race-caption-player">
              Your clicks: +{{ fmt(playerDamage) }} ({{ playerPercentOfOwn }}% of team dmg)
            </span>
            <span v-else class="race-caption-idle">Most total damage secures it — no steals!</span>
          </div>
        </div>

        <!-- Reward preview -->
        <div class="reward-row">
          <span class="reward reward--win">Secure: +{{ winBonusPercent }}% win chance</span>
          <span class="reward-divider">·</span>
          <span class="reward reward--lose">Lose: −{{ winBonusPercent }}%</span>
        </div>

        <!-- Result overlay with burst rays -->
        <Transition name="result-pop">
          <div v-if="battleStore.objectiveResult !== null" class="result-overlay" :class="resultClass">
            <div class="result-rays" />
            <div class="result-content">
              <span class="result-label">{{ resultLabel }}</span>
              <span class="result-score">{{ fmt(ownDamage) }} vs {{ fmt(enemyDamage) }} damage</span>
              <span v-if="topFighter" class="result-top">Top: {{ topFighter.name }} · {{ fmt(Math.round(topFighter.damage)) }} dmg</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { ObjectiveFighter } from '@/types'
import { useBattleStore } from '@/stores/battleStore'
import {
  OBJECTIVE_BASE_DPS_PER_CHAMP,
  OBJECTIVE_CLICK_DAMAGE,
  OBJECTIVE_DRAKE_WIN_BONUS,
  OBJECTIVE_BARON_WIN_BONUS,
} from '@/config/constants'

const HP_SEGMENTS = 10

const battleStore = useBattleStore()

const show = computed(() => battleStore.objectiveModalOpen || battleStore.objectiveResult !== null)
const isDrake = computed(() => battleStore.activeObjective === 'drake')

const objectiveTitle = computed(() => (isDrake.value ? 'HEXTECH DRAKE' : 'BARON NASHOR'))

// Alive counts are snapshotted at fight start — frozen time keeps them fixed.
const aliveOwn = computed(() => battleStore.objectiveAliveCounts?.own ?? 3)
const aliveEnemy = computed(() => battleStore.objectiveAliveCounts?.enemy ?? 3)
const ownDps = computed(() => aliveOwn.value * OBJECTIVE_BASE_DPS_PER_CHAMP)
const enemyDps = computed(() => aliveEnemy.value * OBJECTIVE_BASE_DPS_PER_CHAMP)

/** Living fighters first, sorted by damage descending — the carry leads the list. */
function sortByDamage(fighters: ObjectiveFighter[]): ObjectiveFighter[] {
  return [...fighters].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1
    return b.damage - a.damage
  })
}

const fightersOwn = computed(() => sortByDamage(battleStore.objectiveFighters?.t1 ?? []))
const fightersEnemy = computed(() => sortByDamage(battleStore.objectiveFighters?.t2 ?? []))

/**
 * Damage rank (1–3) of a fighter in its already-sorted column, null otherwise.
 * Dead fighters never rank — they sort last with 0 damage, so the first three
 * living entries are exactly the team's top 3.
 */
function rankOf(f: ObjectiveFighter, sortedIndex: number): number | null {
  return f.alive && sortedIndex < 3 ? sortedIndex + 1 : null
}

/** Card shell class for the podium ranks — gold pulses, silver glows, bronze is a tinted frame. */
function cardRankClass(f: ObjectiveFighter, sortedIndex: number): string | null {
  const rank = rankOf(f, sortedIndex)
  if (rank === 1) return 'fighter-card--top'
  if (rank === 2) return 'fighter-card--second'
  if (rank === 3) return 'fighter-card--third'
  return null
}

/**
 * A fighter's steady DPS share. Side weights are normalized to sum to the
 * alive count, so weight × base DPS is the exact per-fighter rate the tick
 * loop distributes (before the ±variance wobble, which averages out).
 */
function fighterDps(f: ObjectiveFighter): number {
  return Math.round(f.weight * OBJECTIVE_BASE_DPS_PER_CHAMP)
}

const topFighter = computed(() => {
  const all = [...fightersOwn.value, ...fightersEnemy.value].filter((f) => f.alive)
  if (all.length === 0) return null
  return all.reduce((best, f) => (f.damage > best.damage ? f : best))
})

const ownDamage = computed(() => Math.round(battleStore.objectiveOwnDamage))
const enemyDamage = computed(() => Math.round(battleStore.objectiveEnemyDamage))
const playerDamage = computed(() => Math.round(battleStore.objectivePlayerDamage))

const ownShare = computed(() => {
  const total = ownDamage.value + enemyDamage.value
  if (total === 0) return 50
  return Math.round((ownDamage.value / total) * 100)
})
const playerShareOfOwn = computed(() => {
  if (ownDamage.value === 0) return 0
  return Math.min(100, Math.round((playerDamage.value / ownDamage.value) * 100))
})
const playerPercentOfOwn = computed(() => playerShareOfOwn.value)

const winBonusPercent = computed(() =>
  Math.round((isDrake.value ? OBJECTIVE_DRAKE_WIN_BONUS : OBJECTIVE_BARON_WIN_BONUS) * 100),
)

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

const hpFraction = computed(() => {
  if (battleStore.objectiveMaxHP === 0) return 0
  return Math.max(0, battleStore.objectiveHP / battleStore.objectiveMaxHP)
})

/** Fill state of segment s (1-based from the left): 1 full, 0 empty, fraction partial. */
function segmentFill(s: number): number {
  const per = 1 / HP_SEGMENTS
  const start = (s - 1) * per
  return Math.max(0, Math.min(1, (hpFraction.value - start) / per))
}

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

// ── Click feedback: crit floats + hit flash + hp shake ─────────────────────
interface DmgFloat {
  id: number
  value: number
  rot: number
  left: number
}
const damageFloats = ref<DmgFloat[]>([])
let _floatId = 0

const imgPressed = ref(false)
const hitFlash = ref(false)
const hpShake = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null

function handleClick() {
  if (battleStore.objectiveResult !== null) return
  battleStore.clickObjective()

  const id = ++_floatId
  damageFloats.value.push({
    id,
    value: OBJECTIVE_CLICK_DAMAGE,
    rot: -14 + (id % 5) * 7,
    left: 34 + (id % 4) * 11,
  })
  setTimeout(() => {
    damageFloats.value = damageFloats.value.filter((f) => f.id !== id)
  }, 750)

  hitFlash.value = false
  hpShake.value = false
  requestAnimationFrame(() => {
    hitFlash.value = true
    hpShake.value = true
  })
  if (flashTimer) clearTimeout(flashTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
  flashTimer = setTimeout(() => (hitFlash.value = false), 160)
  shakeTimer = setTimeout(() => (hpShake.value = false), 220)
}

watch(show, (v) => {
  if (!v) {
    damageFloats.value = []
    hitFlash.value = false
    hpShake.value = false
  }
})
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────────────────── */
.objective-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
}

/* ── Modal card ──────────────────────────────────────────────────────────── */
.objective-modal {
  position: relative;
  width: 680px;
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310, 0 20px 50px rgba(0, 0, 0, 0.95);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.modal--drake {
  background: radial-gradient(circle at 50% 32%, #12180c, #111008 70%);
}
.modal--baron {
  background: radial-gradient(circle at 50% 32%, #150e1c, #111008 70%);
}

.accent-bar {
  width: 100%;
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  flex-shrink: 0;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.obj-header {
  position: relative;
  width: 100%;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  padding: 9px 12px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Instant-resolve buttons flanking the title */
.force-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 26px;
  padding: 0 9px;
  background: rgba(13, 12, 8, 0.85);
  border: 1px solid;
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  white-space: nowrap;
}
.force-btn--ally {
  left: 10px;
  border-color: rgba(96, 165, 250, 0.65);
  color: #60a5fa;
}
.force-btn--ally:hover:not(:disabled) {
  border-color: #60a5fa;
  background: rgba(20, 30, 48, 0.95);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.45);
}
.force-btn--enemy {
  right: 10px;
  border-color: rgba(248, 113, 113, 0.65);
  color: #f87171;
}
.force-btn--enemy:hover:not(:disabled) {
  border-color: #f87171;
  background: rgba(48, 18, 18, 0.95);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.45);
}
.force-btn:disabled {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

.obj-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 3px;
  white-space: nowrap;
}
.title--drake {
  color: #6ee0a0;
  text-shadow: 0 0 14px rgba(34, 197, 94, 0.6);
}
.title--baron {
  color: #c9a0f5;
  text-shadow: 0 0 14px rgba(168, 85, 247, 0.6);
}

/* ── Alive strip ─────────────────────────────────────────────────────────── */
.alive-strip {
  width: calc(100% - 28px);
  margin: 8px 14px 0;
  padding: 5px 10px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.alive-pips {
  display: flex;
  gap: 4px;
  flex: 1;
}
.alive-pips--enemy {
  justify-content: flex-end;
}
.alive-pip {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
.alive-pip--own {
  background: #52b830;
  box-shadow: 0 0 4px #52b830;
}
.alive-pip--enemy {
  background: #cc6050;
  box-shadow: 0 0 4px #cc6050;
}

.alive-versus {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
}
.alive-versus-icon {
  color: #e8c040;
}
.alive-count {
  font-size: 27px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.alive-count--own {
  color: #6ec040;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.5);
}
.alive-count--enemy {
  color: #e07060;
  text-shadow: 0 0 8px rgba(204, 96, 80, 0.5);
}

/* ── Arena row: fighters | boss | fighters ──────────────────────────────── */
.arena-row {
  width: calc(100% - 28px);
  margin: 8px 14px 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fighters-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* FLIP reorder animation when the damage sorting changes ranks */
.fighter-move {
  transition: transform 0.4s ease;
}

.fighter-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.fighter-card--enemy {
  justify-content: flex-end;
}
.fighter-card--dead {
  opacity: 0.55;
}

/* Damage leader: warm gold shell with a slow breathing glow */
.fighter-card--top {
  border-color: #c89040;
  background: linear-gradient(to bottom, #26200f, #1c1c18);
  box-shadow:
    inset 0 0 0 1px rgba(232, 192, 64, 0.25),
    0 0 6px rgba(232, 192, 64, 0.15);
  animation: top-card-glow 2.6s ease-in-out infinite;
}
.fighter-card--top .fighter-name {
  color: #e8c060;
}

/* Second place: cool silver frame with a faint static glow — no motion */
.fighter-card--second {
  border-color: #8a96a4;
  background: linear-gradient(to bottom, #20222a, #1c1c18);
  box-shadow:
    inset 0 0 0 1px rgba(184, 196, 208, 0.18),
    0 0 5px rgba(184, 196, 208, 0.12);
}
.fighter-card--second .fighter-name {
  color: #d0d8e0;
}

/* Third place: bronze-tinted frame only — quietest podium step */
.fighter-card--third {
  border-color: #8a5a28;
  box-shadow: inset 0 0 0 1px rgba(205, 127, 50, 0.16);
}
.fighter-card--third .fighter-name {
  color: #cd9a66;
}
@keyframes top-card-glow {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 1px rgba(232, 192, 64, 0.25),
      0 0 6px rgba(232, 192, 64, 0.15);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px rgba(232, 192, 64, 0.25),
      0 0 12px rgba(232, 192, 64, 0.35);
  }
}

.fighter-portrait-wrap {
  position: relative;
  flex-shrink: 0;
}
.fighter-portrait {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
  display: block;
}
.fighter-portrait--own {
  border: 2px solid #6ec040;
}
.fighter-portrait--enemy {
  border: 2px solid #cc6050;
}
.fighter-portrait--dead {
  filter: grayscale(0.85) brightness(0.6);
}
.fighter-dead-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #e07060;
  background: #16140e;
  border: 1px solid #cc6050;
  border-radius: 50%;
}

.fighter-rank-badge {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
  pointer-events: none;
}
.fighter-rank-badge--own {
  margin-left: auto;
}
.fighter-rank-badge--enemy {
  margin-right: auto;
}
.rank--1 {
  color: #e8c040;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 4px rgba(232, 192, 64, 0.55));
}
.rank--2 {
  color: #b8c4d0;
}
.rank--3 {
  color: #cd7f32;
}

.fighter-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.fighter-info--enemy {
  align-items: flex-end;
  text-align: right;
}
.fighter-name {
  font-size: 15px;
  color: #c0b090;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.fighter-damage {
  font-size: 17px;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}
.fighter-damage--dead {
  color: #8a8070;
  font-weight: 400;
}
.fighter-dps {
  font-size: 11px;
  color: #8a8070;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

/* ── Arena ───────────────────────────────────────────────────────────────── */
.boss-arena {
  position: relative;
  width: 220px;
  height: 220px;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arena-aura {
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  filter: blur(22px);
  opacity: 0.5;
  animation: aura-pulse 1.8s ease-in-out infinite;
  pointer-events: none;
}
.aura--drake {
  background: radial-gradient(circle, #34d060, #157a30 55%, transparent 78%);
}
.aura--baron {
  background: radial-gradient(circle, #a855f7, #5c2a90 55%, transparent 78%);
}

.rune-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed;
  pointer-events: none;
}
.rune-ring--outer {
  inset: 2px;
  animation: ring-spin 14s linear infinite;
}
.rune-ring--inner {
  inset: 18px;
  border-style: dotted;
  animation: ring-spin-rev 9s linear infinite;
}
.ring--drake { border-color: rgba(34, 197, 94, 0.45); }
.ring--baron { border-color: rgba(168, 85, 247, 0.45); }

/* Rising embers */
.ember {
  position: absolute;
  bottom: 12%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  pointer-events: none;
  animation: ember-rise 2.6s ease-in infinite;
}
.ember--drake {
  background: #6ee0a0;
  box-shadow: 0 0 6px #22c55e;
}
.ember--baron {
  background: #c9a0f5;
  box-shadow: 0 0 6px #a855f7;
}
.ember--1 { left: 22%; animation-delay: 0s; }
.ember--2 { left: 36%; animation-delay: 0.7s; }
.ember--3 { left: 50%; animation-delay: 1.3s; }
.ember--4 { left: 62%; animation-delay: 0.4s; }
.ember--5 { left: 74%; animation-delay: 1.8s; }
.ember--6 { left: 30%; animation-delay: 2.2s; }

.boss-img {
  position: relative;
  z-index: 1;
  width: 165px;
  height: 165px;
  border-radius: 50%;
  object-fit: cover;
  transition: transform 0.08s ease;
  border: 3px solid #7a4e20;
}
.boss-img--drake {
  box-shadow: 0 0 24px rgba(34, 197, 94, 0.7), 0 0 48px rgba(21, 122, 48, 0.35), inset 0 0 0 1px #3e200a;
}
.boss-img--baron {
  box-shadow: 0 0 24px rgba(168, 85, 247, 0.7), 0 0 48px rgba(92, 42, 144, 0.35), inset 0 0 0 1px #3e200a;
}
.boss-img--pressed {
  transform: scale(0.91);
}

.hit-flash {
  position: absolute;
  inset: 18px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.55), transparent 65%);
  animation: hit-flash 0.16s ease-out forwards;
  pointer-events: none;
  z-index: 2;
}

/* Crit damage floats */
.dmg-floats {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.dmg-float {
  position: absolute;
  top: 16%;
  font-size: 22px;
  font-weight: 700;
  color: #ffd24a;
  text-shadow: 0 0 10px rgba(232, 160, 20, 0.8), 0 2px 4px rgba(0, 0, 0, 0.95);
  transform: rotate(var(--rot));
  pointer-events: none;
}

.dmg-float-enter-active {
  animation: crit-float 0.75s ease-out forwards;
}
.dmg-float-leave-active {
  display: none;
}

/* ── Segmented HP bar ────────────────────────────────────────────────────── */
.hp-section {
  width: calc(100% - 28px);
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 10px 14px 2px;
}
.hp-section--shake {
  animation: hp-shake 0.22s ease-in-out;
}

.hp-segments {
  display: flex;
  gap: 3px;
  height: 16px;
}

.hp-segment {
  flex: 1;
  border-radius: 2px;
  border: 1px solid #3e200a;
  transition: opacity 0.15s ease, background 0.15s ease;
}
.seg--drake {
  background: linear-gradient(to bottom, #34d060, #157a30);
  box-shadow: 0 0 7px rgba(34, 197, 94, 0.55);
}
.seg--baron {
  background: linear-gradient(to bottom, #b06cf8, #6c30a8);
  box-shadow: 0 0 7px rgba(168, 85, 247, 0.55);
}
.seg--empty {
  background: #1c1c18;
}

.hp-text {
  text-align: center;
  font-size: 14px;
  color: #a09060;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}

/* ── Damage race ─────────────────────────────────────────────────────────── */
.race-section {
  width: calc(100% - 28px);
  margin: 6px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.race-labels {
  display: flex;
  justify-content: space-between;
}
.race-label {
  font-size: 13px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.race-label--own { color: #6ec040; }
.race-label--enemy { color: #e07060; }

.race-track {
  position: relative;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #3e200a;
  background: linear-gradient(to bottom, #7a2818, #57201a);
  overflow: hidden;
}
.race-own {
  position: relative;
  height: 100%;
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.6);
  transition: width 0.25s ease-out;
}
.race-player {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to right, #c89040, #e8c060);
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.7);
  transition: width 0.25s ease-out;
}
.race-midmark {
  position: absolute;
  left: 50%;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: #e8c040;
  opacity: 0.7;
  pointer-events: none;
}

.race-caption {
  text-align: center;
  min-height: 14px;
}
.race-caption-player {
  font-size: 13px;
  color: #e8c040;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.race-caption-idle {
  font-size: 13px;
  color: #8a8070;
  letter-spacing: 0.04em;
}

/* ── Reward preview ──────────────────────────────────────────────────────── */
.reward-row {
  width: calc(100% - 28px);
  margin: 6px 14px 0;
  padding: 6px 0 12px;
  border-top: 1px solid #3e200a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.reward {
  font-size: 13px;
  letter-spacing: 0.05em;
}
.reward--win { color: #6ec040; }
.reward--lose { color: #e07060; }
.reward-divider { color: #7a6030; font-size: 13px; }

/* ── Result overlay ──────────────────────────────────────────────────────── */
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
.result-overlay--player { background: rgba(20, 14, 2, 0.82); }
.result-overlay--own { background: rgba(8, 18, 4, 0.82); }
.result-overlay--enemy { background: rgba(22, 8, 6, 0.82); }

.result-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 560px;
  height: 560px;
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

.result-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.result-label {
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-align: center;
  animation: result-punch 0.4s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.result-overlay--player .result-label {
  color: #e8c040;
  text-shadow: 0 0 28px rgba(232, 192, 64, 0.9), 0 2px 8px rgba(0, 0, 0, 0.9);
}
.result-overlay--own .result-label {
  color: #6ec040;
  text-shadow: 0 0 28px rgba(110, 192, 64, 0.9), 0 2px 8px rgba(0, 0, 0, 0.9);
}
.result-overlay--enemy .result-label {
  color: #e07060;
  text-shadow: 0 0 28px rgba(224, 112, 96, 0.9), 0 2px 8px rgba(0, 0, 0, 0.9);
}

.result-score {
  font-size: 15px;
  color: #a09060;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}

.result-top {
  font-size: 14px;
  color: #e8c040;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.obj-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.obj-pop-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.obj-pop-enter-from,
.obj-pop-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.result-pop-enter-active {
  transition: opacity 0.2s ease;
}
.result-pop-leave-active {
  transition: opacity 0.15s ease;
}
.result-pop-enter-from,
.result-pop-leave-to {
  opacity: 0;
}

/* ── Keyframes ───────────────────────────────────────────────────────────── */
@keyframes aura-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.65; transform: scale(1.07); }
}

@keyframes ring-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}
@keyframes ring-spin-rev {
  0% { transform: rotate(0); }
  100% { transform: rotate(-360deg); }
}

@keyframes ember-rise {
  0% { opacity: 0; transform: translateY(0) scale(0.6); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-110px) scale(1.1); }
}

@keyframes hit-flash {
  0% { opacity: 0.9; }
  100% { opacity: 0; }
}

@keyframes crit-float {
  0% { opacity: 0; transform: rotate(var(--rot)) translateY(6px) scale(1.5); }
  18% { opacity: 1; transform: rotate(var(--rot)) translateY(0) scale(1.05); }
  100% { opacity: 0; transform: rotate(var(--rot)) translateY(-46px) scale(0.9); }
}

@keyframes hp-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  50% { transform: translateX(3px); }
  75% { transform: translateX(-2px); }
}

@keyframes rays-spin {
  0% { transform: translate(-50%, -50%) rotate(0); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes result-punch {
  0% { opacity: 0; transform: scale(1.4); }
  100% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .arena-aura,
  .rune-ring,
  .ember,
  .result-rays,
  .hp-section--shake {
    animation: none !important;
  }
  .fighter-move {
    transition: none !important;
  }
}
</style>
