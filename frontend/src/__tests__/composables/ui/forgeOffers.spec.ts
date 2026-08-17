import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useForgeOffers } from '@/composables/ui/useForgeOffers'
import { useHerald } from '@/composables/ui/useHerald'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import {
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  FORGE_BARGAINS,
} from '@/config/progression/starForge'
import {
  FORGE_CONSTELLATION_REQUIRED_LEVEL,
  FORGE_VAULT_FUSED_BADGE,
  FORGE_VAULT_MAX_BADGE,
} from '@/config/constants'

/**
 * `useForgeOffers` entscheidet, was der Spieler von Relikten, Konstellationen
 * und dem Handel überhaupt ZU SEHEN bekommt — seit die Abteilungs-Rail
 * gestrichen ist, gibt es keinen zweiten Ort mehr, an dem ein durchgefallener
 * Eintrag noch auftauchen würde. Ein Fehler hier LÖSCHT Inhalt aus dem Spiel,
 * ohne dass irgendwo eine Ausnahme fliegt.
 *
 * Geprüft wird deshalb vor allem die VOLLSTÄNDIGKEIT: Streifen und Archiv
 * zusammen müssen jeden Katalogeintrag genau einmal führen, in jedem Zustand.
 *
 * Die zweite Weiche ist die Trennung, die den ganzen Umbau trägt: ERSCHEINEN
 * hängt an der Freischaltung, KAUFBAR AUSSEHEN am Geldbeutel. Fielen die beiden
 * zusammen, verschwänden Zeilen unter dem Zeiger, während die Chimes ticken.
 */

/* Der Herold ist ein Modul-Singleton: ohne Aufräumen trüge ein Test die
   Quittung des vorigen mit sich. */
beforeEach(() => {
  setActivePinia(createPinia())
  useHerald().reset()
})

/** Ein Relikt mit seinem Tor — dasselbe Muster für alle sechs. */
const RELIC = FORGE_RELICS[0]
const CONSTELLATION = FORGE_CONSTELLATIONS[0]

function fillPurse(): void {
  useGameStore().chimes = 100_000_000
  useInventoryStore().collectedMaterials = {
    stardust: 999,
    moon_crystal: 999,
    nebula_quartz: 999,
    solar_essence: 999,
    void_shard: 999,
    dark_matter: 999,
  }
}

function emptyPurse(): void {
  useGameStore().chimes = 0
  useInventoryStore().collectedMaterials = {}
}

/** Das Tor eines Relikts öffnen, ohne etwas zu bezahlen. */
function unlockRelic(relic = RELIC): void {
  useStarForgeStore().branchLevels[relic.requiresNode] = relic.requiresLevel
}

function unlockConstellation(con = CONSTELLATION): void {
  const forge = useStarForgeStore()
  forge.branchLevels[con.nodeA] = FORGE_CONSTELLATION_REQUIRED_LEVEL
  forge.branchLevels[con.nodeB] = FORGE_CONSTELLATION_REQUIRED_LEVEL
}

/** Ein Handel liegt aus — im frischen Stand ist die Auslage leer. */
function stockBargain(): void {
  useStarForgeStore().restockBargain()
}

describe('useForgeOffers — Vollständigkeit', () => {
  it('führt jeden Katalogeintrag genau einmal, im frischen Spielstand', () => {
    stockBargain()
    const { offers, vaultEntries } = useForgeOffers()

    const ids = [...offers.value.map((o) => o.id), ...vaultEntries.value.map((v) => v.id)]
    expect(new Set(ids).size, 'ein Eintrag steht doppelt').toBe(ids.length)

    for (const relic of FORGE_RELICS) expect(ids, `Relikt ${relic.id} fehlt`).toContain(relic.id)
    for (const con of FORGE_CONSTELLATIONS) expect(ids, `Konstellation ${con.id} fehlt`).toContain(con.id)
  })

  it('führt jeden Katalogeintrag genau einmal, wenn alles offen und bezahlt ist', () => {
    const forge = useStarForgeStore()
    for (const relic of FORGE_RELICS) unlockRelic(relic)
    for (const con of FORGE_CONSTELLATIONS) unlockConstellation(con)
    fillPurse()
    stockBargain()

    const { offers, vaultEntries } = useForgeOffers()
    const ids = [...offers.value.map((o) => o.id), ...vaultEntries.value.map((v) => v.id)]
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(FORGE_RELICS.length + FORGE_CONSTELLATIONS.length + 1)
    expect(forge.activeDeal).not.toBeNull()
  })

  it('jede Zeile ist darstellbar — Name, Zeichen mit Präfix, Verb', () => {
    unlockRelic()
    unlockConstellation()
    stockBargain()
    const { offers } = useForgeOffers()

    for (const offer of offers.value) {
      expect(offer.name.length, `${offer.id} hat keinen Namen`).toBeGreaterThan(0)
      expect(offer.icon, `${offer.id} hat kein Zeichen`).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/)
      expect(offer.verb.length, `${offer.id} hat kein Verb`).toBeGreaterThan(0)
      expect(offer.color).toMatch(/^#/)
    }
  })
})

