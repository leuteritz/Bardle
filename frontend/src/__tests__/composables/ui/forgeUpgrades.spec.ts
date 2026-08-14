import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useForgeUpgrades, FORGE_EMPTY_UPGRADE_ENTRY } from '@/composables/ui/useForgeUpgrades'
import { useActionToast } from '@/composables/ui/useActionToast'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { FORGE_NODES, getForgeNode } from '@/config/progression/starForge'
import {
  SOLAR_BRANCHES,
  SOLAR_MAX_LEVELS,
  SOLAR_MATERIAL_FROM_LEVEL,
  STAR_PHASE_DATA,
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  FORGE_BRANCH_PARENT_MIN_LEVEL,
  FORGE_LEAF_PARENT_MIN_LEVEL,
  FORGE_LEAF_AMPLIFY_PER_LEVEL,
  FORGE_LEAF_AMPLIFY_PER_LEVEL_PCT,
  FORGE_DESC_VALUE_TOKEN,
  FORGE_UPGRADE_CAPPED_REASON,
  FORGE_UPGRADE_TIER_LABELS,
} from '@/config/constants'

/**
 * `useForgeUpgrades` ist seit dem Shop-Umbau die EINE Ansichtslogik hinter zwei
 * Bildern: den Kreisen im Sternbaum und den Karten in der Upgrade-Liste. Was
 * hier falsch fällt, fällt an beiden Stellen falsch — und zwar gleich, was den
 * Fehler schwerer sichtbar macht, nicht leichter.
 *
 * Geprüft wird deshalb die Weiche, nicht die Zahl: welcher Zustand wann gilt,
 * welcher Sperrgrund dazu gehört, und dass die Vorschau „nach dem Kauf" mit
 * derselben Formel rechnet wie der Kauf selbst.
 */

const ROOT_IDS = SOLAR_BRANCHES.map((b) => b.id)
const BRANCH_ID = 'solarSails'
const LEAF_ID = 'auroraWake'

/** Alle fünf Kernstrahlen auf dieselbe Stufe — das Gleichwuchs-Gate ist damit offen. */
function setAllRoots(level: number): void {
  const solar = useSolarUpgradeStore()
  solar.flightSpeedLevel = level
  solar.maxHpLevel = level
  solar.chimesPerClickLevel = level
  solar.chimesPerSecondLevel = level
  solar.dmgPerClickLevel = level
}

function fillPurse(): void {
  useGameStore().chimes = 100_000_000
  useInventoryStore().collectedMaterials = {
    stardust: 999,
    moon_crystal: 999,
    nebula_quartz: 999,
    solar_essence: 999,
    void_shard: 999,
    dark_matter: 999,
  }
}

/** Phase und Elternstufe so weit, dass Zweige kaufbar sind. */
function unlockBranches(): void {
  useSolarUpgradeStore().starPhase = FORGE_BRANCH_UNLOCK_PHASE
  setAllRoots(FORGE_BRANCH_PARENT_MIN_LEVEL)
  fillPurse()
}

/** Dasselbe eine Ebene weiter — Blätter brauchen Phase 4 und einen gewachsenen Zweig. */
function unlockLeaves(branchLevel = FORGE_LEAF_PARENT_MIN_LEVEL): void {
  unlockBranches()
  useSolarUpgradeStore().starPhase = FORGE_LEAF_UNLOCK_PHASE
  useStarForgeStore().branchLevels[BRANCH_ID] = branchLevel
}

function entry(id: string) {
  const { entryById } = useForgeUpgrades()
  const found = entryById.value.get(id)
  expect(found, `no entry for "${id}"`).toBeDefined()
  return found!
}

