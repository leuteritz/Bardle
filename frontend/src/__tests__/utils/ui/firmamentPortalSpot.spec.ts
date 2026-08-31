import { describe, it, expect } from 'vitest'
import {
  firmamentPortalHitBox,
  firmamentPortalKeepOuts,
  firmamentPortalLabelSize,
  firmamentPortalLabelSpot,
  firmamentPortalRingR,
  firmamentPortalSpot,
} from '@/utils/ui/firmamentPortalSpot'
import { firmamentFitBox } from '@/utils/ui/firmamentLayout'
import {
  FIRMAMENT_PLATE_SPRITE_MARGIN,
  FIRMAMENT_PORTAL_DISC_CLEAR,
  FIRMAMENT_PORTAL_KEEPOUT_PAD,
  FIRMAMENT_PORTAL_LABEL_EDGE_PAD,
  FIRMAMENT_PORTAL_LABEL_H_EM,
  FIRMAMENT_PORTAL_LABEL_MAX_PX,
  FIRMAMENT_PORTAL_LABEL_MIN_PX,
  FIRMAMENT_PORTAL_LABEL_W_EM,
  FIRMAMENT_PORTAL_RING_MAX_PX,
  FIRMAMENT_PORTAL_RING_MIN_PX,
  FIRMAMENT_STAGE_MIN_H,
  FIRMAMENT_STAGE_MIN_W,
} from '@/config/constants'

/**
 * Das Portal steht im schwarzen Raum ausserhalb der Galaxienscheibe, und zwar
 * in JEDEM Universum an derselben Stelle: Ringmitte auf der rechten
 * Buehnenkante, auf der Mittellinie der Scheibe.
 *
 * Es stand einmal je Universum woanders. Das las sich als Unfall statt als
 * Absicht — der Ring ist auf jeder Zielaufloesung breiter als die schwarze
 * Gasse, also blieb der Winkelsuche ohnehin nur ein duenner Kranz von Lagen
 * dicht an der Kante, und gewuerfelt wurde faktisch die HOEHE des Anschnitts.
 * Diese Datei bindet, was seither gilt und was man im Code nicht sieht: der
 * Ring liegt wirklich draussen, er ist wirklich zur Haelfte zu sehen, und
 * weder er noch seine Beschriftung liegen unter einer Bedienflaeche.
 */

/** Die gemessenen Buehnenmasse — dieselbe Quelle wie `firmamentLayout.spec.ts`. */
const STAGES: Array<{ name: string; w: number; h: number }> = [
  { name: 'Full HD', w: 1002, h: 690.6 },
  { name: 'WUXGA', w: 1002, h: 791.4 },
  { name: '2K', w: 1422, h: 969 },
  { name: '4K', w: 2702, h: 1678.2 },
  { name: 'Boden', w: FIRMAMENT_STAGE_MIN_W, h: FIRMAMENT_STAGE_MIN_H },
]

/** Sichtbarer Anteil, UNABHAENGIG nachgerechnet: ein dichtes Punktraster statt
 *  einer Formel. Sonst prueft die Spec die Funktion gegen sich selbst. */
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

/** Abstand der Scheibenmitte zur naechsten Ecke eines Kaestchens. */
function boxDist(
  cx: number,
  cy: number,
  box: { cx: number; cy: number; w: number; h: number },
): number {
  return rectDist(cx, cy, {
    x0: box.cx - box.w / 2,
    y0: box.cy - box.h / 2,
    x1: box.cx + box.w / 2,
    y1: box.cy + box.h / 2,
  })
}

describe('firmamentPortalRingR', () => {
  it('bleibt auf jeder Buehne zwischen Boden und Deckel', () => {
    for (const s of STAGES) {
      const r = firmamentPortalRingR(s.w, s.h)
      expect(r, s.name).toBeGreaterThanOrEqual(FIRMAMENT_PORTAL_RING_MIN_PX)
      expect(r, s.name).toBeLessThanOrEqual(FIRMAMENT_PORTAL_RING_MAX_PX)
    }
  })

  /*
   * Die Gasse ist der Deckel, und sie ist NICHT dort am engsten, wo der
   * Bildschirm am kleinsten ist: WUXGA hat Full HDs Breite und 100 px mehr
   * Hoehe, also waechst die Scheibe und die Gasse faellt von 186 auf 135 px.
   */
  it('deckelt allein auf WUXGA und laesst alle anderen den vollen Wunsch', () => {
    for (const s of STAGES) {
      const lane = s.w / 2 - firmamentFitBox(s.w, s.h).r * FIRMAMENT_PORTAL_DISC_CLEAR
      const capped = firmamentPortalRingR(s.w, s.h) < lane + 0.001 && lane < s.h * 0.19
      expect(capped, s.name).toBe(s.name === 'WUXGA')
    }
    expect(Math.round(firmamentPortalRingR(1002, 690.6))).toBe(131)
    expect(Math.round(firmamentPortalRingR(1002, 791.4))).toBe(99)
    expect(Math.round(firmamentPortalRingR(1422, 969))).toBe(184)
    expect(Math.round(firmamentPortalRingR(2702, 1678.2))).toBe(260)
  })

  /* Boden und Deckel sind zwei Regeln fuer dieselbe Zahl. Kaemen sie sich in
     die Quere, gewaenne still der Boden — und der Ring liefe in die Platte. */
  it('laesst den Gassendeckel nirgends unter den Boden fallen', () => {
    for (const s of STAGES) {
      const lane = s.w / 2 - firmamentFitBox(s.w, s.h).r * FIRMAMENT_PORTAL_DISC_CLEAR
      expect(lane, s.name).toBeGreaterThanOrEqual(FIRMAMENT_PORTAL_RING_MIN_PX)
    }
  })
})

