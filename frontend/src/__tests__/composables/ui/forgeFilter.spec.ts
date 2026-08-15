import { describe, it, expect, beforeEach } from 'vitest'
import { useForgeFilter } from '@/composables/ui/useForgeFilter'
import { FORGE_EMPTY_UPGRADE_ENTRY } from '@/composables/ui/useForgeUpgrades'
import type { ForgeUpgradeEntry, ForgeUpgradeTier } from '@/types'

/**
 * `useForgeFilter` hält seinen Zustand auf MODULEBENE, wie `useForgeSpotlight`
 * nebenan — und aus demselben Grund: bedient wird der Filter in der Kopfleiste
 * ÜBER DEM BAUM, gesiebt wird die Liste in der Spalte daneben.
 *
 * Geprüft wird die Verknüpfung (Ring UND Suchwort), das Feld, in dem gesucht
 * wird, und das Abräumen — der Shop-Tab bleibt gemountet, ein Suchwort überlebte
 * sonst bis zur nächsten Sitzung und zeigte eine fast leere Liste, ohne dass
 * ersichtlich wäre, warum.
 */
function makeEntry(
  id: string,
  name: string,
  tier: ForgeUpgradeTier,
  desc = '',
): ForgeUpgradeEntry {
  return { ...FORGE_EMPTY_UPGRADE_ENTRY, id, name, tier, desc }
}

const SAILS = makeEntry('solarSails', 'Solar Sails', 'branch')
const HOARD = makeEntry('wayfarersHoard', "Wayfarer's Hoard", 'bough')
const FLIGHT = makeEntry('flightSpeed', 'Flight Speed', 'root')

describe('useForgeFilter', () => {
  const { searchQuery, activeTier, hasFilter, matchesForgeFilter, resetForgeFilter } =
    useForgeFilter()

  // Zugleich der Beweis, dass die Abräumung wirkt: liefe sie nicht, trüge jeder
  // Test das Suchwort des vorigen mit.
  beforeEach(() => {
    resetForgeFilter()
  })

  it('lässt im Ruhezustand alles durch', () => {
    expect(hasFilter.value).toBe(false)
    for (const entry of [SAILS, HOARD, FLIGHT]) {
      expect(matchesForgeFilter(entry), entry.id).toBe(true)
    }
  })

  it('siebt nach Ring', () => {
    activeTier.value = 'bough'
    expect(hasFilter.value).toBe(true)
    expect(matchesForgeFilter(HOARD)).toBe(true)
    expect(matchesForgeFilter(SAILS)).toBe(false)
    expect(matchesForgeFilter(FLIGHT)).toBe(false)
  })

  it('sucht im Namen, ohne auf Groß- und Kleinschreibung zu achten', () => {
    searchQuery.value = 'SOLAR'
    expect(matchesForgeFilter(SAILS)).toBe(true)
    expect(matchesForgeFilter(HOARD)).toBe(false)
  })

  it('ignoriert umgebende Leerzeichen', () => {
    searchQuery.value = '   hoard  '
    expect(matchesForgeFilter(HOARD)).toBe(true)
    expect(hasFilter.value).toBe(true)
  })

  /**
   * Reine Leerzeichen sind KEIN Filter — sonst stünde die Liste leer da, ohne
   * dass im Suchfeld etwas zu sehen wäre, das man löschen könnte.
   */
  it('wertet reine Leerzeichen nicht als Filter', () => {
    searchQuery.value = '   '
    expect(hasFilter.value).toBe(false)
    expect(matchesForgeFilter(SAILS)).toBe(true)
  })

  /**
   * Gesucht wird im NAMEN, nicht in der Beschreibung: die Wirkungstexte tragen
   * ihre Zahlen mit („+225%"), eine Suche nach „25" träfe damit den halben Baum.
   */
  it('sucht NICHT in der Beschreibung', () => {
    const withDesc = makeEntry('x', 'Aegis', 'branch', 'Damage taken reduced by 25%.')
    searchQuery.value = 'damage'
    expect(matchesForgeFilter(withDesc)).toBe(false)
  })

  it('verknüpft Ring und Suchwort mit UND', () => {
    activeTier.value = 'branch'
    searchQuery.value = 'hoard'
    // Passt zum Wort, aber nicht zum Ring.
    expect(matchesForgeFilter(HOARD)).toBe(false)
    // Passt zum Ring, aber nicht zum Wort.
    expect(matchesForgeFilter(SAILS)).toBe(false)
  })

  it('räumt mit resetForgeFilter beides ab', () => {
    activeTier.value = 'leaf'
    searchQuery.value = 'tide'
    resetForgeFilter()
    expect(activeTier.value).toBe('all')
    expect(searchQuery.value).toBe('')
    expect(hasFilter.value).toBe(false)
  })

  it('teilt den Zustand über getrennte Aufrufe hinweg', () => {
    // Kopfleiste und Liste rufen das Composable je einmal auf — sähen sie
    // verschiedene Refs, siebte ein Klick auf einen Chip gar nichts.
    const toolbar = useForgeFilter()
    const list = useForgeFilter()
    toolbar.activeTier.value = 'root'
    expect(list.matchesForgeFilter(FLIGHT)).toBe(true)
    expect(list.matchesForgeFilter(SAILS)).toBe(false)
  })
})
