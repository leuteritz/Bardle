import { ref, computed } from 'vue'
import { SUN_RADIUS, SUN_GROWTH_STAGES } from '@/config/constants'
import { getOrbitSunScale } from '@/utils/orbitMath'

// Outermost possible orbit: star tier 2 at max sun stage (stage 6),
// using the dampened orbit scale (orbits grow slower than the sun itself).
const MAX_BASE_ORBIT_RX = SUN_RADIUS * 16.5
const MAX_SUN_SCALE = getOrbitSunScale(SUN_GROWTH_STAGES[SUN_GROWTH_STAGES.length - 1].radius)
const MAX_ORBIT_AT_FULL_SCALE = MAX_BASE_ORBIT_RX * MAX_SUN_SCALE

const viewportMin = ref(Math.min(window.innerWidth, window.innerHeight))
window.addEventListener('resize', () => {
  viewportMin.value = Math.min(window.innerWidth, window.innerHeight)
})

export function useOrbitScale() {
  // Fixed cap per viewport: ensures all orbits fit at stage 6; below that they scale freely with sunScale.
  const orbitScale = computed(() => {
    const availableRadius = (viewportMin.value / 2) * 0.9
    return Math.min(1.0, availableRadius / MAX_ORBIT_AT_FULL_SCALE)
  })
  return { orbitScale }
}
