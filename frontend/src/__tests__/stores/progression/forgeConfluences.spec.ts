import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useGameStore } from '@/stores/core/gameStore'
import { FORGE_CONFLUENCES, getForgeNode } from '@/config/progression/starForge'
import { MEEP_TREE_NODE_INDEX, MEEP_TREE_NODES } from '@/config/progression/meepTree'

/*
 * Die Naht zwischen Sonne und Strasse — und die zwei Fehler, die sie beim Bauen
 * schon einmal gemacht hat.
 *
 * Beide waren fuer Compiler und Testlauf unsichtbar: `confluenceEffect()` stand
 * fertig da und hatte keinen einzigen Leser, und `confluenceLevels` fehlte im
 * Spielstand. Der Spieler zahlte drei Waehrungen fuer nichts, das den Reload
 * ueberlebt. Diese Spec ist die Antwort darauf, und ihre erste Frage ist nicht
 * „steht der Code da", sondern „aendert der Kauf eine Zahl, die das Spiel liest".
 */

const SRC = resolve(process.cwd(), 'src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf-8')

/**
 * Je Confluence die Zahl, an der man ihre Wirkung SIEHT — nicht der Getter, der
 * sie berechnet. Eine Tabelle gegen die eigene Definition zu pruefen waere ein
 * Zirkelschluss; hier steht die Ablesung am Ende der Kette.
 */
const READINGS: { id: string; read: () => number }[] = [
  { id: 'tidewatch', read: () => useStarForgeStore().offlineEarningsMult },
  { id: 'waychart', read: () => useStarForgeStore().expeditionRewardMult },
  { id: 'sunbind', read: () => useStarForgeStore().bossDamageMult },
  { id: 'handfast', read: () => useStarForgeStore().cpcMult },
  { id: 'hostcall', read: () => useGameStore().totalPower },
]

describe('Confluences — die Naht wirkt', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('deckt jede Confluence mit einer Ablesung ab', () => {
    expect(READINGS.map((r) => r.id).sort()).toEqual(FORGE_CONFLUENCES.map((c) => c.id).sort())
  })

  it('aendert eine gelesene Spielzahl, sobald sie gebunden ist', () => {
    const meep = useMeepTreeStore()
    // Ein Weg auf der Strasse — ohne ihn ist die Kopplung null, und das ist
    // Entwurf, kein Randfall (die naechste Zusicherung haelt es fest).
    meep.bought = MEEP_TREE_NODES.slice(0, 4).map((n) => n.id)
    // Hostcall zahlt einen Betrag in eine Summe, die bei null Meeps null bleibt.
    useGameStore().meeps = 10

    for (const { id, read } of READINGS) {
      const forge = useStarForgeStore()
      const before = read()
      forge.confluenceLevels[id] = 1
      expect(read(), `${id} wirkt nicht`).toBeGreaterThan(before)
      forge.confluenceLevels[id] = 0
      expect(read(), `${id} bleibt haengen`).toBe(before)
    }
  })

  it('gibt ohne Weg auf der Strasse nichts', () => {
    const forge = useStarForgeStore()
    const meep = useMeepTreeStore()
    meep.bought = []
    for (const def of FORGE_CONFLUENCES) forge.confluenceLevels[def.id] = 1
    for (const def of FORGE_CONFLUENCES) expect(forge.confluenceEffect(def.id)).toBe(0)
  })

  it('waechst linear mit jedem gelernten Knoten', () => {
    const forge = useStarForgeStore()
    const meep = useMeepTreeStore()
    const def = FORGE_CONFLUENCES[0]
    forge.confluenceLevels[def.id] = 1
    for (const count of [1, 3, 7]) {
      meep.bought = MEEP_TREE_NODES.slice(0, count).map((n) => n.id)
      expect(forge.confluenceEffect(def.id)).toBe(def.effectPerLevel * count)
    }
  })

  it('gibt ungebunden nichts, egal wie lang die Strasse ist', () => {
    const forge = useStarForgeStore()
    useMeepTreeStore().bought = MEEP_TREE_NODES.map((n) => n.id)
    for (const def of FORGE_CONFLUENCES) expect(forge.confluenceEffect(def.id)).toBe(0)
  })
})

describe('Confluences — erreichbar in beiden Katalogen', () => {
  it('haengt je an einem vorhandenen Forge-Knoten', () => {
    for (const def of FORGE_CONFLUENCES) {
      expect(getForgeNode(def.parentId ?? ''), `${def.id}: ${def.parentId}`).toBeDefined()
    }
  })

  it('verlangt je einen vorhandenen Knoten der Strasse', () => {
    for (const def of FORGE_CONFLUENCES) {
      for (const req of def.requires ?? []) {
        expect(MEEP_TREE_NODE_INDEX[req.id], `${def.id}: ${req.id}`).toBeDefined()
      }
    }
  })

  /*
   * Rang 1 und kein tieferer — und das ist Geometrie, nicht Milde: die
   * Bedingungskante ZIEHT im Layout. Haengt sie an Rang 2 oder 3, zerrt sie den
   * Knoten unter seine Vorgaenger und die Ordnung der Spur kippt.
   */
  it('verlangt den ERSTEN Knoten einer Spur, nie einen tieferen', () => {
    for (const def of FORGE_CONFLUENCES) {
      for (const req of def.requires ?? []) {
        expect(MEEP_TREE_NODE_INDEX[req.id]?.node.tier, `${def.id}: ${req.id}`).toBe(0)
      }
    }
  })

  it('teilt kein Icon mit einer anderen Confluence', () => {
    const icons = FORGE_CONFLUENCES.map((c) => c.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})

describe('Star Forge — kein Beutel ohne Spielstand', () => {
  /*
   * Der Wachhund fuer den zweiten Fehler. Er liest die Schluessel aus dem
   * LAUFENDEN Store statt aus einer gepflegten Liste: eine Liste haette man
   * beim Anlegen von `confluenceLevels` genauso vergessen wie den Save-Block.
   */
  it('speichert und laedt jeden *Levels-Beutel des starForgeStore', () => {
    setActivePinia(createPinia())
    const forge = useStarForgeStore()
    const bags = Object.keys(forge.$state).filter((key) => key.endsWith('Levels'))
    expect(bags.length).toBeGreaterThan(5)

    const persistence = read('composables/system/usePersistence.ts')
    for (const bag of bags) {
      expect(persistence, `${bag} fehlt im Save-Block`).toContain(`${bag}: { ...starForgeStore.${bag} }`)
      expect(persistence, `${bag} fehlt im Ladeblock`).toContain(`starForgeStore.${bag} = `)
    }
  })
})
