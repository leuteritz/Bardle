import { describe, it, expect } from 'vitest'
import {
  BOTTOM_BAR_SIDE_W,
  CHAMPION_ART_MD_MAX_EDGE,
  CHAMPION_ART_SM_MAX_EDGE,
  GALAXY_STARS_MAX,
  VOYAGE_MANIFEST_LOSS_SEATS,
  VOYAGE_MANIFEST_MAX_SHARE,
  VOYAGE_MANIFEST_SEATS_MAX,
  VOYAGE_MANIFEST_SEATS_MIN,
  VOYAGE_MANIFEST_TILE_MAX,
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_MAP_INSET_PX,
  VOYAGE_MAP_MIN_WIDTH,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_RAIL_AUTOFOLD_WIDTH,
  VOYAGE_RAIL_HANDLE_PX,
  VOYAGE_RAIL_ZONE_W,
} from '@/config/constants'
import { galaxyFitBox } from '@/utils/fx/galaxyPlate'
import { voyageManifestRow } from '@/utils/ui/voyageManifestRow'

/**
 * Die Manifestreihe oben links auf der Kartenbuehne.
 *
 * Sie ist der ZWILLING des Datenbands und verhaelt sich doch anders: das Band
 * schrumpft die Fit-Box, die Reihe UEBERLAGERT sie. Was sie zu gross macht,
 * meldet deshalb kein `scrollHeight` und kein Layout — sie deckt schlicht mehr
 * Karte zu, und auf der Aufloesung des Entwicklers faellt das nicht auf.
 *
 * Zwei Zusicherungen tragen die Datei, und beide sind unsichtbar, wenn sie
 * brechen:
 *
 * 1. **Die Kachel bleibt auf der `md`-Kunststufe.** `STAR_MANIFEST_ART_SIZE`
 *    ist fest verdrahtet, weil die Kachel garantiert ins Band 35-110 faellt.
 *    Reisst jemand `TILE_MAX` hoch, ist die Stufe zu klein gewaehlt und der
 *    Reiter laedt dieselben Gesichter ein ZWEITES Mal vom Server — im Bild
 *    sieht man davon nichts.
 * 2. **Full HD traegt eine volle Galaxie.** Bei `MAX_SHARE` 0,50 fielen dort
 *    sechs Kacheln heraus, und ab Galaxie 5 stuende dauerhaft ein „+1 more"
 *    neben einer Reihe, die Platz gehabt haette. 0,52 ist deshalb keine
 *    Geschmacksfrage, sondern das Ergebnis dieser Zusicherung.
 *
 * Gerechnet wird gegen `voyageManifestRow()` selbst — die Formel steht EINMAL.
 * Eine Kopie hier braeche, wenn jemand vergisst sie nachzuziehen, statt wenn
 * jemand eine Zahl anhebt.
 */

/** `--bp-gap` von .rp-wrapper, beide Seiten. Wie in `voyagesAtlasLayout`. */
const MODAL_GAP = 10

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)
const teamUiScale = (w: number, h: number) => clamp(0.62, Math.min(w / 1920, h / 1080), 1)

function atlasWidth(vw: number, vh: number): number {
  const panel = BOTTOM_BAR_SIDE_W * hudScale(vw, vh)
  return (vw - 2 * (panel + MODAL_GAP)) / teamUiScale(vw, vh)
}

/** Hoehe der Buehne je Aufloesung — GEMESSEN, uebernommen aus
 *  `voyagesAtlasLayout.spec.ts`. Beide muessen dieselbe Tabelle fuehren. */
const STAGE_HEIGHT: Record<number, number> = {
  1080: 670.6,
  1200: 771.4,
  1440: 949,
  2160: 1658.2,
}

/** Breite der KARTE (`.egm`) — Zone minus die Rinne der Buehne. */
function stageW(vw: number, vh: number, folded = false): number {
  const zone = atlasWidth(vw, vh) - (folded ? VOYAGE_RAIL_HANDLE_PX : VOYAGE_RAIL_ZONE_W)
  return zone - VOYAGE_MAP_GUTTER_PX
}

function stageH(vh: number): number {
  return STAGE_HEIGHT[vh] - VOYAGE_MAP_GUTTER_PX
}

const DESKTOPS: Array<[string, number, number]> = [
  ['Full HD 1920x1080', 1920, 1080],
  ['WUXGA 1920x1200', 1920, 1200],
  ['2K/QHD 2560x1440', 2560, 1440],
  ['4K 3840x2160', 3840, 2160],
]

/** Der harte Boden der Karte und die Kante, an der sich die Liste selbst
 *  faltet — die beiden schmalsten Faelle, die es ueberhaupt gibt. */
