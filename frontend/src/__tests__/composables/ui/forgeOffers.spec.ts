import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useForgeOffers } from '@/composables/ui/useForgeOffers'
import { useHerald } from '@/composables/ui/useHerald'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useGameStore } from '@/stores/core/gameStore'
import { meetForgeRequirements, setForgeLevel } from '@/__tests__/forgeTestUtils'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { FORGE_RELICS, FORGE_CONSTELLATIONS, FORGE_BARGAINS } from '@/config/progression/starForge'
import {
  FORGE_MASS_SEND_NODE,
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
 * Geprüft wird deshalb vor allem die VOLLSTÄNDIGKEIT — aber gemessen am
 * FREIGESCHALTETEN Katalog, nicht am ganzen: die Spalte zeigt nur, was der
 * Spieler auch erreichen kann. Ein gesperrtes Relikt steht seit dem Umbau
 * nirgends, und das ist die Zusage, die diese Spec bindet. Was noch fehlt,
 * liest der Spieler am Baum ab.
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
  // Der Scheinwerfer ist ebenfalls ein Modul-Singleton, und `pursuedOffer` liest
  // ihn: ohne Aufräumen verfolgte ein Test das Ziel des vorigen.
  useForgeSpotlight().resetForgeSpotlight()
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

/**
 * Das Tor eines Relikts öffnen, ohne etwas zu bezahlen.
 *
 * Über `meetForgeRequirements` und nicht über `branchLevels`: seit ein Relikt
 * auch ein Blatt oder einen Ward verlangen darf, läge die Stufe sonst im
 * falschen Beutel und das Tor bliebe zu.
 */
function unlockRelic(relic = RELIC): void {
  meetForgeRequirements(relic.requires)
}

function unlockConstellation(con = CONSTELLATION): void {
  meetForgeRequirements(con.requires)
}

/** Ein Handel liegt aus — im frischen Stand ist die Auslage leer. */
function stockBargain(): void {
  useStarForgeStore().restockBargain()
}

describe('useForgeOffers — Vollständigkeit', () => {
  it('führt im frischen Spielstand nichts Gesperrtes — weder im Streifen noch im Archiv', () => {
    stockBargain()
    const { offers, vaultEntries } = useForgeOffers()
    const forge = useStarForgeStore()

    const ids = [...offers.value.map((o) => o.id), ...vaultEntries.value.map((v) => v.id)]
    expect(new Set(ids).size, 'ein Eintrag steht doppelt').toBe(ids.length)

    /* Die Gegenprobe zur Vollständigkeit, seit die Spalte filtert: JEDER
       Eintrag, der hier steht, muss sein Tor auch offen haben. Ein blankes
       `toHaveLength(0)` täte es nicht — es bliebe grün, wenn `vaultEntries`
       eines Tages gar nichts mehr lieferte. */
    for (const relic of FORGE_RELICS) {
      if (ids.includes(relic.id)) {
        expect(forge.relicRequirementMet(relic.id), `${relic.id} steht gesperrt in der Liste`).toBe(
          true,
        )
      }
    }
    for (const con of FORGE_CONSTELLATIONS) {
      if (ids.includes(con.id)) {
        expect(
          forge.constellationRequirementMet(con.id),
          `${con.id} steht gesperrt in der Liste`,
        ).toBe(true)
      }
    }
  })

  it('führt jeden Katalogeintrag genau einmal, wenn alles offen und bezahlt ist', () => {
    const forge = useStarForgeStore()
    for (const relic of FORGE_RELICS) unlockRelic(relic)
    for (const con of FORGE_CONSTELLATIONS) unlockConstellation(con)
    fillPurse()
    stockBargain()

    const { offers, bargainOffer, vaultEntries } = useForgeOffers()
    // Der Handel steht nicht mehr im Streifen, gehört aber zum Bestand: ohne
    // ihn zählte diese Rechnung einen Katalog weniger, als der Spieler sieht.
    const ids = [
      ...offers.value.map((o) => o.id),
      ...(bargainOffer.value ? [bargainOffer.value.id] : []),
      ...vaultEntries.value.map((v) => v.id),
    ]
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(FORGE_RELICS.length + FORGE_CONSTELLATIONS.length + 1)
    expect(forge.activeDeal).not.toBeNull()
  })

  it('jede Zeile ist darstellbar — Name, Zeichen mit Präfix, Verb', () => {
    unlockRelic()
    unlockConstellation()
    stockBargain()
    const { offers, bargainOffer } = useForgeOffers()

    for (const offer of [...offers.value, bargainOffer.value].filter((o) => o !== null)) {
      expect(offer.name.length, `${offer.id} hat keinen Namen`).toBeGreaterThan(0)
      expect(offer.icon, `${offer.id} hat kein Zeichen`).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/)
      expect(offer.verb.length, `${offer.id} hat kein Verb`).toBeGreaterThan(0)
      expect(offer.color).toMatch(/^#/)
    }
  })
})

describe('useForgeOffers — Erscheinen hängt an der Freischaltung', () => {
  it('ein gesperrtes Relikt steht NIRGENDS — auch nicht mit vollem Beutel', () => {
    fillPurse()
    stockBargain()
    const { offers, vaultEntries } = useForgeOffers()

    expect(offers.value.map((o) => o.id)).not.toContain(RELIC.id)
    // Und auch nicht im Archiv, wo es bis zum Umbau mit Sperrsatz und Balken
    // lag. Der volle Beutel ist der Kern der Probe: Kaufkraft darf ein
    // geschlossenes Tor nicht aufwiegen.
    expect(vaultEntries.value.map((v) => v.id)).not.toContain(RELIC.id)
  })

  it('erst das offene Tor lässt ein Relikt überhaupt erscheinen', () => {
    // Die Gegenrichtung zur Probe davor: ein Vorgänger EINE Stufe unter dem
    // Tor genügt noch nicht. Alle Bedingungen bis auf eine erfüllen, damit
    // wirklich diese eine die Zeile zurückhält.
    meetForgeRequirements(RELIC.requires)
    const gate = RELIC.requires[0]
    setForgeLevel(gate.id, gate.level - 1)
    const { offers, vaultEntries } = useForgeOffers()

    expect(offers.value.map((o) => o.id)).not.toContain(RELIC.id)
    expect(vaultEntries.value.map((v) => v.id)).not.toContain(RELIC.id)

    // Die letzte Stufe holt es herein.
    setForgeLevel(gate.id, gate.level)
    expect(offers.value.map((o) => o.id)).toContain(RELIC.id)
  })

  it('EINE offene Bedingung von mehreren hält den Eintrag zurück', () => {
    // Ein Relikt mit mehreren Vorgängern: die LETZTE offen zu lassen ist die
    // Regressionsprobe dafür, dass die Freischaltung wirklich alle prüft und
    // nicht bei der ersten erfüllten aufhört.
    const many = FORGE_RELICS.find((r) => r.requires.length >= 2)!
    meetForgeRequirements(many.requires)
    const last = many.requires[many.requires.length - 1]
    setForgeLevel(last.id, 0)
    fillPurse()
    const { offers, vaultEntries } = useForgeOffers()

    expect(offers.value.map((o) => o.id)).not.toContain(many.id)
    expect(vaultEntries.value.map((v) => v.id)).not.toContain(many.id)
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
    expect(vault, 'ein ausgebautes Relikt gehört ins Archiv').toBeDefined()
    expect(vault?.badge).toBe(FORGE_VAULT_MAX_BADGE)
  })

  it('eine fusionierte Konstellation sinkt ins Archiv und trägt die FUSED-Marke', () => {
    unlockConstellation()
    useStarForgeStore().forgedConstellations = [CONSTELLATION.id]
    fillPurse()
    const { offers, vaultEntries } = useForgeOffers()

    expect(offers.value.map((o) => o.id)).not.toContain(CONSTELLATION.id)
    const vault = vaultEntries.value.find((v) => v.id === CONSTELLATION.id)
    expect(vault, 'eine fusionierte Konstellation gehört ins Archiv').toBeDefined()
    expect(vault?.badge).toBe(FORGE_VAULT_FUSED_BADGE)
  })

  it('eine offene Konstellation trägt beide Tore mit ihrem Stand', () => {
    unlockConstellation()
    const { offers } = useForgeOffers()

    const offer = offers.value.find((o) => o.id === CONSTELLATION.id)
    expect(offer?.reqs).toHaveLength(2)
    expect(offer?.reqs.every((req) => req.met)).toBe(true)
    expect(offer?.reqs.map((req) => req.id)).toEqual(CONSTELLATION.requires.map((req) => req.id))
  })
})

describe('useForgeOffers — der Handel', () => {
  it('steht immer bereit, auch wenn er unbezahlbar ist', () => {
    unlockRelic()
    fillPurse()
    stockBargain()
    const { bargainOffer } = useForgeOffers()

    expect(bargainOffer.value?.kind).toBe('bargain')
    expect(bargainOffer.value?.restockMs).not.toBeNull()

    emptyPurse()
    expect(bargainOffer.value?.kind).toBe('bargain')
  })

  /* Er hat seinen eigenen Platz im festen Kopf der Spalte (`ForgeBargainBar`).
     Stünde er wieder im Streifen, rollte ausgerechnet das eine Angebot mit
     einer ablaufenden Uhr wieder aus dem Bild — und dieser Fall fiele sonst
     niemandem auf. */
  it('steht NICHT im Streifen', () => {
    unlockRelic()
    fillPurse()
    stockBargain()
    const { offers } = useForgeOffers()

    expect(offers.value.map((o) => o.kind)).not.toContain('bargain')
  })

  it('trägt als ID das AUSLIEGENDE Angebot, nicht die Abteilung', () => {
    stockBargain()
    const forge = useStarForgeStore()
    const { bargainOffer } = useForgeOffers()

    expect(bargainOffer.value?.id).toBe(forge.bargainDealId)
    expect(FORGE_BARGAINS.map((b) => b.id)).toContain(bargainOffer.value?.id)
  })

  it('meldet sich als verkauft, statt einen toten Kaufknopf zu zeigen', () => {
    stockBargain()
    const forge = useStarForgeStore()
    forge.bargainPurchased = true
    const { bargainOffer } = useForgeOffers()

    expect(bargainOffer.value?.sold).toBe(true)
    expect(bargainOffer.value?.ready).toBe(false)
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
    const firstSaving = offers.value.findIndex((o) => !o.ready)
    if (firstSaving === -1) return
    expect(
      offers.value.slice(firstSaving).some((o) => o.ready),
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

  /* Der Handel steht nicht mehr in `offers`, wohl aber in `offerById` — und
     genau dort schlägt `buyOffer` nach. Fiele er aus der Karte, gäbe es keinen
     Fehler, nur einen Kaufknopf, der nichts tut. */
  it('kauft den Handel, obwohl er nicht im Streifen steht', () => {
    fillPurse()
    const forge = useStarForgeStore()
    // NICHT `stockBargain()`: der würfelt, und ein Rift-Purge wäre ohne Wesen im
    // Feld zu Recht nicht kaufbar. Ein Segen hängt an nichts ausser dem Preis.
    forge.bargainDealId = FORGE_BARGAINS.find((b) => b.kind === 'buff')!.id
    forge.bargainPurchased = false
    const { offers, buyOffer } = useForgeOffers()

    expect(offers.value.map((o) => o.id)).not.toContain(forge.bargainDealId)
    expect(buyOffer(forge.bargainDealId)).toBe(true)
    expect(forge.bargainPurchased).toBe(true)
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

/**
 * Der Verfolgungs-Block — der EINE Vault-Eintrag, auf den von aussen gezeigt
 * wurde.
 *
 * Er ist die Ausnahme von der Regel, die diese Datei sonst bindet: der Streifen
 * zeigt nur Freigeschaltetes, dieser eine Eintrag aber gerade dann, wenn seine
 * Tore noch ZU sind. Ohne ihn führte der Sprung von der gesperrten
 * Send-All-Kachel ins Leere — das Upgrade stünde nirgends in der Spalte.
 */
describe('useForgeOffers — die Verfolgung', () => {
  const { setPursuit } = useForgeSpotlight()

  it('ist ohne Ziel leer', () => {
    const { pursuedOffer, pursuedId } = useForgeOffers()
    expect(pursuedOffer.value).toBeNull()
    expect(pursuedId.value).toBeNull()
  })

  it('baut die Zeile AUCH bei geschlossenen Toren', () => {
    // Die Kernzusage: beim Sprung von der gesperrten Kachel ist genau das der
    // Fall, und eine Zeile, die dann fehlt, macht den ganzen Weg wertlos.
    const { pursuedOffer, pursuedId } = useForgeOffers()
    setPursuit(FORGE_MASS_SEND_NODE)

    const offer = pursuedOffer.value
    expect(offer).not.toBeNull()
    expect(offer!.id).toBe(FORGE_MASS_SEND_NODE)
    expect(offer!.kind).toBe('constellation')
    expect(offer!.ready).toBe(false)
    expect(offer!.reqs.some((req) => !req.met)).toBe(true)
    expect(pursuedId.value).toBe(FORGE_MASS_SEND_NODE)
  })

  it('nennt jedes Tor mit Fortschritt, in Katalogreihenfolge', () => {
    const def = FORGE_CONSTELLATIONS.find((con) => con.id === FORGE_MASS_SEND_NODE)!
    const { pursuedOffer } = useForgeOffers()
    setPursuit(FORGE_MASS_SEND_NODE)

    expect(pursuedOffer.value!.reqs.map((req) => req.id)).toEqual(def.requires.map((r) => r.id))
    for (const req of pursuedOffer.value!.reqs) {
      expect(req.have).toBe(0)
      expect(req.progress).toBe(0)
      expect(req.met).toBe(false)
    }

    // Ein Tor halb offen: der Balken steht dazwischen, das Tor bleibt zu.
    const first = def.requires[0]
    setForgeLevel(first.id, first.level - 1)
    const half = useForgeOffers().pursuedOffer.value!.reqs[0]
    expect(half.have).toBe(first.level - 1)
    expect(half.progress).toBeGreaterThan(0)
    expect(half.progress).toBeLessThan(1)
    expect(half.met).toBe(false)

    setForgeLevel(first.id, first.level)
    const full = useForgeOffers().pursuedOffer.value!.reqs[0]
    expect(full.progress).toBe(1)
    expect(full.met).toBe(true)
  })

  it('verfolgt nur Konstellationen — Relikt, Knoten und Unsinn bleiben stumm', () => {
    // Der Baum und die Upgrade-Liste verlassen sich darauf, dass eine fremde Id
    // ueberall folgenlos bleibt; hier steht die Gegenprobe.
    const { pursuedOffer } = useForgeOffers()
    for (const id of [RELIC.id, 'moonOrbit', 'gibtEsNicht']) {
      setPursuit(id)
      expect(pursuedOffer.value, id).toBeNull()
    }
  })

  it('verfolgt nichts, was schon fusioniert ist', () => {
    const { pursuedOffer, vaultEntries } = useForgeOffers()
    useStarForgeStore().forgedConstellations.push(FORGE_MASS_SEND_NODE)
    setPursuit(FORGE_MASS_SEND_NODE)

    expect(pursuedOffer.value).toBeNull()
    expect(vaultEntries.value.some((entry) => entry.id === FORGE_MASS_SEND_NODE)).toBe(true)
  })

  it('nimmt dem Streifen und dem Kaufweg nichts weg', () => {
    // Die Entdoppelung ist Sache der KOMPONENTE. `offers` und `offerById` bleiben
    // unberuehrt, sonst faende `buyOffer()` den Eintrag nicht mehr, sobald seine
    // Tore offen sind.
    const def = FORGE_CONSTELLATIONS.find((con) => con.id === FORGE_MASS_SEND_NODE)!
    meetForgeRequirements(def.requires)
    emptyPurse()
    setPursuit(FORGE_MASS_SEND_NODE)

    const { offers, offerById, pursuedOffer } = useForgeOffers()
    expect(pursuedOffer.value).not.toBeNull()
    expect(offers.value.some((offer) => offer.id === FORGE_MASS_SEND_NODE)).toBe(true)
    expect(offerById.value.has(FORGE_MASS_SEND_NODE)).toBe(true)
  })
})
