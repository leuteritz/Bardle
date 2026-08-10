import { describe, it, expect } from 'vitest'
import { voidPositionAt } from '@/utils/orbit/voidPath'
import { VOID_SPAWN_SCALE, VOID_ARRIVAL_SUN_FRAC } from '@/config/constants'

/**
 * Die Bahn eines Void-Wesens — geprüft wird das eine, worauf es ankommt: dass
 * man es von der ersten Sekunde an SIEHT. Die HUD-Karte oben links meldet es
 * beim Aufreissen; steht es dann noch ausserhalb oder hinter dem Header, meldet
 * sie etwas, das es auf dem Schirm nicht gibt.
 */

const W = 1920
const H = 1000
const SUN = 120
const SIZE = 160
const TRAVEL = 60_000
const SPAWNED_AT = 1_000_000

const monster = (angle: number, drift = 0) => ({
  angle,
  drift,
  spawnedAt: SPAWNED_AT,
  travelMs: TRAVEL,
})

/** Halber Körper im Moment des Aufreissens — er ist dann erst anteilig gross. */
const spawnRadius = SIZE / 2 * VOID_SPAWN_SCALE

const UP = -Math.PI / 2
const DOWN = Math.PI / 2
const RIGHT = 0
const LEFT = Math.PI

describe('voidPath', () => {
  describe('Aufreissen am Rand', () => {
    // Der Bezug war einmal die halbe Bilddiagonale: auf 16:9 sind das 1082 px
    // in jede Richtung, während die Kante nach oben nur 500 px entfernt ist.
    // Ein Wesen von oben war damit den halben Anflug lang unsichtbar.
    it('startet an der echten Bildkante, nicht auf der halben Diagonale', () => {
      const p = voidPositionAt(monster(UP), SIZE, SUN, SPAWNED_AT, W, H)
      expect(p.y).toBeLessThan(0 + spawnRadius + 1)
      expect(p.y).toBeGreaterThan(-spawnRadius - 1)
      expect(Math.hypot(p.x - W / 2, p.y - H / 2)).toBeLessThan(Math.hypot(W, H) / 2)
    })

    it('ragt aus jeder Richtung sofort ins Bild', () => {
      for (const angle of [UP, DOWN, LEFT, RIGHT, 0.7, 2.4, 4.1, 5.6]) {
        const p = voidPositionAt(monster(angle), SIZE, SUN, SPAWNED_AT, W, H)
        const intoView =
          p.x + spawnRadius > 0 &&
          p.x - spawnRadius < W &&
          p.y + spawnRadius > 0 &&
          p.y - spawnRadius < H
        expect(intoView, `Anflug ${angle.toFixed(2)} rad steht ausserhalb`).toBe(true)
      }
    })

    // Header und Bottom-Bar liegen ÜBER dem Void-Layer und gehen über die volle
    // Breite. Hinter ihnen aufzureissen ist für den Spieler dasselbe wie
    // ausserhalb des Bildes.
    it('bleibt unter dem Header und über der Bottom-Bar', () => {
      const insets = { headerBottomPx: 133, bottomBarHeightPx: 308 }
      const top = voidPositionAt(monster(UP), SIZE, SUN, SPAWNED_AT, W, H, insets)
      const bottom = voidPositionAt(monster(DOWN), SIZE, SUN, SPAWNED_AT, W, H, insets)

      // Der Körper ragt unter der Header-Kante hervor …
      expect(top.y + spawnRadius).toBeGreaterThan(insets.headerBottomPx)
      // … und über der Oberkante der Bottom-Bar.
      expect(bottom.y - spawnRadius).toBeLessThan(H - insets.bottomBarHeightPx)
    })
  })

  describe('Anflug', () => {
    it('endet auf der Sonnenscheibe, aus der eigenen Richtung', () => {
      for (const angle of [UP, DOWN, LEFT, RIGHT]) {
        const end = voidPositionAt(monster(angle), SIZE, SUN, SPAWNED_AT + TRAVEL, W, H)
        const d = Math.hypot(end.x - W / 2, end.y - H / 2)
        expect(d).toBeCloseTo(SUN * VOID_ARRIVAL_SUN_FRAC, 5)
        expect(end.scale).toBeCloseTo(1, 5)
      }
    })

    // Der seitliche Versatz hängt an der Länge DIESER Sehne. Fest an der
    // Bilddiagonale gemessen krümmte er den kurzen Anflug von oben zu einem
    // Bogen, der aus dem Bild führt — und was draussen ist, kann man nicht
    // anklicken.
    it('führt bei vollem Versatz nicht aus dem Bild', () => {
      for (const angle of [UP, DOWN, LEFT, RIGHT, 1.1, 3.3, 5.0]) {
        for (const drift of [-1, 1]) {
          for (let i = 0; i <= 40; i++) {
            const t = i / 40
            const p = voidPositionAt(
              monster(angle, drift),
              SIZE,
              SUN,
              SPAWNED_AT + t * TRAVEL,
              W,
              H,
            )
            const outside = p.x < -spawnRadius || p.x > W + spawnRadius || p.y < -spawnRadius || p.y > H + spawnRadius
            expect(
              outside,
              `Anflug ${angle.toFixed(2)} rad, Versatz ${drift} bei t=${t.toFixed(2)}`,
            ).toBe(false)
          }
        }
      }
    })

    it('wächst monoton auf dem Weg', () => {
      const m = monster(2.0, 0.5)
      let last = -1
      for (let i = 0; i <= 20; i++) {
        const p = voidPositionAt(m, SIZE, SUN, SPAWNED_AT + (i / 20) * TRAVEL, W, H)
        expect(p.scale).toBeGreaterThanOrEqual(last)
        last = p.scale
      }
      expect(last).toBeCloseTo(1, 5)
    })
  })
})