const NARROW = [
  VOYAGE_MAP_MIN_WIDTH - VOYAGE_MAP_GUTTER_PX,
  VOYAGE_RAIL_AUTOFOLD_WIDTH - VOYAGE_RAIL_ZONE_W - VOYAGE_MAP_GUTTER_PX,
]

const ALL_WIDTHS = () => [
  ...DESKTOPS.flatMap(([, vw, vh]) => [stageW(vw, vh), stageW(vw, vh, true)]),
  ...NARROW,
]

describe('voyage star manifest fit', () => {
  it('haelt die Kachel auf der md-Kunststufe', () => {
    expect(VOYAGE_MANIFEST_TILE_MAX).toBeLessThanOrEqual(CHAMPION_ART_MD_MAX_EDGE)
    for (const w of ALL_WIDTHS()) {
      const { tile } = voyageManifestRow(w)
      expect(tile).toBeGreaterThan(CHAMPION_ART_SM_MAX_EDGE)
      expect(tile).toBeLessThanOrEqual(CHAMPION_ART_MD_MAX_EDGE)
    }
  })

  it('frisst nie mehr Buehne als ihren Anteil — auch nicht mit Ueberlaufchip', () => {
    // `total` deckt beide Faelle ab: knapp (kein Chip) und weit darueber (Chip
    // im Fluss). Im Browser gemessen kostete der Chip ungebudgetiert 47,8 px
    // und riss den Anteil auf Full HD von 0,506 auf 0,557.
    for (const w of ALL_WIDTHS()) {
      for (const total of [1, GALAXY_STARS_MAX, VOYAGE_MANIFEST_SEATS_MAX, 40]) {
        expect(voyageManifestRow(w, total).width).toBeLessThanOrEqual(
          w * VOYAGE_MANIFEST_MAX_SHARE,
        )
      }
    }
  })

  it('zaehlt jeden Sitz — gezeigt oder im Chip', () => {
    for (const w of ALL_WIDTHS()) {
      for (const total of [1, 5, GALAXY_STARS_MAX, 40]) {
        const { seats, hidden } = voyageManifestRow(w, total)
        expect(hidden).toBeGreaterThanOrEqual(0)
        expect(Math.min(seats, total) + hidden).toBe(total)
      }
    }
  })

  it.each(DESKTOPS)('%s traegt eine volle Galaxie ohne Ueberlauf', (_label, vw, vh) => {
    // Sieben Sterne, keiner verloren: das ist der Fall, der VOLLSTAENDIG
    // dastehen muss — sonst stuende ab Galaxie 5 dauerhaft ein „+1 more"
    // neben einer Reihe, die Platz gehabt haette.
    const { seats, hidden } = voyageManifestRow(stageW(vw, vh), GALAXY_STARS_MAX)
    expect(seats).toBeGreaterThanOrEqual(GALAXY_STARS_MAX)
    expect(hidden).toBe(0)
  })

  it('laesst den Sitzboden nur im Ueberlauf greifen', () => {
    for (const w of NARROW) {
      // Die reine KAPAZITAET (ohne Ueberlaufchip) liegt auch am schmalsten
      // zulaessigen Punkt ueber dem Boden — er ist eine Zusicherung, keine
      // Betriebsgroesse.
      expect(voyageManifestRow(w).seats).toBeGreaterThan(VOYAGE_MANIFEST_SEATS_MIN)
      // Mit Ueberlauf kostet der Chip eine Zelle, und DANN ist der Boden das,
      // was uebrig bleibt — nie weniger.
      expect(voyageManifestRow(w, 40).seats).toBeGreaterThanOrEqual(VOYAGE_MANIFEST_SEATS_MIN)
    }
  })

  it.each(DESKTOPS)('%s bleibt oberhalb der Mittellinie der Scheibe', (_label, vw, vh) => {
    for (const folded of [false, true]) {
      const w = stageW(vw, vh, folded)
      const box = galaxyFitBox(w, stageH(vh) - VOYAGE_MAP_STATS_BAND_H, VOYAGE_MAP_INSET_PX)
      // Ab der Mittellinie liegen Kern, Arme und jede geflogene Route.
      expect(voyageManifestRow(w).height).toBeLessThanOrEqual(
        box.y + box.h / 2 - VOYAGE_MAP_INSET_PX,
      )
    }
  })

  it('bindet den Sitzdeckel an die Sternregel statt ihn zu waehlen', () => {
    expect(VOYAGE_MANIFEST_SEATS_MAX).toBe(GALAXY_STARS_MAX + VOYAGE_MANIFEST_LOSS_SEATS)
  })

  it('laesst den Scrim immer groesser sein als das, was er traegt', () => {
    for (const w of ALL_WIDTHS()) {
      const row = voyageManifestRow(w)
      expect(row.scrimW).toBeGreaterThan(row.width)
      expect(row.scrimH).toBeGreaterThan(row.height)
    }
  })
})
