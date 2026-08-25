import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useCpsStore } from '@/stores/core/cpsStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { gameNow, gameTimeout } from '@/utils/game/gameClock'
import { solarSignatureFrom } from '@/utils/game/solarSignature'
import type { ForgeAxisId, SolarSignature } from '@/types'
import {
  SOLAR_FLIGHT_BASE_COST,
  SOLAR_FLIGHT_MULTIPLIER,
  SOLAR_HP_BASE_COST,
  SOLAR_HP_MULTIPLIER,
  SOLAR_CPC_BASE_COST,
  SOLAR_CPC_MULTIPLIER,
  SOLAR_CPS_BASE_COST,
  SOLAR_CPS_MULTIPLIER,
  SOLAR_DMG_BASE_COST,
  SOLAR_DMG_MULTIPLIER,
  SOLAR_MAX_LEVELS,
  SOLAR_HP_PER_LEVEL,
  SOLAR_CPS_PER_LEVEL,
  SOLAR_CPC_PER_LEVEL,
  SOLAR_CPS_FLIGHT_BONUS,
  SOLAR_DMG_BONUS,
  STAR_PHASE_MIN_DWELL_SECONDS,
  COMET_MIN_DWELL_SECONDS,
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  SUN_EVOLVE_TRANSITION_MS,
  DWELL_SKIP_PHASE_FRACTION,
} from '@/config/constants'

export type SolarBranchId =
  | 'flightSpeed'
  | 'maxHp'
  | 'chimesPerClick'
  | 'chimesPerSecond'
  | 'dmgPerClick'

const BRANCH_CONFIG: Record<SolarBranchId, { baseCost: number; costMultiplier: number }> = {
  flightSpeed: { baseCost: SOLAR_FLIGHT_BASE_COST, costMultiplier: SOLAR_FLIGHT_MULTIPLIER },
  maxHp: { baseCost: SOLAR_HP_BASE_COST, costMultiplier: SOLAR_HP_MULTIPLIER },
  chimesPerClick: { baseCost: SOLAR_CPC_BASE_COST, costMultiplier: SOLAR_CPC_MULTIPLIER },
  chimesPerSecond: { baseCost: SOLAR_CPS_BASE_COST, costMultiplier: SOLAR_CPS_MULTIPLIER },
  dmgPerClick: { baseCost: SOLAR_DMG_BASE_COST, costMultiplier: SOLAR_DMG_MULTIPLIER },
}

