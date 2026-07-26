import { computed, onUnmounted, ref } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { BATTLE_PHASES } from '@/config/constants'
import type { BattlePhaseConfig, BattlePhaseKey } from '@/types'

/**
 * UI view of the battle phase machine. The phase itself and its start time live
 * in the store (timestamp-driven, so they keep running with the tab closed) —
 * all a screen needs on top is a local clock to turn those timestamps into a
 * countdown or a progress fraction.
 *
 * @param tickMs how often the local clock advances; 1s for plain second
 *   readouts, ~100ms where a bar should move smoothly.
 */
export function useBattlePhase(tickMs = 1000) {
  const battleStore = useBattleStore()

  const now = ref(Date.now())
  const tickerId = setInterval(() => {
    now.value = Date.now()
  }, tickMs)
  onUnmounted(() => clearInterval(tickerId))

  const phase = computed<BattlePhaseKey>(() => battleStore.currentBattlePhase)
  const config = computed<BattlePhaseConfig>(() => BATTLE_PHASES[phase.value])

  /** Time spent in the running phase; 0 for the open-ended landing screen. */
  const elapsedMs = computed(() => {
    const start = battleStore.currentPhaseStartTimestamp
    return start > 0 ? Math.max(0, now.value - start) : 0
  })

  /** Time left in the running phase; 0 for phases without a duration. */
  const remainingMs = computed(() => {
    const total = config.value.durationMs
    return total === null ? 0 : Math.max(0, total - elapsedMs.value)
  })

  /** Whole seconds left, rounded up — reads like a real countdown (5…1, 0). */
  const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1000))

  /** 0…1 through the running phase; 0 while no duration applies. */
  const progress = computed(() => {
    const total = config.value.durationMs
    if (!total) return 0
    return Math.min(1, elapsedMs.value / total)
  })

  return { now, phase, config, elapsedMs, remainingMs, remainingSeconds, progress }
}
