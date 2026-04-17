<template>
  <Teleport to="body">
    <Transition name="pause-fade">
      <div
        v-if="!windowFocused"
        class="pause-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Spiel pausiert"
      >
        <div class="pause-card">
          <!-- Icon -->
          <div class="pause-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </div>

          <h2 class="pause-title">Pausiert</h2>
          <p class="pause-subtitle">Klicke ins Spielfenster um fortzufahren</p>

          <!-- Chime-Logik läuft weiter Info -->
          <div class="pause-info">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>Chimes werden weiter gesammelt</span>
          </div>

          <!-- Bonus-Sternsystem wartet -->
          <div v-if="pendingStars > 0" class="pause-info pause-info--bonus">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{{
              pendingStars === 1
                ? 'Ein Bonus-Sternsystem wartet auf dich!'
                : `${pendingStars} Bonus-Sternsysteme warten auf dich!`
            }}</span>
          </div>

          <!-- Champion ETA / Ready -->
          <div v-if="isChampionTraveling || isChampionReady" class="pause-info pause-info--eta" :class="{ 'pause-info--ready': isChampionReady }">
            <svg
              v-if="isChampionTraveling"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span v-if="isChampionTraveling">Champion erreicht Stern in <strong>{{ pauseEtaStr }}</strong></span>
            <span v-else>Champion-Stern wartet — kehre ins Spiel zurück!</span>
          </div>
        </div>
      </div>
    </Transition>

  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useWindowFocus } from '@/composables/useWindowFocus'
import { useGalaxyStore } from '@/stores/galaxyStore'

const { windowFocused } = useWindowFocus()
const galaxyStore = useGalaxyStore()

const pendingStars = computed(() => galaxyStore.pendingResourceStars)
const isChampionTraveling = computed(() => galaxyStore.championTravelState === 'traveling')
const isChampionReady = computed(() => galaxyStore.pendingChampionStar)


const pauseTick = ref(0)
let pauseInterval: ReturnType<typeof setInterval> | null = null

watch(
  windowFocused,
  (focused) => {
    if (!focused) {
      pauseInterval = setInterval(() => {
        pauseTick.value++
      }, 1000)
    } else {
      if (pauseInterval !== null) {
        clearInterval(pauseInterval)
        pauseInterval = null
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (pauseInterval !== null) clearInterval(pauseInterval)
})

const pauseEtaStr = computed(() => {
  void pauseTick.value
  if (!isChampionTraveling.value) return ''
  const elapsed = Date.now() - galaxyStore.championTravelStartTime
  const remaining = Math.max(0, galaxyStore.championTravelDurationMs - elapsed)
  const s = Math.ceil(remaining / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
})
</script>

<style scoped>
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.pause-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 56px;
  background: rgba(14, 10, 28, 0.92);
  border: 1px solid rgba(251, 191, 36, 0.18);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(251, 191, 36, 0.06),
    0 24px 64px rgba(0, 0, 0, 0.6),
    0 0 80px rgba(251, 191, 36, 0.04);
  text-align: center;
}

.pause-icon {
  color: rgba(251, 191, 36, 0.7);
  margin-bottom: 4px;
}

.pause-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f0c840;
  letter-spacing: 0.04em;
  margin: 0;
  text-shadow: 0 0 24px rgba(251, 191, 36, 0.4);
}

.pause-subtitle {
  font-size: 0.95rem;
  color: rgba(200, 185, 140, 0.7);
  margin: 0;
}

.pause-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.1);
  color: rgba(251, 191, 36, 0.55);
  font-size: 0.82rem;
}

.pause-info--bonus {
  background: rgba(30, 140, 80, 0.1);
  border-color: rgba(82, 184, 48, 0.25);
  color: #52b830;
}

.pause-info--eta {
  background: rgba(232, 192, 64, 0.08);
  border-color: rgba(232, 192, 64, 0.2);
  color: #e8c040;
}

.pause-info--ready {
  background: rgba(232, 192, 64, 0.14);
  border-color: rgba(232, 192, 64, 0.4);
  color: #f0d060;
}

/* Transitions */
.pause-fade-enter-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}
.pause-fade-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}
.pause-fade-enter-from,
.pause-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}


</style>
