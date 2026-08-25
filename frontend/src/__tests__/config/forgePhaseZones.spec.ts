import { describe, it, expect } from 'vitest'
import { FORGE_NODES } from '@/config/progression/starForge'
import { FORGE_CLUSTERS, forgeClusterOf } from '@/config/progression/starForgeNet'
import {
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  FORGE_WARD_UNLOCK_PHASE,
  FORGE_PACT_UNLOCK_PHASE,
  FORGE_CROWN_UNLOCK_PHASE,
  FORGE_BOUGH_UNLOCK_PHASE,
  FORGE_UPGRADE_GROUPS,
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  SOLAR_BRANCHES,
  FORGE_ROAD_BAND,
} from '@/config/constants'
import type { ForgeNodeTier } from '@/types'

/**
 * Die Phasen-Leiter: **eine Sonnenphase, eine Zone.**
 *
 * Nachfolgerin von `forgeRingLadder.spec.ts`, und der Unterschied ist genau
 * einer: die Leiter ist nicht mehr RUND. Vorher prüfte diese Datei zusätzlich,
 * dass jeder Knoten auf einer von fünfzehn Speichen sitzt und jeder Ring je
 * Speiche höchstens einmal besetzt ist — beide Prüfungen SIND das Raster und
 * fallen ersatzlos. Was der Baum damit verloren hat, war ein Zifferblatt.
 *
 * Was bleibt, ist die Balance-Aussage aus `docs/balance.md`, und die ist
 * unangetastet: jede Sonnenphase öffnet genau eine Gruppe, die Gruppen öffnen in
 * der Reihenfolge, in der sie nach aussen liegen, und jeder Knoten trägt die
 * Phase seiner Zone. Wer eine Freischaltphase verschiebt, bricht hier — und das
 * ist der Zweck.
 */
const RING_PHASE: Record<ForgeNodeTier, number> = {
  branch: FORGE_BRANCH_UNLOCK_PHASE,
  leaf: FORGE_LEAF_UNLOCK_PHASE,
  ward: FORGE_WARD_UNLOCK_PHASE,
  pact: FORGE_PACT_UNLOCK_PHASE,
  crown: FORGE_CROWN_UNLOCK_PHASE,
  bough: FORGE_BOUGH_UNLOCK_PHASE,
  // Ein Glimmer steht NEBEN der Leiter: er trägt die Phase seiner Zone, nicht
  // eine eigene Sprosse. Deshalb steht hier `NaN` und keine Zahl — jeder Wert
  // wäre eine zweite Leiter neben der ersten.
  glimmer: Number.NaN,
}

