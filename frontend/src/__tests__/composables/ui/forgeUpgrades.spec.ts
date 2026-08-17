import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  useForgeUpgrades,
  forgeUpgradeBucket,
  forgeLevelParts,
  FORGE_EMPTY_UPGRADE_ENTRY,
} from '@/composables/ui/useForgeUpgrades'
import { useHerald } from '@/composables/ui/useHerald'
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
  FORGE_BOUGH_UNLOCK_PHASE,
  FORGE_BOUGH_PARENT_MIN_LEVEL,
  FORGE_BULK_BUY_CAP,
  FORGE_ENDLESS_SYMBOL,
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

/* Die Kaufquittung liegt seit dem Umbau beim Herold, nicht mehr beim Toast — und
   sein Zustand ist ein Modul-Singleton. Ohne dieses Aufräumen trüge ein Test die
   Meldung des vorigen mit sich, und eine ausgefallene Quittung fiele nicht auf. */
beforeEach(() => {
  useHerald().reset()
})

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

  /**
   * Der Sperrgrund als WERT, nicht als Satz.
   *
   * Daran hängt die Gliederung der Liste: sie setzt je Grund einen eigenen
   * Trenner, weil „warte auf die Sonne" und „lass den Elternknoten wachsen"
   * zwei verschiedene Aufgaben sind. Beide Fälle enden auf `unlockProgress: 0`
   * und einen Satz, der mit „…" anfängt — aus dem Zustand allein sind sie
   * NICHT zu unterscheiden, und genau deshalb steht die Weiche hier.
   */
  it('trennt Phasensperre und Elternsperre als Wert', () => {
    const solar = useSolarUpgradeStore()

    solar.starPhase = FORGE_BRANCH_UNLOCK_PHASE - 1
    setAllRoots(SOLAR_MAX_LEVELS)
    const byPhase = entry(BRANCH_ID)
    expect(byPhase.lockKind).toBe('phase')
    expect(byPhase.lockPhase).toBe(FORGE_BRANCH_UNLOCK_PHASE)

    solar.starPhase = FORGE_BRANCH_UNLOCK_PHASE
    setAllRoots(0)
    const byParent = entry(BRANCH_ID)
    expect(byParent.lockKind).toBe('parent')
    expect(byParent.lockPhase).toBe(-1)
  })

  it('ein offener Knoten trägt gar keine Sperrart', () => {
    unlockBranches()
    const e = entry(BRANCH_ID)
    expect(e.state).not.toBe('locked')
    expect(e.lockKind).toBe('')
    expect(e.lockPhase).toBe(-1)
  })

  /** Ein Kernstrahl kennt diese Sperren nicht — seine Bremse ist `capped`. */
  it('Kernstrahlen tragen nie eine Sperrart', () => {
    useSolarUpgradeStore().starPhase = 0
    expect(entry(ROOT_IDS[0]).lockKind).toBe('')
    expect(entry(ROOT_IDS[0]).lockPhase).toBe(-1)
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
    expect(useHerald().receipts.value.at(-1)?.headline).toBe(SOLAR_BRANCHES[0].name)
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
    expect(useHerald().receipts.value.at(-1)?.headline).toBe(getForgeNode(BRANCH_ID)!.name)
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
 * Die Stufenanzeige.
 *
 * Sie steht seit dem Zeilen-Umbau an ZWEI Stellen gleichzeitig — Upgrade-Zeile
 * und Archiv-Chip — und wird deshalb hier zusammengesetzt statt in jeder
 * Komponente einzeln. Der Fall, der das trägt, ist der Astral Bough:
 * seine Höchststufe ist `Infinity`, und die roh gerendert stünde als
 * „Lv 25 / Infinity" im Bild.
 */
describe('forgeLevelParts — die grosse Zahl', () => {
  it('nennt Stufe und Obergrenze getrennt', () => {
    expect(forgeLevelParts(12, 40)).toEqual({ big: 'Lv 12', max: '/ 40' })
  })

  it('endlose Ringe zeigen das Zeichen statt des rohen Infinity', () => {
    expect(forgeLevelParts(25, Infinity)).toEqual({
      big: 'Lv 25',
      max: `/ ${FORGE_ENDLESS_SYMBOL}`,
    })
  })

  it('Stufe 0 bleibt eine Stufe — kein Sonderfall', () => {
    expect(forgeLevelParts(0, 6).big).toBe('Lv 0')
  })
})

/**
 * In welchen Abschnitt der Liste ein Eintrag fällt.
 *
 * Die Zuordnung ist die eine Regel, an der die Gliederung der Upgrade-Liste
 * hängt — „Kaufbares ganz oben, Fertiges ins Archiv". Sie steht neben den
 * Einträgen und nicht im `computed` der Komponente, damit genau diese Fälle
 * prüfbar sind: die beiden Feinheiten unten ergeben sich aus dem `state`
 * ALLEIN nicht und kippen beim nächsten Umbau still.
 */
describe('forgeUpgradeBucket — welcher Abschnitt', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('bezahlbar → ready', () => {
    fillPurse()
    expect(forgeUpgradeBucket(entry(ROOT_IDS[0]))).toBe('ready')
  })

  it('offen, aber die Kasse ist leer → reach', () => {
    useGameStore().chimes = 0
    expect(forgeUpgradeBucket(entry(ROOT_IDS[0]))).toBe('reach')
  })

  /* Volle Kasse, volles Lager — und trotzdem nicht kaufbar. `state` sagt hier
     'affordable' NICHT, aber gesperrt ist der Zweig auch nicht. */
  it('volle Kasse, aber das Lager ist leer → reach', () => {
    fillPurse()
    useInventoryStore().collectedMaterials = {}
    setAllRoots(SOLAR_MATERIAL_FROM_LEVEL - 1)
    const e = entry(ROOT_IDS[0])
    expect(e.goldOk).toBe(true)
    expect(forgeUpgradeBucket(e)).toBe('reach')
  })

  /* Der Fall, der am ehesten nach 'next' aussieht und es nicht ist: ein
     gedeckelter Strahl ist nicht gesperrt, er wartet auf seine Geschwister —
     und muss seine Kosten weiter zeigen, also eine volle Karte bleiben. */
  it('ein gedeckelter Kernstrahl bleibt bei reach, nicht bei next', () => {
    fillPurse()
    setAllRoots(0)
    useSolarUpgradeStore().flightSpeedLevel = 1
    const e = entry('flightSpeed')
    expect(e.state).toBe('capped')
    expect(forgeUpgradeBucket(e)).toBe('reach')
  })

  it('gesperrt → next', () => {
    fillPurse()
    expect(entry(BRANCH_ID).state).toBe('locked')
    expect(forgeUpgradeBucket(entry(BRANCH_ID))).toBe('next')
  })

  it('ausgewachsen → grown', () => {
    fillPurse()
    setAllRoots(SOLAR_MAX_LEVELS)
    expect(forgeUpgradeBucket(entry(ROOT_IDS[0]))).toBe('grown')
  })

  /* Ring 4 hat keine Obergrenze — ein Bough darf auf keiner Stufe ins Archiv
     wandern, sonst verschwindet im Spätspiel genau das, was dann noch zu
     kaufen ist. */
  it('ein Bough landet auf keiner Stufe im Archiv', () => {
    const forge = useStarForgeStore()
    const boughDef = FORGE_NODES.find((node) => node.tier === 'bough')!
    useSolarUpgradeStore().starPhase = FORGE_BOUGH_UNLOCK_PHASE
    forge.branchLevels[boughDef.parentId] = FORGE_BOUGH_PARENT_MIN_LEVEL

    for (const level of [0, 1, 25, 500]) {
      forge.boughLevels[boughDef.id] = level
      const e = entry(boughDef.id)
      expect(e.maxLevel).toBe(Infinity)
      expect(forgeUpgradeBucket(e), `Lv ${level}`).not.toBe('grown')
    }
  })

  /* Jeder Eintrag fällt in genau einen Topf, und die vier decken den ganzen
     Bestand ab — ein Eintrag ohne Topf wäre aus der Liste verschwunden. */
  it('jeder Eintrag hat genau einen Topf, in jedem Spielstand', () => {
    for (const arrange of [() => {}, unlockBranches, () => unlockLeaves()]) {
      setActivePinia(createPinia())
      arrange()
      const { upgradeEntries } = useForgeUpgrades()
      const seen = new Set<string>()
      for (const e of upgradeEntries.value) {
        const bucket = forgeUpgradeBucket(e)
        expect(['ready', 'reach', 'next', 'grown'], `${e.id} → ${bucket}`).toContain(bucket)
        seen.add(e.id)
      }
      expect(seen.size).toBe(upgradeEntries.value.length)
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

/**
 * Der Stapelkauf ist die einzige Stelle des Shops, die eine Kostenkurve VOR dem
 * Kauf abliest. Sie darf nirgends ein zweites Mal ausgeschrieben stehen — die
 * Vorschau läuft deshalb über `nodeGoldCostAt`/`nodeMaterialCostAt` derselben
 * Stores, aus denen auch der Kauf zahlt. Was hier auseinanderliefe, verspräche
 * dem Spieler eine Zahl, die der Knopf nicht einlöst.
 */
describe('useForgeUpgrades — Stapelkauf', () => {
  const BOUGH_ID = 'wayfarersHoard'
  const BOUGH_PARENT = 'wayfindersCache'

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Phase, Elternstufe und ein Vorrat, der für Ring 4 reicht. */
  function unlockBoughs(): void {
    unlockBranches()
    useSolarUpgradeStore().starPhase = FORGE_BOUGH_UNLOCK_PHASE
    useStarForgeStore().branchLevels[BOUGH_PARENT] = FORGE_BOUGH_PARENT_MIN_LEVEL
  }

  /** Was die nächsten `count` Stufen zusammen kosten — aus dem Store gelesen,
   *  nicht nachgerechnet. */
  function chimesFor(id: string, count: number): number {
    const forge = useStarForgeStore()
    let sum = 0
    for (let i = 0; i < count; i++) sum += forge.nodeGoldCostAt(id, i)
    return sum
  }

  it('zählt 0, solange nichts kaufbar ist', () => {
    const { affordableLevels } = useForgeUpgrades()
    // Frischer Stand: kein Zweig ist freigeschaltet.
    expect(affordableLevels(BRANCH_ID)).toBe(0)
  })

  it('zählt genau so viele Stufen, wie die Chimes decken', () => {
    unlockBoughs()
    const game = useGameStore()
    const { affordableLevels } = useForgeUpgrades()

    const forThree = chimesFor(BOUGH_ID, 3)
    game.chimes = forThree
    expect(affordableLevels(BOUGH_ID)).toBe(3)

    // Ein einziger Chime weniger, und die dritte Stufe fällt weg.
    game.chimes = forThree - 1
    expect(affordableLevels(BOUGH_ID)).toBe(2)
  })

  /** Ring 4 hat keine Obergrenze — ohne den Deckel liefe die Schleife weiter,
   *  solange Chimes da sind, und der Knopf verschluckte den ganzen Bestand. */
  it('deckelt den endlosen Ring bei FORGE_BULK_BUY_CAP', () => {
    unlockBoughs()
    useGameStore().chimes = Number.MAX_SAFE_INTEGER
    expect(useForgeUpgrades().affordableLevels(BOUGH_ID)).toBe(FORGE_BULK_BUY_CAP)
  })

  it('hält an der Höchststufe eines gedeckelten Rings an', () => {
    unlockBranches()
    useSolarUpgradeStore().starPhase = FORGE_BOUGH_UNLOCK_PHASE
    const forge = useStarForgeStore()
    const { affordableLevels } = useForgeUpgrades()
    expect(affordableLevels(BRANCH_ID)).toBe(forge.nodeMaxLevel(BRANCH_ID))
  })

  /** Die Gleichwuchs-Sperre lässt einen Strahl nur EINE Stufe über den
   *  niedrigsten der fünf steigen — Vorrat hin oder her. */
  it('achtet am Kernstrahl auf die Gleichwuchs-Sperre', () => {
    fillPurse()
    setAllRoots(1)
    expect(useForgeUpgrades().affordableLevels(ROOT_IDS[0])).toBe(1)
  })

  it('bricht ab, sobald das Lager nicht mehr deckt', () => {
    unlockBranches()
    useSolarUpgradeStore().starPhase = FORGE_BOUGH_UNLOCK_PHASE
    const forge = useStarForgeStore()
    const inventory = useInventoryStore()
    const { affordableLevels } = useForgeUpgrades()

    // Nur so viel Material, wie die ersten zwei Stufen zusammen verlangen.
    const need = Object.entries(forge.nodeMaterialCostAt(BRANCH_ID, 1)).concat(
      Object.entries(forge.nodeMaterialCostAt(BRANCH_ID, 2)),
    )
    const stock: Record<string, number> = {}
    for (const [matId, qty] of need) stock[matId] = (stock[matId] ?? 0) + qty
    inventory.collectedMaterials = stock

    expect(affordableLevels(BRANCH_ID)).toBe(2)
  })

  it('buyMany kauft höchstens die verlangte Zahl und hält beim ersten Nein an', () => {
    unlockBoughs()
    const game = useGameStore()
    const forge = useStarForgeStore()
    const { buyMany } = useForgeUpgrades()

    game.chimes = chimesFor(BOUGH_ID, 3)
    // Fünf verlangt, drei bezahlbar.
    expect(buyMany(BOUGH_ID, 5)).toBe(3)
    expect(forge.nodeLevel(BOUGH_ID)).toBe(3)
    expect(game.chimes).toBeGreaterThanOrEqual(0)
  })

  it('buyMany meldet EINMAL mit der Spanne, nicht je Stufe', () => {
    unlockBoughs()
    useGameStore().chimes = chimesFor(BOUGH_ID, 3)
    useForgeUpgrades().buyMany(BOUGH_ID, 3)
    // Eine Quittung, die von 0 auf 3 zeigt — und nichts wartet dahinter.
    expect(useHerald().receipts.value.at(-1)?.eyebrow).toContain('LV 0 → 3')
    expect(useHerald().receipts.value.at(-1)?.headline).toBe(getForgeNode(BOUGH_ID)!.name)
  })

  it('buyMany tut bei 0 oder weniger gar nichts', () => {
    unlockBoughs()
    useGameStore().chimes = chimesFor(BOUGH_ID, 3)
    const forge = useStarForgeStore()
    expect(useForgeUpgrades().buyMany(BOUGH_ID, 0)).toBe(0)
    expect(forge.nodeLevel(BOUGH_ID)).toBe(0)
  })

  /** Der Knopf in der Kopfleiste. Je EINE Stufe, günstigster zuerst — und das
   *  Konto darf dabei nie ins Minus laufen. */
  it('buyAllReady kauft je eine Stufe und überzieht nie', () => {
    unlockBranches()
    const game = useGameStore()
    const forge = useStarForgeStore()
    const { upgradeEntries, buyAllReady } = useForgeUpgrades()

    const readyIds = upgradeEntries.value.filter((e) => e.canBuy).map((e) => e.id)
    expect(readyIds.length).toBeGreaterThan(1)

    const bought = buyAllReady()
    expect(bought).toBeGreaterThan(0)
    expect(bought).toBeLessThanOrEqual(readyIds.length)
    expect(game.chimes).toBeGreaterThanOrEqual(0)

    // Keiner der Zweige ist dabei über Stufe 1 hinausgewachsen.
    for (const id of readyIds) {
      if (getForgeNode(id)) expect(forge.nodeLevel(id)).toBeLessThanOrEqual(1)
    }
  })

  it('buyAllReady gibt 0 zurück, wenn nichts bereit ist', () => {
    useGameStore().chimes = 0
    expect(useForgeUpgrades().buyAllReady()).toBe(0)
  })
})

/**
 * Die BEST-BUY-Marke im Baum und die Vorgabe des Detailkopfs lesen denselben
 * Wert. „Günstigster kaufbarer" ist dabei keine Bequemlichkeit: die Wirkungen
 * des Baums stehen in Prozent, HP, Sekunden und Chimes nebeneinander und sind
 * nicht vergleichbar — der Preis ist die einzige Zahl, die alle Knoten teilen.
 */
describe('useForgeUpgrades — bestBuyId', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('ist null, solange nichts kaufbar ist', () => {
    useGameStore().chimes = 0
    expect(useForgeUpgrades().bestBuyId.value).toBeNull()
  })

  it('zeigt auf den günstigsten kaufbaren Eintrag', () => {
    unlockBranches()
    const { upgradeEntries, entryById, bestBuyId } = useForgeUpgrades()

    const id = bestBuyId.value
    expect(id).not.toBeNull()
    const best = entryById.value.get(id!)!
    expect(best.canBuy).toBe(true)
    for (const e of upgradeEntries.value) {
      if (e.canBuy) expect(best.goldCost).toBeLessThanOrEqual(e.goldCost)
    }
  })
})
