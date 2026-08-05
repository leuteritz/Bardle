import { describe, it, expect } from 'vitest'
import { centerArcSideWidth, type HeaderCenterArc } from '@/utils/orbit/geometry'

// Maße in der Größenordnung des echten Headers auf Full HD: Das Chimes-Panel
// ist ~210 px breit, ~100 px hoch und ragt ~50 px unter die Header-Kante.
const ARC: HeaderCenterArc = { cx: 700, rx: 105, ry: 100, topOffset: 50 }

/**
 * Gegenprobe zur Formel: Welchen horizontalen Abstand von der Achse hat der
 * gezeichnete Bogen auf Tiefe `y`? Ergibt sich direkt aus der Ellipsengleichung
 * (x/rx)² + (y/ry)² = 1 mit Mittelpunkt auf der Panel-Oberkante.
 */
function drawnEdgeFromAxis(arc: HeaderCenterArc, y: number): number {
  const dy = arc.topOffset + y
  return arc.rx * Math.sqrt(1 - (dy / arc.ry) ** 2)
}

describe('centerArcSideWidth', () => {
  it('endet an der Oberkante der Bars auf der gezeichneten Bogenkante', () => {
    expect(centerArcSideWidth(ARC, 0)).toBeCloseTo(ARC.cx - drawnEdgeFromAxis(ARC, 0), 6)
  })

  it('trifft die Bogenkante auf jeder Tiefe innerhalb des Ovals', () => {
    // Die Balken decken die ~50 px vom Header-Rand bis zum unteren Scheitel ab.
    for (let y = 0; y <= ARC.ry - ARC.topOffset; y += 0.5) {
      expect(centerArcSideWidth(ARC, y)).toBeCloseTo(ARC.cx - drawnEdgeFromAxis(ARC, y), 6)
    }
  })

  it('läuft mit wachsender Tiefe monoton weiter nach innen', () => {
    let prev = -Infinity
    for (let y = 0; y <= 120; y += 0.5) {
      const w = centerArcSideWidth(ARC, y)
      expect(w).toBeGreaterThanOrEqual(prev)
      prev = w
    }
  })

  it('reicht unterhalb des Ovals genau bis zur Mitte — und nie darüber hinaus', () => {
    const atApex = centerArcSideWidth(ARC, ARC.ry - ARC.topOffset)
    expect(atApex).toBeCloseTo(ARC.cx, 6)
    // Jede tiefere Zeile bleibt dort: Zwei Seiten à cx füllen den Header exakt,
    // ein größerer Wert ließe die Seiten übereinander laufen.
    for (const y of [ARC.ry - ARC.topOffset + 1, 200, 5000]) {
      expect(centerArcSideWidth(ARC, y)).toBe(ARC.cx)
    }
  })

  it('geht am Übergang zum Bereich unterhalb des Ovals stetig über', () => {
    const apexY = ARC.ry - ARC.topOffset
    const before = centerArcSideWidth(ARC, apexY - 0.01)
    expect(ARC.cx - before).toBeLessThan(1.5)
  })

  it('liefert bei entartetem Oval die Mitte statt NaN', () => {
    expect(centerArcSideWidth({ cx: 700, rx: 0, ry: 0, topOffset: 0 }, 10)).toBe(700)
    expect(centerArcSideWidth({ cx: 700, rx: 105, ry: 0, topOffset: 0 }, 10)).toBe(700)
  })

  it('gibt oberhalb des Ovals die volle Halbachse frei', () => {
    // Kann im Header nicht vorkommen (topOffset ≥ 0), darf aber nicht ins
    // Negative kippen und die Balken über die Zeile hinaus verlängern.
    const above: HeaderCenterArc = { ...ARC, topOffset: -10 }
    expect(centerArcSideWidth(above, 0)).toBe(ARC.cx - ARC.rx)
  })
})
