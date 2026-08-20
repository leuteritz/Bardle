import { describe, it, expect } from 'vitest'
import {
  FORGE_NODE_DIAMETER,
  FORGE_ICON_SIZE_CROWN,
  FORGE_ICON_SIZE_BOUGH,
  FORGE_REQ_DOT_SIZE,
  FORGE_REQ_DOT_PITCH_DEG,
  FORGE_SPOTLIGHT_NODE_SCALE,
  FORGE_MIN_AIR_PX,
  FORGE_CORNER_BADGE_MIN_DIAMETER,
  FORGE_FRESH_BADGE_NODE_PCT,
} from '@/config/constants'
import { FORGE_NODES } from '@/config/progression/starForge'
import type { ForgeNodeTier } from '@/types'

/**
 * Der BEDINGUNGS-KRANZ — Punkte am Rand eines gesperrten Knotens, einer je
 * Voraussetzung.
 *
 * Er steht an der Stelle der gestrichelten Spannfäden, und die hatten nie einen
 * Wächter: dass ein Faden quer durch fremde Nachbarschaften lief, dass seine
 * Krümmungsrichtung gewürfelt war und dass er bei Standardzoom aus dem Bild
 * hinauszeigte, fiel keinem Test auf. Diese Datei ist die Gegenmassnahme.
 *
 * Geprüft wird nicht, wie es aussieht, sondern ob die Punkte irgendwo ANSTOSSEN:
 * am Glyph in der Mitte, am Schloss daneben, am Spotlight-Ring darüber, am
 * Tooltip darüber hinaus, am Nachbarknoten. Jede dieser Grenzen ist eine Zahl,
 * die woanders steht und sich unabhängig ändern kann.
 *
 * ALLE Rechnungen laufen in Bühnen-px. Der Kranz skaliert mit dem Kreis (er ist
 * Randgeometrie, kein frei schwebendes Element wie der Tooltip) — die Verhält-
 * nisse bleiben über jeden Zoom gleich, und genau deshalb genügt eine Prüfung.
 */

/** Halber Punkt, in Bühnen-px — der Überstand über die Bahn nach beiden Seiten. */
const DOT_HALF = FORGE_REQ_DOT_SIZE / 2

/**
 * Die Ringe, die überhaupt einen Kranz tragen können.
 *
 * Ein Kranz erscheint erst ab ZWEI Bedingungen, und die zweite kommt immer aus
 * `requires` — der Elternteil allein ergibt eine, und die trägt schon das
 * Schloss. Wer `requires` hat, bestimmt also die Trägerliste.
 */
const WREATH_TIERS = [...new Set(FORGE_NODES.filter((n) => n.requires?.length).map((n) => n.tier))]

/** Glyph-Kantenlänge je Träger — die Grösse, die der Kranz nicht berühren darf. */
const GLYPH_SIZE: Partial<Record<ForgeNodeTier, number>> = {
  crown: FORGE_ICON_SIZE_CROWN,
  bough: FORGE_ICON_SIZE_BOUGH,
}

/** Grösste Punktzahl an einem Knoten: Elternteil plus seine `requires`. */
const MAX_DOTS = Math.max(...FORGE_NODES.map((n) => 1 + (n.requires?.length ?? 0)))

/** Der äusserste Punkt des Fächers, samt eigenem Halbwinkel, in Grad. */
function fanReachDeg(radius: number): number {
  const outer = ((MAX_DOTS - 1) / 2) * FORGE_REQ_DOT_PITCH_DEG
  return outer + (Math.asin(DOT_HALF / radius) * 180) / Math.PI
}

