<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      @click.self="$emit('close')"
    >
      <!-- Modal Card -->
      <div
        class="relative w-full max-w-sm mx-4 border rounded-2xl bg-gradient-to-br from-blue-950/90 to-slate-950/95 backdrop-blur-xl border-blue-400/40 shadow-2xl expedition-modal-glow"
      >
        <!-- Animated star dots background -->
        <div class="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div class="star star-1"></div>
          <div class="star star-2"></div>
          <div class="star star-3"></div>
          <div class="star star-4"></div>
          <div class="star star-5"></div>
        </div>

        <!-- Header -->
        <div class="relative flex items-center justify-between px-5 pt-4 pb-3 border-b border-blue-400/20">
          <div class="flex items-center gap-2">
            <span class="text-xl">🌀</span>
            <span class="text-base font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text">
              Portal-Expeditionen
            </span>
          </div>
          <button
            @click="$emit('close')"
            class="flex items-center justify-center w-7 h-7 text-blue-300 transition-all duration-200 border rounded-lg border-blue-400/30 hover:bg-blue-500/20 hover:text-white hover:border-blue-400/60"
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
                class="w-full px-3 py-2 text-sm text-white border rounded-xl bg-slate-800/80 border-blue-400/30 focus:outline-none focus:border-blue-400"
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
                  class="w-8 h-8 rounded-lg bg-slate-700/80 border border-white/20 text-white text-sm hover:bg-slate-600 transition-colors"
                >
                  -
                </button>
                <span class="flex-1 text-base font-bold text-center text-orange-300">{{ meepsSent }}</span>
                <button
                  @click="incrementMeeps"
                  class="w-8 h-8 rounded-lg bg-slate-700/80 border border-white/20 text-white text-sm hover:bg-slate-600 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Reward preview -->
            <div class="mb-3 text-sm text-center text-yellow-300/80">
              ~{{ formatNumber(expectedReward) }} ✨ Belohnung
            </div>

            <!-- Start button -->
            <button
              @click="startExpedition"
              :disabled="meepsSent < 1 || gameStore.meeps < 1"
              class="w-full py-2 text-sm font-bold transition-all duration-200 rounded-xl"
              :class="
                meepsSent >= 1 && gameStore.meeps >= 1
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white cursor-pointer'
                  : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
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
              <div class="text-sm font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text">
                {{ gameStore.activeExpedition.universeName }}
              </div>
            </div>

            <!-- Progress bar -->
            <div class="relative w-full h-3 mb-1 overflow-hidden border rounded-full bg-slate-700/50 border-white/20">
              <div
                class="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-1000"
                :style="{
                  width: progress + '%',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)',
                }"
              ></div>
            </div>

            <div class="mb-2 text-xs text-center text-slate-400">{{ countdown }}</div>

            <div class="mb-3 text-sm text-center text-yellow-300/80">
              {{ formatNumber(gameStore.activeExpedition.reward) }} ✨ Belohnung
            </div>

            <!-- Collect button -->
            <button
              @click="gameStore.collectExpedition()"
              :disabled="!isComplete"
              class="w-full py-2 text-sm font-bold transition-all duration-200 rounded-xl"
              :class="
                isComplete
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white cursor-pointer animate-pulse'
                  : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
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
    0 0 40px rgba(59, 130, 246, 0.25),
    0 0 80px rgba(59, 130, 246, 0.1),
    0 25px 50px rgba(0, 0, 0, 0.5);
  animation: borderPulse 3s ease-in-out infinite;
}

@keyframes borderPulse {
  0%, 100% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.25), 0 0 80px rgba(59, 130, 246, 0.1), 0 25px 50px rgba(0,0,0,0.5); }
  50% { box-shadow: 0 0 60px rgba(59, 130, 246, 0.45), 0 0 100px rgba(99, 102, 241, 0.2), 0 25px 50px rgba(0,0,0,0.5); }
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