export const useSolarUpgradeStore = defineStore('solarUpgrade', {
  state: () => ({
    flightSpeedLevel: 0 as number,
    maxHpLevel: 0 as number,
    chimesPerClickLevel: 0 as number,
    chimesPerSecondLevel: 0 as number,
    dmgPerClickLevel: 0 as number,
    starPhase: 0 as number,
    /** Origin state: the player starts as a wandering comet BEFORE Spark.
     *  The first Star Forge evolve ("Ignition") clears this instead of bumping
     *  starPhase. Loaded saves default to false (see usePersistence) so existing
     *  players never regress into the comet. */
    isCometState: true as boolean,
    /** Seconds spent drifting as a comet (kept out of phaseTimeHistory). */
    cometSeconds: 0 as number,
    isUpgrading: false as boolean,
    phaseEnteredAt: gameNow() as number,
    /**
     * Wie viel Verweildauer in DIESER Phase schon übersprungen wurde — über
     * ALLE Quellen zusammen (Bard-E, Drifter-Lohn, Relikt „Solar Winds").
     *
     * Fällt bei jedem Phasenwechsel auf 0. Ohne diesen Zähler waren die
     * Abkürzungen ungedeckelt und ersetzten die Sonnenachse, statt sie
     * abzukürzen — gemessen fiel die volle Sonne nach 13,9 statt der aus der
     * Rampe folgenden ~38 Spielstunden (siehe `DWELL_SKIP_PHASE_FRACTION`).
     */
    phaseDwellSkippedMs: 0 as number,
    totalPhaseSeconds: 0 as number,
    phaseTimeHistory: [] as number[],
    /** Reactive clock for dwell-time getters — advanced by gameStore.tick() once
     *  per second (a raw gameNow() inside a getter would never re-evaluate). */
    dwellNow: gameNow() as number,
    /** Bumped exactly once, when the star evolves INTO the final phase — the red
     *  giant detonates and collapses. SupernovaTransition watches this counter.
     *  Deliberately not persisted (see usePersistence's explicit solar field
     *  list): reloading into the black hole must not replay the explosion. */
    supernovaTrigger: 0 as number,
    /**
     * Der Kaufblitz auf der Sonne — hochgezählt bei JEDEM Kauf, der die
     * Signatur speist. Dasselbe Muster wie `supernovaTrigger`, aus demselben
     * Grund nicht persistiert: ein Reload darf keinen Blitz nachholen.
     *
     * Er liegt hier und nicht im Forge-Panel, weil der Idle-Orbit ihn sonst
     * nie sieht — der Panel-eigene `flashSun()` blitzte nur im Shop-Tab.
     */
    signaturePulseSeq: 0 as number,
    /** Die Achse, deren Farbe der Blitz trägt. `null` heisst GEMISCHT und
     *  zeigt die Phasenfarbe: bei einem Sammelkauf über mehrere Achsen wäre
     *  „die Farbe des letzten Kaufs" eine willkürliche Auskunft. */
    signaturePulseAxis: null as ForgeAxisId | null,
    /** Bis wohin die Sonne den Blitz schon abgeholt hat — die Grenze, an der
     *  ein Stapel endet und die nächste Achse wieder allein zählt. */
    signaturePulseSeenSeq: 0 as number,
  }),

  getters: {
    /**
     * Was ein Resonator-Planet diesem Strahl zulegt — 1, wenn keiner auf ihn
     * zeigt. Er greift am BONUS, nie am Ganzen: `1 + level × bonus` mit dem
     * Faktor davor gäbe auch auf Stufe 0 einen Zuschlag.
     */
    rayResonance(): (id: SolarBranchId) => number {
      return (id: SolarBranchId): number => usePlanetShopStore().resonanceRayMultipliers[id] ?? 1
    },

    flightSpeedMultiplier(): number {
      return 1 + this.flightSpeedLevel * SOLAR_CPS_FLIGHT_BONUS * this.rayResonance('flightSpeed')
    },
    hpBonus(): number {
      return this.maxHpLevel * SOLAR_HP_PER_LEVEL * this.rayResonance('maxHp')
    },
    cpcBonus(): number {
      return this.chimesPerClickLevel * SOLAR_CPC_PER_LEVEL * this.rayResonance('chimesPerClick')
    },
    /** Der eine Summand, aus dem die ganze CpS des Spiels wächst — plus
     *  Founder's Pact, der als Faktor auf DIESEN Summanden liegt und deshalb
     *  nicht in `cpsFactorBreakdown` gehört (dort stehen nur Multiplikatoren). */
    cpsBonus(): number {
      return (
        this.chimesPerSecondLevel *
        SOLAR_CPS_PER_LEVEL *
        this.rayResonance('chimesPerSecond') *
        useStarForgeStore().solarCpsMult
      )
    },
    dmgMultiplier(): number {
      return 1 + this.dmgPerClickLevel * SOLAR_DMG_BONUS * this.rayResonance('dmgPerClick')
    },

    /** 0..5 — how many of the five core rays are at Lv 1+ (drives comet growth). */
    cometStage(state): number {
      return [
        state.flightSpeedLevel,
        state.maxHpLevel,
        state.chimesPerClickLevel,
        state.chimesPerSecondLevel,
        state.dmgPerClickLevel,
      ].filter((l) => l >= 1).length
    },

    /** Der Stern ist kollabiert — ein Schwarzes Loch, keine Plasmascheibe.
     *  Stand vor diesem Getter siebenmal wortgleich im Code. */
    isCollapsedStar(state): boolean {
      return !state.isCometState && state.starPhase >= STAR_PHASE_FINAL_INDEX
    },

    /**
     * Was der Wächter in seine Sonne gesteckt hat, als Zahl je Achse.
     *
     * Ein Getter und kein Feld: die Stufen liegen ohnehin im Spielstand, ein
     * zweiter Zähler daneben liefe beim ersten Admin-Eingriff auseinander.
     * Als Computed rechnet er ausserdem erst beim LESEN neu — ein Sammelkauf
     * über mehrere hundert Stufen kostet damit eine Neuberechnung, nicht
     * dreihundert.
     */
    solarSignature(state): SolarSignature {
      const forge = useStarForgeStore()
      return solarSignatureFrom({
        rayLevels: {
          flightSpeed: state.flightSpeedLevel,
          maxHp: state.maxHpLevel,
          chimesPerClick: state.chimesPerClickLevel,
          chimesPerSecond: state.chimesPerSecondLevel,
          dmgPerClick: state.dmgPerClickLevel,
        },
        nodeLevelBags: [
          forge.branchLevels,
          forge.leafLevels,
          forge.wardLevels,
          forge.pactLevels,
          forge.boughLevels,
          forge.crownLevels,
          forge.glimmerLevels,
        ],
        relicLevels: Object.values(forge.relicLevels).reduce((sum, l) => sum + l, 0),
        constellationCount: forge.forgedConstellations.length,
        totalPrestiges: useGameStore().totalPrestiges,
      })
    },

    minBranchLevel(state): number {
      return Math.min(
        state.flightSpeedLevel,
        state.maxHpLevel,
        state.chimesPerClickLevel,
        state.chimesPerSecondLevel,
        state.dmgPerClickLevel,
      )
    },

    maxAllowedLevel(): number {
      return Math.min(SOLAR_MAX_LEVELS, this.minBranchLevel + 1)
    },

    /** Upgrades that shorten dwell times multiply in here (e.g. 0.8 = 20% faster
     *  phases). Keep every consumer on this getter. Currently fed by the Star
     *  Forge "Quickening" branch (+ its "Time Weaver" leaf). */
    dwellTimeMultiplier(): number {
      return useStarForgeStore().dwellMult
    },

    /** Minimum time (ms) the sun must stay in the CURRENT phase before evolving. */
    phaseDwellRequiredMs(state): number {
      if (state.isCometState) return COMET_MIN_DWELL_SECONDS * 1000 * this.dwellTimeMultiplier
      if (state.starPhase >= STAR_PHASE_MIN_DWELL_SECONDS.length) return 0
      return STAR_PHASE_MIN_DWELL_SECONDS[state.starPhase] * 1000 * this.dwellTimeMultiplier
    },

    phaseDwellElapsedMs(state): number {
      return Math.max(0, state.dwellNow - state.phaseEnteredAt)
    },

    phaseDwellRemainingMs(): number {
      return Math.max(0, this.phaseDwellRequiredMs - this.phaseDwellElapsedMs)
    },

    /** Branch-level requirement alone (without the time gate) — lets the UI explain
     *  WHY evolving is blocked. */
    branchesReadyForEvolve(state): boolean {
      return (
        state.starPhase < STAR_PHASE_DATA.length - 1 && this.minBranchLevel >= state.starPhase + 1
      )
    },

    canUpgradeStar(): boolean {
      return this.branchesReadyForEvolve && this.phaseDwellRemainingMs <= 0 && !this.isUpgrading
    },

    branchLevel(state): (id: SolarBranchId) => number {
      return (id: SolarBranchId): number => {
        switch (id) {
          case 'flightSpeed':
            return state.flightSpeedLevel
          case 'maxHp':
            return state.maxHpLevel
          case 'chimesPerClick':
            return state.chimesPerClickLevel
          case 'chimesPerSecond':
            return state.chimesPerSecondLevel
          case 'dmgPerClick':
            return state.dmgPerClickLevel
        }
      }
    },

    levelCost(): (id: SolarBranchId, atLevel: number) => number {
      return (id: SolarBranchId, atLevel: number): number => {
        const cfg = BRANCH_CONFIG[id]
        return Math.ceil(
          cfg.baseCost * Math.pow(cfg.costMultiplier, atLevel) * useStarForgeStore().rayCostMult,
        )
      }
    },

    branchCost(state): (id: SolarBranchId) => number {
      return (id: SolarBranchId): number => {
        const cfg = BRANCH_CONFIG[id]
        let level: number
        switch (id) {
          case 'flightSpeed':
            level = state.flightSpeedLevel
            break
          case 'maxHp':
            level = state.maxHpLevel
            break
          case 'chimesPerClick':
            level = state.chimesPerClickLevel
            break
          case 'chimesPerSecond':
            level = state.chimesPerSecondLevel
            break
          case 'dmgPerClick':
            level = state.dmgPerClickLevel
            break
        }
        return Math.ceil(
          cfg.baseCost * Math.pow(cfg.costMultiplier, level) * useStarForgeStore().rayCostMult,
        )
      }
    },

    canAfford(): (id: SolarBranchId) => boolean {
      return (id: SolarBranchId): boolean => {
        const gameStore = useGameStore()
        return (
          this.branchLevel(id) < SOLAR_MAX_LEVELS &&
          this.branchLevel(id) < this.maxAllowedLevel &&
          gameStore.chimes >= this.branchCost(id) &&
          useInventoryStore().hasMaterials(useStarForgeStore().rayMaterialCost(id))
        )
      }
    },

    statDisplay(): (id: SolarBranchId, atLevel: number) => string {
      return (id: SolarBranchId, atLevel: number): string => {
        switch (id) {
          case 'flightSpeed':
            return `×${(1 + atLevel * SOLAR_CPS_FLIGHT_BONUS).toFixed(1)}`
          case 'maxHp':
            return `+${atLevel * SOLAR_HP_PER_LEVEL} HP`
          case 'chimesPerClick':
            return `+${atLevel * SOLAR_CPC_PER_LEVEL} CpC`
          case 'chimesPerSecond':
            return `+${atLevel * SOLAR_CPS_PER_LEVEL} CpS`
          case 'dmgPerClick':
            return `×${(1 + atLevel * SOLAR_DMG_BONUS).toFixed(2)}`
        }
      }
    },
  },

  actions: {
    /** Advance the reactive dwell clock — called by gameStore.tick() every second. */
    tickDwell(): void {
      this.dwellNow = gameNow()
    },

    /**
     * Die EINE Stelle, an der Verweildauer übersprungen wird — und die einzige,
     * die dabei einen Deckel kennt.
     *
     * Drei Quellen kürzen die Sonnenphase ab: Bard-E, der Drifter-Lohn und das
     * Relikt „Solar Winds". Jede datierte `phaseEnteredAt` früher selbst zurück,
     * jede ohne Grenze. In der Summe war die Sonnenachse damit nicht gebremst,
     * sondern erledigt: gemessen über 72 Spielstunden fiel die volle Sonne nach
     * 13,9 statt der aus der Rampe folgenden ~38 Stunden.
     *
     * Der Deckel gilt JE PHASE und für ALLE Quellen zusammen — sonst verschiebt
     * sich das Problem nur auf die Quelle, die gerade nicht geklemmt ist.
     * Zurückgegeben wird, was tatsächlich gutgeschrieben wurde, damit der
     * Aufrufer ehrlich melden kann, was er bewirkt hat.
     */
    skipDwell(ms: number): number {
      if (ms <= 0) return 0
      const budget = this.phaseDwellRequiredMs * DWELL_SKIP_PHASE_FRACTION
      const granted = Math.max(0, Math.min(ms, budget - this.phaseDwellSkippedMs))
      if (granted > 0) {
        this.phaseEnteredAt -= granted
        this.phaseDwellSkippedMs += granted
      }
      this.tickDwell()
      return granted
    },

    /** TEMP (admin/testing): instantly satisfy the current phase's dwell-time gate
     *  by backdating phaseEnteredAt. Branch requirements stay untouched.
     *  Remove together with the "DEV · Skip Time" button in BardStatsTab.vue. */
    adminSkipDwellTime(): void {
      this.phaseEnteredAt = gameNow() - this.phaseDwellRequiredMs
      this.tickDwell()
    },

    /** TEMP (admin/testing): alle fünf Kernstrahlen auf ihre Endstufe, gratis.
     *  Das Gleichwuchs-Gate (`maxAllowedLevel`) wird bewusst übergangen — am
     *  Ende stehen ohnehin alle fünf gleich hoch.
     *  Remove together with the "DEV · Max Forge" button in ShopComponent.vue. */
    adminMaxBranches(): void {
      const hpSteps = SOLAR_MAX_LEVELS - this.maxHpLevel
      if (hpSteps > 0) usePlayerStore().maxHP += hpSteps * SOLAR_HP_PER_LEVEL
      this.flightSpeedLevel = SOLAR_MAX_LEVELS
      this.maxHpLevel = SOLAR_MAX_LEVELS
      this.chimesPerClickLevel = SOLAR_MAX_LEVELS
      this.chimesPerSecondLevel = SOLAR_MAX_LEVELS
      this.dmgPerClickLevel = SOLAR_MAX_LEVELS
      useShopStore().refreshRates()
    },

    /**
     * Badge Lab: die ✦-Marke an- oder ausschalten.
     *
     * Hebt die fünf Kernstrahlen nur auf `starPhase + 1` — die Schwelle, ab der
     * `branchesReadyForEvolve` greift. Bewusst NICHT `adminMaxBranches()`: die
     * springt auf die Endstufe und addiert dabei auf `playerStore.maxHP`, was
     * ein späteres Ausschalten nicht mehr zurücknehmen kann.
     *
     * Ausschalten sperrt nur die Verweildauer wieder; die Strahlen bleiben, wo
     * sie stehen. In der Endphase lässt sich die Marke gar nicht anschalten,
     * dort gibt es nichts mehr zu entwickeln — der Rückgabewert sagt es.
     */
    adminSetEvolveReady(ready: boolean): boolean {
      if (ready) {
        const need = this.starPhase + 1
        const hpSteps = Math.max(0, need - this.maxHpLevel)
        if (hpSteps > 0) usePlayerStore().maxHP += hpSteps * SOLAR_HP_PER_LEVEL
        this.flightSpeedLevel = Math.max(this.flightSpeedLevel, need)
        this.maxHpLevel = Math.max(this.maxHpLevel, need)
        this.chimesPerClickLevel = Math.max(this.chimesPerClickLevel, need)
        this.chimesPerSecondLevel = Math.max(this.chimesPerSecondLevel, need)
        this.dmgPerClickLevel = Math.max(this.dmgPerClickLevel, need)
        useShopStore().refreshRates()
        this.adminSkipDwellTime()
      } else {
        this.phaseEnteredAt = gameNow()
        this.phaseDwellSkippedMs = 0
        this.tickDwell()
      }
      return this.canUpgradeStar
    },

    buyBranch(id: SolarBranchId): void {
      const gameStore = useGameStore()
      const level = this.branchLevel(id)
      if (level >= SOLAR_MAX_LEVELS) return
      if (level >= this.maxAllowedLevel) return
      const cost = this.branchCost(id)
      if (gameStore.chimes < cost) return

      // Material zuerst — das ist der Schritt, der scheitern kann. Dieselbe
      // Reihenfolge wie `starForgeStore.buyNode`; andersherum wären die Chimes
      // weg, bevor sich herausstellt, dass das Lager nicht reicht.
      if (!useInventoryStore().removeMaterials(useStarForgeStore().rayMaterialCost(id), 'forge'))
        return

      gameStore.chimes -= cost

      switch (id) {
        case 'flightSpeed':
          this.flightSpeedLevel++
          break
        case 'maxHp':
          this.maxHpLevel++
          usePlayerStore().maxHP += SOLAR_HP_PER_LEVEL
          break
        case 'chimesPerClick':
          this.chimesPerClickLevel++
          break
        case 'chimesPerSecond':
          this.chimesPerSecondLevel++
          break
        case 'dmgPerClick':
          this.dmgPerClickLevel++
          break
      }

      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      if (id === 'chimesPerSecond' || id === 'flightSpeed') {
        useCpsStore().updateCurrentCPS(gameStore.chimesPerSecond)
      }

      this.markSignaturePulse(id)
    },

    /**
     * Ein Kauf ist auf der Sonne angekommen.
     *
     * Der Zähler bündelt sich von selbst — Vue verrechnet dreihundert
     * Inkremente in einem Tick zu EINEM Watcher-Lauf. Was nicht von selbst
     * geht, ist die FARBE: trifft ein Sammelkauf mehrere Achsen, fällt sie auf
     * `null` und der Blitz zeigt die Phasenfarbe. „Die Achse des letzten
     * Knotens" wäre sonst eine Auskunft, die niemand so gemeint hat.
     */
    markSignaturePulse(axis: ForgeAxisId | null): void {
      const pending = this.signaturePulseSeq > this.signaturePulseSeenSeq
      this.signaturePulseAxis = pending && this.signaturePulseAxis !== axis ? null : axis
      this.signaturePulseSeq++
    },

    /** Die Sonne hat den Blitz abgeholt — ab hier gilt die nächste Achse
     *  wieder als erste ihres Stapels. */
    ackSignaturePulse(): void {
      this.signaturePulseSeenSeq = this.signaturePulseSeq
    },

    upgradeStar(): void {
      if (!this.canUpgradeStar) return
      this.isUpgrading = true
      gameTimeout(() => {
        const elapsed = Math.floor((gameNow() - this.phaseEnteredAt) / 1000)
        if (this.isCometState) {
          // Ignition: the comet becomes Spark — starPhase stays 0, the
          // Spark dwell timer starts fresh at this moment.
          this.cometSeconds += elapsed
          this.isCometState = false
          this.phaseEnteredAt = gameNow()
          this.phaseDwellSkippedMs = 0
          this.isUpgrading = false
          console.log('[Bardle] Comet ignited into Spark')
          return
        }
        this.totalPhaseSeconds += elapsed
        this.phaseTimeHistory[this.starPhase] =
          (this.phaseTimeHistory[this.starPhase] ?? 0) + elapsed
        this.starPhase++
        this.phaseEnteredAt = gameNow()
        this.phaseDwellSkippedMs = 0
        this.isUpgrading = false
        // The last evolution is not a growth step: the red giant blows itself
        // apart and what is left collapses. Fire the one-shot transition.
        if (this.starPhase === STAR_PHASE_FINAL_INDEX) this.supernovaTrigger++
        console.log('[Bardle] Star evolved to phase', this.starPhase)
      }, SUN_EVOLVE_TRANSITION_MS)
    },
  },
})
