import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useShopStore, buildingMilestoneMultiplier } from '@/stores/economy/shopStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { FORGE_YIELD_SOURCES } from '@/config/constants'
import { CHRONICLE_TRACKS } from '@/config/progression/achievements'
import { AUGMENTS } from '@/config/economy/augments'

/**
 * Die Spec, die den Herkunftskatalog an die Wirtschaft bindet.
 *
 * `shopStore.cpsFactorBreakdown` ist eine zweite Lesart von
 * `calculateTotalCPS()`: dieselben Faktoren, nur nach Herkunft sortiert. Laufen
 * die beiden auseinander, zeigt die Sonne im Shop einen Ertrag, den es im Spiel
 * nicht gibt — und zwar lautlos, weil beide Zahlen fuer sich plausibel
 * aussehen.
 *
 * **Was diese Spec faengt und was nicht.** Sie prueft die Identitaet in
 * Zustaenden, in denen mehrere Faktoren von 1 verschieden sind. Ein NEUER
 * Faktor, den jemand der Kette hinzufuegt, ohne ihn im Getter einzuordnen,
 * faellt hier auf, sobald er im Test von 1 verschieden ist — deshalb steht
 * ueber `calculateTotalCPS()` zusaetzlich ein ⚠-Kommentar, der auf den Getter
 * verweist. Die Strukturpruefung unten faengt den haeufigeren Fall: eine ID,
 * die es in der einen Tabelle gibt und in der anderen nicht.
 */
