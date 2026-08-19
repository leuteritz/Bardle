import { describe, it, expect } from 'vitest'
import { FORGE_GLIMMERS, FORGE_NODES, getForgeNode } from '@/config/progression/starForge'
import { FORGE_CLUSTERS, forgeClusterOf } from '@/config/progression/starForgeNet'
import {
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_GLIMMER_AXIS_SHARE,
  FORGE_GLIMMER_FAMILY_ICON,
  FORGE_GLIMMER_MAX_LEVEL,
  FORGE_LEAF_AMPLIFY_PER_LEVEL,
  FORGE_LEAF_MAX_LEVEL,
  FORGE_PACT_MAX_LEVEL,
  FORGE_WARD_MAX_LEVEL,
  SOLAR_BRANCHES,
} from '@/config/constants'
import type { ForgeEffectFamily, ForgeNodeDef } from '@/types'

/**
 * Die DURCHMISCHUNG — der Wächter gegen den Fehler, der diesen Umbau ausgelöst
 * hat.
 *
 * Der alte Baum hatte drei Speichen je Wurzelachse, und sie lagen nebeneinander.
 * Die `dmgPerClick`-Achse trug damit über sechs Ringe achtzehn Knoten Kampf,
 * Boss und Ladder am Stück — ein ganzer 72°-Sektor der Bühne sagte genau eine
 * Sache. Das fiel niemandem auf, weil keine Zahl an einer Stelle stand, an der
 * man Achse und Wirkung zugleich sah.
 *
 * Genau das steht jetzt hier. Und es steht als RECHNUNG, nicht als Absicht: wer
 * einen Knoten umhängt oder einen neuen erfindet, bricht diese Datei, sobald
 * ein Ort wieder nur eine Aussage trägt.
 */

/** Auf welcher Kette ein Knoten liegt — benannt nach ihrem Zweig. */
const BY_ID = new Map(FORGE_NODES.map((def) => [def.id, def]))
const RAY_IDS = new Set<string>(SOLAR_BRANCHES.map((r) => r.id))

function chainOf(nodeId: string): string {
  let cursor = nodeId
  const seen = new Set<string>()
  while (BY_ID.has(cursor) && !seen.has(cursor)) {
    const def = BY_ID.get(cursor)!
    if (RAY_IDS.has(def.parentId)) return def.id
    seen.add(cursor)
    cursor = def.parentId
  }
  return cursor
}

function membersOf(clusterId: string): ForgeNodeDef[] {
  const cluster = FORGE_CLUSTERS.find((c) => c.id === clusterId)!
  return cluster.members.map((id) => getForgeNode(id)!).filter(Boolean)
}

