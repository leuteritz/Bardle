import { defineStore } from 'pinia'
import type { ChampionCombatState, ChampionCombatPhase, DamageFloat } from '../types'
import {
  CHAMPION_DETECT_RADIUS,
  CHAMPION_ORBIT_HIT_RANGE,
  CHAMPION_DPS_BASE,
} from '../config/constants'
import { activePlanetPositions } from '../utils/activePlanetPositions'
import { usePlanetBossStore } from './planetBossStore'
import { useBattleStore } from './battleStore'

const EXCLUDED = new Set(['Bard'])

let _damageFloatId = 0

function buildChampionState(name: string, index: number, total: number): ChampionCombatState {
  let orbitRadiusX = 130 + Math.random() * 65
  let orbitRadiusY = orbitRadiusX * (0.28 + Math.random() * 0.62)
  const tiltDeg = Math.random() * 180
  const tiltRad = (tiltDeg * Math.PI) / 180
  const baseSpeed = 0.00015 + Math.random() * 0.00038
  const direction = Math.random() < 0.5 ? 1 : -1

  // Clamp vertical orbit extent to stay clear of HP bar / Travel HUD (±116px from center)
  const SAFE_Y = 90
  const maxYExtent = Math.sqrt(
    (orbitRadiusX * Math.sin(tiltRad)) ** 2 + (orbitRadiusY * Math.cos(tiltRad)) ** 2,
  )
  if (maxYExtent > SAFE_Y) {
    const scale = SAFE_Y / maxYExtent
    orbitRadiusX *= scale
    orbitRadiusY *= scale
  }

  return {
    name,
    angle: (index / Math.max(total, 1)) * Math.PI * 2,
    baseSpeed,
    direction,
    orbitRadiusX,
    orbitRadiusY,
    tiltDeg,
    tiltRad,
    isBurst: false,
    burstTimer: 0,
    phase: 'orbit' as ChampionCombatPhase,
    screenX: 0,
    screenY: 0,
    targetX: 0,
    targetY: 0,
    isAttacking: false,
  }
}

export const useCombatStore = defineStore('combat', {
  state: () => ({
    champions: [] as ChampionCombatState[],
    damageFloats: [] as DamageFloat[],
  }),

  actions: {
    /** Sync champion list from battleStore (called from ChampionOrbit.vue on mount + watch) */
    syncChampions(ownedChampions: string[]) {
      const filtered = ownedChampions.filter((n) => !EXCLUDED.has(n))
      const N = filtered.length
      const existing = new Map(this.champions.map((c) => [c.name, c]))
      this.champions = filtered.map((name, i) =>
        existing.has(name) ? existing.get(name)! : buildChampionState(name, i, N),
      )
    },

    /** Called every second from gameStore.tick() */
    tick() {
      const bossStore = usePlanetBossStore()
      const activeBoss = bossStore.activeBoss

      // Clean up expired damage floats
      const now = Date.now()
      this.damageFloats = this.damageFloats.filter((f) => f.expiresAt > now)

      if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
        // No active boss — clear attack state, keep everyone orbiting
        for (const c of this.champions) {
          c.isAttacking = false
        }
        return
      }

      const pos = activePlanetPositions.get(activeBoss.planetId)
      if (!pos) {
        for (const c of this.champions) {
          c.isAttacking = false
        }
        return
      }

      const screenCx = window.innerWidth / 2
      const screenCy = window.innerHeight / 2
      const distToCenter = Math.hypot(pos.cx - screenCx, pos.cy - screenCy)

      if (distToCenter > CHAMPION_DETECT_RADIUS) {
        // Planet too far — no combat
        for (const c of this.champions) {
          c.isAttacking = false
        }
        return
      }

      // Check each champion's orbit position against planet position
      let attackingCount = 0
      const attackers: ChampionCombatState[] = []

      for (const c of this.champions) {
        const dist = Math.hypot(c.screenX - pos.cx, c.screenY - pos.cy)
        c.isAttacking = dist < CHAMPION_ORBIT_HIT_RANGE
        if (c.isAttacking) {
          attackingCount++
          attackers.push(c)
        }
      }

      if (attackingCount > 0) {
        const totalDPS = attackingCount * CHAMPION_DPS_BASE
        const defeated = bossStore.dealDamage(totalDPS)
        if (!defeated) {
          // Spawn one combined float at the planet position showing total damage
          this.damageFloats.push({
            id: ++_damageFloatId,
            value: totalDPS,
            x: pos.cx + (Math.random() - 0.5) * 10,
            y: pos.cy - 30,
            expiresAt: now + 1000,
            planetFloat: true,
          })
        }
      }
    },

    /** Called by ChampionOrbit.vue rAF when a champion reaches its attack target */
    setPhase(name: string, phase: ChampionCombatPhase) {
      const c = this.champions.find((ch) => ch.name === name)
      if (c) c.phase = phase
    },

    /** Called by ChampionOrbit.vue rAF each frame to keep screenX/Y current */
    setChampionScreenPos(name: string, x: number, y: number) {
      const c = this.champions.find((ch) => ch.name === name)
      if (c) {
        c.screenX = x
        c.screenY = y
      }
    },

    /** Initialize champions from battleStore on first load */
    init() {
      const battleStore = useBattleStore()
      this.syncChampions(battleStore.headerSlots.filter((s): s is string => s !== null))
    },
  },
})
