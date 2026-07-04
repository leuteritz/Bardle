<template>
  <Transition name="obj-pop">
    <div v-if="show" class="objective-overlay">
      <div class="objective-modal" :class="isDrake ? 'modal--drake' : 'modal--baron'">
        <!-- Gold accent bar -->
        <div class="accent-bar" />

        <!-- Spawn banner header -->
        <div class="obj-header">
          <span class="obj-title" :class="isDrake ? 'title--drake' : 'title--baron'">{{ objectiveTitle }}</span>
          <span class="obj-subtitle">{{ objectiveSubtitle }}</span>
        </div>

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

        <!-- Tug-of-war: living champions at the pit decide the odds -->
        <div class="tug-section">
          <div class="tug-side tug-side--own">
            <span class="tug-pips">
              <span v-for="p in ownAtPit" :key="p" class="tug-pip tug-pip--own" />
            </span>
            <span class="tug-label">{{ ownAtPit }} champs · {{ ownDps }}/s</span>
          </div>
          <div class="tug-track">
            <div class="tug-own" :style="{ width: ownShare + '%' }" />
          </div>
          <div class="tug-side tug-side--enemy">
            <span class="tug-label">{{ enemyAtPit }} champs · {{ enemyDps }}/s</span>
            <span class="tug-pips">
              <span v-for="p in enemyAtPit" :key="p" class="tug-pip tug-pip--enemy" />
            </span>
          </div>
        </div>

        <!-- Hint -->
        <div class="hint-row">
          <span v-if="battleStore.objectiveResult === null" class="hint-text">Click the beast — every hit tips the scales!</span>
        </div>

        <!-- Result overlay with burst rays -->
        <Transition name="result-pop">
          <div v-if="battleStore.objectiveResult !== null" class="result-overlay" :class="resultClass">
            <div class="result-rays" />
            <span class="result-label">{{ resultLabel }}</span>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { OBJECTIVE_BASE_DPS_PER_CHAMP, OBJECTIVE_CLICK_DAMAGE } from '@/config/constants'

const HP_SEGMENTS = 10

const battleStore = useBattleStore()

const show = computed(() => battleStore.objectiveModalOpen || battleStore.objectiveResult !== null)
const isDrake = computed(() => battleStore.activeObjective === 'drake')

const objectiveTitle = computed(() => (isDrake.value ? 'HEXTECH DRAKE' : 'BARON NASHOR'))
const objectiveSubtitle = computed(() =>
  isDrake.value ? 'The drake has spawned — claim it!' : 'The Baron has awakened — strike now!',
)

function countAtPit(idxs: number[] | undefined, until: number[]): number {
  if (!idxs) return 3
  return Math.max(1, idxs.filter((i) => until[i] <= battleStore.battleTime).length)
}

const ownAtPit = computed(() =>
  countAtPit(battleStore.activeObjectiveParticipants?.t1, battleStore.respawnUntil.t1),
)
const enemyAtPit = computed(() =>
  countAtPit(battleStore.activeObjectiveParticipants?.t2, battleStore.respawnUntil.t2),
)
const ownDps = computed(() => ownAtPit.value * OBJECTIVE_BASE_DPS_PER_CHAMP)
const enemyDps = computed(() => enemyAtPit.value * OBJECTIVE_BASE_DPS_PER_CHAMP)
const ownShare = computed(() =>
  Math.round((ownDps.value / Math.max(1, ownDps.value + enemyDps.value)) * 100),
)

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
  if (r === 'player') return 'YOU SECURED IT!'
  if (r === 'own') return 'SECURED'
  return 'STOLEN'
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
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
}

/* ── Modal card ──────────────────────────────────────────────────────────── */
.objective-modal {
  position: relative;
  width: 380px;
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
  width: 100%;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  padding: 9px 12px 7px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.obj-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  animation: title-breathe 2.4s ease-in-out infinite;
}
.title--drake {
  color: #6ee0a0;
  text-shadow: 0 0 14px rgba(34, 197, 94, 0.6);
}
.title--baron {
  color: #c9a0f5;
  text-shadow: 0 0 14px rgba(168, 85, 247, 0.6);
}

.obj-subtitle {
  font-size: 10px;
  letter-spacing: 1px;
  color: #7a6030;
}

/* ── Arena ───────────────────────────────────────────────────────────────── */
.boss-arena {
  position: relative;
  width: 190px;
  height: 190px;
  margin: 12px auto 2px;
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
  width: 138px;
  height: 138px;
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
  font-size: 19px;
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
  height: 12px;
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
  font-size: 11px;
  color: #a09060;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}

/* ── Tug-of-war ──────────────────────────────────────────────────────────── */
.tug-section {
  width: calc(100% - 28px);
  margin: 6px 14px 2px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tug-track {
  height: 9px;
  border-radius: 3px;
  border: 1px solid #3e200a;
  background: linear-gradient(to bottom, #7a2818, #57201a);
  overflow: hidden;
}
.tug-own {
  height: 100%;
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.6);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.tug-side {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tug-side--own { justify-content: flex-start; }
.tug-side--enemy { justify-content: flex-end; }

.tug-pips {
  display: flex;
  gap: 3px;
}
.tug-pip {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.tug-pip--own {
  background: #52b830;
  box-shadow: 0 0 4px #52b830;
}
.tug-pip--enemy {
  background: #cc6050;
  box-shadow: 0 0 4px #cc6050;
}

.tug-label {
  font-size: 10px;
  letter-spacing: 0.04em;
  color: #8a8070;
}
.tug-side--own .tug-label { color: #6ec040; }
.tug-side--enemy .tug-label { color: #e07060; }

/* ── Hint ────────────────────────────────────────────────────────────────── */
.hint-row {
  width: 100%;
  padding: 6px 12px 10px;
  text-align: center;
  min-height: 26px;
}
.hint-text {
  font-size: 10px;
  color: #7a6030;
  letter-spacing: 0.06em;
  animation: hint-blink 2.5s ease-in-out infinite;
}

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

.result-label {
  position: relative;
  font-size: 27px;
  font-weight: 900;
  letter-spacing: 0.08em;
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

@keyframes title-breathe {
  0%, 100% { letter-spacing: 4px; opacity: 1; }
  50% { letter-spacing: 5px; opacity: 0.85; }
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

@keyframes hint-blink {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
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
  .obj-title,
  .hint-text,
  .result-rays,
  .hp-section--shake {
    animation: none !important;
  }
}
</style>
