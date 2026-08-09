import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import {
  CHRONICLE_TRACKS,
  CHRONICLE_TOTAL_STAGES,
  CHRONICLE_RANKS,
  chronicleRank,
  chronicleRankAt,
} from '@/config/progression/achievements'
import { CHRONICLE_STAGES_PER_TRACK } from '@/config/constants'
import type { ChronicleTrackDef } from '@/types'

/**
 * Der Beitrag einer Stufe NACH der Rang-Verstärkung, mit derselben Rundung wie
 * `bonusPct` im Store. Steht hier als eigene Zeile, damit die Tests den Vertrag
 * prüfen („Stufenwert mal Rang") statt die Implementierung abzuschreiben.
 */
function boosted(base: number, rankMult: number): number {
  return Math.round(base * rankMult * 10) / 10
}

/** Die Bahn zu einer ID — schlägt laut fehl, wenn eine Bahn umbenannt wurde. */
function track(id: string): ChronicleTrackDef {
  const found = CHRONICLE_TRACKS.find((t) => t.id === id)
  expect(found, `track "${id}" missing from CHRONICLE_TRACKS`).toBeDefined()
  return found!
}

/** Setzt die Metrik einer Bahn auf einen Wert. Eine Stelle je Metrik — laufen
 *  Store und Bahn auseinander, fällt es hier auf und nicht erst im Spiel. */
function setMetric(trackId: string, value: number) {
  switch (track(trackId).metric) {
    case 'lifetimeChimes':
      useGameStore().totalChimesEarned = value
      break
    case 'championsRecruited':
      useBattleStore().ownedChampions = Array.from({ length: value }, (_, i) => `Champ${i}`)
      break
    case 'battleWins':
      useBattleStore().totalWins = value
      break
    case 'driftersCollected':
      useDrifterStore().totalDriftersCollected = value
      break
    case 'forgeLevels':
      useStarForgeStore().branchLevels = { solarSails: value }
      break
    case 'planetLevels': {
      const slots = usePlanetShopStore().slots
      slots.forEach((s) => {
        s.purchased = false
      })
      slots[0].purchased = true
      slots[0].level = value
      break
    }
    case 'bossesDefeated':
      usePlanetBossStore().totalBossesDefeated = value
      break
    case 'starsRescued':
      useGalaxyStore().totalStarsRescued = value
      break
  }
}

