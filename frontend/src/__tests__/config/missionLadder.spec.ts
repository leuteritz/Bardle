import { describe, it, expect } from 'vitest'
import {
  MISSIONS,
  MISSION_CHAPTERS,
  MISSION_COUNT,
  MISSION_INDEX,
  MISSION_CHAPTER_STARTS,
  MISSION_CHAPTER_SIZES,
  MISSION_RUN_SCOPED_METRICS,
  missionRewardLabel,
  missionObjectiveLine,
} from '@/config/progression/missions'
import { OMENS } from '@/config/progression/omens'
import { CHRONICLE_TRACKS, CHRONICLE_RANKS } from '@/config/progression/achievements'
import { MATERIALS } from '@/config/economy/materials'
import { CHAMPION_DATA } from '@/config/champions/championData'
import {
  STAR_PHASE_FINAL_INDEX,
  PLANET_SLOT_CONFIG,
  ADMIN_MAX_PLANET_LEVEL,
  ROLES,
} from '@/config/constants'
import type { MissionMetricId } from '@/types'

/**
 * Die Leiter ans Spiel gebunden.
 *
 * Zwei Fehler kann ein Missionskatalog machen, und beide sind still:
 *
 * 1. **Eine Stufe, die man nicht abschließen kann.** Ein Ziel jenseits dessen,
 *    was die Kataloge überhaupt hergeben, hält die ganze Leiter für immer an —
 *    schlimmer als eine Mission, die fehlt.
 * 2. **Eine Stufe, die sich selbst zurücknimmt.** Eine lauf-lokale Metrik nach
 *    dem ersten Prestige steht nach jedem weiteren Aufbruch wieder offen.
 *
 * Dazu die kleinen: ein doppeltes Ziel (toter Klick), ein Namensdoppel mit Omen
 * oder Codex (Bedienfehler), ein Phantom-Material.
 */

/** Obergrenze je Metrik, aus den Katalogen gerechnet. Was hier fehlt, hat keine
 *  ableitbare Grenze und wird nicht geprüft. */
const METRIC_CEILING: Partial<Record<MissionMetricId, number>> = {
  starPhase: STAR_PHASE_FINAL_INDEX,
  planetSlotsOwned: PLANET_SLOT_CONFIG.length,
  planetLevels: PLANET_SLOT_CONFIG.length * ADMIN_MAX_PLANET_LEVEL,
  championsRecruited: Object.keys(CHAMPION_DATA).length,
  teamSlotsFilled: ROLES.length,
}

