import { describe, it, expect } from 'vitest'
import {
  FORGE_NODES,
  FORGE_CROWNS,
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  getForgeNode,
} from '@/config/progression/starForge'
import {
  SOLAR_BRANCHES,
  SOLAR_MAX_LEVELS,
  SAVE_ID_RENAMES,
  FORGE_ROOT_ANGLES_DEG,
  FORGE_TIER_BASE_MAX_LEVEL,
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_LEAF_MAX_LEVEL,
  FORGE_WARD_MAX_LEVEL,
  FORGE_PACT_MAX_LEVEL,
  FORGE_CROWN_MAX_LEVEL,
  FORGE_UPGRADE_GROUPS,
} from '@/config/constants'
import type { ForgeNodeDef, ForgeNodeTier } from '@/types'

/**
 * Der ZUSAMMENLAUF — Knoten, die mehrere Vorgänger verlangen.
 *
 * `requires` ist die einzige Stelle im Katalog, an der eine Abhängigkeit NICHT
 * aus der Geometrie folgt: der Elternteil steht per Definition auf derselben
 * Speiche eine Ebene tiefer, ein zusätzlicher Vorgänger kann überall stehen.
 * Genau deshalb kann er auch überall falsch stehen — auf einem Knoten, den es
 * nicht gibt, auf einer Stufe, die zum Freischaltzeitpunkt niemand erreicht,
 * oder auf sich selbst.
 *
 * Nichts davon fällt beim Spielen auf: ein Knoten, der nie aufgeht, sieht aus
 * wie einer, der noch nicht aufgegangen ist. Das ist dieselbe Fehlerklasse wie
 * eine Codex-Bahn, die man nicht abschliessen kann — und der Grund, warum diese
 * Datei existiert.
 */

/** Der Deckel eines Rings. Ring 6 und 7 stehen ausserhalb der Staffelung. */
const TIER_CAP: Record<ForgeNodeTier, number> = {
  branch: FORGE_BRANCH_MAX_LEVEL_CAP,
  leaf: FORGE_LEAF_MAX_LEVEL,
  ward: FORGE_WARD_MAX_LEVEL,
  pact: FORGE_PACT_MAX_LEVEL,
  crown: FORGE_CROWN_MAX_LEVEL,
  bough: Infinity,
}

/**
 * Die Höchststufe, die ein Knoten in einer gegebenen Sonnenphase HAT — dieselbe
 * Formel wie `starForgeStore.nodeMaxLevel`.
 *
 * Sie steht hier ein zweites Mal, und das ist Absicht: die Spec soll die
 * Erreichbarkeit aus den KONSTANTEN nachrechnen und nicht aus dem Store, den sie
 * prüft. Läuft die Formel dort auseinander, bricht `forgeRingLadder.spec.ts`.
 */
function maxLevelAtPhase(def: ForgeNodeDef, phase: number): number {
  if (def.tier === 'bough') return Infinity
  if (def.tier === 'crown') return FORGE_CROWN_MAX_LEVEL
  return Math.min(TIER_CAP[def.tier], FORGE_TIER_BASE_MAX_LEVEL + Math.max(0, phase - def.phase))
}

/** Die Ringfolge von innen nach aussen — dieselbe Quelle wie Chipleiste und Tiefenfeld. */
const RING_ORDER = FORGE_UPGRADE_GROUPS.map((group) => group.tier)
const ringIndex = (tier: string): number => RING_ORDER.indexOf(tier as never)

/** Auf welcher Wurzelachse eine Speiche liegt — jede Wurzel hält drei. */
function axisOf(angleDeg: number): string {
  for (const [axis, root] of Object.entries(FORGE_ROOT_ANGLES_DEG)) {
    for (const delta of [-24, 0, 24]) {
      if ((root + delta + 360) % 360 === angleDeg) return axis
    }
  }
  return ''
}

