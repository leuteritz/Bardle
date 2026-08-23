import { describe, it, expect } from 'vitest'
import {
  voyageBerthsOf,
  assignVoyageBerths,
  pinKeyOf,
  pinStampOf,
  type VoyagePinEntry,
} from '@/utils/game/voyageSites'
import { VOYAGE_BERTH_MIN_SEPARATION, VOYAGE_SITE_SLOTS } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import { generateGalaxyDots } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import type { AvailableExpeditionSlot, ExpeditionMission } from '@/types'

/**
 * Die Karte lebt davon, dass eine Marke dort bleibt, wo der Spieler sie gesehen
 * hat. Das ist keine Kosmetik: er klickt einen Vertrag an, schickt ihn los und
 * erwartet, die Mission an derselben Stelle aufbrechen zu sehen. Diese Spec
 * bindet genau das — plus die beiden Eigenschaften, ohne die es nicht hält
 * (Determinismus und Monotonie).
 */

function record(galaxy: number, attempts = 4): CompletedGalaxyRecord {
  return {
    galaxy,
    mapSeed: galaxy * 7919 + 13,
    themeIndex: galaxy % 20,
    attemptResults: Array.from({ length: attempts }, (_, i) =>
      i % 3 === 2 ? 'failed' : 'rescued',
    ),
    durationSeconds: 600,
    completedAt: 0,
  }
}

function entry(pinKey: string): VoyagePinEntry {
  return { pinKey, stamp: pinStampOf(pinKey) }
}

/** Eine Slot-ID im echten Format aus `_spawnOneExpedition`. */
function slotId(tier: string, now: number, rand: number): string {
  return `avail-${tier}-${now}-${rand}`
}

