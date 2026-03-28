<template>
  <Transition name="modal-fade">
    <div
      v-if="planetEventStore.rescueModalOpen"
      class="modal-backdrop rpg-overlay"
      aria-modal="true"
      role="dialog"
    >
      <div class="modal-card">
        <h3 class="modal-title">⚠ Planet in Distress</h3>

        <div class="countdown-bar">
          <div class="countdown-fill" :style="{ width: progressPercent + '%' }" />
        </div>

        <span class="timer-text">{{ secondsRemaining }}s</span>

        <div ref="planetStage" class="planet-stage" @click="handleClick" />

        <div v-if="planetEventStore.activePlanetEvent" class="click-progress">
          <span
            v-for="i in planetEventStore.activePlanetEvent.clicksRequired"
            :key="i"
            class="dot"
            :class="{ 'dot--done': i <= (planetEventStore.activePlanetEvent.clicksMade ?? 0) }"
          />
        </div>

        <p class="hint-text">Click the planet to rescue it!</p>

        <div v-if="assignedMaterial" class="drop-list">
          <p class="drop-list-title">Möglicher Drop</p>
          <div class="drop-row">
            <span class="drop-name" :class="`rarity--${assignedMaterial.rarity}`">
              {{ assignedMaterial.name }}
            </span>
            <span class="drop-chance">
              {{ Math.round((planetEventStore.activePlanetEvent?.assignedDropChance ?? 0) * 100) }}%
            </span>
          </div>
        </div>

        <div v-if="homePlanetChampion" class="drop-list home-planet-info">
          <p class="drop-list-title">Heimatplanet</p>
          <div class="drop-row">
            <span class="home-planet-champion-name">{{ homePlanetChampion }}</span>
          </div>
          <p class="home-planet-hint">Rette den Planeten, um diesen Champion freizuschalten!</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { usePlanetEventStore } from '../../stores/planetEventStore'
import { useGameStore } from '../../stores/gameStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useBattleStore } from '../../stores/battleStore'
import { NS, drawPlanet } from '../../utils/planetDraw'
import { MATERIALS } from '../../config/materials'
import { CHAMPION_HOME_PLANETS } from '../../config/championHomePlanets'

const planetEventStore = usePlanetEventStore()
const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const battleStore = useBattleStore()

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
  const ev = planetEventStore.activePlanetEvent
  if (!ev || !planetEventStore.isEventActive) return 0
  return Math.max(0, Math.ceil((ev.durationMs - (now.value - ev.startTime)) / 1000))
})

const progressPercent = computed(() => {
  const ev = planetEventStore.activePlanetEvent
  if (!ev || !planetEventStore.isEventActive) return 0
  const remaining = Math.max(0, ev.durationMs - (now.value - ev.startTime))
  return (remaining / ev.durationMs) * 100
})

function renderPlanet() {
  if (!planetStage.value) return
  const ev = planetEventStore.activePlanetEvent
  if (!ev) return

  planetStage.value.innerHTML = ''
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('width', '320')
  svg.setAttribute('height', '320')
  svg.setAttribute('viewBox', '0 0 320 320')
  svg.style.width = '100%'
  svg.style.height = '100%'
  svg.style.animation = 'planetDistress 2s ease-in-out infinite'
  drawPlanet(svg, `modal-${Date.now()}`, ev.planetType, 160, 160, 140, 320)
  planetStage.value.appendChild(svg)
}

watch(
  () => planetEventStore.rescueModalOpen,
  (open) => {
    if (open) nextTick(renderPlanet)
  },
)

// Close modal when event ends (saved or expired)
watch(
  () => planetEventStore.isEventActive,
  (active) => {
    if (!active) planetEventStore.closeRescueModal()
  },
)

const assignedMaterial = computed(() => {
  const id = planetEventStore.activePlanetEvent?.potentialMaterialId
  return id ? (MATERIALS.find((m) => m.id === id) ?? null) : null
})

const homePlanetChampion = computed(
  () => planetEventStore.activePlanetEvent?.homePlanetChampion ?? null,
)

function handleClick() {
  const reward = planetEventStore.activePlanetEvent?.reward ?? 0
  const completed = planetEventStore.registerClick()

  if (completed) {
    if (reward > 0) {
      gameStore.chimes += reward
      gameStore.chimesForNextUniverse += Math.floor(reward * 0.3)
      gameStore.calculateLevel()
    }
    const ev = planetEventStore.activePlanetEvent
    if (ev?.potentialMaterialId && ev.assignedDropChance != null) {
      const dropped = inventoryStore.tryDropSpecificMaterial(
        ev.potentialMaterialId,
        ev.assignedDropChance,
      )
      planetEventStore.lastDroppedMaterialId = dropped ? ev.potentialMaterialId : null
    }

    // Champion recruitment from home planet
    if (ev?.homePlanetChampion) {
      const config = CHAMPION_HOME_PLANETS.find((c) => c.championName === ev.homePlanetChampion)
      if (config) {
        battleStore.addRecruitableChampion(ev.homePlanetChampion, config.materialCost)
      }
    }
  } else {
    // Pulse feedback on intermediate clicks
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
  width: clamp(360px, 45vw, 560px);

  background: var(--rpg-bg-deep);
  border: 4px solid var(--rpg-wood);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 20px 50px rgba(0, 0, 0, 0.8);

  padding: 1.75rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
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
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
  color: var(--rpg-gold);
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.5);
}

/* ─── Countdown bar ────────────────────────────────────────────────────────── */
.countdown-bar {
  width: 100%;
  height: 4px;
  border-radius: 4px;
  background: #1a1a16;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
}

.countdown-fill {
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
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--rpg-gold);
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
}

/* ─── Planet Stage ─────────────────────────────────────────────────────────── */
.planet-stage {
  width: 320px;
  height: 320px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.1s ease,
    filter 0.1s ease;
  filter: drop-shadow(0 0 18px rgba(255, 100, 20, 0.25));
}

.planet-stage:hover {
  transform: scale(1.04);
  filter: drop-shadow(0 0 28px rgba(255, 120, 30, 0.45));
}

.planet-stage:active {
  transform: scale(0.96);
}

/* ─── Click-Progress Dots ──────────────────────────────────────────────────── */
.click-progress {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  justify-content: center;
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: rgba(255, 100, 0, 0.12);
  border: 1.5px solid rgba(255, 120, 30, 0.4);
  transition:
    background 0.12s,
    box-shadow 0.12s,
    border-color 0.12s;
}

.dot--done {
  background: rgba(255, 170, 50, 0.95);
  border-color: var(--rpg-gold-dim);
  box-shadow:
    0 0 6px rgba(255, 140, 20, 0.9),
    0 0 12px rgba(255, 100, 0, 0.5);
}

/* ─── Hint ─────────────────────────────────────────────────────────────────── */
.hint-text {
  font-size: 0.7rem;
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
