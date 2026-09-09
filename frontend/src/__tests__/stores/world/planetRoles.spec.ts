import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  usePlanetShopStore,
  PLANET_ROLES,
  PLANET_ROLES_LIST,
  JUNGLE_BUFF_DEFS,
  CONFIGURABLE_ROLES,
  planetLevelBonusMultiplier,
  computePlanetMaxHp,
  transmuteIntervalTicks,
  transmuteInputFor,
  transmuteTargets,
  isRoleUnlocked,
} from '@/stores/world/planetShopStore'
import type { PlanetRoleType } from '@/stores/world/planetShopStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { planetBonusText } from '@/utils/orbit/planetStatus'
import {
  PLANET_ROLE_UNLOCK,
  PLANET_TRANSMUTE_INPUT_COST,
  PLANET_TRANSMUTE_INTERVAL_TICKS,
  PLANET_DRIFT_WEIR_CAP,
  PLANET_BLESSING_MS,
  PLANET_BLESSING_REARM_MS,
  VOID_TOLL_RELIEF_CAP,
  DWELL_SKIP_PHASE_FRACTION,
  VOID_UNLOCK_LEVEL,
} from '@/config/constants'

/** Ein gekaufter, unversehrter Slot mit Rolle. Direkt gesetzt statt über
 *  `assignRole`, damit auch gesperrte Rollen prüfbar sind. */
function arm(index: number, role: PlanetRoleType, level = 1) {
  const store = usePlanetShopStore()
  const slot = store.slots[index]
  slot.purchased = true
  slot.role = role
  slot.level = level
  slot.maxHp = computePlanetMaxHp(level)
  slot.currentHp = slot.maxHp
  slot.downUntilMs = 0
  slot.jungleBuff = null
  return { store, slot }
}

describe('Planetenrollen — der ganze Katalog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('jede Rolle nennt einen Wirkungstext', () => {
    for (const role of PLANET_ROLES_LIST) {
      expect(planetBonusText(role), `${role.id} ohne Text`).toBeTruthy()
    }
  })

  it('jede Rolle nennt einen Jungle-Buff', () => {
    for (const role of PLANET_ROLES_LIST) {
      const buff = JUNGLE_BUFF_DEFS[role.id]
      expect(buff?.name, `${role.id} ohne Buff`).toBeTruthy()
      expect(buff.multiplier).toBeGreaterThan(1)
      expect(buff.durationMs).toBeGreaterThan(0)
    }
  })

  it('keine zwei Rollen teilen sich Bild, Name oder Farbe', () => {
    const seen = (pick: (r: (typeof PLANET_ROLES_LIST)[number]) => string) =>
      new Set(PLANET_ROLES_LIST.map(pick)).size
    expect(seen((r) => r.image)).toBe(PLANET_ROLES_LIST.length)
    expect(seen((r) => r.name)).toBe(PLANET_ROLES_LIST.length)
    expect(seen((r) => r.color)).toBe(PLANET_ROLES_LIST.length)
  })
})

describe('Tore — eine gesperrte Rolle ist im Store gesperrt, nicht nur im CSS', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('isRoleUnlocked folgt dem Bard-Level', () => {
    expect(isRoleUnlocked('void_bastion', VOID_UNLOCK_LEVEL - 1)).toBe(false)
    expect(isRoleUnlocked('void_bastion', VOID_UNLOCK_LEVEL)).toBe(true)
    // Ungetorte Rollen stehen auf Level 1 offen.
    expect(isRoleUnlocked('turret_planet', 1)).toBe(true)
    expect(isRoleUnlocked('drift_weir', 1)).toBe(true)
  })

  it('assignRole lehnt eine gesperrte Rolle ab und lässt den Slot leer', () => {
    const store = usePlanetShopStore()
    const game = useGameStore()
    game.level = VOID_UNLOCK_LEVEL - 1
    const slot = store.slots[0]
    slot.purchased = true

    store.assignRole(slot.id, 'void_bastion')
    expect(slot.role).toBeNull()

    game.level = VOID_UNLOCK_LEVEL
    store.assignRole(slot.id, 'void_bastion')
    expect(slot.role).toBe('void_bastion')
  })

  it('nur systemgebundene Rollen tragen ein Tor', () => {
    expect(Object.keys(PLANET_ROLE_UNLOCK).sort()).toEqual(['omen_scryer', 'void_bastion'])
  })
})

