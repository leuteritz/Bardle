<template>
  <Transition name="obj-pop">
    <div v-if="show" class="objective-overlay">
      <div class="objective-modal">
        <!-- Gold accent bar -->
        <div class="accent-bar" />

        <!-- Header -->
        <div class="obj-header">
          <span class="obj-title">{{ objectiveTitle }}</span>
          <span class="obj-subtitle">{{ objectiveSubtitle }}</span>
        </div>

        <!-- Boss image + click zone -->
        <div
          class="boss-zone"
          @click="handleClick"
          @mousedown="imgPressed = true"
          @mouseup="imgPressed = false"
          @mouseleave="imgPressed = false"
        >
          <div class="boss-glow" :class="{ 'boss-glow--drake': isDrake, 'boss-glow--baron': !isDrake }" />
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
          <!-- Floating damage numbers -->
          <TransitionGroup name="dmg-float" tag="div" class="dmg-floats">
            <span v-for="f in damageFloats" :key="f.id" class="dmg-float">+{{ f.value }}</span>
          </TransitionGroup>
        </div>

        <!-- HP bar -->
        <div class="hp-section">
          <div class="hp-bar-track">
            <div
              class="hp-bar-fill"
              :class="{ 'hp-bar-fill--drake': isDrake, 'hp-bar-fill--baron': !isDrake }"
              :style="{ width: hpPercent + '%' }"
            />
          </div>
          <div class="hp-text">{{ Math.ceil(battleStore.objectiveHP) }} / {{ battleStore.objectiveMaxHP }}</div>
        </div>

        <!-- DPS indicators -->
        <div class="dps-row">
          <div class="dps-badge dps-badge--own">
            <span class="dps-dot dps-dot--own" />
            Your Team {{ OBJECTIVE_OWN_TEAM_DPS }}/s
          </div>
          <div class="dps-badge dps-badge--enemy">
            <span class="dps-dot dps-dot--enemy" />
            Enemy {{ OBJECTIVE_ENEMY_TEAM_DPS }}/s
          </div>
        </div>

        <!-- Kill feed / hint -->
        <div class="kill-feed">
          <span v-if="battleStore.objectiveResult === null" class="kill-feed-text">Click to deal bonus damage!</span>
        </div>

        <!-- Result overlay -->
        <Transition name="result-pop">
          <div v-if="battleStore.objectiveResult !== null" class="result-overlay" :class="resultClass">
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
import { OBJECTIVE_OWN_TEAM_DPS, OBJECTIVE_ENEMY_TEAM_DPS, OBJECTIVE_CLICK_DAMAGE } from '@/config/constants'

const battleStore = useBattleStore()

const show = computed(() => battleStore.objectiveModalOpen || battleStore.objectiveResult !== null)
const isDrake = computed(() => battleStore.activeObjective === 'drake')

const objectiveTitle = computed(() => (isDrake.value ? 'DRAGON' : 'BARON NASHOR'))
const objectiveSubtitle = computed(() =>
  isDrake.value ? 'Elemental Drake has spawned' : 'Baron Nashor has awakened',
)

const hpPercent = computed(() => {
  if (battleStore.objectiveMaxHP === 0) return 0
  return Math.max(0, (battleStore.objectiveHP / battleStore.objectiveMaxHP) * 100)
})

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

// ── Click damage floats ────────────────────────────────────────────────────
interface DmgFloat { id: number; value: number }
const damageFloats = ref<DmgFloat[]>([])
let _floatId = 0

const imgPressed = ref(false)

function handleClick() {
  if (battleStore.objectiveResult !== null) return
  battleStore.clickObjective()
  const id = ++_floatId
  damageFloats.value.push({ id, value: OBJECTIVE_CLICK_DAMAGE })
  setTimeout(() => {
    damageFloats.value = damageFloats.value.filter((f) => f.id !== id)
  }, 700)
}

