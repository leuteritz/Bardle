import { describe, it, expect } from 'vitest'
import { HUD_CARD_RANK, orderHudCards, pickHudCardFocus } from '@/utils/ui/hudCardFocus'
import type { HudCardCandidate, HudCardId } from '@/types'

/*
 * Der Vertrag der Fokusregel: von den Karten der linken Spalte steht genau EINE
 * aufgerissen, alle anderen als Zeile.
 *
 * Warum das eine Spec braucht: vorher stand jede voll da, alle sechs zugleich —
 * gemessen rund 774 px auf einem 1000er Viewport, also über zwei Drittel der
 * Bühne, genau dort, wo der Orbit läuft. Die Regel, die das ablöst, ist eine
 * Rangleiter, und eine Rangleiter, die niemand nachrechnet, driftet.
 */

function c(id: HudCardId, rank: number, remainingMs = Infinity): HudCardCandidate {
  return { id, rank, remainingMs }
}

const WAYFINDER = c('wayfinder', -1)

describe('Fokus: genau eine Karte steht aufgerissen', () => {
  it('ohne Kandidaten gibt es keinen Fokus', () => {
    expect(pickHudCardFocus([])).toBeNull()
  })

  it('der Wayfinder wird NIE Fokus — er faltet nicht und rangiert nicht mit', () => {
    // Er steht immer, ganz oben, und hängt als einziger in der HUD-Kontur.
    expect(pickHudCardFocus([WAYFINDER])).toBeNull()
    expect(pickHudCardFocus([WAYFINDER, c('omen', HUD_CARD_RANK.standing)])).toBe('omen')
  })

  it('steht nur eine flüchtige Karte, ist SIE der Fokus', () => {
    expect(pickHudCardFocus([WAYFINDER, c('drifter', HUD_CARD_RANK.fleeting, 9000)])).toBe(
      'drifter',
    )
  })

  it('die Wahl am Cairn schlägt alles', () => {
    const all = [
      WAYFINDER,
      c('landfall', HUD_CARD_RANK.decision, 12000),
      c('void', HUD_CARD_RANK.emergency, 2000),
      c('drifter', HUD_CARD_RANK.fleeting, 3000),
      c('omen', HUD_CARD_RANK.standing),
      c('autopick', HUD_CARD_RANK.receipt, 4000),
    ]
    // Drei Knöpfe, die man ohne Aufriss nicht bedienen kann — das schlägt jede
    // Uhr, auch die kürzeste.
    expect(pickHudCardFocus(all)).toBe('landfall')
  })

  it('ein Void kurz vor der Sonne schlägt den Drifter, ein Void auf dem Weg nicht', () => {
    const drifter = c('drifter', HUD_CARD_RANK.fleeting, 8000)
    expect(pickHudCardFocus([WAYFINDER, drifter, c('void', HUD_CARD_RANK.emergency, 9000)])).toBe(
      'void',
    )
    expect(pickHudCardFocus([WAYFINDER, drifter, c('void', HUD_CARD_RANK.threat, 40000)])).toBe(
      'drifter',
    )
  })

  it('das Stehende verliert gegen das Flüchtige', () => {
    /* Der Void ist quasi-dauerhaft: 26–44 s Nachschub bei 46 s Reisezeit. Ginge
       der Fokus nach Bedrohungsgrad, hielte er ihn fast immer und die Faltung
       zeigte nie etwas anderes. */
    const out = pickHudCardFocus([
      WAYFINDER,
      c('void', HUD_CARD_RANK.threat, 30000),
      c('omen', HUD_CARD_RANK.standing, 240000),
      c('drifter', HUD_CARD_RANK.fleeting, 11000),
    ])
    expect(out).toBe('drifter')
  })

  it('die Quittung steht ganz hinten — sie meldet etwas, das schon geschehen ist', () => {
    expect(
      pickHudCardFocus([
        WAYFINDER,
        c('autopick', HUD_CARD_RANK.receipt, 3000),
        c('omen', HUD_CARD_RANK.standing, 500000),
      ]),
    ).toBe('omen')
  })

  it('bei gleichem Rang gewinnt die kürzere Restzeit', () => {
    expect(
      pickHudCardFocus([
        c('drifter', HUD_CARD_RANK.fleeting, 9000),
        c('landfall', HUD_CARD_RANK.fleeting, 4000),
      ]),
    ).toBe('landfall')
  })

  it('fällt der Fokus weg, rückt der nächste nach', () => {
    const withDrifter = [
      WAYFINDER,
      c('drifter', HUD_CARD_RANK.fleeting, 6000),
      c('void', HUD_CARD_RANK.threat, 30000),
    ]
    expect(pickHudCardFocus(withDrifter)).toBe('drifter')
    expect(pickHudCardFocus(withDrifter.filter((x) => x.id !== 'drifter'))).toBe('void')
  })

  it('die Leiter ist echt gestuft — keine zwei Ränge teilen sich eine Zahl', () => {
    const values = Object.values(HUD_CARD_RANK)
    expect(new Set(values).size).toBe(values.length)
    // Und sie ist in der Reihenfolge sortiert, in der sie gelesen wird.
    expect([...values].sort((a, b) => a - b)).toEqual(values)
  })
})

