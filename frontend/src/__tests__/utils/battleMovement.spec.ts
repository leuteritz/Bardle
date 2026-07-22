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
  BATTLE_TOTAL_GAME_SECONDS,
  FINAL_PUSH_START_T,
  FINAL_PUSH_DEFENDER_LEAD_T,
  FINAL_PUSH_FIGHT_T,
} from '@/config/constants'
import { STRUCTURE_POSITIONS, parseStructureId } from '@/utils/battleStructures'

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

  it('a killed champion dies at the kill spot, then treks back via its fountain', () => {
    const kill = timeline.events.find((e) => e.type === 'kill' && e.team === 2 && e.location)
    expect(kill).toBeDefined()
    const victimIdx = kill!.victimIdx ?? 0
    const sched = schedules.t1[victimIdx]
    // At the moment of death the victim is drawn at the kill location (an enemy
    // is right there), NOT teleported to base.
    const atDeath = positionAt(sched, kill!.t + 1)
    expect(atDeath.kind).toBe('respawn-walk')
    expect(Math.hypot(atDeath.x - kill!.location!.x, atDeath.y - kill!.location!.y)).toBeLessThan(8)
    // The respawn-walk segment starts at the kill spot and routes back through
    // the champion's own fountain before returning to the action.
    const seg = sched.find(
      (s) => s.kind === 'respawn-walk' && kill!.t >= s.tStart && kill!.t <= s.tEnd,
    )
    expect(seg).toBeDefined()
    expect(
      Math.hypot(seg!.path[0].x - kill!.location!.x, seg!.path[0].y - kill!.location!.y),
    ).toBeLessThan(6)
    expect(
      seg!.path.some((p) => Math.hypot(p.x - BLUE_FOUNTAIN.x, p.y - BLUE_FOUNTAIN.y) < 2),
    ).toBe(true)
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

  it('the endgame push/retreat never starts before the 50:00 mark', () => {
    for (const seed of [1, 42, 1337]) {
      const tl = generateTimeline(seed, 0.55)
      const scheds = buildMovementSchedules(tl, seed)
      for (const sched of [...scheds.t1, ...scheds.t2]) {
        for (const seg of sched) {
          if (seg.kind !== 'push' && seg.kind !== 'retreat') continue
          // defenders lead by FINAL_PUSH_DEFENDER_LEAD_T; travel starts at order.t - 1
          expect(seg.tStart).toBeGreaterThanOrEqual(
            FINAL_PUSH_START_T - FINAL_PUSH_DEFENDER_LEAD_T - 1,
          )
        }
      }
    }
  })

  it('both teams converge on the loser inhibitor for the final defense fight', () => {
    for (const seed of [1, 42, 1337]) {
      const tl = generateTimeline(seed, 0.55)
      const scheds = buildMovementSchedules(tl, seed)
      const loser = tl.winner === 1 ? 2 : 1
      const inhibEvent = tl.events.find(
        (e) => e.type === 'inhibitor' && parseStructureId(e.structureId!).ownerTeam === loser,
      )!
      const inhib = STRUCTURE_POSITIONS[inhibEvent.structureId!]
      let alive = 0
      let near = 0
      for (const sched of [...scheds.t1, ...scheds.t2]) {
        const p = positionAt(sched, FINAL_PUSH_FIGHT_T)
        if (p.kind === 'respawn-walk') continue
        alive++
        if (Math.hypot(p.x - inhib.x, p.y - inhib.y) < 12) near++
      }
      expect(near).toBeGreaterThanOrEqual(Math.min(alive, 8))
    }
  })

  it('an attacker is at the first turret when it falls', () => {
    for (const seed of [1, 42, 1337]) {
      const tl = generateTimeline(seed, 0.55)
      const scheds = buildMovementSchedules(tl, seed)
      const ev = tl.events.find(
        (e) => (e.type === 'turret' || e.type === 'inhibitor') && e.participants,
      )!
      const attackers = ev.team === 1 ? ev.participants!.t1 : ev.participants!.t2
      const teamScheds = ev.team === 1 ? scheds.t1 : scheds.t2
      let minDist = Infinity
      for (const idx of attackers) {
        // sample a small window around the fall — arrival may lag the gather lead
        for (const t of [ev.t, ev.t + 30, ev.t + 60, ev.t + 90]) {
          const p = positionAt(teamScheds[idx], t)
          minDist = Math.min(minDist, Math.hypot(p.x - ev.location!.x, p.y - ev.location!.y))
        }
      }
      expect(minDist).toBeLessThan(10)
    }
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
