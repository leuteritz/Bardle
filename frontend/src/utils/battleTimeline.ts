import type { BattleEvent, BattleRole, BattleTimeline, ChampionState, StructureId } from '../types'
import {
  STRUCTURE_POSITIONS,
  nextStructureInLane,
  nextNexusTurret,
  canFallNexusTurret,
  parseStructureId,
  destroyedStructuresUpTo,
} from './battleStructures'
import {
  BATTLE_TOTAL_GAME_SECONDS,
  TIMELINE_LANING_END,
  TIMELINE_DRAKE_WINDOW_END,
  TIMELINE_MIDFIGHT_END,
  TIMELINE_BARON_END,
  TIMELINE_NEXUS_FALL_T,
  TIMELINE_FIRST_BLOOD_MIN_T,
  TIMELINE_FIRST_BLOOD_MAX_T,
  TIMELINE_SOLO_KILL_CHANCE,
  TIMELINE_LANE_FIGHTS_MIN,
  TIMELINE_LANE_FIGHTS_MAX,
  TIMELINE_DRAKE_COUNT_MIN,
  TIMELINE_DRAKE_COUNT_MAX,
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
  TIMELINE_FIRST_TURRET_MIN_T,
  TIMELINE_FIRST_TURRET_MAX_T,
  TIMELINE_MIDGAME_STRUCTURES_MIN,
  TIMELINE_MIDGAME_STRUCTURES_MAX,
  TIMELINE_MIDGAME_STRUCTURES_START_PAD_T,
  TIMELINE_LOSER_STRUCTURES_MAX,
  TIMELINE_PUSH_EXTRA_STRUCTURES_MIN,
  TIMELINE_PUSH_EXTRA_STRUCTURES_MAX,
  TIMELINE_STRUCTURE_MIN_GAP_T,
  TIMELINE_PUSH_CHAIN_END_MARGIN_T,
  TIMELINE_NEXUS_TURRET_DELAY_MIN_T,
  TIMELINE_NEXUS_TURRET_DELAY_MAX_T,
  TIMELINE_NEXUS_TURRET_END_MARGIN_T,
  STRUCTURE_ATTACKERS_MIN,
  STRUCTURE_ATTACKERS_MAX,
  TIMELINE_BARON_TEAM_STRUCTURE_CHANCE,
  TIMELINE_BARON_TEAM_STRUCTURE_DELAY_MIN_T,
  TIMELINE_BARON_TEAM_STRUCTURE_DELAY_MAX_T,
  TIMELINE_OBJECTIVE_PARTICIPANTS_MIN,
  TIMELINE_OBJECTIVE_PARTICIPANTS_MAX,
  TIMELINE_OBJECTIVE_RESULT_DELAY_MIN_T,
  TIMELINE_OBJECTIVE_RESULT_DELAY_MAX_T,
  OBJECTIVE_DRAKE_SPAWN,
  OBJECTIVE_BARON_SPAWN,
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
  CHAMPION_LEVEL_SECONDS,
  MOVE_RESPAWN_WALK_SECONDS,
  CHAMPION_MAX_LEVEL,
  STAT_NOISE_MIN,
  STAT_NOISE_MAX,
  MVP_W_KILL,
  MVP_W_ASSIST,
  MVP_W_DEATH,
  MVP_W_CS_DIV,
  MVP_W_DAMAGE_DIV,
  MVP_W_GOLD_DIV,
  MVP_W_OBJECTIVE,
} from '../config/constants'

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
  /** Structures taken per attacking team, used to keep the losing side in a realistic band. */
  structureTakes: Record<1 | 2, number>
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
  const pool = alivePool.length > 0 ? [...alivePool] : [...basePool]
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
  ctx.structureTakes[attackerTeam] += 1
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
) {
  const location = objective === 'drake' ? DRAKE_POS : BARON_POS
  const participants = pickParticipants(ctx)
  pushEvent(ctx, { t: tSpawn, type: 'objectiveSpawn', objective, location, participants, winProbDelta: 0 })

  // small scrap around the pit
  if (ctx.rng() < 0.6) {
    emitFight(ctx, tSpawn + randInt(ctx.rng, 8, 25), location, randInt(ctx.rng, 1, 2))
  }

  const winnerTeam = forcedTeam ?? pickTeam(ctx)
  const delta = objective === 'drake' ? TIMELINE_DRAKE_WINPROB_DELTA : TIMELINE_BARON_WINPROB_DELTA
  pushEvent(ctx, {
    t: tSpawn + randInt(ctx.rng, TIMELINE_OBJECTIVE_RESULT_DELAY_MIN_T, TIMELINE_OBJECTIVE_RESULT_DELAY_MAX_T),
    type: 'objectiveResult',
    objective,
    team: winnerTeam,
    location,
    participants,
    winProbDelta: winnerTeam === 1 ? delta : -delta,
  })
  return winnerTeam
}

/**
 * Generate the full deterministic battle script from a seed.
 * `fromT` > 0 regenerates only events at/after that game-second (objective
 * override re-seed); earlier phases still advance the RNG identically cheaply
 * by being generated and discarded via the fromT filter in pushEvent.
 */