describe('achievementStore (Chronicle)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('config integrity', () => {
    it('gives every track exactly CHRONICLE_STAGES_PER_TRACK stages', () => {
      for (const t of CHRONICLE_TRACKS) {
        expect(t.stages, t.id).toHaveLength(CHRONICLE_STAGES_PER_TRACK)
      }
      expect(CHRONICLE_TOTAL_STAGES).toBe(CHRONICLE_TRACKS.length * CHRONICLE_STAGES_PER_TRACK)
    })

    it('keeps thresholds and values rising within a track', () => {
      for (const t of CHRONICLE_TRACKS) {
        for (let i = 1; i < t.stages.length; i++) {
          expect(t.stages[i].threshold, `${t.id} stage ${i + 1}`).toBeGreaterThan(
            t.stages[i - 1].threshold,
          )
          expect(t.stages[i].value, `${t.id} stage ${i + 1}`).toBeGreaterThan(t.stages[i - 1].value)
        }
      }
    })

    it('uses every id, metric and bonus key exactly once', () => {
      const ids = CHRONICLE_TRACKS.map((t) => t.id)
      const metrics = CHRONICLE_TRACKS.map((t) => t.metric)
      const bonuses = CHRONICLE_TRACKS.map((t) => t.bonus)
      expect(new Set(ids).size).toBe(ids.length)
      expect(new Set(metrics).size).toBe(metrics.length)
      // Die 1:1-Zuordnung ist die Vorbedingung von TRACK_BY_BONUS im Store:
      // zwei Bahnen auf demselben Schlüssel und eine verschwindet lautlos.
      expect(new Set(bonuses).size).toBe(bonuses.length)
    })

    it('names an icon and an effect line with a placeholder for every track', () => {
      for (const t of CHRONICLE_TRACKS) {
        expect(t.icon, t.id).toMatch(/^game-icons:/)
        expect(t.effect, t.id).toContain('{v}')
      }
    })
  })

  describe('unlocking', () => {
    it('starts with an empty book', () => {
      const store = useAchievementStore()
      expect(store.unlockedStageCount).toBe(0)
      expect(store.rankTitle).toBe(CHRONICLE_RANKS[0].title)
      expect(store.isComplete).toBe(false)
    })

    it('writes a stage once its threshold is met', () => {
      const store = useAchievementStore()
      const t = track('drifters')
      setMetric('drifters', t.stages[0].threshold)
      store.tick()
      expect(store.stages[t.id]).toBe(1)
    })

    it('does not write a stage one short of its threshold', () => {
      const store = useAchievementStore()
      const t = track('drifters')
      setMetric('drifters', t.stages[0].threshold - 1)
      store.tick()
      expect(store.stages[t.id] ?? 0).toBe(0)
    })

    it('writes several stages in one tick when the metric jumped past them', () => {
      const store = useAchievementStore()
      const t = track('starfights')
      setMetric('starfights', t.stages[2].threshold)
      store.tick()
      expect(store.stages[t.id]).toBe(3)
    })

    it('never rewrites a stage that already stands', () => {
      const store = useAchievementStore()
      const t = track('ladder')
      setMetric('ladder', t.stages[1].threshold)
      store.tick()
      expect(store.stages[t.id]).toBe(2)
      // Ein Prestige (oder ein Reset des Zählers) darf keine Stufe kosten —
      // genau deshalb vergleicht der Prüflauf nur aufwärts.
      setMetric('ladder', 0)
      store.tick()
      expect(store.stages[t.id]).toBe(2)
    })

    it('stops at the last stage of a track', () => {
      const store = useAchievementStore()
      const t = track('cosmos')
      setMetric('cosmos', t.stages[t.stages.length - 1].threshold * 100)
      store.tick()
      store.tick()
      expect(store.stages[t.id]).toBe(CHRONICLE_STAGES_PER_TRACK)
    })
  })

  describe('bonus getters', () => {
    it('reports no bonus while a track is dormant', () => {
      const store = useAchievementStore()
      expect(store.cpsMult).toBe(1)
      expect(store.xpMult).toBe(1)
      expect(store.lpGainMult).toBe(1)
      expect(store.drifterBuffDurationMult).toBe(1)
      expect(store.forgeMaterialCostMult).toBe(1)
      expect(store.turretDpsMult).toBe(1)
      expect(store.bossDamageMult).toBe(1)
      expect(store.materialDropMult).toBe(1)
    })

    it('reads the reached stage as an absolute value, not a sum', () => {
      const store = useAchievementStore()
      const t = track('drifters')
      setMetric('drifters', t.stages[2].threshold)
      store.tick()
      // Stufe III heißt genau deren Wert — nicht Stufe I + II + III.
      expect(store.drifterBuffDurationMult).toBeCloseTo(
        1 + boosted(t.stages[2].value, store.rankMult) / 100,
        10,
      )
    })

    it('turns the forge track into a discount below 1', () => {
      const store = useAchievementStore()
      const t = track('forge')
      setMetric('forge', t.stages[0].threshold)
      store.tick()
      expect(store.forgeMaterialCostMult).toBeCloseTo(
        1 - boosted(t.stages[0].value, store.rankMult) / 100,
        10,
      )
      expect(store.forgeMaterialCostMult).toBeLessThan(1)
    })

    it('keeps each bonus on its own track', () => {
      const store = useAchievementStore()
      setMetric('drifters', track('drifters').stages[4].threshold)
      store.tick()
      // Die Drifter-Bahn hebt die Buff-Dauer — und sonst nichts.
      expect(store.drifterBuffDurationMult).toBeGreaterThan(1)
      expect(store.cpsMult).toBe(1)
      expect(store.bossDamageMult).toBe(1)
    })
  })

  describe('progress view', () => {
    it('measures progress from the reached threshold, not from zero', () => {
      const store = useAchievementStore()
      const t = track('starfights')
      // Genau in der Mitte zwischen Stufe I und II.
      const mid = (t.stages[0].threshold + t.stages[1].threshold) / 2
      setMetric('starfights', mid)
      store.tick()
      const view = store.trackViews.find((v) => v.id === t.id)!
      expect(view.stage).toBe(1)
      expect(view.nextThreshold).toBe(t.stages[1].threshold)
      expect(view.progress).toBeCloseTo(0.5, 2)
    })

    it('reports a maxed track as full and without a next threshold', () => {
      const store = useAchievementStore()
      const t = track('cosmos')
      setMetric('cosmos', t.stages[4].threshold)
      store.tick()
      const view = store.trackViews.find((v) => v.id === t.id)!
      expect(view.stage).toBe(CHRONICLE_STAGES_PER_TRACK)
      expect(view.nextThreshold).toBeNull()
      expect(view.progress).toBe(1)
    })

    it('carries one view per track, in config order', () => {
      const store = useAchievementStore()
      expect(store.trackViews.map((v) => v.id)).toEqual(CHRONICLE_TRACKS.map((t) => t.id))
    })
  })

  describe('badge and rank', () => {
    it('marks a track unseen on unlock and clears it on markSeen', () => {
      const store = useAchievementStore()
      setMetric('drifters', track('drifters').stages[0].threshold)
      store.tick()
      expect(store.unseen).toEqual(['drifters'])
      store.markSeen()
      expect(store.unseen).toEqual([])
    })

    it('lists a track only once, however many stages it gained', () => {
      const store = useAchievementStore()
      const t = track('starfights')
      setMetric('starfights', t.stages[0].threshold)
      store.tick()
      setMetric('starfights', t.stages[3].threshold)
      store.tick()
      expect(store.unseen).toEqual(['starfights'])
    })

    it('leaves the badge silent when the stand is caught up on load', () => {
      const store = useAchievementStore()
      // Ein Spielstand von vor dem Chronicle: die Zähler stehen hoch, die
      // Stufen fehlen. Nachziehen darf Stufen setzen, aber nicht melden.
      setMetric('chimes', track('chimes').stages[2].threshold)
      setMetric('ladder', track('ladder').stages[1].threshold)
      store.syncSilently()
      expect(store.stages.chimes).toBe(3)
      expect(store.stages.ladder).toBe(2)
      expect(store.unseen).toEqual([])
    })

    it('climbs the rank titles with the number of stages written', () => {
      expect(chronicleRank(0)).toBe(CHRONICLE_RANKS[0].title)
      expect(chronicleRank(CHRONICLE_TOTAL_STAGES)).toBe(
        CHRONICLE_RANKS[CHRONICLE_RANKS.length - 1].title,
      )
      // Monoton: mehr Stufen dürfen nie einen früheren Titel zurückgeben.
      let lastIndex = 0
      for (let n = 0; n <= CHRONICLE_TOTAL_STAGES; n++) {
        const index = CHRONICLE_RANKS.findIndex((r) => r.title === chronicleRank(n))
        expect(index).toBeGreaterThanOrEqual(lastIndex)
        lastIndex = index
      }
    })

    it('raises the rank multiplier along the same ladder as the titles', () => {
      // `min` aufsteigend und `mult` nie fallend — sonst wäre ein Aufstieg eine
      // Verschlechterung, und die Leiter im Panel liefe rückwärts.
      for (let i = 1; i < CHRONICLE_RANKS.length; i++) {
        expect(CHRONICLE_RANKS[i].min).toBeGreaterThan(CHRONICLE_RANKS[i - 1].min)
        expect(CHRONICLE_RANKS[i].mult).toBeGreaterThanOrEqual(CHRONICLE_RANKS[i - 1].mult)
      }
      // Der unterste Rang darf nichts verstärken, sonst startet das Spiel mit
      // einem Bonus auf einen Codex, in dem nichts steht.
      expect(CHRONICLE_RANKS[0].mult).toBe(1)
      expect(chronicleRankAt(0)).toBe(CHRONICLE_RANKS[0])
      expect(chronicleRankAt(CHRONICLE_TOTAL_STAGES)).toBe(
        CHRONICLE_RANKS[CHRONICLE_RANKS.length - 1],
      )
    })

    it('multiplies every track bonus with the rank, not just one of them', () => {
      const store = useAchievementStore()
      // Eine einzelne Stufe: Rang „Page Keeper", der erste Verstärker.
      const drifters = track('drifters')
      setMetric('drifters', drifters.stages[0].threshold)
      store.tick()
      const lowRank = store.rankMult
      const lowValue = store.drifterBuffDurationMult
      expect(lowRank).toBeGreaterThan(1)

      // Dieselbe Stufe derselben Bahn, aber ein volles Buch drumherum: der Wert
      // dieser einen Bahn MUSS steigen, obwohl an ihr selbst nichts passiert ist.
      for (const t of CHRONICLE_TRACKS) {
        if (t.id !== 'drifters') setMetric(t.id, t.stages[t.stages.length - 1].threshold)
      }
      store.tick()
      expect(store.stages.drifters).toBe(1)
      expect(store.rankMult).toBeGreaterThan(lowRank)
      expect(store.drifterBuffDurationMult).toBeGreaterThan(lowValue)
      expect(store.drifterBuffDurationMult).toBeCloseTo(
        1 + boosted(drifters.stages[0].value, store.rankMult) / 100,
        10,
      )
    })

    it('reports completion once every track is maxed', () => {
      const store = useAchievementStore()
      for (const t of CHRONICLE_TRACKS) {
        setMetric(t.id, t.stages[t.stages.length - 1].threshold)
      }
      store.tick()
      expect(store.unlockedStageCount).toBe(CHRONICLE_TOTAL_STAGES)
      expect(store.isComplete).toBe(true)
      expect(store.rankTitle).toBe(CHRONICLE_RANKS[CHRONICLE_RANKS.length - 1].title)
    })
  })
})
