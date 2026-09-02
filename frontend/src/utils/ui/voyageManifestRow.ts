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

export interface VoyageManifestRow {
  /** Portraitkante — immer im `md`-Band, siehe Deckel. */
  tile: number
  /** Zellbreite: Portrait plus das, was der Name darunter mehr braucht. */
  cell: number
  gap: number
  pad: number
  /** Wie viele Gesichter die Reihe traegt. */
  seats: number
  /** Was der Deckel abschneidet — die Zahl, die der Chip nennt. */
  hidden: number
  headPx: number
  namePx: number
  width: number
  height: number
  scrimW: number
  scrimH: number
}

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * @param stageW Breite der Kartenbuehne (`.egm`) in CSS-Pixeln.
 * @param total  Wie viele Sitze der Datensatz hergibt. Ohne Angabe: kein
 *               Ueberlauf, die Reihe rechnet ihre reinen Masse.
 */
export function voyageManifestRow(stageW: number, total = 0): VoyageManifestRow {
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
  const seats = total > cells ? Math.max(VOYAGE_MANIFEST_SEATS_MIN, cells - 1) : cells
  const lanes = total > seats ? seats + 1 : seats

  const namePx = Math.min(VOYAGE_MANIFEST_NAME_MAX, Math.round(tile * VOYAGE_MANIFEST_NAME_RATIO))
  const headPx = Math.min(
    VOYAGE_MANIFEST_HEAD_MAX,
    Math.round(namePx * VOYAGE_MANIFEST_HEAD_RATIO),
  )

  const width = 2 * pad + lanes * cell + (lanes - 1) * gap
  const height =
    2 * pad +
    Math.round(headPx * VOYAGE_MANIFEST_LINE) +
    gap +
    tile +
    gap +
    Math.round(namePx * VOYAGE_MANIFEST_LINE)

  return {
    tile,
    cell,
    gap,
    pad,
    seats,
    hidden: Math.max(0, total - seats),
    headPx,
    namePx,
    width,
    height,
    scrimW: Math.round(width + tile * VOYAGE_MANIFEST_SCRIM_FADE_RATIO),
    scrimH: Math.round(height + tile * VOYAGE_MANIFEST_SCRIM_FALL_RATIO),
  }
}
