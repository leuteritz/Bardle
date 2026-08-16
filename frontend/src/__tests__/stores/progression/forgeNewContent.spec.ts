import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useGameStore } from '@/stores/core/gameStore'
import {
  FORGE_VOID_RELIEF_CAP,
  FORGE_MEEP_COST_FLOOR,
  FORGE_RELIC_OFFLINE_HOURS,
  FORGE_COMPACT_OFFLINE_HOURS,
  VOID_PACT_SHARD_MATERIAL,
  VOID_UNLOCK_LEVEL,
} from '@/config/constants'
import { FORGE_RELICS, FORGE_BARGAINS, getForgeRelic } from '@/config/progression/starForge'
import { DRIFTERS } from '@/config/world/drifters'

/**
 * Die neuen Relikte, Konstellationen und Handel — geprüft wird jeweils die
 * WIRKUNG beim Verbraucher, nicht der Katalogeintrag.
 *
 * Der rote Faden hinter allen sechs: sie greifen dorthin, wo der Baum bisher
 * nichts zu sagen hatte. Void-Zoll, Laufzeit eingesammelter Gaben, Meep-Ernte
 * und die Offline-Grenze waren Zahlen, die der Spieler nur hinnehmen konnte.
 * Genau deshalb liegt der Wert dieser Specs nicht im Katalog, sondern in den
 * fremden Stores, die jetzt einen Forge-Getter lesen.
 */
