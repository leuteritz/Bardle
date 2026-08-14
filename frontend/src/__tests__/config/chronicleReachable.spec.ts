import { describe, it, expect } from 'vitest'
import { CHRONICLE_TRACKS } from '@/config/progression/achievements'
import {
  FORGE_BRANCHES,
  FORGE_LEAVES,
  FORGE_BOUGHS,
  FORGE_RELICS,
} from '@/config/progression/starForge'
import {
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_BRANCH_BASE_MAX_LEVEL,
  FORGE_BOUGH_PARENT_MIN_LEVEL,
  FORGE_LEAF_MAX_LEVEL,
  STAR_PHASE_FINAL_INDEX,
  ADMIN_MAX_PLANET_LEVEL,
  PLANET_SLOT_CONFIG,
  CHAMPION_TIER_CHIMES_PRICE,
} from '@/config/constants'
import { CHAMPION_DATA } from '@/config/champions/championData'

/**
 * Kann man den Astral Codex überhaupt vollschreiben?
 *
 * Zwei Bahnen konnten es nicht, und niemand hat es gemerkt, weil keine Spec je
 * die ZIELWERTE gegen das theoretisch Erreichbare gehalten hat:
 *
 *   • „Sunsmith" verlangte 200 Forge-Level bei einem Maximum von 98.
 *   • „Warden of Worlds" verlangte 600 Planeten-Level, was bei der damaligen
 *     Kostenkurve rund 1,7e26 Chimes entsprach.
 *
 * Eine Bahn, die man nicht abschliessen kann, ist schlimmer als eine, die
 * fehlt: sie verspricht etwas und hält es nie. Diese Datei prüft für jede Bahn,
 * deren Obergrenze sich aus Daten ableiten lässt, dass die letzte Stufe
 * innerhalb dieser Grenze liegt.
 */
const finalThreshold = (id: string) => {
  const track = CHRONICLE_TRACKS.find((t) => t.id === id)
  if (!track) throw new Error(`Chronicle-Bahn "${id}" gibt es nicht`)
  return track.stages[track.stages.length - 1].threshold
}

describe('Astral Codex — jede letzte Stufe muss erreichbar sein', () => {
  it('Sunsmith: forgeLevels bleibt unter dem Maximum des Baums', () => {
    // Genau die Summe, die achievementStore als `forgeLevels` zählt:
    // Branch- plus Leaf- plus Relikt-Stufen. Die BOUGHS sind absichtlich nicht
    // dabei — sie haben keine Obergrenze, und eine unbegrenzte Zahl in dieser
    // Summe machte die Prüfung sinnlos.
    //
    // Ein Zweig erreicht `BASE + (Endphase − seiner eigenen Freischaltphase)`,
    // gedeckelt: die späten Zweige kommen deshalb nur auf 5, nicht auf 6, und
    // eine pauschale Multiplikation mit dem Cap überschätzte das Maximum.
    const maxBranches = FORGE_BRANCHES.reduce(
      (sum, branch) =>
        sum +
        Math.min(
          FORGE_BRANCH_MAX_LEVEL_CAP,
          FORGE_BRANCH_BASE_MAX_LEVEL + Math.max(0, STAR_PHASE_FINAL_INDEX - branch.phase),
        ),
      0,
    )
    const maxLeaves = FORGE_LEAVES.length * FORGE_LEAF_MAX_LEVEL
    const maxRelics = FORGE_RELICS.reduce((sum, r) => sum + r.maxLevel, 0)
    const reachable = maxBranches + maxLeaves + maxRelics

    expect(finalThreshold('forge')).toBeLessThanOrEqual(reachable)
  })

  it('jeder Bough hängt an einem Zweig, der in der Endphase erreichbar ist', () => {
    // Ein Ring, den man nicht aufschliessen kann, ist dieselbe Fehlerklasse wie
    // eine Bahn, die man nicht abschliessen kann: `nodeUnlocked` verlangt einen
    // Elternzweig auf `FORGE_BOUGH_PARENT_MIN_LEVEL`, und ein spät
    // freigeschalteter Zweig erreicht in der Endphase nur noch fünf Stufen.
    for (const bough of FORGE_BOUGHS) {
      const parent = FORGE_BRANCHES.find((branch) => branch.id === bough.parentId)
      expect(parent, `${bough.id} hängt an keinem Zweig`).toBeDefined()
      const parentMax = Math.min(
        FORGE_BRANCH_MAX_LEVEL_CAP,
        FORGE_BRANCH_BASE_MAX_LEVEL + Math.max(0, STAR_PHASE_FINAL_INDEX - parent!.phase),
      )
      expect(parentMax, `${bough.id}: Elternzweig bleibt zu klein`).toBeGreaterThanOrEqual(
        FORGE_BOUGH_PARENT_MIN_LEVEL,
      )
      // Und der Bough darf nicht vor seinem Elternzweig aufgehen.
      expect(bough.phase, `${bough.id} geht vor seinem Zweig auf`).toBeGreaterThanOrEqual(
        parent!.phase,
      )
    }
  })

  it('Warden of Worlds: planetLevels bleibt im ausgebauten Orbit', () => {
    // Was ein voll ausgebauter Orbit hergibt — dieselbe Rechnung, die
    // maxEverything anstellt.
    const reachable = PLANET_SLOT_CONFIG.length * ADMIN_MAX_PLANET_LEVEL

    expect(finalThreshold('planets')).toBeLessThanOrEqual(reachable)
  })

  it('Kindred Host: championsRecruited bleibt im Champion-Bestand', () => {
    expect(finalThreshold('roster')).toBeLessThanOrEqual(Object.keys(CHAMPION_DATA).length)
  })

  it('jede Bahn steigt streng in Schwelle UND Wert', () => {
    for (const track of CHRONICLE_TRACKS) {
      for (let i = 1; i < track.stages.length; i++) {
        expect(track.stages[i].threshold).toBeGreaterThan(track.stages[i - 1].threshold)
        expect(track.stages[i].value).toBeGreaterThan(track.stages[i - 1].value)
      }
    }
  })

  it('die Champion-Preisliste deckt jedes Tier ab', () => {
    // Kein Codex-Punkt, aber dieselbe Fehlerklasse: eine Liste, deren Länge
    // still von einer anderen abhängt.
    const tiers = new Set(Object.values(CHAMPION_DATA).map((c) => c.championTier))
    expect(CHAMPION_TIER_CHIMES_PRICE.length).toBeGreaterThanOrEqual(tiers.size)
  })
})