describe('Star Forge — kein Ort trägt nur eine Aussage', () => {
  it('jeder Cluster führt mindestens zwei Effektfamilien', () => {
    // DIE Prüfung dieser Datei. Ein Cluster ist der Ort, den der Spieler auf
    // einmal sieht — trägt er nur eine Familie, ist er derselbe Sektor wie
    // früher, nur in anderer Form.
    for (const cluster of FORGE_CLUSTERS) {
      const families = new Set(membersOf(cluster.id).map((def) => def.family))
      expect(
        families.size,
        `${cluster.id} trägt nur ${[...families].join(', ')}`,
      ).toBeGreaterThanOrEqual(2)
    }
  })

  it('kein Cluster wird von einer einzigen Familie beherrscht', () => {
    // Zwei Familien allein genügen nicht: fünf Kampfknoten und ein
    // Wirtschaftsknoten wären formal gemischt und sähen aus wie vorher. Die
    // Mehrheit darf deshalb nicht mehr als zwei Drittel halten.
    for (const cluster of FORGE_CLUSTERS) {
      const members = membersOf(cluster.id)
      const count = new Map<ForgeEffectFamily, number>()
      for (const def of members) count.set(def.family, (count.get(def.family) ?? 0) + 1)
      const top = Math.max(...count.values())
      expect(
        top / members.length,
        `${cluster.id}: ${top} von ${members.length} Knoten tragen dieselbe Familie`,
      ).toBeLessThanOrEqual(2 / 3)
    }
  })

  it('jede Familie liegt in mindestens drei verschiedenen Clustern', () => {
    // Sonst liesse sich „gemischt" erschleichen, indem man alle Kampfknoten in
    // einen Cluster legt und ihm einen einzigen fremden Knoten beistellt.
    const spread = new Map<ForgeEffectFamily, Set<string>>()
    for (const cluster of FORGE_CLUSTERS) {
      for (const def of membersOf(cluster.id)) {
        const set = spread.get(def.family) ?? new Set<string>()
        set.add(cluster.id)
        spread.set(def.family, set)
      }
    }
    for (const [family, clusters] of spread) {
      expect(clusters.size, `${family} liegt nur in ${[...clusters].join(', ')}`).toBeGreaterThanOrEqual(
        3,
      )
    }
  })

  it('keine Wurzelachse hält einen Cluster allein', () => {
    // Die andere Hälfte derselben Frage. Die Familie sagt, WAS ein Knoten tut;
    // die Achse sagt, WO er hängt. Früher fielen beide zusammen — genau das war
    // der Fehler, und beide Prüfungen zusammen schliessen ihn.
    for (const cluster of FORGE_CLUSTERS) {
      const axes = new Set(membersOf(cluster.id).map((def) => chainOf(def.id)))
      expect(axes.size, `${cluster.id} liegt auf einer einzigen Kette`).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('Star Forge — die Array-Ordnung trägt die Abhängigkeit', () => {
  it('jeder Vorgänger steht früher in FORGE_NODES als der Knoten, der ihn nennt', () => {
    // Der EINZIGE Wächter, den `starForgeStore.adminMaxAll()` hat: es arbeitet
    // das Array in Reihenfolge ab und prüft `nodeUnlocked` gar nicht. Bricht die
    // Ordnung, läuft `maxEverything` still ins Leere — und `maxEverything` ist
    // das Werkzeug, mit dem jede Messung aufgesetzt wird.
    //
    // Früher deckte `forgeRequirements.spec.ts` das über den Ringindex ab („jede
    // Voraussetzung liegt weiter INNEN"). Mit den Ringen ist dieser Wächter
    // gefallen, und das hier ist sein Ersatz.
    const index = new Map(FORGE_NODES.map((def, i) => [def.id, i]))
    FORGE_NODES.forEach((def, i) => {
      const deps = [def.parentId, ...(def.requires ?? []).map((r) => r.id), def.boosts ?? '']
      for (const dep of deps) {
        if (!dep || RAY_IDS.has(dep)) continue
        const at = index.get(dep)
        expect(at, `${def.id} nennt ${dep} — den gibt es nicht`).toBeDefined()
        expect(at!, `${def.id} steht vor seinem Vorgänger ${dep}`).toBeLessThan(i)
      }
    })
  })
})

describe('Star Forge — die Glimmers bleiben Wege', () => {
  it('es sind sechzig, und jeder liegt in einem Cluster', () => {
    expect(FORGE_GLIMMERS.length).toBe(60)
    for (const def of FORGE_GLIMMERS) {
      expect(forgeClusterOf(def.id), `${def.id} liegt nirgends`).toBeDefined()
    }
  })

  it('jeder zahlt auf einen Knoten, den es gibt — und nie auf sich selbst', () => {
    for (const def of FORGE_GLIMMERS) {
      expect(def.boosts, `${def.id} zahlt auf nichts`).toBeDefined()
      const target = getForgeNode(def.boosts!)
      expect(target, `${def.id} zahlt auf ${def.boosts}, den es nicht gibt`).toBeDefined()
      expect(target!.tier, `${def.id} zahlt auf einen anderen Glimmer`).not.toBe('glimmer')
      expect(def.boosts, `${def.id} zahlt auf sich selbst`).not.toBe(def.id)
    }
  })

  it('zahlt NIE auf eine Achse, die einen Boden hat', () => {
    // Die härteste Nebenbedingung der sechzig, und sie ist unsichtbar, wenn man
    // sie verletzt: `forgeRingReach.spec.ts` bindet, dass jeder `FORGE_MIN_*`-
    // Boden bei Vollausbau GENAU erreicht wird. Ein Glimmer darüber wäre eine
    // tote Stufe — sie kostet, sie zeigt eine Zahl, und sie bewirkt nichts.
    //
    // Die Liste steht hier und nicht im Katalog, weil sie eine Eigenschaft der
    // ZIELE ist, nicht der Glimmers: wer einem bestehenden Knoten einen Boden
    // gibt, muss hier nachsehen.
    const CLAMPED = new Set([
      'aegis',
      'goldenEcho',
      'quickening',
      'solarSails',
      'cometMiner',
      'warcry',
      'riftAnchor',
      'gravityWell',
      'starwardensLantern',
      'merchantsFavor',
      'almsOfTheKeeper',
      'chimeConduit',
      'quarrymastersEye',
      'kilnSubsidy',
      'omenReader',
      'hollowCore',
      'pathfindersOath',
      'wanderersBeacon',
      'dreamersDraw',
      'unbrokenPact',
      'hollowPact',
      'hagglersPact',
      'merchantsPact',
      'foundersPact',
      'augursPact',
      'patientPact',
      'arbitersPact',
      'cartographersPact',
      'starroadPact',
    ])
    for (const def of FORGE_GLIMMERS) {
      expect(
        CLAMPED.has(def.boosts!),
        `${def.id} zahlt auf ${def.boosts} — die Achse läuft gegen einen Boden`,
      ).toBe(false)
    }
  })

  it('überholt die grossen Knoten nicht', () => {
    // Sechzig Knoten × drei Stufen × bis zu vier Prozentpunkten wären
    // 720 Prozentpunkte — mehr als der Baum selbst. Der Deckel rechnet je ZIEL:
    // was alle Glimmers zusammen beitragen, bleibt unter einem Viertel dessen,
    // was der Zielknoten voll ausgebaut liefert.
    const CAP: Record<string, number> = {
      branch: FORGE_BRANCH_MAX_LEVEL_CAP,
      leaf: FORGE_LEAF_MAX_LEVEL,
      ward: FORGE_WARD_MAX_LEVEL,
      pact: FORGE_PACT_MAX_LEVEL,
    }
    const byTarget = new Map<string, number>()
    for (const def of FORGE_GLIMMERS) {
      byTarget.set(
        def.boosts!,
        (byTarget.get(def.boosts!) ?? 0) + def.effectPerLevel * FORGE_GLIMMER_MAX_LEVEL,
      )
    }
    for (const [targetId, glimmerSum] of byTarget) {
      const target = getForgeNode(targetId)!
      // Ein endloser Ast hat kein Maximum — dort kann nichts überholt werden.
      if (target.tier === 'bough') continue
      const amp = target.tier === 'branch' ? 1 + FORGE_LEAF_MAX_LEVEL * FORGE_LEAF_AMPLIFY_PER_LEVEL : 1
      const own = target.effectPerLevel * (CAP[target.tier] ?? 1) * amp
      expect(
        glimmerSum / own,
        `${targetId}: Glimmers geben ${glimmerSum.toFixed(1)} gegen ${own.toFixed(1)} des Knotens`,
      ).toBeLessThanOrEqual(FORGE_GLIMMER_AXIS_SHARE)
    }
  })

  it('hängt an einem Knoten seines eigenen Clusters', () => {
    // `parentId` schaltet ihn frei, und was ihn freischaltet, muss neben ihm
    // liegen — sonst führte der Weg von irgendwoher, wo der Spieler gerade
    // nicht ist.
    for (const def of FORGE_GLIMMERS) {
      const own = forgeClusterOf(def.id)!
      const parent = forgeClusterOf(def.parentId)
      expect(parent?.id, `${def.id} hängt an ${def.parentId} aus einem fremden Cluster`).toBe(
        own.id,
      )
    }
  })

  it('zahlt auf etwas ANDERES, als woran er hängt', () => {
    // Das ist die Durchmischung in ihrer kleinsten Form und der Grund, warum es
    // die sechzig überhaupt gibt: `parentId` sagt, was ihn aufschliesst,
    // `boosts` sagt, worauf er wirkt. Fielen beide zusammen, wäre ein Glimmer
    // nur eine zusätzliche Stufe seines Nachbarn.
    for (const def of FORGE_GLIMMERS) {
      expect(def.boosts, `${def.id} zahlt auf seinen eigenen Anker`).not.toBe(def.parentId)
    }
  })

  it('trägt das Glyph seiner Familie und kein eigenes', () => {
    for (const def of FORGE_GLIMMERS) {
      expect(def.icon, `${def.id}`).toBe(FORGE_GLIMMER_FAMILY_ICON[def.family])
    }
    // Und jede Familie, die im Netz vorkommt, hat eines.
    for (const def of FORGE_NODES) {
      expect(FORGE_GLIMMER_FAMILY_ICON[def.family], `${def.family} hat kein Glyph`).toBeDefined()
    }
  })

  it('kostet kein Material und bleibt billig', () => {
    for (const def of FORGE_GLIMMERS) {
      expect(Object.keys(def.materialCost).length, `${def.id} verlangt Material`).toBe(0)
      expect(def.baseCost, `${def.id} ist teurer als sein Anker`).toBeLessThan(
        getForgeNode(def.parentId)!.baseCost,
      )
    }
  })
})