describe('useForgeUpgrades — Bestand', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lists every root and every forge node exactly once', () => {
    const { upgradeEntries, entryById } = useForgeUpgrades()
    expect(upgradeEntries.value).toHaveLength(SOLAR_BRANCHES.length + FORGE_NODES.length)
    const ids = upgradeEntries.value.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(entryById.value.size).toBe(ids.length)
    for (const id of [...ROOT_IDS, ...FORGE_NODES.map((n) => n.id)]) {
      expect(entryById.value.has(id), `missing "${id}"`).toBe(true)
    }
  })

  it('every entry is renderable — name, tier label, max level, icon with a set', () => {
    const { upgradeEntries } = useForgeUpgrades()
    for (const e of upgradeEntries.value) {
      expect(e.name.length, `${e.id} has no name`).toBeGreaterThan(0)
      expect(e.tierLabel).toBe(FORGE_UPGRADE_TIER_LABELS[e.tier])
      expect(e.maxLevel, `${e.id} has no max level`).toBeGreaterThan(0)
      // Ohne Präfix lädt @iconify/vue nichts und der Knoten bliebe leer.
      expect(/^[a-z][a-z0-9-]*:[a-z0-9-]+$/.test(e.icon), `${e.id} → "${e.icon}"`).toBe(true)
    }
  })

  it('the fallback entry carries every field of a real one', () => {
    const { upgradeEntries } = useForgeUpgrades()
    expect(Object.keys(FORGE_EMPTY_UPGRADE_ENTRY).sort()).toEqual(
      Object.keys(upgradeEntries.value[0]).sort(),
    )
  })
})

describe('useForgeUpgrades — Zustand der Kernstrahlen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('empty while untouched and unaffordable', () => {
    useGameStore().chimes = 0
    expect(entry(ROOT_IDS[0]).state).toBe('empty')
    expect(entry(ROOT_IDS[0]).canBuy).toBe(false)
  })

  it('affordable once the chimes are there', () => {
    fillPurse()
    expect(entry(ROOT_IDS[0]).state).toBe('affordable')
    expect(entry(ROOT_IDS[0]).canBuy).toBe(true)
  })

  it('partial once grown but out of reach', () => {
    setAllRoots(1)
    useGameStore().chimes = 0
    const e = entry(ROOT_IDS[0])
    expect(e.state).toBe('partial')
    expect(e.level).toBe(1)
  })

  // maxAllowedLevel = min(SOLAR_MAX_LEVELS, minBranchLevel + 1): ein Strahl darf
  // dem niedrigsten nur um eine Stufe voraus sein.
  it('capped when it has outgrown the other rays — and says so', () => {
    fillPurse()
    setAllRoots(0)
    useSolarUpgradeStore().flightSpeedLevel = 1
    const e = entry('flightSpeed')
    expect(e.state).toBe('capped')
    expect(e.lockReason).toBe(FORGE_UPGRADE_CAPPED_REASON)
    expect(e.canBuy).toBe(false)
  })

  it('maxed at the last level, with no reason attached', () => {
    fillPurse()
    setAllRoots(SOLAR_MAX_LEVELS)
    const e = entry(ROOT_IDS[0])
    expect(e.state).toBe('maxed')
    expect(e.lockReason).toBe('')
    expect(e.canBuy).toBe(false)
  })

  it('shows the stat now and one level on', () => {
    const solar = useSolarUpgradeStore()
    setAllRoots(2)
    const e = entry(ROOT_IDS[0])
    expect(e.nowText).toBe(solar.statDisplay(ROOT_IDS[0], 2))
    expect(e.nextText).toBe(solar.statDisplay(ROOT_IDS[0], 3))
    expect(e.materials).toHaveLength(0)
    expect(e.unlockProgress).toBe(1)
  })
})