const RAY_IDS = new Set<string>(SOLAR_BRANCHES.map((ray) => ray.id))
const WITH_REQUIRES = FORGE_NODES.filter((def) => (def.requires ?? []).length > 0)

describe('Star Forge — die Zusatz-Voraussetzungen', () => {
  it('es gibt sie überhaupt', () => {
    // Fiele `requires` still weg, bestünde alles darunter — die Prüfungen laufen
    // dann über eine leere Menge und sagen nichts mehr.
    expect(WITH_REQUIRES.length).toBeGreaterThan(0)
  })

  it('jede genannte Id gibt es wirklich', () => {
    // Ein Tippfehler wäre keine strengere Bedingung, sondern eine unerfüllbare:
    // `anyNodeLevel` liefert für eine unbekannte Id 0, und 0 erreicht keine
    // Stufe.
    for (const def of WITH_REQUIRES) {
      for (const req of def.requires ?? []) {
        expect(
          getForgeNode(req.id) !== undefined || RAY_IDS.has(req.id),
          `${def.id} verlangt ${req.id} — den gibt es nicht`,
        ).toBe(true)
      }
    }
  })

  it('jede Voraussetzung liegt weiter INNEN', () => {
    // Zwei Gründe, und beide sind hart.
    //
    // Erstens Zyklen: zwei Knoten desselben Rings könnten sich gegenseitig
    // verlangen, und keiner ginge je auf.
    //
    // Zweitens `adminMaxAll()`. Es arbeitet `FORGE_NODES` in ARRAY-Reihenfolge
    // ab (Branches → Leaves → Wards → Covenants → Crowns → Boughs) und prüft
    // `nodeUnlocked` gar nicht — es verlässt sich darauf, dass jeder Vorgänger
    // vorher dran war. Eine Bedingung auf denselben oder einen äusseren Ring
    // liefe dort still ins Leere.
    for (const def of WITH_REQUIRES) {
      for (const req of def.requires ?? []) {
        const inner = getForgeNode(req.id)
        const innerRing = inner ? ringIndex(inner.tier) : ringIndex('root')
        expect(
          innerRing,
          `${def.id} (${def.tier}) verlangt ${req.id} — das liegt nicht weiter innen`,
        ).toBeLessThan(ringIndex(def.tier))
      }
    }
  })

  it('jede geforderte Stufe ist zum Freischaltzeitpunkt erreichbar', () => {
    // DIE Prüfung dieser Datei. In Pyre steht ein Zweig auf höchstens 5, ein
    // Blatt auf 4, ein Ward auf 3, ein Covenant auf 2 — wer dort eine 6
    // verlangte, hätte einen Knoten gebaut, der in seiner eigenen Phase nicht
    // aufgeht und es erst eine Sonnenphase später tut, ohne dass es irgendwo
    // stünde.
    for (const def of WITH_REQUIRES) {
      for (const req of def.requires ?? []) {
        const inner = getForgeNode(req.id)
        const reachable = inner ? maxLevelAtPhase(inner, def.phase) : SOLAR_MAX_LEVELS
        expect(
          req.level,
          `${def.id} verlangt ${req.id} Lv ${req.level}, erreichbar sind in Phase ${def.phase} nur ${reachable}`,
        ).toBeLessThanOrEqual(reachable)
        expect(req.level, `${def.id} verlangt ${req.id} Lv ${req.level}`).toBeGreaterThan(0)
      }
    }
  })

  it('kein Knoten verlangt sich selbst, seinen Elternteil oder etwas doppelt', () => {
    // Der Elternteil steht bereits als erste Zeile in `nodeRequirements` — ihn
    // zu wiederholen zeigte dieselbe Bedingung zweimal in der Liste, mit zwei
    // womöglich verschiedenen Stufen.
    for (const def of WITH_REQUIRES) {
      const ids = (def.requires ?? []).map((req) => req.id)
      expect(ids, `${def.id} verlangt sich selbst`).not.toContain(def.id)
      expect(ids, `${def.id} wiederholt seinen Elternteil`).not.toContain(def.parentId)
      expect(new Set(ids).size, `${def.id} nennt eine Id doppelt`).toBe(ids.length)
    }
  })

  it('keine neue Id kollidiert mit einer Umbenennungs-Tabelle', () => {
    // Steht eine Katalog-Id als SCHLÜSSEL in `SAVE_ID_RENAMES`, schreibt
    // `loadGame` sie beim Laden auf einen anderen Knoten um — echter
    // Fortschritt landete dann im falschen Beutel. `saveIdMigration.spec.ts`
    // prüft dieselbe Bedingung von der anderen Seite.
    for (const def of FORGE_NODES) {
      expect(SAVE_ID_RENAMES[def.id], `${def.id} steht in SAVE_ID_RENAMES`).toBeUndefined()
    }
  })
})

