import { describe, it, expect } from 'vitest'
import {
  SUN_BODY_PAINTERS,
  buildSunSprite,
  isSunBandLayer,
  sunBandStrip,
  sunBodyFor,
  sunBodyRadiusFraction,
  sunPaletteFor,
  sunSpriteBacking,
  sunSpriteDetail,
  sunSpriteKey,
  sunSpriteLayers,
  sunWakeCopyStyle,
  type SunDetail,
} from '@/utils/fx/sunBodySprite'
import { emptySolarSignature, solarSignatureFrom } from '@/utils/game/solarSignature'
import {
  BLACK_HOLE_DISC_INNER_FRACTION,
  BLACK_HOLE_DISC_INNER_RING_FRACTION,
  BLACK_HOLE_SHADOW_FRACTION,
  COMET_DISC_FILL,
  COMET_JET_MIN_STAGE,
  COMET_STAGE_RADII,
  SOLAR_SIGNATURE_STAGES,
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  SUN_BAND_MAX_BACKING_PX,
  SUN_BAND_PERIOD_BR,
  SUN_BANDS,
  SUN_BG_DISC_RADIUS_FACTOR,
  SUN_SPRITE_BODY_FRACTION,
  SUN_SPRITE_CORE_MAX_BACKING_PX,
  SUN_SPRITE_DETAIL_PX_1,
  SUN_SPRITE_DETAIL_PX_2,
  SUN_SPRITE_MAX_BACKING_PX,
  SUN_SPRITE_SPAN,
  SUN_WAKE_GUST_STAGGER,
} from '@/config/constants'
import type {
  SolarSignatureStages,
  SunBandLayer,
  SunBody,
  SunBodyKind,
  SunSpriteLayer,
} from '@/types'
import { recordingCtx } from '../../helpers/recordingCtx'

const R = 100
const KINDS: SunBodyKind[] = ['comet', 'star', 'blackHole']
const BANDS: SunBandLayer[] = ['bandN', 'bandE', 'bandS']

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

function paintedAll(b: SunBody, detail: SunDetail): number {
  return sunSpriteLayers(b, detail, false).reduce(
    (sum, layer) => sum + painted(run(b, layer, detail)),
    0,
  )
}

