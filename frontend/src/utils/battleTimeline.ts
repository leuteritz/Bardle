import type { BattleEvent, BattleRole, BattleTimeline, ChampionState, StructureId } from '../types'
import { BASIC_DRAKE_TYPES, type DrakeTypeId } from '../config/drakes'
import {
  STRUCTURE_POSITIONS,
  LANE_TIER_ORDER,
  nextStructureInLane,
  nextNexusTurret,
  canFallNexusTurret,
  parseStructureId,
  structureId,
  destroyedStructuresUpTo,
  laneProgress,
  crackedLaneOf,
} from './battleStructures'
import {
  BATTLE_TOTAL_GAME_SECONDS,
  TIMELINE_LANING_END,
  TIMELINE_DRAKE_WINDOW_END,
  TIMELINE_MIDFIGHT_END,
  TIMELINE_NEXUS_FALL_T,
  FINAL_PUSH_FIGHT_T,
  FINAL_PUSH_FIGHT_HOLD_T,
  TIMELINE_FIRST_BLOOD_MIN_T,
  TIMELINE_FIRST_BLOOD_MAX_T,
  TIMELINE_SOLO_KILL_CHANCE,
  TIMELINE_LANE_FIGHTS_MIN,
  TIMELINE_LANE_FIGHTS_MAX,
  TIMELINE_DRAKE_COUNT_MIN,
  TIMELINE_DRAKE_COUNT_MAX,
  TIMELINE_DRAKE_RESPAWN_MIN_GAP_T,
  TIMELINE_DRAKE_RESULT_DELAY_MIN_T,
  TIMELINE_DRAKE_RESULT_DELAY_MAX_T,
  TIMELINE_MID_FIGHTS_MIN,
  TIMELINE_MID_FIGHTS_MAX,
  TIMELINE_FIGHT_KILLS_MIN,
  TIMELINE_FIGHT_KILLS_MAX,
  TIMELINE_PUSH_KILLS_MIN,
  TIMELINE_PUSH_KILLS_MAX,
  TIMELINE_DOUBLE_CHANCE,
  TIMELINE_TRIPLE_CHANCE,
  TIMELINE_QUADRA_CHANCE,
  TIMELINE_PENTA_CHANCE,
  TIMELINE_MOMENTUM_TEAM_BIAS,
  TIMELINE_KILL_WINPROB_DELTA,
  TIMELINE_DRAKE_WINPROB_DELTA,
  TIMELINE_BARON_WINPROB_DELTA,
  TIMELINE_TURRET_WINPROB_DELTA,
  TIMELINE_INHIB_WINPROB_DELTA,
  TIMELINE_NEXUS_WINPROB_DELTA,
  WINPROB_MIN,
  WINPROB_MAX,
  TIMELINE_CRACK_WINDOW_START_T,
  TIMELINE_CRACK_WINDOW_END_MARGIN_T,
  TIMELINE_EXTRA_TURRETS_MIN,
  TIMELINE_EXTRA_TURRETS_MAX,
  TIMELINE_STRUCTURE_MIN_GAP_T,
  TIMELINE_NEXUS_TURRET_DELAY_MIN_T,
  TIMELINE_NEXUS_TURRET_DELAY_MAX_T,
  TIMELINE_NEXUS_TURRET_END_MARGIN_T,
  STRUCTURE_ATTACKERS_MIN,
  STRUCTURE_ATTACKERS_MAX,
  TIMELINE_OBJECTIVE_PARTICIPANTS_MIN,
  TIMELINE_OBJECTIVE_PARTICIPANTS_MAX,
  TIMELINE_OBJECTIVE_RESULT_DELAY_MIN_T,
  TIMELINE_OBJECTIVE_RESULT_DELAY_MAX_T,
  OBJECTIVE_DRAKE_SPAWN,
  OBJECTIVE_BARON_SPAWN,
  TIMELINE_BARON_SPAWN_JITTER_T,
  LANE_FIGHT_POSITIONS,
  DRAKE_POS,
  BARON_POS,
  MID_CENTER,
  BLUE_NEXUS,
  RED_NEXUS,
  CS_RATE_BY_ROLE,
  DMG_RATE_BY_ROLE,
  HEAL_RATE_BY_ROLE,
  DMG_TAKEN_RATE_BY_ROLE,
  WARDS_PLACED_RATE_BY_ROLE,
  WARDS_KILLED_RATE_BY_ROLE,
  CONTROL_WARDS_RATE_BY_ROLE,
  GOLD_PASSIVE_PER_MIN,
  GOLD_PER_CS,
  GOLD_PER_KILL,
  GOLD_PER_ASSIST,
  MOVE_RESPAWN_WALK_SECONDS,
  CHAMPION_MAX_LEVEL,
  XP_LEVEL_BASE,
  XP_LEVEL_STEP,
  XP_PASSIVE_PER_MIN,
  XP_RATE_BY_ROLE,
  XP_PER_KILL,
  XP_PER_ASSIST,
  XP_DEATH_DOWNTIME_MINUTES,
  XP_NOISE_DAMPING,
  STAT_NOISE_MIN,
  STAT_NOISE_MAX,
  MVP_W_KILL,
  MVP_W_ASSIST,
  MVP_W_DEATH,
  MVP_W_CS_DIV,
  MVP_W_DAMAGE_DIV,
  MVP_W_GOLD_DIV,
  MVP_W_OBJECTIVE,
  JUNGLE_FIRST_BUFF_CLEAR_MIN_T,
  JUNGLE_FIRST_BUFF_CLEAR_MAX_T,
  JUNGLE_SECOND_BUFF_GAP_MIN_T,
  JUNGLE_SECOND_BUFF_GAP_MAX_T,
  JUNGLE_BUFF_RESPAWN_T,
  JUNGLE_BUFF_RECLEAR_GAP_MIN_T,
  JUNGLE_BUFF_RECLEAR_GAP_MAX_T,
  JUNGLE_BUFF_LATE_MARGIN_T,
} from '../config/constants'
import { JUNGLE_BUFF_CAMPS } from '../config/battleRoutes'

