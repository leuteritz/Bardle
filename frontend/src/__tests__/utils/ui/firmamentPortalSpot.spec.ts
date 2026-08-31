import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  firmamentPortalKeepOuts,
  firmamentPortalRingR,
  firmamentPortalSpot,
  firmamentPortalVisibleShare,
} from '@/utils/ui/firmamentPortalSpot'
import { firmamentFitBox } from '@/utils/ui/firmamentLayout'
import { universes } from '@/config/progression/universes'
import {
  FIRMAMENT_PORTAL_DISC_CLEAR,
  FIRMAMENT_PORTAL_MIN_VISIBLE,
  FIRMAMENT_PORTAL_RING_MAX_PX,
  FIRMAMENT_PORTAL_RING_MIN_PX,
  FIRMAMENT_PORTAL_SHRINK_STEPS,
  FIRMAMENT_PLATE_SPRITE_MARGIN,
  FIRMAMENT_STAGE_MIN_H,
  FIRMAMENT_STAGE_MIN_W,
} from '@/config/constants'

/**
 * Das Portal steht im schwarzen Raum ausserhalb der Galaxienscheibe, an einer je
 * Universum anderen Stelle. Drei Dinge muessen dabei immer gelten, und keines
 * davon sieht man im Code: es liegt wirklich draussen, es ist wirklich zu sehen,
 * und es liegt nicht unter einer Bedienflaeche.
 */

/** Die gemessenen Buehnenmasse — dieselbe Quelle wie `firmamentLayout.spec.ts`. */
const STAGES: Array<{ name: string; w: number; h: number }> = [
  { name: 'Full HD', w: 1002, h: 690.6 },
  { name: 'WUXGA', w: 1002, h: 791.4 },
  { name: '2K', w: 1422, h: 969 },
  { name: '4K', w: 2702, h: 1678.2 },
  { name: 'Boden', w: FIRMAMENT_STAGE_MIN_W, h: FIRMAMENT_STAGE_MIN_H },
]

const IDS = universes.map((u) => u.id)

/** Sichtbarer Anteil, UNABHAENGIG nachgerechnet: ein dichtes Punktraster statt
 *  der Streifenintegration der Funktion selbst. Sonst prueft die Spec die
 *  Funktion gegen sich selbst. */
function visibleByGrid(x: number, y: number, r: number, w: number, h: number): number {
  const n = 400
  let hit = 0
  let all = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const px = x - r + ((i + 0.5) * 2 * r) / n
      const py = y - r + ((j + 0.5) * 2 * r) / n
      if ((px - x) ** 2 + (py - y) ** 2 > r * r) continue
      all++
      if (px >= 0 && px <= w && py >= 0 && py <= h) hit++
    }
  }
  return all > 0 ? hit / all : 0
}

function rectDist(x: number, y: number, k: { x0: number; y0: number; x1: number; y1: number }) {
  return Math.hypot(Math.max(k.x0 - x, 0, x - k.x1), Math.max(k.y0 - y, 0, y - k.y1))
}

describe('firmamentPortalRingR', () => {
  it('waechst mit der Buehnenhoehe und bleibt in seinen Grenzen', () => {
    let last = 0
    for (const s of STAGES.filter((v) => v.name !== 'Boden')) {
      const r = firmamentPortalRingR(s.h)
      expect(r, s.name).toBeGreaterThanOrEqual(FIRMAMENT_PORTAL_RING_MIN_PX)
      expect(r, s.name).toBeLessThanOrEqual(FIRMAMENT_PORTAL_RING_MAX_PX)
      expect(r, s.name).toBeGreaterThanOrEqual(last)
      last = r
    }
  })

  it('haelt den Boden auf der kleinsten Buehne und den Deckel auf 4K', () => {
    expect(firmamentPortalRingR(FIRMAMENT_STAGE_MIN_H)).toBe(FIRMAMENT_PORTAL_RING_MIN_PX)
    expect(firmamentPortalRingR(1678.2)).toBe(FIRMAMENT_PORTAL_RING_MAX_PX)
  })
})

