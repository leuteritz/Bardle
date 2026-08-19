import { describe, it, expect } from 'vitest'
import { yieldBandSegments, unusedYieldSources, yieldRingArcs } from '@/utils/ui/yieldBand'
import {
  FORGE_YIELD_SOURCES,
  FORGE_YIELD_MIN_SEGMENT_PCT,
  FORGE_YIELD_UNUSED_WIDTH_PCT,
  FORGE_YIELD_RING_CIRCUMFERENCE,
  FORGE_YIELD_RING_GAP,
  FORGE_YIELD_RING_MIN_ARC,
} from '@/config/constants'
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

  it('traegt jede Herkunft der Tabelle gleichzeitig', () => {
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

  /**
   * Der Balken hat weniger Platz als das Kaertchen: dort steht die kurze Form
   * mit einer Nachkommastelle, hier die lange mit zweien.
   */
  it('haelt die kurze Balkenform von der langen Kaertchenform getrennt', () => {
    const segs = yieldBandSegments(f({ forge: 2.773 }))
    expect(segs[0].value).toBe('2.8×')
    expect(segs[0].detail).toBe('×2.77')
  })

  it('setzt am Abzug auch im Balken den Verlust, nicht den Faktor', () => {
    // `0.88×` im Balken laese sich neben `2.8×` wie ein weiterer Beitrag.
    const segs = yieldBandSegments(f({ forge: 4, void: 0.88 }))
    expect(segs.find((s) => s.drains)!.value).toBe('−12 %')
  })

  it('traegt an jedem Segment den Hinweis seiner Herkunft', () => {
    for (const seg of yieldBandSegments(f({ forge: 2, meeps: 2, void: 0.8 }))) {
      expect(seg.hint.length, `${seg.id} ohne Hinweis`).toBeGreaterThan(0)
    }
  })

  // ─── Mitte des Segments (Position des Kaertchens) ───────────────────────────

  /**
   * Aus dem Anfang setzt `yieldRingArcs()` den Bogen an seine Stelle im Ring.
   * Vorher stand hier die MITTE — sie trug das Kaertchen des alten Balkens, und
   * der Ring braucht statt ihrer den Ansatzpunkt.
   */
  it('setzt den Anfang auf die kumulierte Breite der Vorgaenger', () => {
    const segs = yieldBandSegments(f({ forge: 4, meeps: 4 }))
    expect(segs[0].start).toBeCloseTo(0, 6)
    expect(segs[1].start).toBeCloseTo(50, 6)
  })

  it('haelt jeden Anfang innerhalb des Bandes und in Leserichtung', () => {
    for (const entries of [
      { forge: 2 },
      { forge: 8, meeps: 2, codex: 1.5 },
      { forge: 80, solar: 1.05, void: 0.88 },
      { forge: 3, solar: 1.2, meeps: 1.9, codex: 1.4, void: 0.7 },
    ]) {
      const segs = yieldBandSegments(f(entries))
      let prev = -1
      for (const s of segs) {
        expect(s.start).toBeGreaterThanOrEqual(0)
        expect(s.start).toBeLessThan(100)
        expect(s.start, 'Anfaenge muessen aufsteigen').toBeGreaterThan(prev)
        prev = s.start
      }
    }
  })

  /**
   * Der Anfang wird NACH dem Anheben der schmalen Segmente gebildet. Vorher
   * gebildet zeigte er auf die rechnerische statt auf die gezeichnete Breite,
   * und jeder Bogen hinter einem angehobenen Segment saesse daneben.
   */
  it('rechnet den Anfang aus den ANGEHOBENEN Breiten', () => {
    const segs = yieldBandSegments(f({ forge: 1e6, solar: 1.001 }))
    let run = 0
    for (const s of segs) {
      expect(s.start).toBeCloseTo(run, 6)
      run += s.pct
    }
    expect(run).toBeCloseTo(100, 6)
  })
})