/** mulberry32 — small, fast, deterministic PRNG */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const BATTLE_ROLES: BattleRole[] = ['top', 'jungle', 'mid', 'adc', 'support']

const LANES: Array<'top' | 'mid' | 'bot'> = ['top', 'mid', 'bot']
// Which champion indexes (role order above) plausibly show up at a lane skirmish
const LANE_FIGHTERS: Record<'top' | 'mid' | 'bot', number[]> = {
  top: [0, 1],
  mid: [1, 2],
  bot: [1, 3, 4],
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

interface GenContext {
  rng: () => number
  events: BattleEvent[]
  momentum: number
  firstBloodDone: boolean
  fromT: number
  /** Structures already down — evolves with emitted falls (post-cut only, see emitStructureFall). */
  destroyed: Set<StructureId>
}

function clampMomentum(m: number): number {
  return Math.max(-1, Math.min(1, m))
}

function pickTeam(ctx: GenContext): 1 | 2 {
  const p = 0.5 + ctx.momentum * TIMELINE_MOMENTUM_TEAM_BIAS
  return ctx.rng() < p ? 1 : 2
}

function pushEvent(ctx: GenContext, ev: BattleEvent) {
  if (ev.t < ctx.fromT) return
  ctx.events.push(ev)
  ctx.momentum = clampMomentum(ctx.momentum + ev.winProbDelta * 2)
}

/**
 * Mirror of the store's win-probability replay (_shiftWinProbability): apply
 * each event's delta in time order with per-step clamping, up to (exclusive)
 * `untilT`. This is the exact value the UI momentum bar shows at that time.
 */
export function replayWinProbability(events: BattleEvent[], startProb: number, untilT: number): number {
  let prob = startProb
  for (const e of [...events].sort((a, b) => a.t - b.t)) {
    if (e.t >= untilT) break
    if (e.winProbDelta === 0) continue
    prob = Math.max(WINPROB_MIN, Math.min(WINPROB_MAX, prob + e.winProbDelta))
  }
  return prob
}

function killDelta(team: 1 | 2): number {
  return team === 1 ? TIMELINE_KILL_WINPROB_DELTA : -TIMELINE_KILL_WINPROB_DELTA
}

/**
 * Emit a skirmish: fightStart, `killCount` kills spaced a few game-seconds apart,
 * fightEnd. Consecutive kills by the same killer escalate the multikill tier.
 */
function emitFight(
  ctx: GenContext,
  tStart: number,
  location: { x: number; y: number },
  killCount: number,
  opts: {
    lane?: 'top' | 'mid' | 'bot'
    attackerPool?: number[]
    biasTeam?: 1 | 2
    allowFirstBlood?: boolean
  } = {},
) {
  const participants = {
    t1: opts.attackerPool ?? [0, 1, 2, 3, 4],
    t2: opts.attackerPool ?? [0, 1, 2, 3, 4],
  }
  pushEvent(ctx, { t: tStart, type: 'fightStart', location, lane: opts.lane, participants, winProbDelta: 0 })

  let t = tStart + randInt(ctx.rng, 2, 6)
  let lastKiller: { team: 1 | 2; idx: number; tier: number } | null = null
  const tierChances = [TIMELINE_DOUBLE_CHANCE, TIMELINE_TRIPLE_CHANCE, TIMELINE_QUADRA_CHANCE, TIMELINE_PENTA_CHANCE]

  for (let i = 0; i < killCount; i++) {
    let team = opts.biasTeam && ctx.rng() < 0.65 ? opts.biasTeam : pickTeam(ctx)
    let killerIdx = pick(ctx.rng, participants[team === 1 ? 't1' : 't2'])

    // multikill escalation: same killer strikes again shortly after
    if (
      lastKiller &&
      lastKiller.tier < 5 &&
      ctx.rng() < tierChances[Math.min(lastKiller.tier - 1, tierChances.length - 1)]
    ) {
      team = lastKiller.team
      killerIdx = lastKiller.idx
      lastKiller = { ...lastKiller, tier: lastKiller.tier + 1 }
    } else {
      lastKiller = { team, idx: killerIdx, tier: 1 }
    }

    const victimPool = participants[team === 1 ? 't2' : 't1']
    const victimIdx = pick(ctx.rng, victimPool)
    const others = participants[team === 1 ? 't1' : 't2'].filter((c) => c !== killerIdx)
    const isSolo = ctx.rng() < TIMELINE_SOLO_KILL_CHANCE
    const assistIdxs = isSolo ? [] : others.slice(0, randInt(ctx.rng, 1, Math.min(2, others.length)))
    const firstBlood = opts.allowFirstBlood === true && !ctx.firstBloodDone
    if (firstBlood) ctx.firstBloodDone = true

    pushEvent(ctx, {
      t,
      type: 'kill',
      team,
      killerIdx,
      victimIdx,
      assistIdxs,
      multikillTier: lastKiller.tier >= 2 ? (Math.min(lastKiller.tier, 5) as 2 | 3 | 4 | 5) : undefined,
      firstBlood: firstBlood || undefined,
      soloKill: isSolo || undefined,
      location,
      lane: opts.lane,
      winProbDelta: killDelta(team),
    })
    t += randInt(ctx.rng, 3, 9)
  }
  pushEvent(ctx, { t, type: 'fightEnd', location, lane: opts.lane, winProbDelta: 0 })
}

/**
 * Emit one structure fall for `attackerTeam`. `lane` targets the enemy lane
 * chain (outer → inner → inhib turret → inhibitor); `'nexus'` targets the next
 * nexus turret, gated on at least one enemy inhibitor being down. Returns false
 * when nothing is standing / the gate is closed — the caller just skips.
 *
 * Reseed rule: `ctx.destroyed` is only mutated for events at/after `ctx.fromT`.
 * Pre-cut events are discarded by pushEvent anyway; skipping the mutation means
 * the post-cut generator sees exactly the pre-seeded world state, so structures
 * can never double-fall across a reseed cut.
 */
function emitStructureFall(
  ctx: GenContext,
  t: number,
  attackerTeam: 1 | 2,
  lane: 'top' | 'mid' | 'bot' | 'nexus',
): boolean {
  const ownerTeam = (3 - attackerTeam) as 1 | 2
  const id =
    lane === 'nexus'
      ? canFallNexusTurret(ctx.destroyed, ownerTeam)
        ? nextNexusTurret(ctx.destroyed, ownerTeam)
        : null
      : nextStructureInLane(ctx.destroyed, ownerTeam, lane)
  if (!id) return false

  const tier = parseStructureId(id).tier
  // dead champions can't take structures — exclude anyone still on the respawn walk at t
  const walkingBack = new Set<number>()
  for (const ev of ctx.events) {
    if (ev.type !== 'kill' || ev.team === attackerTeam || ev.victimIdx === undefined) continue
    if (ev.t <= t && t < ev.t + MOVE_RESPAWN_WALK_SECONDS) walkingBack.add(ev.victimIdx)
  }
  const basePool = lane === 'nexus' ? [0, 1, 2, 3, 4] : LANE_FIGHTERS[lane]
  const alivePool = basePool.filter((idx) => !walkingBack.has(idx))
  // when the whole lane pool is dead, any living teammate takes the structure
  const aliveTeam = [0, 1, 2, 3, 4].filter((idx) => !walkingBack.has(idx))
  const pool = alivePool.length > 0 ? [...alivePool] : aliveTeam.length > 0 ? aliveTeam : [...basePool]
  const count = randInt(ctx.rng, STRUCTURE_ATTACKERS_MIN, Math.min(STRUCTURE_ATTACKERS_MAX, pool.length))
  const attackers: number[] = []
  while (attackers.length < count && pool.length > 0) {
    attackers.push(pool.splice(Math.floor(ctx.rng() * pool.length), 1)[0])
  }
  attackers.sort((a, b) => a - b)
  const killerIdx = pick(ctx.rng, attackers)

  const delta = tier === 'inhibitor' ? TIMELINE_INHIB_WINPROB_DELTA : TIMELINE_TURRET_WINPROB_DELTA
  pushEvent(ctx, {
    t,
    type: tier === 'inhibitor' ? 'inhibitor' : 'turret',
    team: attackerTeam,
    killerIdx,
    location: STRUCTURE_POSITIONS[id],
    lane: lane === 'nexus' ? undefined : lane,
    participants: attackerTeam === 1 ? { t1: attackers, t2: [] } : { t1: [], t2: attackers },
    structureId: id,
    structureTier: tier,
    winProbDelta: attackerTeam === 1 ? delta : -delta,
  })
  if (t >= ctx.fromT) ctx.destroyed.add(id)
  return true
}

function pickParticipants(ctx: GenContext): { t1: number[]; t2: number[] } {
  const pickSide = () => {
    const count = randInt(ctx.rng, TIMELINE_OBJECTIVE_PARTICIPANTS_MIN, TIMELINE_OBJECTIVE_PARTICIPANTS_MAX)
    const all = [0, 1, 2, 3, 4]
    const out: number[] = []
    while (out.length < count && all.length > 0) {
      out.push(all.splice(Math.floor(ctx.rng() * all.length), 1)[0])
    }
    return out.sort((a, b) => a - b)
  }
  return { t1: pickSide(), t2: pickSide() }
}

function emitObjective(
  ctx: GenContext,
  tSpawn: number,
  objective: 'drake' | 'baron',
  forcedTeam?: 1 | 2,
  forcedParticipants?: { t1: number[]; t2: number[] },
  drakeType?: DrakeTypeId,
  resultDelayT?: number,
) {
  const location = objective === 'drake' ? DRAKE_POS : BARON_POS
  const participants = forcedParticipants ?? pickParticipants(ctx)
  pushEvent(ctx, { t: tSpawn, type: 'objectiveSpawn', objective, drakeType, location, participants, winProbDelta: 0 })

  // small scrap around the pit
  if (ctx.rng() < 0.6) {
    emitFight(ctx, tSpawn + randInt(ctx.rng, 8, 25), location, randInt(ctx.rng, 1, 2))
  }

  const winnerTeam = forcedTeam ?? pickTeam(ctx)
  const delta = objective === 'drake' ? TIMELINE_DRAKE_WINPROB_DELTA : TIMELINE_BARON_WINPROB_DELTA
  pushEvent(ctx, {
    t:
      tSpawn +
      (resultDelayT ??
        randInt(ctx.rng, TIMELINE_OBJECTIVE_RESULT_DELAY_MIN_T, TIMELINE_OBJECTIVE_RESULT_DELAY_MAX_T)),
    type: 'objectiveResult',
    objective,
    drakeType,
    team: winnerTeam,
    location,
    participants,
    winProbDelta: winnerTeam === 1 ? delta : -delta,
  })
  return winnerTeam
}

/** Drake-chain overrides for a reseeded tail — keeps the battle's predetermined chain intact. */
export interface DrakeGenOptions {
  /** Exact number of drakes to generate (reseed: the planned drakes still ahead of the cut) */
  forcedCount?: number
  /** Basic types already spawned before the cut — never drawn again */
  excludeTypes?: DrakeTypeId[]
  /** Whether the final generated drake is the Elder Dragon (false once the elder already spawned before the cut) */
  allowElder?: boolean
}

/**
 * Generate the full deterministic battle script from a seed.
 * `fromT` > 0 regenerates only events at/after that game-second (objective
 * override re-seed); earlier phases still advance the RNG identically cheaply
 * by being generated and discarded via the fromT filter in pushEvent.
 * `baselineProb` is the probability the UI momentum bar is measured against
 * (the battle-start probability) — the winner is read off that displayed metric.
 * `forceWinner` overrides the momentum decision — used by the reseed merge when
 * its filter drops delta-carrying events and the displayed leader flips.
 */
export function generateTimeline(
  seed: number,
  initialWinProb: number,
  fromT = 0,
  preDestroyed: ReadonlySet<StructureId> = new Set(),
  baselineProb = initialWinProb,
  forceWinner?: 1 | 2,
  drakeOpts?: DrakeGenOptions,
): BattleTimeline {
  const rng = createRng(seed)
  const ctx: GenContext = {
    rng,
    events: [],
    momentum: clampMomentum((initialWinProb - 0.5) * 2),
    firstBloodDone: fromT > TIMELINE_FIRST_BLOOD_MAX_T,
    fromT,
    destroyed: new Set(preDestroyed),
  }

  // ── Jungle buff route (opening) — each jungler starts on a random buff
  // (blue or red), has a gank window in between (the early lane fights below
  // already include the junglers), then clears the other buff. The first two
  // buffs of each team ALWAYS go to the jungler; re-clears after the respawn
  // are generated later (after the fights) so any living champion can take them ──
  const buffPlan: Record<1 | 2, { lastClear: Record<'blue' | 'red', number>; nextBuff: 'blue' | 'red' }> = {
    1: { lastClear: { blue: 0, red: 0 }, nextBuff: 'blue' },
    2: { lastClear: { blue: 0, red: 0 }, nextBuff: 'blue' },
  }
  for (const team of [1, 2] as const) {
    const startBuff: 'blue' | 'red' = rng() < 0.5 ? 'blue' : 'red'
    const secondBuff: 'blue' | 'red' = startBuff === 'blue' ? 'red' : 'blue'
    const firstClearT = randInt(rng, JUNGLE_FIRST_BUFF_CLEAR_MIN_T, JUNGLE_FIRST_BUFF_CLEAR_MAX_T)
    const secondClearT =
      firstClearT + randInt(rng, JUNGLE_SECOND_BUFF_GAP_MIN_T, JUNGLE_SECOND_BUFF_GAP_MAX_T)
    pushEvent(ctx, {
      t: firstClearT,
      type: 'buff',
      team,
      buffType: startBuff,
      killerIdx: 1,
      location: JUNGLE_BUFF_CAMPS[team][startBuff],
      winProbDelta: 0,
    })
    pushEvent(ctx, {
      t: secondClearT,
      type: 'buff',
      team,
      buffType: secondBuff,
      killerIdx: 1,
      location: JUNGLE_BUFF_CAMPS[team][secondBuff],
      winProbDelta: 0,
    })
    buffPlan[team] = {
      lastClear: {
        blue: startBuff === 'blue' ? firstClearT : secondClearT,
        red: startBuff === 'red' ? firstClearT : secondClearT,
      },
      nextBuff: startBuff,
    }
  }

  // ── Laning (0–TIMELINE_LANING_END) ──
  const firstBloodT = randInt(rng, TIMELINE_FIRST_BLOOD_MIN_T, TIMELINE_FIRST_BLOOD_MAX_T)
  const fbLane = pick(rng, LANES)
  emitFight(ctx, firstBloodT, LANE_FIGHT_POSITIONS[fbLane], 1, {
    lane: fbLane,
    attackerPool: LANE_FIGHTERS[fbLane],
    allowFirstBlood: true,
  })
  const laneFights = randInt(rng, TIMELINE_LANE_FIGHTS_MIN, TIMELINE_LANE_FIGHTS_MAX)
  for (let i = 0; i < laneFights; i++) {
    const lane = pick(rng, LANES)
    const t = randInt(rng, TIMELINE_FIRST_BLOOD_MAX_T + 40, TIMELINE_LANING_END - 40)
    emitFight(ctx, t, LANE_FIGHT_POSITIONS[lane], randInt(rng, 1, 2), {
      lane,
      attackerPool: LANE_FIGHTERS[lane],
    })
  }

  // ── Drake chain — 2-4 drakes back to back; each one's scripted result lands
  // before the next spawn, so at most one drake is ever up. Basic types are
  // drawn without replacement per battle; the FINAL drake is always the Elder
  // Dragon. A reseed forces the remaining planned count and excludes types that
  // already spawned before the cut, keeping the predetermined chain intact. ──
  const drakeCount =
    drakeOpts?.forcedCount ?? randInt(rng, TIMELINE_DRAKE_COUNT_MIN, TIMELINE_DRAKE_COUNT_MAX)
  const allowElder = drakeOpts?.allowElder ?? drakeCount >= 2
  const excludedTypes = drakeOpts?.excludeTypes ?? []
  const drakeTypePool = BASIC_DRAKE_TYPES.filter((ty) => !excludedTypes.includes(ty))
  const chainStart = Math.max(
    OBJECTIVE_DRAKE_SPAWN,
    TIMELINE_LANING_END,
    fromT > 0 ? fromT + TIMELINE_DRAKE_RESPAWN_MIN_GAP_T : 0,
  )
  if (drakeCount > 0 && TIMELINE_DRAKE_WINDOW_END > chainStart) {
    const slot = (TIMELINE_DRAKE_WINDOW_END - chainStart) / drakeCount
    for (let i = 0; i < drakeCount; i++) {
      const base = chainStart + slot * i
      const tSpawn = Math.floor(base + rng() * Math.max(1, slot * 0.15))
      const isElder = allowElder && i === drakeCount - 1
      const drakeType: DrakeTypeId =
        isElder || drakeTypePool.length === 0
          ? 'elder'
          : drakeTypePool.splice(Math.floor(rng() * drakeTypePool.length), 1)[0]
      // the result must land inside this drake's slot AND leave ≥90 game-s of
      // quiet before the next spawn, so even a 4-drake chain never feels back-to-back
      const resultDelay = Math.min(
        randInt(rng, TIMELINE_DRAKE_RESULT_DELAY_MIN_T, TIMELINE_DRAKE_RESULT_DELAY_MAX_T),
        Math.max(60, Math.floor(slot * 0.85) - 90),
      )
      emitObjective(ctx, tSpawn, 'drake', undefined, undefined, drakeType, resultDelay)
    }
  }

  // ── Mid fights — interleaved with the drake chain, filling the air between spawns ──
  const midFights = randInt(rng, TIMELINE_MID_FIGHTS_MIN, TIMELINE_MID_FIGHTS_MAX)
  for (let i = 0; i < midFights; i++) {
    const t = randInt(rng, TIMELINE_LANING_END + 200, TIMELINE_MIDFIGHT_END - 60)
    emitFight(ctx, t, MID_CENTER, randInt(rng, TIMELINE_FIGHT_KILLS_MIN, TIMELINE_FIGHT_KILLS_MAX))
  }

  // ── Jungle buff re-clears — buffs respawn 5:00 after their clear. Unlike the
  // scripted jungler opening, ANY champion of the team may take a respawned
  // buff — but only one who is actually alive (not on the respawn walk) at that
  // moment. With nobody alive to take it, the camp simply stays up and the
  // attempt shifts back. Generated after the fights so deaths are known. ──
  const aliveTeamAt = (team: 1 | 2, t: number): number[] => {
    const walkingBack = new Set<number>()
    for (const ev of ctx.events) {
      if (ev.type !== 'kill' || ev.team === team || ev.victimIdx === undefined) continue
      if (ev.t <= t && t < ev.t + MOVE_RESPAWN_WALK_SECONDS) walkingBack.add(ev.victimIdx)
    }
    return [0, 1, 2, 3, 4].filter((idx) => !walkingBack.has(idx))
  }
  for (const team of [1, 2] as const) {
    const plan = buffPlan[team]
    let guard = 0
    while (guard++ < 60) {
      const nextBuff = plan.nextBuff
      const tClear =
        plan.lastClear[nextBuff] +
        JUNGLE_BUFF_RESPAWN_T +
        randInt(rng, JUNGLE_BUFF_RECLEAR_GAP_MIN_T, JUNGLE_BUFF_RECLEAR_GAP_MAX_T)
      if (tClear > TIMELINE_NEXUS_FALL_T - JUNGLE_BUFF_LATE_MARGIN_T) break
      const alive = aliveTeamAt(team, tClear)
      if (alive.length === 0) {
        // nobody there to kill the camp — it stays up, try again later
        plan.lastClear[nextBuff] = tClear
        continue
      }
      const killerIdx = pick(rng, alive)
      pushEvent(ctx, {
        t: tClear,
        type: 'buff',
        team,
        buffType: nextBuff,
        killerIdx,
        location: JUNGLE_BUFF_CAMPS[team][nextBuff],
        winProbDelta: 0,
      })
      plan.lastClear[nextBuff] = tClear
      plan.nextBuff = nextBuff === 'blue' ? 'red' : 'blue'
    }
  }

  // ── Crack phase — each team fully cracks one random enemy lane before baron;
  // other enemy lanes only lose 1-2 turrets (never an inhibitor). Falls from
  // both teams are interleaved back and forth in ascending time order.
  // Generated AFTER all pre-baron fights so emitStructureFall can exclude
  // attackers that are on the respawn walk when the structure falls.
  const crackLaneVsOwner: Record<1 | 2, 'top' | 'mid' | 'bot'> = {
    1: pick(rng, LANES), // lane the red team cracks at the blue owner
    2: pick(rng, LANES), // lane the blue team cracks at the red owner
  }
  // reseed consistency: stick with whatever lane already has the most progress
  for (const owner of [1, 2] as const) {
    const alreadyCracked = crackedLaneOf(ctx.destroyed, owner)
    if (alreadyCracked) {
      crackLaneVsOwner[owner] = alreadyCracked
      continue
    }
    let best = crackLaneVsOwner[owner]
    let bestProgress = laneProgress(ctx.destroyed, owner, best)
    for (const lane of LANES) {
      const p = laneProgress(ctx.destroyed, owner, lane)
      if (p > bestProgress) {
        best = lane
        bestProgress = p
      }
    }
    crackLaneVsOwner[owner] = best
  }

  interface PlannedFall {
    team: 1 | 2
    lane: 'top' | 'mid' | 'bot'
  }
  const buildFallSequence = (team: 1 | 2): PlannedFall[] => {
    const owner = (3 - team) as 1 | 2
    const crackLane = crackLaneVsOwner[owner]
    const seq: PlannedFall[] = []
    const chainRemaining = LANE_TIER_ORDER.length - laneProgress(ctx.destroyed, owner, crackLane)
    for (let i = 0; i < chainRemaining; i++) seq.push({ team, lane: crackLane })
    const extras = randInt(rng, TIMELINE_EXTRA_TURRETS_MIN, TIMELINE_EXTRA_TURRETS_MAX)
    const otherLanes = LANES.filter((l) => l !== crackLane)
    for (let i = 0; i < extras; i++) {
      seq.splice(randInt(rng, 0, seq.length), 0, { team, lane: pick(rng, otherLanes) })
    }
    return seq
  }
  const fallQueues: Record<1 | 2, PlannedFall[]> = { 1: buildFallSequence(1), 2: buildFallSequence(2) }
  const totalFalls = fallQueues[1].length + fallQueues[2].length
  const crackStart = Math.max(TIMELINE_CRACK_WINDOW_START_T, fromT + TIMELINE_STRUCTURE_MIN_GAP_T)
  const crackEnd = OBJECTIVE_BARON_SPAWN - TIMELINE_CRACK_WINDOW_END_MARGIN_T
  if (totalFalls > 0 && crackEnd > crackStart) {
    const slot = (crackEnd - crackStart) / totalFalls
    let tCursor = crackStart - TIMELINE_STRUCTURE_MIN_GAP_T
    for (let i = 0; i < totalFalls; i++) {
      const base = crackStart + slot * i
      const t = Math.min(
        crackEnd,
        Math.max(
          tCursor + TIMELINE_STRUCTURE_MIN_GAP_T,
          Math.floor(base + rng() * Math.max(1, slot - TIMELINE_STRUCTURE_MIN_GAP_T)),
        ),
      )
      // back and forth: draw the next fall from a random non-empty side
      const takeFrom: 1 | 2 =
        fallQueues[1].length === 0 ? 2 : fallQueues[2].length === 0 ? 1 : ctx.rng() < 0.5 ? 1 : 2
      const fall = fallQueues[takeFrom].shift()!
      tCursor = t
      // extras never take an inhibitor outside the crack lane
      const owner = (3 - fall.team) as 1 | 2
      if (fall.lane !== crackLaneVsOwner[owner]) {
        const target = nextStructureInLane(ctx.destroyed, owner, fall.lane)
        if (target && parseStructureId(target).tier === 'inhibitor') continue
      }
      emitStructureFall(ctx, t, fall.team, fall.lane)
    }
  }

  // ── Baron — both teams have cracked a lane; all ten champions meet at the pit ──
  const baronSpawnT = OBJECTIVE_BARON_SPAWN + randInt(rng, 0, TIMELINE_BARON_SPAWN_JITTER_T)
  emitObjective(ctx, baronSpawnT, 'baron', undefined, {
    t1: [0, 1, 2, 3, 4],
    t2: [0, 1, 2, 3, 4],
  })

  // ── Winner decision: WYSIWYG — the team whose displayed win chance (the
  // momentum bar: baseline-relative, t-ordered clamped delta replay, exactly
  // like the store) leads at the final push reveal wins; rng only breaks a
  // dead-even 50/50 ──
  const decisionProb = replayWinProbability(ctx.events, initialWinProb, FINAL_PUSH_FIGHT_T)
  const displayedMomentum = 0.5 + (decisionProb - baselineProb)
  const winner: 1 | 2 =
    forceWinner ?? (displayedMomentum > 0.5 ? 1 : displayedMomentum < 0.5 ? 2 : rng() < 0.5 ? 1 : 2)

  // ── Final push / end phase — at 50:00 the winner marches the cracked lane,
  // the loser digs in at its fallen inhibitor, and the last fight happens there ──
  const pushKills = randInt(rng, TIMELINE_PUSH_KILLS_MIN, TIMELINE_PUSH_KILLS_MAX)
  const loserNexus = winner === 1 ? RED_NEXUS : BLUE_NEXUS
  const loser = (3 - winner) as 1 | 2
  // the lane whose loser inhibitor is down — a very late reseed can leave the
  // crack unfinished (falls before the cut window are gone); degrade to random
  const pushLane = crackedLaneOf(ctx.destroyed, loser) ?? pick(rng, LANES)
  const defensePoint = STRUCTURE_POSITIONS[structureId(loser, pushLane, 'inhibitor')]
  emitFight(ctx, randInt(rng, FINAL_PUSH_FIGHT_T, FINAL_PUSH_FIGHT_T + 40), defensePoint, pushKills, {
    lane: pushLane,
    biasTeam: winner,
  })

  // ── Nexus turrets — fall after the defense fight breaks, gated on the inhibitor ──
  let tNex = FINAL_PUSH_FIGHT_T + FINAL_PUSH_FIGHT_HOLD_T
  for (let i = 0; i < 2; i++) {
    tNex = Math.min(
      tNex + randInt(rng, TIMELINE_NEXUS_TURRET_DELAY_MIN_T, TIMELINE_NEXUS_TURRET_DELAY_MAX_T),
      TIMELINE_NEXUS_FALL_T -
        TIMELINE_NEXUS_TURRET_END_MARGIN_T -
        (1 - i) * TIMELINE_STRUCTURE_MIN_GAP_T,
    )
    emitStructureFall(ctx, tNex, winner, 'nexus')
  }

  pushEvent(ctx, {
    t: TIMELINE_NEXUS_FALL_T,
    type: 'nexus',
    team: winner,
    location: loserNexus,
    // slam the momentum bar to its end on the nexus explosion
    winProbDelta: winner === 1 ? TIMELINE_NEXUS_WINPROB_DELTA : -TIMELINE_NEXUS_WINPROB_DELTA,
  })

  ctx.events.sort((a, b) => a.t - b.t)
  return { seed, winner, events: ctx.events }
}

/**
 * Merge filter for a regenerated tail. Objectives already spawned before the
 * cut must not respawn: baron happens once per battle; drakes keep the battle's
 * planned chain length and a minimum respawn gap so a just-fought drake can't
 * reappear moments later. Regenerated objectiveResults whose spawn happened
 * before the cut are dropped — that objective was already resolved live
 * (orphan results would double-count).
 */
function filterRegeneratedTail(
  currentEvents: BattleEvent[],
  t: number,
  regeneratedEvents: BattleEvent[],
  preDestroyed: ReadonlySet<StructureId>,
): BattleEvent[] {
  const baronAlreadySpawned = currentEvents.some(
    (e) => e.type === 'objectiveSpawn' && e.objective === 'baron' && e.t <= t,
  )
  // the chain length was predetermined for this battle — the reseed keeps it
  const plannedDrakeTotal = currentEvents.filter(
    (e) => e.type === 'objectiveSpawn' && e.objective === 'drake',
  ).length
  const preDrakeSpawns = currentEvents.filter(
    (e) => e.type === 'objectiveSpawn' && e.objective === 'drake' && e.t <= t,
  )
  let drakeCount = preDrakeSpawns.length
  let lastDrakeSpawnT = drakeCount > 0 ? preDrakeSpawns[preDrakeSpawns.length - 1].t : -Infinity
  const spawnedAfterCut = new Set<string>()
  return regeneratedEvents.filter((e) => {
    if (e.type === 'objectiveSpawn' && e.objective) {
      if (e.objective === 'baron') {
        if (baronAlreadySpawned) return false
      } else {
        if (
          drakeCount >= plannedDrakeTotal ||
          e.t < lastDrakeSpawnT + TIMELINE_DRAKE_RESPAWN_MIN_GAP_T
        ) {
          return false
        }
        drakeCount++
        lastDrakeSpawnT = e.t
      }
      spawnedAfterCut.add(`${e.objective}:${e.t}`)
      return true
    }
    if (e.type === 'objectiveResult' && e.objective) {
      const hasSpawn = [...spawnedAfterCut].some((key) => {
        const [obj, ts] = key.split(':')
        return obj === e.objective && Number(ts) < e.t
      })
      return hasSpawn
    }
    // insurance: a regenerated fall of an already-destroyed structure never survives the merge
    if (e.structureId && preDestroyed.has(e.structureId)) return false
    return true
  })
}

/**
 * Re-seed the remaining battle after the player wins an objective click event:
 * keeps all events up to `t` from the current timeline and regenerates the rest
 * with a boosted win probability, so the outcome can genuinely flip.
 */
export function reseedTimelineFrom(
  current: BattleTimeline,
  t: number,
  newSeed: number,
  boostedWinProb: number,
  baselineProb = boostedWinProb,
): BattleTimeline {
  // Structures already down at the cut stay down: the regenerated tail starts
  // from this world state, so nothing double-falls or skips its lane order.
  const preDestroyed = destroyedStructuresUpTo(current.events, t)
  // The drake chain is predetermined per battle: the tail regenerates exactly
  // the drakes still ahead of the cut, never re-drawing an already-spawned type.
  const allDrakeSpawns = current.events.filter(
    (e) => e.type === 'objectiveSpawn' && e.objective === 'drake',
  )
  const preDrakeSpawns = allDrakeSpawns.filter((e) => e.t <= t)
  const preDrakeTypes = preDrakeSpawns
    .map((e) => e.drakeType)
    .filter((ty): ty is DrakeTypeId => ty !== undefined)
  const drakeOpts: DrakeGenOptions = {
    forcedCount: Math.max(0, allDrakeSpawns.length - preDrakeSpawns.length),
    excludeTypes: preDrakeTypes,
    allowElder: allDrakeSpawns.length >= 2 && !preDrakeTypes.includes('elder'),
  }
  const regenerated = generateTimeline(
    newSeed,
    boostedWinProb,
    t + 1,
    preDestroyed,
    baselineProb,
    undefined,
    drakeOpts,
  )
  let futureEvents = filterRegeneratedTail(current.events, t, regenerated.events, preDestroyed)
  let winner = regenerated.winner
  // WYSIWYG guard: the merge filter may have dropped delta-carrying events the
  // generator's decision already counted (e.g. an orphan baron result). Re-read
  // the displayed momentum off the MERGED tail — the store replays exactly this
  // set — and if the leader flipped, regenerate the tail with the winner forced.
  // Pre-decision events are seed-identical across passes and all winner-shaped
  // events sit at/after FINAL_PUSH_FIGHT_T, so one forced pass converges.
  const mergedProb = replayWinProbability(futureEvents, boostedWinProb, FINAL_PUSH_FIGHT_T)
  const displayed = 0.5 + (mergedProb - baselineProb)
  const desired: 1 | 2 | null = displayed > 0.5 ? 1 : displayed < 0.5 ? 2 : null
  if (desired !== null && desired !== winner) {
    const forced = generateTimeline(newSeed, boostedWinProb, t + 1, preDestroyed, baselineProb, desired, drakeOpts)
    futureEvents = filterRegeneratedTail(current.events, t, forced.events, preDestroyed)
    winner = desired
  }
  return {
    seed: current.seed,
    winner,
    events: [...current.events.filter((e) => e.t <= t), ...futureEvents].sort((a, b) => a.t - b.t),
  }
}

/** Deterministic per-champion stat-rate noise multiplier derived from the battle seed. */
export function championNoise(seed: number, team: 1 | 2, idx: number): number {
  const r = createRng((seed ^ (team * 0x9e3779b9) ^ (idx * 0x85ebca6b)) >>> 0)()
  return STAT_NOISE_MIN + r * (STAT_NOISE_MAX - STAT_NOISE_MIN)
}

export interface ContinuousStats {
  cs: number
  goldPassive: number
  damage: number
  healing: number
  damageTaken: number
  wardsPlaced: number
  wardsKilled: number
  controlWards: number
  level: number
  items: number
}

/** Kill/assist/death tallies feeding the XP model — deaths cost farm downtime. */
export interface CombatTally {
  kills: number
  assists: number
  deaths: number
}

/** Level reached with `xp` total XP on the LoL curve (280, 380, … 1880 per level-up). */
export function levelFromXp(xp: number): number {
  let level = 1
  let cost = XP_LEVEL_BASE + XP_LEVEL_STEP
  let remaining = xp
  while (level < CHAMPION_MAX_LEVEL && remaining >= cost) {
    remaining -= cost
    level++
    cost += XP_LEVEL_STEP
  }
  return level
}

/**
 * Per-champion XP at `gameTime`: a universal passive tick income every living
 * champion earns identically (LoL-style ambient XP), role-based farm/lane XP
 * on top (mildly scaled by the champion's seed noise), plus kill/assist XP
 * from the timeline, minus everything missed during each death's respawn
 * downtime. Pure and re-derivable — replaying the same events at the same
 * time always yields the same XP.
 */
export function championXpAt(
  role: BattleRole,
  noise: number,
  gameTime: number,
  combat: CombatTally,
): number {
  const xpNoise = 1 + (noise - 1) * XP_NOISE_DAMPING
  const aliveMinutes = Math.max(
    0,
    gameTime / 60 - combat.deaths * XP_DEATH_DOWNTIME_MINUTES,
  )
  return Math.floor(
    XP_PASSIVE_PER_MIN * aliveMinutes +
      XP_RATE_BY_ROLE[role] * aliveMinutes * xpNoise +
      combat.kills * XP_PER_KILL +
      combat.assists * XP_PER_ASSIST,
  )
}

/**
 * Closed-form continuous stats as a pure function of game-time (kills/gold
 * bounties come from events). When `combat` is given, the level derives from
 * the champion's individual XP (role rate, kills, assists, death downtime) —
 * without it, only passive XP counts.
 */
export function continuousStatsAt(
  role: BattleRole,
  noise: number,
  gameTime: number,
  combat: CombatTally = { kills: 0, assists: 0, deaths: 0 },
): ContinuousStats {
  const minutes = gameTime / 60
  const level = levelFromXp(championXpAt(role, noise, gameTime, combat))
  return {
    cs: Math.floor(CS_RATE_BY_ROLE[role] * minutes * noise),
    goldPassive: Math.floor(GOLD_PASSIVE_PER_MIN * minutes),
    damage: Math.floor(DMG_RATE_BY_ROLE[role] * minutes * noise),
    healing: Math.floor(HEAL_RATE_BY_ROLE[role] * minutes * noise),
    damageTaken: Math.floor(DMG_TAKEN_RATE_BY_ROLE[role] * minutes * noise),
    wardsPlaced: Math.floor(WARDS_PLACED_RATE_BY_ROLE[role] * minutes),
    wardsKilled: Math.floor(WARDS_KILLED_RATE_BY_ROLE[role] * minutes),
    controlWards: Math.floor(CONTROL_WARDS_RATE_BY_ROLE[role] * minutes),
    level,
    items: Math.min(6, Math.floor(level / 3)),
  }
}

/** Gold earned from kills/assists/CS on top of passive income. */
export function bountyGold(kills: number, assists: number, cs: number): number {
  return kills * GOLD_PER_KILL + assists * GOLD_PER_ASSIST + cs * GOLD_PER_CS
}

/** MVP score across both teams; higher is better. */
export function mvpScore(champ: ChampionState, objectiveParticipations = 0): number {
  return (
    champ.kills * MVP_W_KILL +
    champ.assists * MVP_W_ASSIST +
    champ.deaths * MVP_W_DEATH +
    champ.cs / MVP_W_CS_DIV +
    champ.damage / MVP_W_DAMAGE_DIV +
    champ.gold / MVP_W_GOLD_DIV +
    objectiveParticipations * MVP_W_OBJECTIVE
  )
}

/** Total game length guard exported for consumers that need the end-of-game constant. */
export const TIMELINE_GAME_END = BATTLE_TOTAL_GAME_SECONDS