describe('mission ladder — catalogue', () => {
  it('has unique ids', () => {
    const ids = MISSIONS.map((m) => m.id)
    expect(new Set(ids).size, 'a duplicate id shifts the whole ladder by one').toBe(ids.length)
  })

  it('has unique names', () => {
    const names = MISSIONS.map((m) => m.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('stays inside the agreed size', () => {
    expect(MISSION_COUNT).toBeGreaterThanOrEqual(35)
    expect(MISSION_COUNT).toBeLessThanOrEqual(45)
  })

  it('references only chapters that exist', () => {
    const known = new Set(MISSION_CHAPTERS.map((c) => c.id))
    for (const m of MISSIONS) {
      expect(known, `mission "${m.id}"`).toContain(m.chapter)
    }
  })

  it('gives every chapter at least one mission', () => {
    for (const c of MISSION_CHAPTERS) {
      expect(MISSION_CHAPTER_SIZES[c.id], `chapter "${c.id}" is empty`).toBeGreaterThan(0)
      expect(MISSION_CHAPTER_STARTS[c.id]).toBeGreaterThanOrEqual(0)
    }
  })

  it('keeps each chapter contiguous', () => {
    // Ein Kapitel, das zweimal beginnt, ließe die Kopfzeile der Karte
    // zurückspringen — der Spieler läse das als Fehler.
    const seen: string[] = []
    for (const m of MISSIONS) {
      if (seen[seen.length - 1] !== m.chapter) seen.push(m.chapter)
    }
    expect(new Set(seen).size, 'a chapter starts twice').toBe(seen.length)
  })

  it('orders chapters as MISSION_CHAPTERS does', () => {
    const order = MISSION_CHAPTERS.map((c) => MISSION_CHAPTER_STARTS[c.id])
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })
})

describe('mission ladder — reachability', () => {
  it('never asks for more than the catalogues can give', () => {
    for (const m of MISSIONS) {
      const ceiling = METRIC_CEILING[m.metric]
      if (ceiling === undefined) continue
      expect(m.target, `"${m.id}" targets ${m.target} ${m.unit}, ceiling is ${ceiling}`).toBeLessThanOrEqual(
        ceiling,
      )
    }
  })

  it('raises the bar strictly whenever a metric repeats', () => {
    const highest = new Map<MissionMetricId, { id: string; target: number }>()
    for (const m of MISSIONS) {
      const prev = highest.get(m.metric)
      if (prev) {
        expect(
          m.target,
          `"${m.id}" repeats metric "${m.metric}" without raising it above "${prev.id}"`,
        ).toBeGreaterThan(prev.target)
      }
      highest.set(m.metric, { id: m.id, target: m.target })
    }
  })

  it('asks for a positive amount', () => {
    for (const m of MISSIONS) {
      expect(m.target, `"${m.id}"`).toBeGreaterThan(0)
    }
  })
})

describe('mission ladder — the prestige rule', () => {
  it('places no run-scoped metric after the first departure', () => {
    // `bardLevel` und `shopBuildingLevels` fallen bei jedem Prestige auf null.
    // Dahinter stünde die Mission nach jedem Aufbruch wieder offen.
    const departure = MISSION_INDEX['firstDeparture']
    expect(departure, 'firstDeparture missing — the rule has no anchor').toBeGreaterThan(0)
    MISSIONS.forEach((m, i) => {
      if (i < departure) return
      expect(
        MISSION_RUN_SCOPED_METRICS,
        `"${m.id}" measures the run-scoped "${m.metric}" after the first prestige`,
      ).not.toContain(m.metric)
    })
  })
})

describe('mission ladder — rewards', () => {
  it('pays something on every mission', () => {
    for (const m of MISSIONS) {
      const r = m.reward
      const hasChimes = !!r.chimes && (!!r.chimes.cpsSeconds || !!r.chimes.flat || !!r.chimes.clicks)
      expect(
        hasChimes || !!r.meeps || (r.materials?.length ?? 0) > 0,
        `"${m.id}" pays nothing — a dead click`,
      ).toBe(true)
    }
  })

  it('names only materials that exist', () => {
    const known = new Set(MATERIALS.map((mat) => mat.id))
    for (const m of MISSIONS) {
      for (const mat of m.reward.materials ?? []) {
        expect(known, `"${m.id}" drops phantom material "${mat.id}"`).toContain(mat.id)
        expect(mat.qty).toBeGreaterThan(0)
      }
    }
  })

  it('hands out meeps only at the close of a chapter', () => {
    // Der dritte Meep-Weg neben Drifter und Expedition — und ebenso selten
    // gemeint.
    for (const [i, m] of MISSIONS.entries()) {
      if (!m.reward.meeps) continue
      const isLastOfChapter = MISSIONS[i + 1]?.chapter !== m.chapter
      expect(isLastOfChapter, `"${m.id}" pays a meep mid-chapter`).toBe(true)
    }
  })

  it('renders a non-empty reward label for every mission', () => {
    for (const m of MISSIONS) {
      expect(missionRewardLabel(m), `"${m.id}"`).not.toBe('')
    }
  })
})

describe('mission ladder — presentation', () => {
  it('leaves no {n} placeholder unfilled', () => {
    for (const m of MISSIONS) {
      expect(m.objective, `"${m.id}" has no {n} placeholder`).toContain('{n}')
      expect(missionObjectiveLine(m)).not.toContain('{n}')
    }
  })

  it('uses each glyph exactly once', () => {
    const icons = MISSIONS.map((m) => m.icon)
    expect(new Set(icons).size, 'two missions share a glyph').toBe(icons.length)
  })

  it('prefixes every icon with its set', () => {
    for (const m of MISSIONS) {
      expect(m.icon, `"${m.id}"`).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/)
    }
  })

  it('collides with no omen, track or rank name', () => {
    const taken = new Set([
      ...OMENS.map((o) => o.name),
      ...CHRONICLE_TRACKS.map((t) => t.name),
      ...CHRONICLE_RANKS.map((r) => r.title),
    ])
    for (const m of MISSIONS) {
      expect(taken, `"${m.name}" is already an omen, track or rank`).not.toContain(m.name)
    }
  })

  /**
   * Die Zeile im Pause-Overlay hat eine RESERVIERTE Höhe und eine reservierte
   * Belohnungsbreite (`PAUSE_WAYFINDER_ROW_H`, `PAUSE_WAYFINDER_REWARD_W`) —
   * jedes Feld steht dort einzeilig. Gemessen wurde im Browser in MedievalSharp
   * bei 429 px Spaltenbreite: längster Name 181 px bei 23 Zeichen, längste
   * Aufgabe 255 px bei 42, längste Belohnung 196 px bei 34.
   *
   * Zeichen statt Pixel, weil eine Spec keine Schrift misst. Die Grenzen liegen
   * über dem heutigen Katalog und unter dem, was ellipsiert würde: eine neue
   * Mission mit doppelt so langem Namen fiele hier auf, statt im Panel still
   * abgeschnitten zu werden.
   */
  it('fits the reserved pause row', () => {
    const NAME_MAX = 30
    const OBJECTIVE_MAX = 52
    const REWARD_MAX = 42
    for (const m of MISSIONS) {
      expect(m.name.length, `"${m.id}" name too long for the pause row`).toBeLessThanOrEqual(
        NAME_MAX,
      )
      expect(
        missionObjectiveLine(m).length,
        `"${m.id}" objective too long for the pause row`,
      ).toBeLessThanOrEqual(OBJECTIVE_MAX)
      expect(
        missionRewardLabel(m).length,
        `"${m.id}" reward label too long for the pause row`,
      ).toBeLessThanOrEqual(REWARD_MAX)
    }
  })

  it('keeps musical vocabulary out of the ladder', () => {
    // Bard ist der Wandering Caretaker, kein Musiker — „Chimes" ist Bestand aus
    // seinem Kit, alles andere Musikalische ist gesperrt.
    const banned =
      /\b(melody|melodic|song|chord|harmony|refrain|ballad|symphony|orchestra|choir|octave|lute|lyre|harp|flute|drum|stage|concert|audience|applause|composition|minstrel)\b/i
    for (const m of MISSIONS) {
      const text = `${m.name} ${m.blurb} ${m.objective} ${m.unit}`
      expect(banned.test(text), `"${m.id}": ${text}`).toBe(false)
      expect(m.icon).not.toMatch(/musical|lyre|drum-kit|harp|flute/)
    }
  })
})
