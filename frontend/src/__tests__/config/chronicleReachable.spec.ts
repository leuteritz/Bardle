import { describe, it, expect } from 'vitest'
import { CHRONICLE_TRACKS } from '@/config/progression/achievements'
import {
  FORGE_BRANCHES,
  FORGE_LEAVES,
  FORGE_WARDS,
  FORGE_PACTS,
  FORGE_CROWNS,
  FORGE_BOUGHS,
  FORGE_RELICS,
  getForgeNode,
} from '@/config/progression/starForge'
import {
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_TIER_BASE_MAX_LEVEL,
  FORGE_BOUGH_PARENT_MIN_LEVEL,
  FORGE_LEAF_MAX_LEVEL,
  FORGE_WARD_MAX_LEVEL,
  FORGE_PACT_MAX_LEVEL,
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
    // Genau die Summe, die achievementStore als `forgeLevels` zählt: die vier
    // GEDECKELTEN Ringe plus die Relikte. Boughs fehlen, weil sie keine
    // Obergrenze haben und eine unbegrenzte Zahl die Prüfung sinnlos machte;
    // Crowns, weil fünf Einsen keine geschmiedete Tiefe sind.
    //
    // Jeder gedeckelte Ring erreicht `BASE + (Endphase − eigene Phase)`,
    // gedeckelt je Ring. Ein pauschales „Knotenzahl × Deckel" überschätzte das
    // Maximum, sobald ein Knoten später aufginge als sein Ring.
    const capped = (nodes: typeof FORGE_BRANCHES, cap: number) =>
      nodes.reduce(
        (sum, def) =>
          sum +
          Math.min(
            cap,
            FORGE_TIER_BASE_MAX_LEVEL + Math.max(0, STAR_PHASE_FINAL_INDEX - def.phase),
          ),
        0,
      )

    const reachable =
      capped(FORGE_BRANCHES, FORGE_BRANCH_MAX_LEVEL_CAP) +
      capped(FORGE_LEAVES, FORGE_LEAF_MAX_LEVEL) +
      capped(FORGE_WARDS, FORGE_WARD_MAX_LEVEL) +
      capped(FORGE_PACTS, FORGE_PACT_MAX_LEVEL) +
      FORGE_RELICS.reduce((sum, r) => sum + r.maxLevel, 0)

    expect(finalThreshold('forge')).toBeLessThanOrEqual(reachable)
  })

  it('jeder gedeckelte Ring erreicht seinen Deckel GENAU in der Endphase', () => {
    // Die Bedingung, die die ganze Ring-Leiter zusammenhält: kein Ring steht
    // vorher still, keiner ist danach unfertig. Fällt sie, ist entweder eine
    // Freischaltphase oder ein Deckel verrutscht — und beides sieht man den
    // beiden Konstanten einzeln nicht an.
    const rings: [typeof FORGE_BRANCHES, number][] = [
      [FORGE_BRANCHES, FORGE_BRANCH_MAX_LEVEL_CAP],
      [FORGE_LEAVES, FORGE_LEAF_MAX_LEVEL],
      [FORGE_WARDS, FORGE_WARD_MAX_LEVEL],
      [FORGE_PACTS, FORGE_PACT_MAX_LEVEL],
    ]
    for (const [nodes, cap] of rings) {
      for (const def of nodes) {
        const atEnd = FORGE_TIER_BASE_MAX_LEVEL + (STAR_PHASE_FINAL_INDEX - def.phase)
        expect(atEnd, `${def.id}: erreicht seinen Deckel nicht`).toBe(cap)
      }
    }
  })

  it('jeder Knoten hängt weiter innen und geht NACH seinem Elternknoten auf', () => {
    // Ein Ring, den man nicht aufschliessen kann, ist dieselbe Fehlerklasse wie
    // eine Bahn, die man nicht abschliessen kann. Seit die Ringe eine Leiter
    // bilden, prüft das eine Regel für alle: der Elternknoten sitzt auf
    // DEMSELBEN Winkel und geht FRÜHER auf.
    //
    // „Genau eine Phase früher" gilt dabei NICHT durchgehend, und das ist kein
    // Versehen: Ring 6 (Crowns) trägt nur fünf Knoten, die zehn Boughs von
    // Ring 7 können also gar nicht alle an einer Krone hängen. Sie hängen
    // stattdessen am Covenant zwei Ringe weiter innen — die Verbindungslinie
    // bleibt radial, weil der Winkel derselbe ist.
    const outer = [
      ...FORGE_LEAVES,
      ...FORGE_WARDS,
      ...FORGE_PACTS,
      ...FORGE_CROWNS,
      ...FORGE_BOUGHS,
    ]
    for (const node of outer) {
      const parent = getForgeNode(node.parentId)
      expect(parent, `${node.id} hängt an keinem Knoten`).toBeDefined()
      expect(node.phase, `${node.id} geht vor seinem Elternknoten auf`).toBeGreaterThan(
        parent!.phase,
      )
      expect(node.angleDeg, `${node.id} sitzt nicht über seinem Elternknoten`).toBe(
        parent!.angleDeg,
      )
    }
    // Crown und Bough verlangen Stufen von ihrem Covenant — die muss es in
    // ihrer jeweiligen Phase schon geben.
    expect(FORGE_PACT_MAX_LEVEL).toBeGreaterThanOrEqual(FORGE_BOUGH_PARENT_MIN_LEVEL)
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
