import { describe, it, expect } from 'vitest'
import { forgeTreePlacements } from '@/utils/ui/forgeTreeLayout'
import {
  FORGE_NODES,
  FORGE_CROWNS,
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  getForgeNode,
} from '@/config/progression/starForge'
import { getForgeSeat } from '@/config/progression/forgeSeats'
import {
  SOLAR_BRANCHES,
  SOLAR_MAX_LEVELS,
  SAVE_ID_RENAMES,
  FORGE_TIER_BASE_MAX_LEVEL,
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_LEAF_MAX_LEVEL,
  FORGE_WARD_MAX_LEVEL,
  FORGE_PACT_MAX_LEVEL,
  FORGE_CROWN_MAX_LEVEL,
  FORGE_EDGE_MAX_PX,
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

const NODE_BY_ID = new Map(FORGE_NODES.map((def) => [def.id, def]))

const RAY_ID_SET = new Set<string>(SOLAR_BRANCHES.map((ray) => ray.id))

/**
 * Die KETTE, auf der ein Knoten liegt — benannt nach ihrem Zweig, dem
 * innersten Katalogknoten des Weges.
 *
 * Sie tritt an die Stelle der Speiche. Eine Speiche war ein Winkel, eine Kette
 * ist ein Weg: `parentId` zurück bis knapp vor den Strahl. Zwei Knoten liegen
 * genau dann auf derselben Kette, wenn sie denselben Zweig über sich haben —
 * und das ist die Frage, die „aus einer fremden Achse" wirklich stellt.
 */
function chainOf(nodeId: string): string {
  let cursor = nodeId
  const seen = new Set<string>()
  while (NODE_BY_ID.has(cursor) && !seen.has(cursor)) {
    const def = NODE_BY_ID.get(cursor)!
    if (RAY_ID_SET.has(def.parentId)) return def.id
    seen.add(cursor)
    cursor = def.parentId
  }
  return cursor
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
          getForgeSeat(req.id) !== undefined || RAY_IDS.has(req.id),
          `${def.id} verlangt ${req.id} — den gibt es nicht`,
        ).toBe(true)
      }
    }
  })

  it('jede Voraussetzung geht FRÜHER auf', () => {
    // Zwei Gründe, und beide sind hart.
    //
    // Erstens Zyklen: zwei Knoten derselben Phase könnten sich gegenseitig
    // verlangen, und keiner ginge je auf.
    //
    // Zweitens `adminMaxAll()`. Es arbeitet `FORGE_NODES` in ARRAY-Reihenfolge
    // ab und prüft `nodeUnlocked` gar nicht — es verlässt sich darauf, dass
    // jeder Vorgänger vorher dran war. Die Array-Ordnung selbst bindet
    // `forgeMixing.spec.ts`; hier steht die inhaltliche Hälfte derselben
    // Bedingung.
    //
    // Geprüft wird die PHASE und nicht mehr der Ringindex: im Netz gibt es kein
    // Innen und Aussen mehr, aber sehr wohl ein Früher und Später.
    for (const def of WITH_REQUIRES) {
      for (const req of def.requires ?? []) {
        const inner = getForgeNode(req.id)
        const innerPhase = inner ? inner.phase : -1
        expect(
          innerPhase,
          `${def.id} (Phase ${def.phase}) verlangt ${req.id} — das geht nicht früher auf`,
        ).toBeLessThan(def.phase)
      }
    }
  })

  it('jede Voraussetzung liegt im eigenen oder einem angrenzenden Cluster', () => {
    // DIE Zusage des Netz-Umbaus, und die Antwort auf das, woran die alten
    // Spannfäden gescheitert sind: eine Krone stand auf r = 438, ihr Zweig auf
    // r = 221, und das sichtbare Fenster war 484 Bühnen-px breit — der Spieler
    // las eine Liste ferner Namen und musste sie sich merken.
    //
    // Gemessen wird in Bühnen-Pixeln und nicht in Cluster-Namen: was zählt, ist
    // nicht die Zugehörigkeit, sondern der Abstand im Bild. Dieselbe Zahl prüft
    // `forgeNetGeometry.spec.ts` über ALLE Kanten; hier steht sie noch einmal
    // für die Bedingungen allein, weil sie für die den Ausschlag gibt.
    const places = forgeTreePlacements()
    for (const def of WITH_REQUIRES) {
      for (const req of def.requires ?? []) {
        const a = places.get(def.id)
        const b = places.get(req.id)
        expect(a && b, `${def.id} oder ${req.id} steht nirgends`).toBeTruthy()
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
        expect(
          dist,
          `${def.id} verlangt ${req.id} über ${dist.toFixed(0)} px — das passt nicht ins Bild`,
        ).toBeLessThanOrEqual(FORGE_EDGE_MAX_PX)
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

  it('die Kronen mit ZWEI Zubringern holen sie von zwei FREMDEN Ketten', () => {
    // Die Design-Zusage des Rangs, und sie ist keine blosse Anordnung: eine
    // Regel über die Reise soll erst kaufen können, wer auch Material und
    // Bewahrung ausgebaut hat. Kämen beide Zubringer aus derselben Kette — oder
    // gar aus der eigenen —, wäre es wieder eine Kette, nur mit zwei Gliedern.
    //
    // Die KETTE ist im Netz die Einheit, nicht mehr die Speiche: gemeint ist der
    // Weg vom Strahl bis zu diesem Knoten, und zwei Zubringer dürfen nicht
    // beide auf demselben liegen.
    const conjunctions = FORGE_CROWNS.filter((def) => (def.requires ?? []).length >= 2)
    expect(conjunctions.length).toBeGreaterThan(0)
    for (const def of conjunctions) {
      const ownChain = chainOf(def.parentId)
      const chains = (def.requires ?? []).map((req) => chainOf(req.id))
      // Nur die ZWEIFACHE Fassung schliesst die eigene Kette aus. Die dreifache
      // nimmt sie ausdrücklich mit — sie ist der Zusammenlauf ALLER Wege dieses
      // Clusters, und ohne die eigene wäre das keiner.
      if (chains.length === 2) {
        expect(chains, `${def.id} holt einen Zubringer aus seiner eigenen Kette`).not.toContain(
          ownChain,
        )
      }
      expect(new Set(chains).size, `${def.id} holt zwei Zubringer aus derselben Kette`).toBe(
        chains.length,
      )
    }
  })

  it('die DREIFACH-Kronen greifen tiefer als die zweifachen', () => {
    // Die dritte Fassung ist nicht einfach „eine Bedingung mehr". Sie griff
    // früher in drei RINGE zugleich (Zweig, Blatt, Ward); im Netz liegen Zweige
    // und Blätter zu weit innen, um von einer Krone aus sichtbar zu sein.
    //
    // An ihre Stelle tritt der Griff über drei KETTEN — und die Steigerung
    // bleibt messbar: mehr Zubringer, mehr verschiedene Ketten, und mindestens
    // zwei Ränge darunter beteiligt. Zwei Bündnisse und eine Wacht sind damit
    // etwas anderes als drei Bündnisse.
    const triples = FORGE_CROWNS.filter((def) => (def.requires ?? []).length === 3)
    expect(triples.length).toBeGreaterThan(0)
    for (const def of triples) {
      const chains = (def.requires ?? []).map((req) => chainOf(req.id))
      // ALLE DREI Ketten des Clusters, die eigene eingeschlossen — das ist die
      // Steigerung gegenüber der zweiten Fassung, die nur die zwei fremden
      // nimmt. Ein Cluster hat genau drei Ketten; mehr Wege gibt es an dieser
      // Stelle des Netzes nicht, und ein vierter käme aus einem Bild, das der
      // Spieler beim Kauf nicht sieht.
      expect(new Set(chains).size, `${def.id} greift nicht in drei Ketten`).toBe(3)
      expect(chains, `${def.id} lässt die eigene Kette aus`).toContain(chainOf(def.parentId))
      const tiers = new Set((def.requires ?? []).map((req) => getForgeNode(req.id)!.tier))
      expect(tiers.size, `${def.id} greift nur in einen Rang`).toBeGreaterThanOrEqual(2)
    }
  })

  it('die Kronen mit EINEM Zubringer verlangen die Wacht ihrer eigenen Kette', () => {
    const single = FORGE_CROWNS.filter((def) => (def.requires ?? []).length === 1)
    expect(single.length).toBeGreaterThan(0)
    for (const def of single) {
      const inner = getForgeNode(def.requires![0].id)!
      expect(inner.tier, `${def.id} verlangt keine Wacht`).toBe('ward')
      expect(chainOf(def.parentId), `${def.id} verlangt eine fremde Kette`).toBe(chainOf(inner.id))
    }
  })

  it('alle drei Fassungen kommen vor, und keine dominiert', () => {
    // Der Kontrast IST der Inhalt des Rangs. Fällt eine Fassung weg, trägt er
    // nur noch eine Aussage — und dann bräuchte es die drei Gruppen nicht.
    const byCount = new Map<number, number>()
    for (const def of FORGE_CROWNS) {
      const n = (def.requires ?? []).length
      byCount.set(n, (byCount.get(n) ?? 0) + 1)
    }
    expect([...byCount.keys()].sort(), 'es gibt nicht drei Fassungen').toEqual([1, 2, 3])
    for (const [count, n] of byCount) {
      expect(n, `Fassung mit ${count} Zubringern kommt ${n}× vor`).toBeGreaterThanOrEqual(3)
    }
  })

  it('ein endloser Ast verlangt die Krone SEINER EIGENEN Kette', () => {
    // „Was die Regel eröffnet hat, wächst jetzt weiter." Früher zeigten diese
    // fünf quer über den Baum — `darkTithe` (maxHp) auf `tidelessWatch`
    // (chimesPerSecond) —, und der Satz stimmte inhaltlich, war aber im Bild
    // nicht zu sehen. Jetzt hängen beide am selben Bündnis und stehen
    // nebeneinander.
    const gated = FORGE_NODES.filter((def) => def.tier === 'bough' && (def.requires ?? []).length)
    expect(gated.length).toBeGreaterThan(0)
    for (const def of gated) {
      for (const req of def.requires ?? []) {
        const crown = getForgeNode(req.id)!
        expect(crown.tier, `${def.id} verlangt keine Krone`).toBe('crown')
        expect(crown.parentId, `${def.id} und ${crown.id} hängen nicht am selben Bündnis`).toBe(
          def.parentId,
        )
      }
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
