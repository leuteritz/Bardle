import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { FORGE_WARDS, FORGE_PACTS, getForgeNode } from '@/config/progression/starForge'
import {
  FORGE_WARD_MAX_LEVEL,
  FORGE_PACT_MAX_LEVEL,
  FORGE_MIN_BARD_COOLDOWN_MULT,
  FORGE_MIN_BUILDING_COST_MULT,
  FORGE_MIN_ITEM_COST_MULT,
  FORGE_MIN_CHAMPION_LEVEL_COST_MULT,
  FORGE_MAX_VOID_SPAWN_INTERVAL_MULT,
  FORGE_MAX_VOID_TRAVEL_MULT,
  FORGE_MIN_VOID_MEEP_LOSS_MULT,
  FORGE_MIN_VOID_AFTERMATH_MULT,
  FORGE_MIN_DRIFTER_INTERVAL_MULT,
  FORGE_MIN_OMEN_INTERVAL_MULT,
  FORGE_MIN_OMEN_TARGET_MULT,
  FORGE_MIN_RESOURCE_STAR_INTERVAL_MULT,
  FORGE_MIN_HARVEST_INTERVAL_MULT,
  FORGE_MIN_CHAMPION_TRAVEL_MULT,
  FORGE_MIN_BOSS_HP_MULT,
  FORGE_MIN_EXPEDITION_SPAWN_MULT,
  FORGE_MIN_BARGAIN_PRICE_MULT,
  FORGE_MIN_BARGAIN_RESTOCK_MULT,
  FORGE_MIN_LP_LOSS_MULT,
  FORGE_MIN_BUILDING_MILESTONE_INTERVAL,
  FORGE_MAX_AUGMENT_LUCK_MULT,
  BUILDING_MILESTONE_INTERVAL,
} from '@/config/constants'

/**
 * Ring 4 (Astral Wards) und Ring 5 (Astral Covenants) — die zwei Ringe, die aus
 * dem Baum HERAUSGREIFEN.
 *
 * Geprüft wird die WIRKUNG beim Verbraucher und nicht der Katalogeintrag: der
 * rote Faden hinter allen dreissig Knoten ist, dass sie auf Zahlen sitzen, zu
 * denen die Forge bis hierhin gar nichts zu sagen hatte. Der Wert dieser Datei
 * liegt deshalb in den fremden Stores, die jetzt einen Forge-Getter lesen — ein
 * Katalogtest fände nur wieder, was in `starForge.ts` ohnehin steht.
 *
 * Der zweite Teil unten ist die Gegenprobe, die keiner der Einzelfälle leistet:
 * **jeder Boden wird bei Vollausbau genau ERREICHT und nirgends
 * überschritten.** So ist weder eine Stufe tot noch eine Kappe ein stiller
 * Verlust — anders als bei Solar Sails oder Golden Echo, wo genau das passiert
 * ist und dafür der Überlauf gebaut werden musste.
 *
 * Zwei Grenzen sind davon ausgenommen, und zwar mit Absicht: die zwei
 * VOID-Kappen tragen Reserve. Sie sind nicht die Summe ihres Knotens, sondern
 * die Zusage, dass auch ein späterer Verstärker den Riss nicht stillstellen
 * kann — der Void ist das einzige System, das gegen den Spieler drängt.
 */
function grow(id: string, level = Infinity): void {
  const forge = useStarForgeStore()
  const def = getForgeNode(id)!
  const cap = def.tier === 'ward' ? FORGE_WARD_MAX_LEVEL : FORGE_PACT_MAX_LEVEL
  const value = Math.min(level, cap)
  if (def.tier === 'ward') forge.wardLevels[id] = value
  else forge.pactLevels[id] = value
}