describe('useForgeUpgrades — Sperren an Zweigen und Blättern', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('locked below the unlock phase, naming the phase', () => {
    useSolarUpgradeStore().starPhase = FORGE_BRANCH_UNLOCK_PHASE - 1
    setAllRoots(SOLAR_MAX_LEVELS)
    const e = entry(BRANCH_ID)
    expect(e.state).toBe('locked')
    expect(e.unlockProgress).toBe(0)
    expect(e.lockReason).toContain(STAR_PHASE_DATA[FORGE_BRANCH_UNLOCK_PHASE].name)
  })

  it('locked by the parent level, naming parent and level', () => {
    useSolarUpgradeStore().starPhase = FORGE_BRANCH_UNLOCK_PHASE
    setAllRoots(0)
    const e = entry(BRANCH_ID)
    expect(e.state).toBe('locked')
    expect(e.lockReason).toContain(e.parentName)
    expect(e.lockReason).toContain(String(FORGE_BRANCH_PARENT_MIN_LEVEL))
    expect(e.unlockProgress).toBe(0)
  })

  it('reports partial progress toward a leaf and never overshoots', () => {
    unlockLeaves(FORGE_LEAF_PARENT_MIN_LEVEL - 1)
    const half = entry(LEAF_ID)
    expect(half.state).toBe('locked')
    expect(half.unlockProgress).toBeCloseTo(
      (FORGE_LEAF_PARENT_MIN_LEVEL - 1) / FORGE_LEAF_PARENT_MIN_LEVEL,
    )

    useStarForgeStore().branchLevels[BRANCH_ID] = FORGE_LEAF_PARENT_MIN_LEVEL + 2
    const open = entry(LEAF_ID)
    expect(open.state).not.toBe('locked')
    expect(open.unlockProgress).toBe(1)
    expect(open.lockReason).toBe('')
  })

  it('an unlocked branch carries its cost in chimes and materials', () => {
    unlockBranches()
    const forge = useStarForgeStore()
    const e = entry(BRANCH_ID)
    expect(e.state).toBe('affordable')
    expect(e.goldCost).toBe(forge.nodeGoldCost(BRANCH_ID))
    expect(e.goldOk).toBe(true)
    expect(e.materials.length).toBeGreaterThan(0)
    for (const mat of e.materials) {
      expect(mat.name.length, `${mat.id} has no name`).toBeGreaterThan(0)
      expect(mat.ok).toBe(mat.have >= mat.need)
    }
  })

  it('missing materials keep it out of reach without locking it', () => {
    unlockBranches()
    useInventoryStore().collectedMaterials = {}
    const e = entry(BRANCH_ID)
    expect(e.state).toBe('empty')
    expect(e.goldOk).toBe(true)
    expect(e.canBuy).toBe(false)
    expect(e.materials.every((m) => !m.ok)).toBe(true)
  })
})

describe('useForgeUpgrades — Wirkungstexte', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('a leaf reads as a percentage of its branch, one level on', () => {
    unlockLeaves()
    const forge = useStarForgeStore()
    forge.leafLevels[LEAF_ID] = 1
    const e = entry(LEAF_ID)
    expect(e.nowText).toBe(`+${FORGE_LEAF_AMPLIFY_PER_LEVEL_PCT}%`)
    expect(e.nextText).toBe(`+${2 * FORGE_LEAF_AMPLIFY_PER_LEVEL_PCT}%`)
    expect(e.desc).toContain(e.parentName)
    expect(e.desc).not.toContain(FORGE_DESC_VALUE_TOKEN)
    expect(e.nextDesc).not.toContain(FORGE_DESC_VALUE_TOKEN)
    expect(e.desc).not.toContain('{p}')
  })

  /**
   * Der Fall, den das Composable ausdrücklich schützt: die Vorschau eines Zweigs
   * rechnet mit demselben Blatt-Verstärker weiter, den `branchEffect` schon
   * trägt. Rechnete sie ohne ihn, zeigte die Karte einen Sprung an, den der Kauf
   * gar nicht auslöst.
   */
  it('a branch preview keeps the leaf amplifier the purchase will keep', () => {
    unlockLeaves()
    const forge = useStarForgeStore()
    const def = getForgeNode(BRANCH_ID)!
    const branchLevel = 2
    const leafLevel = 1
    forge.branchLevels[BRANCH_ID] = branchLevel
    forge.leafLevels[LEAF_ID] = leafLevel

    const amp = 1 + leafLevel * FORGE_LEAF_AMPLIFY_PER_LEVEL
    const e = entry(BRANCH_ID)
    expect(e.nowText).toBe(`+${branchLevel * def.effectPerLevel * amp}%`)
    expect(e.nextText).toBe(`+${(branchLevel + 1) * def.effectPerLevel * amp}%`)
    expect(e.desc).not.toContain(FORGE_DESC_VALUE_TOKEN)
  })
})

