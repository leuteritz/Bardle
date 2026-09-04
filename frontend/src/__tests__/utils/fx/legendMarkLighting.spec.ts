import { describe, it, expect } from 'vitest'
import {
  landmarkMatchesLegend,
  isLandfallLandmark,
  roundLandmarkRadius,
  LANDFALL_KINDS,
  type LandmarkKind,
} from '@/utils/fx/galaxyLandmarks'
import { landfallMarkRadius, incidentMarkRadiusAt } from '@/utils/fx/galaxyPlate'
import { incidentMarkRadius } from '@/utils/game/galaxyIncidents'
import {
  GALAXY_INCIDENT_MARK_R,
  GALAXY_INCIDENT_RANK_SCALE,
  LANDFALL_MARK_R,
  VOYAGE_MAP_LEGEND_ROWS,
} from '@/config/constants'

/**
 * Die Formlegende leuchtet eine ganze Markenart auf der Karte aus. Zwei Dinge
 * müssen dafür stimmen, und beide sind still, wenn sie es nicht tun: WELCHE
 * Marken gemeint sind, und WIE GROSS ihr Ring ist.
 */
describe('landmarkMatchesLegend — welche Marken eine Legendenzeile meint', () => {
  it('lässt die Ortszeile ALLE sechs Orte ansprechen', () => {
    // `landfall-reef` steht stellvertretend: sechs Silhouetten wären bei 4,4 px
    // nicht zu trennen, deshalb führt die Legende sie als EINE Zeile. Ein
    // blosser Gleichheitsvergleich liesse beim Zeigen auf „Landfall" fünf von
    // sechs Orten dunkel — und das sähe nach einem Fehler in der Karte aus,
    // nicht nach einem in der Zuordnung.
    for (const kind of LANDFALL_KINDS) {
      expect(landmarkMatchesLegend(kind, 'landfall-reef')).toBe(true)
    }
    expect(LANDFALL_KINDS.length).toBe(6)
  })

  it('trennt die vier übrigen Zeilen sauber voneinander', () => {
    const einzeln: LandmarkKind[] = ['star-freed', 'star-lost', 'void-impact', 'drifter-trace']
    for (const a of einzeln) {
      for (const b of einzeln) {
        expect(landmarkMatchesLegend(a, b)).toBe(a === b)
      }
      // Kein Ort fällt in eine der vier, und keine der vier in die Ortszeile.
      expect(landmarkMatchesLegend(a, 'landfall-reef')).toBe(false)
      expect(landmarkMatchesLegend('landfall-cairn', a)).toBe(false)
    }
  })

  it('spricht jede Zeile der Legende auf mindestens eine Marke an', () => {
    // Eine Zeile, die nichts trifft, wäre eine Lesehilfe, die beim Zeigen
    // nichts tut — und niemand sähe den Unterschied zu „hier lag nichts".
    const alle: LandmarkKind[] = [
      'star-freed',
      'star-lost',
      'void-impact',
      'drifter-trace',
      ...LANDFALL_KINDS,
    ]
    for (const row of VOYAGE_MAP_LEGEND_ROWS) {
      expect(alle.some((k) => landmarkMatchesLegend(k, row.kind))).toBe(true)
    }
  })

  it('kennt genau eine Zeile, die für mehr als eine Form steht', () => {
    const sammler = VOYAGE_MAP_LEGEND_ROWS.filter((r) => isLandfallLandmark(r.kind))
    expect(sammler.length).toBe(1)
  })
})

/**
 * Beide Radien haben seit dem Legenden-Licht einen ZWEITEN Leser: `paintGalaxy`
 * malt damit, und der Ring des Knotens legt sich darauf. Aus der Fangfläche
 * zurückgerechnet säße er daneben — dieselbe Falle, die
 * `starMarkRadius.spec.ts` für den Stern ausschreibt.
 */
describe('die gemalten Radien von Ort und Ereignis', () => {
  it('rechnen dasselbe wie die Malfunktion', () => {
    for (const hk of [0.3, 0.55, 1.0, 1.547, 2.4]) {
      expect(landfallMarkRadius(hk)).toBe(roundLandmarkRadius(LANDFALL_MARK_R * hk))
      for (let rank = 0; rank < GALAXY_INCIDENT_RANK_SCALE.length; rank++) {
        expect(incidentMarkRadiusAt(rank, hk)).toBe(
          roundLandmarkRadius(incidentMarkRadius(rank, GALAXY_INCIDENT_MARK_R * hk)),
        )
      }
    }
  })

  it('rasten auf halbe Pixel und halten den Boden 2', () => {
    for (const hk of [0.01, 0.3, 0.9, 1.547, 2.4]) {
      const r = landfallMarkRadius(hk)
      expect(r * 2).toBe(Math.round(r * 2))
      expect(r).toBeGreaterThanOrEqual(2)
      const ri = incidentMarkRadiusAt(2, hk)
      expect(ri * 2).toBe(Math.round(ri * 2))
      expect(ri).toBeGreaterThanOrEqual(2)
    }
  })

  it('lassen den Rang des Ereignisses in die Grösse durch', () => {
    // Der Ring muss mitwachsen: ein abyssaler Einschlag ist gemalt grösser als
    // ein geringer, und ein Ring in Einheitsgrösse säße beim einen zu eng, beim
    // anderen zu weit.
    const hk = 1.547
    expect(incidentMarkRadiusAt(2, hk)).toBeGreaterThan(incidentMarkRadiusAt(0, hk))
  })

  it('lassen sich NICHT aus der Fangfläche zurückrechnen', () => {
    // `landfallHit` und `incidentHit` haben beide einen Boden (16) und den
    // Faktor 2,4. Auf kleinen Bühnen klemmt der Boden, und das Verhältnis
    // bricht — genau dort säße ein zurückgerechneter Ring am weitesten daneben.
    const klein = 0.5
    const hit = Math.max(16, Math.round(LANDFALL_MARK_R * klein * 2.4))
    expect(hit).toBe(16)
    expect(hit / 2.4).toBeGreaterThan(landfallMarkRadius(klein))
  })
})
