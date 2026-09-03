import { describe, it, expect } from 'vitest'
import { migratedIds, migratedIdMap, migratedPerks } from '@/composables/system/usePersistence'
import { SAVE_ID_RENAMES } from '@/config/constants'
import { MEEP_TREE_NODE_INDEX } from '@/config/progression/meepTree'
import {
  FORGE_NODES,
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  FORGE_BARGAINS,
} from '@/config/progression/starForge'
import { CHAMPION_PERKS } from '@/config/champions/championLevels'
import { VOID_RIFTS } from '@/config/world/void'
import { DRIFTERS } from '@/config/world/drifters'

/* Die Musik-Entfernung hat Inhalts-IDs umbenannt, die ein Spielstand wörtlich
   speichert. Ohne die Übersetzung beim Laden wäre jeder betroffene Kauf still
   verfallen — diese Specs halten die Tabelle an die Kataloge gebunden. */
describe('SAVE_ID_RENAMES', () => {
  const catalogIds = new Set<string>([
    ...Object.keys(MEEP_TREE_NODE_INDEX),
    ...FORGE_NODES.map((n) => n.id),
    ...FORGE_RELICS.map((r) => r.id),
    ...FORGE_CONSTELLATIONS.map((c) => c.id),
    ...FORGE_BARGAINS.map((b) => b.id),
    ...CHAMPION_PERKS.map((p) => p.id),
    // Seit die Ereignis-Chronik einer Galaxie Void- und Drifter-IDs wörtlich
    // speichert, gehören auch diese beiden Kataloge in den Vertrag: eine
    // Umbenennung ohne Eintrag hier liesse jede Marke ihren Namen verlieren.
    ...VOID_RIFTS.map((r) => r.id),
    ...DRIFTERS.map((d) => d.id),
  ])

  it('maps every old id onto an id the current catalog actually has', () => {
    for (const [oldId, newId] of Object.entries(SAVE_ID_RENAMES)) {
      expect(catalogIds.has(newId), `${oldId} → ${newId}`).toBe(true)
    }
  })

  it('never maps an id the catalog still uses — that would rewrite live progress', () => {
    for (const oldId of Object.keys(SAVE_ID_RENAMES)) {
      expect(catalogIds.has(oldId), oldId).toBe(false)
    }
  })
})

describe('migratedIds', () => {
  it('renames known ids and leaves the rest alone', () => {
    expect(migratedIds(['melody_1', 'reso_1', 'eternalCadence'])).toEqual([
      'vigil_1',
      'reso_1',
      'eternalOrbit',
    ])
  })

  it('tolerates a missing or malformed list', () => {
    expect(migratedIds(undefined)).toEqual([])
    expect(migratedIds(['ok', 7, null])).toEqual(['ok'])
  })
})

describe('migratedIdMap', () => {
  it('renames the key and keeps the level', () => {
    expect(migratedIdMap({ allegro: 3, warcry: 2 })).toEqual({ quickening: 3, warcry: 2 })
  })

  /* Kann nur eintreten, wenn ein Spielstand alten und neuen Namen zugleich
     trägt — dann darf der Umzug den höheren Stand nicht überschreiben. */
  it('keeps the higher level when old and new id collide', () => {
    expect(migratedIdMap({ allegro: 2, quickening: 5 })).toEqual({ quickening: 5 })
    expect(migratedIdMap({ quickening: 1, allegro: 4 })).toEqual({ quickening: 4 })
  })

  it('tolerates a missing map', () => {
    expect(migratedIdMap(undefined)).toEqual({})
  })
})

describe('migratedPerks', () => {
  it('renames the perk id but keeps its level slot', () => {
    expect(migratedPerks({ 10: 'attunement', 30: 'warp-cadence' })).toEqual({
      10: 'attunement',
      30: 'warp-rush',
    })
  })

  it('tolerates a champion without perks', () => {
    expect(migratedPerks(undefined)).toEqual({})
  })
})
