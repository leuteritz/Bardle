import { describe, it, expect } from 'vitest'
import { galaxyStarMarksOf, galaxyStarNamesOf } from '@/utils/game/starNames'
import { generateGalaxyDots } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import {
  GALAXY_STAR_NAME_ATTRIBUTES,
  GALAXY_STAR_NAME_NOUNS,
} from '@/config/constants'
import type { StarAttemptResult } from '@/stores/world/galaxyStore'

/**
 * Der Name eines Sterns ist ABGELEITET, nicht gespeichert. Zwei Zusagen tragen
 * das: er haengt NICHT am Ausgang (ein Stern steht auf der Karte, bevor er
 * befreit oder verloren ist), und er ruehrt den Punkte-Strom nicht an — sonst
 * verschoebe er jede archivierte Galaxie.
 */

/** Die dichteste Karte, die das Spiel kennt: 7 Sterne plus Fehlversuche. */
const CHART_MAX = 16

function results(n: number, every = 4): StarAttemptResult[] {
  return Array.from({ length: n }, (_, i) => (i % every === every - 1 ? 'failed' : 'rescued'))
}

describe('galaxyStarNamesOf', () => {
  it('ist deterministisch', () => {
    expect(galaxyStarNamesOf(0xc0ffee, 12)).toEqual(galaxyStarNamesOf(0xc0ffee, 12))
  })

  it('vergibt auf einer Karte keinen Namen zweimal', () => {
    for (const seed of [1, 0xc0ffee, 987654321, 42]) {
      const names = galaxyStarNamesOf(seed, CHART_MAX)
      expect(new Set(names).size).toBe(CHART_MAX)
      // Auch die Haelften einzeln — sonst liefe drawUnique in den Fallback.
      expect(new Set(names.map((n) => n.split(' ')[0])).size).toBe(CHART_MAX)
      expect(new Set(names.map((n) => n.split(' ')[1])).size).toBe(CHART_MAX)
    }
  })

  it('ist prefix-stabil: ein neuer Stern benennt keinen alten um', () => {
    const full = galaxyStarNamesOf(4711, CHART_MAX)
    for (let n = 0; n <= CHART_MAX; n++) {
      expect(galaxyStarNamesOf(4711, n)).toEqual(full.slice(0, n))
    }
  })

  it('laesst den Strom von generateGalaxyDots unberuehrt', () => {
    for (const seed of [7, 0xbeef, 555000111]) {
      const before = JSON.stringify(generateGalaxyDots(seed, 9))
      galaxyStarNamesOf(seed, CHART_MAX)
      galaxyStarMarksOf(seed, results(CHART_MAX))
      expect(JSON.stringify(generateGalaxyDots(seed, 9))).toBe(before)
    }
  })

  it('streut ueber Seeds hinweg ueber beide Pools', () => {
    const attrs = new Set<string>()
    const nouns = new Set<string>()
    for (let s = 1; s <= 400; s++) {
      const [name] = galaxyStarNamesOf(s * 7919, 1)
      attrs.add(name.split(' ')[0])
      nouns.add(name.split(' ')[1])
    }
    expect(attrs.size).toBe(GALAXY_STAR_NAME_ATTRIBUTES.length)
    expect(nouns.size).toBe(GALAXY_STAR_NAME_NOUNS.length)
  })
})

describe('galaxyStarMarksOf', () => {
  it('haengt den NAMEN nicht am Ausgang', () => {
    const seed = 20260827
    const allFreed: StarAttemptResult[] = Array(CHART_MAX).fill('rescued')
    const allLost: StarAttemptResult[] = Array(CHART_MAX).fill('failed')
    const a = galaxyStarMarksOf(seed, allFreed).map((m) => m.name)
    const b = galaxyStarMarksOf(seed, allLost).map((m) => m.name)
    const c = galaxyStarMarksOf(seed, results(CHART_MAX)).map((m) => m.name)
    expect(a).toEqual(b)
    expect(a).toEqual(c)
  })

  it('ist prefix-stabil', () => {
    const res = results(CHART_MAX)
    const full = galaxyStarMarksOf(8080, res)
    for (let n = 0; n <= CHART_MAX; n++) {
      expect(galaxyStarMarksOf(8080, res.slice(0, n))).toEqual(full.slice(0, n))
    }
  })

  it('traegt Index und Ausgang unveraendert weiter', () => {
    const res = results(9)
    galaxyStarMarksOf(1234, res).forEach((m, i) => {
      expect(m.index).toBe(i)
      expect(m.outcome).toBe(res[i])
    })
  })
})

/**
 * Namen lassen sich gegen Katalogwachstum nicht stabilisieren, ohne sie zu
 * speichern — und das ist ausgeschlossen. Also macht diese Spec das Wachstum
 * SICHTBAR statt still: wer einen Eintrag ergaenzt, benennt jede archivierte
 * Karte um und bricht hier. Was das zuletzt gekostet hat, steht bei
 * `utils/game/landfalls.ts` ueber `landfallMarks`.
 */
describe('der Wortschatz ist eine Wand', () => {
  it('haelt die Pool-Groessen', () => {
    expect(GALAXY_STAR_NAME_ATTRIBUTES).toHaveLength(24)
    expect(GALAXY_STAR_NAME_NOUNS).toHaveLength(20)
  })

  it('haelt eine goldene Fixture', () => {
    expect(galaxyStarNamesOf(0xc0ffee, 5)).toMatchInlineSnapshot(`
      [
        "Unspoken Talisman",
        "Meek Captive",
        "Grudging Brazier",
        "Crooked Torch",
        "Nameless Tinder",
      ]
    `)
  })

  it('fuehrt kein Wort doppelt und keines in beiden Pools', () => {
    const all = [...GALAXY_STAR_NAME_ATTRIBUTES, ...GALAXY_STAR_NAME_NOUNS]
    expect(new Set(all).size).toBe(all.length)
  })

  it('kollidiert mit keinem Galaxie-Themennamen', () => {
    const themeWords = new Set(
      GALAXY_THEMES.flatMap((t) => t.name.toLowerCase().split(/\s+/)),
    )
    for (const w of [...GALAXY_STAR_NAME_ATTRIBUTES, ...GALAXY_STAR_NAME_NOUNS]) {
      expect(themeWords.has(w.toLowerCase())).toBe(false)
    }
  })

  it('haelt das Musik-Verbot ein', () => {
    // CLAUDE.md: Bard ist der Wandering Caretaker, nie ein Musiker.
    const banned =
      /melod|song|chord|harmon|ballad|symphon|choir|note|octave|lute|lyre|harp|flute|stage|concert|composi/i
    for (const w of [...GALAXY_STAR_NAME_ATTRIBUTES, ...GALAXY_STAR_NAME_NOUNS]) {
      expect(banned.test(w)).toBe(false)
    }
  })

  it('erzeugt nur zweiteilige Namen in Grossschreibung', () => {
    for (const name of galaxyStarNamesOf(0xabcdef, CHART_MAX)) {
      expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
    }
  })
})