describe('cpsFactorBreakdown', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Der Multiplikator-Anteil der Kette, aus dem Band gerechnet. */
  const bandProduct = () =>
    useShopStore().cpsFactorBreakdown.reduce((product, entry) => product * entry.factor, 1)

  /**
   * Die Kette ohne ihre Multiplikatoren: die Summe der Gebaeude plus den
   * Solar-Sockel. Genau das, was `calculateTotalCPS()` vor der Multiplikation
   * stehen hat — der Meilenstein-Faktor gehoert dazu, er wirkt JE GEBAEUDE und
   * ist kein Glied der globalen Kette (und damit auch kein Bandsegment).
   */
  const baseSum = () => {
    const shop = useShopStore()
    const solar = useSolarUpgradeStore()
    const base = shop.shopUpgrades.reduce(
      (total, upgrade) =>
        total + (upgrade.baseCPS || 0) * upgrade.level * buildingMilestoneMultiplier(upgrade.level),
      0,
    )
    return base + solar.cpsBonus
  }

  // ─── Struktur ───────────────────────────────────────────────────────────────

  it('nennt jede Herkunft aus FORGE_YIELD_SOURCES genau einmal', () => {
    const ids = useShopStore().cpsFactorBreakdown.map((entry) => entry.id)
    expect(ids.sort()).toEqual(FORGE_YIELD_SOURCES.map((s) => s.id).sort())
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('liefert im frischen Spielstand lauter neutrale Faktoren', () => {
    for (const entry of useShopStore().cpsFactorBreakdown) {
      expect(entry.factor, `${entry.id} ist nicht neutral`).toBe(1)
    }
  })

  it('gibt nur endliche, positive Faktoren zurueck', () => {
    for (const entry of useShopStore().cpsFactorBreakdown) {
      expect(Number.isFinite(entry.factor), `${entry.id} ist nicht endlich`).toBe(true)
      expect(entry.factor).toBeGreaterThan(0)
    }
  })

  // ─── Identitaet mit der Kette ───────────────────────────────────────────────

  it('stimmt mit calculateTotalCPS ueberein, solange nichts wirkt', () => {
    const shop = useShopStore()
    shop.shopUpgrades[0].level = 10
    expect(shop.calculateTotalCPS()).toBe(Math.floor(baseSum() * bandProduct()))
  })

  /**
   * Der eigentliche Test: mehrere Faktoren gleichzeitig von 1 verschieden, aus
   * drei verschiedenen Ecken der Kette — ein dauerhaft gekaufter (Solar), ein
   * ueber die Codex-Bahnen erworbener, und zwei befristete, die im Band
   * zusammen unter `boons` stehen.
   */
  it('stimmt mit calculateTotalCPS ueberein, wenn mehrere Faktoren wirken', () => {
    const shop = useShopStore()
    const solar = useSolarUpgradeStore()
    const augments = useAugmentStore()
    const drifters = useDrifterStore()
    const chronicle = useAchievementStore()

    shop.shopUpgrades.forEach((upgrade, index) => {
      upgrade.level = index + 1
    })

    // Dauerhaft: der Flugtempo-Strahl multipliziert die CpS.
    solar.flightSpeedLevel = 4
    solar.chimesPerSecondLevel = 3

    // Codex: die Bahn, die auf `cpsMult` zahlt, auf ihre erste Stufe.
    const cpsTrack = CHRONICLE_TRACKS.find((track) => track.bonus === 'cpsMult')
    expect(cpsTrack, 'keine Codex-Bahn zahlt auf cpsMult').toBeDefined()
    chronicle.stages[cpsTrack!.id] = 1

    // Befristet: ein Zeit-Augment und ein eingesammelter Drifter. Beide landen
    // im Band unter `boons` — die Spec prueft damit auch, dass das Produkt der
    // gebuendelten Quellen stimmt und nicht nur eine davon durchkommt.
    const soon = drifters.drifterNow + 1_000_000
    augments.activeTimedBuffs.push({
      effectKey: 'cpsMultiplier',
      multiplier: 3,
      expiresAt: soon,
    } as (typeof augments.activeTimedBuffs)[number])
    drifters.buffs.push({
      expiresAt: soon,
      effects: { cpsMult: 1.5 },
    } as (typeof drifters.buffs)[number])

    // Vorbedingung: Der Test ist nur etwas wert, wenn wirklich mehrere Faktoren
    // von 1 abweichen — sonst prueft er eine Identitaet aus lauter Einsen.
    const active = shop.cpsFactorBreakdown.filter((entry) => entry.factor !== 1)
    expect(active.length).toBeGreaterThanOrEqual(3)
    expect(bandProduct()).toBeGreaterThan(1)

    expect(shop.calculateTotalCPS()).toBe(Math.floor(baseSum() * bandProduct()))
  })

  it('faengt einen ABZUG genauso ein wie einen Beitrag', () => {
    const shop = useShopStore()
    const drifters = useDrifterStore()
    shop.shopUpgrades[0].level = 50

    drifters.buffs.push({
      expiresAt: drifters.drifterNow + 1_000_000,
      effects: { cpsMult: 0.5 },
    } as (typeof drifters.buffs)[number])

    expect(bandProduct()).toBeLessThan(1)
    expect(shop.calculateTotalCPS()).toBe(Math.floor(baseSum() * bandProduct()))
  })

  // ─── Einordnung ─────────────────────────────────────────────────────────────

  it('ordnet einen befristeten Buff unter boons ein, nicht unter ein Kaufsystem', () => {
    const shop = useShopStore()
    const drifters = useDrifterStore()
    drifters.buffs.push({
      expiresAt: drifters.drifterNow + 1_000_000,
      effects: { cpsMult: 2 },
    } as (typeof drifters.buffs)[number])

    const active = shop.cpsFactorBreakdown.filter((entry) => entry.factor !== 1)
    expect(active.map((entry) => entry.id)).toEqual(['boons'])
    expect(active[0].factor).toBeCloseTo(2, 6)
  })

  /**
   * `universe` und `augments` sind die zwei Haelften von
   * `gameStore.activeModifier.cpsMultiplier`. Sie standen einmal zusammen in
   * EINER Zeile, und im Endzustand kamen daraus rund ×50 unter der Ueberschrift
   * „Universe and providences" — obwohl gar kein Aufbruch stattgefunden hatte.
   *
   * Diese Spec haelt beides fest: dass ein dauerhaftes Augment unter `augments`
   * landet UND dass das Produkt der beiden weiterhin exakt der Kettenfaktor ist.
   */
  it('ordnet einen dauerhaften Augment-Effekt unter augments ein, nicht unter universe', () => {
    const shop = useShopStore()
    const game = useGameStore()

    const cpsAugment = AUGMENTS.find((a) => (a.effects.cpsMultiplier ?? 1) !== 1)
    expect(cpsAugment, 'kein Augment traegt cpsMultiplier').toBeDefined()
    game.activeAugments = [cpsAugment!.id]

    const byId = Object.fromEntries(shop.cpsFactorBreakdown.map((e) => [e.id, e.factor]))
    expect(byId.augments).toBeCloseTo(cpsAugment!.effects.cpsMultiplier!, 10)
    expect(byId.universe).toBe(1)
    // Die Identitaet mit dem Getter, den `calculateTotalCPS()` liest.
    expect(byId.universe * byId.augments).toBeCloseTo(game.activeModifier.cpsMultiplier ?? 1, 10)
    expect(shop.calculateTotalCPS()).toBe(Math.floor(baseSum() * bandProduct()))
  })

  it('ordnet den Flugtempo-Strahl unter solar ein', () => {
    const shop = useShopStore()
    const solar = useSolarUpgradeStore()
    solar.flightSpeedLevel = 4

    const entry = shop.cpsFactorBreakdown.find((e) => e.id === 'solar')!
    expect(entry.factor).toBeCloseTo(solar.flightSpeedMultiplier, 10)
    expect(entry.factor).toBeGreaterThan(1)
  })

  /**
   * `mvpBuffMultiplier` steht NICHT in der Kette — er wird erst bei der Anzeige
   * daraufmultipliziert. Im Band aufgenommen wiche das Produkt von der echten
   * CpS ab, und genau das prueft dieser Test.
   */
  it('nimmt den MVP-Buff nicht ins Band auf', () => {
    const shop = useShopStore()
    const game = useGameStore()
    shop.shopUpgrades[0].level = 20

    const before = bandProduct()
    // `mvpBuffMultiplier` ist ein Getter — gesetzt wird die Restlaufzeit.
    game.mvpBuffSecondsLeft = 30
    expect(game.mvpBuffMultiplier).toBeGreaterThan(1)
    expect(bandProduct()).toBe(before)
    expect(shop.calculateTotalCPS()).toBe(Math.floor(baseSum() * bandProduct()))
  })
})
