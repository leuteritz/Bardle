/**
 * Wo jeder Knoten des Meep Skill Trees auf der Orbit-Bühne steht.
 *
 * Der Katalog ändert sich zur Laufzeit nie, also wird hier EINMAL beim Laden
 * des Moduls gerechnet und danach nur noch gelesen — kein Winkel, kein Sinus
 * und keine Kantenliste entsteht je in einem Frame. Was sich ändert, ist
 * ausschliesslich der ZUSTAND eines Knotens; der hängt am Store und wird in
 * der Bühne über Klassen und Attribute geschaltet, nicht über neue Geometrie.
 *
 * Warum überhaupt ausgelagert: Knoten, Kanten und Zweignamen müssen von
 * DERSELBEN Rechnung kommen. Läge die Formel in der Komponente und würde für
 * die Kanten ein zweites Mal geschrieben, träfen die Striche die Kreise nicht
 * mehr, sobald jemand eine der Konstanten anfasst.
 */
import {
  MEEP_TREE_BRANCHES,
  MEEP_TREE_NODE_INDEX,
  type MeepTreeBranchDef,
  type MeepTreeNodeDef,
} from '@/config/progression/meepTree'
import {
  SKILL_TREE_ARM_TAG_LEAD_DEG,
  SKILL_TREE_ARM_TAG_RADIUS,
  SKILL_TREE_BASE_ANGLES_DEG,
  SKILL_TREE_CENTER,
  SKILL_TREE_FORK_OFFSET_DEG,
  SKILL_TREE_TIER_DRIFT_DEG,
  SKILL_TREE_TIER_RADIUS,
  SKILL_TREE_Y_SQUASH,
} from '@/config/constants'

export interface SkillTreePoint {
  x: number
  y: number
}

export interface SkillTreePlacement extends SkillTreePoint {
  id: string
  node: MeepTreeNodeDef
  branch: MeepTreeBranchDef
  branchIndex: number
  /** Richtung vom Bühnenzentrum weg — Kostenpille und Kauf-Blitz sitzen radial. */
  angleDeg: number
}

export interface SkillTreeEdge {
  id: string
  /** `null` am Rang 0: die Kante beginnt am Startkreis in der Mitte. */
  fromId: string | null
  toId: string
  branchIndex: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SkillTreeArmTag extends SkillTreePoint {
  id: string
  name: string
  color: string
}

/**
 * Ein Punkt auf der Bahn. Die y-Achse wird gestaucht, die x-Achse nicht — so
 * wird aus jedem Kreisradius eine Ellipse, die ins Breitbild passt, ohne dass
 * die Winkelordnung der Arme sich ändert.
 */
function polar(angleDeg: number, radius: number): SkillTreePoint {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: SKILL_TREE_CENTER.x + Math.cos(rad) * radius,
    y: SKILL_TREE_CENTER.y + Math.sin(rad) * radius * SKILL_TREE_Y_SQUASH,
  }
}

/**
 * Der Winkelversatz innerhalb eines Rangs, symmetrisch um die Armachse.
 * Ein einzelner Knoten steht auf der Achse, zwei spreizen um ∓FORK_OFFSET —
 * die Formel deckt beide Fälle ab, damit eine spätere dritte Wahl auf einem
 * Rang nicht zu einem Sonderfall wird.
 */
function spread(indexInTier: number, countInTier: number): number {
  if (countInTier <= 1) return 0
  return (indexInTier - (countInTier - 1) / 2) * 2 * SKILL_TREE_FORK_OFFSET_DEG
}

function placeBranch(branch: MeepTreeBranchDef, branchIndex: number): SkillTreePlacement[] {
  const base = SKILL_TREE_BASE_ANGLES_DEG[branchIndex]
  const out: SkillTreePlacement[] = []
  for (const node of branch.nodes) {
    const siblings = branch.nodes.filter((n) => n.tier === node.tier)
    const angleDeg =
      base + SKILL_TREE_TIER_DRIFT_DEG * node.tier + spread(siblings.indexOf(node), siblings.length)
    out.push({
      id: node.id,
      node,
      branch,
      branchIndex,
      angleDeg,
      ...polar(angleDeg, SKILL_TREE_TIER_RADIUS[node.tier]),
    })
  }
  return out
}

/** Alle 30 Knoten der Bühne, in Katalogreihenfolge. */
export const SKILL_TREE_PLACEMENTS: readonly SkillTreePlacement[] = MEEP_TREE_BRANCHES.flatMap(
  (branch, i) => placeBranch(branch, i),
)

const PLACEMENT_BY_ID = new Map(SKILL_TREE_PLACEMENTS.map((p) => [p.id, p]))

export function placementOf(id: string): SkillTreePlacement | undefined {
  return PLACEMENT_BY_ID.get(id)
}

/**
 * Eine Linie je Voraussetzung — Rang 5 bekommt damit ZWEI, eine zu jeder
 * Gabelseite. Das ist keine Verzierung: die Bühne zeigt so, dass beide Wege
 * dorthin führen, und genau das ist die Zusage, die die Gabel erträglich macht.
 */
export const SKILL_TREE_EDGES: readonly SkillTreeEdge[] = SKILL_TREE_PLACEMENTS.flatMap(
  (target) => {
    const req = MEEP_TREE_NODE_INDEX[target.id]?.req ?? []
    if (req.length === 0) {
      return [
        {
          id: `e-start-${target.id}`,
          fromId: null,
          toId: target.id,
          branchIndex: target.branchIndex,
          x1: SKILL_TREE_CENTER.x,
          y1: SKILL_TREE_CENTER.y,
          x2: target.x,
          y2: target.y,
        },
      ]
    }
    return req.flatMap((sourceId) => {
      const source = PLACEMENT_BY_ID.get(sourceId)
      if (!source) return []
      return [
        {
          id: `e-${sourceId}-${target.id}`,
          fromId: sourceId,
          toId: target.id,
          branchIndex: target.branchIndex,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
        },
      ]
    })
  },
)

/**
 * Der Zweigname am äußeren Rand — dem Arm ein Stück in Driftrichtung voraus,
 * nicht auf der Achse seines äußersten Knotens. Auf der Achse lag er gemessen
 * über vier von fünf Rang-5-Knoten.
 */
export const SKILL_TREE_ARM_TAGS: readonly SkillTreeArmTag[] = MEEP_TREE_BRANCHES.map(
  (branch, i) => ({
    id: branch.id,
    name: branch.name,
    color: branch.color,
    ...polar(
      SKILL_TREE_BASE_ANGLES_DEG[i] +
        SKILL_TREE_TIER_DRIFT_DEG * (SKILL_TREE_TIER_RADIUS.length - 1) +
        SKILL_TREE_ARM_TAG_LEAD_DEG,
      SKILL_TREE_ARM_TAG_RADIUS,
    ),
  }),
)
