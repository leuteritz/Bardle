import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getChampionStarLevel } from '@/config/champions/championTiers'
import {
  ROLES,
  SIGIL_STAGE_SIZE,
  SIGIL_PENTAGON_RADIUS,
  SIGIL_PENTAGON_START_ANGLE,
  SIGIL_PENTAGON_ANGLE_STEP,
  SIGIL_ALLY_RADIUS,
  SIGIL_ALLY_ARC_DEG,
  SIGIL_SWORN_GAP,
  SIGIL_SWORN_SPREAD_DEG,
  SWORN_ALLY_COUNT,
  ALLIES_PER_ROLE,
  SIGIL_STAGES,
  SIGIL_POWER_PER_STAR,
  SIGIL_ALLY_POWER_PER_STAR,
  SIGIL_PENTAGRAM_AT_MAINS,
  SIGIL_MANDALA_AT_FILLED,
  SIGIL_EMBER_MIN_R,
  SIGIL_EMBER_R_SPREAD,
  GOLDEN_ANGLE_DEG,
  SIGIL_EMBER_RADIUS_STEP,
  SIGIL_EMBER_SIZE_BASE,
  SIGIL_EMBER_SIZE_VARIANTS,
  SIGIL_EMBER_DELAY_STEP_S,
  SIGIL_EMBER_DELAY_CYCLE_S,
  SIGIL_EMBER_DURATION_BASE_S,
  SIGIL_EMBER_DURATION_STEP_S,
  SIGIL_EMBER_DURATION_SPREAD_S,
} from '@/config/constants'
import type { SigilStageDef } from '@/types'

export interface SigilPoint {
  x: number
  y: number
}

export interface SigilEmber {
  x: number
  y: number
  size: number
  delaySec: number
  durationSec: number
}

const CENTER = SIGIL_STAGE_SIZE / 2
/** Golden angle (deg) — spreads embers evenly without Math.random. */
const EMBER_GOLDEN_ANGLE = GOLDEN_ANGLE_DEG

function polarPoint(angleDeg: number, radius: number): SigilPoint {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) }
}

/** Pentagon angle of role i — Top at 12 o'clock, ROLES order clockwise. */
function roleAngle(roleIndex: number): number {
  return SIGIL_PENTAGON_START_ANGLE + roleIndex * SIGIL_PENTAGON_ANGLE_STEP
}

/**
 * Pure UI derivations for the Battle Sigil (Team tab): slot fill counts,
 * escalation stage, team power and all pentagon/satellite coordinates.
 * Reads battleStore only — no store mutations, no persistence.
 */
