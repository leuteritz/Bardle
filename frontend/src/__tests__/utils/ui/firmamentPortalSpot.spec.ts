import { describe, it, expect } from 'vitest'
import {
  firmamentPortalHitBox,
  firmamentPortalLabelSize,
  firmamentPortalLabelSpot,
  firmamentPortalRingR,
  firmamentPortalSpot,
  firmamentPortalVisibleShare,
} from '@/utils/ui/firmamentPortalSpot'
import { firmamentFitBox } from '@/utils/ui/firmamentLayout'
import { universes } from '@/config/progression/universes'
import {
  FIRMAMENT_PLATE_SPRITE_MARGIN,
  FIRMAMENT_PORTAL_DISC_CLEAR,
  FIRMAMENT_PORTAL_LABEL_CLEAR_STEPS,
  FIRMAMENT_PORTAL_LABEL_EDGE_PAD,
  FIRMAMENT_PORTAL_LABEL_H_EM,
  FIRMAMENT_PORTAL_LABEL_MAX_PX,
  FIRMAMENT_PORTAL_LABEL_MIN_PX,
  FIRMAMENT_PORTAL_LABEL_W_EM,
  FIRMAMENT_PORTAL_MIN_VISIBLE,
  FIRMAMENT_PORTAL_RING_MAX_PX,
  FIRMAMENT_PORTAL_RING_MIN_PX,
  FIRMAMENT_PORTAL_SHRINK_STEPS,
  FIRMAMENT_STAGE_MIN_H,
  FIRMAMENT_STAGE_MIN_W,
} from '@/config/constants'

/**
 * Das Portal steht im schwarzen Raum ausserhalb der Galaxienscheibe, an einer je
 * Universum anderen Stelle. Zwei Dinge muessen dabei immer gelten, und keines
 * davon sieht man im Code: es liegt wirklich draussen, und es ist wirklich zu
 * sehen. Die dritte Zusicherung — nicht unter einer Bedienflaeche — ist mit dem
 * HUD der Buehne entfallen.
 *
 * Die Streuung war einmal weg — ein fester Anker auf der rechten Buehnenkante,
 * gebaut auf ein Missverstaendnis („der Rand des Portals" meinte die FASSUNG,
 * nicht die Bildkante). Sie ist zurueck, und der Streuungstest unten ist der
 * Waechter dagegen, dass sie es nochmal wird.
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

/** Abstand eines Punktes zur naechsten Ecke eines Kaestchens. */
function boxDist(
  x: number,
  y: number,
  box: { cx: number; cy: number; w: number; h: number },
): number {
  return rectDist(x, y, {
    x0: box.cx - box.w / 2,
    y0: box.cy - box.h / 2,
    x1: box.cx + box.w / 2,
    y1: box.cy + box.h / 2,
  })
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
     Portale an derselben Stelle, waere „zufaellig" eine Behauptung. Genau das
     war einmal der Fall — ein fester Anker auf der rechten Kante. */
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
        // Und die Streifenintegration der Funktion trifft dasselbe Ergebnis.
        expect(
          firmamentPortalVisibleShare(spot.x, spot.y, spot.r, s.w, s.h),
          `${s.name} U${id}`,
        ).toBeCloseTo(share, 1)
      }
    }
  })

  it('gibt allein auf einer Buehne ohne Mass nichts zurueck', () => {
    expect(firmamentPortalSpot(1, 0, 690)).toBeNull()
    expect(firmamentPortalSpot(1, 1002, 0)).toBeNull()
    expect(firmamentPortalSpot(1, 1002, 690.6)).not.toBeNull()
  })
})

