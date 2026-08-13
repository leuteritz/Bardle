import { describe, it, expect } from 'vitest'
import {
  BARD_ABILITIES,
  bardAbilityEffectLines,
  bardRankPowerMult,
  bardRankValue,
} from '@/config/progression/bardAbilities'
import {
  ABILITY_MAX_RANK,
  ABILITY_RANK_POWER_STEP,
  BINDING_TARGET_COUNT,
  BINDING_TARGET_PER_RANK,
  FATE_STASIS_DURATION_MS,
  FATE_STASIS_PER_RANK_MS,
} from '@/config/constants'
import type { BardAbilityId } from '@/types'

const IDS = BARD_ABILITIES.map((a) => a.id)

/** Höchstzahl der Zeilen je Kasten: die Hauptwirkung plus drei. */
const MAX_LINES = 4

describe('bardRankValue', () => {
  it('adds one step per rank above the first', () => {
    expect(bardRankValue('bindingTargets', 1)).toBe(BINDING_TARGET_COUNT)
    expect(bardRankValue('bindingTargets', 3)).toBe(
      BINDING_TARGET_COUNT + 2 * BINDING_TARGET_PER_RANK,
    )
    expect(bardRankValue('stasisMs', 2)).toBe(FATE_STASIS_DURATION_MS + FATE_STASIS_PER_RANK_MS)
  })

  it('reads rank 0 as rank 1 — a locked tooltip shows a preview, not zeroes', () => {
    expect(bardRankValue('bindingTargets', 0)).toBe(bardRankValue('bindingTargets', 1))
    expect(bardRankValue('stasisMs', -3)).toBe(FATE_STASIS_DURATION_MS)
  })

  it('stops at ABILITY_MAX_RANK', () => {
    const capped = bardRankValue('bindingTargets', ABILITY_MAX_RANK)
    expect(bardRankValue('bindingTargets', ABILITY_MAX_RANK + 7)).toBe(capped)
    expect(capped).toBe(BINDING_TARGET_COUNT + (ABILITY_MAX_RANK - 1) * BINDING_TARGET_PER_RANK)
  })
})

describe('bardRankPowerMult', () => {
  it('is neutral at rank 1 and grows by one step per rank', () => {
    expect(bardRankPowerMult(1)).toBe(1)
    expect(bardRankPowerMult(0)).toBe(1)
    expect(bardRankPowerMult(3)).toBeCloseTo(1 + 2 * ABILITY_RANK_POWER_STEP)
    expect(bardRankPowerMult(ABILITY_MAX_RANK + 4)).toBeCloseTo(
      1 + (ABILITY_MAX_RANK - 1) * ABILITY_RANK_POWER_STEP,
    )
  })
})

describe('bardAbilityEffectLines', () => {
  it.each(IDS)('%s stays within the line budget', (id: BardAbilityId) => {
    // Der Kasten öffnet sich mitten im Spiel über dem Orbit. Diese Erwartung
    // bindet die Kürzung fest — ohne sie wächst er beim nächsten Feature still
    // wieder zu.
    expect(bardAbilityEffectLines(id, 1, 1).length).toBeLessThanOrEqual(MAX_LINES)
    expect(bardAbilityEffectLines(id, 1, 1).length).toBeGreaterThan(1)
  })

  it.each(IDS)('%s carries an outlook on every line whose text moves', (id: BardAbilityId) => {
    const lines = bardAbilityEffectLines(id, 1, 1)
    const ahead = bardAbilityEffectLines(id, 2, 1)

    for (const [i, line] of lines.entries()) {
      if (line.next === undefined) {
        // Kein Pfeil heißt: der Wert steht auch eine Stufe weiter gleich da.
        expect(ahead[i].value).toBe(line.value)
      } else {
        expect(line.next).toBe(ahead[i].value)
        expect(line.next).not.toBe(line.value)
      }
    }
    // Mindestens EINE Zeile muss sich bewegen — sonst wäre der Rangaufstieg für
    // diese Fähigkeit unsichtbar, und genau das war der Anlass des Umbaus.
    expect(lines.some((l) => l.next !== undefined)).toBe(true)
  })

  it('shows the growing target count of Q but never a moving stun', () => {
    const [, targets, enrage] = bardAbilityEffectLines('q', 1, 1)
    expect(targets.label).toBe('Targets')
    expect(targets.value).toBe(`${BINDING_TARGET_COUNT} bosses`)
    expect(targets.next).toBe(`${BINDING_TARGET_COUNT + BINDING_TARGET_PER_RANK} bosses`)
    // Die Betäubung ist eine feste Zahl — sie darf keinen Zuwachs versprechen.
    expect(enrage.next).toBeUndefined()
  })

  it.each(IDS)('%s drops the outlook at the highest rank', (id: BardAbilityId) => {
    const lines = bardAbilityEffectLines(id, ABILITY_MAX_RANK, 1)
    expect(lines.every((l) => l.next === undefined)).toBe(true)
  })

  it.each(IDS)('%s previews rank 1 while locked, without an outlook', (id: BardAbilityId) => {
    const locked = bardAbilityEffectLines(id, 0, 1)
    const rankOne = bardAbilityEffectLines(id, 1, 1)

    expect(locked.map((l) => l.value)).toEqual(rankOne.map((l) => l.value))
    // Gesperrt ist die nächste Frage die Freischaltung, nicht der Rang danach.
    expect(locked.every((l) => l.next === undefined)).toBe(true)
  })

  it.each(IDS)('%s: resonance lifts both columns, it does not add one', (id: BardAbilityId) => {
    // Die Passive hebt den laufenden Wert UND den Ausblick. Sie darf also nie
    // eine Zeile mit einem Pfeil versehen, die ohne sie keinen trägt — sonst
    // sähe der Spieler einen Rangsprung, wo nur seine Resonance gestiegen ist.
    const plain = bardAbilityEffectLines(id, 2, 1)
    const resonant = bardAbilityEffectLines(id, 2, 1.5)

    expect(resonant.map((l) => l.next !== undefined)).toEqual(
      plain.map((l) => l.next !== undefined),
    )
  })
})
