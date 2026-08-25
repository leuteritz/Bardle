import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { MEEP_TREE_BRANCHES, MEEP_TREE_NODE_INDEX } from '@/config/progression/meepTree'
import { FORGE_SEATS } from '@/config/progression/forgeSeats'
import { FORGE_NODES } from '@/config/progression/starForge'
import { SOLAR_BRANCHES } from '@/config/constants'
import { CHAMPION_PERKS, CHAMPION_STATS } from '@/config/champions/championLevels'
import { AUGMENTS, AUGMENT_POOL } from '@/config/economy/augments'
import { OMENS } from '@/config/progression/omens'
import { ICON_POOLS, pickPooledIcon, pickDistinctIcons } from '@/config/ui/iconPools'
import { augmentIcon } from '@/utils/game/rolledIcons'

/*
 * Icons dürfen aus JEDER Iconify-Bibliothek kommen und beliebig oft wiederholt
 * werden. Was offline prüfbar bleibt, prüft diese Spec:
 *   1. die FORM `prefix:name` — ohne Präfix lädt @iconify/vue gar nichts,
 *   2. das PRÄFIX gegen die Liste der im Projekt benutzten Sets — ein Tippfehler
 *      darin (`phosphor:` statt `ph:`) rendert stumm eine leere Fläche,
 *   3. die UNTERSCHEIDBARKEIT innerhalb einer nebeneinander sichtbaren Liste.
 *
 * Was NICHT mehr offline prüfbar ist: ob der Name im Set wirklich existiert.
 * Dafür gab es die lokale `gameicons.txt`; die deckte nur ein einziges Set ab
 * und fiel mit der Öffnung auf alle Bibliotheken weg. Die Existenzprüfung läuft
 * im Browser gegen die Iconify-API — `<set>.json?icons=…` nennt in `not_found`,
 * was fehlt. Es gibt dafür KEINE Prüfseite im Repo (ein früherer Kommentar
 * verwies auf `dev/icon-check.html`, die es nicht gibt); der Weg steht unter
 * „Icons", Regel 8 in CLAUDE.md.
 */

/** Sets, die das Projekt benutzt. Ein neues Set kommt hier dazu — bewusst, nicht aus Versehen. */
const KNOWN_PREFIXES = new Set([
  'game-icons',
  'ph',
  'lucide',
  'ri',
  'material-symbols',
  'mdi',
  'tabler',
])

const ICON_SHAPE = /^[a-z][a-z0-9-]*:[a-z0-9-]+$/

const MEEP_NODES = MEEP_TREE_BRANCHES.flatMap((b) => b.nodes)

/** Vitest läuft aus `frontend/` — der Sweep geht von dort über den ganzen Quellbaum. */
const SRC = resolve(process.cwd(), 'src')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (
        entry.name !== 'graphify-out' &&
        entry.name !== 'node_modules' &&
        entry.name !== '__tests__'
      ) {
        sourceFiles(full, out)
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) {
      out.push(full)
    }
  }
  return out
}

/**
 * Präfixe, die die Form `prefix:name` erfüllen, aber nie ein Icon meinen:
 * Node-Builtins und Vue-Emit-Namen aus `v-model:foo` (`update:query`). Beide
 * stehen als String im Quelltext und liefen sonst als „unbekanntes Set" auf.
 */
const NON_ICON_PREFIXES = ['node:', 'update:']

/**
 * Alles, was wie ein Iconify-Name in Anführungszeichen aussieht. URLs scheitern
 * schon an der Form (`//` im Namen).
 */
function iconRefs(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/['"]([a-z][a-z0-9-]*:[a-z0-9-]+)['"]/g)) {
    if (!NON_ICON_PREFIXES.some((p) => m[1].startsWith(p))) out.push(m[1])
  }
  return out
}