describe('firmamentPortalSpot — wo das Portal steht', () => {
  it('steht auf der rechten Kante, auf der Mittellinie der Scheibe', () => {
    for (const s of STAGES) {
      const fit = firmamentFitBox(s.w, s.h)
      const spot = firmamentPortalSpot(s.w, s.h)!
      expect(spot.x, s.name).toBe(s.w)
      expect(spot.y, s.name).toBeCloseTo(fit.cy, 6)
      expect(spot.r, s.name).toBeCloseTo(firmamentPortalRingR(s.w, s.h), 6)
    }
  })

  /* Nur eine Buehne ohne Mass gibt `null`. Ein Portal, das je nach Zustand da
     ist oder nicht, waere die Weiterreise ohne Weg. */
  it('gibt allein auf einer Buehne ohne Mass nichts zurueck', () => {
    expect(firmamentPortalSpot(0, 690)).toBeNull()
    expect(firmamentPortalSpot(1002, 0)).toBeNull()
    expect(firmamentPortalSpot(1002, 690.6)).not.toBeNull()
  })

  /* Angeschnitten ja, verschwunden nein — und der Anschnitt ist jetzt EXAKT die
     Haelfte statt eines je Universum anderen Bruchteils. */
  it('liegt genau zur Haelfte im Bild', () => {
    for (const s of STAGES) {
      const spot = firmamentPortalSpot(s.w, s.h)!
      expect(visibleByGrid(spot.x, spot.y, spot.r, s.w, s.h), s.name).toBeCloseTo(0.5, 2)
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
      const spot = firmamentPortalSpot(s.w, s.h)!
      const gap = Math.hypot(spot.x - fit.cx, spot.y - fit.cy) - spot.r
      expect(gap, s.name).toBeGreaterThanOrEqual(fit.r * FIRMAMENT_PORTAL_DISC_CLEAR - 0.001)
    }
    // Die Ableitung selbst: alles, was die Karte malt, liegt darunter.
    expect(FIRMAMENT_PORTAL_DISC_CLEAR).toBe(FIRMAMENT_PLATE_SPRITE_MARGIN)
  })

  it('liegt auf keiner Bedienflaeche', () => {
    for (const s of STAGES) {
      const spot = firmamentPortalSpot(s.w, s.h)!
      for (const k of firmamentPortalKeepOuts(s.w, s.h)) {
        expect(rectDist(spot.x, spot.y, k), s.name).toBeGreaterThanOrEqual(
          spot.r + FIRMAMENT_PORTAL_KEEPOUT_PAD,
        )
      }
    }
  })
})