describe('Star Forge — eine Sonnenphase, eine Zone', () => {
  it('jede Sonnenphase öffnet GENAU einen Rang', () => {
    // Der Kometenzustand vor Spark gehört den Solar Rays (`SOLAR_BRANCHES`, im
    // solarUpgradeStore) — sie haben keine Freischaltphase und stehen deshalb
    // nicht in der Tabelle. Die sechs Phasen darüber tragen je einen Rang des
    // Katalogs.
    const byPhase = new Map<number, ForgeNodeTier[]>()
    for (const [tier, phase] of Object.entries(RING_PHASE) as [ForgeNodeTier, number][]) {
      if (!Number.isFinite(phase)) continue
      byPhase.set(phase, [...(byPhase.get(phase) ?? []), tier])
    }

    for (let phase = 0; phase <= STAR_PHASE_FINAL_INDEX; phase++) {
      const ranks = byPhase.get(phase) ?? []
      expect(
        ranks.length,
        `${STAR_PHASE_DATA[phase].name} öffnet ${ranks.length} Ränge: ${ranks.join(', ') || '—'}`,
      ).toBe(1)
    }
  })

  it('die Ränge gehen in der Reihenfolge auf, in der sie im Netz liegen', () => {
    const tiers = FORGE_UPGRADE_GROUPS.map((g) => g.tier).filter(
      (t): t is ForgeNodeTier => t !== 'root' && t !== 'glimmer',
    )
    for (let i = 1; i < tiers.length; i++) {
      expect(RING_PHASE[tiers[i]], `${tiers[i]} geht nicht nach ${tiers[i - 1]} auf`).toBeGreaterThan(
        RING_PHASE[tiers[i - 1]],
      )
    }
  })

  it('jeder Knoten trägt die Phase seines Rangs — ausser dem Glimmer', () => {
    for (const def of FORGE_NODES) {
      if (def.tier === 'glimmer') continue
      // Eine Confluence hat keine eigene Sprosse: ihr Tor ist der erste Schritt
      // auf die Strasse, nicht eine Sonnenphase. Sie teilt die Phase ihres
      // Boughs, damit sie zugleich mit ihm sichtbar wird.
      if (def.tier === 'confluence') {
        expect(def.phase, `${def.id} steht nicht beim Bough`).toBe(RING_PHASE.bough)
        continue
      }
      expect(def.phase, `${def.id} (${def.tier}) hat eine eigene Phase`).toBe(RING_PHASE[def.tier])
    }
  })

  it('ein Glimmer trägt die Phase SEINER ZONE', () => {
    // Das ist die Stelle, an der die Leiter unsichtbar wird, ohne zu fallen. Ein
    // Glimmer hat keine eigene Sprosse — er geht auf, wenn die Zone aufgeht, in
    // der er liegt. Eine abweichende Zahl wäre ein Knoten, der mitten in einer
    // offenen Zone gesperrt bliebe, ohne dass es irgendwo stünde.
    for (const def of FORGE_NODES) {
      if (def.tier !== 'glimmer') continue
      const cluster = forgeClusterOf(def.id)
      expect(cluster, `${def.id} liegt in keinem Cluster`).toBeDefined()
      expect(def.phase, `${def.id} weicht von seiner Zone ab`).toBe(cluster!.phase)
    }
  })

  it('jede Zone öffnet nicht vor der Zone, aus der sie gespeist wird', () => {
    // Der Ersatz für „die Ringe liegen von innen nach aussen". Im Netz gibt es
    // keine Ringe, aber es gibt die Kette: ein Knoten geht nie vor dem auf,
    // woran er hängt. Sonst stünde er offen und unerreichbar zugleich.
    const byId = new Map(FORGE_NODES.map((n) => [n.id, n]))
    const rayIds = new Set<string>(SOLAR_BRANCHES.map((b) => b.id))
    for (const def of FORGE_NODES) {
      if (rayIds.has(def.parentId)) continue
      const parent = byId.get(def.parentId)
      expect(parent, `${def.id} hängt an keinem Knoten`).toBeDefined()
      expect(
        def.phase,
        `${def.id} (Phase ${def.phase}) geht vor ${parent!.id} (Phase ${parent!.phase}) auf`,
      ).toBeGreaterThanOrEqual(parent!.phase)
    }
  })

  it('jede Zone der SONNE trägt eine Phase, die es gibt', () => {
    for (const cluster of FORGE_CLUSTERS) {
      if (cluster.region === 'road') continue
      expect(cluster.phase, `${cluster.id}`).toBeGreaterThanOrEqual(0)
      expect(cluster.phase, `${cluster.id}`).toBeLessThanOrEqual(STAR_PHASE_FINAL_INDEX)
    }
  })

  it('jede Spur der STRASSE trägt einen Rang, den es gibt', () => {
    // Die Strasse hat keine Sonnenphase — ihr Tor ist der erste Aufbruch. Ein
    // siebter Eintrag in `FORGE_ZONE_BAND` wäre eine Phase, die es nicht gibt,
    // und genau deshalb führt sie ihre eigene Bänderleiter.
    const roads = FORGE_CLUSTERS.filter((c) => c.region === 'road')
    expect(roads.length).toBeGreaterThan(0)
    for (const lane of roads) {
      expect(FORGE_ROAD_BAND[lane.rank], `${lane.id} hat kein Band`).toBeDefined()
    }
  })

  it('die fünf Strahlen sind vollständig', () => {
    expect(SOLAR_BRANCHES.length).toBe(5)
  })
})
