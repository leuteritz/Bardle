import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FIRMAMENT_DIVE_ARRIVE_MS,
  FIRMAMENT_DIVE_ARRIVE_SCALE,
  FIRMAMENT_DIVE_LEAVE_MS,
  FIRMAMENT_DIVE_SCALE,
  MINIMAP_DEPARTURE_TRANSITION_MS,
} from '@/config/constants'

/**
 * Die Kamerafahrt Firmament ⇄ Voyages.
 *
 * Sie laeuft in dem Moment, in dem der Atlas seinen teuersten Frame malt —
 * was hier animiert, muss am Compositor laufen, sonst steht es genau dann
 * still. Und sie ist reine Anzeige: Wanduhr, nie die Spieluhr.
 */
const FILES = {
  veil: 'components/bardProfil/FirmamentDiveVeil.vue',
  chart: 'components/bardProfil/firmament/FirmamentChart.vue',
  map: 'components/bardProfil/expedition/ExpeditionGalaxyMap.vue',
}

function src(rel: string): string {
  return readFileSync(resolve(__dirname, '../..', rel), 'utf8')
}

/** Ohne Kommentare — die nennen die verbotenen Woerter, um sie zu begruenden. */
function code(rel: string): string {
  return src(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('Kamerafahrt Firmament ⇄ Voyages', () => {
  it('dauert zusammen so lang wie die Abflugblende der Minimap', () => {
    expect(FIRMAMENT_DIVE_LEAVE_MS + FIRMAMENT_DIVE_ARRIVE_MS).toBe(MINIMAP_DEPARTURE_TRANSITION_MS)
    expect(FIRMAMENT_DIVE_ARRIVE_SCALE).toBeGreaterThan(1)
    // Ab ~60 % Schleier ist die Platte unsichtbar; mehr rastert die
    // 2600-px-Platte fuer nichts neu.
    expect(FIRMAMENT_DIVE_SCALE).toBeLessThanOrEqual(4)
  })

  it.each(Object.entries(FILES))('bewegt in %s nur transform und opacity', (_name, rel) => {
    const text = src(rel)
    const frames = [...text.matchAll(/@keyframes[^{]+\{([\s\S]*?)\n\}/g)]
    expect(frames.length).toBeGreaterThan(0)
    for (const body of frames) {
      const props = [...body[1].matchAll(/^\s{4}([a-z-]+):/gm)].map((m) => m[1])
      expect(props.length).toBeGreaterThan(0)
      for (const p of props) expect(['transform', 'opacity'], `${p} im Keyframe`).toContain(p)
    }
    expect(code(rel).includes('will-change')).toBe(false)
  })

  it('taktet den Schleier mit der Wanduhr und wartet auf den Frame', () => {
    const text = code(FILES.veil)
    expect(text.includes('gameTimeout')).toBe(false)
    expect(text.includes('gameNow')).toBe(false)
    // Erst wenn der Browser wieder rendert, steht die Zielplatte.
    expect(text.includes('VOYAGE_LOADER_SETTLE_FRAMES')).toBe(true)
    expect(text.includes('requestAnimationFrame')).toBe(true)
    // Ruhend DECKEND — ein eingefrorener Schleier zeigt Schwarz, nie einen halben Reiter.
    expect(text).toMatch(/\.fdv-veil\s*\{[^}]*opacity:\s*1;/)
  })

  it('laesst reduced-motion den harten Schnitt gehen', () => {
    for (const rel of Object.values(FILES)) {
      expect(src(rel).includes('prefers-reduced-motion: reduce'), rel).toBe(true)
    }
  })

  it('macht die Firmament-Buehne waehrend der Fahrt taub und haelt die Drehung an', () => {
    const text = src(FILES.chart)
    // `.fm-node` & Co. holen sich pointer-events: auto einzeln zurueck — nur
    // der Stern trifft sie alle.
    expect(text).toMatch(/\.fm-stage\.is-diving \*\s*\{[^}]*pointer-events:\s*none/)
    expect(text).toMatch(
      /\.fm-stage\.is-diving :is\(\.fm-spin, \.fm-rim, \.fm-node-tag\)\s*\{[^}]*animation-play-state:\s*paused/,
    )
  })
})
