import { ref, onMounted, onUnmounted } from 'vue'
import { useVoidMonsterStore } from '../stores/voidMonsterStore'
import {
  VOID_MONSTER_FLY_DURATION_MS,
  VOID_MONSTER_SPAWN_INTERVAL_MIN_MS,
  VOID_MONSTER_SPAWN_INTERVAL_MAX_MS,
} from '../config/constants'

export interface VoidMonsterRenderEntry {
  id: string
  x: number
  y: number
  opacity: number
  scale: number
}

function easeInQuad(t: number): number {
  return t * t
}

export function useVoidMonster() {
  const store = useVoidMonsterStore()
  const monsterRenders = ref<VoidMonsterRenderEntry[]>([])

  let animFrame = 0
  let spawnTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleNextSpawn() {
    const delay =
      VOID_MONSTER_SPAWN_INTERVAL_MIN_MS +
      Math.random() * (VOID_MONSTER_SPAWN_INTERVAL_MAX_MS - VOID_MONSTER_SPAWN_INTERVAL_MIN_MS)
    spawnTimer = setTimeout(() => {
      store.spawnMonster()
      scheduleNextSpawn()
    }, delay)
  }

  function animate(ts: number) {
    const screenCx = window.innerWidth / 2
    const screenCy = window.innerHeight / 2

    const renders: VoidMonsterRenderEntry[] = []
    const toRemove: string[] = []

    for (const monster of store.activeMonsters) {
      const rawT = (ts - monster.spawnedAt) / VOID_MONSTER_FLY_DURATION_MS
      const t = Math.min(rawT, 1)
      const easedT = easeInQuad(t)

      const x = monster.spawnX + (screenCx - monster.spawnX) * easedT
      const y = monster.spawnY + (screenCy - monster.spawnY) * easedT

      // Fade in during first 5%, fade out during last 20%
      let opacity: number
      if (t < 0.05) {
        opacity = t / 0.05
      } else if (t > 0.8) {
        opacity = 1 - (t - 0.8) / 0.2
      } else {
        opacity = 1
      }

      const scale = 1.0 + t * 0.3

      if (t >= 1) {
        toRemove.push(monster.id)
      } else {
        renders.push({ id: monster.id, x, y, opacity, scale })
      }
    }

    for (const id of toRemove) {
      store.removeMonster(id)
    }

    monsterRenders.value = renders
    animFrame = requestAnimationFrame(animate)
  }

  onMounted(() => {
    animFrame = requestAnimationFrame(animate)
    scheduleNextSpawn()
  })

  onUnmounted(() => {
    cancelAnimationFrame(animFrame)
    if (spawnTimer !== null) {
      clearTimeout(spawnTimer)
      spawnTimer = null
    }
  })

  return { monsterRenders }
}
