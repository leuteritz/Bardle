<template>
  <!-- Alert vignette flash when rescue event spawns -->
  <Transition name="vignette-fade">
    <div v-if="showFlash" class="planet-vignette" aria-hidden="true" />
  </Transition>

  <!-- Countdown bar + label -->
  <div v-if="planetEventStore.isEventActive" class="planet-countdown-bar" aria-hidden="true">
    <div class="planet-countdown-fill" :style="{ width: progressPercent + '%' }" />
    <span class="planet-countdown-label">⚠ Planet in Distress — Click to Save!</span>
  </div>

  <!-- Planet Lost toast -->
  <Transition name="toast-slide">
    <div v-if="showLostToast" class="planet-toast planet-toast--lost">💥 Planet Lost!</div>
  </Transition>

  <!-- Planet Saved toast -->
  <Transition name="toast-slide">
    <div v-if="showSavedToast" class="planet-toast planet-toast--saved">
      ✨ Planet Saved! +{{ formatNumber(savedReward) }} Chimes
      <template v-if="droppedMaterial">
        <br />
        <span class="toast-material">
          {{ droppedMaterial.icon }} {{ droppedMaterial.name }} erhalten!
        </span>
      </template>
      <template v-else>
        <br />
        <span class="toast-material toast-material--none">Kein Material gedroppt</span>
      </template>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePlanetEventStore } from '../../stores/planetEventStore'
import { formatNumber } from '../../config/numberFormat'
import { MATERIALS } from '../../config/materials'

const planetEventStore = usePlanetEventStore()

// Drive countdown reactivity at 200ms resolution
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

const progressPercent = computed(() => {
  const ev = planetEventStore.activePlanetEvent
  if (!ev || !planetEventStore.isEventActive) return 0
  const remaining = Math.max(0, ev.durationMs - (now.value - ev.startTime))
  return (remaining / ev.durationMs) * 100
})

// Flash on event spawn
const showFlash = ref(false)
let flashTimeout: ReturnType<typeof setTimeout> | null = null

watch(
  () => planetEventStore.pendingRescue,
  (pending) => {
    if (!pending) return
    showFlash.value = true
    if (flashTimeout) clearTimeout(flashTimeout)
    flashTimeout = setTimeout(() => {
      showFlash.value = false
    }, 1500)
  },
)

// Lost toast
const showLostToast = ref(false)
watch(
  () => planetEventStore.activePlanetEvent?.expired,
  (expired) => {
    if (!expired) return
    showLostToast.value = true
    setTimeout(() => {
      showLostToast.value = false
    }, 2500)
  },
)

const droppedMaterial = computed(() =>
  planetEventStore.lastDroppedMaterialId
    ? (MATERIALS.find((m) => m.id === planetEventStore.lastDroppedMaterialId) ?? null)
    : null
)

// Saved toast
const showSavedToast = ref(false)
const savedReward = ref(0)
watch(
  () => planetEventStore.activePlanetEvent?.saved,
  (saved) => {
    if (!saved || !planetEventStore.activePlanetEvent) return
    savedReward.value = planetEventStore.activePlanetEvent.reward
    showSavedToast.value = true
    setTimeout(() => {
      showSavedToast.value = false
    }, 2500)
  },
)
</script>

<style scoped>
/* Vignette flash */
.planet-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(255, 60, 0, 0.35) 100%);
}

.vignette-fade-enter-active {
  animation: vignetteIn 0.3s ease-out;
}
.vignette-fade-leave-active {
  animation: vignetteOut 1.2s ease-in forwards;
}

@keyframes vignetteIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes vignetteOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Countdown bar */
.planet-countdown-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 6px;
  z-index: 16;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
}

.planet-countdown-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6a00, #ff0000);
  box-shadow:
    0 0 8px rgba(255, 60, 0, 0.8),
    0 0 16px rgba(255, 60, 0, 0.4);
  transition: width 0.2s linear;
}

.planet-countdown-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 8px;
  font-size: 0.7rem;
  font-weight: bold;
  color: #ff8040;
  text-shadow: 0 0 8px rgba(255, 60, 0, 0.9);
  white-space: nowrap;
  letter-spacing: 0.05em;
  pointer-events: none;
}

/* Toasts */
.planet-toast {
  position: fixed;
  top: 15vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 0.6rem 1.4rem;
  border-radius: 0.75rem;
  font-weight: bold;
  font-size: 1rem;
  text-align: center;
  pointer-events: none;
  backdrop-filter: blur(8px);
}

.planet-toast--lost {
  background: rgba(40, 0, 0, 0.85);
  border: 1px solid rgba(255, 60, 0, 0.6);
  color: #ff6030;
  box-shadow: 0 0 20px rgba(255, 60, 0, 0.4);
}

.toast-material {
  font-size: 0.75rem;
  font-weight: normal;
  opacity: 0.85;
}

.toast-material--none {
  opacity: 0.5;
}

.planet-toast--saved {
  background: rgba(0, 30, 10, 0.85);
  border: 1px solid rgba(80, 220, 120, 0.6);
  color: #60ee90;
  box-shadow: 0 0 20px rgba(80, 220, 120, 0.4);
}

.toast-slide-enter-active {
  animation: toastIn 0.3s ease-out;
}
.toast-slide-leave-active {
  animation: toastOut 0.4s ease-in forwards;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-12px);
  }
}
</style>
