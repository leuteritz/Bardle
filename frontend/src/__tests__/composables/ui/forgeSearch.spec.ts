import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useForgeSearch } from '@/composables/ui/useForgeSearch'
import { useGameStore } from '@/stores/core/gameStore'
import { useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import { FORGE_NODES } from '@/config/progression/starForge'
import { forgeNodeAxis } from '@/utils/game/solarSignature'
import { SOLAR_BRANCHES, FORGE_FAMILY_LABEL } from '@/config/constants'

/**
 * Die Suche filtert BEIDE Spalten des Shop-Tabs — Netz und Liste lesen dieselbe
 * Trefferliste. Was hier falsch schneidet, schneidet an beiden Stellen gleich
 * falsch und sieht deshalb nach Absicht aus.
 *
 * Geprüft wird die Semantik, nicht die Zahl: welches Wort welche Achse trifft,
 * wie die drei Facetten sich verknüpfen und dass „nichts gesucht" alles
 * durchlässt.
 */
describe('Star Forge — die Suche über das Netz', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useForgeSearch().resetForgeSearch()
  })

  it('ohne Eingabe ist die Suche untätig und lässt alles durch', () => {
    const { searchActive, matchIds, matchCount, totalCount } = useForgeSearch()
    expect(searchActive.value).toBe(false)
    expect(matchCount.value).toBe(totalCount)
    // Fünf Kernstrahlen plus der Katalog.
    expect(totalCount).toBe(SOLAR_BRANCHES.length + FORGE_NODES.length)
    for (const node of FORGE_NODES) expect(matchIds.value.has(node.id)).toBe(true)
  })

  it('„cps" trifft die Chimes/Sec-Achse und NICHT die Reise-Achse', () => {
    const { query, matchIds } = useForgeSearch()
    query.value = 'cps'

    expect(matchIds.value.has('chimesPerSecond')).toBe(true)
    // `flightSpeed` trägt `statLabel: 'CpS Mult.'` — genau die Falle, wegen der
    // die Aliase nicht aus dem Statlabel abgeleitet werden.
    expect(matchIds.value.has('flightSpeed')).toBe(false)

    for (const id of matchIds.value) {
      const axis = forgeNodeAxis(id)
      expect(axis, `${id} hängt an keiner Achse, trifft aber „cps"`).toBe('chimesPerSecond')
    }
  })

  it('der Freitext läuft auch über den Wirkungssatz', () => {
    const { query, matchIds } = useForgeSearch()
    // `moonOrbit` heisst „Moon Orbit" und sagt „Offline earnings +{v}%."
    query.value = 'offline'
    expect(matchIds.value.has('moonOrbit')).toBe(true)
    expect(matchIds.value.has('moon')).toBe(false)
  })

  it('der Familien-Chip schneidet auf genau seine Familie', () => {
    const { toggleFamily, matchIds, searchActive } = useForgeSearch()
    toggleFamily('boss')
    expect(searchActive.value).toBe(true)

    const byId = new Map(FORGE_NODES.map((n) => [n.id, n]))
    for (const id of matchIds.value) {
      expect(byId.get(id)?.family, `${id} ist nicht aus der Familie boss`).toBe('boss')
    }
    // Ein Kernstrahl trägt keine Familie und fällt damit heraus.
    for (const b of SOLAR_BRANCHES) expect(matchIds.value.has(b.id)).toBe(false)
  })

  it('Freitext und Facette verknüpfen sich mit UND', () => {
    const { query, toggleFamily, matchIds } = useForgeSearch()
    const familyOnly = new Set<string>()
    toggleFamily('combat')
    for (const id of matchIds.value) familyOnly.add(id)

    query.value = 'boss'
    for (const id of matchIds.value) {
      expect(familyOnly.has(id), `${id} kam durch den Text an der Familie vorbei`).toBe(true)
    }
    expect(matchIds.value.size).toBeLessThan(familyOnly.size)
  })

  it('ein Zustands-Chip misst am Spielstand, nicht am Katalog', () => {
    const game = useGameStore()
    game.chimes = 0
    const { toggleState, matchIds } = useForgeSearch()

    toggleState('ready')
    expect(matchIds.value.size).toBe(0)

    // Die fünf Kernstrahlen kennen keine Elternsperre — Vorrat allein öffnet sie.
    game.chimes = 1e9
    expect(matchIds.value.size).toBeGreaterThan(0)
  })

  it('was der Zustands-Chip durchlässt, trägt den Zustand auch wirklich', () => {
    const { toggleState, matchIds } = useForgeSearch()
    const { entryById } = useForgeUpgrades()
    toggleState('locked')
    for (const id of matchIds.value) {
      expect(entryById.value.get(id)?.state, `${id} ist nicht gesperrt`).toBe('locked')
    }
  })

  it('zwei Zustands-Chips verknüpfen sich mit ODER', () => {
    const { toggleState, matchIds } = useForgeSearch()
    toggleState('locked')
    const onlyLocked = new Set(matchIds.value)
    toggleState('maxed')
    for (const id of onlyLocked) expect(matchIds.value.has(id)).toBe(true)
  })

  it('die Chip-Zahlen zählen dasselbe, was der Chip dann durchlässt', () => {
    const { query, chipCounts, toggleFamily, matchCount } = useForgeSearch()
    query.value = 'chimes'
    const promised = chipCounts.value.family.income
    toggleFamily('income')
    expect(matchCount.value).toBe(promised)
  })

  it('jede Familie trägt ein Label — sonst stünde ein leerer Chip da', () => {
    for (const node of FORGE_NODES) {
      expect(FORGE_FAMILY_LABEL[node.family], `${node.family} ohne Label`).toBeTruthy()
    }
  })

  it('clearSearch räumt alle vier Quellen, resetForgeSearch auch den Verlauf', () => {
    const search = useForgeSearch()
    search.query.value = 'boss'
    search.toggleAxis('dmgPerClick')
    search.toggleFamily('boss')
    search.toggleState('ready')
    search.commitRecent()

    search.clearSearch()
    expect(search.searchActive.value).toBe(false)
    expect(search.activeAxis.value).toBeNull()
    expect(search.activeFamily.value).toBeNull()
    expect(search.activeStates.value.size).toBe(0)
    expect(search.recent.value).toEqual(['boss'])

    search.resetForgeSearch()
    expect(search.recent.value).toEqual([])
  })

  it('der Verlauf hält dieselbe Suche nur einmal und die jüngste vorn', () => {
    const search = useForgeSearch()
    search.query.value = 'boss'
    search.commitRecent()
    search.query.value = 'cps'
    search.commitRecent()
    search.query.value = 'BOSS'
    search.commitRecent()
    expect(search.recent.value).toEqual(['BOSS', 'cps'])
  })
})
