import { defineStore } from 'pinia'
import type { VoidMonster } from '../types'
import { VOID_MONSTER_MAX_COUNT } from '../config/constants'

let monsterIdCounter = 0
const EDGE_MARGIN = 60

export const useVoidMonsterStore = defineStore('voidMonster', {
  state: () => ({
    activeMonsters: [] as VoidMonster[],
  }),

  actions: {
    spawnMonster() {
      if (this.activeMonsters.length >= VOID_MONSTER_MAX_COUNT) return

      const w = window.innerWidth
      const h = window.innerHeight
      const edge = Math.floor(Math.random() * 4)

      let spawnX: number
      let spawnY: number

      // 0=top, 1=right, 2=bottom, 3=left
      if (edge === 0) {
        spawnX = Math.random() * w
        spawnY = -EDGE_MARGIN
      } else if (edge === 1) {
        spawnX = w + EDGE_MARGIN
        spawnY = Math.random() * h
      } else if (edge === 2) {
        spawnX = Math.random() * w
        spawnY = h + EDGE_MARGIN
      } else {
        spawnX = -EDGE_MARGIN
        spawnY = Math.random() * h
      }

      this.activeMonsters.push({
        id: `void-${++monsterIdCounter}`,
        spawnX,
        spawnY,
        spawnedAt: performance.now(),
      })
    },

    removeMonster(id: string) {
      const idx = this.activeMonsters.findIndex((m) => m.id === id)
      if (idx !== -1) this.activeMonsters.splice(idx, 1)
    },

    clearAll() {
      this.activeMonsters = []
    },
  },
})
