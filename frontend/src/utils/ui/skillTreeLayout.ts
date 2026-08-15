/**
 * Wo jeder Knoten des Meep Skill Trees auf der Orbit-Bühne steht.
 *
 * Die Bühne ist so BREIT wie ihr Design-Kasten und so HOCH wie der Container
 * hergibt (siehe `SkillTreeComponent`) — die Geometrie hängt deshalb an einer
 * einzigen Zahl, der Bühnenhöhe. Aus ihr folgen Mitte und y-Stauchung, aus
 * denen wiederum alle Knoten, Kanten, Zweignamen, Nebelbänder und der
 * Kernschein fallen.
 *
 * **Gerechnet wird nur, wenn sich diese Höhe ändert** — also beim Öffnen und
 * beim Resize, nie in einem Frame. Ein Ein-Eintrag-Cache reicht dafür: es gibt
 * immer genau eine Bühne, und ihre Höhe ist zwischen zwei Resizes konstant.
 *
 * Warum überhaupt ausgelagert: Knoten, Kanten, Zweignamen und Bänder müssen von
 * DERSELBEN Rechnung kommen. Läge die Formel in der Komponente und würde für
 * die Kanten ein zweites Mal geschrieben, träfen die Bögen die Kreise nicht
 * mehr, sobald jemand eine der Konstanten anfasst. Aus demselben Grund steht
 * der Pfad-Bauer `arcPath` hier neben `polar()` und nicht in einem eigenen
 * Util: eine zweite Datei wäre eine zweite Quelle für dieselbe Spirale.
 *
 * **Die Arme sind eine logarithmische Spirale.** `SKILL_TREE_TIER_RADIUS` ist
 * eine geometrische Reihe, der Winkeldrift je Rang konstant — konstantes Δln(r)
 * bei konstantem Δθ ergibt einen über den ganzen Arm gleichbleibenden
 * Steigungswinkel. Das ist der Grund, warum sich der Verlauf zwischen zwei
 * Rängen mit EINER quadratischen Kurve treffen lässt (gemessen ≤ 0,52 px
 * Abweichung) und ein ganzes Nebelband mit sechs.
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
  SKILL_TREE_CENTER_EDGE_CTRL_FRACTION,
  SKILL_TREE_CENTER_X,
  SKILL_TREE_CORE_RADIUS,
  SKILL_TREE_FORK_OFFSET_DEG,
  SKILL_TREE_NEBULA_INNER_R,
  SKILL_TREE_NEBULA_OUTER_R,
  SKILL_TREE_NEBULA_SEGMENTS,
  SKILL_TREE_NEBULA_STOPS,
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
  /** Abstand vom Zentrum. Der Kantenbau braucht von beiden Enden Winkel UND
   *  Radius, um den Kontrollpunkt auf die Spirale zu legen. */
  radius: number
}

export interface SkillTreeEdge {
  id: string
  /** `null` am Rang 0: die Kante beginnt am Startkreis in der Mitte. */
  fromId: string | null
  toId: string
  branchIndex: number
  /** Fertiger `d`-String, Quelle → Ziel. Die RICHTUNG ist Teil des Vertrags:
   *  das Strichmuster wird an der Bogenlänge abgetragen, und zwei Gabelkanten,
   *  die gegenläufig gezeichnet würden, versetzten ihre Striche gegeneinander. */
  d: string
}

export interface SkillTreeArmTag extends SkillTreePoint {
  id: string
  name: string
  color: string
}

/** Ein Spiralarm als weiches Band — der Ersatz für die früheren Rang-Ellipsen. */
export interface SkillTreeNebulaArm {
  id: string
  color: string
  d: string
}

/** Was alle Bänder teilen: ein radialer Verlauf um die Mitte, mitgestaucht. */
export interface SkillTreeNebulaField {
  radius: number
  stops: readonly { offset: number; opacity: number }[]
  /** Macht aus dem kreisrunden Verlauf denselben Oval wie die Arme. */
  squashTransform: string
}

