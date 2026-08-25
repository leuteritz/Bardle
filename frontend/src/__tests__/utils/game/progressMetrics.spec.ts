import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { progressMetricValue } from '@/utils/game/progressMetrics'
import { CHRONICLE_TRACKS } from '@/config/progression/achievements'
import { OMENS } from '@/config/progression/omens'
import type { ProgressMetricId } from '@/types'

/**
 * Die Registry ist die EINE Auflösung für Chronicle, Omens und Wayfinder. Zwei
 * Fehler kann sie machen, und beide sind still:
 *
 * 1. Ein Schlüssel zeigt auf ein Store-Feld, das es nicht (mehr) gibt — der
 *    Fortschritt bleibt dann für immer bei `undefined`/`NaN` stehen, und keine
 *    Bahn fällt je.
 * 2. Ein Katalog nennt einen Schlüssel, den die Registry nicht kennt — der
 *    `switch` fällt durch und liefert `undefined`.
 */

/** Jeder Schlüssel der Union, ausgeschrieben. Ein neuer Wert im Typ ohne
 *  Eintrag hier bricht den Type-Check dieser Datei — das ist der Zweck. */
const ALL_METRICS: readonly ProgressMetricId[] = [
  'chimesEarned',
  'clicks',
  'meepsEarned',
  'materialsCollected',
  'solarRayLevels',
  'bardLevel',
  'abilityCasts',
  'prestiges',
  'meepNodesBought',
  'starsRescued',
  'galaxiesFreed',
  'planetsCleared',
  'driftersCollected',
  'riftsSealed',
  'planetSlotsOwned',
  'planetLevels',
  'bossesDefeated',
  'starPhase',
  'forgeLevels',
  'championsRecruited',
  'championLevelsGained',
  'teamSlotsFilled',
  'battleWins',
  'championKills',
  'expeditionsCompleted',
]

describe('progressMetricValue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it.each(ALL_METRICS)('resolves "%s" to a finite number on a fresh save', (metric) => {
    const value = progressMetricValue(metric)
    expect(Number.isFinite(value), `metric "${metric}" resolved to ${value}`).toBe(true)
    expect(value).toBeGreaterThanOrEqual(0)
  })

  it('covers every metric the chronicle catalogue names', () => {
    for (const track of CHRONICLE_TRACKS) {
      expect(ALL_METRICS, `track "${track.id}"`).toContain(track.metric)
    }
  })

  it('covers every metric the omen catalogue names', () => {
    for (const omen of OMENS) {
      expect(ALL_METRICS, `omen "${omen.id}"`).toContain(omen.metric)
    }
  })
})
