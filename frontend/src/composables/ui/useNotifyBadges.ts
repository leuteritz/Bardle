import { computed, type ComputedRef } from 'vue'
import { NOTIFY_BADGES, NOTIFY_BADGE_BY_KIND } from '@/config/ui/notifyBadges'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import type { NotifyBadgeDef, NotifyBadgeKind } from '@/types'

/**
 * Die eine Stelle, die weiss, WIE HOCH eine Notify-Marke steht.
 *
 * Vorher rechnete jede Komponente ihre Zahl selbst — sechs Kopien derselben
 * Expeditions-Zeile, und der Meep-Tooltip zählte etwas anderes als die Marke,
 * an der er hing. Was hier steht, steht überall.
 */
export function notifyBadgeCounters(): Record<NotifyBadgeKind, () => number> {
  const forgeStore = useStarForgeStore()
  const solarStore = useSolarUpgradeStore()
  const meepTreeStore = useMeepTreeStore()
  const planetShopStore = usePlanetShopStore()
  const expeditionStore = useExpeditionStore()
  const battleStore = useBattleStore()
  const achievementStore = useAchievementStore()

  return {
    // `shopFreshTotal`, nicht `shopReadyTotal`: kaufbar ist ab dem mittleren
    // Spiel dauernd etwas, und eine Marke, die nie ausgeht, meldet nichts mehr.
    shop: () => forgeStore.shopFreshTotal,
    // Ja/Nein, kein Zähler — 1 oder 0 genügt der Kante des Herolds.
    forge: () => (solarStore.canUpgradeStar ? 1 : 0),
    skill: () => meepTreeStore.unseenBuyableCount,
    planet: () => planetShopStore.affordableLevelCount,
    expedition: () => expeditionStore.readyExpeditionCount,
    champions: () => battleStore.newlyUnlockedChampions.length,
    chronicle: () => achievementStore.unseen.length,
    // Dauer-Anzeige des Bard-Levels, keine Marke.
    level: () => 0,
  }
}

/**
 * EIN computed je Marke, nie eines auf einem Record.
 *
 * Dieselbe Begründung wie an `starForgeStore.shopFreshTotal`: ein Objekt-Getter
 * gibt jede Sekunde ein neues Objekt zurück und stösst alle Leser bei jedem
 * Chime-Tick an, auch wenn keine Zahl sich geändert hat. Header-Bogen und
 * Reiterleiste stehen ab Programmstart — das wäre ein Rerender pro Sekunde,
 * dauerhaft.
 */
export function useNotifyBadgeCount(kind: NotifyBadgeKind): ComputedRef<number> {
  const counters = notifyBadgeCounters()
  return computed(() => counters[kind]())
}

export function notifyBadgeDef(kind: NotifyBadgeKind): NotifyBadgeDef {
  return NOTIFY_BADGE_BY_KIND[kind]
}

export interface NotifyBadgeRow {
  def: NotifyBadgeDef
  count: number
}

/**
 * Beschreibung plus Live-Zahl je Marke — für das Badge Lab im Admin-Tab.
 *
 * Hier ist das Objekt-computed richtig, das oben verboten ist: die Zeilen
 * gehören zusammen, und sie werden nur gerechnet, solange das Panel offen vor
 * dem angehaltenen Idle-Layer steht.
 */
export function useNotifyBadgeRows(): ComputedRef<NotifyBadgeRow[]> {
  const counters = notifyBadgeCounters()
  return computed(() => NOTIFY_BADGES.map((def) => ({ def, count: counters[def.id]() })))
}
