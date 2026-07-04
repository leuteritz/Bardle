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
  TRAIL_MAX_POINTS,
  TRAIL_MIN_DISTANCE_UNITS,
  TRAIL_TELEPORT_RESET_UNITS,
} from '@/config/constants'

export interface LiveChampionPosition {
  team: 1 | 2
  idx: number
  x: number
  y: number
  walking: boolean
}

export interface ChampionTrail {
  team: 1 | 2
  idx: number
  isBard: boolean
  points: Array<{ x: number; y: number }>
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
  const trails = ref<ChampionTrail[]>([])

  let schedules: { t1: ChampionSchedule[]; t2: ChampionSchedule[] } | null = null
  let scheduleSeed = -1
  let tickId: ReturnType<typeof setInterval> | null = null
  // un-jittered position history per champion, feeds the fading movement trails
  const trailHistory = new Map<string, Array<{ x: number; y: number }>>()

  function rebuildSchedules() {
    trailHistory.clear()
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

  function updateTrail(team: 1 | 2, idx: number, x: number, y: number) {
    const key = `${team}-${idx}`
    const history = trailHistory.get(key) ?? []
    const last = history[history.length - 1]
    if (last) {
      const step = Math.hypot(x - last.x, y - last.y)
      // death→fountain snap is a teleport, not a walk — restart the trail there
      if (step > TRAIL_TELEPORT_RESET_UNITS) history.length = 0
    }
    history.push({ x, y })
    if (history.length > TRAIL_MAX_POINTS) history.splice(0, history.length - TRAIL_MAX_POINTS)
    trailHistory.set(key, history)
  }

  function collectTrails(): ChampionTrail[] {
    const out: ChampionTrail[] = []
    for (const [key, points] of trailHistory) {
      if (points.length < 2) continue
      let walked = 0
      for (let i = 1; i < points.length; i++) {
        walked += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
      }
      // idle jitter / standing in a teamfight never draws a trail
      if (walked < TRAIL_MIN_DISTANCE_UNITS) continue
      const [teamStr, idxStr] = key.split('-')
      const team = Number(teamStr) as 1 | 2
      const idx = Number(idxStr)
      out.push({
        team,
        idx,
        isBard: team === 1 && battleStore.team1[idx]?.name === 'Bard',
        points: [...points],
      })
    }
    return out
  }

  function sample() {
    if (!schedules || !battleStore.timeline) {
      positions.value = []
      minions.value = []
      trails.value = []
      return
    }
    const t = preciseGameTime()
    const out: LiveChampionPosition[] = []
    const jitterPhase = Math.floor(Date.now() / MOVE_TICK_INTERVAL_MS)
    const push = (team: 1 | 2, scheds: ChampionSchedule[]) => {
      scheds.forEach((sched, idx) => {
        const p = positionAt(sched, t)
        updateTrail(team, idx, p.x, p.y)
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
    trails.value = collectTrails()
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

  return { positions, minions, trails }
}
