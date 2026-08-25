import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useCpsStore } from '@/stores/core/cpsStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import type { CpsFactor } from '@/types'
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

export const useShopStore = defineStore('shop', {
  state: () => ({}),

  getters: {
    /**
     * Die Multiplikatorkette aus `calculateTotalCPS()`, aufgeschlüsselt nach
     * Herkunft. Ihr PRODUKT ist die Zahl im Kern der Sonne
     * (`components/bardProfil/skillTree/SunChimeBoost.vue`); die Aufschlüsselung
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
      const mod = gameStore.activeModifier
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
        solarCPS *
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
        (baseCPC + solar.cpcBonus) *
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