describe('firmamentPortalLabelSpot — wohin es fuehrt', () => {
  it('haelt den Schriftgrad zwischen seinen Grenzen', () => {
    for (const s of STAGES) {
      const size = firmamentPortalLabelSize(firmamentPortalRingR(s.w, s.h))
      expect(size, s.name).toBeGreaterThanOrEqual(FIRMAMENT_PORTAL_LABEL_MIN_PX)
      expect(size, s.name).toBeLessThanOrEqual(FIRMAMENT_PORTAL_LABEL_MAX_PX)
    }
  })

  /* Die rechte Kante ist die ganze Harmonie: Werkzeugkasten, Legende und
     Auswahlkarte haengen an denselben 10 px. */
  it('steht rechtsbuendig auf derselben Kante wie die Bedienflaechen', () => {
    for (const s of STAGES) {
      const spot = firmamentPortalSpot(s.w, s.h)!
      const l = firmamentPortalLabelSpot(spot, s.w, s.h)
      expect(l.cx + l.w / 2, s.name).toBeCloseTo(s.w - FIRMAMENT_PORTAL_LABEL_EDGE_PAD, 6)
      // Das CSS baut GENAU dieses Kaestchen — deshalb steht es hier.
      expect(l.w, s.name).toBeCloseTo(FIRMAMENT_PORTAL_LABEL_W_EM * l.size, 6)
      expect(l.h, s.name).toBeCloseTo(FIRMAMENT_PORTAL_LABEL_H_EM * l.size, 6)
    }
  })

  it('bleibt im Bild, von der Scheibe und von jeder Bedienflaeche frei', () => {
    for (const s of STAGES) {
      const fit = firmamentFitBox(s.w, s.h)
      const spot = firmamentPortalSpot(s.w, s.h)!
      const l = firmamentPortalLabelSpot(spot, s.w, s.h)
      const pad = FIRMAMENT_PORTAL_LABEL_EDGE_PAD

      expect(l.cy - l.h / 2, s.name).toBeGreaterThanOrEqual(pad)
      expect(l.cy + l.h / 2, s.name).toBeLessThanOrEqual(s.h - pad)
      expect(boxDist(fit.cx, fit.cy, l), s.name).toBeGreaterThanOrEqual(
        fit.r * FIRMAMENT_PORTAL_DISC_CLEAR - 0.001,
      )
      for (const k of firmamentPortalKeepOuts(s.w, s.h)) {
        const hits =
          l.cx - l.w / 2 - FIRMAMENT_PORTAL_KEEPOUT_PAD < k.x1 &&
          l.cx + l.w / 2 + FIRMAMENT_PORTAL_KEEPOUT_PAD > k.x0 &&
          l.cy - l.h / 2 - FIRMAMENT_PORTAL_KEEPOUT_PAD < k.y1 &&
          l.cy + l.h / 2 + FIRMAMENT_PORTAL_KEEPOUT_PAD > k.y0
        expect(hits, s.name).toBe(false)
      }
    }
  })

  /*
   * Sie steht UNTER dem Ring — auf jeder Zielaufloesung. Die Klapp-Ausnahme ist
   * kein Geschmack, sondern der Fluchtweg der kleinsten Buehne: dort blieben
   * unter dem Ring nur 6,65 px bis zur Auswahlkarte statt der zugesagten zehn.
   */
  it('steht unter dem Ring und klappt allein auf der kleinsten Buehne darueber', () => {
    for (const s of STAGES) {
      const spot = firmamentPortalSpot(s.w, s.h)!
      const l = firmamentPortalLabelSpot(spot, s.w, s.h)
      expect(l.cy > spot.y, s.name).toBe(s.name !== 'Boden')
    }
  })
})

describe('firmamentPortalHitBox — ein Ziel fuer Ring und Schrift', () => {
  /*
   * Die Trefferflaeche IST der Anker der Hover-Karte: `RpgBadgeTooltip` misst
   * das erste Kind seines Slots und legt die Karte unter dessen Unterkante. Am
   * runden Knopf allein ging sie genau dort auf, wo die Beschriftung steht.
   */
  it('umschliesst Ringhaelfte und Beschriftung und endet an der Buehnenkante', () => {
    for (const s of STAGES) {
      const spot = firmamentPortalSpot(s.w, s.h)!
      const l = firmamentPortalLabelSpot(spot, s.w, s.h)
      const box = firmamentPortalHitBox(spot, l, s.w)

      expect(box.x1, s.name).toBe(s.w)
      expect(box.x0, s.name).toBeLessThanOrEqual(l.cx - l.w / 2 + 0.001)
      expect(box.x0, s.name).toBeLessThanOrEqual(spot.x - spot.r + 0.001)
      expect(box.y0, s.name).toBeLessThanOrEqual(Math.min(spot.y - spot.r, l.cy - l.h / 2) + 0.001)
      expect(box.y1, s.name).toBeGreaterThanOrEqual(
        Math.max(spot.y + spot.r, l.cy + l.h / 2) - 0.001,
      )
    }
  })

  it('bleibt vollstaendig im Bild', () => {
    for (const s of STAGES) {
      const spot = firmamentPortalSpot(s.w, s.h)!
      const l = firmamentPortalLabelSpot(spot, s.w, s.h)
      const box = firmamentPortalHitBox(spot, l, s.w)
      expect(box.x0, s.name).toBeGreaterThanOrEqual(0)
      expect(box.y0, s.name).toBeGreaterThanOrEqual(0)
      expect(box.y1, s.name).toBeLessThanOrEqual(s.h)
      expect(box.x1 - box.x0, s.name).toBeGreaterThan(0)
      expect(box.y1 - box.y0, s.name).toBeGreaterThan(0)
    }
  })
})
