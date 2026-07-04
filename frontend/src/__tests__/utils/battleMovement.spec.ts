import { describe, it, expect } from 'vitest'
import { generateTimeline } from '@/utils/battleTimeline'
import {
  buildMovementSchedules,
  positionAt,
  minionsAt,
  pointAlongPath,
} from '@/utils/battleMovement'
import {
  BLUE_FOUNTAIN,
  RED_FOUNTAIN,
  BLUE_NEXUS,
  RED_NEXUS,
  MOVE_RESPAWN_WALK_SECONDS,
  BATTLE_TOTAL_GAME_SECONDS,
} from '@/config/constants'

describe('pointAlongPath', () => {
  it('returns endpoints at 0 and 1', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]
    expect(pointAlongPath(path, 0)).toEqual({ x: 0, y: 0 })
    expect(pointAlongPath(path, 1)).toEqual({ x: 10, y: 0 })
    expect(pointAlongPath(path, 0.5)).toEqual({ x: 5, y: 0 })
  })
})

describe('buildMovementSchedules', () => {
  const timeline = generateTimeline(42, 0.55)
  const schedules = buildMovementSchedules(timeline, 42)

  it('is deterministic', () => {
    const again = buildMovementSchedules(timeline, 42)
    expect(JSON.parse(JSON.stringify(again))).toEqual(JSON.parse(JSON.stringify(schedules)))
  })

  it('all champions start at their fountain', () => {
    for (let i = 0; i < 5; i++) {
      const p1 = positionAt(schedules.t1[i], 0)
      const p2 = positionAt(schedules.t2[i], 0)
      expect(Math.hypot(p1.x - BLUE_FOUNTAIN.x, p1.y - BLUE_FOUNTAIN.y)).toBeLessThan(2)
      expect(Math.hypot(p2.x - RED_FOUNTAIN.x, p2.y - RED_FOUNTAIN.y)).toBeLessThan(2)
    }
  })

  it('champions leave the base during the walkout', () => {
    for (let i = 0; i < 5; i++) {
      const p = positionAt(schedules.t1[i], 300)
      expect(Math.hypot(p.x - BLUE_FOUNTAIN.x, p.y - BLUE_FOUNTAIN.y)).toBeGreaterThan(10)
    }
  })

  it('a killed champion is at its fountain right after the kill and walks back', () => {
    const kill = timeline.events.find((e) => e.type === 'kill' && e.team === 2)
    expect(kill).toBeDefined()
    const victimIdx = kill!.victimIdx ?? 0
    const sched = schedules.t1[victimIdx]
    const atDeath = positionAt(sched, kill!.t + 1)
    expect(atDeath.kind).toBe('respawn-walk')
    expect(Math.hypot(atDeath.x - BLUE_FOUNTAIN.x, atDeath.y - BLUE_FOUNTAIN.y)).toBeLessThan(8)
    const midWalk = positionAt(sched, kill!.t + MOVE_RESPAWN_WALK_SECONDS / 2)
    expect(Math.hypot(midWalk.x - BLUE_FOUNTAIN.x, midWalk.y - BLUE_FOUNTAIN.y)).toBeGreaterThan(5)
  })

  it('the winning team ends at the enemy nexus', () => {
    const winnerScheds = timeline.winner === 1 ? schedules.t1 : schedules.t2
    const enemyNexus = timeline.winner === 1 ? RED_NEXUS : BLUE_NEXUS
    let near = 0
    for (const sched of winnerScheds) {
      const p = positionAt(sched, BATTLE_TOTAL_GAME_SECONDS)
      if (Math.hypot(p.x - enemyNexus.x, p.y - enemyNexus.y) < 15) near++
    }
    expect(near).toBeGreaterThanOrEqual(3)
  })

  it('positions stay within map bounds for the whole game', () => {
    for (const sched of [...schedules.t1, ...schedules.t2]) {
      for (let t = 0; t <= BATTLE_TOTAL_GAME_SECONDS; t += 120) {
        const p = positionAt(sched, t)
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(100)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('minionsAt', () => {
  it('returns no minions at game start and some later', () => {
    expect(minionsAt(0).length).toBe(0)
    expect(minionsAt(600).length).toBeGreaterThan(0)
  })

  it('is a pure function of time', () => {
    expect(minionsAt(900)).toEqual(minionsAt(900))
  })

  it('spawns both teams symmetrically', () => {
    const dots = minionsAt(700)
    const blue = dots.filter((d) => d.team === 1).length
    const red = dots.filter((d) => d.team === 2).length
    expect(blue).toBe(red)
  })
})