describe('Star Forge — die Kronen laufen zusammen', () => {
  it('jede Krone verlangt mehr als ihren Elternteil', () => {
    for (const def of FORGE_CROWNS) {
      expect((def.requires ?? []).length, `${def.id}`).toBeGreaterThan(0)
    }
  })

  it('die Kronen mit ZWEI Zusatzbedingungen holen sie von zwei FREMDEN Achsen', () => {
    // Das ist die Design-Zusage des Rings und nicht bloss eine hübsche Anordnung:
    // eine Regel über die Reise soll erst kaufen können, wer auch Material und
    // Bewahrung ausgebaut hat. Kämen beide Vorgänger von derselben Achse — oder
    // gar von der eigenen —, wäre es wieder eine Kette, nur mit zwei Gliedern.
    //
    // Die Kronen mit EINER Zusatzbedingung sind die andere Fassung derselben
    // Idee: sie verlangen die EIGENE Achse bis nach unten. Sie sind hier
    // ausgenommen, und die Prüfung darunter hält sie fest.
    const conjunctions = FORGE_CROWNS.filter((def) => (def.requires ?? []).length >= 2)
    expect(conjunctions.length).toBeGreaterThan(0)
    for (const def of conjunctions) {
      const own = axisOf(def.angleDeg)
      const axes = (def.requires ?? []).map((req) => axisOf(getForgeNode(req.id)!.angleDeg))
      expect(own, `${def.id} sitzt auf keiner Wurzelachse`).not.toBe('')
      expect(axes, `${def.id} holt einen Vorgänger von seiner eigenen Achse`).not.toContain(own)
      expect(new Set(axes).size, `${def.id} holt zwei Vorgänger von derselben Achse`).toBe(
        axes.length,
      )
    }
  })

  it('die DREIFACH-Kronen holen je einen Zweig, ein Blatt und einen Ward', () => {
    // Die dritte Fassung ist nicht einfach „eine Bedingung mehr": sie greift in
    // drei RINGE zugleich. Zwei Wards und ein Blatt wären wieder dieselbe
    // Tiefe, nur breiter — und der Ring hätte drei Fassungen, von denen zwei
    // dasselbe sagen.
    const triples = FORGE_CROWNS.filter((def) => (def.requires ?? []).length === 3)
    expect(triples.length).toBeGreaterThan(0)
    for (const def of triples) {
      const tiers = (def.requires ?? []).map((req) => getForgeNode(req.id)!.tier)
      expect([...tiers].sort(), `${def.id} greift nicht in drei verschiedene Ringe`).toEqual([
        'branch',
        'leaf',
        'ward',
      ])
    }
  })

  it('die Kronen mit EINER Zusatzbedingung verlangen die eigene Speiche', () => {
    const single = FORGE_CROWNS.filter((def) => (def.requires ?? []).length === 1)
    expect(single.length).toBeGreaterThan(0)
    for (const def of single) {
      const inner = getForgeNode(def.requires![0].id)!
      expect(inner.angleDeg, `${def.id} verlangt einen Knoten fremder Speiche`).toBe(def.angleDeg)
    }
  })
})

