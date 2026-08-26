import { describe, it, expect } from 'vitest'
import { voidPositionAt } from '@/utils/orbit/voidPath'
import { hudBarTopAt, hudHeaderBottomAt, type HudFieldMetrics } from '@/utils/ui/hudField'
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
const spawnRadius = (SIZE / 2) * VOID_SPAWN_SCALE

/**
 * Eine HUD-Kontur, wie sie auf Full HD gemessen wurde: Bar-Skalierung 0,694,
 * Header von x=265 bis x=1655 mit 86 px Kante und einem Oval, das mittig auf
 * 133 px herunterreicht.
 */
const METRICS: HudFieldMetrics = {
  viewportW: W,
  viewportH: H,
  hudScale: 0.694444,
  headerBottom: 86,
  headerLeft: 265,
  headerRight: W - 265,
  headerCenterBottom: 133,
  centerArc: { cx: 695, rx: 134, ry: 106, topOffset: 84 },
  keycapBar: 30,
  // Ohne Fähigkeitenleiste — die Zusicherungen unten gelten der BAR-Kontur.
  abilityBarTop: 0,
  abilityBarHalfW: 0,
  // Ohne Missionskarte, aus demselben Grund: die Kante der linken Spalte hat
  // ihre eigene Spec (`hudFieldLeftColumn.spec.ts`) und würde die Aussagen hier
  // nur verschieben.
  wayfinderBottom: 0,
  wayfinderRight: 0,
  // Ebenso ohne Eventlog-Panel: die rechte Spalte hat
  // `hudFieldRightColumn.spec.ts`.
  eventLogBottom: 0,
  eventLogLeft: 0,
}

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
      // Ohne HUD gemessen: dann ist die Kante die nackte Bildkante.
      const bare = { ...METRICS, headerBottom: 0, headerCenterBottom: 0, centerArc: null }
      const p = voidPositionAt(monster(UP), SIZE, SUN, SPAWNED_AT, W, H, bare)
      expect(p.y).toBeLessThan(0 + spawnRadius + 1)
      expect(p.y).toBeGreaterThan(-spawnRadius - 1)
      expect(Math.hypot(p.x - W / 2, p.y - H / 2)).toBeLessThan(Math.hypot(W, H) / 2)
    })

    it('ragt aus jeder Richtung sofort ins Bild', () => {
      for (const angle of [UP, DOWN, LEFT, RIGHT, 0.7, 2.4, 4.1, 5.6]) {
        const p = voidPositionAt(monster(angle), SIZE, SUN, SPAWNED_AT, W, H, METRICS)
        const intoView =
          p.x + spawnRadius > 0 &&
          p.x - spawnRadius < W &&
          p.y + spawnRadius > 0 &&
          p.y - spawnRadius < H
        expect(intoView, `Anflug ${angle.toFixed(2)} rad steht ausserhalb`).toBe(true)
      }
    })

    // Header und Bottom-Bar liegen ÜBER dem Void-Layer. Hinter ihnen
    // aufzureissen ist für den Spieler dasselbe wie ausserhalb des Bildes.
    it('bleibt unter dem Header und über der Bottom-Bar', () => {
      const top = voidPositionAt(monster(UP), SIZE, SUN, SPAWNED_AT, W, H, METRICS)
      const bottom = voidPositionAt(monster(DOWN), SIZE, SUN, SPAWNED_AT, W, H, METRICS)

      const headerAtTop = hudHeaderBottomAt(top.x, METRICS)
      const barAtBottom = hudBarTopAt(bottom.x, METRICS)
      // Der Körper ragt unter der Header-Kante hervor …
      expect(top.y + spawnRadius).toBeGreaterThan(headerAtTop)
      // … und über der Oberkante der Bottom-Bar.
      expect(bottom.y - spawnRadius).toBeLessThan(barAtBottom)
    })

    // Der eigentliche Gewinn der Kontur: unter der Sonne fällt die Bar auf
    // einen schmalen Streifen ab. Mit einem Rechteck gerechnet reissen die
    // Wesen dort mehrere hundert Pixel zu früh auf — auf freier Fläche.
    it('reisst in der Bar-Mitte auf dem Streifen auf, nicht auf Rechteckhöhe', () => {
      const mid = voidPositionAt(monster(DOWN), SIZE, SUN, SPAWNED_AT, W, H, METRICS)
      // Genau auf der Kante des niedrigen Mittelstreifens …
      expect(mid.y).toBeCloseTo(hudBarTopAt(mid.x, METRICS), 0)
      // … und damit weit unter der Oberkante des Bar-RECHTECKS, mit der eine
      // pauschale Rechnung arbeiten müsste.
      const rectTop = H - 443 * METRICS.hudScale
      expect(mid.y).toBeGreaterThan(rectTop + 200)
    })

    // Die Fähigkeitenleiste steht als eigenes Rechteck über dem Mittelstreifen
    // und war der Kontur lange unbekannt — ein Wesen riss dahinter auf, wo es
    // niemand sehen und niemand anklicken konnte.
    it('bleibt über der Fähigkeitenleiste, wo eine steht', () => {
      const barTop = H - 200
      const withBar: HudFieldMetrics = { ...METRICS, abilityBarTop: barTop, abilityBarHalfW: 230 }

      const mid = voidPositionAt(monster(DOWN), SIZE, SUN, SPAWNED_AT, W, H, withBar)
      expect(Math.abs(mid.x - W / 2)).toBeLessThanOrEqual(230)
      expect(mid.y).toBeLessThanOrEqual(barTop)
      // … und ohne Leiste stünde es tiefer: die Kante wirkt wirklich.
      const bare = voidPositionAt(monster(DOWN), SIZE, SUN, SPAWNED_AT, W, H, METRICS)
      expect(bare.y).toBeGreaterThan(mid.y)
    })

    // Seitlich der Leiste gilt sie nicht — sie hört dort einfach auf, statt
    // eine Kontur zu haben.
    it('lässt neben der Fähigkeitenleiste die Bar-Kante gelten', () => {
      const withBar: HudFieldMetrics = { ...METRICS, abilityBarTop: H - 200, abilityBarHalfW: 100 }
      for (const angle of [2.9, 0.25]) {
        const p = voidPositionAt(monster(angle), SIZE, SUN, SPAWNED_AT, W, H, withBar)
        const same = voidPositionAt(monster(angle), SIZE, SUN, SPAWNED_AT, W, H, METRICS)
        expect(p.y).toBeCloseTo(same.y, 6)
      }
    })

    // Über den erhöhten Enden gilt dagegen die Panel-Kante, und die liegt weit
    // höher. Beides aus derselben Kontur, ohne Sonderfall im Aufrufer.
    it('hält über den Seitenpanels deren viel höhere Kante ein', () => {
      for (const angle of [2.9, 0.25]) {
        const p = voidPositionAt(monster(angle), SIZE, SUN, SPAWNED_AT, W, H, METRICS)
        expect(p.y - spawnRadius).toBeLessThan(hudBarTopAt(p.x, METRICS))
      }
    })

    // Am äusseren Rand gibt es gar keinen Header — dort darf ein Wesen bis an
    // die Bildkante heran aufreissen.
    it('nutzt oben die volle Höhe, wo der Header aufhört', () => {
      // Schräg nach oben-aussen, jenseits der Header-Box.
      const outer = voidPositionAt(monster(-2.6), SIZE, SUN, SPAWNED_AT, W, H, METRICS)
      const straightUp = voidPositionAt(monster(UP), SIZE, SUN, SPAWNED_AT, W, H, METRICS)
      expect(outer.x).toBeLessThan(METRICS.headerLeft)
      expect(outer.y).toBeLessThan(straightUp.y)
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
            const outside =
              p.x < -spawnRadius ||
              p.x > W + spawnRadius ||
              p.y < -spawnRadius ||
              p.y > H + spawnRadius
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
