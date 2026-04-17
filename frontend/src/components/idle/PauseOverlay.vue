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
          <!-- Gold top line -->
          <div class="pause-gold-line"></div>

          <!-- Header -->
          <div class="pause-header">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            <h2 class="pause-title">Pausiert</h2>
          </div>

          <!-- Body -->
          <div class="pause-body">
            <p class="pause-subtitle">Klicke ins Spielfenster um fortzufahren</p>

            <!-- Accumulated chimes -->
            <div class="chime-reward">
              <div class="chime-reward-icon">
                <img src="/img/BardAbilities/BardChime.png" alt="Chime" class="chime-img" />
              </div>
              <div class="chime-reward-text">
                <span class="chime-label">Gesammelte Chimes</span>
                <span class="chime-value">+{{ $formatNumber(accumulatedChimes) }}</span>
                <span class="chime-sublabel">werden beim Weiterspielen gutgeschrieben</span>
              </div>
            </div>

            <!-- Pending level-ups -->
            <div v-if="gameStore.pendingAugmentSelections.length > 0" class="pause-info pause-info--levelup">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              <span>{{
                gameStore.pendingAugmentSelections.length === 1
                  ? 'Level-Up wartet — wähle dein Augment!'
                  : `${gameStore.pendingAugmentSelections.length} Level-Ups warten auf dich!`
              }}</span>
            </div>

            <!-- Bonus stars -->
            <div v-if="pendingStars > 0" class="pause-info pause-info--bonus">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{{
                pendingStars === 1
                  ? 'Ein Bonus-Sternsystem wartet auf dich!'
                  : `${pendingStars} Bonus-Sternsysteme warten auf dich!`
              }}</span>
            </div>

            <!-- Champion ETA / Ready -->
            <div
              v-if="isChampionTraveling || isChampionReady"
              class="pause-info pause-info--eta"
              :class="{ 'pause-info--ready': isChampionReady }"
            >
              <svg v-if="isChampionTraveling" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span v-if="isChampionTraveling">Champion erreicht Stern in <strong>{{ pauseEtaStr }}</strong></span>
              <span v-else>Champion-Stern wartet — kehre ins Spiel zurück!</span>
            </div>

            <!-- Unpause button -->
            <button class="pause-btn" @click="() => window.focus()">Weiterspielen</button>
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
import { useGameStore } from '@/stores/gameStore'

const { windowFocused } = useWindowFocus()
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()

const pendingStars = computed(() => galaxyStore.pendingResourceStars)
const isChampionTraveling = computed(() => galaxyStore.championTravelState === 'traveling')
const isChampionReady = computed(() => galaxyStore.pendingChampionStar)

const pauseStartChimes = ref(0)
const pauseTick = ref(0)
let pauseInterval: ReturnType<typeof setInterval> | null = null

watch(
  windowFocused,
  (focused) => {
    if (!focused) {
      gameStore.setPauseState(true)
      pauseStartChimes.value = gameStore.chimes
      pauseInterval = setInterval(() => {
        pauseTick.value++
      }, 1000)
    } else {
      gameStore.setPauseState(false)
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

const accumulatedChimes = computed(() => {
  void pauseTick.value
  return Math.max(0, gameStore.chimes - pauseStartChimes.value)
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
  background: rgba(0, 0, 0, 0.78);
}

.pause-card {
  display: flex;
  flex-direction: column;
  min-width: 340px;
  max-width: 440px;
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 24px 64px rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  overflow: hidden;
}

.pause-gold-line {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  flex-shrink: 0;
}

.pause-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px 12px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  color: #e8c040;
}

.pause-title {
  font-size: 1.3rem;
  color: #e8c040;
  margin: 0;
  letter-spacing: 0.08em;
  text-shadow: 0 0 16px rgba(232, 192, 64, 0.4);
}

.pause-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 24px 22px;
}

.pause-subtitle {
  font-size: 0.82rem;
  color: rgba(200, 185, 140, 0.6);
  margin: 0;
  text-align: center;
}

/* Chime reward box */
.chime-reward {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  background: #1a1008;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px #3e200a;
}

.chime-reward-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #141410;
  border: 1px solid #5c3310;
  border-radius: 4px;
}

.chime-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  image-rendering: pixelated;
}

.chime-reward-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chime-label {
  font-size: 0.72rem;
  color: rgba(200, 185, 140, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.chime-value {
  font-size: 1.4rem;
  color: #e8c040;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.5);
  line-height: 1;
}

.chime-sublabel {
  font-size: 0.7rem;
  color: rgba(200, 185, 140, 0.45);
}

/* Info badges */
.pause-info {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  background: rgba(232, 192, 64, 0.05);
  border: 1px solid #5c3310;
  color: rgba(232, 192, 64, 0.55);
  font-size: 0.8rem;
}

.pause-info--levelup {
  background: rgba(232, 192, 64, 0.08);
  border-color: rgba(232, 192, 64, 0.4);
  color: #e8c040;
}

.pause-info--bonus {
  background: rgba(30, 140, 80, 0.08);
  border-color: rgba(82, 184, 48, 0.3);
  color: #52b830;
}

.pause-info--eta {
  background: rgba(232, 192, 64, 0.07);
  border-color: rgba(232, 192, 64, 0.25);
  color: #e8c040;
}

.pause-info--ready {
  background: rgba(232, 192, 64, 0.12);
  border-color: rgba(232, 192, 64, 0.45);
  color: #f0d060;
}

/* Unpause button */
.pause-btn {
  margin-top: 4px;
  padding: 9px 28px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #fff;
  font-size: 0.88rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: filter 100ms;
}

.pause-btn:hover {
  filter: brightness(1.12);
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
