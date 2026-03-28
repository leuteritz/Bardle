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
          <img :src="droppedMaterial.image" class="toast-material-img rpg-img" alt="" />
          {{ droppedMaterial.name }} erhalten!
        </span>
      </template>
      <template v-else-if="savedHadMaterial">
        <br />
        <span class="toast-material toast-material--none">Kein Material gedroppt</span>
      </template>
      <template v-if="savedChampionName">
        <br />
        <span class="toast-material toast-material--champion">
          {{ savedChampionName }} entdeckt! Sieh im Champion Shop nach.
        </span>
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
    : null,
)

// Saved toast
const showSavedToast = ref(false)
const savedReward = ref(0)
const savedHadMaterial = ref(false)
const savedChampionName = ref<string | null>(null)
watch(
  () => planetEventStore.activePlanetEvent?.saved,
  (saved) => {
    if (!saved || !planetEventStore.activePlanetEvent) return
    savedReward.value = planetEventStore.activePlanetEvent.reward
    savedHadMaterial.value = !!planetEventStore.activePlanetEvent.potentialMaterialId
    savedChampionName.value = planetEventStore.activePlanetEvent.homePlanetChampion ?? null
    showSavedToast.value = true
    setTimeout(() => {
      showSavedToast.value = false
    }, 2500)
  },
)
</script>

<style scoped>
/* ─── Vignette Flash (atmospheric FX — kept as-is) ─────────────────────────── */
.planet-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  background: radial-gradient(
    ellipse at center,
    transparent 35%,
    rgba(255, 55, 0, 0.28) 75%,
    rgba(255, 30, 0, 0.45) 100%
  );
}

.vignette-fade-enter-active {
  animation: vignetteIn 0.25s ease-out;
}
.vignette-fade-leave-active {
  animation: vignetteOut 1.3s ease-in forwards;
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

/* ─── Countdown Bar ────────────────────────────────────────────────────────── */
.planet-countdown-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 5px;
  z-index: 16;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
}

.planet-countdown-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rpg-danger), var(--rpg-danger-dark));
  box-shadow:
    0 0 10px rgba(255, 60, 0, 0.9),
    0 0 22px rgba(255, 40, 0, 0.45);
  transition: width 0.2s linear;
  border-radius: 0 3px 3px 0;
}

.planet-countdown-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 9px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
  color: var(--rpg-orange);
  text-shadow: 0 0 6px rgba(255, 80, 0, 0.8);
}

/* ─── Toasts ───────────────────────────────────────────────────────────────── */
.planet-toast {
  position: fixed;
  top: 15vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 0.65rem 1.5rem;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.95rem;
  text-align: center;
  pointer-events: none;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* ─── Lost Toast ───────────────────────────────────────────────────────────── */
.planet-toast--lost {
  background: var(--rpg-bg-red-subtle);
  border: 1px solid var(--rpg-danger);
  color: var(--rpg-danger);
  box-shadow:
    0 0 0 1px rgba(255, 60, 0, 0.08),
    0 0 20px rgba(255, 50, 0, 0.35),
    0 12px 40px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  text-shadow: 0 0 12px rgba(255, 60, 0, 0.6);
}

/* ─── Saved Toast ──────────────────────────────────────────────────────────── */
.planet-toast--saved {
  background: var(--rpg-bg-green-subtle);
  border: 1px solid var(--rpg-green-border);
  color: var(--rpg-green-light);
  box-shadow:
    0 0 0 1px rgba(70, 220, 120, 0.07),
    0 0 20px rgba(60, 200, 100, 0.3),
    0 12px 40px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  text-shadow: 0 0 10px rgba(60, 220, 100, 0.55);
}

/* ─── Toast sub-content ────────────────────────────────────────────────────── */
.toast-material {
  font-size: 0.74rem;
  font-weight: 500;
  opacity: 0.88;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.toast-material--none {
  opacity: 0.45;
}

.toast-material--champion {
  color: var(--rpg-blue);
  font-weight: 700;
}

.toast-material-img {
  width: 1.4rem;
  height: 1.4rem;
  object-fit: contain;
  vertical-align: middle;
  filter: drop-shadow(0 0 4px rgba(255, 200, 100, 0.55));
}

/* ─── Toast Transition ─────────────────────────────────────────────────────── */
.toast-slide-enter-active {
  animation: toastIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-slide-leave-active {
  animation: toastOut 0.4s ease-in forwards;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-14px) scale(0.95);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
    filter: blur(0);
  }
}
@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px) scale(0.96);
  }
}
</style>
