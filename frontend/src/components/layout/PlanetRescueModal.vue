<template>
  <Transition name="modal-fade">
    <div
      v-if="bossStore.bossModalOpen"
      class="modal-backdrop rpg-overlay"
      aria-modal="true"
      role="dialog"
    >
      <div class="modal-card">
        <h3 class="modal-title">{{ bossStore.activeBoss?.bossName ?? 'Planet Boss' }}</h3>

        <!-- Strength indicator -->
        <div class="strength-row">
          <span class="strength-label">Dein Schaden:</span>
          <span class="strength-value">{{ formatNumber(estimatedPlayerDPS) }}/s</span>
          <span class="strength-sep">|</span>
          <span class="strength-label">Benötigt:</span>
          <span class="strength-value">{{ formatNumber(requiredDPS) }}/s</span>
          <span class="strength-icon" :class="canWin ? 'strength-icon--ok' : 'strength-icon--weak'">
            {{ canWin ? '✓' : '✗' }}
          </span>
        </div>

        <!-- Enrage timer -->
        <div class="enrage-bar">
          <div class="enrage-fill" :style="{ width: enragePercent + '%' }" />
        </div>
        <span class="timer-text">{{ secondsRemaining }}s</span>

        <!-- Boss HP bar -->
        <div class="hp-bar-container">
          <div class="hp-bar">
            <div class="hp-fill" :style="{ width: bossStore.bossHPPercent + '%' }" />
          </div>
          <span class="hp-text">
            {{ formatNumber(bossStore.activeBoss?.currentHP ?? 0) }} /
            {{ formatNumber(bossStore.activeBoss?.maxHP ?? 0) }}
          </span>
        </div>

        <!-- Planet / Click target -->
        <div ref="planetStage" class="planet-stage" @click="handleClick" />

        <!-- Floating damage numbers -->
        <div class="damage-floats" aria-hidden="true">
          <TransitionGroup name="dmg-float">
            <span
              v-for="dmg in damageFloats"
              :key="dmg.id"
              class="damage-number"
              :style="{ left: dmg.x + 'px' }"
            >
              -{{ formatNumber(dmg.value) }}
            </span>
          </TransitionGroup>
        </div>

        <!-- Passive DPS info -->
        <p class="passive-info">
          Idle-Schaden: {{ formatNumber(bossStore.activeBoss?.passiveDPS ?? 0) }}/s
        </p>

        <!-- Drop info -->
        <div v-if="assignedMaterial" class="drop-list">
          <p class="drop-list-title">Möglicher Drop</p>
          <div class="drop-row">
            <span class="drop-name" :class="`rarity--${assignedMaterial.rarity}`">
              {{ assignedMaterial.name }}
            </span>
            <span class="drop-chance">
              {{ Math.round((bossStore.activeBoss?.assignedDropChance ?? 0) * 100) }}%
            </span>
          </div>
        </div>

        <div v-if="homePlanetChampion" class="drop-list home-planet-info">
          <p class="drop-list-title">Heimatplanet</p>
          <div class="drop-row">
            <span class="home-planet-champion-name">{{ homePlanetChampion }}</span>
          </div>
          <p class="home-planet-hint">Besiege den Boss, um diesen Champion freizuschalten!</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, reactive } from 'vue'
import { usePlanetBossStore } from '../../stores/planetBossStore'
import { formatNumber } from '../../config/numberFormat'
import { NS, drawPlanet } from '../../utils/planetDraw'
import { MATERIALS } from '../../config/materials'

const bossStore = usePlanetBossStore()

const planetStage = ref<HTMLDivElement | null>(null)

// Countdown reactivity at 200ms resolution
const now = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 200)
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

const secondsRemaining = computed(() => {
  const boss = bossStore.activeBoss
  if (!boss || !bossStore.isBossActive) return 0
  return Math.max(0, Math.ceil((boss.enrageTimerMs - (now.value - boss.startTime)) / 1000))
})

const enragePercent = computed(() => {
  const boss = bossStore.activeBoss
  if (!boss || !bossStore.isBossActive) return 0
  const remaining = Math.max(0, boss.enrageTimerMs - (now.value - boss.startTime))
  return (remaining / boss.enrageTimerMs) * 100
})