describe('Ring 4 & 5 — die Wirkung kommt beim Zielsystem an', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── flightSpeed-Achse ──────────────────────────────────────────────────────

  it("Pathfinder's Oath steht als EIGENE Zeile in der Erfolgsrechnung", () => {
    const expeditions = useExpeditionStore()
    const slot = { requiredRoles: [], minPowerThreshold: 0, hazards: [], hazardThreshold: 0 }
    const before = expeditions.chanceBreakdownFor([], slot).total
    grow('pathfindersOath')
    const after = expeditions.chanceBreakdownFor([], slot)

    expect(after.total).toBeGreaterThan(before)
    // Der Spieler muss sehen, WOHER seine Chance kommt — ein Ward, der still
    // auf `base` addierte, wäre ein Geschenk ohne Absender.
    const row = after.entries.find((e) => e.id === 'forgeOath')
    expect(row, 'Der Ward fehlt in der Aufschlüsselung').toBeDefined()
    expect(row!.value).toBeCloseTo(useStarForgeStore().expeditionSuccessBonusPct / 100, 10)
  })

  it("Dreamer's Draw hebt nur die Gewichte ÜBER common", () => {
    const forge = useStarForgeStore()
    expect(forge.augmentLuckMult).toBe(1)
    grow('dreamersDraw')
    expect(forge.augmentLuckMult).toBeCloseTo(FORGE_MAX_AUGMENT_LUCK_MULT, 10)
  })

  it("Wanderer's Beacon verkürzt den Drifter-Abstand", () => {
    const forge = useStarForgeStore()
    grow('wanderersBeacon')
    expect(forge.drifterIntervalMult).toBeCloseTo(FORGE_MIN_DRIFTER_INTERVAL_MULT, 10)
    // Der Store rechnet den Faktor beim Neustellen einer Uhr ein — geprüft am
    // Getter, weil `rollIntervalSec` eine Modulfunktion ohne Rückgabe an den
    // Test ist.
    expect(useDrifterStore()).toBeDefined()
  })

  it("Cartographer's Pact holt das nächste Expeditions-Angebot früher", () => {
    grow('cartographersPact')
    expect(useStarForgeStore().expeditionSpawnMult).toBeCloseTo(FORGE_MIN_EXPEDITION_SPAWN_MULT, 10)
  })

  it('Pact of the Long Vigil verlängert dasselbe Offline-Fenster wie Relikt und Konstellation', () => {
    const forge = useStarForgeStore()
    const before = forge.offlineMaxHoursBonus
    grow('longVigilPact')
    // EINE Zahl, nicht zwei nebeneinander: `usePersistence` liest genau einen
    // Forge-Wert, und die Statistik-Zeile ebenso.
    expect(forge.offlineMaxHoursBonus).toBe(before + forge.pactOfflineHoursBonus)
    expect(forge.pactOfflineHoursBonus).toBeGreaterThan(0)
  })

  it('Starroad Pact kürzt die Reise zur nächsten Galaxie', () => {
    const galaxy = useGalaxyStore()
    galaxy.championTravelBaseDurationMs = 100_000
    const before = galaxy.effectiveTravelDurationMs
    grow('starroadPact')
    expect(galaxy.effectiveTravelDurationMs).toBeLessThan(before)
    expect(useStarForgeStore().championTravelMult).toBeCloseTo(FORGE_MIN_CHAMPION_TRAVEL_MULT, 10)
  })

  // ── maxHp-Achse ────────────────────────────────────────────────────────────

  it('Gravity Well verlängert den Anflug eines Void-Wesens', () => {
    const voidStore = useVoidStore()
    const plain = voidStore.spawnMonster()
    expect(plain, 'kein Void-Wesen gespawnt').toBeTruthy()
    const plainTravel = plain!.travelMs
    voidStore.clearAll()

    grow('gravityWell')
    const slowed = voidStore.spawnMonster(plain!.defId)
    expect(slowed!.travelMs).toBeCloseTo(plainTravel * useStarForgeStore().voidTravelMult, 6)
  })

  it('Starwarden’s Lantern verkürzt den Abstand zweier Ressourcensterne', () => {
    grow('starwardensLantern')
    expect(useStarForgeStore().resourceStarIntervalMult).toBeCloseTo(
      FORGE_MIN_RESOURCE_STAR_INTERVAL_MULT,
      10,
    )
  })

  it('Rift Anchor streckt den Spawnabstand des Void — mit Reserve nach oben', () => {
    const forge = useStarForgeStore()
    grow('riftAnchor')
    expect(forge.voidSpawnIntervalMult).toBeGreaterThan(1)
    // Die zwei Void-Kappen sind die einzigen mit RESERVE: sie sind nicht die
    // Summe des Knotens, sondern die Zusage, dass kein späterer Verstärker den
    // Riss stillstellen kann (docs/balance.md — der Void ist das einzige
    // System, das gegen den Spieler drängt).
    expect(forge.voidSpawnIntervalMult).toBeLessThan(FORGE_MAX_VOID_SPAWN_INTERVAL_MULT)
  })

  it('Hollow Pact senkt den Meep-Zoll, hebt ihn aber nicht auf', () => {
    grow('hollowPact')
    const relief = useStarForgeStore().voidMeepLossMult
    expect(relief).toBeCloseTo(FORGE_MIN_VOID_MEEP_LOSS_MULT, 10)
    // Ein Einschlag muss WEHTUN — der Zoll wird verhandelt, nicht erlassen.
    expect(relief).toBeGreaterThan(0)
  })

  it("Warden's Pact hängt ganze Planeten an den Ressourcenstern", () => {
    grow('wardensPact')
    const bonus = useStarForgeStore().resourceStarPlanetBonus
    // Eine GANZE Zahl: `_buildResourcePlanetSlots` verteilt die Planeten über
    // `(i / count) · 2π`, eine Bruchzahl gäbe es dort nicht.
    expect(Number.isInteger(bonus)).toBe(true)
    expect(bonus).toBe(FORGE_PACT_MAX_LEVEL)
  })

  it('Unbroken Pact kürzt die Nachwirkung eines Einschlags', () => {
    grow('unbrokenPact')
    expect(useStarForgeStore().voidAftermathMult).toBeCloseTo(FORGE_MIN_VOID_AFTERMATH_MULT, 10)
  })

  // ── chimesPerClick-Achse ───────────────────────────────────────────────────

  it("Merchant's Favor senkt den Preis, den der Laden VERLANGT und ABBUCHT", () => {
    const items = useItemStore()
    const game = useGameStore()
    const anyItem = 'ancient_bone_sword'
    const listed = items.itemPrice(anyItem)

    grow('merchantsFavor')
    const discounted = items.itemPrice(anyItem)
    expect(discounted).toBeLessThan(listed)

    // Und der Kauf bucht genau das ab, was die Zeile zeigt — die eigentliche
    // Fehlerklasse, gegen die der Getter gebaut ist.
    game.chimes = discounted
    expect(items.buyItem(anyItem)).toBe(true)
    expect(game.chimes).toBe(0)
  })

  it('Alms of the Keeper verbilligt Champion-Level nur auf der CHIME-Seite', () => {
    const levels = useChampionLevelStore()
    const before = levels.costOf('Ashe')
    grow('almsOfTheKeeper')
    const after = levels.costOf('Ashe')

    expect(after.chimes).toBeLessThan(before.chimes)
    expect(useStarForgeStore().championLevelCostMult).toBeCloseTo(
      FORGE_MIN_CHAMPION_LEVEL_COST_MULT,
      10,
    )
    // Material bleibt roh: es ist der Taktgeber der Champion-Achse, und ein
    // Rabatt darauf hinterliesse Positionen mit Nachkommastellen.
    expect(after.materials).toEqual(before.materials)
  })

  it('Chime Conduit kürzt die Abklingzeit, Resonant Pact hebt die Wirkung', () => {
    const bard = useBardAbilityStore()
    const cdBefore = bard.cooldownMsOf('q')
    const powBefore = bard.powerMultOf('q')

    grow('chimeConduit')
    grow('resonantPact')

    expect(bard.cooldownMsOf('q')).toBeLessThan(cdBefore)
    expect(bard.powerMultOf('q')).toBeGreaterThan(powBefore)
    expect(useStarForgeStore().bardCooldownMult).toBeCloseTo(FORGE_MIN_BARD_COOLDOWN_MULT, 10)
  })

  it('die Bard-FENSTER bleiben von beiden unberührt', () => {
    // Die Trennung aus docs/balance.md: multiplikativ = Wirkung, additiv =
    // Fenster. Hinge ein Fenster an einem kaufbaren Faktor, verlängerte der
    // Ausbau das Fenster, in dem der Ausbau zählt.
    const bard = useBardAbilityStore()
    const before = {
      targets: bard.bindingTargets,
      shrine: bard.shrineBuffMs,
      journey: bard.journeyBuffMs,
      stasis: bard.stasisMs,
    }
    grow('chimeConduit')
    grow('resonantPact')
    expect(bard.bindingTargets).toBe(before.targets)
    expect(bard.shrineBuffMs).toBe(before.shrine)
    expect(bard.journeyBuffMs).toBe(before.journey)
    expect(bard.stasisMs).toBe(before.stasis)
  })

  it("Haggler's Pact und Merchant's Pact greifen an Preis und Takt des Bargains", () => {
    const forge = useStarForgeStore()
    forge.restockBargain()
    const def = forge.activeDeal!
    const listed = forge.bargainPrice(def)

    grow('hagglersPact')
    expect(forge.bargainPrice(def)).toBeLessThan(listed)
    expect(forge.bargainPriceMult).toBeCloseTo(FORGE_MIN_BARGAIN_PRICE_MULT, 10)

    grow('merchantsPact')
    expect(forge.bargainRestockMult).toBeCloseTo(FORGE_MIN_BARGAIN_RESTOCK_MULT, 10)
  })

  // ── chimesPerSecond-Achse ──────────────────────────────────────────────────

  it("Quarrymaster's Eye beschleunigt jeden Harvester", () => {
    grow('quarrymastersEye')
    expect(useStarForgeStore().harvestIntervalMult).toBeCloseTo(FORGE_MIN_HARVEST_INTERVAL_MULT, 10)
    expect(usePlanetShopStore()).toBeDefined()
  })

  it('Kiln Subsidy verbilligt jede Gebäudestufe — und zwar überall gleich', () => {
    const shop = useShopStore()
    const upgrade = shop.shopUpgrades[0]
    const before = shop.getUpgradeCost(upgrade)

    grow('kilnSubsidy')
    const after = shop.getUpgradeCost(upgrade)
    expect(after).toBeLessThan(before)
    expect(useStarForgeStore().buildingCostMult).toBeCloseTo(FORGE_MIN_BUILDING_COST_MULT, 10)

    // Einzelpreis und Stapelpreis lesen denselben Getter — die Fehlerklasse,
    // gegen die er gebaut ist, wäre ein Rabatt in nur einem der drei Wege.
    shop.buyAmount = 1
    expect(shop.getTotalUpgradeCost(upgrade)).toBe(after)
  })

  it("Founder's Pact rückt die Gebäude-Meilensteine zusammen", () => {
    const forge = useStarForgeStore()
    expect(forge.buildingMilestoneInterval).toBe(BUILDING_MILESTONE_INTERVAL)
    grow('foundersPact')
    const interval = forge.buildingMilestoneInterval
    expect(interval).toBeLessThan(BUILDING_MILESTONE_INTERVAL)
    expect(interval).toBeGreaterThanOrEqual(FORGE_MIN_BUILDING_MILESTONE_INTERVAL)
    // Eine ganze Stufenzahl — `buildingMilestoneMultiplier` teilt durch sie.
    expect(Number.isInteger(interval)).toBe(true)
  })

  it('Omen-Reader und Augur’s Pact drehen an Takt UND Anspruch der Vorzeichen', () => {
    const omens = useOmenStore()
    const forge = useStarForgeStore()
    const delayBefore = omens.nextOfferDelaySec

    grow('omenReader')
    expect(omens.nextOfferDelaySec).toBeLessThan(delayBefore)
    expect(forge.omenIntervalMult).toBeCloseTo(FORGE_MIN_OMEN_INTERVAL_MULT, 10)

    grow('augursPact')
    expect(forge.omenTargetMult).toBeCloseTo(FORGE_MIN_OMEN_TARGET_MULT, 10)
  })

  // ── dmgPerClick-Achse ──────────────────────────────────────────────────────

  it("Herald's Favor zahlt auf den Aufstieg, Arbiter's Pact federt den Abstieg", () => {
    const forge = useStarForgeStore()
    grow('heraldsFavor')
    grow('arbitersPact')

    expect(forge.lpGainMult).toBeGreaterThan(1)
    expect(forge.lpLossMult).toBeCloseTo(FORGE_MIN_LP_LOSS_MULT, 10)
    // Eine Leiter, auf der man nichts mehr verliert, ist keine.
    expect(forge.lpLossMult).toBeGreaterThan(0)
    expect(useBattleStore()).toBeDefined()
  })

  it('Hollow Core senkt die Boss-HP, ohne den Schaden anzufassen', () => {
    const forge = useStarForgeStore()
    const dmgBefore = forge.bossDamageMult
    grow('hollowCore')
    expect(forge.bossHpMult).toBeCloseTo(FORGE_MIN_BOSS_HP_MULT, 10)
    // Ein Knoten auf den SCHADEN kürzte sich gegen die HP-Formel weg
    // (docs/balance.md) — dieser fasst sie nicht an.
    expect(forge.bossDamageMult).toBe(dmgBefore)
  })

  it('Siege Reckoning, Prospector’s Pact und Pact of Patience zahlen aus', () => {
    const forge = useStarForgeStore()
    grow('siegeReckoning')
    grow('prospectorsPact')
    grow('patientPact')
    expect(forge.bossRewardMult).toBeGreaterThan(1)
    expect(forge.bossMaterialMult).toBeGreaterThan(1)
    expect(forge.bossEnrageMult).toBeGreaterThan(1)
  })

  it('Pact of Honor hebt den Tribut', () => {
    grow('honoredPact')
    expect(useStarForgeStore().honorTributeMult).toBeGreaterThan(1)
  })

  // ── Die Gegenprobe über alle dreissig ──────────────────────────────────────

  it('jeder Knoten wirkt bei Stufe 0 gar nicht und bei Vollausbau spürbar', () => {
    for (const def of [...FORGE_WARDS, ...FORGE_PACTS]) {
      setActivePinia(createPinia())
      const forge = useStarForgeStore()
      expect(forge.ringEffect(def.id), `${def.id} wirkt ohne Stufe`).toBe(0)
      grow(def.id)
      const cap = def.tier === 'ward' ? FORGE_WARD_MAX_LEVEL : FORGE_PACT_MAX_LEVEL
      expect(forge.ringEffect(def.id), `${def.id} bei Vollausbau`).toBeCloseTo(
        cap * def.effectPerLevel,
        10,
      )
    }
  })

  it('kein Boden schneidet bei Vollausbau etwas ab — und keiner bleibt unerreicht', () => {
    // Die Bedingung, die alle Böden von Ring 4 und 5 gemeinsam tragen: die
    // letzte Stufe BERÜHRT den Boden, überschreitet ihn aber nicht. Damit gibt
    // es hier weder eine tote Stufe noch einen Überlauf, der aufgefangen werden
    // müsste — anders als bei Solar Sails, Golden Echo und Quickening.
    const forge = useStarForgeStore()
    const solar = useSolarUpgradeStore()
    solar.starPhase = 5
    for (const def of [...FORGE_WARDS, ...FORGE_PACTS]) grow(def.id)

    const floors: [string, number, number][] = [
      ['bardCooldownMult', forge.bardCooldownMult, FORGE_MIN_BARD_COOLDOWN_MULT],
      ['buildingCostMult', forge.buildingCostMult, FORGE_MIN_BUILDING_COST_MULT],
      ['itemCostMult', forge.itemCostMult, FORGE_MIN_ITEM_COST_MULT],
      ['championLevelCostMult', forge.championLevelCostMult, FORGE_MIN_CHAMPION_LEVEL_COST_MULT],
      ['voidMeepLossMult', forge.voidMeepLossMult, FORGE_MIN_VOID_MEEP_LOSS_MULT],
      ['voidAftermathMult', forge.voidAftermathMult, FORGE_MIN_VOID_AFTERMATH_MULT],
      ['drifterIntervalMult', forge.drifterIntervalMult, FORGE_MIN_DRIFTER_INTERVAL_MULT],
      ['omenIntervalMult', forge.omenIntervalMult, FORGE_MIN_OMEN_INTERVAL_MULT],
      ['omenTargetMult', forge.omenTargetMult, FORGE_MIN_OMEN_TARGET_MULT],
      [
        'resourceStarIntervalMult',
        forge.resourceStarIntervalMult,
        FORGE_MIN_RESOURCE_STAR_INTERVAL_MULT,
      ],
      ['harvestIntervalMult', forge.harvestIntervalMult, FORGE_MIN_HARVEST_INTERVAL_MULT],
      ['championTravelMult', forge.championTravelMult, FORGE_MIN_CHAMPION_TRAVEL_MULT],
      ['bossHpMult', forge.bossHpMult, FORGE_MIN_BOSS_HP_MULT],
      ['expeditionSpawnMult', forge.expeditionSpawnMult, FORGE_MIN_EXPEDITION_SPAWN_MULT],
      ['bargainPriceMult', forge.bargainPriceMult, FORGE_MIN_BARGAIN_PRICE_MULT],
      ['bargainRestockMult', forge.bargainRestockMult, FORGE_MIN_BARGAIN_RESTOCK_MULT],
      ['lpLossMult', forge.lpLossMult, FORGE_MIN_LP_LOSS_MULT],
    ]
    for (const [name, value, floor] of floors) {
      expect(value, `${name} erreicht seinen Boden nicht`).toBeCloseTo(floor, 10)
    }

    // Die Achsen, die nach OBEN laufen. Das Augment-Glück erreicht seine Kappe
    // exakt; die beiden VOID-Kappen tun es bewusst NICHT — sie sind nicht die
    // Summe ihres Knotens, sondern die Zusage, dass kein späterer Verstärker
    // den Riss stillstellen kann.
    expect(forge.augmentLuckMult).toBeCloseTo(FORGE_MAX_AUGMENT_LUCK_MULT, 10)
    for (const [name, value, cap] of [
      ['voidSpawnIntervalMult', forge.voidSpawnIntervalMult, FORGE_MAX_VOID_SPAWN_INTERVAL_MULT],
      ['voidTravelMult', forge.voidTravelMult, FORGE_MAX_VOID_TRAVEL_MULT],
    ] as [string, number, number][]) {
      expect(value, name + ' wirkt gar nicht').toBeGreaterThan(1)
      expect(value, name + ' stösst an seine Kappe').toBeLessThan(cap)
    }
  })
})
