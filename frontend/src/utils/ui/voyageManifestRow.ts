/**
 * Die Masse der Manifestreihe, aus der gemessenen Buehne.
 *
 * EINE Quelle mit ZWEI Lesern — `ExpeditionStarManifest.vue` und
 * `voyageManifestFit.spec.ts`. Die Spec darf die Formel nicht zweitschreiben:
 * sie soll brechen, wenn jemand eine Zahl anhebt, nicht wenn jemand eine Kopie
 * vergisst nachzuziehen.
 *
 * Alles haengt an der KACHEL, die Kachel an der Breite — Muster
 * `voyageMarkerSizeFor`. Der Anteil, den die Reihe von der Buehne nimmt, bleibt
 * damit ueber alle Aufloesungen derselbe.
 */
import {
  VOYAGE_MANIFEST_CELL_RATIO,
  VOYAGE_MANIFEST_GAP_RATIO,
  VOYAGE_MANIFEST_HEAD_MAX,
  VOYAGE_MANIFEST_HEAD_RATIO,
  VOYAGE_MANIFEST_LINE,
  VOYAGE_MANIFEST_MAX_SHARE,
  VOYAGE_MANIFEST_NAME_MAX,
  VOYAGE_MANIFEST_NAME_RATIO,
  VOYAGE_MANIFEST_PAD_RATIO,
  VOYAGE_MANIFEST_SCRIM_FADE_RATIO,
  VOYAGE_MANIFEST_SCRIM_FALL_RATIO,
  VOYAGE_MANIFEST_SEATS_MAX,
  VOYAGE_MANIFEST_SEATS_MIN,
  VOYAGE_MANIFEST_TILE_MAX,
  VOYAGE_MANIFEST_TILE_MIN,
  VOYAGE_MANIFEST_TILE_SHARE,
} from '@/config/constants'

/** Ein Band der Reihe — die Geretteten, die Verlorenen. */
export interface VoyageManifestBand {
  /** Wie viele Gesichter das Band traegt. */
  seats: number
  /** Was der Deckel abschneidet — die Zahl, die der Chip nennt. */
  hidden: number
  width: number
}

export interface VoyageManifestRow {
  /** Portraitkante — immer im `md`-Band, siehe Deckel. */
  tile: number
  /** Zellbreite: Portrait plus das, was der Name darunter mehr braucht. */
  cell: number
  gap: number
  pad: number
  freed: VoyageManifestBand
  /** `seats` 0, wenn nichts verloren ging — dann steht das Band gar nicht. */
  lost: VoyageManifestBand
  headPx: number
  namePx: number
  /** Die BREITERE der beiden — sie traegt Maske und Scrim. */
  width: number
  height: number
  scrimW: number
  scrimH: number
}

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * @param stageW     Breite der Kartenbuehne (`.egm`) in CSS-Pixeln.
 * @param freedTotal Wie viele gerettete Sitze der Datensatz hergibt. Ohne
 *                   Angabe: kein Ueberlauf, die Reihe rechnet ihre reinen Masse.
 * @param lostTotal  Dasselbe fuer die verlorenen. 0 heisst: kein zweites Band.
 */
export function voyageManifestRow(
  stageW: number,
  freedTotal = 0,
  lostTotal = 0,
): VoyageManifestRow {
  const tile = Math.round(
    clamp(VOYAGE_MANIFEST_TILE_MIN, stageW * VOYAGE_MANIFEST_TILE_SHARE, VOYAGE_MANIFEST_TILE_MAX),
  )
  const cell = Math.round(tile * VOYAGE_MANIFEST_CELL_RATIO)
  const gap = Math.round(tile * VOYAGE_MANIFEST_GAP_RATIO)
  const pad = Math.round(tile * VOYAGE_MANIFEST_PAD_RATIO)

  const budget = stageW * VOYAGE_MANIFEST_MAX_SHARE - 2 * pad + gap
  const cells = clamp(
    VOYAGE_MANIFEST_SEATS_MIN,
    Math.floor(budget / (cell + gap)),
    VOYAGE_MANIFEST_SEATS_MAX,
  )
  // Der Ueberlaufchip steht IM Fluss und kostet deshalb eine Zelle. Im Browser
  // gemessen: ohne ihn im Budget riss die Reihe auf Full HD von 482 auf 529,8
  // und damit ihren zugesagten Anteil. Er ist schmaler als eine Kachel, aber
  // sein Text waechst mit der Zahl („+12 more") — eine ganze Zelle ist die
  // Reserve, die keine zweite Messung braucht.
  const band = (total: number): VoyageManifestBand => {
    const seats = total > cells ? Math.max(VOYAGE_MANIFEST_SEATS_MIN, cells - 1) : cells
    const lanes = total > seats ? seats + 1 : seats
    return {
      seats,
      hidden: Math.max(0, total - seats),
      width: 2 * pad + lanes * cell + (lanes - 1) * gap,
    }
  }
  const freed = band(freedTotal)
  const lost = band(lostTotal)

  const namePx = Math.min(VOYAGE_MANIFEST_NAME_MAX, Math.round(tile * VOYAGE_MANIFEST_NAME_RATIO))
  const headPx = Math.min(
    VOYAGE_MANIFEST_HEAD_MAX,
    Math.round(namePx * VOYAGE_MANIFEST_HEAD_RATIO),
  )

  // Ein Band: Kopfwort, Kacheln, Namen. Zwei stehen mit `gap` uebereinander,
  // und der Scrim faellt ueber beide.
  const bandH =
    Math.round(headPx * VOYAGE_MANIFEST_LINE) +
    gap +
    tile +
    gap +
    Math.round(namePx * VOYAGE_MANIFEST_LINE)
  const bands = lostTotal > 0 ? 2 : 1

  const width = Math.max(freed.width, lostTotal > 0 ? lost.width : 0)
  const height = 2 * pad + bands * bandH + (bands - 1) * gap

  return {
    tile,
    cell,
    gap,
    pad,
    freed,
    lost: lostTotal > 0 ? lost : { seats: 0, hidden: 0, width: 0 },
    headPx,
    namePx,
    width,
    height,
    scrimW: Math.round(width + tile * VOYAGE_MANIFEST_SCRIM_FADE_RATIO),
    scrimH: Math.round(height + tile * VOYAGE_MANIFEST_SCRIM_FALL_RATIO),
  }
}