describe('useForgeOffers — Erscheinen hängt an der Freischaltung', () => {
  it('ein gesperrtes Relikt steht im Archiv, nicht im Streifen — auch mit vollem Beutel', () => {
    fillPurse()
    stockBargain()
    const { offers, vaultEntries } = useForgeOffers()

    expect(offers.value.map((o) => o.id)).not.toContain(RELIC.id)
    const vault = vaultEntries.value.find((v) => v.id === RELIC.id)
    expect(vault?.state).toBe('locked')
    expect(vault?.need).toBe(RELIC.requiresLevel)
    expect(vault?.progress).toBe(0)
  })

  it('der Fortschritt zum Tor steht am Archiveintrag', () => {
    useStarForgeStore().branchLevels[RELIC.requiresNode] = RELIC.requiresLevel - 1
    const { vaultEntries } = useForgeOffers()

    const vault = vaultEntries.value.find((v) => v.id === RELIC.id)
    expect(vault?.have).toBe(RELIC.requiresLevel - 1)
    expect(vault?.progress).toBeCloseTo((RELIC.requiresLevel - 1) / RELIC.requiresLevel)
  })

  it('ein freigeschaltetes Relikt steht im Streifen, auch wenn der Beutel leer ist', () => {
    unlockRelic()
    emptyPurse()
    const { offers, vaultEntries } = useForgeOffers()

    const offer = offers.value.find((o) => o.id === RELIC.id)
    expect(offer, 'freigeschaltetes Relikt fehlt im Streifen').toBeDefined()
    expect(offer?.ready, 'ohne Chimes darf es nicht kaufbar aussehen').toBe(false)
    expect(offer?.goldOk).toBe(false)
    expect(vaultEntries.value.map((v) => v.id)).not.toContain(RELIC.id)
  })

  it('erst der volle Beutel macht dieselbe Zeile kaufbar', () => {
    unlockRelic()
    fillPurse()
    const { offers } = useForgeOffers()

    const offer = offers.value.find((o) => o.id === RELIC.id)
    expect(offer?.ready).toBe(true)
    expect(offer?.goldOk).toBe(true)
    expect(offer?.materials.every((mat) => mat.ok)).toBe(true)
  })

  it('ein ausgebautes Relikt sinkt ins Archiv und trägt die MAX-Marke', () => {
    unlockRelic()
    useStarForgeStore().relicLevels[RELIC.id] = RELIC.maxLevel
    fillPurse()
    const { offers, vaultEntries } = useForgeOffers()

    expect(offers.value.map((o) => o.id)).not.toContain(RELIC.id)
    const vault = vaultEntries.value.find((v) => v.id === RELIC.id)
    expect(vault?.state).toBe('done')
    expect(vault?.badge).toBe(FORGE_VAULT_MAX_BADGE)
  })

  it('eine fusionierte Konstellation sinkt ins Archiv und trägt die FUSED-Marke', () => {
    unlockConstellation()
    useStarForgeStore().forgedConstellations = [CONSTELLATION.id]
    fillPurse()
    const { offers, vaultEntries } = useForgeOffers()

    expect(offers.value.map((o) => o.id)).not.toContain(CONSTELLATION.id)
    const vault = vaultEntries.value.find((v) => v.id === CONSTELLATION.id)
    expect(vault?.state).toBe('done')
    expect(vault?.badge).toBe(FORGE_VAULT_FUSED_BADGE)
  })

  it('eine offene Konstellation trägt beide Tore mit ihrem Stand', () => {
    unlockConstellation()
    const { offers } = useForgeOffers()

    const offer = offers.value.find((o) => o.id === CONSTELLATION.id)
    expect(offer?.reqs).toHaveLength(2)
    expect(offer?.reqs.every((req) => req.met)).toBe(true)
    expect(offer?.reqs.map((req) => req.id)).toEqual([CONSTELLATION.nodeA, CONSTELLATION.nodeB])
  })
})

