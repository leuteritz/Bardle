import { describe, it, expect } from 'vitest'
import { voyageBerthsOf, voyageMarkerSizeFor } from '@/utils/game/voyageSites'
import { galaxyFitBox } from '@/utils/fx/galaxyPlate'
import {
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_SITE_HIT_MAX,
  VOYAGE_SITE_HIT_MIN,
  VOYAGE_SITE_HIT_GAP,
  VOYAGE_SITE_MAX_SPAN_FRACTION,
  VOYAGE_SITE_PLATE_INSET,
  VOYAGE_SITE_SLOTS,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { StarAttemptResult } from '@/types'

/**
 * Die Markengrösse ist keine Konstante mehr, sondern eine Ableitung aus der
 * ENGE der gerade gesetzten Häfen. Das kann auf zwei Arten still kaputtgehen:
 * die Marke wird grösser als der Abstand (zwei Klickflächen decken sich, die
 * Karte hört auf zu funktionieren), oder sie fällt unter den bisherigen festen
 * Wert (die dichteste Galaxie stünde schlechter da als vorher).
 *
 * Beides fängt hier niemand sonst: `voyagesAtlasLayout.spec.ts` bindet den
 * BODEN an die Layoutbreiten, aber nicht die Ableitung darüber.
 */

function record(galaxy: number, attempts: number, seed = 4711): CompletedGalaxyRecord {
  return {
    galaxy,
    mapSeed: seed + galaxy * 13,
    themeIndex: galaxy % 20,
    attemptResults: Array.from<unknown, StarAttemptResult>({ length: attempts }, (_, i) =>
      i % 5 === 0 ? 'failed' : 'rescued',
    ),
    durationSeconds: 600,
  }
}

/** Die Full-HD-Bühne aus `voyagesAtlasLayout.spec.ts` — 648 Zone, 609.6 hoch. */
const FHD_BOX = galaxyFitBox(648 - VOYAGE_MAP_GUTTER_PX, 609.6)
/** Dieselbe Bühne im Kartenfokus: beide Ränder gefaltet. */
const FHD_FOCUS_BOX = galaxyFitBox(1140 - VOYAGE_MAP_GUTTER_PX, 609.6)

describe('voyageMarkerSizeFor — Boden und Deckel', () => {
  it('fällt nie unter den bisherigen festen Wert', () => {
    for (const attempts of [3, 12, 24, 36, 45]) {
      const sites = voyageBerthsOf(record(7, attempts))
      const size = voyageMarkerSizeFor(sites, FHD_BOX)
      expect(size.hit).toBeGreaterThanOrEqual(VOYAGE_SITE_HIT_MIN)
    }
  })

  it('überschreitet den Deckel nie', () => {
    const size = voyageMarkerSizeFor([{ x: 0.5, y: 0.5 }], { w: 4000, h: 4000 })
    expect(size.hit).toBeLessThanOrEqual(VOYAGE_SITE_HIT_MAX)
  })

  it('läuft bei einem einzigen Hafen nicht gegen Infinity', () => {
    const size = voyageMarkerSizeFor([{ x: 0.5, y: 0.5 }], FHD_BOX)
    expect(Number.isFinite(size.hit)).toBe(true)
    expect(size.hit).toBeLessThanOrEqual(FHD_BOX.h * VOYAGE_SITE_MAX_SPAN_FRACTION)
  })

  it('liefert auch ohne Häfen einen brauchbaren Wert', () => {
    const size = voyageMarkerSizeFor([], FHD_BOX)
    expect(size.hit).toBeGreaterThanOrEqual(VOYAGE_SITE_HIT_MIN)
    expect(size.plate).toBeGreaterThan(0)
  })

  it('hält die Platte INNERHALB der Klickfläche', () => {
    for (const box of [FHD_BOX, FHD_FOCUS_BOX, { w: 2140, h: 1561 }]) {
      const size = voyageMarkerSizeFor(voyageBerthsOf(record(3, 20)), box)
      expect(size.plate).toBe(size.hit - VOYAGE_SITE_PLATE_INSET)
      expect(size.plate).toBeLessThan(size.hit)
      expect(size.dot).toBeLessThan(size.plate)
    }
  })
})

describe('voyageMarkerSizeFor — zwei Nachbarn decken sich nie', () => {
  /**
   * Die tragende Zusicherung. Gerechnet über die Galaxien und Sternzahlen, aus
   * denen auch VOYAGE_BERTH_MIN_SEPARATION gemessen wurde — und gegen den
   * ECHTEN kleinsten Abstand, nicht gegen die konservative Zusage.
   *
   * In der MAXIMUMSNORM. Zwei achsenparallele Quadrate decken sich, sobald
   * BEIDE Achsabstände unter die Seitenlänge fallen; euklidisch gerechnet ging
   * genau das im Browser durch (2K, zehn Häfen: 116 px Mittelpunktabstand bei
   * dx 80 und dy 84, Seite 96).
   */
  it.each([
    ['Full HD', FHD_BOX],
    ['Full HD im Fokus', FHD_FOCUS_BOX],
    ['2K', galaxyFitBox(988 - VOYAGE_MAP_GUTTER_PX, 888)],
    ['4K', galaxyFitBox(2196 - VOYAGE_MAP_GUTTER_PX, 1597.2)],
  ])('%s', (_label, box) => {
    for (let galaxy = 1; galaxy <= 20; galaxy++) {
      for (const attempts of [3, 8, 14, 20, 26, 32, 36, 41, 45]) {
        const sites = voyageBerthsOf(record(galaxy, attempts))
        expect(sites.length).toBe(VOYAGE_SITE_SLOTS)
        const hit = voyageMarkerSizeFor(sites, box).hit

        let closest = Number.POSITIVE_INFINITY
        for (let i = 0; i < sites.length; i++) {
          for (let j = i + 1; j < sites.length; j++) {
            const dx = Math.abs(sites[i].x - sites[j].x) * box.w
            const dy = Math.abs(sites[i].y - sites[j].y) * box.h
            closest = Math.min(closest, Math.max(dx, dy))
          }
        }
        // Ohne Ausweg über den Boden: die Marke bleibt IMMER unter dem echten
        // Abstand. Bräuchte es hier ein `Math.max(VOYAGE_SITE_HIT_MIN, …)`,
        // wäre der Boden selbst zu hoch gewählt und zwei Häfen deckten sich.
        expect(hit).toBeLessThanOrEqual(closest)
      }
    }
  })
})

describe('voyageMarkerSizeFor — monoton in der Enge', () => {
  it('wird nie grösser, wenn ein Hafen dazukommt', () => {
    const all = voyageBerthsOf(record(9, 24))
    let last = Number.POSITIVE_INFINITY
    for (let n = 1; n <= all.length; n++) {
      const hit = voyageMarkerSizeFor(all.slice(0, n), FHD_FOCUS_BOX).hit
      expect(hit).toBeLessThanOrEqual(last)
      last = hit
    }
  })

  it('gibt der ruhigen Galaxie deutlich mehr als der engen', () => {
    // Gestellte Punkte statt echter Häfen: der Punkt ist die ABLEITUNG, und die
    // ist nur an gesetzten Abständen ablesbar. Mit echten Häfen bindet auf
    // Full HD in beiden Fällen der Deckel — die Karte ist dort schlicht gross
    // genug für zehn Plätze, und genau das war der Befund, der diese Ableitung
    // ausgelöst hat.
    const cap = Math.round(
      Math.min(
        VOYAGE_SITE_HIT_MAX,
        FHD_BOX.h * VOYAGE_SITE_MAX_SPAN_FRACTION - VOYAGE_SITE_HIT_GAP,
      ),
    )

    const far = voyageMarkerSizeFor(
      [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.8 },
      ],
      FHD_BOX,
    ).hit
    expect(far).toBe(cap)

    const near = voyageMarkerSizeFor(
      [
        { x: 0.5, y: 0.3 },
        { x: 0.5, y: 0.38 },
      ],
      FHD_BOX,
    ).hit
    expect(near).toBe(Math.round(0.08 * FHD_BOX.h - VOYAGE_SITE_HIT_GAP))
    expect(far).toBeGreaterThan(near * 1.4)
  })
})
