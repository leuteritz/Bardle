import { describe, it, expect } from 'vitest'
import {
  HEADER_SIDE_GUTTER_TOTAL,
  HEADER_MIN_WIDTH,
  HEADER_MAX_WIDTH,
  HEADER_PAGE_INSET,
} from '@/config/constants'

/**
 * Der Wächter über die Breite des Headers.
 *
 * Der Header ist ein REST: `HEADER_SIDE_GUTTER_TOTAL` geht an die beiden
 * HUD-Gassen (Kartenspalte links, Eventlog rechts), er bekommt, was übrig
 * bleibt. Das macht seine Breite zu einer Zusage an zwei Seiten — nach außen
 * an die Gassen (`eventLogLayout.spec.ts` rechnet von dort her), nach innen an
 * seine eigenen drei Zonen, die sich EIN Budget teilen.
 *
 * Alle Zahlen hier sind die `clamp()`-Ausdrücke aus dem CSS, nachgerechnet.
 * Das CSS schreibt die Werte, diese Spec ist ihr Wächter: driftet eine Zahl,
 * merkt es sonst niemand, bis ein Block beschnitten im Bild steht — die
 * Flex-Zeilen des Headers tragen `overflow: hidden` und melden nichts.
 */

const clamp = (min: number, val: number, max: number) => Math.min(Math.max(val, min), max)
const vw = (viewportW: number, factor: number) => (viewportW * factor) / 100

// ── App.vue :root ───────────────────────────────────────────────────────────

const headerWidth = (W: number) => clamp(HEADER_MIN_WIDTH, W - HEADER_SIDE_GUTTER_TOTAL, HEADER_MAX_WIDTH)
const headerHeight = (W: number) => clamp(62, 30 + vw(W, 2.9), 115)

/** Die freie Gasse, gegen den `px-4`-Container des Seitenlayouts gerechnet. */
const gutter = (W: number) =>
  HEADER_PAGE_INSET + (W - 2 * HEADER_PAGE_INSET - headerWidth(W)) / 2

// ── AppHeaderComponent.vue ──────────────────────────────────────────────────

const cornerGap = (W: number) => clamp(7, vw(W, 0.42), 13)
/** Mittlere Grid-Spalte UND `.header-center` — eine Zahl, zwei Regeln. */
const centerColumn = (W: number) => clamp(90, vw(W, 11.5), 270)
const sideColumn = (W: number) => (headerWidth(W) - centerColumn(W)) / 2
/** `.header-side--left { padding-right }` = `--right { padding-left }`. */
const innerPad = (W: number) => clamp(6, vw(W, 0.42), 16)
const sideContent = (W: number) => sideColumn(W) - cornerGap(W) - innerPad(W)
/** `.header-divider`: 2px Strich plus 3px Margin je Seite. */
const DIVIDER = 8
/** Ecktaste (`--gem-plate-w`) — Shop links, Tree rechts, dieselbe Formel. */
const gemPlate = (W: number) =>
  Math.min(headerHeight(W) - 2 * cornerGap(W), clamp(48, vw(W, 2.5), 72))

// ── Rechte Zeile: SunPhase | Universe-Block | Divider | Tree ────────────────

const sunPhase = (W: number) => clamp(104, vw(W, 5.4), 118)
const rightGap = (W: number) => clamp(4, vw(W, 0.26), 10)
/** Was dem Universe-Block bleibt — er ist das einzige `flex: 1` der Zeile. */
const portalWrap = (W: number) =>
  sideContent(W) - sunPhase(W) - 3 * rightGap(W) - DIVIDER - gemPlate(W)

/** `.uni-stats` teilt sich 1 : 0.8 : 1, die Galaxy-Kachel steht in der Mitte. */
const GALAXY_SHARE = 0.8 / 2.8
const uniStatsGap = (W: number) => clamp(5, vw(W, 0.3), 6)
const galaxyTile = (W: number) => GALAXY_SHARE * (portalWrap(W) - 2 * uniStatsGap(W))
/** Ihr Boden: Icon + 3,1 Abstand + zwei Ziffern (30,5 auf Full HD). */
const tileIcon = (W: number) => Math.min(headerHeight(W) * 0.26, 26)
const galaxyFloor = (W: number) => tileIcon(W) + 3.1 + 30.5

