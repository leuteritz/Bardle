import { useGameStore } from '@/stores/core/gameStore'
import {
  useSolarUpgradeStore,
  type SolarBranchId,
} from '@/stores/progression/solarUpgradeStore'
import { SOLAR_BRANCHES } from '@/config/constants'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import type { ProgressMetricId } from '@/types'

// ═════════════════════════════════════════════════════════════════════════════
// PROGRESS METRICS — die eine Auflösung für alle Fortschrittssysteme
//
// Chronicle, Omens und Wayfinder messen an denselben Zahlen. Vor dieser Datei
// tat das jeder für sich, und über die Hälfte der Schlüssel stand doppelt —
// derselbe Fehler, gegen den beide Stores im Kopf argumentieren, nur eine Ebene
// höher: zwei Stellen, die dieselbe Zahl auflösen, laufen auseinander, sobald
// jemand eine davon anfasst.
//
// Die Richtung bleibt: `config/` nennt nur den Schlüssel, aufgelöst wird hier.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Der aktuelle Wert einer Metrik.
 *
 * Bewusst eine freie Funktion und kein Getter: als Getter hinge dieser eine
 * Wert an Feldern aus sechzehn Stores und würde bei jeder ihrer Änderungen neu
 * rechnen — auch wenn niemand hinsieht. Jeder Aufruf berührt genau EIN Feld.
 */
export function progressMetricValue(metric: ProgressMetricId): number {
  switch (metric) {
    // ── Wirtschaft ──
    case 'chimesEarned':
      return useGameStore().totalChimesEarned
    case 'clicks':
      return useGameStore().totalClicks
    case 'meepsEarned':
      return useGameStore().totalMeepsEarned
    case 'materialsCollected':
      return useInventoryStore().totalMaterialsCollected
    case 'solarRayLevels':
      // Summe statt eines Kaufzählers: der stünde in jedem bestehenden
      // Spielstand auf 0 und fragte einen Spieler mit 30 Strahlenstufen, ob er
      // seine erste kaufen will. Vorgänger war `shopBuildingLevels` — die
      // Gebäude hatten seit dem Forge-Umbau keine Kaufgeste mehr, und die
      // Leiter stand deshalb bei jedem Spieler auf Mission 3 still.
      return SOLAR_BRANCHES.reduce(
        (sum, ray) => sum + useSolarUpgradeStore().branchLevel(ray.id as SolarBranchId),
        0,
      )

    // ── Bard ──
    case 'bardLevel':
      return useGameStore().level
    case 'abilityCasts':
      return useBardAbilityStore().totalCasts
    case 'prestiges':
      return useGameStore().totalPrestiges
    case 'meepNodesBought':
      return useMeepTreeStore().boughtCount

    // ── Kosmos ──
    case 'starsRescued':
      return useGalaxyStore().totalStarsRescued
    case 'galaxiesFreed':
      return useGalaxyStore().totalGalaxyBossesDefeated
    case 'planetsCleared':
      return useStarGroupStore().totalPlanetsCleared
    case 'driftersCollected':
      return useDrifterStore().totalDriftersCollected
    case 'landfallsCleared':
      return useGalaxyStore().totalLandfallsCleared

    case 'riftsSealed':
      return useVoidStore().totalRiftsSealed

    // ── Orbit ──
    case 'planetSlotsOwned':
      return usePlanetShopStore().purchasedSlots.length
    case 'planetLevels':
      return usePlanetShopStore().purchasedSlots.reduce((sum, slot) => sum + slot.level, 0)
    case 'bossesDefeated':
      return usePlanetBossStore().totalBossesDefeated
    case 'starPhase':
      return useSolarUpgradeStore().starPhase
    case 'forgeLevels': {
      // Gezählt werden die GEDECKELTEN Ringe plus die Relikte.
      //
      // `boughLevels` fehlt ABSICHTLICH: Ring 7 kennt keine Obergrenze, und
      // eine unbegrenzte Zahl in dieser Summe machte jede Schwelle darauf
      // trivial. `crownLevels` fehlt aus dem anderen Grund: fünf Einsen sind
      // keine geschmiedete Tiefe, sondern fünf Entscheidungen.
      const forge = useStarForgeStore()
      const sum = (levels: Record<string, number>) =>
        Object.values(levels).reduce((total, l) => total + l, 0)
      return (
        sum(forge.branchLevels) +
        sum(forge.leafLevels) +
        sum(forge.wardLevels) +
        sum(forge.pactLevels) +
        sum(forge.relicLevels)
      )
    }

    // ── Kader ──
    case 'championsRecruited':
      return useBattleStore().ownedChampions.length
    case 'championLevelsGained':
      return useChampionLevelStore().totalLevelsBought
    case 'teamSlotsFilled':
      return useBattleStore().headerSlots.filter(Boolean).length
    case 'battleWins':
      return useBattleStore().totalWins
    case 'championKills':
      return useBattleStore().totalKills
    case 'expeditionsCompleted':
      return useExpeditionStore().totalExpeditionsSucceeded
  }
}
