import { useHerald } from '@/composables/ui/useHerald'
import { usePlanetShopStore, PLANET_ROLES } from '@/stores/world/planetShopStore'
import {
  PLANET_BUY_ALL_HERALD,
  PLANET_BUY_ALL_UNIT,
  PLANET_BUY_ALL_UNIT_ONE,
} from '@/config/constants'

/**
 * Ein Orbit-Slot wird an DREI Knöpfen gekauft — in der Planetenleiste des
 * Profils, im Planeten-Dock des Command Panels und im Batterie-HUD über einem
 * Sternenkampf. Bis hierhin quittierte nur der erste, und zwar auch dann, wenn
 * der Kauf am Preis scheiterte: `buySlot()` gibt ein `boolean` zurück, das die
 * Aufrufstelle verwarf.
 *
 * Beides ist derselbe Fehler — die Handlung stand dreimal im Code. Sie steht
 * jetzt hier, nach dem Vorbild von `useForgeHerald`: EIN Wortlaut, EIN
 * Erfolgstest, und der Preis wird VOR dem Kauf gelesen, weil er danach null ist.
 */
export function useOrbitSlotHerald() {
  const { announceReceipt } = useHerald()
  const planetShopStore = usePlanetShopStore()

  /** Kauft den Slot und quittiert NUR, wenn er tatsächlich gekauft wurde. */
  function buyOrbitSlot(slotId: string): boolean {
    const cost = planetShopStore.getSlotCost(slotId)
    if (!planetShopStore.buySlot(slotId)) return false
    announceReceipt({
      kind: 'unlock',
      eyebrow: 'ORBIT',
      headline: 'Orbit slot',
      subline: 'A new planet can be settled',
      delta: { value: -cost, unit: 'chimes' },
    })
    return true
  }

  /** Sammelkauf aus Planetenleiste und Header-Tooltip — EIN Wortlaut für beide. */
  function buyAllPlanetLevels(): number {
    const { gained, levels } = planetShopStore.buyAllPlanetLevels()
    if (gained === 0) return 0
    const ids = Object.keys(levels)
    const top = ids.reduce((a, b) => (levels[b] > levels[a] ? b : a))
    const role = planetShopStore.getSlot(top)?.role
    announceReceipt({
      kind: 'levelup',
      eyebrow: 'ORBIT',
      headline: PLANET_BUY_ALL_HERALD,
      subline: ids.length === 1 ? 'Across 1 planet' : `Across ${ids.length} planets`,
      portraitSrc: role ? PLANET_ROLES[role].image : undefined,
      delta: { value: gained, unit: PLANET_BUY_ALL_UNIT, unitOne: PLANET_BUY_ALL_UNIT_ONE },
      mergeKey: 'levelup/planet/all',
    })
    return gained
  }

  return { buyOrbitSlot, buyAllPlanetLevels }
}
