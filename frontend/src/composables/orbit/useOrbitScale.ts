import { ref, computed } from 'vue'
import { ORBIT_TIERS, SUN_GROWTH_STAGES, ORBIT_MAX_RX_VIEWPORT_FILL } from '@/config/constants'
import { getOrbitSunScale } from '@/utils/geometry'

// Outermost possible orbit: star tier 2 at max sun stage (stage 6),
// using the dampened orbit scale (orbits grow slower than the sun itself).
const MAX_BASE_ORBIT_RX = ORBIT_TIERS.star[ORBIT_TIERS.star.length - 1].rx
const MAX_SUN_SCALE = getOrbitSunScale(SUN_GROWTH_STAGES[SUN_GROWTH_STAGES.length - 1].radius)
const MAX_ORBIT_AT_FULL_SCALE = MAX_BASE_ORBIT_RX * MAX_SUN_SCALE

const viewportMin = ref(Math.min(window.innerWidth, window.innerHeight))
window.addEventListener('resize', () => {
  viewportMin.value = Math.min(window.innerWidth, window.innerHeight)
})

export function useOrbitScale() {
  // Fixed cap per viewport: ensures all orbits fit at stage 6; below that they scale freely with sunScale.
  const orbitScale = computed(() => {
    const availableRadius = (viewportMin.value / 2) * ORBIT_MAX_RX_VIEWPORT_FILL
    return Math.min(1.0, availableRadius / MAX_ORBIT_AT_FULL_SCALE)
  })
  return { orbitScale }
}