describe('useForgeUpgrades — buyUpgrade', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('buys a ray, spends the chimes and reports it', () => {
    fillPurse()
    const solar = useSolarUpgradeStore()
    const game = useGameStore()
    const { buyUpgrade } = useForgeUpgrades()
    const cost = solar.branchCost(ROOT_IDS[0])
    const purse = game.chimes

    expect(buyUpgrade(ROOT_IDS[0])).toBe(true)
    expect(solar.branchLevel(ROOT_IDS[0])).toBe(1)
    expect(game.chimes).toBe(purse - cost)
    expect(useActionToast().message.value).toContain(SOLAR_BRANCHES[0].name)
  })

  it('refuses a ray it cannot pay for and leaves the level alone', () => {
    useGameStore().chimes = 0
    const solar = useSolarUpgradeStore()
    const { buyUpgrade } = useForgeUpgrades()
    expect(buyUpgrade(ROOT_IDS[0])).toBe(false)
    expect(solar.branchLevel(ROOT_IDS[0])).toBe(0)
  })

  it('refuses a capped ray even with a full purse', () => {
    fillPurse()
    setAllRoots(0)
    const solar = useSolarUpgradeStore()
    solar.flightSpeedLevel = 1
    const { buyUpgrade } = useForgeUpgrades()
    expect(buyUpgrade('flightSpeed')).toBe(false)
    expect(solar.flightSpeedLevel).toBe(1)
  })

  it('buys a branch node', () => {
    unlockBranches()
    const forge = useStarForgeStore()
    const { buyUpgrade } = useForgeUpgrades()
    expect(buyUpgrade(BRANCH_ID)).toBe(true)
    expect(forge.nodeLevel(BRANCH_ID)).toBe(1)
    expect(useActionToast().message.value).toContain(getForgeNode(BRANCH_ID)!.name)
  })

  it('refuses a locked node and an id that does not exist', () => {
    unlockBranches()
    useSolarUpgradeStore().starPhase = FORGE_BRANCH_UNLOCK_PHASE - 1
    const forge = useStarForgeStore()
    const { buyUpgrade } = useForgeUpgrades()
    expect(buyUpgrade(BRANCH_ID)).toBe(false)
    expect(forge.nodeLevel(BRANCH_ID)).toBe(0)
    expect(buyUpgrade('nothingLikeThis')).toBe(false)
  })

  /** Der Punkt des ganzen Umbaus: Liste und Baum lesen denselben Bestand. Ein
   *  gecachter Eintrag würde genau hier auseinanderlaufen. */
  it('the entry follows the purchase without being rebuilt', () => {
    unlockBranches()
    const { entryById, buyUpgrade } = useForgeUpgrades()
    const before = entryById.value.get(BRANCH_ID)!
    expect(before.level).toBe(0)
    expect(buyUpgrade(BRANCH_ID)).toBe(true)
    const after = entryById.value.get(BRANCH_ID)!
    expect(after.level).toBe(1)
    expect(after.goldCost).toBeGreaterThan(before.goldCost)
  })
})