describe('unusedYieldSources', () => {
  const f = (entries: Record<string, number>): CpsFactor[] =>
    FORGE_YIELD_SOURCES.map((s) => ({ id: s.id, factor: entries[s.id] ?? 1 }))

  const earned = FORGE_YIELD_SOURCES.filter((s) => s.nature === 'earned')

  it('nennt im frischen Spielstand jede ERWORBENE Herkunft', () => {
    expect(unusedYieldSources(f({})).map((d) => d.id)).toEqual(earned.map((s) => s.id))
  })

  it('laesst weg, was wirkt', () => {
    const ids = unusedYieldSources(f({ forge: 2 })).map((d) => d.id)
    expect(ids).not.toContain('forge')
    expect(ids).toHaveLength(earned.length - 1)
  })

  it('ist leer, wenn jede erworbene Herkunft beitraegt', () => {
    const all = Object.fromEntries(earned.map((s) => [s.id, 2]))
    expect(unusedYieldSources(f(all))).toEqual([])
  })

  // ─── Die NATUR entscheidet, ob „neutral" ein Mangel ist ─────────────────────

  /**
   * Der Befund, der diese Unterscheidung ausgeloest hat: nach „Max Everything"
   * im Admin-Panel stand im Sockel „3 unused", und alle drei waren richtig so.
   * Der Zustand hier ist genau dieser — jede erworbene Quelle traegt, kein
   * Zeit-Buff laeuft, kein Zoll wird gezahlt.
   */
  it('meldet im Endzustand GAR NICHTS als ungenutzt', () => {
    const maxed = Object.fromEntries(earned.map((s) => [s.id, 2]))
    expect(unusedYieldSources(f({ ...maxed, boons: 1, void: 1, bosses: 1 }))).toEqual([])
  })

  /** `boons` ist befristet — ein Faktor von 1 heisst „gerade laeuft nichts". */
  it('zaehlt eine befristete Quelle nie als ungenutzt', () => {
    const ids = unusedYieldSources(f({})).map((d) => d.id)
    expect(ids).not.toContain('boons')
  })

  /**
   * Void und Boss ZIEHEN AB. Als „ungenutzt" gelistet forderte der Sockel den
   * Spieler auf, sich eine Strafe zu besorgen.
   */
  it('zaehlt einen Zoll nie als ungenutzt — weder neutral noch wirkend', () => {
    for (const factors of [f({}), f({ void: 0.7, bosses: 0.75 })]) {
      const ids = unusedYieldSources(factors).map((d) => d.id)
      expect(ids).not.toContain('void')
      expect(ids).not.toContain('bosses')
    }
  })

  it('traegt an jeder Herkunft der Tabelle eine Natur', () => {
    for (const def of FORGE_YIELD_SOURCES) {
      expect(['earned', 'transient', 'toll'], `${def.id}`).toContain(def.nature)
    }
    // Waeren alle `earned`, ginge die Unterscheidung lautlos verloren.
    expect(earned.length).toBeLessThan(FORGE_YIELD_SOURCES.length)
  })

  it('zaehlt einen kaputten Faktor als ungenutzt', () => {
    const rest = unusedYieldSources([
      { id: 'forge', factor: Number.NaN },
      { id: 'meeps', factor: 0 },
      { id: 'solar', factor: 2 },
    ])
    const ids = rest.map((d) => d.id)
    expect(ids).toContain('forge')
    expect(ids).toContain('meeps')
    expect(ids).not.toContain('solar')
  })

  /**
   * Die Zone erklaert im Kaertchen, WO man das jeweilige System startet. Ohne
   * Hinweis stuende dort ein Name und sonst nichts — und genau daran hing die
   * Rueckmeldung „verstehe ich nicht".
   */
  it('traegt an jeder Herkunft einen Hinweis und einen Namen', () => {
    for (const def of unusedYieldSources(f({}))) {
      expect(def.title.length, `${def.id} ohne Namen`).toBeGreaterThan(0)
      expect(def.hint.length, `${def.id} ohne Hinweis`).toBeGreaterThan(0)
    }
  })
})

/**
 * Das Band als RING.
 *
 * Geprueft wird die GEOMETRIE, nicht die Farbe: dass die Boegen samt ihren
 * Luecken nie ueber den Umfang laufen (sonst legt sich der letzte ueber den
 * ersten), dass die Geister-Zone ihren festen Anteil bekommt, und dass ein
 * winziger Anteil sichtbar bleibt statt zu verschwinden. Alle drei sind
 * Zustaende, die man im Bild kaum herstellt.
 */
