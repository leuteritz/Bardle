import { ref } from 'vue'
import type { Ref } from 'vue'
import type { PlanetItem } from '../types'

// Re-export types for consumers that import from here
export type { PlanetType, PlanetTypeConfig } from '../utils/planetDraw'
export { PLANET_TYPE_CONFIGS } from '../utils/planetDraw'

/**
 * Planet rendering is now handled entirely by StarSystemComponent + useStarSystem.
 * This composable returns an empty list to preserve the interface used by
 * StarBackgroundComponent without breaking its existing wiring.
 */
export function usePlanetBackground(_container: Ref<HTMLElement | null>): {
  planets: Ref<PlanetItem[]>
} {
  return { planets: ref<PlanetItem[]>([]) }
}
