import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePersistence } from '../../composables/usePersistence'
import { useChampionLevelStore } from '../../stores/championLevelStore'
import { useBattleStore } from '../../stores/battleStore'
import { useGameStore } from '../../stores/gameStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useGalaxyStore } from '../../stores/galaxyStore'
import {
  xpForLevel,
  levelUpCost,
  resolveChampionStats,
  ascensionStars,
  ascensionRank,
  isAscensionLevel,
  isPerkLevel,
  perkTierForLevel,
  perkChoicesFor,
  powerDpsMult,
  vitalityMult,
  focusCooldownMult,
  fortuneMult,
  ROLE_GROWTH,
  CHAMPION_STATS,
  regaliaStageFor,
  regaliaStageIndexFor,
  isApexRegalia,
} from '../../config/championLevels'
import {
  CHAMPION_ALLY_XP_SHARE,
  CHAMPION_LEVEL_START_CAP,
  CHAMPION_LEVEL_CAP_PER_GALAXY,
  CHAMPION_LEVEL_MAX_CAP,
  CHAMPION_STAT_BASE,
  CHAMPION_ASCENSION_INTERVAL,
  CHAMPION_PERK_INTERVAL,
  CHAMPION_REGALIA_STAGES,
  SAVE_KEY,
} from '../../config/constants'
import { CHAMPION_DATA } from '../../config/championData'

/** The test environment has no global localStorage → in-memory stub. */
function makeLocalStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

// Ahri is a ★1 mid, Zoe a ★6 mid — same role, different tier, so tier effects
// are isolated from role growth. Malphite is a ★1 top for the role comparison.
const MID_LOW = 'Ahri'
const MID_HIGH = 'Zoe'
const TOP_LOW = 'Malphite'

/** Gives a champion enough XP, chimes and materials to buy `count` levels. */
function fund(champion: string, count = 1) {
  const levelStore = useChampionLevelStore()
  const gameStore = useGameStore()
  const inventoryStore = useInventoryStore()
  for (let i = 0; i < count; i++) {
    const level = levelStore.levelOf(champion)
    levelStore.grantXp(champion, xpForLevel(level))
    const cost = levelUpCost(champion, level)
    gameStore.chimes += cost.chimes
    for (const [id, qty] of Object.entries(cost.materials)) {
      for (let m = 0; m < qty; m++) inventoryStore.addMaterial(id)
    }
  }
}

