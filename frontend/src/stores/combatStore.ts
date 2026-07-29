import { defineStore } from 'pinia'
import type { ChampionCombatState, ChampionCombatPhase, DamageFloat } from '../types'
import {
  CHAMPION_DETECT_RADIUS,
  CHAMPION_ORBIT_HIT_RANGE,
  CHAMPION_DPS_BASE,
  ALLY_DPS_CONTRIBUTION,
  COMBAT_ORBIT_RADIUS_X_MIN,
  COMBAT_ORBIT_RADIUS_X_RANGE,
  COMBAT_ORBIT_Y_SCALE_MIN,
  COMBAT_ORBIT_Y_SCALE_RANGE,
  COMBAT_ORBIT_TILT_MAX_DEG,
  COMBAT_ORBIT_SPEED_MIN,
  COMBAT_ORBIT_SPEED_RANGE,
  COMBAT_ORBIT_SAFE_Y,
  COMBAT_FLOAT_DURATION_MS,
  COMBAT_FLOAT_OFFSET_Y,
  COMBAT_FLOAT_OFFSET_X_SPREAD,
  CHAMPION_EXECUTE_HP_THRESHOLD,
  CHAMPION_CRIT_DAMAGE_MULT,
} from '../config/constants'
import { activePlanetPositions } from '../utils/liveState'
import { usePlanetBossStore } from './planetBossStore'
import { useBattleStore } from './battleStore'
import { useGameStore } from './gameStore'
import { useSynergyStore } from './synergyStore'
import { useStarForgeStore } from './starForgeStore'
import { useMeepTreeStore } from './meepTreeStore'
import { useChampionLevelStore } from './championLevelStore'

let _damageFloatId = 0

function buildChampionState(name: string, index: number, total: number): ChampionCombatState {
  let orbitRadiusX = COMBAT_ORBIT_RADIUS_X_MIN + Math.random() * COMBAT_ORBIT_RADIUS_X_RANGE
  let orbitRadiusY =
    orbitRadiusX * (COMBAT_ORBIT_Y_SCALE_MIN + Math.random() * COMBAT_ORBIT_Y_SCALE_RANGE)
  const tiltDeg = Math.random() * COMBAT_ORBIT_TILT_MAX_DEG
  const tiltRad = (tiltDeg * Math.PI) / 180
  const baseSpeed = COMBAT_ORBIT_SPEED_MIN + Math.random() * COMBAT_ORBIT_SPEED_RANGE
  const direction = Math.random() < 0.5 ? 1 : -1

  // Clamp vertical orbit extent to stay clear of HP bar / Travel HUD (±116px from center)
  const SAFE_Y = COMBAT_ORBIT_SAFE_Y
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
      const N = ownedChampions.length
      const existing = new Map(this.champions.map((c) => [c.name, c]))
      this.champions = ownedChampions.map((name, i) =>
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
        const gameStore = useGameStore()
        if (gameStore.isGamePaused && activeBoss.isChampionPlanet) return
        // Each attacking main hits harder per assigned ally of its role (allies no longer orbit)
        const battleStore = useBattleStore()
        const levelStore = useChampionLevelStore()
        const bossHpFraction = activeBoss.maxHP > 0 ? activeBoss.currentHP / activeBoss.maxHP : 1
        let baseDPS = 0
        let anyCrit = false
        for (const a of attackers) {
          const roleIdx = battleStore.headerSlots.indexOf(a.name)
          const filledAllies =
            roleIdx >= 0 ? (battleStore.secondarySlots[roleIdx]?.filter(Boolean).length ?? 0) : 0
          // Ascendant Aura (perk) makes each assigned ally worth more
          const allyShare = ALLY_DPS_CONTRIBUTION * levelStore.allyContributionMultOf(a.name)
          // POWER (champion level) is what separates a fresh recruit from a
          // levelled one — everything below stacks on top of it.
          let dps = CHAMPION_DPS_BASE * (1 + filledAllies * allyShare)
          dps *= levelStore.orbitDpsMultOf(a.name)

          const execute = levelStore.perkEffectOf(a.name, 'execute')
          if (execute > 0 && bossHpFraction <= CHAMPION_EXECUTE_HP_THRESHOLD) {
            dps *= 1 + execute
          }
          const crit = levelStore.perkEffectOf(a.name, 'critChance')
          if (crit > 0 && Math.random() < crit) {
            dps *= CHAMPION_CRIT_DAMAGE_MULT
            anyCrit = true
          }
          baseDPS += dps
        }
        const totalDPS =
          baseDPS *
          useSynergyStore().dpsSynergyMultiplier *
          useStarForgeStore().championDpsMult *
          useMeepTreeStore().fx.championDpsMult
        const defeated = bossStore.dealDamage(totalDPS)
        if (!defeated) {
          // Spawn one combined float at the planet position showing total damage
          this.damageFloats.push({
            id: ++_damageFloatId,
            value: totalDPS,
            x: pos.cx + (Math.random() - 0.5) * COMBAT_FLOAT_OFFSET_X_SPREAD,
            y: pos.cy - COMBAT_FLOAT_OFFSET_Y,
            expiresAt: now + COMBAT_FLOAT_DURATION_MS,
            planetFloat: true,
            crit: anyCrit,
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
