import { describe, it, expect } from 'vitest'
import {
  canPayMixed,
  mixedCostBlock,
  payMixed,
  type MixedCost,
  type Purse,
} from '@/utils/game/mixedCost'

/*
 * Der Preis mit drei Beinen — und die eine Eigenschaft, die ihn tragfaehig
 * macht: er faellt ganz oder gar nicht.
 *
 * Das Muster stand vor diesem Helfer neunmal von Hand im Code, jedes Mal in
 * derselben Reihenfolge. Neun Fassungen sind acht Gelegenheiten, sie zu
 * vertauschen — und die vertauschte Fassung zieht Chimes ab und scheitert
 * danach am Material. Genau dieser Fall steht unten als Zusicherung.
 */

const purse = (over: Partial<Purse> = {}): Purse => ({
  chimes: 1000,
  meeps: 100,
  stock: { comet_ice: 10, star_iron: 5 },
  ...over,
})

describe('mixedCostBlock — welches Bein nicht traegt', () => {
  it('nennt nichts, wenn alle tragen', () => {
    expect(mixedCostBlock({ chimes: 500, meeps: 50, materials: { comet_ice: 4 } }, purse())).toBe(
      null,
    )
  })

  it('nennt das ERSTE Bein in Zahlungsreihenfolge, nicht irgendeines', () => {
    const cost: MixedCost = { chimes: 5000, meeps: 500, materials: { comet_ice: 99 } }
    expect(mixedCostBlock(cost, purse())).toBe('chimes')
    expect(mixedCostBlock(cost, purse({ chimes: 1e9 }))).toBe('meeps')
    expect(mixedCostBlock(cost, purse({ chimes: 1e9, meeps: 1e9 }))).toBe('materials')
  })

  it('uebergeht ein Bein, das gar nicht gefordert ist', () => {
    expect(mixedCostBlock({ materials: { star_iron: 1 } }, purse({ chimes: 0, meeps: 0 }))).toBe(
      null,
    )
  })

  it('nennt ein fehlendes Material auch dann, wenn das Lager es gar nicht kennt', () => {
    expect(mixedCostBlock({ materials: { dark_matter: 1 } }, purse())).toBe('materials')
  })

  it('beantwortet canPayMixed als dieselbe Rechnung', () => {
    const cost: MixedCost = { chimes: 500, materials: { comet_ice: 4 } }
    expect(canPayMixed(cost, purse())).toBe(true)
    expect(canPayMixed(cost, purse({ chimes: 1 }))).toBe(false)
  })
})

describe('payMixed — alles oder nichts', () => {
  it('zahlt beide Waehrungen, wenn das Material faellt', () => {
    let paid: [number, number] | null = null
    const taken: Record<string, number>[] = []
    const ok = payMixed(
      { chimes: 500, meeps: 50, materials: { comet_ice: 4 } },
      purse(),
      (cost) => {
        taken.push(cost)
        return true
      },
      'forge',
      (chimes, meeps) => {
        paid = [chimes, meeps]
      },
    )
    expect(ok).toBe(true)
    expect(paid).toEqual([500, 50])
    expect(taken).toEqual([{ comet_ice: 4 }])
  })

  /*
   * Der teure Fall. `removeMaterials()` ist der einzige Schritt, der noch
   * fehlschlagen kann — deshalb steht er VOR der Zahlung, und deshalb steht
   * diese Zusicherung hier.
   */
  it('zieht nichts ab, wenn das Material im letzten Moment doch nicht reicht', () => {
    let paidCalls = 0
    const ok = payMixed(
      { chimes: 500, meeps: 50, materials: { comet_ice: 4 } },
      purse(),
      () => false,
      'forge',
      () => {
        paidCalls += 1
      },
    )
    expect(ok).toBe(false)
    expect(paidCalls).toBe(0)
  })

  it('greift gar nicht erst zum Lager, wenn schon die Chimes fehlen', () => {
    let touched = false
    const ok = payMixed(
      { chimes: 5000, materials: { comet_ice: 4 } },
      purse(),
      () => {
        touched = true
        return true
      },
      'forge',
      () => {},
    )
    expect(ok).toBe(false)
    expect(touched).toBe(false)
  })

  it('zahlt einen reinen Meep-Preis ohne Umweg ueber das Lager', () => {
    let touched = false
    let paid: [number, number] | null = null
    const ok = payMixed(
      { meeps: 30 },
      purse(),
      () => {
        touched = true
        return true
      },
      'forge',
      (chimes, meeps) => {
        paid = [chimes, meeps]
      },
    )
    expect(ok).toBe(true)
    expect(touched).toBe(false)
    expect(paid).toEqual([0, 30])
  })
})