describe('Star Forge — der Bedingungs-Kranz stösst nirgends an', () => {
  it('hängt nur an Ringen, deren Maße hier geprüft sind', () => {
    // Bekommt ein Ring mit anderem Durchmesser `requires`, gelten alle Zahlen
    // darunter für ihn NICHT — und sein Kranz stünde ungeprüft im Bild.
    expect(WREATH_TIERS.length).toBeGreaterThan(0)
    for (const tier of WREATH_TIERS) {
      expect(
        GLYPH_SIZE[tier],
        `Ring "${tier}" trägt requires, ist hier aber nicht geprüft`,
      ).toBeDefined()
    }
  })

  it('trägt höchstens vier Punkte', () => {
    // Der Fächer ist auf ±39° ausgelegt (drei Schritte à 26°). Ein fünfter Punkt
    // reichte auf ±52° und käme dem Schloss gefährlich nahe.
    expect(MAX_DOTS).toBeLessThanOrEqual(4)
  })

  it('trifft das Schloss bei keiner Knotenrichtung', () => {
    // `.fc-lock-badge` sitzt bei `right/bottom: -3%` mit 44 % Kantenlänge und
    // belegt damit den Sektor 105°…165° ab 12 Uhr. Der Kranz steht oben; beide
    // kleben am Kreis, die Knotenrichtung verschiebt also keinen von beiden.
    //
    // Das Kaufbar-Abzeichen (`.node-ready-badge`) steht dem Kranz NICHT im Weg,
    // obwohl es oben rechts sitzt und damit in seinen Fächer ragte: es erscheint
    // nur bei `canBuy`, der Kranz nur bei `locked`, und beides zugleich gibt es
    // nicht. Dieselbe gegenseitige Ausschliessung wie beim Schloss, nur an der
    // anderen Ecke.
    const LOCK_SECTOR_START_DEG = 105
    for (const tier of WREATH_TIERS) {
      const radius = FORGE_NODE_DIAMETER[tier] / 2
      expect(fanReachDeg(radius), `${tier}: der Fächer reicht in den Schloss-Sektor`).toBeLessThan(
        LOCK_SECTOR_START_DEG,
      )
    }
  })

  it('bleibt hinter dem Tooltip — auch im vergrösserten Spotlight', () => {
    // DIE Prüfung, die den Kranz auf dem Rand hält statt davor:
    // `.node-circle--spot` skaliert den Kreis samt Kindern, der Tooltip bei
    // `calc(100% + 10px)` skaliert NICHT mit. Wer die Punkte nach aussen
    // schöbe, liesse sie beim Zeigen gegen die eigene Karte laufen.
    const TOOLTIP_GAP_PX = 10
    for (const tier of WREATH_TIERS) {
      const radius = FORGE_NODE_DIAMETER[tier] / 2
      const outerEdge = FORGE_SPOTLIGHT_NODE_SCALE * (radius + DOT_HALF)
      expect(outerEdge, `${tier}: der Kranz schlägt beim Zeigen gegen den Tooltip`).toBeLessThan(
        radius + TOOLTIP_GAP_PX,
      )
    }
  })

  it('stösst nicht an den Spotlight-Ring', () => {
    // `.node-spot` liegt auf `inset: -4px`. Läge der Kranz darauf, verschmölzen
    // beim Zeigen zwei Marken zu einer Fläche.
    const SPOT_RING_INSET_PX = 4
    for (const tier of WREATH_TIERS) {
      const radius = FORGE_NODE_DIAMETER[tier] / 2
      expect(radius + DOT_HALF, `${tier}: Kranz und Spotlight-Ring berühren sich`).toBeLessThan(
        radius + SPOT_RING_INSET_PX,
      )
    }
  })

  it('liegt nicht auf dem Glyph', () => {
    // Das Icon ist quadratisch — massgeblich ist seine ECKE, nicht seine Kante.
    for (const tier of WREATH_TIERS) {
      const radius = FORGE_NODE_DIAMETER[tier] / 2
      const glyphCorner = (GLYPH_SIZE[tier]! / 2) * Math.SQRT2
      expect(radius - DOT_HALF, `${tier}: der Kranz liegt auf dem Glyph`).toBeGreaterThan(
        glyphCorner,
      )
    }
  })

  it('frisst die Luft zwischen zwei Knoten nicht auf', () => {
    // Der Platzierer garantiert `FORGE_MIN_AIR_PX` zwischen zwei Kreisen.
    // Zwei benachbarte Kränze zehren von beiden Seiten davon.
    expect(2 * DOT_HALF).toBeLessThan(FORGE_MIN_AIR_PX)
  })
})