describe('Bastion — Milderung des Void-Zolls', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('zwei Bastionen kombinieren auf dem REST, nicht additiv', () => {
    const { store } = arm(0, 'void_bastion')
    arm(1, 'void_bastion')
    const single = PLANET_ROLES.void_bastion.bonusPerSlot
    expect(store.planetVoidTollRelief).toBeCloseTo(1 - (1 - single) ** 2, 10)
    expect(store.planetVoidTollRelief).toBeLessThan(single * 2)
  })

  it('ein zerstörter Bastion mildert nichts', () => {
    const { store, slot } = arm(0, 'void_bastion')
    expect(store.planetVoidTollRelief).toBeGreaterThan(0)
    store.takeDamage(slot.id, slot.maxHp)
    expect(store.planetVoidTollRelief).toBe(0)
  })

  it('der gemeinsame Deckel greift über Forge UND Planeten zusammen', () => {
    for (let i = 0; i < 6; i++) arm(i, 'void_bastion', 60)
    const store = usePlanetShopStore()
    const voidStore = useVoidStore()
    // Sechs Bastionen auf Endstufe reissen den Rest praktisch auf null —
    // gemessen liegt die Milderung dann GENAU auf dem gemeinsamen Deckel.
    expect(store.planetVoidTollRelief).toBeGreaterThan(0.99)
    expect(voidStore.tollRelief).toBeCloseTo(VOID_TOLL_RELIEF_CAP, 10)
  })
})

describe('Crucible — umschmelzen statt fördern', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('transmuteTargets lässt die unterste Stufe aus — darunter liegt nichts', () => {
    expect(transmuteTargets().some((m) => m.rarity === 'common')).toBe(false)
    expect(transmuteTargets().length).toBeGreaterThan(0)
  })

  it('transmuteInputFor nimmt den grössten Bestand der Stufe darunter', () => {
    const stock = { stardust: 10, moon_crystal: 99 }
    expect(transmuteInputFor('nebula_quartz', stock)).toEqual({
      materialId: 'moon_crystal',
      qty: PLANET_TRANSMUTE_INPUT_COST,
    })
  })

  it('transmuteInputFor gibt null ohne ausreichenden Bestand', () => {
    expect(transmuteInputFor('nebula_quartz', { stardust: 1 })).toBeNull()
    expect(transmuteInputFor('nebula_quartz', {})).toBeNull()
  })

  it('ein common-Ziel hat keine Stufe darunter', () => {
    expect(transmuteInputFor('stardust', { stardust: 999 })).toBeNull()
  })

  it('der Takt schrumpft mit dem Level', () => {
    expect(transmuteIntervalTicks(1)).toBe(PLANET_TRANSMUTE_INTERVAL_TICKS)
    expect(transmuteIntervalTicks(30)).toBeLessThan(transmuteIntervalTicks(1))
    expect(transmuteIntervalTicks(200)).toBeGreaterThanOrEqual(1)
  })

  it('tickTransmute bucht Einsatz ab und Ziel gut', () => {
    const { store, slot } = arm(0, 'transmuter')
    slot.slotConfig = { materialId: 'nebula_quartz' }
    const inventory = useInventoryStore()
    inventory.collectedMaterials = { stardust: 10 }

    store.tickTransmute(transmuteIntervalTicks(1))
    expect(inventory.collectedMaterials.stardust).toBe(10 - PLANET_TRANSMUTE_INPUT_COST)
    expect(inventory.collectedMaterials.nebula_quartz).toBe(1)
  })

  it('zu kleiner Bestand lässt alles unangetastet — keine Schuld, kein Minus', () => {
    const { store, slot } = arm(0, 'transmuter')
    slot.slotConfig = { materialId: 'nebula_quartz' }
    const inventory = useInventoryStore()
    inventory.collectedMaterials = { stardust: PLANET_TRANSMUTE_INPUT_COST - 1 }

    store.tickTransmute(transmuteIntervalTicks(1))
    expect(inventory.collectedMaterials.stardust).toBe(PLANET_TRANSMUTE_INPUT_COST - 1)
    expect(inventory.collectedMaterials.nebula_quartz ?? 0).toBe(0)
  })

  it('ohne gesetztes Ziel läuft der Crucible nicht', () => {
    const { store } = arm(0, 'transmuter')
    const inventory = useInventoryStore()
    inventory.collectedMaterials = { stardust: 99 }
    expect(store.activeTransmuteSlots).toHaveLength(0)
    store.tickTransmute(transmuteIntervalTicks(1))
    expect(inventory.collectedMaterials.stardust).toBe(99)
  })

  it('der Crucible braucht wie Harvester und Resonator eine Konfiguration', () => {
    expect(CONFIGURABLE_ROLES).toContain('transmuter')
  })
})