describe('Icons — Form und Set', () => {
  it.each([
    ['meep tree node', MEEP_NODES.map((n) => [n.id, n.icon] as const)],
    ['champion perk', CHAMPION_PERKS.map((p) => [p.id, p.icon] as const)],
    ['champion stat', CHAMPION_STATS.map((s) => [s.key, s.icon] as const)],
  ])('every %s icon names its set', (_label, entries) => {
    for (const [id, icon] of entries) {
      expect(ICON_SHAPE.test(icon), `${id} → "${icon}" ist kein prefix:name`).toBe(true)
      expect(
        KNOWN_PREFIXES.has(icon.split(':')[0]),
        `${id} nutzt unbekanntes Set in "${icon}"`,
      ).toBe(true)
    }
  })

  it('no source file references an unknown icon set', () => {
    const unknown: string[] = []
    for (const file of sourceFiles(SRC)) {
      for (const ref of iconRefs(readFileSync(file, 'utf8'))) {
        if (!KNOWN_PREFIXES.has(ref.split(':')[0])) {
          unknown.push(`${relative(SRC, file).replace(/\\/g, '/')} → ${ref}`)
        }
      }
    }
    expect(
      unknown,
      `unbekanntes Set — Tippfehler oder neues Set in KNOWN_PREFIXES eintragen:\n${unknown.join('\n')}`,
    ).toEqual([])
  })
})

describe('Icons — ausgewürfelte Motive', () => {
  it('every augment and omen names a pool that exists', () => {
    for (const aug of AUGMENTS) {
      expect(
        ICON_POOLS[aug.iconPool],
        `${aug.id} → unbekannte Familie "${aug.iconPool}"`,
      ).toBeDefined()
    }
    for (const omen of OMENS) {
      expect(
        ICON_POOLS[omen.iconPool],
        `${omen.id} → unbekannte Familie "${omen.iconPool}"`,
      ).toBeDefined()
    }
  })

  it('every pool entry is a well-formed name from a known set', () => {
    for (const [key, list] of Object.entries(ICON_POOLS)) {
      expect(list.length, `Familie ${key} ist zu klein für Abwechslung`).toBeGreaterThanOrEqual(10)
      expect(new Set(list).size, `Familie ${key} enthält eine Dublette`).toBe(list.length)
      for (const icon of list) {
        expect(ICON_SHAPE.test(icon), `${key} → "${icon}" ist kein prefix:name`).toBe(true)
        expect(KNOWN_PREFIXES.has(icon.split(':')[0]), `${key} → unbekanntes Set "${icon}"`).toBe(
          true,
        )
      }
    }
  })

  it('is deterministic — the same seed always draws the same glyph', () => {
    for (const key of Object.keys(ICON_POOLS) as (keyof typeof ICON_POOLS)[]) {
      expect(pickPooledIcon(key, 'seed-17')).toBe(pickPooledIcon(key, 'seed-17'))
    }
  })

  it('varies across rolls — the same augment looks different over time', () => {
    // Der Sinn der Pools: dasselbe Augment ein zweites Mal gezogen sieht anders
    // aus. Über 30 Plätze müssen deutlich mehr als zwei Motive vorkommen.
    const seen = new Set(Array.from({ length: 30 }, (_, i) => augmentIcon(AUGMENTS[0].id, i)))
    expect(seen.size).toBeGreaterThan(5)
  })
})

