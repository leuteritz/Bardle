/* ── Galaxy-Archive snapshot renderer ─────────────────────────────────────────
   Renders a completed galaxy's minimap as a still image (data URL) for the
   Bard-Stats "Galaxy Archive" and the Voyages rail. Fully deterministic: it
   replays the seeded geometry the live minimap used (same mapSeed → same
   spiral, same star positions, same route), so no pixel data ever needs to be
   persisted — the tiny CompletedGalaxyRecord in the save is enough.

   Das Zeichnen selbst liegt in `galaxyPlate.ts`, weil die grosse Karte des
   Voyages-Reiters dieselbe Reihenfolge in Panelgrösse braucht. Hier bleibt, was
   nur das STANDBILD betrifft: die Grösse, die Rasterdichte und der Cache. */

import {
  paintGalaxy,
  galaxyFitBox,
  starRoleSignature,
  GALAXY_PLATE_REF_W,
  GALAXY_PLATE_REF_H,
} from './galaxyPlate'
import {
  GALAXY_SNAPSHOT_DISPLAY_W,
  GALAXY_SNAPSHOT_MAX_DPR,
  GALAXY_SNAPSHOT_CACHE_MAX,
  VOYAGE_RAIL_THUMB_W,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

/** Logische Standbildgrösse. Sie WÄCHST NICHT: darüber wandert der Massstab
 *  `k` in `paintGalaxy` und mit ihm die ganze Komposition. */
export const GALAXY_SNAPSHOT_W = GALAXY_PLATE_REF_W
export const GALAXY_SNAPSHOT_H = GALAXY_PLATE_REF_H
/**
 * Kleine Stufe für die Zeilen der Voyages-Seitenleiste. Das volle Standbild dort
 * einzuhängen hiess, je Zeile ein Vollbild-PNG zu dekodieren und auf ein Fünftel
 * zu stauchen — gemessen 241 ms bei zwanzig befreiten Galaxien. Massgeblich ist
 * die ANZEIGEGRÖSSE, hier 96×60 CSS.
 */
const THUMB_W = 168
const THUMB_H = 105

/**
 * Die Rasterdichte folgt der ECHTEN Gerätedichte, nicht einer festen Zahl: auf
 * DPR 1 und 1,25 deckt der bisherige 2×-Wert die Anzeige bereits ab, dort wäre
 * ein höherer Faktor reine Mehrarbeit. Der Aufpreis landet nur auf HiDPI, wo
 * auch der Gewinn liegt.
 */
function deviceDpr(): number {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  return Math.min(dpr, GALAXY_SNAPSHOT_MAX_DPR)
}

export function snapshotRenderScale(dpr: number): number {
  return Math.max(2, (GALAXY_SNAPSHOT_DISPLAY_W * dpr) / GALAXY_SNAPSHOT_W)
}

export function thumbRenderScale(dpr: number): number {
  return Math.max(1, (VOYAGE_RAIL_THUMB_W * dpr) / THUMB_W)
}

/** Data-URLs des Standbilds sind gross — ohne Deckel bliebe jede durchgescrollte
 *  Archivkarte als Base64 im Modul liegen. Die Miniaturen sind 3,6 % davon und
 *  behalten deshalb einen eigenen, offenen Cache. */
const snapshotCache = new Map<string, string>()
const thumbCache = new Map<string, string>()

function cacheKey(record: CompletedGalaxyRecord, deviceW: number): string {
  // Die Rollen gehören dazu: sie färben die Sternkerne und werden NACHTRÄGLICH
  // gefüllt (Archiv-Nachtrag, Lade-Nachtrag). Ohne sie bliebe ein einmal
  // gerendertes Bild fuer immer in der alten Fassung — und `thumbCache` läuft
  // ohne Deckel, dort wäre es endgültig.
  return (
    `${deviceW}:${record.galaxy}:${record.mapSeed}:${record.attemptResults.length}` +
    `:${record.themeIndex}:${starRoleSignature(record.starManifests)}`
  )
}

function render(
  record: CompletedGalaxyRecord,
  w: number,
  h: number,
  scale: number,
  cache: Map<string, string>,
  cap: number,
): string {
  const key = cacheKey(record, Math.round(w * scale))
  const cached = cache.get(key)
  if (cached) {
    cache.delete(key)
    cache.set(key, cached)
    return cached
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.setTransform(scale, 0, 0, scale, 0, 0)

  // Einrückung 0: die Fit-Box entartet zur vollen Fläche, der Massstab in
  // `paintGalaxy` wird damit 1 (bzw. 0,525 für die Miniatur).
  // `dpr: scale` ist Pflicht — sonst rastert der Sprite-Cache der Landmarken bei
  // 1 und ein hochskaliertes Sprite frisst den Schärfegewinn wieder auf.
  paintGalaxy(ctx, record, w, h, galaxyFitBox(w, h, 0), { dpr: scale, routeAlpha: 0.55 })

  const url = canvas.toDataURL('image/png')
  cache.set(key, url)
  if (cap > 0 && cache.size > cap) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  return url
}

/** Das volle Standbild — Bard-Stats-Archiv und die Übersichtskarte der Voyages. */
export function renderGalaxySnapshot(record: CompletedGalaxyRecord): string {
  const dpr = deviceDpr()
  return render(
    record,
    GALAXY_SNAPSHOT_W,
    GALAXY_SNAPSHOT_H,
    snapshotRenderScale(dpr),
    snapshotCache,
    GALAXY_SNAPSHOT_CACHE_MAX,
  )
}

/** Die kleine Stufe — nur für Listenzeilen, siehe THUMB_W. */
export function renderGalaxyThumb(record: CompletedGalaxyRecord): string {
  const dpr = deviceDpr()
  return render(record, THUMB_W, THUMB_H, thumbRenderScale(dpr), thumbCache, 0)
}