describe('firmamentPortalSpot — wo das Portal steht', () => {
  it('ist deterministisch und unabhaengig von der Aufrufreihenfolge', () => {
    for (const s of STAGES) {
      const forward = IDS.map((id) => firmamentPortalSpot(id, s.w, s.h))
      const backward = [...IDS].reverse().map((id) => firmamentPortalSpot(id, s.w, s.h))
      expect(forward, s.name).toEqual([...backward].reverse())
    }
  })

  /* Der Test, wegen dem es die Streuung ueberhaupt gibt: stuenden alle zehn
     Portale an derselben Stelle, waere „zufaellig" eine Behauptung. */
  it('stellt die zehn Universen an spuerbar verschiedene Stellen', () => {
    for (const s of STAGES.filter((v) => v.name !== 'Boden')) {
      const spots = IDS.map((id) => firmamentPortalSpot(id, s.w, s.h)!)
      let apart = 0
      for (let i = 0; i < spots.length; i++) {
        for (let j = i + 1; j < spots.length; j++) {
          if (Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y) > spots[i].r) apart++
        }
      }
      expect(apart, s.name).toBeGreaterThanOrEqual(6)
    }
  })

  /*
   * DER Test dieser Datei. Gemessen wird gegen die SPRITE-KANTE der Platte, nicht
   * gegen die Galaxienkoerper: die Wolke endet bei 0,907 r, aber darueber liegen
   * Filamentgewebe (1,0148), der deckende dunkle Reifen (1,0333) und der
   * auslaufende Schattenteich (1,0727). Mit dem Wolkenmass sass das Portal
   * mitten darin und wurde zur Haelfte verdeckt.
   */
  it('liegt IMMER jenseits der Kartenkante, nicht nur jenseits der Wolke', () => {
    for (const s of STAGES) {
      const fit = firmamentFitBox(s.w, s.h)
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)!
        const gap = Math.hypot(spot.x - fit.cx, spot.y - fit.cy) - spot.r
        expect(gap, `${s.name} U${id}`).toBeGreaterThanOrEqual(
          fit.r * FIRMAMENT_PORTAL_DISC_CLEAR - 0.001,
        )
      }
    }
    // Die Ableitung selbst: alles, was die Karte malt, liegt darunter.
    expect(FIRMAMENT_PORTAL_DISC_CLEAR).toBe(FIRMAMENT_PLATE_SPRITE_MARGIN)
  })

  /*
   * Der groessere Abstand macht die Menge zulaessiger Stellen kleiner. Ohne die
   * Schrumpfleiter faende die Winkelsuche in sieben von fuenfzig Faellen nichts
   * mehr und gaebe `null` — das Portal verschwaende, und mit ihm die
   * Weiterreise. Kleiner ist besser als weg.
   */
  it('wird kleiner, statt zu verschwinden — aber nie unter den Boden', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)
        expect(spot, `${s.name} U${id}`).not.toBeNull()
        expect(spot!.r, `${s.name} U${id}`).toBeGreaterThanOrEqual(
          FIRMAMENT_PORTAL_RING_MIN_PX * FIRMAMENT_PORTAL_SHRINK_STEPS.at(-1)!,
        )
        expect(spot!.r, `${s.name} U${id}`).toBeLessThanOrEqual(firmamentPortalRingR(s.h))
      }
    }
  })

  /* Geschrumpft wird nur, wo es sein muss: auf den anderen Buehnen behaelt jedes
     Universum die volle Groesse. */
  it('schrumpft nur auf der engen Buehne', () => {
    for (const s of STAGES.filter((v) => v.name !== 'WUXGA')) {
      const full = firmamentPortalRingR(s.h)
      for (const id of IDS) {
        expect(firmamentPortalSpot(id, s.w, s.h)!.r, `${s.name} U${id}`).toBeCloseTo(full, 6)
      }
    }
  })

  it('bleibt zu mehr als der Haelfte im Bild', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)!
        const share = visibleByGrid(spot.x, spot.y, spot.r, s.w, s.h)
        expect(share, `${s.name} U${id}`).toBeGreaterThanOrEqual(
          FIRMAMENT_PORTAL_MIN_VISIBLE - 0.02,
        )
        // Die Ringmitte selbst liegt im Bild — sonst haengt das Portal nur mit
        // einer Sichel herein.
        expect(spot.x, `${s.name} U${id} x`).toBeGreaterThan(0)
        expect(spot.x, `${s.name} U${id} x`).toBeLessThan(s.w)
        expect(spot.y, `${s.name} U${id} y`).toBeGreaterThan(0)
        expect(spot.y, `${s.name} U${id} y`).toBeLessThan(s.h)
      }
    }
  })

  it('legt sich auf keine Bedienflaeche der Buehne', () => {
    for (const s of STAGES) {
      const keep = firmamentPortalKeepOuts(s.w, s.h)
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)!
        for (const k of keep) {
          expect(rectDist(spot.x, spot.y, k), `${s.name} U${id}`).toBeGreaterThanOrEqual(spot.r)
        }
      }
    }
  })

  it('findet auch auf dem Buehnenboden fuer jedes Universum eine Stelle', () => {
    for (const id of IDS) {
      expect(firmamentPortalSpot(id, FIRMAMENT_STAGE_MIN_W, FIRMAMENT_STAGE_MIN_H)).not.toBeNull()
    }
  })

  it('liefert auf einer entarteten Buehne null, statt zu werfen', () => {
    expect(firmamentPortalSpot(1, 0, 0)).toBeNull()
    expect(firmamentPortalSpot(1, -10, 100)).toBeNull()
  })

  /*
   * Die Verriegelung: die Stelle darf weder Zoom noch Fahrt kennen. Beides
   * bewegt sich, und was diese Funktion sehen kann, kann sie in einen
   * Cache-Schluessel tragen — und dann malt das Firmament bei jedem Zoomschritt
   * neu. Der Typ allein faengt das nicht, weil eine Konstante keinen Parameter
   * braucht.
   */
  it('kennt weder Zoom noch Fahrt', () => {
    const src = readFileSync(resolve(__dirname, '../../../utils/ui/firmamentPortalSpot.ts'), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    for (const forbidden of ['zoom', 'ZOOM', 'pan.', 'panLimit', 'drag']) {
      expect(code.includes(forbidden), forbidden).toBe(false)
    }
  })
})

describe('firmamentPortalVisibleShare', () => {
  it('meldet einen ganz sichtbaren Kreis als voll', () => {
    expect(firmamentPortalVisibleShare(500, 400, 100, 1002, 800)).toBeCloseTo(1, 2)
  })

  it('meldet den halben Kreis an der Kante als halb', () => {
    expect(firmamentPortalVisibleShare(0, 400, 100, 1002, 800)).toBeCloseTo(0.5, 2)
  })

  it('stimmt mit dem unabhaengigen Raster ueberein', () => {
    for (const [x, y] of [
      [40, 60],
      [980, 700],
      [-20, 400],
      [500, 10],
    ]) {
      expect(firmamentPortalVisibleShare(x, y, 120, 1002, 760)).toBeCloseTo(
        visibleByGrid(x, y, 120, 1002, 760),
        1,
      )
    }
  })

  it('meldet einen Kreis ohne Radius als nichts', () => {
    expect(firmamentPortalVisibleShare(500, 400, 0, 1002, 800)).toBe(0)
  })
})