describe('Icons — distinct within one list', () => {
  it('no two meep tree nodes share an icon', () => {
    const icons = MEEP_NODES.map((n) => n.icon)
    expect(new Set(icons).size, `duplicate icon among ${icons.length} nodes`).toBe(icons.length)
  })

  it('pickDistinctIcons never repeats a glyph within one offer', () => {
    // Der Härtefall: drei Karten aus DEMSELBEN Pool. Ohne Versatz kollidieren
    // zwei davon regelmäßig, und nebeneinander muss jede unterscheidbar bleiben.
    for (let seq = 0; seq < 200; seq++) {
      const icons = pickDistinctIcons([
        { pool: 'might', seed: `a#${seq}` },
        { pool: 'might', seed: `b#${seq}` },
        { pool: 'might', seed: `c#${seq}` },
      ])
      expect(new Set(icons).size, `Dublette im Angebot ${seq}: ${icons.join(', ')}`).toBe(3)
    }
  })

  it('every augment can be rolled on level-up', () => {
    expect(AUGMENT_POOL).toHaveLength(AUGMENTS.length)
  })

  /*
   * Seit dem Zusammenlauf stehen Sonnenleiter und The Wandering auf EINER
   * Buehne. Was dort gleichzeitig sichtbar ist, muss unterscheidbar sein —
   * „eindeutig innerhalb einer Liste" reicht dafuer nicht mehr.
   *
   * Zwei Gruppen sind ausgenommen, und beide aus einem Grund, nicht aus Nachsicht:
   *
   * - **Die Glimmers.** Die sechzig kleinen Knoten tragen ABSICHTLICH das Glyph
   *   ihrer Wirkungsfamilie (`ph:sword-fill` fuer Kampf, `ph:moon-fill` fuer
   *   Ruhe). Ihr Motiv ist die Familie, nicht der Knoten — sie einzeln
   *   unterscheidbar zu machen hiesse, diese Auskunft zu loeschen.
   * - **Fuenf benannte Paare der Sonnenleiter.** Sie sind AELTER als der Merge
   *   und liegen je in verschiedenen Zonen. Sie stehen namentlich unten, damit
   *   ein SECHSTES Paar bricht — eine offene Regel haette hier gar nichts gefangen.
   *
   * Relikte und Konstellationen fehlen ganz: sie stehen nie auf der Buehne,
   * sondern im Angebotsstreifen.
   */
  const STAGE_ICON_LEGACY = new Set([
    'game-icons:gold-nuggets', // chimesPerClick | midasOverflow
    'game-icons:hourglass', // chimesPerSecond | quickening
    'game-icons:heart-tower', // wardensVigil | wardensReprieve
    'game-icons:laurel-crown', // wanderersCrest | steadfastTribute
    'game-icons:anchor', // riftAnchor | stillpoint
  ])

  it('no two nodes on the forge stage share an icon', () => {
    const seen = new Map<string, string>()
    for (const seat of FORGE_SEATS) {
      if (seat.tier === 'glimmer') continue
      const icon =
        FORGE_NODES.find((n) => n.id === seat.id)?.icon ??
        MEEP_TREE_NODE_INDEX[seat.id]?.node.icon ??
        SOLAR_BRANCHES.find((b) => b.id === seat.id)?.icon
      if (!icon || STAGE_ICON_LEGACY.has(icon)) continue
      expect(seen.get(icon), `${icon}: ${seen.get(icon)} und ${seat.id}`).toBeUndefined()
      seen.set(icon, seat.id)
    }
    expect(seen.size).toBeGreaterThan(60)
  })

  /* Die Ausnahmeliste darf nicht ueberleben, was sie entschuldigt: faellt ein
     Paar weg, faellt sein Eintrag mit — sonst deckt sie stillschweigend den
     naechsten Fall zu. */
  it('keeps no stale entry in the legacy list', () => {
    const counts = new Map<string, number>()
    for (const seat of FORGE_SEATS) {
      if (seat.tier === 'glimmer') continue
      const icon =
        FORGE_NODES.find((n) => n.id === seat.id)?.icon ??
        MEEP_TREE_NODE_INDEX[seat.id]?.node.icon ??
        SOLAR_BRANCHES.find((b) => b.id === seat.id)?.icon
      if (icon) counts.set(icon, (counts.get(icon) ?? 0) + 1)
    }
    for (const icon of STAGE_ICON_LEGACY) {
      expect(counts.get(icon) ?? 0, `${icon} ist nicht mehr doppelt`).toBeGreaterThan(1)
    }
  })

  /* Was auf der Strasse steht, teilt kein Motiv mit der Sonnenleiter — das ist
     die Nachbarschaft, die der Merge NEU geschaffen hat, und sie traegt keine
     Ausnahme. */
  it('no wandering node borrows an icon from the sun ladder', () => {
    const ladder = new Set([
      ...FORGE_NODES.map((n) => n.icon),
      ...SOLAR_BRANCHES.map((b) => b.icon),
    ])
    for (const id of Object.keys(MEEP_TREE_NODE_INDEX)) {
      const icon = MEEP_TREE_NODE_INDEX[id]!.node.icon
      expect(ladder.has(icon), `${id}: ${icon}`).toBe(false)
    }
  })

  it('no two perks of the same tier share an icon', () => {
    for (const tier of ['adept', 'master', 'elite'] as const) {
      const icons = CHAMPION_PERKS.filter((p) => p.tier === tier).map((p) => p.icon)
      expect(new Set(icons).size, `duplicate icon in the ${tier} pool`).toBe(icons.length)
    }
  })
})