/**
 * Derselbe Sweep für den VAULT.
 *
 * Relikte und Konstellationen tragen seit der Vokabular-Umstellung dieselbe
 * `requires`-Liste wie die Baumknoten — und das ist der eigentliche Gewinn
 * dieser Umstellung: ihre Bedingungen waren zuvor von KEINER Spec gedeckt. Ein
 * Relikt, das einen Knoten nennt, den es nicht gibt, wäre unschmiedbar und
 * sähe im Bild genauso aus wie eines, dessen Tor noch nicht offen ist.
 *
 * Ein Vault-Eintrag hat keine eigene Freischaltphase — anders als ein Knoten
 * hängt er nicht an der Ring-Leiter. Geprüft wird deshalb gegen den DECKEL
 * seines Rings statt gegen eine Phase: was dort steht, ist irgendwann
 * erreichbar; was darüber steht, nie.
 */
const VAULT_ENTRIES = [
  ...FORGE_RELICS.map((def) => ({ id: def.id, kind: 'Relikt', requires: def.requires })),
  ...FORGE_CONSTELLATIONS.map((def) => ({
    id: def.id,
    kind: 'Konstellation',
    requires: def.requires,
  })),
]

describe('Star Forge — die Voraussetzungen des Vaults', () => {
  it('jeder Eintrag verlangt überhaupt etwas', () => {
    // Ein Vault-Eintrag hat keinen Elternteil, der die Grundbedingung trägt:
    // seine Liste IST die Bedingung. Leer hiesse „liegt von Anfang an aus".
    expect(VAULT_ENTRIES.length).toBeGreaterThan(0)
    for (const entry of VAULT_ENTRIES) {
      expect(entry.requires.length, `${entry.kind} ${entry.id} verlangt nichts`).toBeGreaterThan(0)
    }
  })

  it('jede genannte Id gibt es wirklich', () => {
    for (const entry of VAULT_ENTRIES) {
      for (const req of entry.requires) {
        expect(
          getForgeNode(req.id) !== undefined || RAY_IDS.has(req.id),
          `${entry.kind} ${entry.id} verlangt ${req.id} — den gibt es nicht`,
        ).toBe(true)
      }
    }
  })

  it('jede geforderte Stufe ist erreichbar', () => {
    // Gegen den Deckel des Rings und nicht gegen eine Phase: ein Ward hat vier
    // Stufen, wer dort fünf verlangte, hätte einen Eintrag gebaut, der nie
    // aufgeht.
    for (const entry of VAULT_ENTRIES) {
      for (const req of entry.requires) {
        const inner = getForgeNode(req.id)
        const cap = inner ? TIER_CAP[inner.tier] : SOLAR_MAX_LEVELS
        expect(req.level, `${entry.kind} ${entry.id} → ${req.id} Lv ${req.level}`).toBeGreaterThan(
          0,
        )
        expect(
          req.level,
          `${entry.kind} ${entry.id} verlangt ${req.id} Lv ${req.level}, der Ring gibt nur ${cap} her`,
        ).toBeLessThanOrEqual(cap)
      }
    }
  })

  it('kein Eintrag nennt eine Id doppelt', () => {
    // Zwei Zeilen für denselben Knoten, womöglich mit zwei verschiedenen
    // Stufen — die Anzeige zeigte beide, und welche gilt, entschiede die
    // Reihenfolge.
    for (const entry of VAULT_ENTRIES) {
      const ids = entry.requires.map((req) => req.id)
      expect(new Set(ids).size, `${entry.kind} ${entry.id} nennt eine Id doppelt`).toBe(ids.length)
    }
  })

  it('keine Vault-Id kollidiert mit der Umbenennungs-Tabelle', () => {
    for (const entry of VAULT_ENTRIES) {
      expect(SAVE_ID_RENAMES[entry.id], `${entry.id} steht in SAVE_ID_RENAMES`).toBeUndefined()
    }
  })
})