describe('Reihenfolge: Wayfinder, Fokus, dann feste Zeilen', () => {
  it('der Wayfinder steht immer zuerst, der Fokus direkt darunter', () => {
    const out = orderHudCards(
      [
        c('omen', HUD_CARD_RANK.standing),
        c('void', HUD_CARD_RANK.threat, 30000),
        WAYFINDER,
        c('drifter', HUD_CARD_RANK.fleeting, 6000),
      ],
      'drifter',
    )
    expect(out[0]).toBe('wayfinder')
    expect(out[1]).toBe('drifter')
  })

  it('die gefalteten Zeilen stehen in FESTER Reihenfolge, nicht nach Rang', () => {
    /* Eine Zeile, die sich im Sekundentakt umordnet, ist nicht ablesbar — das
       war schon beim Fleet-Band der Voyages der Befund. */
    const candidates = [
      WAYFINDER,
      c('autopick', HUD_CARD_RANK.receipt, 3000),
      c('omen', HUD_CARD_RANK.standing),
      c('void', HUD_CARD_RANK.threat, 30000),
      c('landfall', HUD_CARD_RANK.actionable, 12000),
      c('drifter', HUD_CARD_RANK.fleeting, 6000),
    ]
    expect(orderHudCards(candidates, 'drifter')).toEqual([
      'wayfinder',
      'drifter',
      'landfall',
      'void',
      'omen',
      'autopick',
    ])
    // Anderer Fokus, gleiche Restreihenfolge.
    expect(orderHudCards(candidates, 'omen')).toEqual([
      'wayfinder',
      'omen',
      'landfall',
      'drifter',
      'void',
      'autopick',
    ])
  })

  it('keine Karte steht zweimal, und keine abwesende steht überhaupt', () => {
    const out = orderHudCards([WAYFINDER, c('void', HUD_CARD_RANK.threat, 1000)], 'void')
    expect(out).toEqual(['wayfinder', 'void'])
    expect(new Set(out).size).toBe(out.length)
  })

  it('ein Fokus, der gar nicht anwesend ist, taucht nicht auf', () => {
    expect(orderHudCards([WAYFINDER], 'drifter')).toEqual(['wayfinder'])
  })

  it('ohne Wayfinder beginnt die Spalte mit dem Fokus', () => {
    // Die Leiter kann durch sein; dann gibt es kein dauerhaftes Glied mehr.
    expect(orderHudCards([c('void', HUD_CARD_RANK.threat, 1000)], 'void')).toEqual(['void'])
  })
})
