import { describe, it, expect } from 'vitest'
import { yieldBandSegments } from '@/utils/ui/yieldBand'
import { FORGE_YIELD_SOURCES, FORGE_YIELD_MIN_SEGMENT_PCT } from '@/config/constants'
import type { CpsFactor } from '@/types'

/**
 * Die Zerlegung des Herkunftsbands im Shop-Sockel.
 *
 * Geprüft wird hier die MATHEMATIK, nicht die Anzeige: dass die Anteile
 * logarithmisch sind (und nicht linear), dass die Summe immer 100 ergibt, und
 * dass die drei Zustände ohne Division durch null auskommen, die man im Bild
 * kaum herstellt — „alles neutral", „nur Abzüge" und „der Abzug übersteigt den
 * Gewinn".
 */
describe('yieldBandSegments', () => {
  const f = (entries: Record<string, number>): CpsFactor[] =>
    FORGE_YIELD_SOURCES.map((s) => ({ id: s.id, factor: entries[s.id] ?? 1 }))

  const sumPct = (segs: { pct: number }[]) => segs.reduce((sum, s) => sum + s.pct, 0)

  // ─── Leerzustand ────────────────────────────────────────────────────────────

  it('gibt nichts zurueck, wenn jeder Faktor neutral ist', () => {
    expect(yieldBandSegments(f({}))).toEqual([])
  })

  it('laesst neutrale Herkuenfte weg — das Band zeigt nur, was wirkt', () => {
    const segs = yieldBandSegments(f({ forge: 2 }))
    expect(segs).toHaveLength(1)
    expect(segs[0].id).toBe('forge')
  })

  // ─── Logarithmische Anteile ─────────────────────────────────────────────────

  it('teilt zwei gleiche Faktoren haelftig', () => {
    const segs = yieldBandSegments(f({ forge: 4, meeps: 4 }))
    expect(segs).toHaveLength(2)
    expect(segs[0].pct).toBeCloseTo(50, 6)
    expect(segs[1].pct).toBeCloseTo(50, 6)
  })

  /**
   * Der Kern der Sache: ×8 ist DREIMAL ×2, nicht viermal. Das Paar ist so
   * gewaehlt, dass die beiden Rechnungen auseinanderlaufen —
   * logarithmisch ln(8)/(ln(8)+ln(2)) = 0,75, linear 8/(8+2) = 0,80.
   * (Bei ×4 gegen ×2 lieferten beide zufaellig 0,667 und der Test faenge nichts.)
   */
  it('gewichtet logarithmisch, nicht linear', () => {
    const segs = yieldBandSegments(f({ forge: 8, meeps: 2 }))
    const forge = segs.find((s) => s.id === 'forge')!
    expect(forge.pct).toBeCloseTo(75, 6) // ln(8)/(ln(8)+ln(2)) = 3/4
    expect(forge.pct).not.toBeCloseTo(80, 1) // die lineare Rechnung waere 8/10
  })

  it('summiert immer auf 100', () => {
    for (const entries of [
      { forge: 2 },
      { forge: 8, meeps: 2, codex: 1.5 },
      { forge: 80, solar: 1.05, void: 0.88 },
      { forge: 3, void: 0.5, bosses: 0.9 },
    ]) {
      expect(sumPct(yieldBandSegments(f(entries)))).toBeCloseTo(100, 6)
    }
  })

  // ─── Abzuege ────────────────────────────────────────────────────────────────

  it('markiert Faktoren unter 1 als Abzug und stellt sie ans Ende', () => {
    const segs = yieldBandSegments(f({ void: 0.8, forge: 4, solar: 2 }))
    expect(segs.map((s) => s.id)).toEqual(['solar', 'forge', 'void'])
    expect(segs.filter((s) => s.drains).map((s) => s.id)).toEqual(['void'])
  })

  it('nimmt der Abzugszone genau den Anteil, den sie frisst', () => {
    // ln(0.5) ist genau −ln(2): der Abzug wiegt so viel wie der halbe Gewinn.
    const segs = yieldBandSegments(f({ forge: 4, void: 0.5 }))
    const drain = segs.find((s) => s.drains)!
    expect(drain.pct).toBeCloseTo(50, 6) // ln(2)/ln(4) = 1/2
  })

  /**
   * Frisst der Abzug mehr, als da ist, bleibt vom Beitrag keine Breite uebrig —
   * und dann steht er auch nicht mehr im Band. Ein auf die Mindestbreite
   * gehobenes Nichts naehme dem Verlust ein Stueck seiner Laenge, obwohl der
   * gerade alles nimmt.
   */
  it('faerbt das Band ganz rot, wenn der Abzug den Gewinn uebersteigt', () => {
    const segs = yieldBandSegments(f({ forge: 2, void: 0.1 }))
    expect(segs.map((s) => s.id)).toEqual(['void'])
    expect(segs[0].pct).toBeCloseTo(100, 6)
  })

  it('kommt ohne jeden Beitrag aus — nur Abzuege ergeben ein volles Band', () => {
    const segs = yieldBandSegments(f({ void: 0.5 }))
    expect(segs).toHaveLength(1)
    expect(segs[0].drains).toBe(true)
    expect(segs[0].pct).toBeCloseTo(100, 6)
  })

  /**
   * Eine Providence wuerfelt „ein Buff und ein Debuff aus derselben Domaene" —
   * `universe` kann also ebenso gut abziehen wie die Leere. Die Einordnung
   * haengt am WERT, nicht am System.
   */
  it('behandelt jede Herkunft unter 1 als Abzug, nicht nur Void und Bosse', () => {
    const segs = yieldBandSegments(f({ forge: 4, universe: 0.75 }))
    expect(segs.find((s) => s.id === 'universe')!.drains).toBe(true)
  })

  // ─── Mindestbreite ──────────────────────────────────────────────────────────

  it('hebt zu schmale Segmente auf die Mindestbreite, ohne die Summe zu brechen', () => {
    const segs = yieldBandSegments(f({ forge: 1e6, solar: 1.001 }))
    const thin = segs.find((s) => s.id === 'solar')!
    expect(thin.pct).toBeCloseTo(FORGE_YIELD_MIN_SEGMENT_PCT, 6)
    expect(sumPct(segs)).toBeCloseTo(100, 6)
  })

  it('traegt alle zehn Herkuenfte gleichzeitig', () => {
    const segs = yieldBandSegments(FORGE_YIELD_SOURCES.map((s) => ({ id: s.id, factor: 2 })))
    expect(segs).toHaveLength(FORGE_YIELD_SOURCES.length)
    expect(sumPct(segs)).toBeCloseTo(100, 6)
    for (const s of segs) expect(s.pct).toBeGreaterThanOrEqual(FORGE_YIELD_MIN_SEGMENT_PCT)
  })

  // ─── Robustheit ─────────────────────────────────────────────────────────────

  it('ueberspringt kaputte Faktoren, statt das Band mitzureissen', () => {
    const segs = yieldBandSegments([
      { id: 'forge', factor: 4 },
      { id: 'meeps', factor: Number.NaN },
      { id: 'codex', factor: 0 },
      { id: 'solar', factor: Number.POSITIVE_INFINITY },
    ])
    expect(segs.map((s) => s.id)).toEqual(['forge'])
    expect(sumPct(segs)).toBeCloseTo(100, 6)
  })

  it('kennt jede Herkunft aus der Tabelle', () => {
    const segs = yieldBandSegments(FORGE_YIELD_SOURCES.map((s) => ({ id: s.id, factor: 1.5 })))
    expect(segs.map((s) => s.id).sort()).toEqual(FORGE_YIELD_SOURCES.map((s) => s.id).sort())
    for (const seg of segs) {
      expect(seg.label).toBeTruthy()
      expect(seg.title).toBeTruthy()
      expect(seg.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  // ─── Beschriftung ───────────────────────────────────────────────────────────

  it('schreibt am Beitrag den Faktor, am Abzug den Verlust', () => {
    const segs = yieldBandSegments(f({ forge: 1.42, void: 0.88 }))
    expect(segs.find((s) => s.id === 'forge')!.detail).toBe('×1.42')
    expect(segs.find((s) => s.id === 'void')!.detail).toBe('−12 %')
  })
})
