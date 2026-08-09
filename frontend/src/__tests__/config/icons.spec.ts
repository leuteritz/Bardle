import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { MEEP_TREE_BRANCHES } from '@/config/progression/meepTree'
import { CHAMPION_PERKS, CHAMPION_STATS } from '@/config/champions/championLevels'
import { AUGMENTS, AUGMENT_POOL } from '@/config/economy/augments'

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
 * jetzt im Browser über `dev/icon-check.html` — siehe „Icons" in CLAUDE.md.
 */

/** Sets, die das Projekt benutzt. Ein neues Set kommt hier dazu — bewusst, nicht aus Versehen. */
const KNOWN_PREFIXES = new Set(['game-icons', 'ph', 'lucide', 'ri', 'material-symbols'])

const ICON_SHAPE = /^[a-z][a-z0-9-]*:[a-z0-9-]+$/

const MEEP_NODES = MEEP_TREE_BRANCHES.flatMap((b) => b.nodes)

/** Vitest läuft aus `frontend/` — der Sweep geht von dort über den ganzen Quellbaum. */
const SRC = resolve(process.cwd(), 'src')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'graphify-out' && entry.name !== 'node_modules' && entry.name !== '__tests__') {
        sourceFiles(full, out)
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) {
      out.push(full)
    }
  }
  return out
}

/**
 * Alles, was wie ein Iconify-Name in Anführungszeichen aussieht. `node:` fliegt
 * raus (Node-Builtins), URLs scheitern schon an der Form (`//` im Namen).
 */
function iconRefs(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/['"]([a-z][a-z0-9-]*:[a-z0-9-]+)['"]/g)) {
    if (!m[1].startsWith('node:')) out.push(m[1])
  }
  return out
}

describe('Icons — Form und Set', () => {
  it.each([
    ['meep tree node', MEEP_NODES.map((n) => [n.id, n.icon] as const)],
    ['champion perk', CHAMPION_PERKS.map((p) => [p.id, p.icon] as const)],
    ['champion stat', CHAMPION_STATS.map((s) => [s.key, s.icon] as const)],
    ['augment', AUGMENTS.map((a) => [a.id, a.icon] as const)],
  ])('every %s icon names its set', (_label, entries) => {
    for (const [id, icon] of entries) {
      expect(ICON_SHAPE.test(icon), `${id} → "${icon}" ist kein prefix:name`).toBe(true)
      expect(KNOWN_PREFIXES.has(icon.split(':')[0]), `${id} nutzt unbekanntes Set in "${icon}"`).toBe(true)
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

describe('Icons — distinct within one list', () => {
  it('no two meep tree nodes share an icon', () => {
    const icons = MEEP_NODES.map((n) => n.icon)
    expect(new Set(icons).size, `duplicate icon among ${icons.length} nodes`).toBe(icons.length)
  })

  it('no two augments share an icon — the three offered cards must look distinct', () => {
    const icons = AUGMENTS.map((a) => a.icon)
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const aug of AUGMENTS) {
      const first = seen.get(aug.icon)
      if (first) clashes.push(`${first} + ${aug.id} → ${aug.icon}`)
      else seen.set(aug.icon, aug.id)
    }
    expect(clashes, clashes.join('\n')).toEqual([])
    expect(new Set(icons).size).toBe(AUGMENTS.length)
  })

  it('every augment can be rolled on level-up', () => {
    expect(AUGMENT_POOL).toHaveLength(AUGMENTS.length)
  })

  it('no two perks of the same tier share an icon', () => {
    for (const tier of ['adept', 'master', 'elite'] as const) {
      const icons = CHAMPION_PERKS.filter((p) => p.tier === tier).map((p) => p.icon)
      expect(new Set(icons).size, `duplicate icon in the ${tier} pool`).toBe(icons.length)
    }
  })
})
