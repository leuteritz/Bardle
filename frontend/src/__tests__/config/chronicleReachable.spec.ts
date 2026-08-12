import { describe, it, expect } from 'vitest'
import { CHRONICLE_TRACKS } from '@/config/progression/achievements'
import { FORGE_BRANCHES, FORGE_LEAVES, FORGE_RELICS } from '@/config/progression/starForge'
import {
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_LEAF_MAX_LEVEL,
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
    // Branch- plus Leaf- plus Relikt-Stufen.
    const maxBranches = FORGE_BRANCHES.length * FORGE_BRANCH_MAX_LEVEL_CAP
    const maxLeaves = FORGE_LEAVES.length * FORGE_LEAF_MAX_LEVEL
    const maxRelics = FORGE_RELICS.reduce((sum, r) => sum + r.maxLevel, 0)
    const reachable = maxBranches + maxLeaves + maxRelics

    expect(finalThreshold('forge')).toBeLessThanOrEqual(reachable)
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
