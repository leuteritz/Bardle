import { describe, it, expect } from 'vitest'
import {
  SUN_BODY_PAINTERS,
  buildSunSprite,
  sunBodyFor,
  sunPaletteFor,
  sunSpriteBacking,
  sunSpriteDetail,
  sunSpriteKey,
  sunSpriteLayers,
  type SunDetail,
} from '@/utils/fx/sunBodySprite'
import { emptySolarSignature, solarSignatureFrom } from '@/utils/game/solarSignature'
import {
  BLACK_HOLE_SHADOW_FRACTION,
  COMET_JET_MIN_STAGE,
  COMET_STAGE_RADII,
  SOLAR_SIGNATURE_STAGES,
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  SUN_BG_DISC_RADIUS_FACTOR,
  SUN_SPRITE_CORE_MAX_BACKING_PX,
  SUN_SPRITE_DETAIL_PX_1,
  SUN_SPRITE_DETAIL_PX_2,
  SUN_SPRITE_MAX_BACKING_PX,
  SUN_SPRITE_SPAN,
} from '@/config/constants'
import type { SolarSignatureStages, SunBody, SunBodyKind, SunSpriteLayer } from '@/types'
import { recordingCtx } from '../../helpers/recordingCtx'

const R = 100
const KINDS: SunBodyKind[] = ['comet', 'star', 'blackHole']

function stages(over: Partial<SolarSignatureStages> = {}): SolarSignatureStages {
  return { spark: 0, limb: 0, corona: 0, granule: 0, prom: 0, wake: 0, base: 0, ...over }
}

function body(kind: SunBodyKind, stage = 2, sig = stages()): SunBody {
  if (kind === 'blackHole') return { kind, stage: STAR_PHASE_FINAL_INDEX, sig }
  return { kind, stage, sig }
}

function run(b: SunBody, layer: SunSpriteLayer, detail: SunDetail): string[] {
  const { ctx, ops } = recordingCtx()
  const paint = SUN_BODY_PAINTERS[b.kind][layer]
  if (!paint) return []
  paint(ctx, R * 2, R * 2, R, sunPaletteFor(b), b, detail)
  return ops
}

const painted = (ops: string[]) => ops.filter((o) => o === 'fill()' || o === 'stroke()').length