describe('champion levels — curves and stats', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('xp requirement grows strictly with level', () => {
    let prev = 0
    for (let l = 1; l <= 50; l++) {
      const need = xpForLevel(l)
      expect(need).toBeGreaterThan(prev)
      prev = need
    }
  })

  it('a level-1 champion is exactly as strong as before champion levels', () => {
    // ★1 at level 1 sits on the baseline, so every multiplier must be neutral —
    // otherwise adding this system would silently rebalance the whole game.
    const stats = resolveChampionStats(MID_LOW, 1, 'mid')
    for (const stat of CHAMPION_STATS) {
      expect(stats[stat.key]).toBeCloseTo(CHAMPION_STAT_BASE, 5)
    }
    expect(powerDpsMult(stats.power)).toBe(1)
    expect(vitalityMult(stats.vitality)).toBe(1)
    expect(focusCooldownMult(stats.focus)).toBe(1)
    expect(fortuneMult(stats.fortune)).toBe(1)
  })

  it('roles grow along different axes', () => {
    const mid = resolveChampionStats(MID_LOW, 20, 'mid')
    const top = resolveChampionStats(TOP_LOW, 20, 'top')
    // mid is the damage role, top the durable one
    expect(mid.power).toBeGreaterThan(top.power)
    expect(top.vitality).toBeGreaterThan(mid.vitality)
    // and every role spends the same total budget per level
    const sum = (g: Record<string, number>) => Object.values(g).reduce((a, b) => a + b, 0)
    const budgets = Object.values(ROLE_GROWTH).map(sum)
    for (const b of budgets) expect(b).toBeCloseTo(budgets[0], 5)
  })

  it('a higher champion tier starts and stays stronger at equal level', () => {
    expect(CHAMPION_DATA[MID_HIGH].championTier).not.toBe(CHAMPION_DATA[MID_LOW].championTier)
    const low = resolveChampionStats(MID_LOW, 15, 'mid')
    const high = resolveChampionStats(MID_HIGH, 15, 'mid')
    expect(high.power).toBeGreaterThan(low.power)
  })

  it('cooldowns fall with FOCUS but never below the floor', () => {
    expect(focusCooldownMult(CHAMPION_STAT_BASE)).toBe(1)
    expect(focusCooldownMult(200)).toBeLessThan(1)
    // absurd focus plus the perk still respects the clamp
    expect(focusCooldownMult(100_000, 0.9)).toBeGreaterThanOrEqual(0.45)
  })

  it('awards an ascension star every interval and names the rank band', () => {
    expect(ascensionStars(CHAMPION_ASCENSION_INTERVAL - 1)).toBe(0)
    expect(ascensionStars(CHAMPION_ASCENSION_INTERVAL)).toBe(1)
    expect(ascensionStars(CHAMPION_ASCENSION_INTERVAL * 4)).toBe(4)
    expect(isAscensionLevel(CHAMPION_ASCENSION_INTERVAL)).toBe(true)
    expect(isAscensionLevel(CHAMPION_ASCENSION_INTERVAL + 1)).toBe(false)
    expect(ascensionRank(1).name).toBe('Recruit')
    expect(ascensionRank(50).name).toBe('Prismatic')
  })

  it('charges materials only on ascension levels', () => {
    const plain = levelUpCost(MID_LOW, CHAMPION_ASCENSION_INTERVAL)
    expect(Object.keys(plain.materials)).toHaveLength(0)
    const ascension = levelUpCost(MID_LOW, CHAMPION_ASCENSION_INTERVAL - 1)
    expect(Object.keys(ascension.materials).length).toBeGreaterThan(0)
  })

  it('chime cost rises with level and with champion tier', () => {
    expect(levelUpCost(MID_LOW, 10).chimes).toBeGreaterThan(levelUpCost(MID_LOW, 2).chimes)
    expect(levelUpCost(MID_HIGH, 10).chimes).toBeGreaterThan(levelUpCost(MID_LOW, 10).chimes)
  })

  it('opens a perk milestone every interval, drawing from escalating pools', () => {
    expect(isPerkLevel(CHAMPION_PERK_INTERVAL)).toBe(true)
    expect(isPerkLevel(CHAMPION_PERK_INTERVAL + 1)).toBe(false)
    expect(perkTierForLevel(10)).toBe('adept')
    expect(perkTierForLevel(20)).toBe('master')
    expect(perkTierForLevel(30)).toBe('elite')
    // a perk already owned drops out of later choices
    const first = perkChoicesFor(30, [])
    expect(first.length).toBeGreaterThan(0)
    const second = perkChoicesFor(40, [first[0].id])
    expect(second.map((p) => p.id)).not.toContain(first[0].id)
  })

  it('escalates the regalia stage monotonically, apex only at the level cap', () => {
    // level 1 already wears a stage — the badge is never unstyled
    expect(regaliaStageIndexFor(1)).toBe(0)
    expect(regaliaStageFor(1).name).toBe(CHAMPION_REGALIA_STAGES[0].name)

    // never drops back, and every threshold in the table is actually reachable
    let previous = -1
    for (let level = 1; level <= CHAMPION_LEVEL_MAX_CAP; level++) {
      const index = regaliaStageIndexFor(level)
      expect(index).toBeGreaterThanOrEqual(previous)
      previous = index
    }
    expect(previous).toBe(CHAMPION_REGALIA_STAGES.length - 1)

    // the apex is the level cap and nothing below it
    expect(isApexRegalia(CHAMPION_LEVEL_MAX_CAP)).toBe(true)
    expect(isApexRegalia(CHAMPION_LEVEL_MAX_CAP - 1)).toBe(false)

    // every field climbs, so no stage ever looks tamer than the one before it
    for (let i = 1; i < CHAMPION_REGALIA_STAGES.length; i++) {
      const prev = CHAMPION_REGALIA_STAGES[i - 1]
      const cur = CHAMPION_REGALIA_STAGES[i]
      expect(cur.minLevel).toBeGreaterThan(prev.minLevel)
      expect(cur.rim).toBeGreaterThanOrEqual(prev.rim)
      expect(cur.glow).toBeGreaterThan(prev.glow)
      expect(cur.glowAlpha).toBeGreaterThan(prev.glowAlpha)
      expect(cur.heat).toBeGreaterThan(prev.heat)
      expect(cur.facets).toBeGreaterThanOrEqual(prev.facets)
      expect(cur.studs).toBeGreaterThanOrEqual(prev.studs)
      // ornaments only ever switch on — a stage never takes one back
      for (const flag of [
        'sweep',
        'plate2',
        'bevel',
        'halo',
        'sheen',
        'sheenDual',
        'orbit',
        'rays',
        'crown',
        'spin',
      ] as const) {
        expect(Number(cur[flag])).toBeGreaterThanOrEqual(Number(prev[flag]))
      }
    }
  })

  it('steps the regalia stage exactly once per ascension interval', () => {
    // one stage per ascension star, so the frame changes on the same levels the
    // player already gets a star for — nothing in between, nothing skipped
    const thresholds = CHAMPION_REGALIA_STAGES.map((s) => s.minLevel)
    expect(thresholds[0]).toBe(1)
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBe(i * CHAMPION_ASCENSION_INTERVAL)
    }
    expect(thresholds.at(-1)).toBe(CHAMPION_LEVEL_MAX_CAP)

    // and every stage adds at least one element the previous one did not have
    for (let i = 1; i < CHAMPION_REGALIA_STAGES.length; i++) {
      const prev = CHAMPION_REGALIA_STAGES[i - 1]
      const cur = CHAMPION_REGALIA_STAGES[i]
      const gained =
        cur.studs > prev.studs ||
        cur.facets > prev.facets ||
        (
          [
            'sweep',
            'plate2',
            'bevel',
            'halo',
            'sheen',
            'sheenDual',
            'orbit',
            'rays',
            'crown',
            'spin',
          ] as const
        ).some((flag) => cur[flag] && !prev[flag])
      expect(gained).toBe(true)
    }
  })
})

