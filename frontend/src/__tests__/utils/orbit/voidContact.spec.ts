import { describe, it, expect, beforeEach } from 'vitest'
import {
  voidContactRadius,
  collectContacts,
  armContact,
  pruneContactCooldowns,
  contactCooldownCount,
  resetContactCooldowns,
  type ContactHit,
} from '@/utils/orbit/voidContact'
import { voidHitRadius } from '@/utils/orbit/voidPath'
import { activeChampionBodies, activePlayerPlanetPositions } from '@/utils/orbit/liveState'
import { VOID_CONTACT_RADIUS_SCALE, VOID_SPAWN_SCALE } from '@/config/constants'

const out: ContactHit[] = []

describe('voidContact', () => {
  beforeEach(() => {
    activeChampionBodies.clear()
    activePlayerPlanetPositions.clear()
    resetContactCooldowns()
    out.length = 0
  })

  describe('Berührungsradius', () => {
    it('rechnet ihn aus der DARGESTELLTEN Grösse, nicht aus der Endgrösse', () => {
      const sizePx = 120
      // Ein Wesen an der Sonne ist voll gross, eines am Rand erst ein Drittel.
      expect(voidContactRadius(sizePx, 1)).toBeCloseTo((sizePx / 2) * VOID_CONTACT_RADIUS_SCALE, 6)
      expect(voidContactRadius(sizePx, VOID_SPAWN_SCALE)).toBeCloseTo(
        voidContactRadius(sizePx, 1) * VOID_SPAWN_SCALE,
        6,
      )
    })

    it('ist ENGER als der Zielradius der Maus — und ohne dessen Boden', () => {
      // Der Klick-Radius ist bewusst grosszügig (Boden 26 px), damit ein
      // wanderndes Ziel treffbar bleibt. Übernähme die Berührung ihn, blockte
      // ein frisch aufgerissenes Wesen einen Champion, den es sichtbar nicht
      // anfasst.
      const sizePx = 112
      expect(voidContactRadius(sizePx, 1)).toBeLessThan(voidHitRadius(sizePx, 1))
      expect(voidContactRadius(sizePx, VOID_SPAWN_SCALE)).toBeLessThan(
        voidHitRadius(sizePx, VOID_SPAWN_SCALE),
      )
    })
  })

  describe('Kreisschnitt', () => {
    it('findet nur Körper, deren Kreise sich wirklich schneiden', () => {
      activeChampionBodies.set('top', { cx: 100, cy: 0, isForeground: true, r: 40 })

      // Exakt auf Berührung (Abstand = r1 + r2) zählt noch als Treffer.
      collectContacts(0, 0, 60, out)
      expect(out).toHaveLength(1)
      expect(out[0]).toMatchObject({ kind: 'champion', key: 'top' })

      // Einen Hauch weiter draussen nicht mehr.
      collectContacts(0, 0, 59.9, out)
      expect(out).toHaveLength(0)
    })

    it('trennt Champions und Planeten und nennt beide beim Schlüssel', () => {
      activeChampionBodies.set('mid', { cx: 0, cy: 0, isForeground: true, r: 30 })
      activePlayerPlanetPositions.set('slot_2', { cx: 10, cy: 0, isForeground: true, r: 30 })

      collectContacts(0, 0, 10, out)
      expect(out.map((h) => `${h.kind}:${h.key}`).sort()).toEqual([
        'champion:mid',
        'planet:slot_2',
      ])
    })

    it('übergeht alles, was hinter der Sonne steht', () => {
      activeChampionBodies.set('adc', { cx: 0, cy: 0, isForeground: false, r: 50 })
      activePlayerPlanetPositions.set('slot_1', { cx: 0, cy: 0, isForeground: false, r: 50 })

      collectContacts(0, 0, 50, out)
      expect(out).toHaveLength(0)
    })

    it('erfindet keine zerstörten Planeten — sie stehen gar nicht in der Map', () => {
      // PlanetOrbit löscht einen zerstörten Slot aus activePlayerPlanetPositions.
      // Das Util darf ihn folglich auch nicht kennen.
      collectContacts(0, 0, 999, out)
      expect(out).toHaveLength(0)
    })

    it('leert den übergebenen Puffer, statt anzuhängen', () => {
      activeChampionBodies.set('top', { cx: 0, cy: 0, isForeground: true, r: 10 })
      collectContacts(0, 0, 10, out)
      collectContacts(0, 0, 10, out)
      expect(out).toHaveLength(1)
    })
  })

  describe('Sperrzeiten', () => {
    it('lässt ein Paar nur einmal je Sperrzeit durch', () => {
      const now = 1_000_000
      expect(armContact(1, 'top', now, 5_000)).toBe(true)
      // Egal wie oft gefragt wird — sechzig Frames in derselben Sekunde
      // dürfen genau einmal zünden.
      for (let i = 0; i < 60; i++) {
        expect(armContact(1, 'top', now + i * 16, 5_000)).toBe(false)
      }
      expect(armContact(1, 'top', now + 5_001, 5_000)).toBe(true)
    })

    it('hält Paare auseinander, die sich nur in Wesen oder Körper unterscheiden', () => {
      const now = 1_000_000
      expect(armContact(1, 'top', now, 5_000)).toBe(true)
      expect(armContact(2, 'top', now, 5_000)).toBe(true)
      expect(armContact(1, 'mid', now, 5_000)).toBe(true)
      expect(contactCooldownCount()).toBe(3)
    })

    it('räumt die Sperren erlegter Wesen wieder ab', () => {
      const now = 1_000_000
      for (let uid = 1; uid <= 100; uid++) armContact(uid, 'top', now, 60_000)
      expect(contactCooldownCount()).toBe(100)

      pruneContactCooldowns(new Set([7, 42]))
      expect(contactCooldownCount()).toBe(2)

      pruneContactCooldowns(new Set())
      expect(contactCooldownCount()).toBe(0)
    })
  })
})