describe('Spielerkörper — Ebenen je Körper', () => {
  it('jede Ebene jedes Körpers malt auf jeder Stufe, auf der sie existiert', () => {
    for (const kind of KINDS) {
      const stage = kind === 'comet' ? COMET_JET_MIN_STAGE : 2
      for (const detail of [0, 1, 2] as const) {
        for (const layer of sunSpriteLayers(body(kind, stage), detail, true)) {
          expect(painted(run(body(kind, stage), layer, detail)), `${kind}/${layer}/${detail}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('ist deterministisch', () => {
    for (const kind of KINDS) {
      for (const layer of sunSpriteLayers(body(kind, 3), 2, true)) {
        expect(run(body(kind, 3), layer, 2).join('|')).toBe(run(body(kind, 3), layer, 2).join('|'))
      }
    }
  })

  it('mehr Detail malt mehr, nie weniger', () => {
    for (const kind of KINDS) {
      for (const layer of sunSpriteLayers(body(kind, 3), 0, false)) {
        const a = painted(run(body(kind, 3), layer, 0))
        const b = painted(run(body(kind, 3), layer, 1))
        const c = painted(run(body(kind, 3), layer, 2))
        expect(b, `${kind}/${layer}`).toBeGreaterThanOrEqual(a)
        expect(c, `${kind}/${layer}`).toBeGreaterThanOrEqual(b)
      }
    }
  })

  it('jede Sonnenphase malt einen anderen Kern', () => {
    const sigs = new Set<string>()
    for (let p = 0; p < STAR_PHASE_FINAL_INDEX; p++) sigs.add(run(body('star', p), 'core', 2).join('|'))
    expect(sigs.size).toBe(STAR_PHASE_FINAL_INDEX)
  })

  it('jede Kometenstufe malt einen anderen Kern und Wake', () => {
    const cores = new Set<string>()
    const wakes = new Set<string>()
    for (let s = 0; s < COMET_STAGE_RADII.length; s++) {
      cores.add(run(body('comet', s), 'core', 2).join('|'))
      wakes.add(run(body('comet', s), 'wake', 2).join('|'))
    }
    expect(cores.size).toBe(COMET_STAGE_RADII.length)
    expect(wakes.size).toBe(COMET_STAGE_RADII.length)
  })
})

describe('Signatur → Motiv', () => {
  const top = SOLAR_SIGNATURE_STAGES.length - 1

  it('Funken (chimesPerClick) erscheinen erst mit der Achse und wachsen', () => {
    const bare = painted(run(body('star', 2), 'core', 2))
    let prev = bare
    for (let s = 1; s <= top; s++) {
      const n = painted(run(body('star', 2, stages({ spark: s })), 'core', 2))
      expect(n).toBeGreaterThanOrEqual(prev)
      prev = n
    }
    expect(prev).toBeGreaterThan(bare)
  })

  it('Protuberanzen (dmgPerClick) werden mit jeder Stufe mehr', () => {
    let prev = painted(run(body('star', 2), 'corona', 2))
    for (let s = 1; s <= top; s++) {
      const n = painted(run(body('star', 2, stages({ prom: s })), 'corona', 2))
      expect(n).toBeGreaterThan(prev)
      prev = n
    }
  })

  it('der Wake (flightSpeed) verdichtet sich mit der Stufe', () => {
    for (const kind of KINDS) {
      let prev = painted(run(body(kind), 'wake', 2))
      for (let s = 1; s <= top; s++) {
        const n = painted(run(body(kind, 2, stages({ wake: s })), 'wake', 2))
        expect(n, `${kind}/${s}`).toBeGreaterThanOrEqual(prev)
        prev = n
      }
    }
  })

  it('der Komet trägt keine Achse — nur seine Stufe und die Grundsignatur', () => {
    const bare = run(body('comet', 2), 'core', 2).join('|')
    expect(run(body('comet', 2, stages({ spark: top, prom: top, granule: top })), 'core', 2).join('|')).toBe(bare)
    expect(run(body('comet', 2, stages({ base: 3 })), 'core', 2).join('|')).not.toBe(bare)
  })
})

describe('Geometrie und Verträge', () => {
  it('kein Zeichenbefehl verlässt das Feld seiner Ebene', () => {
    const re = /^(arc|ellipse|moveTo|lineTo|quadraticCurveTo|bezierCurveTo)\((-?[\d.]+),(-?[\d.]+)/
    for (const kind of KINDS) {
      const b = body(kind, 3)
      for (const layer of sunSpriteLayers(b, 2, true)) {
        const reach = R * SUN_SPRITE_SPAN[layer] * 1.02
        for (const op of run(b, layer, 2)) {
          const m = re.exec(op)
          if (!m) continue
          const dx = Number(m[2]) - R * 2
          const dy = Number(m[3]) - R * 2
          expect(Math.hypot(dx, dy), `${kind}/${layer}: ${op}`).toBeLessThanOrEqual(reach)
        }
      }
    }
  })

  it('der Doppler-Ring malt nichts innerhalb des Horizonts', () => {
    const ops = run(body('blackHole'), 'bhGlaze', 2)
    const arcs = ops.filter((o) => o.startsWith('arc('))
    expect(arcs.length).toBeGreaterThan(0)
    for (const op of arcs) {
      const radius = Number(op.split(',')[2])
      expect(radius).toBeGreaterThan(R * 2 * BLACK_HOLE_SHADOW_FRACTION * 0.5)
    }
  })

  it('der Horizont ist reines Schwarz', () => {
    // Nur echtes #000 liest sich vor dem Kosmos als Abwesenheit von Licht
    const { ctx, ops } = recordingCtx()
    const styles: string[] = []
    Object.defineProperty(ctx, 'fillStyle', { set: (v: string) => styles.push(v), get: () => '' })
    SUN_BODY_PAINTERS.blackHole.bhShadow!(ctx, R * 2, R * 2, R, sunPaletteFor(body('blackHole')), body('blackHole'), 2)
    expect(styles[styles.length - 1]).toBe('#000')
    expect(ops[ops.length - 1]).toBe('fill()')
  })

  it('der Kometenkern endet mit dem Terminator (source-atop)', () => {
    const { ctx, ops } = recordingCtx()
    const modes: string[] = []
    Object.defineProperty(ctx, 'globalCompositeOperation', {
      set: (v: string) => modes.push(v),
      get: () => 'source-over',
    })
    SUN_BODY_PAINTERS.comet.core!(ctx, R * 2, R * 2, R, sunPaletteFor(body('comet')), body('comet'), 2)
    expect(modes).toContain('source-atop')
    expect(ops.slice(-3)).toContain('restore()')
  })

  it('der Schlüssel trennt Ebene, Körper, Stufe, Signatur, Grösse, dpr und Detail — ohne Farbe', () => {
    const b = body('star', 2)
    const base = sunSpriteKey('core', b, 200, 2, 2)
    expect(sunSpriteKey('halo', b, 200, 2, 2)).not.toBe(base)
    expect(sunSpriteKey('core', body('comet', 2), 200, 2, 2)).not.toBe(base)
    expect(sunSpriteKey('core', body('star', 3), 200, 2, 2)).not.toBe(base)
    expect(sunSpriteKey('core', body('star', 2, stages({ spark: 1 })), 200, 2, 2)).not.toBe(base)
    expect(sunSpriteKey('core', b, 201, 2, 2)).not.toBe(base)
    expect(sunSpriteKey('core', b, 200, 1, 2)).not.toBe(base)
    expect(sunSpriteKey('core', b, 200, 2, 1)).not.toBe(base)
    expect(base).not.toMatch(/#|rgb/)
    expect(sunSpriteKey('core', b, 200.3, 2, 2)).toBe(base)
  })

  it('unter der ersten Schwelle nur Halo und Kern; der Orbit-Komet trägt seinen Wake', () => {
    expect(sunSpriteLayers(body('star'), 0, true)).toEqual(['halo', 'core'])
    expect(sunSpriteLayers(body('comet'), 0, true)).toEqual(['coma', 'core'])
    expect(sunSpriteLayers(body('comet', 1), 1, true)).toContain('wake')
    expect(sunSpriteLayers(body('comet', COMET_JET_MIN_STAGE - 1), 2, false)).not.toContain('jets')
    expect(sunSpriteLayers(body('comet', COMET_JET_MIN_STAGE), 2, false)).toContain('jets')
    expect(sunSpriteLayers(body('star'), 2, true).at(-1)).toBe('wake')
    const cometOrbitMax = COMET_STAGE_RADII[COMET_STAGE_RADII.length - 1] * SUN_BG_DISC_RADIUS_FACTOR
    expect(sunSpriteDetail(cometOrbitMax)).toBe(1)
    expect(sunSpriteDetail(SUN_SPRITE_DETAIL_PX_1 - 1)).toBe(0)
    expect(sunSpriteDetail(SUN_SPRITE_DETAIL_PX_2)).toBe(2)
  })

  it('der Backing-Deckel senkt den dpr, nie die CSS-Kante', () => {
    const big = sunSpriteBacking(560, 'halo', 2)
    expect(big.span).toBe(Math.round(560 * SUN_SPRITE_SPAN.halo))
    expect(big.span * big.dpr).toBeLessThanOrEqual(SUN_SPRITE_MAX_BACKING_PX + 1)
    const core = sunSpriteBacking(560, 'core', 2)
    expect(core.span * core.dpr).toBeLessThanOrEqual(SUN_SPRITE_CORE_MAX_BACKING_PX + 1)
    const small = sunSpriteBacking(120, 'core', 2)
    expect(small.dpr).toBe(2)
  })

  it('sunBodyFor bildet Komet, Phase und Endphase ab', () => {
    const sig = emptySolarSignature()
    expect(sunBodyFor({ isCometState: true, cometStage: 4, starPhase: 0 }, sig)).toMatchObject({ kind: 'comet', stage: 4 })
    expect(sunBodyFor({ isCometState: false, cometStage: 5, starPhase: 2 }, sig)).toMatchObject({ kind: 'star', stage: 2 })
    expect(sunBodyFor({ isCometState: false, cometStage: 5, starPhase: STAR_PHASE_FINAL_INDEX }, sig)).toMatchObject({
      kind: 'blackHole',
    })
    const withSig = solarSignatureFrom({
      rayLevels: { flightSpeed: 6, maxHp: 0, chimesPerClick: 0, chimesPerSecond: 0, dmgPerClick: 0 },
      nodeLevelBags: [],
      relicLevels: 0,
      constellationCount: 0,
      totalPrestiges: 0,
    })
    expect(sunBodyFor({ isCometState: false, cometStage: 5, starPhase: 1 }, withSig).sig.wake).toBeGreaterThan(0)
  })

  it('buildSunSprite liefert in jsdom null statt zu werfen', () => {
    expect(buildSunSprite('core', body('star'), 200, 2, 2)).toBeNull()
  })

  it('die Endphase ist thermisch, nicht violett', () => {
    const p = STAR_PHASE_DATA[STAR_PHASE_FINAL_INDEX]
    const [r, g, b] = [p.mid, p.phaseGlow].map((hex) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ])[0]
    expect(r).toBeGreaterThan(b)
    expect(g).toBeGreaterThan(b)
  })
})
