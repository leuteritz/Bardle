import { describe, it, expect } from 'vitest'
import {
  firmamentOfferPortalSpots,
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
  FIRMAMENT_OFFER_PORTAL_GAP,
  FIRMAMENT_OFFER_PORTAL_RING_K,
  FIRMAMENT_STAGE_MIN_H,
  FIRMAMENT_STAGE_MIN_W,
  PROVIDENCE_OFFER_SIZE,
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

/** Die gemessenen Buehnenmasse — dieselbe Quelle wie `firmamentLayout.spec.ts`:
 *  `CONTENT_HEIGHT` minus `FIRMAMENT_CREST_BAND_H` (112), Breite minus
 *  `FIRMAMENT_RAIL_ZONE_W` (268). Sie standen hier einmal 30 px breiter und
 *  20 px hoeher — die Zahlen von vor dem Wachstum des Kopfbands und der
 *  Leistenzone, und niemandem faellt so etwas auf: die Portale sassen weiter
 *  richtig, nur gegen eine Buehne, die es nicht mehr gab. */
const STAGES: Array<{ name: string; w: number; h: number }> = [
  { name: 'Full HD', w: 972, h: 670.6 },
  { name: 'WUXGA', w: 972, h: 771.4 },
  { name: '2K', w: 1392, h: 949 },
  { name: '4K', w: 2672, h: 1658.2 },
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

/**
 * DIE DREI ANGEBOTSPORTALE
 *
 * Auf der laufenden Bahn steht kein Abflugportal, sondern das Angebot des
 * Aufbruchs — ein Portal je gezogener Karte. Sie teilen sich denselben schwarzen
 * Raum, den sonst eines allein hat, und damit kommt eine dritte Sperre dazu, die
 * die Einzelfassung nicht kennt: sie selbst.
 *
 * Der wichtigste Test hier ist der letzte: dass die VOLLE Groesse ueberall
 * traegt. Er ist der Waechter gegen ein Anheben von `_RING_K` — genau die
 * Aenderung, die im Bild gut aussieht und auf WUXGA reihenweise Portale
 * schrumpfen laesst, ohne dass es jemand bemerkt.
 */
describe('firmamentOfferPortalSpots — die drei Wege des Aufbruchs', () => {
  /** Drei verschiedene Ziele, so wie `rollOffer` sie zieht: nie das laufende. */
  const targetsFor = (universe: number) =>
    IDS.filter((id) => id !== universe).slice(0, PROVIDENCE_OFFER_SIZE)

  it('ist deterministisch und unabhaengig von der Aufrufreihenfolge', () => {
    for (const s of STAGES) {
      const forward = IDS.map((id) => firmamentOfferPortalSpots(id, targetsFor(id), s.w, s.h))
      const backward = [...IDS]
        .reverse()
        .map((id) => firmamentOfferPortalSpots(id, targetsFor(id), s.w, s.h))
      expect(forward, s.name).toEqual([...backward].reverse())
    }
  })

  /* Lieber gedraengt als eines weniger: eine Karte ohne Tuer waere ein Angebot,
     das man nicht annehmen kann. Dieselbe Regel, aus der die Schrumpfleiter der
     Einzelfassung entstand. */
  it('liefert nie weniger Stellen als Ziele', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const targets = targetsFor(id)
        expect(
          firmamentOfferPortalSpots(id, targets, s.w, s.h),
          `${s.name} U${id}`,
        ).toHaveLength(targets.length)
      }
    }
  })

  it('legt jedes jenseits der Kartenkante ab', () => {
    for (const s of STAGES) {
      const fit = firmamentFitBox(s.w, s.h)
      for (const id of IDS) {
        for (const spot of firmamentOfferPortalSpots(id, targetsFor(id), s.w, s.h)) {
          const gap = Math.hypot(spot.x - fit.cx, spot.y - fit.cy) - spot.r
          expect(gap, `${s.name} U${id}`).toBeGreaterThanOrEqual(
            fit.r * FIRMAMENT_PORTAL_DISC_CLEAR - 0.001,
          )
        }
      }
    }
  })

  it('haelt jedes zu mehr als der Haelfte im Bild', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        for (const spot of firmamentOfferPortalSpots(id, targetsFor(id), s.w, s.h)) {
          // Unabhaengig nachgerechnet, nicht mit der Streifenintegration der
          // Funktion selbst — sonst prueft die Spec sie gegen sich.
          expect(
            visibleByGrid(spot.x, spot.y, spot.r, s.w, s.h),
            `${s.name} U${id}`,
          ).toBeGreaterThanOrEqual(FIRMAMENT_PORTAL_MIN_VISIBLE - 0.02)
        }
      }
    }
  })

  it('haelt sie voneinander weg', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spots = firmamentOfferPortalSpots(id, targetsFor(id), s.w, s.h)
        for (let i = 0; i < spots.length; i++) {
          for (let j = i + 1; j < spots.length; j++) {
            const d = Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y)
            expect(d, `${s.name} U${id}`).toBeGreaterThanOrEqual(
              (spots[i].r + spots[j].r) * FIRMAMENT_OFFER_PORTAL_GAP - 0.001,
            )
          }
        }
      }
    }
  })

  /* Alle drei tragen dieselbe Groesse: drei verschieden grosse Portale
     nebeneinander lesen sich als Rangfolge, die es nicht gibt. */
  it('gibt allen dieselbe Groesse', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spots = firmamentOfferPortalSpots(id, targetsFor(id), s.w, s.h)
        for (const spot of spots) expect(spot.r, `${s.name} U${id}`).toBeCloseTo(spots[0].r, 6)
      }
    }
  })

  /*
   * DER Test dieses Blocks. `_RING_K` ist die groesste Stufe, die auf ALLEN
   * Buehnen und allen zehn Universen drei Stellen findet, ohne dass die
   * Schrumpfleiter greift — gemessen kippt es zwischen 0,92 und 1,00, und zwar
   * auf WUXGA. Wer die Zahl anhebt, weil die Portale groesser schoener waeren,
   * bricht hier; im Bild faellt es nicht auf, weil ein geschrumpftes Portal
   * genauso aussieht wie ein kleines.
   */
  it('behaelt ueberall die volle Groesse — die Schrumpfleiter greift nie', () => {
    for (const s of STAGES) {
      const full = firmamentPortalRingR(s.h) * FIRMAMENT_OFFER_PORTAL_RING_K
      for (const id of IDS) {
        const spots = firmamentOfferPortalSpots(id, targetsFor(id), s.w, s.h)
        expect(spots[0].r, `${s.name} U${id}`).toBeCloseTo(full, 6)
      }
    }
  })

  /* Und sie sind KLEINER als das eine Abflugportal — sie teilen sich den Raum,
     den es allein hat. */
  it('bleibt unter der Groesse des Abflugportals', () => {
    for (const s of STAGES) {
      const spots = firmamentOfferPortalSpots(1, targetsFor(1), s.w, s.h)
      expect(spots[0].r, s.name).toBeLessThan(firmamentPortalRingR(s.h))
    }
  })
})

