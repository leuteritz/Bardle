import { describe, it, expect } from 'vitest'
import {
  paintVoidCore,
  paintVoidWhorl,
  paintVoidFlare,
  paintDwellerMotif,
  voidWhorlAngle,
  voidFlareAlpha,
  voidFlarePeriodMs,
  voidWakeEchoes,
  voidSpriteDrawSize,
} from '@/utils/fx/voidSprite'
import { VOID_RIFTS } from '@/config/world/void'
import {
  VOID_DWELLER_MOTIFS,
  VOID_SEVERITY_ORDER,
  VOID_SPRITE_SPAN,
  VOID_URGENT_FRAC,
  VOID_WAKE_ECHOES,
  VOID_WHORL_ARMS,
  VOID_WHORL_SPIN_MS,
} from '@/config/constants'
import type { VoidRiftDef, VoidRiftSeverity } from '@/types'
import { recordingCtx } from '../../helpers/recordingCtx'

const SEVERITIES = (Object.keys(VOID_SEVERITY_ORDER) as VoidRiftSeverity[]).sort(
  (a, b) => VOID_SEVERITY_ORDER[a] - VOID_SEVERITY_ORDER[b],
)

function paintAll(def: VoidRiftDef) {
  const c = (def.sizePx * VOID_SPRITE_SPAN) / 2
  const r = def.sizePx / 2
  const core = recordingCtx()
  const whorl = recordingCtx()
  const flare = recordingCtx()
  paintVoidCore(core.ctx, c, r, def)
  paintVoidWhorl(whorl.ctx, c, r, def)
  paintVoidFlare(flare.ctx, c, r, def)
  return { core: core.ops, whorl: whorl.ops, flare: flare.ops }
}

describe('Void-Körper — die drei Ebenen', () => {
  it('jede Ebene malt für jeden Typ etwas', () => {
    for (const def of VOID_RIFTS) {
      const { core, whorl, flare } = paintAll(def)
      for (const [name, ops] of Object.entries({ core, whorl, flare })) {
        expect(ops.length, `${def.id} ${name}`).toBeGreaterThan(4)
        expect(
          ops.some((o) => o === 'fill()' || o === 'stroke()'),
          `${def.id} ${name}`,
        ).toBe(true)
      }
    }
  })

  it('der Wirbel trägt mindestens so viele Arme wie die Schwere vorgibt', () => {
    for (const def of VOID_RIFTS) {
      const { whorl } = paintAll(def)
      const strokes = whorl.filter((o) => o === 'stroke()').length
      expect(strokes, def.id).toBeGreaterThanOrEqual(VOID_WHORL_ARMS[def.severity])
    }
  })

  it('Schweren und Motive malen verschieden', () => {
    // Bei gleicher Geometrie und ohne Farbe bleibt nur der Bauplan — und der
    // muss je Schwere ein anderer sein.
    const bySeverity = new Map<string, string>()
    for (const def of VOID_RIFTS) {
      const { ctx, ops } = recordingCtx()
      paintVoidWhorl(ctx, 100, 40, def)
      bySeverity.set(def.severity, ops.join('|').replace(/rgba\([^)]*\)/g, ''))
    }
    const sigs = [...bySeverity.values()]
    expect(new Set(sigs).size).toBe(sigs.length)
  })

  it('ist deterministisch', () => {
    for (const def of VOID_RIFTS) {
      const a = paintAll(def)
      const b = paintAll(def)
      expect(a.core.join('|')).toBe(b.core.join('|'))
      expect(a.whorl.join('|')).toBe(b.whorl.join('|'))
    }
  })

  it('der Kern bleibt im Sprite-Feld', () => {
    const rund = /^(arc|ellipse)\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/
    for (const def of VOID_RIFTS) {
      const c = (def.sizePx * VOID_SPRITE_SPAN) / 2
      const { core } = paintAll(def)
      for (const op of core) {
        const m = rund.exec(op)
        if (!m) continue
        expect(Math.abs(Number(m[2]) - c) + Number(m[4]), `${def.id}: ${op}`).toBeLessThanOrEqual(
          c + 0.01,
        )
      }
    }
  })

  it('das Motiv im Schlund gehört nur den schweren', () => {
    for (const def of VOID_RIFTS) {
      const { ctx, ops } = recordingCtx()
      paintVoidWhorl(ctx, 100, 40, def)
      const bare = recordingCtx()
      paintVoidWhorl(bare.ctx, 100, 40, { ...def, dweller: undefined })
      if (def.dweller) {
        expect(VOID_DWELLER_MOTIFS).toContain(def.dweller)
        expect(ops.length, def.id).toBeGreaterThan(bare.ops.length)
      } else {
        expect(ops.length, def.id).toBe(bare.ops.length)
      }
    }
    // Und die beiden Motive malen nicht dasselbe.
    const a = recordingCtx()
    const b = recordingCtx()
    paintDwellerMotif(a.ctx, 40, 'embers', '#ff00ff')
    paintDwellerMotif(b.ctx, 40, 'spires', '#ff00ff')
    expect(a.ops.join('|')).not.toBe(b.ops.join('|'))
  })
})

describe('Void-Körper — Zeit', () => {
  it('der Wirbel friert ein, wenn spawnedAt mitgeschoben wird (Stase)', () => {
    const m = { uid: 7, spawnedAt: 1000 }
    const a = voidWhorlAngle(m, 'greater', 5000, false)
    const b = voidWhorlAngle({ uid: 7, spawnedAt: 1000 + 800 }, 'greater', 5000 + 800, false)
    expect(b).toBeCloseTo(a, 10)
    // und er dreht überhaupt
    expect(voidWhorlAngle(m, 'greater', 9000, false)).not.toBeCloseTo(a, 6)
    // reduced motion: steht
    expect(voidWhorlAngle(m, 'greater', 9000, true)).toBe(voidWhorlAngle(m, 'greater', 1, true))
  })

  it('das Aufflammen beginnt erst nahe der Sonne und pulst dort schneller', () => {
    expect(voidFlareAlpha(0, 0, false)).toBe(0)
    expect(voidFlareAlpha(VOID_URGENT_FRAC - 0.01, 0, false)).toBe(0)
    expect(voidFlareAlpha(1, 0, true)).toBeGreaterThan(0)
    let last = -1
    for (let t = VOID_URGENT_FRAC; t <= 1.0001; t += 0.02) {
      const v = voidFlareAlpha(t, 0, true)
      expect(v).toBeGreaterThanOrEqual(last)
      last = v
    }
    expect(voidFlarePeriodMs(1)).toBeLessThan(voidFlarePeriodMs(VOID_URGENT_FRAC))
  })

  it('nur die schweren ziehen eine Spur', () => {
    expect(voidWakeEchoes('lesser')).toBe(0)
    expect(voidWakeEchoes('greater')).toBeGreaterThan(0)
    expect(voidWakeEchoes('abyssal')).toBeGreaterThan(0)
    expect(VOID_WAKE_ECHOES.lesser).toBe(0)
  })

  it('Umlaufzeit und Arme steigen mit der Schwere', () => {
    for (let i = 1; i < SEVERITIES.length; i++) {
      expect(VOID_WHORL_SPIN_MS[SEVERITIES[i]]).toBeGreaterThan(VOID_WHORL_SPIN_MS[SEVERITIES[i - 1]])
      expect(VOID_WHORL_ARMS[SEVERITIES[i]]).toBeGreaterThanOrEqual(VOID_WHORL_ARMS[SEVERITIES[i - 1]])
    }
    expect(voidSpriteDrawSize(100)).toBe(100 * VOID_SPRITE_SPAN)
  })
})
