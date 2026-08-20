import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useCpsStore } from '@/stores/core/cpsStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import type { ShopUpgrade, BuildingStat, CpsFactor } from '@/types'
import { logger } from '@/utils/logger'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import {
  SECONDS_PER_HOUR,
  EFFICIENCY_STARS_DIVISOR,
  EFFICIENCY_STARS_MAX,
  EFFICIENCY_STARS_MIN,
  SHOP_UPGRADE_CATALOG,
  BUILDING_MILESTONE_INTERVAL,
  BUILDING_MILESTONE_MULT,
} from '@/config/constants'

/**
 * Meilenstein-Faktor auf den Ertrag EINES Gebäudes.
 *
 * Der Ertrag war streng linear (`baseCPS × level`), die Kosten dagegen
 * geometrisch (×1,15…1,40 je Stufe). Daraus folgt eine CpS, die nur
 * LOGARITHMISCH mit den ausgegebenen Chimes wächst — gemessen lieferten alle
 * Gebäude zusammen rund 1000 CpS von 2,6e7, die übrigen 99,996 % kamen aus
 * Faktoren, die gar keine Chimes kosten (Augments, Forge, Meep-Baum, Codex).
 * Gebäude zu kaufen war deshalb im Spätspiel keine Entscheidung mehr, sondern
 * eine Formalie, und jede Chime-Kostenschraube lief ins Leere.
 *
 * Alle `BUILDING_MILESTONE_INTERVAL` Stufen verdoppelt sich der Ertrag. Das
 * explodiert nicht, weil die Kostenkurve schneller wächst als die Belohnung:
 * 25 Stufen kosten beim Time Echo das 4500-fache für den 2,7-fachen Ertrag,
 * die CpS wächst also weiterhin nur als schwache Potenz der Ausgaben. Was sich
 * ändert, ist nicht die Höhe — sondern dass es wieder ein Ziel gibt, auf das
 * man zusparen kann.
 */
export function buildingMilestoneMultiplier(
  level: number,
  interval: number = BUILDING_MILESTONE_INTERVAL,
): number {
  return Math.pow(BUILDING_MILESTONE_MULT, Math.floor(level / interval))
}