describe('voyageBerthsOf — Plätze jenseits der Geschichte', () => {
  it('liefert genau VOYAGE_SITE_SLOTS Plätze', () => {
    expect(voyageBerthsOf(record(3)).length).toBe(VOYAGE_SITE_SLOTS)
  })

  it('ist deterministisch — derselbe Datensatz, dieselben Punkte', () => {
    const a = voyageBerthsOf(record(7))
    const b = voyageBerthsOf(record(7))
    expect(a).toEqual(b)
  })

  it('hält jeden Platz im zeichenbaren Feld', () => {
    for (const g of [1, 5, 12, 30]) {
      for (const berth of voyageBerthsOf(record(g))) {
        expect(berth.x).toBeGreaterThanOrEqual(0.06)
        expect(berth.x).toBeLessThanOrEqual(0.94)
        expect(berth.y).toBeGreaterThanOrEqual(0.06)
        expect(berth.y).toBeLessThanOrEqual(0.94)
      }
    }
  })

  /**
   * Die Zusage, auf der die ganze Karte steht.
   *
   * `generateGalaxyDots` STREBT 0.085 an und gibt nach acht Versuchen auf: in
   * der dichtesten Galaxie lagen zwei aufeinanderfolgende Punkte gemessen
   * 25.5 px auseinander, bei einer Klickfläche von 36 px also zwei Häfen, die
   * sich decken. Deshalb wählt `voyageBerthsOf` seine Plätze aus einem eigenen
   * Pool, statt den Zug weiterzuzählen — und DIESE Auswahl garantiert einen
   * Abstand. `voyagesAtlasLayout.spec.ts` rechnet ihn in Pixel um.
   *
   * Über 20 Galaxien und jede Sternzahl, die ein Spielstand erreicht: von drei
   * Versuchen bis 45 (GALAXY_STARS_MAX 36 plus Fehlversuche).
   */
  it('hält jeden Platz von jedem anderen fern', () => {
    let worst = Number.POSITIVE_INFINITY
    let where = ''
    for (let g = 1; g <= 20; g++) {
      for (const attempts of [3, 4, 6, 8, 12, 20, 28, 36, 45]) {
        const berths = voyageBerthsOf(record(g, attempts))
        expect(berths.length).toBe(VOYAGE_SITE_SLOTS)
        for (let i = 0; i < berths.length; i++) {
          for (let j = i + 1; j < berths.length; j++) {
            const d = Math.hypot(berths[i].x - berths[j].x, berths[i].y - berths[j].y)
            if (d < worst) {
              worst = d
              where = `Galaxie ${g}, ${attempts} Versuche`
            }
          }
        }
      }
    }
    expect(worst, `engster Platzabstand ${worst} bei ${where}`).toBeGreaterThanOrEqual(
      VOYAGE_BERTH_MIN_SEPARATION,
    )
  })

  it('hält jeden Platz von jedem geretteten Stern fern', () => {
    // Die Geschichte ist die Startmenge des Samplings — sonst läge eine
    // Vertragsmarke auf einem gemalten Sternkörper und man wüsste nicht, was
    // man anklickt.
    let worst = Number.POSITIVE_INFINITY
    let where = ''
    for (let g = 1; g <= 20; g++) {
      for (const attempts of [3, 8, 20, 36, 45]) {
        const rec = record(g, attempts)
        const berths = voyageBerthsOf(rec)
        const { dots } = generateGalaxyDots(rec.mapSeed, attempts + 1)
        for (const b of berths) {
          for (let i = 0; i < attempts; i++) {
            const d = Math.hypot(b.x - dots[i].x, b.y - dots[i].y)
            if (d < worst) {
              worst = d
              where = `Galaxie ${g}, ${attempts} Versuche`
            }
          }
        }
      }
    }
    expect(worst, `engster Abstand zur Geschichte ${worst} bei ${where}`).toBeGreaterThanOrEqual(
      VOYAGE_BERTH_MIN_SEPARATION,
    )
  })

  it('trägt Schlüssel, die die Galaxie nennen', () => {
    const berths = voyageBerthsOf(record(9))
    expect(berths[0].key).toBe('9:0')
    expect(new Set(berths.map((b) => b.key)).size).toBe(berths.length)
  })

  /**
   * Der Grund für das ganze Modell: die Geschichte behält ihre Punkte, egal wie
   * viele Ankerplätze dahinter angefordert werden. Bräche diese Präfixstabilität,
   * verschöben sich rückwirkend alle archivierten Galaxiekarten.
   */
  it('lässt die Punkte der Geschichte unberührt', async () => {
    const { generateGalaxyDots } = await import(
      '@/components/bottom/minimap/minimapGalaxyGeometry'
    )
    const rec = record(11, 6)
    const history = generateGalaxyDots(rec.mapSeed, rec.attemptResults.length + 1)
    const withBerths = generateGalaxyDots(
      rec.mapSeed,
      rec.attemptResults.length + 1 + VOYAGE_SITE_SLOTS,
    )
    expect(withBerths.spawn).toEqual(history.spawn)
    expect(withBerths.dots.slice(0, history.dots.length)).toEqual(history.dots)
  })
})

