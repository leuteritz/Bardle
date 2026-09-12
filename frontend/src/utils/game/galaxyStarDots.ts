/**
 * Die Sternorte einer Galaxie — die EINE Quelle für Platte, Minimap, Bühne
 * und Berths.
 *
 * Seit der Spieler seinen Kurs wählt, liegt der Ort jeder Etappe im Spielstand
 * (`starPositions`, parallel zu `attemptResults`). Was dort fehlt — Altbestand,
 * Archiv-Nachtrag, ein vor der Wahl begonnener Lauf — kommt weiter aus
 * `generateGalaxyDots`, dessen rng-Reihenfolge byte-eingefroren bleibt.
 */
import {
  generateGalaxyDots,
  type DotPos,
} from '@/components/bottom/minimap/minimapGalaxyGeometry'

export function galaxyStarDots(
  mapSeed: number,
  attempts: number,
  starPositions?: DotPos[],
): { spawn: DotPos; dots: DotPos[] } {
  const { spawn, dots } = generateGalaxyDots(mapSeed, attempts + 1)
  if (!starPositions?.length) return { spawn, dots }
  return { spawn, dots: dots.map((d, i) => starPositions[i] ?? d) }
}