/**
 * Die Beschriftungen der drei — sie weichen jetzt auch den NACHBARN aus.
 *
 * Die Kartenscheibe war bisher die einzige Sperre auf der freien Achse; ein
 * Kaestchen auf einem Nachbarring waere Schrift auf einem leuchtenden Koerper.
 * Und die Trefferflaechen duerfen sich nicht ueberschneiden: sie sind zugleich
 * die Anker der Hover-Karten, und zwei ueberlappende Anker sind zwei Karten am
 * falschen Ort.
 */
describe('firmamentPortalLabelSpot — mit Nachbarn', () => {
  const targetsFor = (universe: number) =>
    IDS.filter((id) => id !== universe).slice(0, PROVIDENCE_OFFER_SIZE)

  it('legt keine Beschriftung auf einen Nachbarring', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spots = firmamentOfferPortalSpots(id, targetsFor(id), s.w, s.h)
        const labels = spots.map((spot, i) =>
          firmamentPortalLabelSpot(
            spot,
            s.w,
            s.h,
            spots.filter((_, j) => j !== i),
          ),
        )
        for (let i = 0; i < spots.length; i++) {
          for (let j = 0; j < spots.length; j++) {
            if (i === j) continue
            expect(boxDist(spots[j].x, spots[j].y, labels[i]), `${s.name} U${id}`).toBeGreaterThan(
              0,
            )
          }
        }
      }
    }
  })

  it('haelt die drei Trefferflaechen disjunkt', () => {
    for (const s of STAGES) {
      for (const id of IDS) {
        const spots = firmamentOfferPortalSpots(id, targetsFor(id), s.w, s.h)
        const boxes = spots.map((spot, i) =>
          firmamentPortalHitBox(
            spot,
            firmamentPortalLabelSpot(
              spot,
              s.w,
              s.h,
              spots.filter((_, j) => j !== i),
            ),
            s.w,
            s.h,
          ),
        )
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]
            const b = boxes[j]
            const overlaps = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
            expect(overlaps, `${s.name} U${id} ${i}/${j}`).toBe(false)
          }
        }
      }
    }
  })
})
