import { describe, it, expect } from 'vitest'
import { recruitSeatFor } from '@/utils/game/recruitSeat'
import { CHAMPION_ROLES } from '@/config/champions/championData'
import { ROLE_INDEX_BY_KEY, ROLES } from '@/config/constants'
import type { ChampionRole } from '@/types'

function emptySlots(): (string | null)[] {
  return ROLES.map(() => null)
}

/** Erster Champion im Katalog, der diese Rolle spielt. */
function championOf(role: ChampionRole): string {
  const name = Object.keys(CHAMPION_ROLES).find((c) => CHAMPION_ROLES[c] === role)
  if (!name) throw new Error(`no champion for role ${role}`)
  return name
}

describe('recruitSeatFor', () => {
  it('nennt für jede Rolle den freien Hauptsitz mit dem Index aus ROLE_INDEX_BY_KEY', () => {
    for (const role of ROLES) {
      const seat = recruitSeatFor(championOf(role.key), emptySlots())
      expect(seat).toEqual({
        kind: 'open',
        roleKey: role.key,
        roleIndex: ROLE_INDEX_BY_KEY[role.key],
      })
    }
  })

  it('meldet den Sitzenden, wenn der Hauptsitz belegt ist', () => {
    const mid = championOf('mid')
    const slots = emptySlots()
    slots[ROLE_INDEX_BY_KEY.mid] = 'Kayle'

    expect(recruitSeatFor(mid, slots)).toEqual({
      kind: 'held',
      roleKey: 'mid',
      roleIndex: ROLE_INDEX_BY_KEY.mid,
      occupant: 'Kayle',
    })
  })

  it('sieht den eigenen Sitz als frei an, statt sich selbst zu verdrängen', () => {
    const top = championOf('top')
    const slots = emptySlots()
    slots[ROLE_INDEX_BY_KEY.top] = top

    expect(recruitSeatFor(top, slots).kind).toBe('open')
  })

  it('liest nur den Hauptsitz — ein belegter Ally-Platz ändert nichts', () => {
    const adc = championOf('adc')
    expect(recruitSeatFor(adc, emptySlots()).kind).toBe('open')
  })

  it('gibt für Bard und unbekannte Namen keinen Sitz aus', () => {
    expect(recruitSeatFor('Bard', emptySlots())).toEqual({ kind: 'none' })
    expect(recruitSeatFor('Nobody', emptySlots())).toEqual({ kind: 'none' })
  })
})
