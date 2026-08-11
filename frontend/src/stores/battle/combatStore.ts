import { defineStore } from 'pinia'
import type { ChampionCombatState, ChampionCombatPhase, DamageFloat } from '@/types'
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
} from '@/config/constants'
import { activePlanetPositions } from '@/utils/orbit/liveState'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useVoidStore } from '@/stores/world/voidStore'

let _damageFloatId = 0

/**
 * Alles, was auf die rohe Kader-Summe global draufgeht — Synergien, Forge,
 * Meep-Baum und jede laufende Zeitwirkung.
 *
 * Steht als eigene Funktion, weil zwei Ziele sie brauchen: der Planeten-Boss
 * im Tick unten und der Void-Riss, der sich seinen Beschuss aus demselben
 * Orbit holt. Als zweite Abschrift wäre spätestens der nächste Faktor nur an
 * einer der beiden Stellen angekommen.
 */
function globalDpsMultiplier(): number {
  return (
    useSynergyStore().dpsSynergyMultiplier *
    useStarForgeStore().championDpsMult *
    useMeepTreeStore().fx.championDpsMult *
    useDrifterStore().combatDpsMult *
    // Fulfilled omen: earned elsewhere, spent here
    useOmenStore().combatDpsMult *
    // Tempered Fate (bard R): the orbit keeps swinging while the stasis holds
    useBardAbilityStore().combatDpsMult *
    // Bladed / Ironclad Orbit (providence): the whole run leans one way
    useProvidenceStore().combatDpsMult *
    // Dimming Wound (void tide): an open rift blunts the orbit — including the
    // orbit that is trying to close it. That feedback is the point: the answer
    // to a rift that outpaces your squad is to click it, and click damage is a
    // share of its own health, untouched by this factor.
    useVoidStore().combatDpsMult
  )
}

/**
 * Die rohe Schadenssumme einer Gruppe angreifender Champions, vor den globalen
 * Faktoren oben.
 *
 * `bossHpFraction` entscheidet allein darüber, ob der Execute-Perk greift; ein
 * Ziel ohne Hinrichtungsschwelle (der Void-Riss) übergibt schlicht 1.
 */
function sumChampionDps(
  attackers: ChampionCombatState[],
  bossHpFraction: number,
): { total: number; anyCrit: boolean } {
  const battleStore = useBattleStore()
  const levelStore = useChampionLevelStore()
  let total = 0
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
    total += dps
  }

  return { total, anyCrit }
}

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
      // Wanduhr: reine Anzeige, an eine CSS-Animation gebunden (wie
      // playerStore.damageFloats).
      // eslint-disable-next-line no-restricted-syntax
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
        const bossHpFraction = activeBoss.maxHP > 0 ? activeBoss.currentHP / activeBoss.maxHP : 1
        const { total: baseDPS, anyCrit } = sumChampionDps(attackers, bossHpFraction)
        const totalDPS = baseDPS * globalDpsMultiplier()
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

    /**
     * Was der GESAMTE Kader in dieser Sekunde austeilt, unabhängig davon, wo
     * die einzelnen Champions gerade auf ihrer Bahn stehen.
     *
     * Der Void-Riss holt sich hierüber seinen Beschuss. Anders als ein
     * Planeten-Boss ist er kein Punkt im Orbit, den ein Champion erst erreichen
     * muss — er klafft im ganzen System, also zählt der ganze Kader. Genau
     * deshalb entfällt hier die Reichweitenprüfung aus `tick()`, und
     * `bossHpFraction` steht auf 1: ein Riss hat keine Hinrichtungsschwelle.
     */
    fullOrbitDps(): number {
      if (this.champions.length === 0) return 0
      const { total } = sumChampionDps(this.champions, 1)
      return total * globalDpsMultiplier()
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
