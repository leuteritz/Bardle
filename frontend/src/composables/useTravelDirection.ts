import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useGalaxyStore } from '../stores/galaxyStore'

// ── Seeded RNG (identical to MiniMap.vue) ──────────────────────────────────────
function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// ── Dot generation + order (mirrors MiniMap.vue generateDots()) ───────────────
interface DotPos {
  x: number
  y: number
}

function buildDotOrder(galaxy: number, starsRequired: number): {
  dots: DotPos[]
  spawnPos: DotPos
  order: number[]
} {
  const rng = seededRng(galaxy * 31337 + starsRequired)
  const dots: DotPos[] = []
  for (let i = 0; i < starsRequired; i++) {
    const angle = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * 0.32
    dots.push({ x: 0.5 + r * Math.cos(angle), y: 0.5 + r * Math.sin(angle) * 0.75 })
  }

  const spawnRng = seededRng(galaxy * 99997 + starsRequired * 13)
  const sa = spawnRng() * Math.PI * 2
  const sr = Math.sqrt(spawnRng()) * 0.3
  const spawnPos: DotPos = { x: 0.5 + sr * Math.cos(sa), y: 0.5 + sr * Math.sin(sa) }

  // Nearest-neighbor traversal from spawn (identical to MiniMap.vue)
  let originIdx = 0
  let nearestToSpawn = Infinity
  for (let i = 0; i < dots.length; i++) {
    const dx = dots[i].x - spawnPos.x
    const dy = dots[i].y - spawnPos.y
    const d = dx * dx + dy * dy
    if (d < nearestToSpawn) {
      nearestToSpawn = d
      originIdx = i
    }
  }
  const order: number[] = [originIdx]
  const visited = new Set<number>([originIdx])
  while (order.length < starsRequired) {
    const last = dots[order[order.length - 1]]
    let nearest = -1
    let nearestDist = Infinity
    for (let i = 0; i < dots.length; i++) {
      if (visited.has(i)) continue
      const dx = dots[i].x - last.x
      const dy = dots[i].y - last.y
      const d = dx * dx + dy * dy
      if (d < nearestDist) {
        nearestDist = d
        nearest = i
      }
    }
    if (nearest === -1) break
    order.push(nearest)
    visited.add(nearest)
  }

  return { dots, spawnPos, order }
}

// ── Angle computation ─────────────────────────────────────────────────────────
export function computeTravelAngleDeg(
  galaxy: number,
  starsRequired: number,
  starsRescued: number,
): number {
  if (starsRequired <= 0) return 0
  const { dots, spawnPos, order } = buildDotOrder(galaxy, starsRequired)

  const from: DotPos =
    starsRescued === 0 ? spawnPos : dots[order[starsRescued - 1]] ?? spawnPos
  const to: DotPos =
    starsRescued < dots.length
      ? dots[order[starsRescued]] ?? dots[order[dots.length - 1]]
      : dots[order[dots.length - 1]] ?? spawnPos

  return Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI)
}

// ── Composable ────────────────────────────────────────────────────────────────
export function useTravelDirection(): {
  travelActive: Ref<boolean>
  travelAngleDeg: Ref<number>
  clearTravel: () => void
} {
  const galaxyStore = useGalaxyStore()
  const travelActive = ref(false)
  const travelAngleDeg = ref(0)

  function clearTravel(): void {
    travelActive.value = false
  }

  function triggerTravel(): void {
    travelAngleDeg.value = computeTravelAngleDeg(
      galaxyStore.currentGalaxy,
      galaxyStore.starsRequired,
      galaxyStore.starsRescued,
    )
    travelActive.value = true
  }

  // Trigger when travel state transitions TO 'traveling'
  watch(
    () => galaxyStore.championTravelState,
    (next, prev) => {
      if (next === 'traveling' && prev !== 'traveling') {
        triggerTravel()
      }
    },
  )

  return { travelActive, travelAngleDeg, clearTravel }
}
