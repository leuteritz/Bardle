<template>
  <Transition name="modal-fade">
    <div
      v-if="planetEventStore.rescueModalOpen"
      class="modal-backdrop"
      aria-modal="true"
      role="dialog"
    >
      <div class="modal-card">
        <h3 class="modal-title">⚠ Planet in Distress</h3>

        <!-- Countdown bar -->
        <div class="countdown-bar">
          <div class="countdown-fill" :style="{ width: progressPercent + '%' }" />
        </div>

        <!-- Seconds remaining -->
        <span class="timer-text">{{ secondsRemaining }}s</span>

        <!-- Planet stage — click here to rescue -->
        <div ref="planetStage" class="planet-stage" @click="handleClick" />

        <!-- Click progress dots -->
        <div v-if="planetEventStore.activePlanetEvent" class="click-progress">
          <span
            v-for="i in planetEventStore.activePlanetEvent.clicksRequired"
            :key="i"
            class="dot"
            :class="{ 'dot--done': i <= (planetEventStore.activePlanetEvent.clicksMade ?? 0) }"
          />
        </div>

        <p class="hint-text">Click the planet to rescue it!</p>

        <!-- Mögliche Material-Drops -->
        <div class="drop-list">
          <p class="drop-list-title">Mögliche Drops</p>
          <div v-for="mat in MATERIALS" :key="mat.id" class="drop-row">
            <span class="drop-icon">{{ mat.icon }}</span>
            <span class="drop-name" :class="`rarity--${mat.rarity}`">{{ mat.name }}</span>
            <span class="drop-chance">{{ (mat.dropChance * 100).toFixed(0) }}%</span>
          </div>
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
import { NS, drawPlanet } from '../../utils/planetDraw'
import { MATERIALS } from '../../config/materials'

const planetEventStore = usePlanetEventStore()
const gameStore = useGameStore()
const inventoryStore = useInventoryStore()

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

function handleClick() {
  const reward = planetEventStore.activePlanetEvent?.reward ?? 0
  const completed = planetEventStore.registerClick()

  if (completed) {
    if (reward > 0) {
      gameStore.chimes += reward
      gameStore.chimesForNextUniverse += Math.floor(reward * 0.3)
      gameStore.calculateLevel()
    }
    inventoryStore.tryDropMaterial(0.30)
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
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999; /* war 50 — jetzt über allem */
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto; /* war none — blockiert jetzt Hintergrund */
  background: rgba(0, 2, 15, 0.75); /* etwas dunkler für besseres Overlay */
  backdrop-filter: blur(8px);
}

.modal-card {
  pointer-events: auto;
  width: clamp(360px, 45vw, 560px);
  background: linear-gradient(135deg, #020818 0%, #06152e 50%, #020c1a 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1rem;
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(255, 80, 0, 0.15);
  backdrop-filter: blur(16px);
  padding: 1.75rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.modal-title {
  font-size: 1rem;
  font-weight: bold;
  color: #ff8040;
  text-shadow: 0 0 10px rgba(255, 80, 0, 0.7);
  letter-spacing: 0.04em;
  margin: 0;
}

.countdown-bar {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.countdown-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6a00, #ff0000);
  box-shadow: 0 0 8px rgba(255, 60, 0, 0.8);
  transition: width 0.2s linear;
}

.planet-stage {
  width: 320px;
  height: 320px;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
}

.planet-stage:hover {
  transform: scale(1.04);
}

.planet-stage:active {
  transform: scale(0.96);
}

.timer-text {
  font-size: 1.4rem;
  font-weight: bold;
  color: #ff6a00;
  text-shadow: 0 0 12px rgba(255, 80, 0, 0.8);
  letter-spacing: 0.05em;
}

.click-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: rgba(255, 100, 0, 0.2);
  border: 1.5px solid rgba(255, 100, 0, 0.6);
  transition:
    background 0.12s,
    box-shadow 0.12s;
}

.dot--done {
  background: rgba(255, 160, 40, 0.9);
  box-shadow: 0 0 7px rgba(255, 100, 0, 0.9);
}

.hint-text {
  font-size: 0.72rem;
  color: rgba(255, 200, 130, 0.6);
  margin: 0;
  letter-spacing: 0.03em;
}

.drop-list {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.drop-list-title {
  font-size: 0.6rem;
  color: rgba(255, 200, 130, 0.45);
  margin: 0 0 0.2rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.drop-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
}

.drop-icon {
  font-size: 0.85rem;
  width: 1.25rem;
  text-align: center;
}

.drop-name {
  flex: 1;
}

.drop-chance {
  color: rgba(255, 200, 100, 0.75);
  font-weight: bold;
  min-width: 2rem;
  text-align: right;
}

.rarity--common   { color: rgba(200, 200, 200, 0.75); }
.rarity--uncommon { color: rgba(100, 220, 100, 0.9); }
.rarity--rare     { color: rgba(100, 150, 255, 0.9); }
.rarity--epic     { color: rgba(200, 100, 255, 0.9); }

/* Transition */
.modal-fade-enter-active {
  animation: modalIn 0.25s ease-out;
}
.modal-fade-leave-active {
  animation: modalOut 0.22s ease-in forwards;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.88);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes modalOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}
</style>
