/**
 * Wo jeder Knoten des Meep Skill Trees auf der Orbit-Bühne steht.
 *
 * Die Bühne ist so BREIT wie ihr Design-Kasten und so HOCH wie der Container
 * hergibt (siehe `SkillTreeComponent`) — die Geometrie hängt deshalb an einer
 * einzigen Zahl, der Bühnenhöhe. Aus ihr folgen Mitte und y-Stauchung, aus
 * denen wiederum alle Knoten, Kanten und Zweignamen fallen.
 *
 * **Gerechnet wird nur, wenn sich diese Höhe ändert** — also beim Öffnen und
 * beim Resize, nie in einem Frame. Ein Ein-Eintrag-Cache reicht dafür: es gibt
 * immer genau eine Bühne, und ihre Höhe ist zwischen zwei Resizes konstant.
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
  SKILL_TREE_ARM_TAG_MARGIN,
  SKILL_TREE_ARM_TAG_RADIUS,
  SKILL_TREE_BASE_ANGLES_DEG,
  SKILL_TREE_CENTER_X,
  SKILL_TREE_FORK_OFFSET_DEG,
  SKILL_TREE_TIER_DRIFT_DEG,
  SKILL_TREE_TIER_RADIUS,
  SKILL_TREE_Y_SQUASH_RANGE,
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

export interface SkillTreeOrbit {
  key: string
  rx: number
  ry: number
}

export interface SkillTreeLayout {
  height: number
  center: SkillTreePoint
  ySquash: number
  placements: readonly SkillTreePlacement[]
  edges: readonly SkillTreeEdge[]
  armTags: readonly SkillTreeArmTag[]
  orbits: readonly SkillTreeOrbit[]
  placementOf: (id: string) => SkillTreePlacement | undefined
}

/**
 * Wie stark die y-Achse gestaucht wird, damit der äußerste Zweigname genau in
 * die gegebene Höhe passt. Unter 1 entsteht ein Breitbild-Oval, über 1 ein
 * hochkant stehendes; die Grenzen halten beide Extreme davon ab, die Arme
 * unlesbar flach oder unlesbar steil zu legen.
 */
function squashFor(height: number): number {
  const raw = (height / 2 - SKILL_TREE_ARM_TAG_MARGIN) / SKILL_TREE_ARM_TAG_RADIUS
  return Math.min(SKILL_TREE_Y_SQUASH_RANGE.max, Math.max(SKILL_TREE_Y_SQUASH_RANGE.min, raw))
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

function build(height: number): SkillTreeLayout {
  const center: SkillTreePoint = { x: SKILL_TREE_CENTER_X, y: height / 2 }
  const ySquash = squashFor(height)

  /**
   * Ein Punkt auf der Bahn. Die y-Achse wird gestaucht oder gestreckt, die
   * x-Achse nie — so wird aus jedem Kreisradius eine Ellipse, die in die
   * gegebene Höhe passt, ohne dass die Winkelordnung der Arme sich ändert.
   */
  const polar = (angleDeg: number, radius: number): SkillTreePoint => {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: center.x + Math.cos(rad) * radius,
      y: center.y + Math.sin(rad) * radius * ySquash,
    }
  }

  const placements: SkillTreePlacement[] = MEEP_TREE_BRANCHES.flatMap((branch, branchIndex) => {
    const base = SKILL_TREE_BASE_ANGLES_DEG[branchIndex]
    return branch.nodes.map((node) => {
      const siblings = branch.nodes.filter((n) => n.tier === node.tier)
      const angleDeg =
        base + SKILL_TREE_TIER_DRIFT_DEG * node.tier + spread(siblings.indexOf(node), siblings.length)
      return {
        id: node.id,
        node,
        branch,
        branchIndex,
        angleDeg,
        ...polar(angleDeg, SKILL_TREE_TIER_RADIUS[node.tier]),
      }
    })
  })

  const byId = new Map(placements.map((p) => [p.id, p]))

  /**
   * Eine Linie je Voraussetzung — Rang 5 bekommt damit ZWEI, eine zu jeder
   * Gabelseite. Das ist keine Verzierung: die Bühne zeigt so, dass beide Wege
   * dorthin führen, und genau das ist die Zusage, die die Gabel erträglich macht.
   */
  const edges: SkillTreeEdge[] = placements.flatMap((target) => {
    const req = MEEP_TREE_NODE_INDEX[target.id]?.req ?? []
    if (req.length === 0) {
      return [
        {
          id: `e-start-${target.id}`,
          fromId: null,
          toId: target.id,
          branchIndex: target.branchIndex,
          x1: center.x,
          y1: center.y,
          x2: target.x,
          y2: target.y,
        },
      ]
    }
    return req.flatMap((sourceId) => {
      const source = byId.get(sourceId)
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
  })

  /**
   * Der Zweigname am äußeren Rand — dem Arm ein Stück in Driftrichtung voraus,
   * nicht auf der Achse seines äußersten Knotens. Auf der Achse lag er gemessen
   * über vier von fünf Rang-5-Knoten.
   */
  const armTags: SkillTreeArmTag[] = MEEP_TREE_BRANCHES.map((branch, i) => ({
    id: branch.id,
    name: branch.name,
    color: branch.color,
    ...polar(
      SKILL_TREE_BASE_ANGLES_DEG[i] +
        SKILL_TREE_TIER_DRIFT_DEG * (SKILL_TREE_TIER_RADIUS.length - 1) +
        SKILL_TREE_ARM_TAG_LEAD_DEG,
      SKILL_TREE_ARM_TAG_RADIUS,
    ),
  }))

  /** Die fünf Bahnen als Ellipsen — sie machen die Ränge lesbar, ohne zu ziehen. */
  const orbits: SkillTreeOrbit[] = SKILL_TREE_TIER_RADIUS.map((r, i) => ({
    key: `orbit-${i}`,
    rx: r,
    ry: r * ySquash,
  }))

  return {
    height,
    center,
    ySquash,
    placements,
    edges,
    armTags,
    orbits,
    placementOf: (id) => byId.get(id),
  }
}

let cached: SkillTreeLayout | null = null

/**
 * Die vollständige Geometrie für eine Bühnenhöhe. Zwei Aufrufe mit derselben
 * Höhe geben dasselbe Objekt zurück — die Bühne bindet Kanten und Knoten per
 * `:key` an stabile Ids, Vue patcht also Attribute statt neu aufzubauen.
 */
export function skillTreeLayout(height: number): SkillTreeLayout {
  if (!cached || cached.height !== height) cached = build(height)
  return cached
}