describe('champion levels — store behaviour', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lifts the level cap with every galaxy, bounded by the maximum', () => {
    const levelStore = useChampionLevelStore()
    const galaxyStore = useGalaxyStore()
    galaxyStore.currentGalaxy = 1
    expect(levelStore.levelCap).toBe(CHAMPION_LEVEL_START_CAP)
    // the ramp is written in terms of the constants, so it keeps holding if the
    // start cap is ever lowered back below the maximum
    galaxyStore.currentGalaxy = 3
    expect(levelStore.levelCap).toBe(
      Math.min(
        CHAMPION_LEVEL_MAX_CAP,
        CHAMPION_LEVEL_START_CAP + 2 * CHAMPION_LEVEL_CAP_PER_GALAXY,
      ),
    )
    galaxyStore.currentGalaxy = 999
    expect(levelStore.levelCap).toBe(CHAMPION_LEVEL_MAX_CAP)
    // and the cap never drops as galaxies go up
    let previous = 0
    for (const galaxy of [1, 2, 5, 12, 999]) {
      galaxyStore.currentGalaxy = galaxy
      expect(levelStore.levelCap).toBeGreaterThanOrEqual(previous)
      previous = levelStore.levelCap
    }
  })

  it('reaches the level cap with a single admin MAX press', () => {
    // the MAX button asks for CHAMPION_LEVEL_MAX_CAP steps — that has to land on
    // the cap from level 1, whatever the cap currently is
    const levelStore = useChampionLevelStore()
    const battleStore = useBattleStore()
    const galaxyStore = useGalaxyStore()
    galaxyStore.currentGalaxy = 1
    battleStore.setHeaderSlot(2, MID_LOW)

    levelStore.adminLevelUpTeam(CHAMPION_LEVEL_MAX_CAP)
    expect(levelStore.levelOf(MID_LOW)).toBe(levelStore.levelCap)
    expect(levelStore.adminLevelUpTeam(CHAMPION_LEVEL_MAX_CAP)).toBe(0)
  })

  it('pays the main in full and its allies a share, benched champions nothing', () => {
    const levelStore = useChampionLevelStore()
    const battleStore = useBattleStore()
    battleStore.setHeaderSlot(2, MID_LOW)
    battleStore.setSecondarySlot(2, 0, MID_HIGH)

    levelStore.grantTeamXp(100)

    expect(levelStore.progressOf(MID_LOW).xp).toBe(100)
    expect(levelStore.progressOf(MID_HIGH).xp).toBe(100 * CHAMPION_ALLY_XP_SHARE)
    expect(levelStore.progressOf(TOP_LOW).xp).toBe(0)
  })

  it('trickles the ally share down when a single main is paid', () => {
    const levelStore = useChampionLevelStore()
    const battleStore = useBattleStore()
    battleStore.setHeaderSlot(2, MID_LOW)
    battleStore.setSecondarySlot(2, 0, MID_HIGH)

    levelStore.grantXpWithAllies(MID_LOW, 80)

    expect(levelStore.progressOf(MID_LOW).xp).toBe(80)
    expect(levelStore.progressOf(MID_HIGH).xp).toBe(80 * CHAMPION_ALLY_XP_SHARE)
  })

  it('never levels the Bard — it is the player, not a champion', () => {
    const levelStore = useChampionLevelStore()
    expect(levelStore.grantXp('Bard', 500)).toBe(0)
    expect(levelStore.canLevelUp('Bard')).toBe(false)
  })

  it('refuses a level-up without enough XP, chimes or materials', () => {
    const levelStore = useChampionLevelStore()
    const gameStore = useGameStore()

    expect(levelStore.canLevelUp(MID_LOW)).toBe(false)
    expect(levelStore.blockReasonOf(MID_LOW)).toBe('xp')

    levelStore.grantXp(MID_LOW, xpForLevel(1))
    gameStore.chimes = 0
    expect(levelStore.blockReasonOf(MID_LOW)).toBe('chimes')
    expect(levelStore.levelUp(MID_LOW)).toBe(false)
    expect(levelStore.levelOf(MID_LOW)).toBe(1)
  })

  it('spends XP, chimes and materials on a successful level-up', () => {
    const levelStore = useChampionLevelStore()
    const gameStore = useGameStore()
    const inventoryStore = useInventoryStore()

    // level 4 → 5 is an ascension step, so materials are charged too
    for (let i = 0; i < 4; i++) {
      fund(MID_LOW)
      expect(levelStore.levelUp(MID_LOW)).toBe(true)
    }
    expect(levelStore.levelOf(MID_LOW)).toBe(5)
    expect(gameStore.chimes).toBe(0)
    expect(levelStore.progressOf(MID_LOW).xp).toBe(0)
    for (const qty of Object.values(inventoryStore.collectedMaterials)) {
      expect(qty).toBe(0)
    }
    expect(levelStore.totalLevelsBought).toBe(4)
  })

  it('stops at the level cap and keeps banking XP against a future cap', () => {
    const levelStore = useChampionLevelStore()
    const galaxyStore = useGalaxyStore()
    galaxyStore.currentGalaxy = 1

    for (let i = 1; i < CHAMPION_LEVEL_START_CAP; i++) {
      fund(MID_LOW)
      expect(levelStore.levelUp(MID_LOW)).toBe(true)
    }
    expect(levelStore.levelOf(MID_LOW)).toBe(CHAMPION_LEVEL_START_CAP)

    fund(MID_LOW)
    expect(levelStore.blockReasonOf(MID_LOW)).toBe('cap')
    expect(levelStore.levelUp(MID_LOW)).toBe(false)

    // XP keeps accruing at the cap rather than being thrown away
    const banked = levelStore.progressOf(MID_LOW).xp
    levelStore.grantXp(MID_LOW, 5000)
    expect(levelStore.progressOf(MID_LOW).xp).toBe(banked + 5000)

    // and the banked XP pays off the moment the cap moves. The start cap
    // currently sits on the maximum, so no galaxy lifts it — raise the cap by
    // hand to prove the block is the cap and nothing else.
    galaxyStore.currentGalaxy = 2
    if (levelStore.levelCap > CHAMPION_LEVEL_START_CAP) {
      expect(levelStore.canLevelUp(MID_LOW)).toBe(true)
    } else {
      expect(levelStore.blockReasonOf(MID_LOW)).toBe('cap')
      vi.spyOn(levelStore, 'levelCap', 'get').mockReturnValue(CHAMPION_LEVEL_START_CAP + 1)
      expect(levelStore.canLevelUp(MID_LOW)).toBe(true)
      vi.restoreAllMocks()
    }
  })

  it('queues a perk choice at the milestone and applies the pick', () => {
    const levelStore = useChampionLevelStore()

    for (let i = 1; i < CHAMPION_PERK_INTERVAL; i++) {
      fund(MID_LOW)
      levelStore.levelUp(MID_LOW)
    }
    expect(levelStore.levelOf(MID_LOW)).toBe(CHAMPION_PERK_INTERVAL)
    expect(levelStore.hasPendingPerk(MID_LOW)).toBe(true)

    const choices = levelStore.perkChoicesOf(MID_LOW)
    expect(choices.length).toBeGreaterThan(0)
    const before = levelStore.statsOf(MID_LOW)

    expect(levelStore.choosePerk(MID_LOW, 'not-a-perk')).toBe(false)
    expect(levelStore.choosePerk(MID_LOW, choices[0].id)).toBe(true)
    expect(levelStore.hasPendingPerk(MID_LOW)).toBe(false)

    // the chosen perk's flat bonus is live in the stat block
    const boosted = Object.entries(choices[0].stats ?? {})[0]
    if (boosted) {
      const [key, gain] = boosted as [keyof typeof before, number]
      expect(levelStore.statsOf(MID_LOW)[key]).toBeCloseTo(before[key] + gain, 5)
    }
  })

  it('raises orbit damage and battle power as a champion levels', () => {
    const levelStore = useChampionLevelStore()
    const battleStore = useBattleStore()
    battleStore.setHeaderSlot(2, MID_LOW)

    expect(levelStore.orbitDpsMultOf(MID_LOW)).toBe(1)
    expect(levelStore.teamVitalityMult).toBe(1)

    for (let i = 0; i < 8; i++) {
      fund(MID_LOW)
      levelStore.levelUp(MID_LOW)
    }

    expect(levelStore.orbitDpsMultOf(MID_LOW)).toBeGreaterThan(1)
    expect(levelStore.teamVitalityMult).toBeGreaterThan(1)
    expect(levelStore.teamFortuneMult).toBeGreaterThan(1)
    expect(levelStore.roleCooldownMult(2)).toBeLessThan(1)
  })

  it('leaves an empty role slot on the untouched baseline', () => {
    const levelStore = useChampionLevelStore()
    expect(levelStore.roleCooldownMult(0)).toBe(1)
    expect(levelStore.roleAbilityMult(0)).toBe(1)
    expect(levelStore.teamFortuneMult).toBe(1)
    expect(levelStore.teamVitalityMult).toBe(1)
  })

  it('prunes progression for champions that no longer exist', () => {
    const levelStore = useChampionLevelStore()
    levelStore.progress['Ghost Champion'] = { level: 9, xp: 0, totalXp: 0, perks: {} }
    levelStore.pendingPerks.push({ champion: 'Ghost Champion', level: 10, tier: 'adept' })
    levelStore.grantXp(MID_LOW, 10)

    levelStore.prune()

    expect(levelStore.progress['Ghost Champion']).toBeUndefined()
    expect(levelStore.pendingPerks).toHaveLength(0)
    expect(levelStore.progress[MID_LOW]).toBeDefined()
  })
})