describe('useForgeUpgrades — Invarianten', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it.each([
    ['fresh', () => {}],
    ['branches open', unlockBranches],
    ['leaves open', () => unlockLeaves()],
    [
      'everything maxed out',
      () => {
        fillPurse()
        useSolarUpgradeStore().starPhase = FORGE_LEAF_UNLOCK_PHASE
        setAllRoots(SOLAR_MAX_LEVELS)
      },
    ],
  ])('canBuy means affordable and nothing else — %s', (_label, arrange) => {
    arrange()
    const { upgradeEntries } = useForgeUpgrades()
    for (const e of upgradeEntries.value) {
      expect(e.canBuy, `${e.id} is "${e.state}" but canBuy=${e.canBuy}`).toBe(
        e.state === 'affordable',
      )
      expect(e.level).toBeLessThanOrEqual(e.maxLevel)
      expect(e.unlockProgress).toBeGreaterThanOrEqual(0)
      expect(e.unlockProgress).toBeLessThanOrEqual(1)
      // Ein Grund steht nur dort, wo es etwas zu erklären gibt.
      if (e.state !== 'locked' && e.state !== 'capped') expect(e.lockReason).toBe('')
    }
  })
})

/**
 * Die fünf Kernstrahlen waren lange die einzigen Upgrades ohne Materialkosten.
 * Seit `SOLAR_MATERIAL_FROM_LEVEL` verlangen sie ab Lv 4 je ein eigenes
 * Material — die Schwelle ist der ganze Punkt: darunter darf sich am Frühspiel
 * NICHTS geändert haben, weil dort noch kein Kader reist und also nichts fällt.
 */
describe('useForgeUpgrades — Material der Kernstrahlen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('asks for nothing below the threshold', () => {
    fillPurse()
    setAllRoots(SOLAR_MATERIAL_FROM_LEVEL - 2)
    for (const id of ROOT_IDS) expect(entry(id).materials).toEqual([])
  })

  it('asks for its own material from the threshold on', () => {
    fillPurse()
    setAllRoots(SOLAR_MATERIAL_FROM_LEVEL - 1)
    for (const def of SOLAR_BRANCHES) {
      const mats = entry(def.id).materials
      expect(mats).toHaveLength(1)
      expect(mats[0].id).toBe(def.material)
      expect(mats[0].need).toBe(def.materialQty)
    }
  })

  it('scales the quantity with the distance to the threshold', () => {
    const def = SOLAR_BRANCHES[0]
    for (let step = 1; step <= SOLAR_MAX_LEVELS - SOLAR_MATERIAL_FROM_LEVEL + 1; step++) {
      setActivePinia(createPinia())
      fillPurse()
      setAllRoots(SOLAR_MATERIAL_FROM_LEVEL - 1 + (step - 1))
      expect(entry(def.id).materials[0].need).toBe(def.materialQty * step)
    }
  })

  it('refuses a ray with a full purse but an empty store', () => {
    fillPurse()
    useInventoryStore().collectedMaterials = {}
    setAllRoots(SOLAR_MATERIAL_FROM_LEVEL - 1)
    const solar = useSolarUpgradeStore()
    const { buyUpgrade } = useForgeUpgrades()

    const e = entry(ROOT_IDS[0])
    expect(e.goldOk).toBe(true)
    expect(e.canBuy).toBe(false)
    expect(buyUpgrade(ROOT_IDS[0])).toBe(false)
    expect(solar.branchLevel(ROOT_IDS[0])).toBe(SOLAR_MATERIAL_FROM_LEVEL - 1)
  })

  it('spends chimes AND material when both are there', () => {
    fillPurse()
    setAllRoots(SOLAR_MATERIAL_FROM_LEVEL - 1)
    const def = SOLAR_BRANCHES[0]
    const solar = useSolarUpgradeStore()
    const game = useGameStore()
    const inventory = useInventoryStore()
    const { buyUpgrade } = useForgeUpgrades()

    const purse = game.chimes
    const cost = solar.branchCost(def.id)
    const stock = inventory.collectedMaterials[def.material]!

    expect(buyUpgrade(def.id)).toBe(true)
    expect(solar.branchLevel(def.id)).toBe(SOLAR_MATERIAL_FROM_LEVEL)
    expect(game.chimes).toBe(purse - cost)
    expect(inventory.collectedMaterials[def.material]).toBe(stock - def.materialQty)
  })
})