const COORD_RE =
  /^(arc|ellipse|moveTo|lineTo|quadraticCurveTo|bezierCurveTo)\((-?[\d.]+),(-?[\d.]+)/

describe('Spielerkörper — Ebenen je Körper', () => {
  it('jede Ebene jedes Körpers malt auf jeder Stufe, auf der sie existiert', () => {
    for (const kind of KINDS) {
      const stage = kind === 'comet' ? COMET_JET_MIN_STAGE : 2
      for (const detail of [0, 1, 2] as const) {
        for (const layer of sunSpriteLayers(body(kind, stage), detail, true)) {
          expect(
            painted(run(body(kind, stage), layer, detail)),
            `${kind}/${layer}/${detail}`,
          ).toBeGreaterThan(0)
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

  it('mehr Detail malt mehr, nie weniger — über alle Ebenen des Körpers', () => {
    // Der Kern gibt ab Detail 1 Zellen, Flecken und Rand an Bänder und Schatten ab
    for (const kind of KINDS) {
      const a = paintedAll(body(kind, 3), 0)
      const b = paintedAll(body(kind, 3), 1)
      const c = paintedAll(body(kind, 3), 2)
      expect(b, kind).toBeGreaterThanOrEqual(a)
      expect(c, kind).toBeGreaterThanOrEqual(b)
    }
  })

  it('jede Sonnenphase malt einen anderen Kern', () => {
    const sigs = new Set<string>()
    for (let p = 0; p < STAR_PHASE_FINAL_INDEX; p++)
      sigs.add(run(body('star', p), 'core', 2).join('|'))
    expect(sigs.size).toBe(STAR_PHASE_FINAL_INDEX)
  })

  it('jede Kometenstufe malt ein anderes Band und einen anderen Wake', () => {
    const bands = new Set<string>()
    const wakes = new Set<string>()
    for (let s = 0; s < COMET_STAGE_RADII.length; s++) {
      bands.add(run(body('comet', s), 'bandE', 2).join('|'))
      wakes.add(run(body('comet', s), 'wake', 2).join('|'))
    }
    expect(bands.size).toBe(COMET_STAGE_RADII.length)
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
    expect(
      run(body('comet', 2, stages({ spark: top, prom: top, granule: top })), 'core', 2).join('|'),
    ).toBe(bare)
    expect(run(body('comet', 2, stages({ base: 3 })), 'core', 2).join('|')).not.toBe(bare)
  })
})

describe('Achsdrehung — Bänder und Schatten', () => {
  it('Detail 1 trägt nur das Äquatorband, Detail 2 alle drei; der Schatten folgt dem Band', () => {
    for (const kind of ['star', 'comet'] as const) {
      const d0 = sunSpriteLayers(body(kind), 0, false)
      const d1 = sunSpriteLayers(body(kind), 1, false)
      const d2 = sunSpriteLayers(body(kind), 2, false)
      expect(d0.some(isSunBandLayer)).toBe(false)
      expect(d0).not.toContain('shade')
      expect(d1.filter(isSunBandLayer)).toEqual(['bandE'])
      expect(d1).toContain('shade')
      expect(d1.indexOf('core')).toBeLessThan(d1.indexOf('bandE'))
      expect(d1.indexOf('bandE')).toBeLessThan(d1.indexOf('shade'))
      if (kind === 'star') {
        expect(d2.filter(isSunBandLayer).sort()).toEqual([...BANDS].sort())
        // Der Äquator liegt ÜBER N und S — beide Nähte blenden gleich
        expect(d2.indexOf('bandE')).toBeGreaterThan(d2.indexOf('bandN'))
        expect(d2.indexOf('bandE')).toBeGreaterThan(d2.indexOf('bandS'))
      } else {
        expect(d2.filter(isSunBandLayer)).toEqual(['bandE'])
      }
      for (const band of d2.filter(isSunBandLayer))
        expect(d2.indexOf(band)).toBeLessThan(d2.indexOf('shade'))
    }
    const bh = sunSpriteLayers(body('blackHole'), 2, false)
    expect(bh.indexOf('bhDiscIn')).toBe(bh.indexOf('bhDisc') + 1)
  })

  it('die Bahn ist nahtlos: jeder Körper hat seinen Zwilling eine Periode weiter', () => {
    for (const kind of ['star', 'comet'] as const) {
      const b = body(kind, kind === 'comet' ? 4 : 2)
      const br = R * sunBodyRadiusFraction(kind)
      const period = SUN_BAND_PERIOD_BR * br
      const x0 = R * 2 - period
      for (const layer of sunSpriteLayers(b, 2, false).filter(isSunBandLayer)) {
        const marks = run(b, layer, 2)
          .map((op) => /^(arc|ellipse)\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/.exec(op))
          .filter((m): m is RegExpExecArray => m !== null)
          .map((m) => ({ x: Number(m[2]), y: Number(m[3]), r: Number(m[4]) }))
        expect(marks.length, `${kind}/${layer}`).toBeGreaterThan(4)
        const firsts = marks.filter((m) => m.x < x0 + period)
        expect(firsts.length).toBeGreaterThan(0)
        for (const m of firsts) {
          const twin = marks.find(
            (t) =>
              Math.abs(t.x - (m.x + period)) < 0.05 &&
              Math.abs(t.y - m.y) < 0.05 &&
              Math.abs(t.r - m.r) < 0.05,
          )
          expect(twin, `${kind}/${layer}: (${m.x}, ${m.y}) ohne Zwilling`).toBeDefined()
        }
      }
    }
  })

  it('der Terminator liegt auf der Schattenebene — der Kern trägt ihn nur ohne Bänder', () => {
    const shade = run(body('comet'), 'shade', 2)
    expect(shade.some((o) => o.startsWith('createLinearGradient('))).toBe(true)
    expect(shade.some((o) => o.startsWith('lineTo('))).toBe(true)
    expect(shade[shade.length - 1]).toBe('fill()')
    expect(run(body('comet'), 'core', 2).some((o) => o.startsWith('createLinearGradient('))).toBe(
      false,
    )
    expect(run(body('comet'), 'core', 0).some((o) => o.startsWith('createLinearGradient('))).toBe(
      true,
    )
    // Der Stern: Randverdunkelung nur ohne Bänder im Kern, sonst auf shade
    const limbArcs = (ops: string[]) =>
      ops.filter((o) => o.startsWith('arc(') && o.includes(',true')).length
    expect(limbArcs(run(body('star'), 'core', 0))).toBeGreaterThan(0)
    expect(limbArcs(run(body('star'), 'core', 2))).toBe(0)
    expect(limbArcs(run(body('star'), 'shade', 2))).toBeGreaterThan(0)
  })

  it('das Streifen-Backing deckelt die BREITE, die Höhe folgt der Bandhöhe', () => {
    const big = sunSpriteBacking(560, 'bandE', 2, 'star')
    const strip = sunBandStrip('bandE', 'star')
    expect(big.span).toBe(Math.round(560 * strip.w))
    expect(big.spanY).toBe(Math.round(560 * strip.h))
    expect(big.span * big.dpr).toBeLessThanOrEqual(SUN_BAND_MAX_BACKING_PX + 1)
    // Der Streifen folgt dem Körperanteil — der Fels füllt 0,76 der Box, das Plasma 0,74
    expect(sunBandStrip('bandE', 'comet').w).toBeCloseTo(
      (strip.w * COMET_DISC_FILL) / SUN_SPRITE_BODY_FRACTION,
      6,
    )
    for (const band of BANDS) expect(sunBandStrip(band, 'star').speed).toBe(SUN_BANDS[band].speed)
  })

  it('jede Wake-Kopie hat ihre eigene Dauer und ihren eigenen Start', () => {
    const styles = SUN_WAKE_GUST_STAGGER.map((_, i) => sunWakeCopyStyle(i + 1, 12))
    expect(new Set(styles.map((s) => s['--gust-f'])).size).toBe(styles.length)
    expect(new Set(styles.map((s) => s.animationDelay)).size).toBe(styles.length)
    for (const s of styles) expect(Number.parseFloat(s.animationDelay)).toBeLessThanOrEqual(0)
  })
})

describe('Geometrie und Verträge', () => {
  it('kein Zeichenbefehl verlässt das Feld seiner Ebene', () => {
    for (const kind of KINDS) {
      const b = body(kind, 3)
      for (const layer of sunSpriteLayers(b, 2, true)) {
        if (isSunBandLayer(layer)) {
          const br = R * sunBodyRadiusFraction(kind)
          const halfW = (SUN_BAND_PERIOD_BR * 2 * br) / 2
          const halfH = (SUN_BANDS[layer].h * br) / 2
          for (const op of run(b, layer, 2)) {
            const m = COORD_RE.exec(op)
            if (!m) continue
            // Eine Körperlänge Überstand an der Streifenkante ist unsichtbar: das
            // Fenster der Scheibe läuft von 1 br bis 7 br, der Streifen ist 8 br
            expect(Math.abs(Number(m[2]) - R * 2), `${kind}/${layer}: ${op}`).toBeLessThanOrEqual(
              halfW + br,
            )
            expect(Math.abs(Number(m[3]) - R * 2), `${kind}/${layer}: ${op}`).toBeLessThanOrEqual(
              halfH * 1.02,
            )
          }
          continue
        }
        const reach = R * SUN_SPRITE_SPAN[layer] * 1.02
        for (const op of run(b, layer, 2)) {
          const m = COORD_RE.exec(op)
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

  it('der Innenring des Lochs bleibt zwischen Innenrand und seinem Anteil der Scheibe', () => {
    const inner = (R * 2 * BLACK_HOLE_DISC_INNER_FRACTION) / 2
    const outer = R * 0.96
    const edge = inner + (outer - inner) * BLACK_HOLE_DISC_INNER_RING_FRACTION
    for (const op of run(body('blackHole'), 'bhDiscIn', 2)) {
      const m = COORD_RE.exec(op)
      if (!m) continue
      const d = Math.hypot(Number(m[2]) - R * 2, Number(m[3]) - R * 2)
      const radius = op.startsWith('arc(') ? Number(op.split(',')[2]) : 0
      expect(d + (d < 1 ? radius : radius), op).toBeLessThanOrEqual(edge * 1.05)
      if (d < 1) expect(radius, op).toBeGreaterThanOrEqual(inner * 0.95)
    }
  })

  it('der Horizont ist reines Schwarz', () => {
    // Nur echtes #000 liest sich vor dem Kosmos als Abwesenheit von Licht
    const { ctx, ops } = recordingCtx()
    const styles: string[] = []
    Object.defineProperty(ctx, 'fillStyle', { set: (v: string) => styles.push(v), get: () => '' })
    SUN_BODY_PAINTERS.blackHole.bhShadow!(
      ctx,
      R * 2,
      R * 2,
      R,
      sunPaletteFor(body('blackHole')),
      body('blackHole'),
      2,
    )
    expect(styles[styles.length - 1]).toBe('#000')
    expect(ops[ops.length - 1]).toBe('fill()')
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
    const cometOrbitMax =
      COMET_STAGE_RADII[COMET_STAGE_RADII.length - 1] * SUN_BG_DISC_RADIUS_FACTOR
    expect(sunSpriteDetail(cometOrbitMax)).toBe(1)
    expect(sunSpriteDetail(SUN_SPRITE_DETAIL_PX_1 - 1)).toBe(0)
    expect(sunSpriteDetail(SUN_SPRITE_DETAIL_PX_2)).toBe(2)
  })

  it('der Backing-Deckel senkt den dpr, nie die CSS-Kante', () => {
    const big = sunSpriteBacking(560, 'halo', 2)
    expect(big.span).toBe(Math.round(560 * SUN_SPRITE_SPAN.halo))
    expect(big.spanY).toBe(big.span)
    expect(big.span * big.dpr).toBeLessThanOrEqual(SUN_SPRITE_MAX_BACKING_PX + 1)
    const core = sunSpriteBacking(560, 'core', 2)
    expect(core.span * core.dpr).toBeLessThanOrEqual(SUN_SPRITE_CORE_MAX_BACKING_PX + 1)
    const small = sunSpriteBacking(120, 'core', 2)
    expect(small.dpr).toBe(2)
  })

  it('sunBodyFor bildet Komet, Phase und Endphase ab', () => {
    const sig = emptySolarSignature()
    expect(sunBodyFor({ isCometState: true, cometStage: 4, starPhase: 0 }, sig)).toMatchObject({
      kind: 'comet',
      stage: 4,
    })
    expect(sunBodyFor({ isCometState: false, cometStage: 5, starPhase: 2 }, sig)).toMatchObject({
      kind: 'star',
      stage: 2,
    })
    expect(
      sunBodyFor({ isCometState: false, cometStage: 5, starPhase: STAR_PHASE_FINAL_INDEX }, sig),
    ).toMatchObject({
      kind: 'blackHole',
    })
    const withSig = solarSignatureFrom({
      rayLevels: {
        flightSpeed: 6,
        maxHp: 0,
        chimesPerClick: 0,
        chimesPerSecond: 0,
        dmgPerClick: 0,
      },
      nodeLevelBags: [],
      relicLevels: 0,
      constellationCount: 0,
      totalPrestiges: 0,
    })
    expect(
      sunBodyFor({ isCometState: false, cometStage: 5, starPhase: 1 }, withSig).sig.wake,
    ).toBeGreaterThan(0)
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