describe('Neue Forge-Inhalte', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Setzt ein Relikt auf eine Stufe — die Kaufbedingungen sind hier nicht das Thema. */
  function relic(id: string, level: number): void {
    useStarForgeStore().relicLevels[id] = level
  }

  // ── Riftwarden's Seal → Void-Zoll ──────────────────────────────────────────

  it('mildert den Void-Zoll und lässt einen spürbaren Rest stehen', () => {
    const forge = useStarForgeStore()
    const voidStore = useVoidStore()
    voidStore.aftermaths = [
      { sourceId: 'test', expiresAt: voidStore.voidNow + 60_000, durationMs: 60_000, effects: { cpsMult: 0.5 } },
    ]

    expect(voidStore.cpsMult).toBeCloseTo(0.5, 10)

    const def = getForgeRelic('riftwardensSeal')!
    relic('riftwardensSeal', def.maxLevel)
    const relief = forge.voidTollRelief
    expect(relief).toBeCloseTo(FORGE_VOID_RELIEF_CAP, 10)
    // Auf dem VERLUST gerechnet: aus −50 % wird −20 %.
    expect(voidStore.cpsMult).toBeCloseTo(1 - 0.5 * (1 - FORGE_VOID_RELIEF_CAP), 10)
    // Ein Zoll bleibt ein Zoll — vollständig abkaufen kann man ihn nicht.
    expect(voidStore.cpsMult).toBeLessThan(1)
  })

  it('deckelt die Milderung, auch wenn das Relikt weiter wächst', () => {
    relic('riftwardensSeal', 99)
    expect(useStarForgeStore().voidTollRelief).toBeCloseTo(FORGE_VOID_RELIEF_CAP, 10)
  })

  /**
   * `VoidEffects` schliesst einen Wert ÜBER 1 nicht aus (die Boons laufen über
   * dieselbe Nachbeben-Liste). Ein gemilderter Schub wäre eine stille
   * Abschwächung — das Siegel darf nur nach unten wirken.
   */
  it('lässt einen Void-SCHUB unberührt', () => {
    const voidStore = useVoidStore()
    relic('riftwardensSeal', 5)
    voidStore.aftermaths = [
      { sourceId: 'boon', expiresAt: voidStore.voidNow + 60_000, durationMs: 60_000, effects: { cpsMult: 1.4 } },
    ]
    expect(voidStore.cpsMult).toBeCloseTo(1.4, 10)
  })

  it('wirkt auf jede Achse des Zolls, nicht nur auf die Chimes', () => {
    const voidStore = useVoidStore()
    voidStore.aftermaths = [
      {
        sourceId: 'test',
        expiresAt: voidStore.voidNow + 60_000,
        durationMs: 60_000,
        effects: { cpsMult: 0.5, cpcMult: 0.5, combatDpsMult: 0.5, materialDropMult: 0.5, xpMult: 0.5 },
      },
    ]
    relic('riftwardensSeal', 5)
    const expected = 1 - 0.5 * (1 - FORGE_VOID_RELIEF_CAP)
    for (const value of [
      voidStore.cpsMult,
      voidStore.cpcMult,
      voidStore.combatDpsMult,
      voidStore.materialDropMult,
      voidStore.xpMult,
    ]) {
      expect(value).toBeCloseTo(expected, 10)
    }
  })

  // ── Pilgrim's Reliquary → Laufzeit der Gaben ───────────────────────────────

  it('verlängert einen eingesammelten Drifter-Buff, statt ihn zu verstärken', () => {
    const drifters = useDrifterStore()
    const def = DRIFTERS.find((d) => d.buff)!

    drifters.applyBuff(def)
    const plain = drifters.buffs[0].durationMs
    const effects = { ...drifters.buffs[0].effects }

    drifters.buffs = []
    const relicDef = getForgeRelic('pilgrimsReliquary')!
    relic('pilgrimsReliquary', relicDef.maxLevel)
    drifters.applyBuff(def)

    const stretched = drifters.buffs[0].durationMs
    expect(stretched).toBeGreaterThan(plain)
    expect(stretched / plain).toBeCloseTo(useStarForgeStore().boonDurationMult, 4)
    // Die WIRKUNG bleibt gleich — das Relikt kauft Zeit, keine Stärke.
    expect(drifters.buffs[0].effects).toEqual(effects)
  })

  // ── Meep Shrine → Anforderung, nicht Ausbeute ──────────────────────────────

  it('senkt die Meep-Anforderung und hebt die Ausbeute über die Wurzel', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 5_000_000

    const before = { req: game.meepChimeRequirement, meeps: game.exactPendingMeeps }
    const def = getForgeRelic('meepShrine')!
    relic('meepShrine', def.maxLevel)

    const mult = useStarForgeStore().meepCostMult
    expect(mult).toBeLessThan(1)
    expect(game.meepChimeRequirement).toBeCloseTo(before.req * mult, 4)
    // Die Ausbeute steht als Wurzel darauf: 1/√mult, nicht 1/mult.
    expect(game.exactPendingMeeps / before.meeps).toBeCloseTo(1 / Math.sqrt(mult), 6)
  })

  it('lässt den Meep-Faktor nie unter seinen Boden fallen', () => {
    relic('meepShrine', 99)
    expect(useStarForgeStore().meepCostMult).toBeCloseTo(FORGE_MEEP_COST_FLOOR, 10)
  })

  // ── Starfarer's Compact → Offline-Grenze ───────────────────────────────────

  it('addiert die Offline-Stunden zu denen des Relikts, statt sie zu ersetzen', () => {
    const forge = useStarForgeStore()
    expect(forge.offlineMaxHoursBonus).toBe(0)

    relic('echoOfTheVoid', 1)
    expect(forge.offlineMaxHoursBonus).toBe(FORGE_RELIC_OFFLINE_HOURS)

    forge.forgedConstellations.push('starfarersCompact')
    expect(forge.offlineMaxHoursBonus).toBe(FORGE_RELIC_OFFLINE_HOURS + FORGE_COMPACT_OFFLINE_HOURS)
  })

  // ── Voidbound Pact → Splitter aus Kills ────────────────────────────────────

  it('lässt ein erlegtes Wesen erst mit dem Pakt einen Splitter zurück', () => {
    const forge = useStarForgeStore()
    const voidStore = useVoidStore()
    const inventory = useInventoryStore()
    useGameStore().level = VOID_UNLOCK_LEVEL

    const first = voidStore.spawnMonster('sunlessBreach')!
    voidStore.slayMonster(first)
    expect(inventory.collectedMaterials[VOID_PACT_SHARD_MATERIAL] ?? 0).toBe(0)

    forge.forgedConstellations.push('voidboundPact')
    const second = voidStore.spawnMonster('sunlessBreach')!
    voidStore.slayMonster(second)
    expect(inventory.collectedMaterials[VOID_PACT_SHARD_MATERIAL]).toBe(1)
  })

  /**
   * `slayMonster` wird aus zwei Takten gerufen und prüft deshalb, ob es
   * wirklich etwas entfernt hat. Der Splitter muss hinter dieser Prüfung
   * liegen — sonst zahlte ein zweiter Ruf auf ein längst entferntes Wesen ein
   * zweites Mal.
   */
  it('zahlt den Splitter nicht zweimal für dasselbe Wesen', () => {
    const voidStore = useVoidStore()
    const inventory = useInventoryStore()
    useGameStore().level = VOID_UNLOCK_LEVEL
    useStarForgeStore().forgedConstellations.push('voidboundPact')

    const m = voidStore.spawnMonster('sunlessBreach')!
    voidStore.slayMonster(m)
    voidStore.slayMonster(m)
    expect(inventory.collectedMaterials[VOID_PACT_SHARD_MATERIAL]).toBe(1)
  })

  // ── Wanderer's Toll → die Maut auf die Passage ─────────────────────────────

  /** Legt einen bestimmten Handel aus und macht ihn bezahlbar. */
  function stockDeal(dealId: string): void {
    const forge = useStarForgeStore()
    const def = FORGE_BARGAINS.find((b) => b.id === dealId)!
    forge.bargainDealId = dealId
    forge.bargainPurchased = false
    useGameStore().chimes = def.basePrice * 10
    const inventory = useInventoryStore()
    for (const [matId, qty] of Object.entries(def.materials ?? {})) {
      inventory.collectedMaterials[matId] = qty * 5
    }
  }

  it('bietet die Maut nicht an, solange keine Passage offen steht', () => {
    stockDeal('wanderersToll')
    expect(useStarForgeStore().canBuyBargain).toBe(false)
  })

  it('räumt Wesen und Nachbeben und zieht die Splitter ein', () => {
    const forge = useStarForgeStore()
    const voidStore = useVoidStore()
    const inventory = useInventoryStore()
    useGameStore().level = VOID_UNLOCK_LEVEL

    stockDeal('wanderersToll')
    voidStore.spawnMonster('sunlessBreach')
    voidStore.aftermaths = [
      { sourceId: 'x', expiresAt: voidStore.voidNow + 60_000, durationMs: 60_000, effects: { cpsMult: 0.5 } },
    ]
    expect(voidStore.hasVoidPresence).toBe(true)
    expect(forge.canBuyBargain).toBe(true)

    const shardsBefore = inventory.collectedMaterials[VOID_PACT_SHARD_MATERIAL]
    expect(forge.buyBargain()).toBe(true)

    expect(voidStore.hasVoidPresence).toBe(false)
    expect(voidStore.cpsMult).toBe(1)
    // Der Preis wird wirklich abgebucht — vor dieser Zeile prüfte nur der
    // Gold-Handel seine Materialien, und die Maut wäre gratis gewesen.
    expect(inventory.collectedMaterials[VOID_PACT_SHARD_MATERIAL]).toBeLessThan(shardsBefore)
  })

  // ── Meep Caravan → Fund statt Ernte ────────────────────────────────────────

  it('bucht den Karawanen-Lohn als gefundene Meeps mit', () => {
    const forge = useStarForgeStore()
    const game = useGameStore()
    const def = FORGE_BARGAINS.find((b) => b.id === 'meepCaravan')!

    stockDeal('meepCaravan')
    const before = { meeps: game.meeps, lifetime: game.totalMeepsEarned }
    expect(forge.buyBargain()).toBe(true)

    expect(game.meeps - before.meeps).toBe(def.meepReward)
    // Über `grantMeeps` und nicht direkt auf `meeps`: sonst fehlte der Lohn in
    // jeder Statistik und jeder Codex-Bahn, die ihn zählt.
    expect(game.totalMeepsEarned - before.lifetime).toBe(def.meepReward)
  })

  // ── Phase Lantern → der erste Handels-Buff jenseits der Chime-Rate ─────────

  it('verdoppelt die Material-Dropchance auf Zeit', () => {
    const forge = useStarForgeStore()
    const before = forge.materialDropMult

    stockDeal('phaseLantern')
    expect(forge.buyBargain()).toBe(true)
    expect(forge.buffActive('dropX2')).toBe(true)
    expect(forge.materialDropMult).toBeCloseTo(before * 2, 10)
  })

  // ── Katalog-Struktur ───────────────────────────────────────────────────────

  /**
   * Ein Relikt, dessen `requiresNode` es nicht gibt, ist unschmiedbar und fällt
   * im Bild nur als Zeile auf, die nie freischaltet.
   */
  it('hängt jedes Relikt an einen Knoten, den es gibt', () => {
    const forge = useStarForgeStore()
    for (const def of FORGE_RELICS) {
      expect(forge.relicRequirementMet(def.id), `${def.id}`).toBe(false)
      expect(def.requiresLevel).toBeGreaterThan(0)
      expect(def.maxLevel).toBeGreaterThanOrEqual(def.requiresLevel)
    }
  })
})
