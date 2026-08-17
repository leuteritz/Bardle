// frontend/src/stores/world/planetShopStore.ts
import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { logger } from '@/utils/logger'
import {
  PLANET_SLOT_ORBITS,
  PLANET_HARVEST_INTERVAL_TICKS,
  PLANET_SLOT_MAX_HP,
  STAR_PHASE_DATA,
  COMET_STAGE_RADII,
  PLANET_SLOT_SUN_PHASE_REQUIREMENTS,
  BOSS_DAMAGE_REDUCTION_CAP,
  PLANET_LEVEL_BONUS_PCT,
  PLANET_LEVEL_HP_PCT,
  PLANET_LEVEL_COST_FACTOR,
  PLANET_LEVEL_COST_MULTIPLIER,
  PLANET_LEVELS_PER_PHASE,
  PLANET_LEVEL_MAX_PHASE,
  PLANET_MILESTONE_INTERVAL,
  PLANET_MILESTONE_BONUS,
  PLANET_MAX_BULK_LEVELS,
  PLANET_RANK_TIERS,
  PLANET_RESPAWN_MS,
  PLANET_SLOT_CONFIG as SLOT_CONFIG,
  PLANET_ROLES,
} from '@/config/constants'
// Rollen- und Buff-Tabellen leben in config/constants.ts; hier nur noch
// weitergereicht, damit die bestehenden Importpfade gültig bleiben.
export { PLANET_ROLES, PLANET_ROLES_LIST, JUNGLE_BUFF_DEFS } from '@/config/constants'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { getOrbitSunRadius, getOrbitSunScale } from '@/utils/orbit/geometry'
import { gameNow } from '@/utils/game/gameClock'
import { playerSlotInForeground } from '@/utils/orbit/foregroundGate'
import { logPlanetDestroyed, logPlanetRestored } from '@/config/ui/eventLog'
import type { PlanetRoleType, JungleBuffDef } from '@/types'
// Typen liegen zentral in types/; hier weitergereicht für die bisherigen Importpfade.
export type { PlanetRole, PlanetRoleType, JungleBuffDef } from '@/types'

export interface JungleBuff {
  active: boolean
  buffType: string
  multiplier: number
  activeUntil: number
}

export interface PlanetSlot {
  id: string
  purchased: boolean
  role: PlanetRoleType | null
  orbitRadiusX: number
  orbitRadiusY: number
  tiltDeg: number
  baseSpeed: number
  direction: 1 | -1
  baseCost: number
  level: number
  slotConfig?: { materialId?: string; buildingId?: string }
  currentHp: number
  maxHp: number
  healingUntilMs: number
  /** Zeitpunkt, ab dem ein zerstörter Planet zurückkehrt (0 = intakt). */
  downUntilMs: number
  jungleBuff: JungleBuff | null
}

/** Planet zerstört und noch in der Ausfallzeit? */
export function isPlanetDown(slot: Pick<PlanetSlot, 'downUntilMs'>): boolean {
  return slot.downUntilMs > 0
}

/** Anzeigename eines Slots — Rollenname, solange eine Rolle gewählt ist. */
function planetLabel(slot: PlanetSlot): string {
  return slot.role ? PLANET_ROLES[slot.role].name : slot.id.replace('slot_', 'Slot ')
}

// ── Attunement (per-planet leveling) helpers ───────────────────────────────
// Pure functions, exported for reuse in tests + UI.

// Number of milestone perks reached at a given level (every Nth level).
export function planetMilestoneCount(level: number): number {
  return Math.floor(level / PLANET_MILESTONE_INTERVAL)
}

export function planetLevelBonusMultiplier(level: number): number {
  return (
    1 + (level - 1) * PLANET_LEVEL_BONUS_PCT + planetMilestoneCount(level) * PLANET_MILESTONE_BONUS
  )
}