export const useShopStore = defineStore('shop', {
  state: () => ({
    buyAmount: 1 as number | 'max',

    // Katalog aus config/constants.ts, hier nur um den Laufzeitstand ergänzt.
    shopUpgrades: SHOP_UPGRADE_CATALOG.map((def) => ({ ...def, level: 0 }) as ShopUpgrade),
  }),

  getters: {
    /** Alle CPS-Gebäude — auch ungekaufte. Basis für Auswahllisten (z. B. das
     *  Resonanz-Ziel eines Planeten), die den vollen Katalog zeigen müssen. */
    cpsBuildings(): ShopUpgrade[] {
      return this.shopUpgrades.filter((upgrade) => !!upgrade.baseCPS)
    },

    cpsProducingUpgrades(): ShopUpgrade[] {
      return this.shopUpgrades.filter((upgrade) => upgrade.baseCPS && upgrade.level > 0)
    },

    buildingStats(): BuildingStat[] {
      const gameStore = useGameStore()

      const upgrades = this.cpsProducingUpgrades.map((upgrade) => {
        const currentCPS = (upgrade.baseCPS || 0) * upgrade.level
        const lifetimeProduction =
          gameStore.totalBuildingProduction[upgrade.id] || currentCPS * SECONDS_PER_HOUR

        return {
          id: upgrade.id,
          name: upgrade.name,
          icon: upgrade.icon,
          level: upgrade.level,
          currentCPS,
          lifetimeProduction,
        }
      })

      const totalLifetime = upgrades.reduce(
        (total, building) => total + building.lifetimeProduction,
        0,
      )

      return upgrades
        .map((building): BuildingStat => {
          const productionPercentage =
            totalLifetime > 0 ? (building.lifetimeProduction / totalLifetime) * 100 : 0

          const rawStars = productionPercentage / EFFICIENCY_STARS_DIVISOR
          const efficiencyStars = Math.min(
            EFFICIENCY_STARS_MAX,
            Math.max(EFFICIENCY_STARS_MIN, Math.round(rawStars * 2) / 2),
          )

          return {
            ...building,
            efficiency: Math.round(productionPercentage),
            efficiencyStars,
            productionPercentage,
          }
        })
        .sort((a, b) => b.lifetimeProduction - a.lifetimeProduction)
    },

    totalLifetimeProduction(): number {
      const gameStore = useGameStore()
      return this.cpsProducingUpgrades.reduce((total, upgrade) => {
        const lifetimeProduction =
          gameStore.totalBuildingProduction[upgrade.id] ||
          (upgrade.baseCPS || 0) * upgrade.level * SECONDS_PER_HOUR
        return total + lifetimeProduction
      }, 0)
    },

    topProducer() {
      const top = this.buildingStats[0]
      return top || { name: 'None', icon: '/img/BardAbilities/BardChime.png' }
    },

    /**
     * Faktor auf den Preis JEDER Gebäudestufe — Universum/Augment aus dem
     * `activeModifier` und Kiln Subsidy aus der Forge.
     *
     * Steht als EIN Getter, weil die Kurve an drei Stellen ausgewertet wird
     * (Einzelpreis, Stapelpreis, „wie viel kann ich mir leisten"). Als
     * ausgeschriebener Ausdruck an jeder von ihnen war schon der erste Faktor
     * dreifach da; ein zweiter hätte die Wahrscheinlichkeit verdreifacht, dass
     * angezeigter und abgebuchter Preis auseinanderlaufen.
     */
    buildingCostMultiplier(): number {
      const modMul = useGameStore().activeModifier.buildingCostMultiplier ?? 1
      return modMul * useStarForgeStore().buildingCostMult
    },

    /**
     * Die Multiplikatorkette aus `calculateTotalCPS()`, aufgeschlüsselt nach
     * Herkunft. Ihr PRODUKT ist die Zahl im Kern der Sonne
     * (`components/bardProfil/shop/SunChimeBoost.vue`); die Aufschlüsselung
     * selbst wird derzeit nirgends gezeigt, ist aber die Rechnung, an der die
     * Spec hängt.
     *
     * **Warum das hier steht und nicht in einem Composable.** Es ist keine
     * UI-Hilfe, sondern eine zweite Lesart derselben Rechnung: wer der Kette
     * unten einen Faktor hinzufügt, muss ihn hier einordnen, sonst zeigt die
     * Sonne eine Zahl, die es im Spiel nicht gibt. Im Nachbarordner liefe das
     * still auseinander. Gehalten wird es trotzdem nicht von der Nähe, sondern
     * von `__tests__/stores/cpsFactorBreakdown.spec.ts`: das Produkt dieser
     * Faktoren muss dem Multiplikator-Anteil von `calculateTotalCPS()` gleichen.
     *
     * Die Reihenfolge ist die von `FORGE_YIELD_SOURCES`, nicht die der Kette —
     * dort steht der Katalog der Herkünfte, und zwei Reihenfolgen für dieselbe
     * Liste wären eine zweite Quelle.
     *
     * **`mvpBuffMultiplier` fehlt mit Absicht.** Er steht nicht in der Kette,
     * sondern wird erst bei der ANZEIGE daraufmultipliziert. Hier aufgenommen
     * wiche das Produkt von der echten CpS ab.
     *
     * Roh, ungefiltert, ungewichtet: ein Faktor von exakt 1 steht mit drin und
     * ändert am Produkt nichts.
     */
    cpsFactorBreakdown(): CpsFactor[] {
      const gameStore = useGameStore()

      return [
        { id: 'solar', factor: useSolarUpgradeStore().flightSpeedMultiplier },
        { id: 'forge', factor: useStarForgeStore().cpsMult },
        { id: 'meeps', factor: useMeepTreeStore().fx.cpsMult },
        { id: 'codex', factor: useAchievementStore().cpsMult },
        { id: 'items', factor: useItemStore().totalCPSMultiplier },
        { id: 'traits', factor: useSynergyStore().cpsSynergyMultiplier },
        // ── `activeModifier.cpsMultiplier`, aufgetrennt in seine zwei Hälften ──
        // Der Getter ist wörtlich `(providence ?? 1) * (augment ?? 1)`; die
        // beiden Zeilen hier ergeben also weiterhin exakt denselben Wert wie
        // die eine Zeile davor — `cpsFactorBreakdown.spec.ts` hält das fest.
        //
        // Getrennt, weil sie ZUSAMMEN eine falsche Auskunft gaben: im
        // Endzustand gemessen kamen rund ×50 aus den Augments und liefen unter
        // „Universe and providences", obwohl gar kein Aufbruch stattgefunden
        // hatte. Wer daraufhin sein Universum wechselte, verlor genau den
        // Faktor, den das Band ihm dort zugeschrieben hatte.
        { id: 'universe', factor: useProvidenceStore().activeEffects.cpsMultiplier ?? 1 },
        { id: 'augments', factor: gameStore.combinedAugmentEffects.cpsMultiplier ?? 1 },
        {
          // Alles, was von selbst wieder abläuft — Zeit-Augments, eingesammelte
          // Drifter, ein erfülltes Omen, Bards W und die Fähigkeits-Fenster.
          id: 'boons',
          factor:
            useAugmentStore().temporaryCPSMultiplier *
            useDrifterStore().cpsMult *
            useOmenStore().cpsMult *
            useBardAbilityStore().cpsMult *
            gameStore.abilityCPSMultiplier,
        },
        { id: 'void', factor: useVoidStore().cpsMult },
        { id: 'bosses', factor: usePlanetBossStore().cpsPenaltyMultiplier },
      ]
    },
  },

  actions: {
    setBuyAmount(amount: number | 'max') {
      this.buyAmount = amount
    },

    /**
     * CpS und CpC liegen gecacht im gameStore — nach jeder Änderung an einem
     * Faktor, der sie speist, neu rechnen.
     *
     * Steht hier, weil hier gerechnet wird: die Fassung lag wörtlich gleich im
     * drifterStore und im bardAbilityStore, und mit dem Chronicle wäre sie zum
     * dritten Mal abgeschrieben worden. Beide delegieren jetzt hierher und
     * behalten ihre eigene Action nur als Namen, den ihre Aufrufer schon kennen.
     */
    refreshRates() {
      const gameStore = useGameStore()
      const newCps = this.calculateTotalCPS()
      gameStore.chimesPerSecond = newCps
      gameStore.chimesPerClick = this.calculateTotalCPC()
      useCpsStore().updateCurrentCPS(newCps)
    },

    setBuildingLevel(index: number, value: number) {
      const upgrade = this.shopUpgrades[index]
      if (!upgrade) return
      upgrade.level = Math.max(0, value)
      const gameStore = useGameStore()
      gameStore.chimesPerSecond = this.calculateTotalCPS()
      gameStore.chimesPerClick = this.calculateTotalCPC()
    },

    getMaxAffordableAmount(upgrade: ShopUpgrade): number {
      const gameStore = useGameStore()
      const costMul = this.buildingCostMultiplier
      let maxAmount = 0
      let totalCost = 0
      let currentLevel = upgrade.level

      while (true) {
        const nextCost = Math.ceil(
          upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel) * costMul,
        )
        if (totalCost + nextCost > gameStore.chimes) break
        totalCost += nextCost
        maxAmount++
        currentLevel++
      }

      return maxAmount
    },

    getTotalUpgradeCost(upgrade: ShopUpgrade): number {
      let amount = this.buyAmount

      if (amount === 'max') {
        amount = this.getMaxAffordableAmount(upgrade)
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return this.getUpgradeCost(upgrade)
      }

      let totalCost = 0
      let currentLevel = upgrade.level

      const costMul = this.buildingCostMultiplier

      for (let i = 0; i < amount; i++) {
        const cost = Math.ceil(
          upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel) * costMul,
        )
        totalCost += cost
        currentLevel++
      }

      return totalCost
    },

    buyUpgrade(upgradeId: string): number {
      const gameStore = useGameStore()
      const upgrade = this.shopUpgrades.find((u) => u.id === upgradeId)
      if (!upgrade) return 0

      let amount = this.buyAmount

      if (amount === 'max') {
        amount = this.getMaxAffordableAmount(upgrade)
      }

      if (typeof amount !== 'number' || amount <= 0) {
        amount = 1
      }

      const totalCost = this.getTotalUpgradeCost(upgrade)

      if (gameStore.chimes >= totalCost && amount > 0) {
        gameStore.chimes -= totalCost
        upgrade.level += amount

        if (upgrade.baseCPC != null) {
          gameStore.chimesPerClick = this.calculateTotalCPC()
        }
        if (upgrade.baseCPS != null) {
          const newCPS = this.calculateTotalCPS()
          gameStore.chimesPerSecond = newCPS
          useCpsStore().updateCurrentCPS(newCPS)
        }
        logger.info('Shop', `Bought ${upgrade.name} x${amount}`, {
          cost: totalCost,
          newLevel: upgrade.level,
        })
        return amount
      }
      return 0
    },

    getUpgradeCost(upgrade: ShopUpgrade): number {
      const costMul = this.buildingCostMultiplier
      return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level) * costMul)
    },

    canAffordUpgrade(upgrade: ShopUpgrade): boolean {
      const gameStore = useGameStore()
      const totalCost = this.getTotalUpgradeCost(upgrade)
      return gameStore.chimes >= totalCost && this.getActualBuyAmount(upgrade) > 0
    },

    getActualBuyAmount(upgrade: ShopUpgrade): number {
      let amount = this.buyAmount
      if (amount === 'max') {
        amount = this.getMaxAffordableAmount(upgrade)
      }
      return typeof amount === 'number' ? Math.max(0, amount) : 0
    },

    /**
     * ⚠ Wer dieser Kette einen FAKTOR hinzufügt, ordnet ihn auch im Getter
     * `cpsFactorBreakdown` einer Herkunft zu — sonst zeigt die Sonne im Shop
     * einen Ertrag, den es nicht gibt. `cpsFactorBreakdown.spec.ts` bricht in
     * dem Fall, und das ist beabsichtigt. Für einen neuen Summanden (wie
     * `solarCPS`) gilt das nicht — zerlegt werden nur die Multiplikatoren.
     */
    calculateTotalCPS(): number {
      const gameStore = useGameStore()
      const augmentStore = useAugmentStore()
      const planetShopStore = usePlanetShopStore()
      const mod = gameStore.activeModifier
      const resonanceMuls = planetShopStore.resonanceTowerBuildingMultipliers
      // Founder's Pact rückt die Meilensteine näher zusammen. Er greift am
      // INTERVALL und nicht am Faktor: die Verdopplung ist die Belohnung, ihr
      // Abstand die Schraube — ein Faktor auf `BUILDING_MILESTONE_MULT` wäre
      // eine Potenz auf einer Potenz.
      const milestoneInterval = useStarForgeStore().buildingMilestoneInterval
      const baseCPS = this.shopUpgrades.reduce((total, upgrade) => {
        const universeMul = mod.buildingMultipliers?.[upgrade.id] ?? 1
        const resonanceMul = resonanceMuls[upgrade.id] ?? 1
        return (
          total +
          (upgrade.baseCPS || 0) *
            upgrade.level *
            buildingMilestoneMultiplier(upgrade.level, milestoneInterval) *
            universeMul *
            resonanceMul
        )
      }, 0)
      const itemStore = useItemStore()
      const bossStore = usePlanetBossStore()
      const synergyStore = useSynergyStore()
      const cpsMul =
        (mod.cpsMultiplier ?? 1) *
        augmentStore.temporaryCPSMultiplier *
        itemStore.totalCPSMultiplier *
        synergyStore.cpsSynergyMultiplier *
        bossStore.cpsPenaltyMultiplier
      const solar = useSolarUpgradeStore()
      const solarCPS = solar.cpsBonus
      const flightMul = solar.flightSpeedMultiplier
      const forgeMul = useStarForgeStore().cpsMult
      const treeMul = useMeepTreeStore().fx.cpsMult
      // Collected drifters (Errant Chime & co.) — timed, expires on its own
      const drifterMul = useDrifterStore().cpsMult
      // Fulfilled omen — timed, and earned in a different system than this one
      const omenMul = useOmenStore().cpsMult
      // Caretaker's Shrine (bard W) — the afterglow of a cast shrine
      const bardMul = useBardAbilityStore().cpsMult
      // Chime Keeper (chronicle) — permanent, earned by lifetime chimes
      const chronicleMul = useAchievementStore().cpsMult
      // Sunless Breach (void tide) — the only factor here that pulls DOWNWARD,
      // and it grows the longer the rift is left standing
      const voidMul = useVoidStore().cpsMult
      return Math.floor(
        (baseCPS + solarCPS) *
          gameStore.abilityCPSMultiplier *
          cpsMul *
          flightMul *
          forgeMul *
          treeMul *
          drifterMul *
          omenMul *
          bardMul *
          chronicleMul *
          voidMul,
      )
    },

    calculateTotalCPC(): number {
      const gameStore = useGameStore()
      const mod = gameStore.activeModifier

      const solar = useSolarUpgradeStore()
      const upgradeBonus =
        this.shopUpgrades.reduce((total, upgrade) => {
          return total + (upgrade.baseCPC || 0) * upgrade.level
        }, 0) + solar.cpcBonus

      const baseCPC = mod.baseChimesPerClick ?? gameStore.baseChimesPerClick
      const cpcMul = mod.cpcMultiplier ?? 1
      const forge = useStarForgeStore()
      const tree = useMeepTreeStore().fx
      // Resonance / Midas Bell (Star Forge) + Worldbell (Meep Tree): clicks gain a fraction of total CpS
      const fromCpsPct = forge.cpcFromCpsPct + tree.cpcFromCpsPct
      const cpsPortion = fromCpsPct > 0 ? this.calculateTotalCPS() * fromCpsPct : 0
      // Ember Shard (drifter): multiplies the click value, not the CpS portion —
      // that share already carries the drifter CpS multiplier of its own.
      const drifterMul = useDrifterStore().cpcMult
      // Fulfilled omen — same reasoning as the drifter multiplier above.
      const omenMul = useOmenStore().cpcMult
      // Magical Journey (bard E) — the travel window multiplies clicks only,
      // for the same reason the drifter multiplier does: the CpS portion above
      // already carries its own multipliers.
      const bardMul = useBardAbilityStore().cpcMult
      // Unmaking Scar (void tide): drosselt den Klickwert selbst. Der
      // CpS-Anteil darunter trägt seine eigene Void-Drossel bereits, genau wie
      // bei den beiden Faktoren darüber.
      const voidMul = useVoidStore().cpcMult
      return Math.floor(
        (baseCPC + upgradeBonus) *
          gameStore.abilityCPCMultiplier *
          cpcMul *
          forge.cpcMult *
          tree.cpcMult *
          drifterMul *
          omenMul *
          bardMul *
          voidMul +
          cpsPortion,
      )
    },
  },
})