describe('Meridian — Verweildauer wegbrennen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mehrere Spiere addieren ihre Millisekunden', () => {
    const { store } = arm(0, 'meridian_spire')
    expect(store.dwellBurnMsPerTick).toBeCloseTo(PLANET_ROLES.meridian_spire.bonusPerSlot, 6)
    arm(1, 'meridian_spire')
    expect(store.dwellBurnMsPerTick).toBeCloseTo(PLANET_ROLES.meridian_spire.bonusPerSlot * 2, 6)
  })

  it('das Level hebt den Brand', () => {
    const { store } = arm(0, 'meridian_spire', 11)
    expect(store.dwellBurnMsPerTick).toBeCloseTo(
      PLANET_ROLES.meridian_spire.bonusPerSlot * planetLevelBonusMultiplier(11),
      6,
    )
  })

  it('tickDwellBurn läuft gegen den gemeinsamen Phasendeckel', () => {
    const { store } = arm(0, 'meridian_spire', 60)
    const solar = useSolarUpgradeStore()
    const budget = solar.phaseDwellRequiredMs * DWELL_SKIP_PHASE_FRACTION

    // Weit mehr Takte als das Budget je hergibt.
    for (let i = 0; i < 5000; i++) store.tickDwellBurn()
    expect(solar.phaseDwellSkippedMs).toBeLessThanOrEqual(budget + 1e-6)
  })

  it('ohne Meridian passiert nichts', () => {
    const store = usePlanetShopStore()
    const solar = useSolarUpgradeStore()
    store.tickDwellBurn()
    expect(solar.phaseDwellSkippedMs).toBe(0)
  })
})

describe('Scryer — eine Zahl, zwei Wirkungen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mehrere Scryer multiplizieren sich', () => {
    const { store } = arm(0, 'omen_scryer')
    const one = 1 + PLANET_ROLES.omen_scryer.bonusPerSlot
    expect(store.planetOmenBoonMultiplier).toBeCloseTo(one, 10)
    arm(1, 'omen_scryer')
    expect(store.planetOmenBoonMultiplier).toBeCloseTo(one * one, 10)
  })

  it('ohne Scryer ist der Faktor neutral', () => {
    expect(usePlanetShopStore().planetOmenBoonMultiplier).toBe(1)
  })
})

describe('Weir — einholen statt verlieren', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mehrere Weire kombinieren auf der Gegenwahrscheinlichkeit', () => {
    const { store } = arm(0, 'drift_weir')
    const c = PLANET_ROLES.drift_weir.bonusPerSlot
    expect(store.planetDrifterCatchChance).toBeCloseTo(c, 10)
    arm(1, 'drift_weir')
    expect(store.planetDrifterCatchChance).toBeCloseTo(1 - (1 - c) ** 2, 10)
  })

  it('die Chance erreicht nie 1 — sonst wäre der Klick entwertet', () => {
    for (let i = 0; i < 6; i++) arm(i, 'drift_weir', 60)
    const store = usePlanetShopStore()
    expect(store.planetDrifterCatchChance).toBeLessThanOrEqual(PLANET_DRIFT_WEIR_CAP)
    expect(PLANET_DRIFT_WEIR_CAP).toBeLessThan(1)
  })

  it('ohne Weir wird nichts eingeholt', () => {
    expect(usePlanetShopStore().planetDrifterCatchChance).toBe(0)
  })
})

describe('Obelisk — der Planet segnet den Champion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('ein unbekannter Champion trägt keinen Segen', () => {
    expect(usePlanetShopStore().blessingMultOf('Bard')).toBe(1)
  })

  it('blessChampion setzt den Segen des Slots', () => {
    const { store, slot } = arm(0, 'orbit_obelisk')
    store.blessChampion(slot.id, 'Lux')
    expect(store.blessingMultOf('Lux')).toBeCloseTo(
      1 + PLANET_ROLES.orbit_obelisk.bonusPerSlot,
      10,
    )
  })

  it('die Sperrzeit ist länger als die Wirkung', () => {
    expect(PLANET_BLESSING_REARM_MS).toBeGreaterThan(PLANET_BLESSING_MS)
  })

  it('derselbe Obelisk segnet innerhalb der Sperrzeit kein zweites Mal', () => {
    const { store, slot } = arm(0, 'orbit_obelisk')
    store.blessChampion(slot.id, 'Lux')
    const armed = store.blessRearm[slot.id]
    store.blessChampion(slot.id, 'Ahri')
    expect(store.blessRearm[slot.id]).toBe(armed)
    expect(store.blessingMultOf('Ahri')).toBe(1)
  })

  it('ein zerstörter Obelisk segnet nicht', () => {
    const { store, slot } = arm(0, 'orbit_obelisk')
    store.takeDamage(slot.id, slot.maxHp)
    store.blessChampion(slot.id, 'Lux')
    expect(store.blessingMultOf('Lux')).toBe(1)
  })

  it('ein stärkerer Segen verdrängt den schwächeren', () => {
    const { store, slot: weak } = arm(0, 'orbit_obelisk', 1)
    const { slot: strong } = arm(1, 'orbit_obelisk', 40)
    store.blessChampion(weak.id, 'Lux')
    const low = store.blessingMultOf('Lux')
    store.blessChampion(strong.id, 'Lux')
    expect(store.blessingMultOf('Lux')).toBeGreaterThan(low)
  })
})
