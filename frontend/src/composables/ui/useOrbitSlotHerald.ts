import { useHerald } from '@/composables/ui/useHerald'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'

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

  return { buyOrbitSlot }
}