// ── Linke Zeile: Shop | Divider | Materialgitter ────────────────────────────

/** Tailwind `gap-3` zwischen den drei Kindern. */
const LEFT_GAP = 12
const matGrid = (W: number) => sideContent(W) - gemPlate(W) - 2 * LEFT_GAP - DIVIDER
const matColGap = (W: number) => clamp(4, vw(W, 0.31), 8)
const matColumn = (W: number) => (matGrid(W) - 4 * matColGap(W)) / 5
const matIcon = (W: number) => Math.min(headerHeight(W) * 0.28, 30)
const matCellGap = (W: number) => clamp(2, vw(W, 0.16), 6)
const matText = (W: number) => matColumn(W) - matIcon(W) - matCellGap(W)
const matFont = (W: number) => Math.min(headerHeight(W) * 0.165, 17)
/** Wie viele Ziffern eine Materialzahl trägt, bevor die Ellipse greift. */
const matChars = (W: number) => matText(W) / (matFont(W) * 0.55)

describe('header width — the rest after the two gutters', () => {
  it('hits the reference widths the CSS assumes', () => {
    expect(headerWidth(1920)).toBe(1112)
    expect(headerWidth(1850)).toBe(HEADER_MIN_WIDTH)
    expect(headerWidth(2560)).toBe(HEADER_MAX_WIDTH)
    expect(headerWidth(3840)).toBe(HEADER_MAX_WIDTH)
    // Full HD bei 125 % Skalierung: der Header steht auf seinem Boden.
    expect(headerWidth(1536)).toBe(HEADER_MIN_WIDTH)
  })

  it('leaves the gutter that carries both HUD columns', () => {
    expect(Math.round(gutter(1920))).toBe(404)
    expect(Math.round(gutter(2560))).toBe(580)
    expect(Math.round(gutter(3840))).toBe(1220)
  })

  /**
   * Zwischen 1856 und 2208 px wächst der Header mit dem Fenster, die Gasse
   * bleibt konstant. Genau das ist der Zweck der Subtraktion: die Bühne
   * gewinnt dort nichts und verliert nichts.
   */
  it('holds the gutter steady while the header grows', () => {
    for (const W of [1856, 1920, 2100, 2200]) {
      expect(Math.round(gutter(W)), `${W}px`).toBe(404)
    }
  })
})

describe('header width — the three zones share one budget', () => {
  it('never over-constrains the right flex row', () => {
    for (const W of [1536, 1920, 2560, 3840]) {
      const need = sunPhase(W) + 3 * rightGap(W) + DIVIDER + gemPlate(W) + portalWrap(W)
      expect(need, `${W}px`).toBeLessThanOrEqual(sideContent(W) + 0.01)
      // Der Universe-Block ist das Nachgebende — unter 250 wird die Rescue-Bar
      // darunter zur schmalsten Zeile des Headers.
      expect(portalWrap(W), `${W}px`).toBeGreaterThanOrEqual(250)
    }
  })

  it('keeps the galaxy tile above its floor', () => {
    for (const W of [1536, 1920, 2560, 3840]) {
      expect(galaxyTile(W), `${W}px`).toBeGreaterThan(galaxyFloor(W))
    }
  })

  /**
   * Die Zusage der Materialleiste: sie schrumpft, aber die Zelle und ihre
   * Schrift schrumpfen GEMEINSAM — es geht keine Ziffer verloren. Vor der
   * Verschmälerung trug eine Zelle 4,94 Zeichen auf Full HD und 4,66 auf 4K;
   * dort war sie schon immer am engsten, weil die Schrift bei 17px deckelt,
   * die Spalte aber nicht mehr wächst.
   */
  it('loses no digit from a material count', () => {
    for (const W of [1536, 1920, 2560, 3840]) {
      expect(matChars(W), `${W}px`).toBeGreaterThanOrEqual(4.6)
    }
  })

  it('keeps both corner plates on one formula', () => {
    // Der corner-gap ist geschrumpft; ohne den fluiden Cap wüchse die Platte
    // mit ihm, statt der Materialleiste Breite zu lassen.
    expect(gemPlate(1920)).toBe(48)
    expect(gemPlate(2560)).toBe(64)
    expect(gemPlate(3840)).toBe(72)
  })
})