// Highest rank tier whose `min` is <= level.
export function planetRankTier(level: number): { min: number; name: string; color: string } {
  let tier = PLANET_RANK_TIERS[0]
  for (const t of PLANET_RANK_TIERS) {
    if (level >= t.min) tier = t
  }
  return tier
}

export function computePlanetMaxHp(level: number): number {
  return Math.round(PLANET_SLOT_MAX_HP * (1 + (level - 1) * PLANET_LEVEL_HP_PCT))
}

export function planetLevelUpCost(slot: Pick<PlanetSlot, 'baseCost' | 'level'>): number {
  return Math.ceil(
    slot.baseCost * PLANET_LEVEL_COST_FACTOR * PLANET_LEVEL_COST_MULTIPLIER ** (slot.level - 1),
  )
}

export function planetLevelRequiredPhase(nextLevel: number): number {
  return Math.min(PLANET_LEVEL_MAX_PHASE, Math.floor((nextLevel - 1) / PLANET_LEVELS_PER_PHASE))
}

/**
 * Erntetakt eines Harvesters in Ticks — je höher sein Level, desto dichter.
 *
 * Die Rolle heisst `harvest_node` und trägt `bonusType: 'material_harvest_rate'`,
 * aber der Takt war eine feste Zahl: ein Harvester auf Level 60 lieferte exakt
 * so viel wie auf Level 1, nämlich eine Einheit alle 30 Sekunden. Das Versprechen
 * der Rolle war unerfüllt, und die Folge war im Messlauf sichtbar — Material ist
 * der Taktgeber der Galaxie-Achse, und JEDE späte Blockade über 24 Spielstunden
 * war das Tier-Tor mit fehlendem Material bei gleichzeitig dreitausendfach
 * übererfüllten Chimes.
 *
 * Level 1 ergibt weiter genau 30 Ticks — das Frühspiel ändert sich nicht.
 * Level 12 kommt auf 14, Level 60 auf 5. Damit wird aus einer Wartezeit ein
 * Sparziel: wer Chimes in Planetenlevel steckt, kommt schneller ans nächste
 * Tier. Und weil ein Slot entweder erntet oder Bosse beschiesst, ist es eine
 * echte Entscheidung.
 */
export function harvestIntervalTicks(level: number, forgeMult = 1): number {
  const rate = 1 + Math.max(0, level - 1) * PLANET_LEVEL_BONUS_PCT
  return Math.max(1, Math.ceil((PLANET_HARVEST_INTERVAL_TICKS / rate) * forgeMult))
}

const INITIAL_SLOTS: PlanetSlot[] = PLANET_SLOT_ORBITS.map((orbit, i) => ({
  ...SLOT_CONFIG[i],
  purchased: false,
  role: null,
  level: 1,
  orbitRadiusX: orbit.rx,
  orbitRadiusY: orbit.ry,
  tiltDeg: orbit.tiltDeg,
  currentHp: PLANET_SLOT_MAX_HP,
  maxHp: PLANET_SLOT_MAX_HP,
  healingUntilMs: 0,
  downUntilMs: 0,
  jungleBuff: null,
}))

const CONFIGURABLE_ROLES: PlanetRoleType[] = ['harvest_node', 'resonance_tower']

// ── Turret-Salve ────────────────────────────────────────────────────────────
// Drei Getter bilden inzwischen eine Salve: die rohe Zahl für den Stats-Katalog,
// die auf den Vordergrund gefilterte für den Planetenkampf und die ungefilterte
// für einen Void-Riss. Basis und Faktoren stehen deshalb EINMAL hier — als drei
// Abschriften wäre der nächste Faktor garantiert nur in zweien angekommen.

/** Summe der stehenden Turrets, optional auf eine Teilmenge gefiltert. */
function sumTurretBase(slots: PlanetSlot[], extraFilter?: (id: string) => boolean): number {
  return slots
    .filter(
      (s) =>
        s.purchased &&
        s.role === 'turret_planet' &&
        !isPlanetDown(s) &&
        (!extraFilter || extraFilter(s.id)),
    )
    .reduce((sum, slot) => {
      const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
      return (
        sum + PLANET_ROLES.turret_planet.bonusPerSlot * planetLevelBonusMultiplier(slot.level) * mul
      )
    }, 0)
}

