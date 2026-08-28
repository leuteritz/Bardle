import { describe, it, expect } from 'vitest'
import { universes } from '@/config/progression/universes'
import {
  FIRMAMENT_FREED_COLOR,
  FIRMAMENT_GATE_COLOR,
  FIRMAMENT_HERE_COLOR,
  FIRMAMENT_LANDFALL_COLOR,
  FIRMAMENT_LOST_COLOR,
} from '@/config/constants'

/**
 * Der Farbton der Universumsscheibe.
 *
 * Er ist das EINZIGE, was zehn sonst gleich gebaute Scheiben auseinanderhält —
 * und er liegt in einem Reiter, dessen Karte schon fünf Zustandsfarben führt.
 * Beide Wände werden hier gebunden: die Töne untereinander weit genug
 * auseinander, und keiner davon nah an einer Zustandsfarbe.
 */

const STATE_COLORS = {
  freed: FIRMAMENT_FREED_COLOR,
  here: FIRMAMENT_HERE_COLOR,
  gate: FIRMAMENT_GATE_COLOR,
  landfall: FIRMAMENT_LANDFALL_COLOR,
  lost: FIRMAMENT_LOST_COLOR,
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function distance(a: string, b: string): number {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  return Math.hypot(ar - br, ag - bg, ab - bb)
}

/** Buntheit als Chroma, NIE als HSL-Sättigung: die teilt nahe Weiß durch fast
 *  null und meldet für #eef2f8 einen Wert von 0,42. */
function chroma(hex: string): number {
  const c = rgb(hex)
  return (Math.max(...c) - Math.min(...c)) / 255
}

describe('Universumsfarben', () => {
  it('jedes Universum trägt einen Ton', () => {
    for (const u of universes) {
      expect(u.tint, u.name).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('die zehn Töne sind paarweise unterscheidbar', () => {
    for (const a of universes) {
      for (const b of universes) {
        if (a.id >= b.id) continue
        expect(distance(a.tint, b.tint), `${a.name} vs ${b.name}`).toBeGreaterThan(60)
      }
    }
  })

  it('kein Ton kommt einer Zustandsfarbe der Karte nahe', () => {
    // Ein Staubton, der wie „hier" oder „Tor" aussieht, macht aus Auskunft
    // Dekoration — und die Karte liest sich dann in jeder Zeile anders.
    for (const u of universes) {
      for (const [key, color] of Object.entries(STATE_COLORS)) {
        expect(distance(u.tint, color), `${u.name} vs ${key}`).toBeGreaterThan(40)
      }
    }
  })

  it('kein Ton ist so unbunt, dass er im Staub verschwindet', () => {
    // Der Tint liegt bei 15–34 % Deckkraft über einem fast schwarzen Grund;
    // ohne Buntheit bleibt davon nur Grau übrig.
    for (const u of universes) {
      expect(chroma(u.tint), u.name).toBeGreaterThan(0.1)
    }
  })

  it('kein Ton ist so dunkel, dass die Scheibe leer wirkt', () => {
    for (const u of universes) {
      const [r, g, b] = rgb(u.tint)
      expect(Math.max(r, g, b), u.name).toBeGreaterThan(150)
    }
  })
})