// Strength indicator
const estimatedPlayerDPS = computed(() => bossStore.playerDPS)
const requiredDPS = computed(() => bossStore.requiredDPS)
const canWin = computed(() => estimatedPlayerDPS.value >= requiredDPS.value * 0.7)

// Material + Champion
const assignedMaterial = computed(() => {
  const id = bossStore.activeBoss?.potentialMaterialId
  return id ? (MATERIALS.find((m) => m.id === id) ?? null) : null
})

const homePlanetChampion = computed(() => bossStore.activeBoss?.homePlanetChampion ?? null)

// Floating damage numbers
let dmgIdCounter = 0
const damageFloats = reactive<Array<{ id: number; value: number; x: number }>>([])

function renderPlanet() {
  if (!planetStage.value) return
  const boss = bossStore.activeBoss
  if (!boss) return

  planetStage.value.innerHTML = ''
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('width', '280')
  svg.setAttribute('height', '280')
  svg.setAttribute('viewBox', '0 0 280 280')
  svg.style.width = '100%'
  svg.style.height = '100%'
  svg.style.animation = 'planetDistress 2s ease-in-out infinite'
  drawPlanet(svg, `boss-${Date.now()}`, boss.planetType, 140, 140, 120, 280)
  planetStage.value.appendChild(svg)
}

watch(
  () => bossStore.bossModalOpen,
  (open) => {
    if (open) nextTick(renderPlanet)
  },
)

// Close modal when boss fight ends
watch(
  () => bossStore.isBossActive,
  (active) => {
    if (!active) bossStore.closeBossModal()
  },
)

function handleClick() {
  const boss = bossStore.activeBoss
  if (!boss) return

  const defeated = bossStore.dealClickDamage()

  // Floating damage number
  const id = ++dmgIdCounter
  const x = 100 + Math.random() * 80
  damageFloats.push({ id, value: boss.clickDamagePerHit, x })
  setTimeout(() => {
    const idx = damageFloats.findIndex((d) => d.id === id)
    if (idx !== -1) damageFloats.splice(idx, 1)
  }, 800)

  if (!defeated) {
    // Pulse feedback
    const svg = planetStage.value?.querySelector('svg') as SVGSVGElement | null
    if (svg) {
      svg.style.filter = 'brightness(2.2) saturate(2)'
      setTimeout(() => {
        svg.style.filter = ''
      }, 150)
    }
  }
}
</script>

<style scoped>
/* ─── Backdrop ─────────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

/* ─── Card ─────────────────────────────────────────────────────────────────── */
.modal-card {
  position: relative;
  pointer-events: auto;
  width: clamp(380px, 45vw, 560px);

  background: var(--rpg-bg-deep);
  border: 4px solid var(--rpg-wood);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 20px 50px rgba(0, 0, 0, 0.8);

  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

/* Eckakzent oben-links */
.modal-card::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: 16px;
  height: 16px;
  border-top: 2px solid var(--rpg-gold-dim);
  border-left: 2px solid var(--rpg-gold-dim);
  border-radius: 4px 0 0 0;
  pointer-events: none;
}

/* Eckakzent unten-rechts */
.modal-card::after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 16px;
  height: 16px;
  border-bottom: 2px solid var(--rpg-orange);
  border-right: 2px solid var(--rpg-orange);
  border-radius: 0 0 4px 0;
  pointer-events: none;
}

/* ─── Title ────────────────────────────────────────────────────────────────── */
.modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
  color: var(--rpg-danger);
  text-shadow: 0 0 12px rgba(255, 60, 0, 0.6);
}

/* ─── Strength Indicator ──────────────────────────────────────────────────── */
.strength-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  padding: 0.35rem 0.7rem;
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  width: 100%;
  justify-content: center;
}

.strength-label {
  color: var(--rpg-text-dim);
  letter-spacing: 0.03em;
}

.strength-value {
  color: var(--rpg-gold);
  font-weight: 700;
}

.strength-sep {
  color: var(--rpg-wood-mid);
  margin: 0 0.15rem;
}

.strength-icon {
  font-weight: 700;
  font-size: 0.8rem;
  margin-left: 0.3rem;
}

.strength-icon--ok {
  color: #52b830;
  text-shadow: 0 0 6px rgba(82, 184, 48, 0.6);
}

