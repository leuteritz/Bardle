/* ── Galaxy-Archive snapshot renderer ─────────────────────────────────────────
   Renders a completed galaxy's minimap as a still image (data URL) for the
   Bard-Stats "Galaxy Archive" and the Voyages rail. Fully deterministic: it
   replays the seeded geometry the live minimap used (same mapSeed → same
   spiral, same star positions, same route), so no pixel data ever needs to be
   persisted — the tiny CompletedGalaxyRecord in the save is enough.

   Das Zeichnen selbst liegt in `galaxyPlate.ts`, weil die grosse Karte des
   Voyages-Reiters dieselbe Reihenfolge in Panelgrösse braucht. Hier bleibt, was
   nur das STANDBILD betrifft: die feste Grösse, das 2×-Rendern und der Cache. */

import { paintGalaxy, galaxyFitBox, GALAXY_PLATE_REF_W, GALAXY_PLATE_REF_H } from './galaxyPlate'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

/** Logical snapshot size (rendered at 2× for crisp HiDPI display). */
export const GALAXY_SNAPSHOT_W = GALAXY_PLATE_REF_W
export const GALAXY_SNAPSHOT_H = GALAXY_PLATE_REF_H
/**
 * Kleine Stufe für die Zeilen der Voyages-Seitenleiste.
 *
 * Sie zeigen 84×53 CSS-Pixel. Das volle Standbild dort einzuhängen hiess, je
 * Zeile ein 640×400-PNG zu dekodieren und auf ein Fünftel zu stauchen —
 * gemessen 241 ms beim Wiedereinblenden des Reiters, bei zwanzig befreiten
 * Galaxien. Dieselbe Regel wie bei den Auflösungsvarianten unter `public/img`:
 * massgeblich ist die ANZEIGEGRÖSSE.
 */
const THUMB_W = 168
const THUMB_H = 105
const RENDER_SCALE = 2

const snapshotCache = new Map<string, string>()

function cacheKey(record: CompletedGalaxyRecord, w: number): string {
  return `${w}:${record.galaxy}:${record.mapSeed}:${record.attemptResults.length}:${record.themeIndex}`
}

function render(record: CompletedGalaxyRecord, w: number, h: number, scale: number): string {
  const key = cacheKey(record, w)
  const cached = snapshotCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.setTransform(scale, 0, 0, scale, 0, 0)

  // Einrückung 0: die Fit-Box entartet zur vollen Fläche. Bei der vollen Grösse
  // wird der Skalierungsfaktor in `paintGalaxy` damit 1 — das Archivbild ist
  // Pixel für Pixel das alte.
  paintGalaxy(ctx, record, w, h, galaxyFitBox(w, h, 0), { markers: 'full', routeAlpha: 0.55 })

  const url = canvas.toDataURL('image/png')
  snapshotCache.set(key, url)
  return url
}

/** Das volle Standbild — Bard-Stats-Archiv und die Übersichtskarte der Voyages. */
export function renderGalaxySnapshot(record: CompletedGalaxyRecord): string {
  return render(record, GALAXY_SNAPSHOT_W, GALAXY_SNAPSHOT_H, RENDER_SCALE)
}

/** Die kleine Stufe — nur für Listenzeilen, siehe THUMB_W. */
export function renderGalaxyThumb(record: CompletedGalaxyRecord): string {
  return render(record, THUMB_W, THUMB_H, 1)
}
