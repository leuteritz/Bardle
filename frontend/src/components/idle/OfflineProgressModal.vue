<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/config/numberFormat'
import OfflineMinigame from './OfflineMinigame.vue'

const gameStore = useGameStore()

const FLAVOUR_TEXTS = [
  'Während du fort warst, sammelten die Glöckchen in aller Stille ihre Kräfte...',
  'Bard wanderte durch ferne Galaxien — und die Chimes folgten ihm in den Schlaf.',
  'In deiner Abwesenheit webte das Universum seinen magischen Klang weiter.',
  'Die Sphären haben nicht gerastet. Dein Lohn wartet, Abenteurer.',
  'Zeit ist die seltenste Ressource — und die Glöckchen wissen es zu schätzen.',
]

const flavourText = ref(FLAVOUR_TEXTS[Math.floor(Math.random() * FLAVOUR_TEXTS.length)])
const displayCount = ref(0)
let animationId = 0
let minigameTimer = 0

type MinigamePhase = 'waiting' | 'playing' | 'won' | 'lost'
const minigamePhase = ref<MinigamePhase>('waiting')
const rewardMultiplier = ref<1 | 2>(1)

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} ${h === 1 ? 'Stunde' : 'Stunden'}`)
  if (m > 0) parts.push(`${m} ${m === 1 ? 'Minute' : 'Minuten'}`)
  if (parts.length === 0) parts.push(`${s} ${s === 1 ? 'Sekunde' : 'Sekunden'}`)
  return parts.join(', ')
}

const formattedDuration = computed(() => formatDuration(gameStore.offlineSeconds))

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function startCounterAnimation(target: number) {
  cancelAnimationFrame(animationId)
  displayCount.value = 0
  const duration = 2000
  const start = performance.now()

  function step(now: number) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    displayCount.value = Math.floor(easeOutCubic(progress) * target)
    if (progress < 1) {
      animationId = requestAnimationFrame(step)
    } else {
      displayCount.value = target
    }
  }

  animationId = requestAnimationFrame(step)
}

watch(
  () => gameStore.showOfflineModal,
  (visible) => {
    if (visible) {
      flavourText.value = FLAVOUR_TEXTS[Math.floor(Math.random() * FLAVOUR_TEXTS.length)]
      startCounterAnimation(gameStore.offlineChimes)
      minigamePhase.value = 'waiting'
      rewardMultiplier.value = 1
      if (gameStore.offlineChimes > 0) {
        minigameTimer = window.setTimeout(() => {
          minigamePhase.value = 'playing'
        }, 2100)
      }
    } else {
      cancelAnimationFrame(animationId)
      clearTimeout(minigameTimer)
      displayCount.value = 0
      minigamePhase.value = 'waiting'
      rewardMultiplier.value = 1
    }
  },
  { immediate: true },
)

function onWin() {
  rewardMultiplier.value = 2
  minigamePhase.value = 'won'
}

function onSkip() {
  rewardMultiplier.value = 1
  minigamePhase.value = 'lost'
}

function claim() {
  cancelAnimationFrame(animationId)
  clearTimeout(minigameTimer)
  gameStore.claimOfflineReward(rewardMultiplier.value)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="offline-fade">
      <div v-if="gameStore.showOfflineModal" class="offline-overlay">
        <div class="offline-modal">
          <div class="gold-bar" />

          <div class="modal-header">
            <span class="header-title">Willkommen zurück, Abenteurer!</span>
          </div>

          <div class="modal-body">
            <p class="duration-label">Du warst abwesend für:</p>
            <p class="duration-value">{{ formattedDuration }}</p>

            <p class="flavour">{{ flavourText }}</p>

            <div class="chime-counter">
              <div class="chime-icon-row">
                <span class="chime-icon">🔔</span>
              </div>
              <span class="chime-value">{{ formatNumber(displayCount) }}</span>
              <span v-if="gameStore.offlineChimes > 0" class="chime-label">Chimes gesammelt</span>
              <span v-else class="chime-label chime-label--hint">Kauf Gebäude für passives Einkommen</span>
            </div>

            <Transition name="mg-fade">
              <div v-if="minigamePhase === 'playing'" class="minigame-section">
                <OfflineMinigame @win="onWin" @skip="onSkip" />
              </div>
              <div v-else-if="minigamePhase === 'won'" class="mg-result mg-result--win">
                Perfekter Treffer! Doppelte Beute wartet auf dich!
              </div>
              <div v-else-if="minigamePhase === 'lost'" class="mg-result mg-result--lose">
                Knapp vorbei. Einfache Belohnung.
              </div>
            </Transition>
          </div>

          <div class="modal-footer">
            <button
              class="claim-btn"
              :class="{ 'claim-btn--double': minigamePhase === 'won', 'claim-btn--disabled': minigamePhase === 'playing' }"
              :disabled="minigamePhase === 'playing'"
              @click="claim"
            >
              {{ minigamePhase === 'won' ? '⚔ Doppelte Beute einsammeln! ×2' : '⚔ Beute einsammeln!' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.offline-overlay {
  position: fixed;
  inset: 0;
  z-index: 9997;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
}

.offline-modal {
  position: relative;
  width: min(480px, 92vw);
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 16px 48px rgba(0, 0, 0, 0.9);
  border-radius: 4px;
  overflow: hidden;
}

.gold-bar {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

.modal-header {
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  padding: 14px 20px;
  text-align: center;
}

.header-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.04em;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.45);
}

.modal-body {
  padding: 24px 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.duration-label {
  font-size: 0.78rem;
  color: rgba(200, 185, 140, 0.55);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0;
}

.duration-value {
  font-size: 1rem;
  font-weight: 700;
  color: #c89040;
  margin: 0 0 4px;
}

.flavour {
  font-size: 0.82rem;
  color: rgba(200, 185, 140, 0.65);
  text-align: center;
  font-style: italic;
  margin: 0 0 16px;
  line-height: 1.5;
}

.chime-counter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: #1a1008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  padding: 16px 40px;
  min-width: 220px;
}

.chime-icon-row {
  font-size: 1.6rem;
  line-height: 1;
}

.chime-value {
  font-size: 2rem;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.02em;
  animation: glow-pulse 1.6s ease-in-out infinite;
}

.chime-label {
  font-size: 0.72rem;
  color: rgba(200, 185, 140, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.chime-label--hint {
  font-size: 0.7rem;
  color: rgba(200, 185, 140, 0.4);
  text-transform: none;
  letter-spacing: 0;
  font-style: italic;
}

.minigame-section {
  width: 100%;
  padding-top: 8px;
}

.mg-result {
  width: 100%;
  text-align: center;
  padding: 10px 0 2px;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.mg-result--win {
  color: #6ec040;
  text-shadow: 0 0 10px rgba(110, 192, 64, 0.6);
}

.mg-result--lose {
  color: rgba(200, 185, 140, 0.5);
}

.modal-footer {
  padding: 0 28px 24px;
  display: flex;
  justify-content: center;
}

.claim-btn {
  padding: 10px 32px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(46, 122, 26, 0.45);
  transition: filter 0.15s ease, transform 0.1s ease;
}

.claim-btn:hover:not(:disabled) {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.claim-btn:active:not(:disabled) {
  filter: brightness(0.9);
  transform: translateY(0);
}

.claim-btn--double {
  background: linear-gradient(to bottom, #70d840, #3a9a20);
  border-color: #90e850;
  box-shadow: 0 2px 12px rgba(80, 200, 40, 0.6), 0 0 20px rgba(110, 192, 64, 0.3);
}

.claim-btn--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Minigame transition */
.mg-fade-enter-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.mg-fade-leave-active {
  transition: opacity 0.2s ease;
}
.mg-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.mg-fade-leave-to {
  opacity: 0;
}

@keyframes glow-pulse {
  0%, 100% { text-shadow: 0 0 6px rgba(232, 192, 64, 0.5); }
  50%       { text-shadow: 0 0 18px rgba(232, 192, 64, 0.9), 0 0 32px rgba(232, 192, 64, 0.35); }
}

/* Transition */
.offline-fade-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.offline-fade-leave-active {
  transition: opacity 0.2s ease;
}
.offline-fade-enter-from {
  opacity: 0;
  transform: scale(0.94);
}
.offline-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .claim-btn { transition: none; }
  .chime-value { animation: none; }
  .offline-fade-enter-active,
  .offline-fade-leave-active { transition: opacity 0.15s; }
  .mg-fade-enter-active,
  .mg-fade-leave-active { transition: opacity 0.15s; }
}
</style>