describe('useForgeOffers — der Handel', () => {
  it('steht immer als erste Zeile, auch wenn er unbezahlbar ist', () => {
    unlockRelic()
    fillPurse()
    stockBargain()
    const { offers } = useForgeOffers()

    expect(offers.value[0]?.kind).toBe('bargain')
    expect(offers.value[0]?.restockMs).not.toBeNull()

    emptyPurse()
    expect(offers.value[0]?.kind).toBe('bargain')
  })

  it('trägt als ID das AUSLIEGENDE Angebot, nicht die Abteilung', () => {
    stockBargain()
    const forge = useStarForgeStore()
    const { offers } = useForgeOffers()

    expect(offers.value[0]?.id).toBe(forge.bargainDealId)
    expect(FORGE_BARGAINS.map((b) => b.id)).toContain(offers.value[0]?.id)
  })

  it('meldet sich als verkauft, statt einen toten Kaufknopf zu zeigen', () => {
    stockBargain()
    const forge = useStarForgeStore()
    forge.bargainPurchased = true
    const { offers } = useForgeOffers()

    expect(offers.value[0]?.sold).toBe(true)
    expect(offers.value[0]?.ready).toBe(false)
  })
})

describe('useForgeOffers — Reihenfolge', () => {
  it('Kaufbares steht vor dem, was noch spart', () => {
    const forge = useStarForgeStore()
    for (const relic of FORGE_RELICS) unlockRelic(relic)
    // Genug für das billigste, zu wenig für alles: die Grenze verläuft dann
    // mitten durch die Liste, und genau das soll die Sortierung trennen.
    useGameStore().chimes = Math.min(...FORGE_RELICS.map((r) => forge.relicGoldCost(r.id)))
    useInventoryStore().collectedMaterials = { stardust: 999, moon_crystal: 999 }
    stockBargain()

    const { offers } = useForgeOffers()
    const rest = offers.value.filter((o) => o.kind !== 'bargain')
    const firstSaving = rest.findIndex((o) => !o.ready)
    if (firstSaving === -1) return
    expect(
      rest.slice(firstSaving).some((o) => o.ready),
      'nach der ersten sparenden Zeile darf keine kaufbare mehr kommen',
    ).toBe(false)
  })
})

describe('useForgeOffers — Kaufen', () => {
  it('kauft ein Relikt und hebt seine Stufe', () => {
    unlockRelic()
    fillPurse()
    const forge = useStarForgeStore()
    const { buyOffer } = useForgeOffers()

    expect(buyOffer(RELIC.id)).toBe(true)
    expect(forge.relicLevel(RELIC.id)).toBe(1)
  })

  it('fusioniert eine Konstellation', () => {
    unlockConstellation()
    fillPurse()
    const forge = useStarForgeStore()
    const { buyOffer } = useForgeOffers()

    expect(buyOffer(CONSTELLATION.id)).toBe(true)
    expect(forge.constellationForged(CONSTELLATION.id)).toBe(true)
  })

  it('kauft nichts, was der Streifen gar nicht führt', () => {
    emptyPurse()
    const { buyOffer } = useForgeOffers()
    expect(buyOffer(RELIC.id), 'gesperrtes Relikt darf nicht käuflich sein').toBe(false)
    expect(buyOffer('does-not-exist')).toBe(false)
  })

  it('ein leerer Beutel kauft nicht', () => {
    unlockRelic()
    emptyPurse()
    const forge = useStarForgeStore()
    const { buyOffer } = useForgeOffers()

    expect(buyOffer(RELIC.id)).toBe(false)
    expect(forge.relicLevel(RELIC.id)).toBe(0)
  })
})