.strength-icon--weak {
  color: var(--rpg-danger);
  text-shadow: 0 0 6px rgba(255, 60, 0, 0.6);
}

/* ─── Enrage Timer Bar ────────────────────────────────────────────────────── */
.enrage-bar {
  width: 100%;
  height: 4px;
  border-radius: 4px;
  background: #1a1a16;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
}

.enrage-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rpg-danger), var(--rpg-danger-dark));
  box-shadow:
    0 0 10px rgba(255, 60, 0, 0.9),
    0 0 20px rgba(255, 40, 0, 0.4);
  transition: width 0.2s linear;
  border-radius: 4px;
}

/* ─── Timer ────────────────────────────────────────────────────────────────── */
.timer-text {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--rpg-gold);
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
}

/* ─── HP Bar ──────────────────────────────────────────────────────────────── */
.hp-bar-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.hp-bar {
  width: 100%;
  height: 14px;
  border-radius: 4px;
  background: #1a1008;
  overflow: hidden;
  border: 1px solid var(--rpg-wood-mid);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
}

.hp-fill {
  height: 100%;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border-right: 1px solid #6ec040;
  box-shadow:
    0 0 8px rgba(82, 184, 48, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: width 0.15s ease-out;
}

.hp-text {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--rpg-gold);
  letter-spacing: 0.04em;
}

/* ─── Planet Stage ─────────────────────────────────────────────────────────── */
.planet-stage {
  width: 280px;
  height: 280px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.1s ease,
    filter 0.1s ease;
  filter: drop-shadow(0 0 18px rgba(255, 100, 20, 0.25));
  position: relative;
}

.planet-stage:hover {
  transform: scale(1.04);
  filter: drop-shadow(0 0 28px rgba(255, 120, 30, 0.45));
}

.planet-stage:active {
  transform: scale(0.96);
}

/* ─── Floating Damage Numbers ─────────────────────────────────────────────── */
.damage-floats {
  position: relative;
  width: 280px;
  height: 0;
  pointer-events: none;
  overflow: visible;
}

.damage-number {
  position: absolute;
  top: -30px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--rpg-danger);
  text-shadow: 0 0 6px rgba(255, 60, 0, 0.8);
  pointer-events: none;
}

.dmg-float-enter-active {
  animation: dmgUp 0.8s ease-out forwards;
}
.dmg-float-leave-active {
  display: none;
}

@keyframes dmgUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translateY(-60px) scale(0.8);
  }
}

/* ─── Passive Info ─────────────────────────────────────────────────────────── */
.passive-info {
  font-size: 0.62rem;
  color: var(--rpg-text-dim);
  margin: 0;
  letter-spacing: 0.04em;
}

/* ─── Drop List ────────────────────────────────────────────────────────────── */
.drop-list {
  width: 100%;
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  padding: 0.55rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.drop-list-title {
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rpg-gold-dim);
  margin: 0 0 0.25rem;
}

.drop-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
}

.drop-name {
  flex: 1;
}

.drop-chance {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--rpg-gold);
  min-width: 2.2rem;
  text-align: right;
  letter-spacing: 0.02em;
}

/* ─── Home Planet ──────────────────────────────────────────────────────────── */
.home-planet-info {
  border-color: var(--rpg-blue);
  background: rgba(40, 90, 255, 0.04);
}

.home-planet-champion-name {
  color: var(--rpg-blue);
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.03em;
}

.home-planet-hint {
  font-size: 0.55rem;
  color: var(--rpg-text-dim);
  margin: 0.15rem 0 0;
  letter-spacing: 0.02em;
}

/* ─── Rarity ───────────────────────────────────────────────────────────────── */
.rarity--common {
  color: var(--rpg-rarity-common);
}
.rarity--uncommon {
  color: var(--rpg-rarity-uncommon);
}
.rarity--rare {
  color: var(--rpg-rarity-rare);
}
.rarity--epic {
  color: var(--rpg-rarity-epic);
}

/* ─── Transition ───────────────────────────────────────────────────────────── */
.modal-fade-enter-active {
  animation: modalIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.modal-fade-leave-active {
  animation: modalOut 0.22s ease-in forwards;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.88);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
}
@keyframes modalOut {
  from {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
    filter: blur(3px);
  }
}
</style>
