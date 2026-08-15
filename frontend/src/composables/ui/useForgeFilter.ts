import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { ForgeUpgradeEntry, ForgeUpgradeTier } from '@/types'

/**
 * Wonach die Upgrade-Liste des Shop-Tabs gerade gesiebt wird — Ring und
 * Suchwort.
 *
 * Warum Modulebene und nicht Props: die Bedienung steht seit dem Umbau in der
 * KOPFLEISTE ÜBER DEM BAUM (`ForgeToolbar`), gesiebt wird die Liste in der
 * DETAILSPALTE (`ForgeUpgradesSection`). Zwischen beiden liegen zwei
 * Komponenten, die mit einem Suchwort nichts zu tun haben und es nur
 * durchreichen müssten. Dasselbe Muster und derselbe Grund wie bei
 * `useForgeSpotlight` nebenan: reine Anzeige, kein Store, keine Balance-Zahl,
 * kein Spielstand.
 *
 * Warum die Leiste überhaupt umgezogen ist: über der Liste hatten die fünf
 * Chips 438px und mussten auf 11px Schrift heruntergezogen werden, und für
 * einen Fortschrittsring je Ring war dort gar kein Platz. Über dem Baum steht
 * das Doppelte zur Verfügung.
 */
const searchQuery = ref('')
const activeTier = ref<ForgeUpgradeTier | 'all'>('all')

/**
 * Ring UND Suchwort — beide müssen passen.
 *
 * Gesucht wird im NAMEN, nicht in der Beschreibung: die Wirkungstexte tragen
 * ihre Zahlen mit („+225%"), und eine Suche nach „25" träfe damit den halben
 * Baum. Der Name ist das, wonach der Spieler sucht.
 */
export function matchesForgeFilter(entry: ForgeUpgradeEntry): boolean {
  if (activeTier.value !== 'all' && entry.tier !== activeTier.value) return false
  const needle = searchQuery.value.trim().toLowerCase()
  if (needle === '') return true
  return entry.name.toLowerCase().includes(needle)
}

/** Steht gerade überhaupt ein Filter? Der Leerzustand der Liste sagt sonst
 *  „nichts kaufbar", wo in Wahrheit „nichts gefunden" gemeint ist. */
const hasFilter = computed(() => activeTier.value !== 'all' || searchQuery.value.trim() !== '')

export function useForgeFilter(): {
  searchQuery: Ref<string>
  activeTier: Ref<ForgeUpgradeTier | 'all'>
  hasFilter: ComputedRef<boolean>
  matchesForgeFilter: (entry: ForgeUpgradeEntry) => boolean
  resetForgeFilter: () => void
} {
  /**
   * Warum `searchQuery` und `activeTier` schreibbar herausgehen und nicht
   * `readonly`: `ForgeToolbar` BEDIENT sie — `v-model` am Suchfeld,
   * `activeTier = chip.tier` am Chip. Es gibt keine Setter-Paare dazu, weil ein
   * `v-model` auf einem Ref genau das ist, was hier gebraucht wird.
   *
   * `resetForgeFilter()` selbst hat zwei Aufrufer: die Treffer-Marke im Baum
   * und der Leerzustand der Liste — beides der Weg zurück aus einem Filter, den
   * der Spieler gesetzt hat. Der Baum ruft ihn zusätzlich beim Verlassen der
   * Komponente, weil beide Werte auf Modulebene liegen und ein Suchwort sonst
   * die Sitzung überlebte.
   */
  function resetForgeFilter(): void {
    searchQuery.value = ''
    activeTier.value = 'all'
  }

  return { searchQuery, activeTier, hasFilter, matchesForgeFilter, resetForgeFilter }
}