export function useTeamSigil() {
  const battleStore = useBattleStore()
  const { headerSlots, secondarySlots } = storeToRefs(battleStore)

  /** Per-role "main champion set" flags (index-aligned with ROLES). */
  const mainFilled = computed(() => headerSlots.value.map((c) => !!c))
  const filledMains = computed(() => headerSlots.value.filter(Boolean).length)
  const filledAllies = computed(() => secondarySlots.value.flat().filter(Boolean).length)
  const filledSlots = computed(() => filledMains.value + filledAllies.value)

  /** Roles with main + all allies set (index-aligned with ROLES). */
  const roleFull = computed(() =>
    ROLES.map(
      (_, i) => !!headerSlots.value[i] && (secondarySlots.value[i] ?? []).every((a) => !!a),
    ),
  )
  const fullRoles = computed(() => roleFull.value.filter(Boolean).length)

  const sigilStage = computed<SigilStageDef>(() => {
    let stage = SIGIL_STAGES[0]
    for (const s of SIGIL_STAGES) {
      if (filledSlots.value >= s.minFilled) stage = s
    }
    return stage
  })
  const sigilStageIndex = computed(() => SIGIL_STAGES.indexOf(sigilStage.value))

  const showPentagram = computed(() => filledMains.value >= SIGIL_PENTAGRAM_AT_MAINS)
  const showMandala = computed(() => filledSlots.value >= SIGIL_MANDALA_AT_FILLED)

  /**
   * Power contributed by each role (index-aligned with ROLES) — its main plus
   * every ally seated under it. The team power is the SUM of this array rather
   * than a second walk over the same slots: the core's gauge, the power tab on
   * every name plate and the figure in the middle then cannot disagree, because
   * there is only one formula for all three.
   */
  const rolePower = computed<number[]>(() =>
    ROLES.map((_, i) => {
      const main = headerSlots.value[i]
      let power = main ? getChampionStarLevel(main) * SIGIL_POWER_PER_STAR : 0
      for (const ally of secondarySlots.value[i] ?? []) {
        if (ally) power += getChampionStarLevel(ally) * SIGIL_ALLY_POWER_PER_STAR
      }
      return power
    }),
  )

  const teamPower = computed(() => rolePower.value.reduce((sum, p) => sum + p, 0))

  /** Each role's share of the team power (0..1) — 0 for all while the team is empty. */
  const roleShares = computed<number[]>(() => {
    const total = teamPower.value
    return total > 0 ? rolePower.value.map((p) => p / total) : rolePower.value.map(() => 0)
  })

  const avgTier = computed(() => {
    const mains = headerSlots.value.filter((c): c is string => !!c)
    if (mains.length === 0) return 0
    return mains.reduce((sum, c) => sum + getChampionStarLevel(c), 0) / mains.length
  })

  // ── Geometry ────────────────────────────────────────────────────────────────
  const rolePoints = computed<SigilPoint[]>(() =>
    ROLES.map((_, i) => polarPoint(roleAngle(i), SIGIL_PENTAGON_RADIUS)),
  )

  /**
   * Ally satellite positions per role: [roleIndex][subSlot 0..ALLIES_PER_ROLE-1].
   * Two rings, not one arc: the first SWORN_ALLY_COUNT sub-slots sit on the inner
   * sworn orbit (they lend the main their stats, so they belong next to it), the
   * rest spread over the outer bench arc. Both are centred on the role angle, so
   * the cluster stays symmetric whatever the counts are.
   */
  const allyPoints = computed<SigilPoint[][]>(() =>
    ROLES.map((_, i) => {
      const angle = roleAngle(i)
      const node = polarPoint(angle, SIGIL_PENTAGON_RADIUS)
      const benchCount = Math.max(ALLIES_PER_ROLE - SWORN_ALLY_COUNT, 0)
      return Array.from({ length: ALLIES_PER_ROLE }, (_, k) => {
        if (k < SWORN_ALLY_COUNT) {
          // measured from the NODE, so the pair hugs its main wherever the
          // pentagon puts it — the bench alone rides the global arc
          const step = (SIGIL_SWORN_SPREAD_DEG * 2) / Math.max(SWORN_ALLY_COUNT - 1, 1)
          const offset = -SIGIL_SWORN_SPREAD_DEG + k * step
          const rad = ((angle + offset) * Math.PI) / 180
          return {
            x: node.x + SIGIL_SWORN_GAP * Math.cos(rad),
            y: node.y + SIGIL_SWORN_GAP * Math.sin(rad),
          }
        }
        const b = k - SWORN_ALLY_COUNT
        const step = SIGIL_ALLY_ARC_DEG / Math.max(benchCount - 1, 1)
        const offset = (b - (benchCount - 1) / 2) * step
        return polarPoint(angle + offset, SIGIL_ALLY_RADIUS)
      })
    }),
  )

  /** Deterministic ember particles (golden-angle spread, index-derived timing). */
  const embers = computed<SigilEmber[]>(() => {
    const list: SigilEmber[] = []
    for (let k = 0; k < sigilStage.value.emberCount; k++) {
      const radius = SIGIL_EMBER_MIN_R + ((k * SIGIL_EMBER_RADIUS_STEP) % SIGIL_EMBER_R_SPREAD)
      const point = polarPoint(k * EMBER_GOLDEN_ANGLE, radius)
      list.push({
        x: point.x,
        y: point.y,
        size: SIGIL_EMBER_SIZE_BASE + (k % SIGIL_EMBER_SIZE_VARIANTS),
        delaySec: (k * SIGIL_EMBER_DELAY_STEP_S) % SIGIL_EMBER_DELAY_CYCLE_S,
        durationSec:
          SIGIL_EMBER_DURATION_BASE_S +
          ((k * SIGIL_EMBER_DURATION_STEP_S) % SIGIL_EMBER_DURATION_SPREAD_S),
      })
    }
    return list
  })

  return {
    mainFilled,
    filledMains,
    filledAllies,
    filledSlots,
    roleFull,
    fullRoles,
    sigilStage,
    sigilStageIndex,
    showPentagram,
    showMandala,
    teamPower,
    rolePower,
    roleShares,
    avgTier,
    rolePoints,
    allyPoints,
    embers,
  }
}