/** Was dauerhaft verdient wurde — steht in JEDER der drei Zahlen, auch in der
 *  rohen, weil es kein befristeter Buff ist. */
function permanentVolleyMult(): number {
  return useAchievementStore().turretDpsMult * useProvidenceStore().turretDpsMult
}

/** Was gerade läuft und wieder vergeht. Bewusst NICHT in `autoAttackDPS` —
 *  die Zahl im Stats-Katalog soll nicht im Sekundentakt springen. */
function timedVolleyMult(): number {
  return (
    useDrifterStore().combatDpsMult *
    useOmenStore().combatDpsMult *
    useBardAbilityStore().combatDpsMult *
    // Dimming Wound (void tide): ein offener Riss dämpft auch die Salve
    useVoidStore().combatDpsMult
  )
}

export const usePlanetShopStore = defineStore('planetShop', {
  state: () => ({
    slots: INITIAL_SLOTS.map((s) => ({ ...s })) as PlanetSlot[],
    activeRoleModalSlotId: null as string | null,
  }),

  getters: {
    currentSunStage(): number {
      return useSolarUpgradeStore().starPhase
    },

    currentSunRadius(): number {
      const solar = useSolarUpgradeStore()
      return solar.isCometState
        ? COMET_STAGE_RADII[solar.cometStage]
        : STAR_PHASE_DATA[solar.starPhase].radius
    },

    /** Dampened radius driving orbit visuals — grows slower than the sun above comet size. */
    orbitSunRadius(): number {
      return getOrbitSunRadius(this.currentSunRadius)
    },

    /** Orbit scale factor (dampened radius relative to reference SUN_RADIUS). */
    orbitSunScale(): number {
      return getOrbitSunScale(this.currentSunRadius)
    },

    purchasedSlots(state): PlanetSlot[] {
      return state.slots.filter((s) => s.purchased)
    },

    activeSlots(state): PlanetSlot[] {
      return state.slots.filter((s) => s.purchased && s.role !== null)
    },

    /** Rohe Salvenstärke aller stehenden Turrets — ohne die ZEITLICHEN Buffs
     *  (die tragen die beiden Getter darunter), aber MIT dem Chronicle-Bonus:
     *  der ist dauerhaft verdient und gehört damit in die Zahl, die als „Orbit
     *  Auto-Attack DPS" im Stats-Katalog steht. */
    autoAttackDPS(state): number {
      return sumTurretBase(state.slots) * permanentVolleyMult()
    },

    /** DPS nur der Turrets im Sonnen-Vordergrund — Turrets hinter der Sonne
     *  feuern nicht (Kampf passiert nur im Vordergrund). Ein eingesammeltes
     *  Rift Echo (Drifter) hebt die ganze Salve für seine Laufzeit an. */
    foregroundAutoAttackDPS(state): number {
      return (
        sumTurretBase(state.slots, playerSlotInForeground) *
        timedVolleyMult() *
        permanentVolleyMult()
      )
    },

    /**
     * Die Salve, die auf einen Void-Riss geht: ALLE stehenden Turrets, nicht
     * nur die im Vordergrund.
     *
     * Ein Riss ist kein Punkt auf einer Bahn, den man umkreisen muss — er
     * klafft im ganzen System. Ein Turret, das diese Sekunde hinter der Sonne
     * steht, feuert trotzdem hinein. Die Zeitfaktoren trägt er wie jede andere
     * Salve, den Void-Drain eingeschlossen: ein Riss, der die Salve schwächt,
     * schwächt auch die Salve, die ihn schliessen soll.
     */
    riftAutoAttackDPS(state): number {
      return sumTurretBase(state.slots) * timedVolleyMult() * permanentVolleyMult()
    },

    activeHarvestSlots(state): { materialId: string; intervalTicks: number }[] {
      return state.slots
        .filter(
          (s) =>
            s.purchased &&
            s.role === 'harvest_node' &&
            !isPlanetDown(s) &&
            s.slotConfig?.materialId,
        )
        .map((s) => ({
          materialId: s.slotConfig!.materialId!,
          // Quarrymaster's Eye (Star Forge) beschleunigt jeden Harvester —
          // dieselbe Zahl wie das Planeten-Level, nur aus dem Baum. Der Faktor
          // kommt vom AUFRUFER und steht nicht in der Funktion: `harvestIntervalTicks`
          // ist eine reine Funktion und wird als solche in einer Spec geprüft.
          intervalTicks: harvestIntervalTicks(s.level, useStarForgeStore().harvestIntervalMult),
        }))
    },

    planetExpeditionRewardMultiplier(state): number {
      return state.slots
        .filter((s) => s.purchased && s.role === 'expedition_relay' && !isPlanetDown(s))
        .reduce((prod, slot) => {
          const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
          return (
            prod *
            (1 +
              PLANET_ROLES.expedition_relay.bonusPerSlot *
                planetLevelBonusMultiplier(slot.level) *
                mul)
          )
        }, 1)
    },

    planetBossDamageReduction(state): number {
      const total = state.slots
        .filter((s) => s.purchased && s.role === 'shield_barrier' && !isPlanetDown(s))
        .reduce((sum, slot) => {
          const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
          return (
            sum +
            PLANET_ROLES.shield_barrier.bonusPerSlot * planetLevelBonusMultiplier(slot.level) * mul
          )
        }, 0)
      return Math.min(BOSS_DAMAGE_REDUCTION_CAP, total)
    },

    planetOfflineBoostMultiplier(state): number {
      return state.slots
        .filter((s) => s.purchased && s.role === 'time_capsule' && !isPlanetDown(s))
        .reduce((prod, slot) => {
          const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
          return (
            prod *
            (1 +
              PLANET_ROLES.time_capsule.bonusPerSlot * planetLevelBonusMultiplier(slot.level) * mul)
          )
        }, 1)
    },

    resonanceTowerBuildingMultipliers(state): Record<string, number> {
      const result: Record<string, number> = {}
      for (const slot of state.slots) {
        if (
          slot.purchased &&
          slot.role === 'resonance_tower' &&
          !isPlanetDown(slot) &&
          slot.slotConfig?.buildingId
        ) {
          const bId = slot.slotConfig.buildingId
          const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
          result[bId] =
            (result[bId] ?? 1) *
            (1 +
              PLANET_ROLES.resonance_tower.bonusPerSlot *
                planetLevelBonusMultiplier(slot.level) *
                mul)
        }
      }
      return result
    },

    /** Purchased, role-assigned slots whose next level is affordable right now
     *  (Sun-Phase met + enough Chimes). Drives the planet-tab notify badges
     *  (header tab badge + footer Level-Up badge). Logic is inlined (not via the
     *  canLevelUpPlanet action) so the reactive chimes/phase reads are tracked
     *  by this getter's computed and the badge updates live. */
    affordableUpgradeCount(state): number {
      const starPhase = useSolarUpgradeStore().starPhase
      const chimes = useGameStore().chimes
      return state.slots.filter(
        (s) =>
          s.purchased &&
          !!s.role &&
          starPhase >= planetLevelRequiredPhase(s.level + 1) &&
          chimes >= planetLevelUpCost(s),
      ).length
    },

    /** TOTAL number of level-ups affordable right now, summed across all six
     *  orbit slots (each evaluated with the full chimes budget — mirrors the
     *  per-slot sidebar notify counts so the header total equals their sum).
     *  Drives the middle-header planet notify badge. Inlined for live reactive
     *  tracking of chimes/phase, same as `affordableUpgradeCount`. */
    affordableLevelCount(state): number {
      const starPhase = useSolarUpgradeStore().starPhase
      const chimes = useGameStore().chimes
      let total = 0
      for (const s of state.slots) {
        if (!s.purchased || !s.role) continue
        let budget = chimes
        let level = s.level
        let count = 0
        while (count < PLANET_MAX_BULK_LEVELS) {
          if (starPhase < planetLevelRequiredPhase(level + 1)) break
          const cost = planetLevelUpCost({ baseCost: s.baseCost, level })
          if (budget < cost) break
          budget -= cost
          level++
          count++
        }
        total += count
      }
      return total
    },
  },

  actions: {
    getSlot(slotId: string): PlanetSlot | undefined {
      return this.slots.find((s) => s.id === slotId)
    },

    getSlotCost(slotId: string): number {
      const slot = this.getSlot(slotId)
      if (!slot) return Infinity
      const gameStore = useGameStore()
      const costMul = gameStore.activeModifier.buildingCostMultiplier ?? 1
      return Math.ceil(slot.baseCost * costMul)
    },

    canAffordSlot(slotId: string): boolean {
      const gameStore = useGameStore()
      return gameStore.chimes >= this.getSlotCost(slotId)
    },

    canUnlockPlanetSlot(slotIndex: number): boolean {
      const slot = this.slots[slotIndex]
      if (!slot) return false
      if (!this.canAffordSlot(slot.id)) return false
      const solarStore = useSolarUpgradeStore()
      // A comet has no planetary system — slot 1 requires phase 0 (Spark),
      // which only counts once the comet has ignited into a star.
      if (solarStore.isCometState) return false
      const requiredPhase = PLANET_SLOT_SUN_PHASE_REQUIREMENTS[slotIndex] ?? slotIndex
      return solarStore.starPhase >= requiredPhase
    },

    getSlotRequiredPhase(slotIndex: number): number {
      return PLANET_SLOT_SUN_PHASE_REQUIREMENTS[slotIndex] ?? slotIndex
    },

    // ── Attunement leveling ──────────────────────────────────────────────
    getPlanetLevelUpCost(slotId: string): number {
      const slot = this.getSlot(slotId)
      if (!slot) return Infinity
      return planetLevelUpCost(slot)
    },

    getPlanetLevelRequiredPhase(slotId: string): number {
      const slot = this.getSlot(slotId)
      if (!slot) return PLANET_LEVEL_MAX_PHASE
      return planetLevelRequiredPhase(slot.level + 1)
    },

    canLevelUpPlanet(slotId: string): boolean {
      return this.planetLevelUpBlockReason(slotId) === null
    },

    planetLevelUpBlockReason(slotId: string): 'phase' | 'chimes' | null {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return 'phase'
      if (useSolarUpgradeStore().starPhase < this.getPlanetLevelRequiredPhase(slotId))
        return 'phase'
      if (useGameStore().chimes < planetLevelUpCost(slot)) return 'chimes'
      return null
    },

    levelUpPlanet(slotId: string): boolean {
      return this.levelUpPlanetTimes(slotId, 1) > 0
    },

    // Attune a slot up to `maxCount` times, stopping at the chimes/phase gate.
    // Returns the number of levels actually gained. CPS/CPC recomputed once.
    levelUpPlanetTimes(slotId: string, maxCount: number): number {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return 0

      const gameStore = useGameStore()
      let gained = 0
      const limit = Math.min(maxCount, PLANET_MAX_BULK_LEVELS)

      while (gained < limit && this.canLevelUpPlanet(slotId)) {
        const cost = planetLevelUpCost(slot)
        gameStore.chimes -= cost
        slot.level += 1

        // Grow max HP and heal by the delta so level-ups are visibly rewarding.
        const prevMaxHp = slot.maxHp
        slot.maxHp = computePlanetMaxHp(slot.level)
        slot.currentHp = Math.min(slot.maxHp, slot.currentHp + (slot.maxHp - prevMaxHp))
        gained++
      }

      if (gained > 0) {
        // Level affects role bonuses (incl. resonance CPS) → recompute production.
        const shopStore = useShopStore()
        gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
        gameStore.chimesPerClick = shopStore.calculateTotalCPC()
        logger.info('Planet', `Slot ${slotId} attuned +${gained} → level ${slot.level}`)
      }
      return gained
    },

    // How many levels the player can currently afford (respecting the phase gate).
    getMaxAffordableLevelCount(slotId: string): number {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return 0

      const starPhase = useSolarUpgradeStore().starPhase
      let budget = useGameStore().chimes
      let level = slot.level
      let count = 0

      while (count < PLANET_MAX_BULK_LEVELS) {
        if (starPhase < planetLevelRequiredPhase(level + 1)) break
        const cost = planetLevelUpCost({ baseCost: slot.baseCost, level })
        if (budget < cost) break
        budget -= cost
        level++
        count++
      }
      return count
    },

    // Total chimes to attune the next `count` levels of a slot.
    getBulkLevelUpCost(slotId: string, count: number): number {
      const slot = this.getSlot(slotId)
      if (!slot) return Infinity
      let total = 0
      for (let i = 0; i < count; i++) {
        total += planetLevelUpCost({ baseCost: slot.baseCost, level: slot.level + i })
      }
      return total
    },

    buySlot(slotId: string): boolean {
      const slot = this.getSlot(slotId)
      if (!slot || slot.purchased) return false

      const slotIndex = this.slots.findIndex((s) => s.id === slotId)
      if (!this.canUnlockPlanetSlot(slotIndex)) return false

      const gameStore = useGameStore()
      const cost = this.getSlotCost(slotId)
      if (gameStore.chimes < cost) return false

      gameStore.chimes -= cost
      slot.purchased = true
      slot.level = 1
      slot.maxHp = computePlanetMaxHp(slot.level)
      slot.currentHp = slot.maxHp

      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      logger.info('Planet', `Orbit-Slot ${slotId} gekauft`, { cost })

      this.openRoleModal(slotId)
      return true
    },

    assignRole(slotId: string, role: PlanetRoleType | null): void {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return
      // Permanent choice: a planet type can only ever be set once (null → role).
      if (slot.role !== null) return

      const prev = slot.role
      slot.role = role
      slot.slotConfig = undefined

      const gameStore = useGameStore()
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      logger.info('Planet', `Role of ${slotId} changed: ${prev ?? 'none'} → ${role ?? 'none'}`)

      if (role !== null && CONFIGURABLE_ROLES.includes(role)) return
    },

    setSlotConfig(slotId: string, config: { materialId?: string; buildingId?: string }): void {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return

      slot.slotConfig = { ...config }

      if (slot.role === 'resonance_tower') {
        const gameStore = useGameStore()
        const shopStore = useShopStore()
        gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      }

      logger.info('Planet', `Slot config for ${slotId} set`, config)
      this.closeRoleModal()
    },

    tickHarvest(inGameTime: number): void {
      const harvestSlots = this.activeHarvestSlots
      if (harvestSlots.length === 0) return

      // Jeder Slot hat seinen EIGENEN Takt (siehe harvestIntervalTicks) — der
      // gemeinsame Modulo-Test von früher konnte das nicht abbilden.
      const inventoryStore = useInventoryStore()
      let harvested = 0
      for (const { materialId, intervalTicks } of harvestSlots) {
        if (inGameTime % intervalTicks !== 0) continue
        inventoryStore.addMaterial(materialId, 'harvest')
        harvested++
      }
      if (harvested > 0) {
        logger.info('Planet', `Harvest-Tick: ${harvested} Materialien geerntet`)
      }
    },

    openRoleModal(slotId: string): void {
      this.activeRoleModalSlotId = slotId
    },

    closeRoleModal(): void {
      this.activeRoleModalSlotId = null
    },

    takeDamage(slotId: string, amount: number): void {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased || isPlanetDown(slot)) return
      slot.currentHp = Math.max(0, slot.currentHp - amount)
      if (slot.currentHp > 0) return

      // Zerstört: Der Planet verlässt den Orbit, sein Rollen-Bonus fällt aus und
      // er ist kein Ziel mehr. tickRespawn holt ihn mit vollen HP zurück.
      slot.downUntilMs = gameNow() + PLANET_RESPAWN_MS
      slot.jungleBuff = null
      logPlanetDestroyed(planetLabel(slot), PLANET_RESPAWN_MS / 1000)
    },

    /**
     * Abnutzung durch eine Void-Berührung — der EINZIGE Schaden im Spiel, an
     * dem ein Planet nicht sterben kann.
     *
     * Der Boden bei 1 HP ist keine Milde, sondern die Regel, die eine Spirale
     * bricht: ein zerstörter Planet fällt aus `riftAutoAttackDPS`, also stirbt
     * weniger Void, also kommen mehr durch, also fallen weitere Planeten — und
     * anders als beim Boss kann man dem nicht ausweichen, denn zwei Dutzend
     * Wesen wandern quer durch alle sechs Bahnen. Der Void tötet die SONNE; die
     * Planeten sind das Gelände, das er dabei abträgt. Damit bekommt Supports
     * Planetenheilung nebenbei eine Daueraufgabe.
     *
     * @returns Was tatsächlich abgezogen wurde — der Aufrufer zeigt diese Zahl.
     */
    takeVoidChip(slotId: string, amount: number): number {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased || isPlanetDown(slot) || amount <= 0) return 0
      const dealt = Math.min(amount, Math.max(0, slot.currentHp - 1))
      if (dealt <= 0) return 0
      slot.currentHp -= dealt
      return dealt
    },

    /** Abgelaufene Ausfallzeiten beenden — pro Game-Tick aufgerufen. */
    tickRespawn(): void {
      const now = gameNow()
      for (const slot of this.slots) {
        if (slot.downUntilMs === 0 || now < slot.downUntilMs) continue
        slot.downUntilMs = 0
        slot.maxHp = computePlanetMaxHp(slot.level)
        slot.currentHp = slot.maxHp
        slot.healingUntilMs = 0
        logPlanetRestored(planetLabel(slot))
      }
    },

    healSlot(slotId: string, amount: number): void {
      const slot = this.getSlot(slotId)
      // Ein zerstörter Planet ist nicht heilbar — er kommt erst nach seiner
      // Ausfallzeit zurück, sonst könnte Support den Tod sofort aufheben.
      if (!slot || !slot.purchased || isPlanetDown(slot)) return
      slot.currentHp = Math.min(slot.maxHp, slot.currentHp + amount)
      slot.healingUntilMs = gameNow() + 1000
    },

    applyJungleBuff(slotId: string, def: JungleBuffDef): void {
      const slot = this.getSlot(slotId)
      // Zerstörte Planeten sind nicht bebuffbar — sie stehen ohnehin nicht mehr
      // in activePlayerPlanetPositions, dies ist die Absicherung im Store selbst.
      if (!slot || !slot.purchased || isPlanetDown(slot)) return
      slot.jungleBuff = {
        active: true,
        buffType: def.name,
        multiplier: def.multiplier,
        activeUntil: gameNow() + def.durationMs,
      }
    },

    clearJungleBuff(slotId: string): void {
      const slot = this.getSlot(slotId)
      if (slot) slot.jungleBuff = null
    },

    adminFillRandomRoles(): void {
      const roleTypes = Object.keys(PLANET_ROLES) as PlanetRoleType[]
      for (const slot of this.slots) {
        slot.purchased = true
        slot.role = roleTypes[Math.floor(Math.random() * roleTypes.length)]
      }
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()
    },
  },
})
