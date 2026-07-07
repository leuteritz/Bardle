import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { getChampionStarLevel } from '@/config/championTiers'
import {
  ROLES,
  SIGIL_STAGE_SIZE,
  SIGIL_PENTAGON_RADIUS,
  SIGIL_ALLY_RADIUS,
  SIGIL_ALLY_ARC_DEG,
  ALLIES_PER_ROLE,
  SIGIL_STAGES,
  SIGIL_POWER_PER_STAR,
  SIGIL_ALLY_POWER_PER_STAR,
  SIGIL_PENTAGRAM_AT_MAINS,
  SIGIL_MANDALA_AT_FILLED,
  SIGIL_EMBER_MIN_R,
  SIGIL_EMBER_R_SPREAD,
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
const EMBER_GOLDEN_ANGLE = 137.508

function polarPoint(angleDeg: number, radius: number): SigilPoint {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) }
}

/** Pentagon angle of role i — Top at 12 o'clock, ROLES order clockwise. */
function roleAngle(roleIndex: number): number {
  return -90 + roleIndex * 72
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
  const filledAllies = computed(
    () => secondarySlots.value.flat().filter(Boolean).length,
  )
  const filledSlots = computed(() => filledMains.value + filledAllies.value)

  /** Roles with main + all allies set (index-aligned with ROLES). */
  const roleFull = computed(() =>
    ROLES.map(
      (_, i) =>
        !!headerSlots.value[i] && (secondarySlots.value[i] ?? []).every((a) => !!a),
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

  const teamPower = computed(() => {
    let power = 0
    headerSlots.value.forEach((champion) => {
      if (champion) power += getChampionStarLevel(champion) * SIGIL_POWER_PER_STAR
    })
    secondarySlots.value.forEach((allies) =>
      allies.forEach((ally) => {
        if (ally) power += getChampionStarLevel(ally) * SIGIL_ALLY_POWER_PER_STAR
      }),
    )
    return power
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

  /** Ally satellite positions per role: [roleIndex][subSlot 0..ALLIES_PER_ROLE-1].
   *  Constellation arc — evenly spread over SIGIL_ALLY_ARC_DEG, centered on the role angle. */
  const allyPoints = computed<SigilPoint[][]>(() =>
    ROLES.map((_, i) =>
      Array.from({ length: ALLIES_PER_ROLE }, (_, k) => {
        const step = SIGIL_ALLY_ARC_DEG / Math.max(ALLIES_PER_ROLE - 1, 1)
        const offset = (k - (ALLIES_PER_ROLE - 1) / 2) * step
        return polarPoint(roleAngle(i) + offset, SIGIL_ALLY_RADIUS)
      }),
    ),
  )

  /** Deterministic ember particles (golden-angle spread, index-derived timing). */
  const embers = computed<SigilEmber[]>(() => {
    const list: SigilEmber[] = []
    for (let k = 0; k < sigilStage.value.emberCount; k++) {
      const radius = SIGIL_EMBER_MIN_R + ((k * 47) % SIGIL_EMBER_R_SPREAD)
      const point = polarPoint(k * EMBER_GOLDEN_ANGLE, radius)
      list.push({
        x: point.x,
        y: point.y,
        size: 3 + (k % 3),
        delaySec: (k * 0.37) % 2.4,
        durationSec: 2.2 + ((k * 0.29) % 1.8),
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
    avgTier,
    rolePoints,
    allyPoints,
    embers,
  }
}