describe('firmamentPortalLabelSpot — wohin es fuehrt', () => {
  it('haelt den Schriftgrad zwischen seinen Grenzen und baut das feste Kaestchen', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)!
        const l = firmamentPortalLabelSpot(spot, s.w, s.h)
        expect(l.size, s.name).toBeGreaterThanOrEqual(FIRMAMENT_PORTAL_LABEL_MIN_PX)
        expect(l.size, s.name).toBeLessThanOrEqual(FIRMAMENT_PORTAL_LABEL_MAX_PX)
        expect(l.size, s.name).toBe(firmamentPortalLabelSize(spot.r))
        // Das CSS baut GENAU dieses Kaestchen — deshalb steht es hier.
        expect(l.w, s.name).toBeCloseTo(FIRMAMENT_PORTAL_LABEL_W_EM * l.size, 6)
        expect(l.h, s.name).toBeCloseTo(FIRMAMENT_PORTAL_LABEL_H_EM * l.size, 6)
      }
    }
  })

  it('bleibt vollstaendig im Bild', () => {
    const pad = FIRMAMENT_PORTAL_LABEL_EDGE_PAD
    for (const s of STAGES) {
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)!
        const l = firmamentPortalLabelSpot(spot, s.w, s.h)
        expect(l.cx - l.w / 2, `${s.name} U${id}`).toBeGreaterThanOrEqual(pad - 0.001)
        expect(l.cx + l.w / 2, `${s.name} U${id}`).toBeLessThanOrEqual(s.w - pad + 0.001)
        expect(l.cy - l.h / 2, `${s.name} U${id}`).toBeGreaterThanOrEqual(pad - 0.001)
        expect(l.cy + l.h / 2, `${s.name} U${id}`).toBeLessThanOrEqual(s.h - pad + 0.001)
      }
    }
  })

  /* Sie haengt am Ring: die GEBUNDENE Achse steht auf `_GAP_EM` von seiner
     Kante, sonst liefe die Beschriftung von dem weg, was sie benennt. */
  it('haelt den Abstand zum Ring auf der gebundenen Achse', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)!
        const l = firmamentPortalLabelSpot(spot, s.w, s.h)
        const bound =
          l.side === 'below' || l.side === 'above'
            ? Math.abs(l.cy - spot.y) - l.h / 2
            : Math.abs(l.cx - spot.x) - l.w / 2
        expect(bound, `${s.name} U${id} ${l.side}`).toBeGreaterThanOrEqual(spot.r - 0.001)
      }
    }
  })

  /* Die Leiter darf nur greifen, wo sie muss: Schrift auf dem Schattenteich der
     Platte ist gut lesbar, Schrift MITTEN auf den Galaxienkoerpern nicht. Die
     unterste Stufe ist der Notausgang, kein Normalfall. */
  it('bleibt fast immer jenseits der Kartenkante und nie hinter der letzten Stufe', () => {
    const outer = FIRMAMENT_PORTAL_LABEL_CLEAR_STEPS[0]
    const last = FIRMAMENT_PORTAL_LABEL_CLEAR_STEPS.at(-1)!
    let tight = 0
    let total = 0
    for (const s of STAGES) {
      const fit = firmamentFitBox(s.w, s.h)
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)!
        const l = firmamentPortalLabelSpot(spot, s.w, s.h)
        const d = boxDist(fit.cx, fit.cy, l)
        total++
        if (d < fit.r * outer - 0.001) tight++
        expect(d, `${s.name} U${id}`).toBeGreaterThanOrEqual(fit.r * last - 0.001)
      }
    }
    expect(tight / total).toBeLessThan(0.25)
  })
})

describe('firmamentPortalHitBox — ein Ziel fuer Ring und Schrift', () => {
  /*
   * Die Trefferflaeche IST der Anker der Hover-Karte: `RpgBadgeTooltip` misst
   * das erste Kind seines Slots und legt die Karte unter dessen Unterkante. Am
   * runden Knopf allein ging sie genau dort auf, wo die Beschriftung steht.
   */
  it('umschliesst Ring und Beschriftung, soweit beide im Bild liegen', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)!
        const l = firmamentPortalLabelSpot(spot, s.w, s.h)
        const box = firmamentPortalHitBox(spot, l, s.w, s.h)
        const want = {
          x0: Math.min(spot.x - spot.r, l.cx - l.w / 2),
          y0: Math.min(spot.y - spot.r, l.cy - l.h / 2),
          x1: Math.max(spot.x + spot.r, l.cx + l.w / 2),
          y1: Math.max(spot.y + spot.r, l.cy + l.h / 2),
        }
        expect(box.x0, `${s.name} U${id}`).toBeCloseTo(Math.max(0, want.x0), 6)
        expect(box.y0, `${s.name} U${id}`).toBeCloseTo(Math.max(0, want.y0), 6)
        expect(box.x1, `${s.name} U${id}`).toBeCloseTo(Math.min(s.w, want.x1), 6)
        expect(box.y1, `${s.name} U${id}`).toBeCloseTo(Math.min(s.h, want.y1), 6)
      }
    }
  })

  /* Auf ALLEN vier Seiten geklemmt: die Stelle ist je Universum eine andere,
     jede Kante kann die angeschnittene sein. Ein Anker, der ueber den Rand
     hinausreicht, zoege die Karte samt Pfeil aus dem Reiter heraus. */
  it('bleibt vollstaendig im Bild und behaelt eine Flaeche', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spot = firmamentPortalSpot(id, s.w, s.h)!
        const l = firmamentPortalLabelSpot(spot, s.w, s.h)
        const box = firmamentPortalHitBox(spot, l, s.w, s.h)
        expect(box.x0, `${s.name} U${id}`).toBeGreaterThanOrEqual(0)
        expect(box.y0, `${s.name} U${id}`).toBeGreaterThanOrEqual(0)
        expect(box.x1, `${s.name} U${id}`).toBeLessThanOrEqual(s.w)
        expect(box.y1, `${s.name} U${id}`).toBeLessThanOrEqual(s.h)
        expect(box.x1 - box.x0, `${s.name} U${id}`).toBeGreaterThan(spot.r)
        expect(box.y1 - box.y0, `${s.name} U${id}`).toBeGreaterThan(spot.r)
      }
    }
  })
})
