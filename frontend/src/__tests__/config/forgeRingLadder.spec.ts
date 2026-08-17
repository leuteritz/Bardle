import { describe, it, expect } from 'vitest'
import { FORGE_NODES, FORGE_BRANCHES } from '@/config/progression/starForge'
import { SOLAR_BRANCHES, FORGE_ROOT_ANGLES_DEG } from '@/config/constants'
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
} from '@/config/constants'
import type { ForgeNodeTier } from '@/types'

/**
 * Die Ring-Leiter: **eine Sonnenphase, ein Ring.**
 *
 * Vorher hingen die Ringe unregelmässig an der Sonne — Zweige in Zenith, der
 * dritte Zweig je Wurzel in Swell, Blätter erst in Pyre, und in der Endphase
 * kamen zwei Ringe auf einmal. Zwei Phasen schalteten im ganzen Baum gar nichts
 * frei, und das fiel niemandem auf, weil keine Zahl an einer Stelle stand, an
 * der man beide Achsen zugleich sah.
 *
 * Genau das prüft diese Datei: nicht ob eine Konstante stimmt, sondern ob die
 * beiden Achsen — Sonnenphasen und Ringe — noch aufeinander passen. Wer eine
 * Freischaltphase verschiebt oder einen Ring einzieht, bricht hier, und das ist
 * der Zweck.
 */
const RING_PHASE: Record<ForgeNodeTier, number> = {
  branch: FORGE_BRANCH_UNLOCK_PHASE,
  leaf: FORGE_LEAF_UNLOCK_PHASE,
  ward: FORGE_WARD_UNLOCK_PHASE,
  pact: FORGE_PACT_UNLOCK_PHASE,
  crown: FORGE_CROWN_UNLOCK_PHASE,
  bough: FORGE_BOUGH_UNLOCK_PHASE,
}

describe('Star Forge — eine Sonnenphase, ein Ring', () => {
  it('jede Sonnenphase öffnet GENAU einen Ring', () => {
    // Der Kometenzustand vor Spark gehört dem Wurzelring (`SOLAR_BRANCHES`, im
    // solarUpgradeStore) — er hat keine Freischaltphase und steht deshalb nicht
    // in der Tabelle. Die sechs Phasen darüber tragen je einen Ring des
    // Katalogs.
    const byPhase = new Map<number, ForgeNodeTier[]>()
    for (const [tier, phase] of Object.entries(RING_PHASE) as [ForgeNodeTier, number][]) {
      byPhase.set(phase, [...(byPhase.get(phase) ?? []), tier])
    }

    for (let phase = 0; phase <= STAR_PHASE_FINAL_INDEX; phase++) {
      const rings = byPhase.get(phase) ?? []
      expect(
        rings.length,
        `${STAR_PHASE_DATA[phase].name} öffnet ${rings.length} Ringe: ${rings.join(', ') || '—'}`,
      ).toBe(1)
    }
  })

  it('die Ringe gehen in der Reihenfolge auf, in der sie im Baum liegen', () => {
    // `FORGE_UPGRADE_GROUPS` gibt die Ringfolge von innen nach aussen vor —
    // Chipleiste, Tiefenfeld und Filter lesen sie alle dort ab. Läuft die
    // Freischaltung dagegen, stünde ein äusserer Ring offen, während der innere
    // darunter noch zu ist.
    const tiers = FORGE_UPGRADE_GROUPS.map((g) => g.tier).filter(
      (t): t is ForgeNodeTier => t !== 'root',
    )
    for (let i = 1; i < tiers.length; i++) {
      expect(
        RING_PHASE[tiers[i]],
        `${tiers[i]} geht nicht nach ${tiers[i - 1]} auf`,
      ).toBeGreaterThan(RING_PHASE[tiers[i - 1]])
    }
  })

  it('jeder Knoten trägt die Phase SEINES Rings', () => {
    // Eine Ausnahme wäre eine zweite Leiter neben der ersten — und `nodeMaxLevel`
    // rechnet gegen `def.phase`, ein abweichender Knoten stünde also auch noch
    // auf einer anderen Stufe als seine Nachbarn.
    for (const def of FORGE_NODES) {
      expect(def.phase, `${def.id} (${def.tier}) hat eine eigene Phase`).toBe(RING_PHASE[def.tier])
    }
  })

  it('jeder Ring sitzt auf denselben fünfzehn Winkeln', () => {
    // Der Baum steht auf fünfzehn Speichen; jede Verbindungslinie ist radial,
    // weil Kind und Elternknoten denselben Winkel tragen. Ein Knoten auf einem
    // sechzehnten Winkel hinge im Nichts.
    const spokes = new Set(FORGE_BRANCHES.map((b) => b.angleDeg))
    expect(spokes.size).toBe(15)
    for (const def of FORGE_NODES) {
      expect(spokes.has(def.angleDeg), `${def.id} sitzt auf ${def.angleDeg}°`).toBe(true)
    }
    // Und jede Speiche geht von einem der fünf Wurzelwinkel aus.
    for (const branch of FORGE_BRANCHES) {
      const rootAngle = FORGE_ROOT_ANGLES_DEG[branch.parentId as keyof typeof FORGE_ROOT_ANGLES_DEG]
      expect(rootAngle, `${branch.id} hängt an keiner Wurzel`).toBeDefined()
      // Kürzester Winkelabstand, damit der Übergang bei 0°/360° nicht als
      // halber Kreis liest (Golden Echo steht auf 30°, seine Wurzel auf 54°).
      const delta = Math.abs(((branch.angleDeg - rootAngle + 540) % 360) - 180)
      expect(delta, `${branch.id} steht ${delta}° neben seiner Wurzel`).toBeLessThanOrEqual(24)
    }
  })

  it('jeder Ring ist auf jeder Speiche höchstens einmal besetzt', () => {
    const seen = new Set<string>()
    for (const def of FORGE_NODES) {
      const key = `${def.tier}@${def.angleDeg}`
      expect(seen.has(key), `zwei ${def.tier} auf ${def.angleDeg}° (${def.id})`).toBe(false)
      seen.add(key)
    }
  })

  it('die fünf Wurzeln decken die fünf Wurzelwinkel ab', () => {
    for (const ray of SOLAR_BRANCHES) {
      expect(
        FORGE_ROOT_ANGLES_DEG[ray.id as keyof typeof FORGE_ROOT_ANGLES_DEG],
        `${ray.id} hat keinen Winkel`,
      ).toBeDefined()
    }
  })
})
