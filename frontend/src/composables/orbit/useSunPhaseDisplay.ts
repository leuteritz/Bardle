// Anzeige-Nummerierung der Sonnenphasen. Der Komet zählt als Phase 1, echte
// Sternphasen erscheinen daher als Index + Offset. Fünf Komponenten haben diese
// Rechnung vorher jeweils selbst gemacht — hier steht sie einmal.
import { computed } from 'vue'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { SUN_PHASE_DISPLAY_OFFSET, SUN_PHASE_DISPLAY_TOTAL } from '@/config/constants'

/** Phasen-Index (0-basiert) → angezeigte Phasennummer. */
export function displaySunPhase(phaseIndex: number): number {
  return phaseIndex + SUN_PHASE_DISPLAY_OFFSET
}

export function useSunPhaseDisplay() {
  const solarStore = useSolarUpgradeStore()

  /** Aktuelle Phasennummer — im Kometenzustand immer 1. */
  const currentDisplayPhase = computed(() =>
    solarStore.isCometState ? 1 : displaySunPhase(solarStore.starPhase),
  )

  /** "Phase 3 / 12" — die übliche Kopfzeile über dem Sonnenzustand. */
  const phaseLabel = computed(
    () => `Phase ${currentDisplayPhase.value} / ${SUN_PHASE_DISPLAY_TOTAL}`,
  )

  return { currentDisplayPhase, phaseLabel }
}
