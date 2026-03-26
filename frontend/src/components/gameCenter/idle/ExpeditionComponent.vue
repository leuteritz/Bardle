<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center rpg-overlay"
      @click.self="$emit('close')"
    >
      <!-- Modal Card -->
      <div
        class="relative w-full max-w-sm mx-4 rpg-frame expedition-modal-glow"
      >
        <!-- Animated star dots background -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none" style="border-radius: 4px;">
          <div class="star star-1"></div>
          <div class="star star-2"></div>
          <div class="star star-3"></div>
          <div class="star star-4"></div>
          <div class="star star-5"></div>
        </div>

        <!-- Header -->
        <div class="relative flex items-center justify-between px-5 pt-4 pb-3 rpg-header">
          <div class="flex items-center gap-2">
            <span class="text-xl">🌀</span>
            <span class="text-base font-bold" style="color: var(--rpg-gold);">
              Portal-Expeditionen
            </span>
          </div>
          <button
            @click="$emit('close')"
            class="rpg-close-btn flex items-center justify-center w-7 h-7"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="relative px-5 py-4">
          <!-- No active expedition: setup form -->
          <div v-if="!gameStore.activeExpedition">
            <!-- Universe select -->
            <div class="mb-3">
              <label class="block mb-1 text-xs text-blue-300">Ziel-Universum</label>
              <select
                v-model="selectedUniverseId"
                class="w-full px-3 py-2 text-sm text-white border expedition-select focus:outline-none"
              >
                <option v-for="cfg in EXPEDITION_CONFIGS" :key="cfg.universeId" :value="cfg.universeId">
                  {{ cfg.name }} — {{ formatDuration(cfg.durationMs) }} (×{{ cfg.multiplier }})
                </option>
              </select>
            </div>

            <!-- Meep count -->
            <div class="mb-3">
              <label class="block mb-1 text-xs text-orange-300">Meeps ({{ gameStore.meeps }} verfügbar)</label>
              <div class="flex items-center gap-3">
                <button
                  @click="decrementMeeps"
                  class="w-8 h-8 expedition-stepper text-white text-sm transition-colors"
                >
                  -
                </button>
                <span class="flex-1 text-base font-bold text-center" style="color: var(--rpg-gold-dim);">{{ meepsSent }}</span>
                <button
                  @click="incrementMeeps"
                  class="w-8 h-8 expedition-stepper text-white text-sm transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Reward preview -->
            <div class="mb-3 text-sm text-center" style="color: var(--rpg-gold);">
              ~{{ formatNumber(expectedReward) }} ✨ Belohnung
            </div>

            <!-- Start button -->
            <button
              @click="startExpedition"
              :disabled="meepsSent < 1 || gameStore.meeps < 1"
              class="w-full py-2 text-sm font-bold transition-all duration-200"
              :class="
                meepsSent >= 1 && gameStore.meeps >= 1
                  ? 'rpg-btn-green cursor-pointer'
                  : 'rpg-btn-disabled'
              "
            >
              🌀 Portal öffnen
            </button>
          </div>

          <!-- Active expedition -->
          <div v-else>
            <div class="mb-3 text-center">
              <div class="text-xs text-blue-300">
                {{ gameStore.activeExpedition.meepsSent }} Meeps erkunden
              </div>
              <div class="text-sm font-bold" style="color: var(--rpg-gold);">
                {{ gameStore.activeExpedition.universeName }}
              </div>
            </div>

            <!-- Progress bar -->
            <div class="relative w-full h-3 mb-1 overflow-hidden rounded-full expedition-bar-track">
              <div
                class="h-full rounded-full expedition-bar-fill transition-all duration-1000"
                :style="{
                  width: progress + '%',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)',
                }"
              ></div>
            </div>

            <div class="mb-2 text-xs text-center text-slate-400">{{ countdown }}</div>

            <div class="mb-3 text-sm text-center" style="color: var(--rpg-gold);">
              {{ formatNumber(gameStore.activeExpedition.reward) }} ✨ Belohnung
            </div>

            <!-- Collect button -->
            <button
              @click="gameStore.collectExpedition()"
              :disabled="!isComplete"
              class="w-full py-2 text-sm font-bold transition-all duration-200"
              :class="
                isComplete
                  ? 'rpg-btn-green cursor-pointer animate-pulse'
                  : 'rpg-btn-disabled'
              "
            >
              {{ isComplete ? '✨ Einsammeln!' : '⏳ Unterwegs...' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { EXPEDITION_CONFIGS } from '../../../config/expeditions'
import { formatNumber } from '../../../config/numberFormat'

function formatDuration(ms: number): string {
  const minutes = ms / 60_000
  if (minutes >= 60) return `${minutes / 60}h`
  return `${minutes}min`
}

export default defineComponent({
  name: 'ExpeditionComponent',
  props: {
    isVisible: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['close'],
  setup() {
    const gameStore = useGameStore()

    const selectedUniverseId = ref(EXPEDITION_CONFIGS[0].universeId)
    const meepsSent = ref(1)

    const now = ref(Date.now())
    let ticker: ReturnType<typeof setInterval> | null = null
    onMounted(() => {
      ticker = setInterval(() => {
        now.value = Date.now()
      }, 1000)
    })
    onUnmounted(() => {
      if (ticker) clearInterval(ticker)
    })

    const selectedConfig = computed(
      () => EXPEDITION_CONFIGS.find((c) => c.universeId === selectedUniverseId.value)!,
    )

    const expectedReward = computed(() => {
      const base = 50 * gameStore.meepChimeRequirement
      return Math.floor(meepsSent.value * base * selectedConfig.value.multiplier)
    })

    const progress = computed(() => {
      const exp = gameStore.activeExpedition
      if (!exp) return 0
      return Math.min(100, ((now.value - exp.startTime) / exp.durationMs) * 100)
    })

    const isComplete = computed(() => {
      const exp = gameStore.activeExpedition
      if (!exp) return false
      return now.value >= exp.startTime + exp.durationMs
    })

    const countdown = computed(() => {
      const exp = gameStore.activeExpedition
      if (!exp) return ''
      const remaining = exp.startTime + exp.durationMs - now.value
      if (remaining <= 0) return 'Fertig!'
      const totalSeconds = Math.ceil(remaining / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    })

    function incrementMeeps() {
      if (meepsSent.value < gameStore.meeps) meepsSent.value++
    }

    function decrementMeeps() {
      if (meepsSent.value > 1) meepsSent.value--
    }

    function startExpedition() {
      if (meepsSent.value < 1 || meepsSent.value > gameStore.meeps) return
      const cfg = selectedConfig.value
      const base = 50 * gameStore.meepChimeRequirement
      const expeditionMul = gameStore.activeModifier.expeditionRewardMultiplier ?? 1
      const reward = Math.floor(meepsSent.value * base * cfg.multiplier * expeditionMul)
      gameStore.startExpedition(cfg.universeId, cfg.name, meepsSent.value, cfg.durationMs, reward)
      meepsSent.value = 1
    }

    return {
      gameStore,
      EXPEDITION_CONFIGS,
      selectedUniverseId,
      meepsSent,
      expectedReward,
      progress,
      isComplete,
      countdown,
      incrementMeeps,
      decrementMeeps,
      startExpedition,
      formatNumber,
      formatDuration,
    }
  },
})
</script>

<style scoped>
.expedition-modal-glow {
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 0 30px rgba(200, 144, 64, 0.2),
    0 25px 50px rgba(0, 0, 0, 0.5);
  animation: borderPulse 3s ease-in-out infinite;
}

@keyframes borderPulse {
  0%, 100% { box-shadow: inset 0 0 0 2px var(--rpg-wood-inner), inset 0 0 0 4px var(--rpg-wood-mid), 0 0 30px rgba(200, 144, 64, 0.2), 0 25px 50px rgba(0,0,0,0.5); }
  50% { box-shadow: inset 0 0 0 2px var(--rpg-wood-inner), inset 0 0 0 4px var(--rpg-wood-mid), 0 0 50px rgba(200, 144, 64, 0.4), 0 25px 50px rgba(0,0,0,0.5); }
}

.expedition-select {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
}
.expedition-select:focus {
  border-color: var(--rpg-gold-dim);
}

.expedition-stepper {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  cursor: pointer;
}
.expedition-stepper:hover {
  background: var(--rpg-bg-row);
  border-color: var(--rpg-wood-mid);
}

.expedition-bar-track {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-border-row);
}

.expedition-bar-fill {
  background: linear-gradient(to right, var(--rpg-green-bottom), var(--rpg-green-top));
}

.star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: white;
  border-radius: 50%;
  opacity: 0;
  animation: twinkle 3s ease-in-out infinite;
}

.star-1 { top: 15%; left: 20%; animation-delay: 0s; }
.star-2 { top: 30%; right: 15%; animation-delay: 0.6s; }
.star-3 { top: 60%; left: 10%; animation-delay: 1.2s; }
.star-4 { top: 70%; right: 25%; animation-delay: 1.8s; }
.star-5 { top: 45%; left: 50%; animation-delay: 2.4s; }

@keyframes twinkle {
  0%, 100% { opacity: 0; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.5); }
}
</style>
