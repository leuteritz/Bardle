import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { DRIFTERS } from '@/config/world/drifters'
import { DRIFTER_ART_POSE, DRIFTER_RARITY_ORDER } from '@/config/constants'
import type { DrifterBodyKind } from '@/types'

const PUBLIC = resolve(process.cwd(), 'public')
const publicFile = (src: string) => join(PUBLIC, src)

const inUnit = (p: { x: number; y: number }) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1

describe('drifter artwork', () => {
  it('points every drifter at an image that exists', () => {
    for (const def of DRIFTERS) {
      expect(def.image.startsWith('/img/'), def.id).toBe(true)
      expect(existsSync(publicFile(def.image)), `${def.id}: ${def.image}`).toBe(true)
    }
  })

  it('takes the generated art from /img/drifter/ — chime and meep keep the Bard art', () => {
    for (const def of DRIFTERS) {
      const bardArt = def.id === 'errantChime' || def.id === 'lostMeep'
      expect(def.image.startsWith('/img/drifter/'), def.id).toBe(!bardArt)
      if (!bardArt) expect(def.image.includes(def.id), def.id).toBe(true)
    }
  })

  it('never shrinks a body on the way up the rarity ladder', () => {
    // Seltenheit zeigt sich im RAUM: der kleinste Körper einer Stufe ist grösser
    // als der grösste der Stufe darunter.
    const byRank = new Map<number, number[]>()
    for (const def of DRIFTERS) {
      const rank = DRIFTER_RARITY_ORDER[def.rarity]
      byRank.set(rank, [...(byRank.get(rank) ?? []), def.sizePx])
    }
    const ranks = [...byRank.keys()].sort((a, b) => a - b)
    for (let i = 1; i < ranks.length; i++) {
      expect(Math.min(...byRank.get(ranks[i])!)).toBeGreaterThan(Math.max(...byRank.get(ranks[i - 1])!))
    }
  })
})

describe('DRIFTER_ART_POSE', () => {
  it('poses every body kind in the catalogue', () => {
    for (const def of DRIFTERS) expect(DRIFTER_ART_POSE[def.body], def.id).toBeDefined()
  })

  it('keeps core and overlay anchor inside the image', () => {
    for (const [kind, pose] of Object.entries(DRIFTER_ART_POSE)) {
      expect(inUnit(pose.core), kind).toBe(true)
      expect(inUnit(pose.fx), kind).toBe(true)
      expect(pose.scale, kind).toBeGreaterThan(0)
      expect(pose.wake, kind).toBeGreaterThan(0)
      expect(pose.wake, kind).toBeLessThanOrEqual(1)
    }
  })

  it('caps the tilt of a mirrored body short of standing it on its head', () => {
    for (const [kind, pose] of Object.entries(DRIFTER_ART_POSE)) {
      if (pose.orient === 'mirror') {
        expect(pose.tiltMaxDeg, kind).toBeGreaterThan(0)
        expect(pose.tiltMaxDeg, kind).toBeLessThan(45)
      } else {
        expect(pose.tiltMaxDeg, kind).toBe(0)
      }
    }
  })

  it('gives every self-tailed artwork a shortened CSS wake', () => {
    // Surge und Shard tragen ihren Schweif im Bild — zwei volle Schweife lesen
    // sich als zwei Körper.
    const painted: DrifterBodyKind[] = ['surge', 'shard']
    for (const kind of painted) expect(DRIFTER_ART_POSE[kind].wake).toBeLessThan(1)
  })
})