describe('assignVoyageBerths — kollisionsfrei, deterministisch, monoton', () => {
  const three = [
    entry(slotId('common', 1_000, 11)),
    entry(slotId('rare', 2_000, 22)),
    entry(slotId('epic', 3_000, 33)),
  ]

  it('gibt jedem Eintrag genau einen Platz', () => {
    const pins = assignVoyageBerths(three)
    expect(pins.size).toBe(3)
    for (const berth of pins.values()) {
      expect(berth).toBeGreaterThanOrEqual(0)
      expect(berth).toBeLessThan(VOYAGE_SITE_SLOTS)
    }
  })

  it('legt nie zwei Einträge auf denselben Platz', () => {
    const many = Array.from({ length: 10 }, (_, i) => entry(slotId('rare', 1_000 + i, i)))
    const pins = assignVoyageBerths(many)
    expect(new Set(pins.values()).size).toBe(10)
  })

  it('ist unabhängig von der Reihenfolge der Eingabe', () => {
    const forward = assignVoyageBerths(three)
    const backward = assignVoyageBerths([...three].reverse())
    expect(Object.fromEntries(backward)).toEqual(Object.fromEntries(forward))
  })

  /**
   * Von innen nach aussen: `voyageBerthsOf` sortiert seine Plätze nach
   * Isoliertheit, Platz 0 ist der einsamste. Zwei Verträge sollen deshalb die
   * beiden freiesten Ecken bekommen, nicht zwei zufällige.
   */
  it('vergibt die einsamsten Plätze zuerst', () => {
    const pins = assignVoyageBerths(three)
    expect([...pins.values()].sort((a, b) => a - b)).toEqual([0, 1, 2])
  })

  /** Ein neuer Vertrag darf keine einzige bestehende Marke verschieben. */
  it('verschiebt beim Hinzufügen keinen bestehenden Eintrag', () => {
    let current = [...three]
    const before = assignVoyageBerths(current)
    for (let i = 0; i < 7; i++) {
      current = [...current, entry(slotId('common', 10_000 + i * 1_000, i))]
      const after = assignVoyageBerths(current)
      for (const [key, berth] of before) {
        expect(after.get(key), `${key} ist gewandert`).toBe(berth)
      }
    }
  })

  it('lässt einen Eintrag ohne Stempel keinen echten Vertrag verdrängen', () => {
    // Ganz hinten in der Reihe: die Vergabe laeuft von innen nach aussen, wer
    // vorn stuende, schoebe alle anderen um einen Platz.
    const seeded = entry('badgelab-exp-1-0')
    expect(seeded.stamp).toBe(Number.MAX_SAFE_INTEGER)
    const withReal = assignVoyageBerths([...three, seeded])
    for (const [key, berth] of assignVoyageBerths(three)) {
      expect(withReal.get(key)).toBe(berth)
    }
  })

  it('überlappt sichtbar statt zu verschwinden, wenn mehr Einträge als Plätze kommen', () => {
    const over = Array.from({ length: VOYAGE_SITE_SLOTS + 3 }, (_, i) =>
      entry(slotId('epic', 1_000 + i, i)),
    )
    const pins = assignVoyageBerths(over)
    expect(pins.size).toBe(over.length)
    for (const berth of pins.values()) {
      expect(berth).toBeGreaterThanOrEqual(0)
      expect(berth).toBeLessThan(VOYAGE_SITE_SLOTS)
    }
  })

  it('kommt mit null Plätzen klar', () => {
    expect(assignVoyageBerths(three, 0).size).toBe(0)
  })
})

describe('pinKeyOf — der Vertrag und die Mission sind derselbe Ort', () => {
  const id = slotId('rare', 4_242, 7)

  const offer = { id, galaxy: 3 } as AvailableExpeditionSlot
  const mission = { id: `exp-${id}-9999`, configId: id, galaxy: 3 } as ExpeditionMission

  it('gibt beiden denselben Schlüssel', () => {
    expect(pinKeyOf(offer)).toBe(id)
    expect(pinKeyOf(mission)).toBe(id)
  })

  it('hält damit den Platz über das Absenden hinweg', () => {
    const others = [entry(slotId('common', 1_000, 1)), entry(slotId('epic', 2_000, 2))]
    const asOffer = assignVoyageBerths([...others, entry(pinKeyOf(offer))])
    const asMission = assignVoyageBerths([...others, entry(pinKeyOf(mission))])
    expect(asMission.get(id)).toBe(asOffer.get(id))
  })

  it('fällt für eine Mission ohne configId auf ihre eigene ID zurück', () => {
    const seeded = { id: 'badgelab-exp-1-0', configId: '' } as ExpeditionMission
    expect(pinKeyOf(seeded)).toBe('badgelab-exp-1-0')
  })
})

describe('pinStampOf', () => {
  it('liest die Auslegezeit aus der Slot-ID', () => {
    expect(pinStampOf(slotId('common', 1_700_000, 42))).toBe(1_700_000)
    expect(pinStampOf(slotId('epic', 99, 1))).toBe(99)
  })

  it('sortiert alles, was dem Muster nicht folgt, ans Ende', () => {
    expect(pinStampOf('badgelab-exp-1-0')).toBe(Number.MAX_SAFE_INTEGER)
    expect(pinStampOf('nonsense')).toBe(Number.MAX_SAFE_INTEGER)
    expect(pinStampOf('')).toBe(Number.MAX_SAFE_INTEGER)
  })
})