describe('yieldRingArcs', () => {
  const f = (entries: Record<string, number>): CpsFactor[] =>
    FORGE_YIELD_SOURCES.map((s) => ({ id: s.id, factor: entries[s.id] ?? 1 }))

  /** Die sichtbare Bogenlaenge — der erste Wert der `stroke-dasharray`. */
  const arcLen = (dash: string) => Number(dash.split(' ')[0])

  it('gibt nichts zurueck, wenn es keine Segmente gibt', () => {
    expect(yieldRingArcs([], 0)).toEqual([])
    expect(yieldRingArcs([], 4)).toEqual([])
  })

  it('traegt je Segment genau einen Bogen, in derselben Reihenfolge', () => {
    const segs = yieldBandSegments(f({ forge: 4, meeps: 2, void: 0.8 }))
    const arcs = yieldRingArcs(segs, 0)
    expect(arcs.map((a) => a.id)).toEqual(segs.map((s) => s.id))
    expect(arcs.map((a) => a.color)).toEqual(segs.map((s) => s.color))
  })

  /**
   * Der harte Fall: elf Herkuenfte gleichzeitig. Boegen plus Luecken duerfen den
   * Umfang nicht ueberschreiten — sonst laege der letzte Bogen ueber dem ersten
   * und der Ring zeigte eine Aufteilung, die es nicht gibt.
   */
  it('bleibt mitsamt Luecken innerhalb des Umfangs', () => {
    for (const [entries, unusedCount] of [
      [{ forge: 2 }, 0],
      [{ forge: 8, meeps: 2, codex: 1.5 }, 4],
      [{ forge: 80, solar: 1.05, void: 0.88 }, 0],
      [
        {
          solar: 1.5,
          forge: 3,
          meeps: 1.4,
          codex: 1.2,
          items: 1.9,
          traits: 1.1,
          universe: 2.2,
          augments: 4,
          boons: 1.3,
          void: 0.7,
          bosses: 0.9,
        },
        0,
      ],
    ] as [Record<string, number>, number][]) {
      const arcs = yieldRingArcs(yieldBandSegments(f(entries)), unusedCount)
      const gapCount = arcs.length + (unusedCount > 0 ? 1 : 0)
      const spent = arcs.reduce((sum, a) => sum + arcLen(a.dash), 0)
      expect(spent + gapCount * FORGE_YIELD_RING_GAP).toBeLessThanOrEqual(
        FORGE_YIELD_RING_CIRCUMFERENCE + 1e-6,
      )
      // Kein Bogen darf hinter dem Kreisanfang ansetzen oder ueber ihn hinaus.
      for (const a of arcs) {
        expect(a.offset).toBeLessThanOrEqual(0)
        expect(-a.offset).toBeLessThan(FORGE_YIELD_RING_CIRCUMFERENCE)
      }
    }
  })

  /**
   * Die Geister-Zone ist KEIN Bogen, sondern der Platz, den die anderen ihr
   * lassen. Sie taucht deshalb nicht im Ergebnis auf — sie verkuerzt es.
   */
  it('staucht die Boegen um den Anteil der Geister-Zone', () => {
    const segs = yieldBandSegments(f({ forge: 4, meeps: 2 }))
    const full = yieldRingArcs(segs, 0)
    const withGhost = yieldRingArcs(segs, 5)

    expect(withGhost).toHaveLength(full.length)
    const fullLen = full.reduce((sum, a) => sum + arcLen(a.dash), 0)
    const ghostLen = withGhost.reduce((sum, a) => sum + arcLen(a.dash), 0)
    expect(ghostLen).toBeLessThan(fullLen)
    // Der Anteil ist der der Zone, bis auf den Platz der zusaetzlichen Luecke.
    const expected = fullLen * ((100 - FORGE_YIELD_UNUSED_WIDTH_PCT) / 100)
    expect(ghostLen).toBeLessThanOrEqual(expected + 1e-6)
  })

  it('markiert einen Abzug, damit er zweilagig gezeichnet werden kann', () => {
    const arcs = yieldRingArcs(yieldBandSegments(f({ forge: 4, void: 0.8 })), 0)
    expect(arcs.find((a) => a.id === 'forge')?.drains).toBe(false)
    expect(arcs.find((a) => a.id === 'void')?.drains).toBe(true)
  })

  /**
   * Ein Anteil, den die Stauchung unter die Sichtbarkeit drueckt, wird
   * angehoben. Ohne das waere er ein Strich von unter einem Pixel — der Chip
   * daneben spraeche von etwas, das im Ring nicht zu finden ist.
   */
  it('haelt jeden Bogen auf der Mindestlaenge', () => {
    const arcs = yieldRingArcs(yieldBandSegments(f({ forge: 1e6, solar: 1.001 })), 8)
    for (const a of arcs) {
      expect(arcLen(a.dash)).toBeGreaterThanOrEqual(FORGE_YIELD_RING_MIN_ARC)
    }
  })

  it('nennt im zweiten Wert der dasharray immer den vollen Umfang', () => {
    const arcs = yieldRingArcs(yieldBandSegments(f({ forge: 4, meeps: 2 })), 0)
    for (const a of arcs) {
      expect(Number(a.dash.split(' ')[1])).toBeCloseTo(FORGE_YIELD_RING_CIRCUMFERENCE, 1)
    }
  })
})