export function generateTimeline(
  seed: number,
  initialWinProb: number,
  fromT = 0,
  preDestroyed: ReadonlySet<StructureId> = new Set(),
): BattleTimeline {
  const rng = createRng(seed)
  const ctx: GenContext = {
    rng,
    events: [],
    momentum: clampMomentum((initialWinProb - 0.5) * 2),
    firstBloodDone: fromT > TIMELINE_FIRST_BLOOD_MAX_T,
    fromT,
    destroyed: new Set(preDestroyed),
    structureTakes: { 1: 0, 2: 0 },
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

  // ── First turret — falls shortly after laning, momentum-biased random lane ──
  emitStructureFall(
    ctx,
    randInt(rng, TIMELINE_FIRST_TURRET_MIN_T, TIMELINE_FIRST_TURRET_MAX_T),
    pickTeam(ctx),
    pick(rng, LANES),
  )

  // ── Drake window ──
  const drakeCount = randInt(rng, TIMELINE_DRAKE_COUNT_MIN, TIMELINE_DRAKE_COUNT_MAX)
  const drakeWindow = TIMELINE_DRAKE_WINDOW_END - TIMELINE_LANING_END
  for (let i = 0; i < drakeCount; i++) {
    const base = TIMELINE_LANING_END + (drakeWindow / drakeCount) * i
    const tSpawn = Math.max(
      OBJECTIVE_DRAKE_SPAWN,
      Math.floor(base + rng() * (drakeWindow / drakeCount - 120)),
    )
    emitObjective(ctx, tSpawn, 'drake')
  }

  // ── Mid fights ──
  const midFights = randInt(rng, TIMELINE_MID_FIGHTS_MIN, TIMELINE_MID_FIGHTS_MAX)
  for (let i = 0; i < midFights; i++) {
    const t = randInt(rng, TIMELINE_DRAKE_WINDOW_END - 200, TIMELINE_MIDFIGHT_END - 60)
    emitFight(ctx, t, MID_CENTER, randInt(rng, TIMELINE_FIGHT_KILLS_MIN, TIMELINE_FIGHT_KILLS_MAX))
  }

  // ── Mid-game structure falls — spread across the drake/midfight windows ──
  // Ascending sub-windows keep per-lane tier order monotone in time; the
  // window ends before baron spawns so the late-game blocks stay ordered too.
  const midgameFalls = randInt(rng, TIMELINE_MIDGAME_STRUCTURES_MIN, TIMELINE_MIDGAME_STRUCTURES_MAX)
  const mgStart = TIMELINE_LANING_END + TIMELINE_MIDGAME_STRUCTURES_START_PAD_T
  const mgSlot = (OBJECTIVE_BARON_SPAWN - mgStart) / midgameFalls
  for (let i = 0; i < midgameFalls; i++) {
    let team = pickTeam(ctx)
    if (ctx.structureTakes[team] >= TIMELINE_LOSER_STRUCTURES_MAX) team = (3 - team) as 1 | 2
    const lane = pick(rng, LANES)
    const t = Math.floor(mgStart + mgSlot * i + rng() * Math.max(1, mgSlot - TIMELINE_STRUCTURE_MIN_GAP_T))
    // inhibitors don't fall this early — leave the lane at its inhib turret
    const target = nextStructureInLane(ctx.destroyed, (3 - team) as 1 | 2, lane)
    if (target && parseStructureId(target).tier === 'inhibitor' && t < TIMELINE_MIDFIGHT_END) continue
    emitStructureFall(ctx, t, team, lane)
  }

  // ── Baron ──
  const baronSpawnT = OBJECTIVE_BARON_SPAWN + randInt(rng, 0, 200)
  const baronTeam = emitObjective(ctx, baronSpawnT, 'baron')

  // ── Winner decision: momentum walk result, sampled once ──
  const finalProb = Math.max(0.08, Math.min(0.92, 0.5 + ctx.momentum / 2))
  const winner: 1 | 2 = rng() < finalProb ? 1 : 2

  // ── Push / end phase — the winner closes the game ──
  const pushStart = Math.min(
    Math.max(TIMELINE_BARON_END, baronSpawnT + TIMELINE_OBJECTIVE_RESULT_DELAY_MAX_T + 50),
    TIMELINE_NEXUS_FALL_T - 400,
  )
  const pushKills = randInt(rng, TIMELINE_PUSH_KILLS_MIN, TIMELINE_PUSH_KILLS_MAX)
  const loserNexus = winner === 1 ? RED_NEXUS : BLUE_NEXUS
  const loser = (3 - winner) as 1 | 2
  emitFight(ctx, randInt(rng, pushStart, pushStart + 200), MID_CENTER, pushKills, {
    biasTeam: winner,
  })

  // baron winner also cracks a structure mid-game if it isn't the game winner
  if (
    baronTeam !== winner &&
    ctx.structureTakes[baronTeam] < TIMELINE_LOSER_STRUCTURES_MAX &&
    ctx.rng() < TIMELINE_BARON_TEAM_STRUCTURE_CHANCE
  ) {
    emitStructureFall(
      ctx,
      baronSpawnT + randInt(rng, TIMELINE_BARON_TEAM_STRUCTURE_DELAY_MIN_T, TIMELINE_BARON_TEAM_STRUCTURE_DELAY_MAX_T),
      baronTeam,
      pick(rng, LANES),
    )
  }

  // the losing team always walks away with at least one desperation take
  if (ctx.structureTakes[loser] === 0) {
    emitStructureFall(ctx, randInt(rng, pushStart + 40, pushStart + 260), loser, pick(rng, LANES))
  }

  // ── Winner cracks one full lane: remaining chain outer → … → inhibitor ──
  const pushLane = pick(rng, LANES)
  const chain: StructureId[] = []
  {
    const probe = new Set(ctx.destroyed)
    let next = nextStructureInLane(probe, loser, pushLane)
    while (next) {
      chain.push(next)
      probe.add(next)
      next = nextStructureInLane(probe, loser, pushLane)
    }
  }
  const chainStart = Math.max(pushStart + 100, fromT + TIMELINE_STRUCTURE_MIN_GAP_T)
  const chainEnd = TIMELINE_NEXUS_FALL_T - TIMELINE_PUSH_CHAIN_END_MARGIN_T
  // if an inhibitor is already down (reseed mid-push), nexus turrets are open immediately
  let tInhibitorDown: number | null = canFallNexusTurret(ctx.destroyed, loser) ? chainStart : null
  let tCursor = chainStart
  for (let i = 0; i < chain.length; i++) {
    const remainingSlots = chain.length - i
    const slack = Math.max(0, chainEnd - tCursor - remainingSlots * TIMELINE_STRUCTURE_MIN_GAP_T)
    const t = Math.min(
      chainEnd,
      tCursor + TIMELINE_STRUCTURE_MIN_GAP_T + Math.floor(rng() * Math.max(1, Math.min(slack, 160))),
    )
    if (emitStructureFall(ctx, t, winner, pushLane) && parseStructureId(chain[i]).tier === 'inhibitor') {
      tInhibitorDown = t
    }
    tCursor = t
  }

  // extra off-lane takes while the main push happens
  const extras = randInt(rng, TIMELINE_PUSH_EXTRA_STRUCTURES_MIN, TIMELINE_PUSH_EXTRA_STRUCTURES_MAX)
  const otherLanes = LANES.filter((l) => l !== pushLane)
  let tExtra = chainStart
  for (let i = 0; i < extras; i++) {
    tExtra += randInt(rng, TIMELINE_STRUCTURE_MIN_GAP_T, TIMELINE_STRUCTURE_MIN_GAP_T + 160)
    if (tExtra >= chainEnd) break
    emitStructureFall(ctx, tExtra, winner, pick(rng, otherLanes))
  }

  // ── Nexus turrets — only exposed once an inhibitor of the loser is down ──
  if (tInhibitorDown !== null) {
    let tNex = tInhibitorDown
    for (let i = 0; i < 2; i++) {
      tNex = Math.min(
        tNex + randInt(rng, TIMELINE_NEXUS_TURRET_DELAY_MIN_T, TIMELINE_NEXUS_TURRET_DELAY_MAX_T),
        TIMELINE_NEXUS_FALL_T -
          TIMELINE_NEXUS_TURRET_END_MARGIN_T -
          (1 - i) * TIMELINE_STRUCTURE_MIN_GAP_T,
      )
      emitStructureFall(ctx, tNex, winner, 'nexus')
    }
  }

  pushEvent(ctx, {
    t: TIMELINE_NEXUS_FALL_T,
    type: 'nexus',
    team: winner,
    location: loserNexus,
    winProbDelta: 0,
  })

  ctx.events.sort((a, b) => a.t - b.t)
  return { seed, winner, events: ctx.events }
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
): BattleTimeline {
  // Structures already down at the cut stay down: the regenerated tail starts
  // from this world state, so nothing double-falls or skips its lane order.
  const preDestroyed = destroyedStructuresUpTo(current.events, t)
  const regenerated = generateTimeline(newSeed, boostedWinProb, t + 1, preDestroyed)
  // Drop regenerated objectiveResults whose spawn happened before the cut —
  // that objective was already resolved live (orphan results would double-count).
  const spawnedAfterCut = new Set<string>()
  const futureEvents = regenerated.events.filter((e) => {
    if (e.type === 'objectiveSpawn' && e.objective) {
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
  return {
    seed: current.seed,
    winner: regenerated.winner,
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

/** Closed-form continuous stats as a pure function of game-time (kills/gold bounties come from events). */
export function continuousStatsAt(role: BattleRole, noise: number, gameTime: number): ContinuousStats {
  const minutes = gameTime / 60
  const level = Math.min(CHAMPION_MAX_LEVEL, 1 + Math.floor(gameTime / CHAMPION_LEVEL_SECONDS))
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