export interface SkillTreeCore extends SkillTreePoint {
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
  nebulaArms: readonly SkillTreeNebulaArm[]
  nebula: SkillTreeNebulaField
  core: SkillTreeCore
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

/**
 * Der Rang-Parameter, den ein Radius auf der Spirale hätte — auch zwischen zwei
 * Rängen und außerhalb von ihnen. Nur die Bänder brauchen ihn: sie laufen von
 * vor Rang 0 bis hinter Rang 4 und müssen unterwegs denselben Winkel treffen
 * wie die Knoten, an denen sie vorbeiziehen.
 */
const TIER_RATIO = Math.pow(
  SKILL_TREE_TIER_RADIUS[SKILL_TREE_TIER_RADIUS.length - 1] / SKILL_TREE_TIER_RADIUS[0],
  1 / (SKILL_TREE_TIER_RADIUS.length - 1),
)

function tierAt(radius: number): number {
  return Math.log(radius / SKILL_TREE_TIER_RADIUS[0]) / Math.log(TIER_RATIO)
}

function build(height: number): SkillTreeLayout {
  const center: SkillTreePoint = { x: SKILL_TREE_CENTER_X, y: height / 2 }
  const ySquash = squashFor(height)

  /**
   * Ein Punkt auf der Spirale. Die y-Achse wird gestaucht oder gestreckt, die
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

  /**
   * Der `Q`-Teil eines Spiralstücks zwischen zwei Polarpunkten.
   *
   * Der Kontrollpunkt liegt auf dem Mittelwinkel, aber weiter draußen als der
   * mittlere Radius — genau um `1/cos(Δθ/2)`, den Faktor, der eine quadratische
   * Kurve auf einen Kreisbogen legt. Auf der logarithmischen Spirale bleibt
   * davon eine Abweichung von höchstens 0,52 px übrig, weniger als eine
   * Strichstärke.
   *
   * Gerechnet wird mit dem GESTAUCHTEN `polar()`, und das ist kein Versehen:
   * die Stauchung ist eine affine Abbildung, quadratische Béziers sind
   * affin-invariant — Kurve-dann-stauchen und stauchen-dann-Kurve sind dasselbe.
   */
  const arcSegment = (a1: number, r1: number, a2: number, r2: number): string => {
    const halfSweep = (((a2 - a1) / 2) * Math.PI) / 180
    const ctrl = polar((a1 + a2) / 2, (r1 + r2) / 2 / Math.cos(halfSweep))
    const end = polar(a2, r2)
    return `Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`
  }

  const placements: SkillTreePlacement[] = MEEP_TREE_BRANCHES.flatMap((branch, branchIndex) => {
    const base = SKILL_TREE_BASE_ANGLES_DEG[branchIndex]
    return branch.nodes.map((node) => {
      const siblings = branch.nodes.filter((n) => n.tier === node.tier)
      const angleDeg =
        base + SKILL_TREE_TIER_DRIFT_DEG * node.tier + spread(siblings.indexOf(node), siblings.length)
      const radius = SKILL_TREE_TIER_RADIUS[node.tier]
      return {
        id: node.id,
        node,
        branch,
        branchIndex,
        angleDeg,
        radius,
        ...polar(angleDeg, radius),
      }
    })
  })

  const byId = new Map(placements.map((p) => [p.id, p]))

  /**
   * Eine Kante je Voraussetzung — Rang 5 bekommt damit ZWEI, eine zu jeder
   * Gabelseite. Das ist keine Verzierung: die Bühne zeigt so, dass beide Wege
   * dorthin führen, und genau das ist die Zusage, die die Gabel erträglich macht.
   *
   * Jede Kante folgt der Spirale statt sie abzukürzen. Eine Sehne über 30°
   * Drift schneidet sichtbar nach innen und lässt den Arm geknickt aussehen —
   * der Bogen ist derselbe Weg, den auch das Nebelband darunter nimmt.
   */
  const edges: SkillTreeEdge[] = placements.flatMap((target) => {
    const req = MEEP_TREE_NODE_INDEX[target.id]?.req ?? []
    if (req.length === 0) {
      /* Vom Kern aus gibt es keinen Startwinkel, aus dem sich ein Bogen ergäbe.
         Der Kontrollpunkt liegt deshalb dem Ziel einen halben Rangschritt
         HINTERHER — der Arm entspringt dem Kern tangential statt als Speiche. */
      const ctrl = polar(
        target.angleDeg - SKILL_TREE_TIER_DRIFT_DEG / 2,
        target.radius * SKILL_TREE_CENTER_EDGE_CTRL_FRACTION,
      )
      return [
        {
          id: `e-start-${target.id}`,
          fromId: null,
          toId: target.id,
          branchIndex: target.branchIndex,
          d: `M ${center.x} ${center.y} Q ${ctrl.x} ${ctrl.y} ${target.x} ${target.y}`,
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
          d: `M ${source.x} ${source.y} ${arcSegment(source.angleDeg, source.radius, target.angleDeg, target.radius)}`,
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

  /**
   * Die fünf Arme als weiche Bänder. Sie sind der Ersatz für die früheren
   * Rang-Ellipsen: die ordneten nach RANG und lasen sich als Zifferblatt, diese
   * ordnen nach ARM und sagen dasselbe in der Sprache einer Galaxie.
   *
   * Das Band beginnt vor Rang 0 und endet hinter Rang 4 — es soll aus dem Kern
   * kommen und ins Nichts auslaufen, nicht an einem Knoten anfangen oder enden.
   * Gerechnet in gleichmäßigen Schritten des RANG-Parameters, nicht des Radius:
   * gleiche Winkelschritte sind genau das, wofür die Bogen-Näherung ausgelegt
   * ist (sechs Segmente halten die Abweichung unter 0,41 px).
   */
  const tInner = tierAt(SKILL_TREE_NEBULA_INNER_R)
  const tOuter = tierAt(SKILL_TREE_NEBULA_OUTER_R)
  const tStep = (tOuter - tInner) / SKILL_TREE_NEBULA_SEGMENTS

  const nebulaArms: SkillTreeNebulaArm[] = MEEP_TREE_BRANCHES.map((branch, i) => {
    const base = SKILL_TREE_BASE_ANGLES_DEG[i]
    const angleOf = (t: number) => base + SKILL_TREE_TIER_DRIFT_DEG * t
    const radiusOf = (t: number) => SKILL_TREE_TIER_RADIUS[0] * Math.pow(TIER_RATIO, t)

    const start = polar(angleOf(tInner), radiusOf(tInner))
    let d = `M ${start.x} ${start.y}`
    for (let s = 0; s < SKILL_TREE_NEBULA_SEGMENTS; s++) {
      const ta = tInner + s * tStep
      const tb = ta + tStep
      d += ` ${arcSegment(angleOf(ta), radiusOf(ta), angleOf(tb), radiusOf(tb))}`
    }
    return { id: branch.id, color: branch.color, d }
  })

  return {
    height,
    center,
    ySquash,
    placements,
    edges,
    armTags,
    nebulaArms,
    nebula: {
      radius: SKILL_TREE_NEBULA_OUTER_R,
      stops: SKILL_TREE_NEBULA_STOPS.map((s) => ({
        offset: s.r / SKILL_TREE_NEBULA_OUTER_R,
        opacity: s.opacity,
      })),
      /* Der Verlauf ist kreisrund gerechnet und wird hier auf denselben Oval
         gebracht wie die Arme — sonst liefe er quer zu den Bändern, die er
         ausblenden soll. */
      squashTransform: `translate(0 ${center.y}) scale(1 ${ySquash}) translate(0 ${-center.y})`,
    },
    /* Der Kernschein. Er ersetzt die dichten inneren Ringe als das, was den
       Blick in die Mitte zieht — dorthin, wo alle fünf Arme entspringen. */
    core: {
      ...center,
      rx: SKILL_TREE_CORE_RADIUS,
      ry: SKILL_TREE_CORE_RADIUS * ySquash,
    },
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