/**
 * DAS KAUFBAR-ABZEICHEN — dieselbe Ecke, dieselben Maße, andere Frage.
 *
 * Es steht hier und nicht in einer eigenen Datei, weil es genau die Grenzen
 * teilt, die oben schon gezogen sind: den Schloss-Sektor gegen den Kranz und
 * die Kantenlänge des Kreises. Was seine Schwelle verschiebt, verschiebt auch
 * die Zusagen darüber.
 */
describe('Eck-Abzeichen am Knoten — wo es steht und wo nicht', () => {
  // Die Ecke oben rechts trug bis zum Umbau das BLITZ-Abzeichen („kaufbar") und
  // trägt jetzt die NEU-Marke. Der Blitz ist gefallen, weil beide sich
  // zwangsläufig trafen — frisch heisst immer auch kaufbar. Die Schwelle blieb:
  // ihre Begründung hängt an der GRÖSSE, nicht am Motiv.
  it('fällt genau auf dem kleinsten Rang aus', () => {
    // Die Schwelle muss ECHT zwischen `glimmer` und dem nächstgrösseren Rang
    // liegen; steht sie auf einer der beiden Zahlen, kippt die Zusage beim
    // nächsten Durchmesser-Eingriff still.
    const withBadge = Object.entries(FORGE_NODE_DIAMETER).filter(
      ([, d]) => d >= FORGE_CORNER_BADGE_MIN_DIAMETER,
    )
    const withoutBadge = Object.entries(FORGE_NODE_DIAMETER).filter(
      ([, d]) => d < FORGE_CORNER_BADGE_MIN_DIAMETER,
    )

    expect(withoutBadge.map(([tier]) => tier)).toEqual(['glimmer'])
    expect(withBadge.length).toBeGreaterThan(0)

    const largestWithout = Math.max(...withoutBadge.map(([, d]) => d))
    const smallestWith = Math.min(...withBadge.map(([, d]) => d))
    expect(largestWithout).toBeLessThan(FORGE_CORNER_BADGE_MIN_DIAMETER)
    expect(smallestWith).toBeGreaterThan(FORGE_CORNER_BADGE_MIN_DIAMETER)
  })

  it('trägt auf jedem Rang, der es zeigt, eine lesbare ZIFFER', () => {
    // Die Marke misst `FORGE_FRESH_BADGE_NODE_PCT` der Kreiskante, ihre Ziffer
    // 62 % davon (`ShopReadyBadge`: `font-size: calc(var(--d) * 0.62)`). Unter
    // acht Pixeln ist eine Ziffer kein Zeichen mehr, sondern ein Fleck —
    // Performance-Regel 7. Die Schwelle oben muss diesen Boden für jeden
    // tragenden Rang halten.
    //
    // Hier stand dieselbe Rechnung für das Blitz-GLYPH (44 % × 66 %). Sie ist
    // mit ihm gefallen, die Zusage nicht.
    const MIN_READABLE_DIGIT_PX = 8
    for (const [tier, diameter] of Object.entries(FORGE_NODE_DIAMETER)) {
      if (diameter < FORGE_CORNER_BADGE_MIN_DIAMETER) continue
      expect(
        (diameter * FORGE_FRESH_BADGE_NODE_PCT) / 100 * 0.62,
        `${tier}: die Ziffer der NEU-Marke zerfällt`,
      ).toBeGreaterThan(MIN_READABLE_DIGIT_PX)
    }
  })
})