describe('champion levels — save/load roundtrip', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  it('restores levels, banked XP and chosen perks', () => {
    const { saveGame, loadGame } = usePersistence()
    const levelStore = useChampionLevelStore()

    for (let i = 1; i < CHAMPION_PERK_INTERVAL; i++) {
      fund(MID_LOW)
      levelStore.levelUp(MID_LOW)
    }
    const perkId = levelStore.perkChoicesOf(MID_LOW)[0].id
    levelStore.choosePerk(MID_LOW, perkId)
    levelStore.grantXp(MID_LOW, 777)

    const level = levelStore.levelOf(MID_LOW)
    const xp = levelStore.progressOf(MID_LOW).xp
    const totalXp = levelStore.progressOf(MID_LOW).totalXp
    const bought = levelStore.totalLevelsBought

    saveGame()
    levelStore.resetAll()
    expect(levelStore.levelOf(MID_LOW)).toBe(1)

    loadGame()

    expect(levelStore.levelOf(MID_LOW)).toBe(level)
    expect(levelStore.progressOf(MID_LOW).xp).toBe(xp)
    expect(levelStore.progressOf(MID_LOW).totalXp).toBe(totalXp)
    expect(levelStore.progressOf(MID_LOW).perks[CHAMPION_PERK_INTERVAL]).toBe(perkId)
    expect(levelStore.totalLevelsBought).toBe(bought)
  })

  it('loads a save made before champion levels existed', () => {
    const { saveGame, loadGame } = usePersistence()
    saveGame()
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
    delete saved.championLevel
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved))

    expect(() => loadGame()).not.toThrow()
    expect(useChampionLevelStore().levelOf(MID_LOW)).toBe(1)
  })

  it('keeps an unspent perk milestone across a reload', () => {
    const { saveGame, loadGame } = usePersistence()
    const levelStore = useChampionLevelStore()

    for (let i = 1; i < CHAMPION_PERK_INTERVAL; i++) {
      fund(MID_LOW)
      levelStore.levelUp(MID_LOW)
    }
    expect(levelStore.hasPendingPerk(MID_LOW)).toBe(true)

    saveGame()
    levelStore.resetAll()
    loadGame()

    expect(levelStore.hasPendingPerk(MID_LOW)).toBe(true)
    expect(levelStore.perkChoicesOf(MID_LOW).length).toBeGreaterThan(0)
  })
})