watch(show, (v) => {
  if (!v) damageFloats.value = []
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
  width: 300px;
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310, 0 20px 50px rgba(0, 0, 0, 0.95);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── Gold accent bar ─────────────────────────────────────────────────────── */
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
  padding: 8px 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.obj-title {
  font-size: 16px;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.08em;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.5);
}

.obj-subtitle {
  font-size: 10px;
  color: #7a6030;
  letter-spacing: 0.04em;
}

/* ── Boss image zone ─────────────────────────────────────────────────────── */
.boss-zone {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 14px auto 6px;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.boss-glow {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  filter: blur(20px);
  opacity: 0.45;
  animation: glow-pulse 1.8s ease-in-out infinite;
}

.boss-glow--drake {
  background: radial-gradient(circle, #e87030, #cc4020 60%, transparent);
}

.boss-glow--baron {
  background: radial-gradient(circle, #a855f7, #7c3cb0 60%, transparent);
}

.boss-img {
  position: relative;
  z-index: 1;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  object-fit: cover;
  transition: transform 0.08s ease;
  border: 3px solid #7a4e20;
}

.boss-img--drake {
  box-shadow:
    0 0 20px rgba(232, 112, 48, 0.7),
    0 0 40px rgba(200, 64, 32, 0.35),
    inset 0 0 0 1px #3e200a;
}

.boss-img--baron {
  box-shadow:
    0 0 20px rgba(168, 85, 247, 0.7),
    0 0 40px rgba(124, 60, 176, 0.35),
    inset 0 0 0 1px #3e200a;
}

.boss-img--pressed {
  transform: scale(0.91);
}

/* Floating damage numbers */
.dmg-floats {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dmg-float {
  position: absolute;
  font-size: 15px;
  font-weight: 700;
  color: #e8c040;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  top: 8%;
}

.dmg-float-enter-active {
  animation: float-up 0.7s ease forwards;
}

.dmg-float-leave-active {
  display: none;
}

/* ── HP bar ──────────────────────────────────────────────────────────────── */
.hp-section {
  width: calc(100% - 24px);
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 8px 12px 4px;
}

.hp-bar-track {
  width: 100%;
  height: 10px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 3px;
  overflow: hidden;
}

.hp-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.2s ease;
}

.hp-bar-fill--drake {
  background: linear-gradient(to right, #cc4020, #e87030);
  box-shadow: 0 0 8px rgba(232, 112, 48, 0.6);
}

.hp-bar-fill--baron {
  background: linear-gradient(to right, #7c3cb0, #a855f7);
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.6);
}

.hp-text {
  text-align: center;
  font-size: 11px;
  color: #a09060;
  letter-spacing: 0.04em;
}

/* ── DPS badges ──────────────────────────────────────────────────────────── */
.dps-row {
  display: flex;
  gap: 8px;
  margin: 6px 12px;
  width: calc(100% - 24px);
}

.dps-badge {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.dps-badge--own {
  background: rgba(82, 184, 48, 0.12);
  border: 1px solid rgba(82, 184, 48, 0.35);
  color: #6ec040;
}

.dps-badge--enemy {
  background: rgba(204, 96, 80, 0.12);
  border: 1px solid rgba(204, 96, 80, 0.35);
  color: #e07060;
}

.dps-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dps-dot--own {
  background: #52b830;
  box-shadow: 0 0 4px #52b830;
}

.dps-dot--enemy {
  background: #cc6050;
  box-shadow: 0 0 4px #cc6050;
}

/* ── Kill feed ───────────────────────────────────────────────────────────── */
.kill-feed {
  width: 100%;
  padding: 6px 12px 10px;
  text-align: center;
  min-height: 26px;
}

.kill-feed-text {
  font-size: 10px;
  color: #5a4820;
  letter-spacing: 0.04em;
  animation: blink 2.5s ease-in-out infinite;
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
}

.result-overlay--player { background: rgba(232, 192, 64, 0.18); }
.result-overlay--own    { background: rgba(82, 184, 48, 0.18); }
.result-overlay--enemy  { background: rgba(204, 96, 80, 0.18); }

.result-label {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.9);
}

.result-overlay--player .result-label {
  color: #e8c040;
  text-shadow: 0 0 24px rgba(232, 192, 64, 0.8), 0 2px 8px rgba(0, 0, 0, 0.9);
}

.result-overlay--own .result-label {
  color: #6ec040;
  text-shadow: 0 0 24px rgba(110, 192, 64, 0.8), 0 2px 8px rgba(0, 0, 0, 0.9);
}

.result-overlay--enemy .result-label {
  color: #e07060;
  text-shadow: 0 0 24px rgba(224, 112, 96, 0.8), 0 2px 8px rgba(0, 0, 0, 0.9);
}

/* ── Modal entrance transition ───────────────────────────────────────────── */
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

/* ── Result pop transition ───────────────────────────────────────────────── */
.result-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.result-pop-leave-active {
  transition: opacity 0.15s ease;
}
.result-pop-enter-from {
  opacity: 0;
  transform: scale(1.15);
}
.result-pop-leave-to {
  opacity: 0;
}

/* ── Animations ──────────────────────────────────────────────────────────── */
@keyframes glow-pulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50%       { opacity: 0.6;  transform: scale(1.08); }
}

@keyframes float-up {
  0%   { opacity: 1;   transform: translateY(0) scale(1.1); }
  80%  { opacity: 0.8; transform: translateY(-32px) scale(1); }
  100% { opacity: 0;   transform: translateY(-42px) scale(0.9); }
}

@keyframes blink {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
</style>
