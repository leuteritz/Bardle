import { describe, it, expect } from 'vitest'
import {
  FORGE_STAGE_SIZE,
  FORGE_RING_ROOT_R,
  FORGE_RING_BRANCH_R,
  FORGE_RING_LEAF_R,
  FORGE_RING_WARD_R,
  FORGE_RING_PACT_R,
  FORGE_RING_CROWN_R,
  FORGE_RING_BOUGH_R,
  FORGE_DEPTH_CREST_SPREAD,
  FORGE_SUN_EDGE_GAP,
  SHOP_SUN_MAX_DIAMETER,
} from '@/config/constants'

/**
 * Die Bühnengeometrie des Sternbaums — bisher nur ein Kommentar, jetzt ein
 * Wächter.
 *
 * Die Abstandstabelle an `FORGE_RING_BOUGH_R` in `constants/forge.ts` ist die
 * Herleitung; diese Datei rechnet sie bei jedem Lauf nach. Sie existiert, weil
 * die Zahlen einzeln harmlos aussehen: ein Radius, ein Durchmesser, eine
 * Bandbreite. Erst zusammen entscheiden sie, ob sich zwei Ringe berühren, ob
 * der innerste in der Sonne steckt und ob das Tiefenfeld wieder Kreiskanten
 * zeigt — und keins davon fällt in einem Screenshot verlässlich auf, weil der
 * Baum gepannt und gezoomt wird.
 *
 * **Die Knotendurchmesser stehen im scoped CSS von `ForgeTreePanel.vue`
 * (`.node-circle--*`) und deshalb hier als Tabelle daneben.** Das ist eine
 * bewusste Doppelung: die Alternative wäre, die Grössen als Konstanten zu
 * führen und ins CSS zu binden — dann stünde eine reine Darstellungsgrösse in
 * `config/` und die Spec prüfte ihre eigene Quelle. Wer eine Knotengrösse
 * ändert, muss diese Zeile mitziehen; genau darauf zielt die Spec.
 */
const NODE_DIAMETER = {
  root: 56,
  branch: 46,
  leaf: 38,
  ward: 40,
  pact: 40,
  crown: 50,
  bough: 42,
} as const

const RINGS: { tier: keyof typeof NODE_DIAMETER; r: number }[] = [
  { tier: 'root', r: FORGE_RING_ROOT_R },
  { tier: 'branch', r: FORGE_RING_BRANCH_R },
  { tier: 'leaf', r: FORGE_RING_LEAF_R },
  { tier: 'ward', r: FORGE_RING_WARD_R },
  { tier: 'pact', r: FORGE_RING_PACT_R },
  { tier: 'crown', r: FORGE_RING_CROWN_R },
  { tier: 'bough', r: FORGE_RING_BOUGH_R },
]

describe('Star Forge — die Bühne trägt alle sieben Ringe', () => {
  it('die Radien steigen streng von innen nach aussen', () => {
    for (let i = 1; i < RINGS.length; i++) {
      expect(RINGS[i].r, `${RINGS[i].tier} liegt nicht ausserhalb von ${RINGS[i - 1].tier}`).toBeGreaterThan(
        RINGS[i - 1].r,
      )
    }
  })

  it('kein Ringabstand ist kleiner als die halben Knoten beider Ringe', () => {
    // Die eine Bedingung, unter der sich zwei Ringe nicht berühren. Bei 12 Uhr
    // steht auf JEDEM Ring ein Knoten (der Strahl `flightSpeed` zeigt mit 270°
    // nach oben und zieht seine Kinder mit) — der engste Fall ist also überall
    // erreicht, nicht nur rechnerisch möglich.
    for (let i = 1; i < RINGS.length; i++) {
      const inner = RINGS[i - 1]
      const outer = RINGS[i]
      const needed = (NODE_DIAMETER[inner.tier] + NODE_DIAMETER[outer.tier]) / 2
      expect(
        outer.r - inner.r,
        `${inner.tier} → ${outer.tier}: ${outer.r - inner.r} px Abstand, nötig sind ${needed}`,
      ).toBeGreaterThan(needed)
    }
  })

  it('der innerste Ring steckt nicht in der Sonne', () => {
    // Die Sonne wächst mit der Phase bis `SHOP_SUN_MAX_DIAMETER`; die Wurzeläste
    // setzen `FORGE_SUN_EDGE_GAP` dahinter an. Der Wurzelknoten muss noch
    // dahinter beginnen, sonst liegt er in der Endphase auf der Scheibe.
    const sunEdge = SHOP_SUN_MAX_DIAMETER / 2 + FORGE_SUN_EDGE_GAP
    const rootInnerEdge = FORGE_RING_ROOT_R - NODE_DIAMETER.root / 2
    expect(rootInnerEdge).toBeGreaterThan(sunEdge)
  })

  it('der äusserste Knoten bleibt innerhalb der Bühne', () => {
    const outer = RINGS[RINGS.length - 1]
    const edge = outer.r + NODE_DIAMETER[outer.tier] / 2
    expect(edge).toBeLessThanOrEqual(FORGE_STAGE_SIZE / 2)
  })

  it('zwei Kämme des Tiefenfelds überlappen nirgends', () => {
    // Überlappen zwei ausklingende Kämme, addieren sich ihre Deckkräfte zu einem
    // dritten, hellen Streifen dazwischen — und der liest sich wieder als Linie,
    // also als genau das, was das Tiefenfeld abgeschafft hat. Gerechnet wird in
    // Prozentpunkten des Bühnenradius, weil der Verlauf dort lebt.
    const half = FORGE_STAGE_SIZE / 2
    const bandHalfPct = FORGE_DEPTH_CREST_SPREAD * 100
    for (let i = 1; i < RINGS.length; i++) {
      const gapPct = ((RINGS[i].r - RINGS[i - 1].r) / half) * 100
      expect(
        gapPct,
        `${RINGS[i - 1].tier} → ${RINGS[i].tier}: ${gapPct.toFixed(1)} pp Kammabstand gegen ${(bandHalfPct * 2).toFixed(1)} pp Bandbreite`,
      ).toBeGreaterThan(bandHalfPct * 2)
    }
  })
})