describe('champion levels — admin team level-up', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('raises every assigned champion, mains and allies alike, for free', () => {
    const levelStore = useChampionLevelStore()
    const battleStore = useBattleStore()
    const gameStore = useGameStore()
    battleStore.setHeaderSlot(2, MID_LOW)
    battleStore.setSecondarySlot(2, 0, MID_HIGH)
    gameStore.chimes = 0

    const granted = levelStore.adminLevelUpTeam(3)

    expect(granted).toBe(6)
    expect(levelStore.levelOf(MID_LOW)).toBe(4)
    expect(levelStore.levelOf(MID_HIGH)).toBe(4)
    // free of charge and without needing banked XP
    expect(gameStore.chimes).toBe(0)
  })

  it('leaves benched champions untouched', () => {
    const levelStore = useChampionLevelStore()
    const battleStore = useBattleStore()
    battleStore.setHeaderSlot(2, MID_LOW)

    levelStore.adminLevelUpTeam(2)

    expect(levelStore.levelOf(MID_LOW)).toBe(3)
    expect(levelStore.levelOf(TOP_LOW)).toBe(1)
  })

  it('stops at the level cap and reports the reduced count', () => {
    const levelStore = useChampionLevelStore()
    const battleStore = useBattleStore()
    const galaxyStore = useGalaxyStore()
    galaxyStore.currentGalaxy = 1
    battleStore.setHeaderSlot(2, MID_LOW)

    levelStore.adminLevelUpTeam(CHAMPION_LEVEL_START_CAP - 2)
    expect(levelStore.levelOf(MID_LOW)).toBe(CHAMPION_LEVEL_START_CAP - 1)

    // asking for 10 more only grants the single level left below the cap
    expect(levelStore.adminLevelUpTeam(10)).toBe(1)
    expect(levelStore.levelOf(MID_LOW)).toBe(CHAMPION_LEVEL_START_CAP)
    // and pressing again is a no-op rather than an error
    expect(levelStore.adminLevelUpTeam(5)).toBe(0)
  })

  it('opens the milestone perks it passes through', () => {
    const levelStore = useChampionLevelStore()
    const battleStore = useBattleStore()
    battleStore.setHeaderSlot(2, MID_LOW)

    levelStore.adminLevelUpTeam(CHAMPION_PERK_INTERVAL - 1)

    expect(levelStore.levelOf(MID_LOW)).toBe(CHAMPION_PERK_INTERVAL)
    expect(levelStore.hasPendingPerk(MID_LOW)).toBe(true)
    expect(levelStore.perkChoicesOf(MID_LOW).length).toBeGreaterThan(0)
  })

  it('counts a champion once even if steps is zero or negative', () => {
    const levelStore = useChampionLevelStore()
    const battleStore = useBattleStore()
    battleStore.setHeaderSlot(2, MID_LOW)

    expect(levelStore.adminLevelUpTeam(0)).toBe(0)
    expect(levelStore.adminLevelUpTeam(-3)).toBe(0)
    expect(levelStore.levelOf(MID_LOW)).toBe(1)
  })
})
