import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import {
  buildMovementSchedules,
  positionAt,
  minionsAt,
  type ChampionSchedule,
  type MinionDot,
} from '@/utils/battleMovement'
import {
  BATTLE_TOTAL_GAME_SECONDS,
  MOVE_JITTER_UNITS,
  MOVE_TICK_INTERVAL_MS,
} from '@/config/constants'

export interface LiveChampionPosition {
  team: 1 | 2
  idx: number
  x: number
  y: number
  walking: boolean
}

/**
 * UI ticker that samples the pure movement schedules at the store's current
 * game-time. Because positions are functions of time, tab switches and
 * background catch-up need no extra handling — the next sample is correct.
 */
export function useBattleMovement() {
  const battleStore = useBattleStore()
  const positions = ref<LiveChampionPosition[]>([])
  const minions = ref<MinionDot[]>([])

  let schedules: { t1: ChampionSchedule[]; t2: ChampionSchedule[] } | null = null
  let scheduleSeed = -1
  let tickId: ReturnType<typeof setInterval> | null = null

  function rebuildSchedules() {
    if (!battleStore.timeline) {
      schedules = null
      return
    }
    schedules = buildMovementSchedules(battleStore.timeline, battleStore.battleSeed)
    scheduleSeed = battleStore.battleSeed
  }

  function preciseGameTime(): number {
    if (battleStore.battlePhaseStartTimestamp <= 0) return battleStore.battleTime
    const realElapsedS = (Date.now() - battleStore.battlePhaseStartTimestamp) / 1000
    return Math.min(BATTLE_TOTAL_GAME_SECONDS, realElapsedS * 60)
  }

  function sample() {
    if (!schedules || !battleStore.timeline) {
      positions.value = []
      minions.value = []
      return
    }
    const t = preciseGameTime()
    const out: LiveChampionPosition[] = []
    const jitterPhase = Math.floor(Date.now() / MOVE_TICK_INTERVAL_MS)
    const push = (team: 1 | 2, scheds: ChampionSchedule[]) => {
      scheds.forEach((sched, idx) => {
        const p = positionAt(sched, t)
        // small cosmetic jitter so idle champions don't look frozen
        const jx = Math.sin(jitterPhase * 0.7 + idx * 2.1 + team) * MOVE_JITTER_UNITS * 0.5
        const jy = Math.cos(jitterPhase * 0.9 + idx * 1.7 + team * 2) * MOVE_JITTER_UNITS * 0.5
        out.push({
          team,
          idx,
          x: Math.max(2, Math.min(98, p.x + jx)),
          y: Math.max(2, Math.min(98, p.y + jy)),
          walking: p.kind === 'respawn-walk',
        })
      })
    }
    push(1, schedules.t1)
    push(2, schedules.t2)
    positions.value = out
    minions.value = minionsAt(t)
  }

  watch(
    () => [battleStore.timeline, battleStore.battleSeed, battleStore.objectiveOverrides.length] as const,
    () => {
      rebuildSchedules()
      sample()
    },
    { immediate: true },
  )

  onMounted(() => {
    if (battleStore.timeline && scheduleSeed !== battleStore.battleSeed) rebuildSchedules()
    sample()
    tickId = setInterval(sample, MOVE_TICK_INTERVAL_MS)
  })

  onBeforeUnmount(() => {
    if (tickId) clearInterval(tickId)
  })

  return { positions, minions }
}
