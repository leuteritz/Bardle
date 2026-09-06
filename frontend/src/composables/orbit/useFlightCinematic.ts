import { computed } from 'vue'
import { FLIGHT_FORMATION } from '@/config/constants'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'

export type FlightCinematicMode = 'idle' | 'galaxy' | 'universe'

export function useFlightCinematic() {
  const gameStore = useGameStore()
  const galaxyStore = useGalaxyStore()

  const mode = computed<FlightCinematicMode>(() => {
    if (gameStore.isHyperspaceActive) return 'universe'
    if (galaxyStore.isGalaxyTransitioning) return 'galaxy'
    return 'idle'
  })

  const active = computed(() => mode.value !== 'idle')
  const formation = computed(() => FLIGHT_FORMATION[mode.value])

  return { mode, active, formation }
}
