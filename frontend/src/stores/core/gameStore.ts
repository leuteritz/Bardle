import { defineStore } from 'pinia'
import { useShopStore } from '@/stores/economy/shopStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useCombatStore } from '@/stores/battle/combatStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useRoleBehaviorStore } from '@/stores/battle/roleBehaviorStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useMissionStore } from '@/stores/progression/missionStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { buildBackfillUniverseRuns } from '@/utils/game/universeRunBackfill'
import { assignRecordUniverses } from '@/utils/game/galaxyUniverseBackfill'
import { universes } from '@/config/progression/universes'
import { clampPercent } from '@/utils/orbit/geometry'
import { universeLabel } from '@/utils/ui/format'
import { bossPlanetInForeground } from '@/utils/orbit/foregroundGate'
import { AUGMENTS, AUGMENT_POOL, RARITY_WEIGHTS } from '@/config/economy/augments'
import { logAugmentAutoPicked, logUniverseReached } from '@/config/ui/eventLog'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import {
  LEVEL_BASE,
  LEVEL_EXPONENT,
  LEVEL_SCALING_THRESHOLD,
  LEVEL_SCALING_FACTOR,
  LEVEL_SCALING_CAP_LEVEL,
  SKILL_POINT_LEVEL_INTERVAL,
  MAX_ABILITY_LEVEL,
  BOSS_CLICK_DAMAGE_BASE,
  BOSS_CLICK_DAMAGE_CPC_BONUS,
  TURRET_PROJECTILE_FLIGHT_MS,
  GAME_TICK_INTERVAL_MS,
  GAME_SPEED_DEFAULT,
  AUGMENT_CHOICE_COUNT,
  AUGMENT_ACTIVE_CAP,
  AUGMENT_LEVEL_INTERVAL,
  ADMIN_LEVEL_AUGMENT_QUEUE_MAX,
  RARITY_WEIGHT_FALLBACK,
  HYPERSPACE_ANIM_START_MS,
  HYPERSPACE_ANIM_END_MS,
  UNIVERSE_RESCUE_INITIAL_COST,
  UNIVERSE_RESCUE_COST_MULTIPLIER,
  MEEP_RUN_BASE_MIN,
  MEEP_RUN_SHARE,
  MEEP_RUN_FACTOR,
  MEEP_POWER_MULTIPLIER,
  ABILITY_CPS_PER_LEVEL_DEFAULT,
  ABILITY_POWER_PER_LEVEL_DEFAULT,
  ABILITY_MEEP_COST_PER_LEVEL_DEFAULT,
  ABILITY_MEEP_COST_MIN_MULTIPLIER,
  ABILITY_CPC_PER_LEVEL_DEFAULT,
  CHIMES_PER_CLICK_BASE,
  HONOR_MVP_BUFF_DURATION_S,
  HONOR_MVP_BUFF_MULT,
  UNIVERSE_RUN_HISTORY_LIMIT,
  FORGE_CROWN_OVERFLOW_MATERIAL,
} from '@/config/constants'
import type {
  UniverseRunBaseline,
  UniverseRunRecord,
  UniverseRunStats,
  Expedition,
  ModifierEffects,
  AugmentEffects,
  AugmentDefinition,
  AugmentRarity,
} from '@/types'
import { logger } from '@/utils/logger'
import { gameNow, gameTimeout, setGameSpeed } from '@/utils/game/gameClock'
import { recordTelemetry } from '@/utils/game/telemetry'

/**
 * Kumulative Chime-Schwelle für ein Bard-Level.
 *
 * Exportiert, weil sie die EINZIGE Quelle dieser Zahl sein muss: sie stand
 * einmal an drei Stellen ausgeschrieben, zweimal davon ohne die
 * Exponentialbremse — einmal als Ein-Tick-Anzeigefehler beim Laden, einmal als
 * Endlosschleife in `skipAllAugments`.
 */
export function chimeThresholdForLevel(level: number, exponent: number = LEVEL_EXPONENT): number {
  if (level <= 0) return 0
  const base = Math.ceil(LEVEL_BASE * Math.pow(level, exponent))
  if (level <= LEVEL_SCALING_THRESHOLD) return base
  // Above threshold: exponential braking prevents augment-choice loop at high levels.
  //
  // Die Bremse läuft aus, statt zu deckeln. Ein hartes `min(level, cap)` wäre
  // eine KLIPPE: die Stufe direkt hinter dem Deckel kostete schlagartig ein
  // Fünftel der Stufe davor, weil der Bremsfaktor von einem Schritt auf den
  // nächsten stehenbleibt. Die Sättigungskurve nähert sich demselben Wert an,
  // ohne Sprung in den Stufenkosten — nahe der Schwelle ist sie von der alten
  // Formel praktisch nicht zu unterscheiden (bei +10 Leveln 9,3 statt 10
  // gebremste Stufen), weit dahinter läuft sie gegen `span`.
  const span = LEVEL_SCALING_CAP_LEVEL - LEVEL_SCALING_THRESHOLD
  const over = level - LEVEL_SCALING_THRESHOLD
  const brakedLevels = span * (1 - Math.exp(-over / span))
  return Math.ceil(base * Math.pow(LEVEL_SCALING_FACTOR, brakedLevels))
}

export const useGameStore = defineStore('game', {
  state: () => ({
    /**
     * Zeitraffer-Faktor. 1 ist das Live-Spiel; alles darüber beschleunigt die
     * Spieluhr UND den Takt gleichermaßen (siehe `utils/game/gameClock.ts`).
     * Nur ein Spiegel — die Uhr selbst hält den maßgeblichen Wert.
     */
    gameSpeed: GAME_SPEED_DEFAULT,
    /**
     * Zeitraffer, mit dem der geladene Spielstand geschrieben wurde. Er wird
     * bewusst NICHT angewandt — ein über den Reload überlebendes 10× ruiniert
     * genau die Live-Messung, für die der Regler da ist. Das Admin-Panel bietet
     * ihn als Ein-Klick-Knopf an.
     */
    lastGameSpeed: GAME_SPEED_DEFAULT,
    inGameTime: 0,

    chimes: 0,
    chimesPerSecond: 0,
    /** Seconds left on the MVP honor buff (2× chimes per second and per click) */
    mvpBuffSecondsLeft: 0,
    chimesForNextLevel: LEVEL_BASE,
    chimesPerClick: CHIMES_PER_CLICK_BASE,
    baseChimesPerClick: CHIMES_PER_CLICK_BASE,
    chimesForNextUniverse: 0,
    /**
     * Chimes des BESTEN abgeschlossenen Durchlaufs — der Anker, gegen den die
     * Meep-Anforderung gemessen wird (siehe `MEEP_RUN_SHARE`).
     *
     * Er steigt AUSSCHLIESSLICH in `finishUniverseRun()`, also nur im Moment des
     * Aufbruchs. Das ist keine Bequemlichkeit, sondern die tragende Eigenschaft
     * des Systems: solange ein Lauf läuft, steht `meepChimeRequirement` still,
     * und `pendingMeeps` kann aus dieser Quelle nie sinken. Monoton ist er
     * ausserdem, ein absichtlich winziger Lauf senkt ihn also nicht.
     * `executePrestigeReset` fasst ihn NICHT an — er IST die Ratsche.
     */
    bestUniverseRunChimes: 0,
    /**
     * Anstehende Meeps, die der Void in diesem Lauf gefressen hat — ein OFFSET
     * auf `pendingMeeps`, kein Abzug an den Chimes. Läuft beim Prestige
     * zusammen mit `chimesForNextUniverse` auf 0 zurück.
     */
    meepsDevoured: 0,
    /**
     * Kleinster Augment-/Vorsehungs-Faktor auf die Meep-Anforderung, den dieser
     * Lauf je gesehen hat.
     *
     * Er ist eine RATSCHE, weil `activeModifier` keine ist: `_addAugment` wirft
     * bei vollem `AUGMENT_ACTIVE_CAP` das schwächste Augment heraus, und das
     * kann `common_meep_cost` (×0,8) sein. Die Anforderung spränge dann um
     * 1/0,8 zurück und `exactPendingMeeps` fiele um 10,6 % — bei 32 anstehenden
     * also drei bis vier Meeps in einem Frame, an genau der Kachel, an der ein
     * Rückgang seit dem Void „gefressen" bedeutet. Mit dieser Untergrenze ist
     * JEDE Eingabe der Anforderung innerhalb eines Laufs monoton fallend.
     */
    runMeepCostFloor: 1,
    chimesToUniverseRescue: UNIVERSE_RESCUE_INITIAL_COST,
    meeps: 0,
    chimesEarnedForLevel: 0,

    level: 1,

    skillPoints: 0,
    abilityLevels: [0, 0, 0, 0], // Q=CPS, W=Power, E=MeepCost, R=CPC

    activeAugments: [] as string[],
    pendingAugmentChoice: false,
    pendingAugmentOptions: [] as string[],
    pendingAugmentSelections: [] as Array<{ options: string[] }>,
    /** Solange aktiv, wählt jedes Level-Up selbst eines der drei Augments. */
    autoPickAugments: false,
    /** Letzte automatische Wahl — `seq` zählt hoch, damit die Anzeige auch dann
     *  wieder auslöst, wenn zweimal hintereinander dasselbe Augment fällt. */
    lastAutoPick: { id: '', at: 0, seq: 0 },
    isGamePaused: false,

    pauseStats: {
      /** Reguläre Planeten, die während der Pause gefallen sind. */
      planetsCleared: 0,
      /** Sterne, deren Planeten während der Pause vollständig befreit wurden. */
      starsRescued: 0,
      /** Galaxieboss-Planeten — die seltenen, dicken Brocken. */
      galaxyBossesFelled: 0,
      /** Void-Wesen, die der Orbit pausiert erlegt hat — er feuert weiter. */
      voidSlain: 0,
      /** Gegnerische Champions, die der Kader im Auto-Battle geholt hat. */
      championKills: 0,
      materialsEarned: {} as Record<string, number>,
      battleWins: 0,
      battleLosses: 0,
      battleChimes: 0,
      battleLp: 0,
    },

    currentUniverse: 1,
    prestigeAvailable: false,

    // Modal state for UI effects
    isCPSModalOpen: false,
    isExpeditionModalOpen: false,
    isEncyclopediaOpen: false,

    activeExpedition: null as Expedition | null,

    isHyperspaceActive: false,

    // ── Expedition Tracking ──────────────────────
    totalChimesEarned: 0,
    totalClicks: 0,

    // ── Offline Progress ──────────────────────────
    offlineChimes: 0,
    offlineSeconds: 0,
    showOfflineModal: false,

    // ── Lifetime counters (Bard Stats catalog) ────
    /** Meeps ever guided in — never decreases when meeps are spent. */
    totalMeepsEarned: 0,
    /** Meeps ever spent on abilities / universe expeditions. */
    totalMeepsSpent: 0,
    /** Meeps the Void has ever devoured — across all universes. */
    totalMeepsDevoured: 0,
    /** Completed prestige resets (universe hops). */
    totalPrestiges: 0,
    /** Chimes ever granted by offline progress, and the seconds behind them. */
    totalOfflineChimes: 0,
    totalOfflineSeconds: 0,

    // ── Universe run (header universe tooltip) ────
    /** Zählerstände beim Betreten des aktuellen Universums — siehe
     *  `beginUniverseRun()`. Alle Nullen sind für ein frisches Spiel korrekt. */
    universeRun: {
      startedAtInGameTime: 0,
      starsRescued: 0,
      starsLost: 0,
      galaxiesFreed: 0,
      planetsCleared: 0,
      bossesFelled: 0,
      meepsEarned: 0,
      materialsGathered: 0,
      clicks: 0,
    } as UniverseRunBaseline,
    /** Abgeschlossene Durchläufe, jüngster zuletzt (gekappt). */
    universeRuns: [] as UniverseRunRecord[],
  }),
  actions: {
    /**
     * Stellt den Zeitraffer. Die Uhr (`utils/game/gameClock.ts`) ist die
     * Autorität; dieses Feld ist ihr Spiegel für Anzeige und Spielstand —
     * deshalb wird der GEKLEMMTE Rückgabewert übernommen und nicht das Argument.
     */
    setGameSpeed(next: number) {
      this.gameSpeed = setGameSpeed(next)
      logger.info('Game', `Game speed set to ${this.gameSpeed}x`)
    },

    /**
     * Schreibt Meeps unmittelbar gut — der Ausnahmeweg.
     *
     * Der REGELWEG ist das Prestige: was ein Durchlauf einbringt, steht in
     * `pendingMeeps` und wird beim Aufbruch ausgezahlt. Diese Action bleibt für
     * die zwei Quellen, die einen Meep als FUND vergeben statt als Ertrag — der
     * Drifter „Lost Meep" und die Beute einer Expedition. Sie sollen sich genau
     * deshalb besonders anfühlen: sie umgehen die Wartezeit.
     */
    grantMeeps(amount = 1) {
      if (amount <= 0) return
      this.meeps += amount
      this.totalMeepsEarned += amount
    },

    /**
     * Der Void frisst anstehende Meeps — der Gegenweg zu `grantMeeps`.
     *
     * Verloren gehen kann nur, was der Lauf schon GESAMMELT hat: `available`
     * ist `pendingMeeps`, und bei 0 kostet ein Einschlag ausschliesslich
     * Sonnen-HP. Damit bestraft der Void nie jemanden, der nichts im Feuer hat
     * — und trifft am härtesten den, der den Aufbruch hinauszögert. Genau die
     * Entscheidung, die die Wurzelformel der Ausbeute ohnehin stellt, bekommt
     * dadurch eine zweite Seite.
     *
     * Gezählt wird als OFFSET, nicht als Abzug an den Chimes: `pendingMeeps`
     * bleibt ein Getter auf `chimesForNextUniverse`, und Rettungsbalken, ETA
     * und der Archiveintrag des Laufs (aus dem die Ratsche liest!) bleiben
     * unberührt.
     *
     * @returns Was tatsächlich verloren ging — 0, wenn nichts anstand.
     */
    devourMeeps(pct: number, min: number): number {
      const available = this.pendingMeeps
      if (available <= 0) return 0
      const loss = Math.min(available, Math.max(min, Math.ceil(pct * available)))
      this.meepsDevoured += loss
      this.totalMeepsDevoured += loss
      return loss
    },

    /** Grants (or refreshes) the MVP honor buff — 2× chime production for a short window. */
    activateMvpBuff() {
      this.mvpBuffSecondsLeft = HONOR_MVP_BUFF_DURATION_S
    },

    // Adds Chimes and updates all dependent values
    addChime() {
      // Golden Echo (Star Forge) + Twin Echo (Meep Tree): chance that a click
      // counts twice. Läuft Golden Echo über `FORGE_MAX_DOUBLE_CLICK_CHANCE`
      // hinaus, wird der überschüssige Teil zum DREIFACH-Klick — bei
      // Vollausbau 16 der 96 Punkte, die der Zweig roh trägt.
      //
      // EIN Wurf entscheidet über beide Stufen, und die Bereiche liegen
      // nebeneinander statt übereinander: mit zwei Würfen könnte ein Klick
      // beides sein und käme auf das Sechsfache.
      const forge = useStarForgeStore()
      const tripleChance = forge.tripleClickChance
      const doubleChance = forge.doubleClickChance + useMeepTreeStore().fx.doubleClickChance
      const roll = Math.random()
      const clickMultiplier = roll < tripleChance ? 3 : roll < tripleChance + doubleChance ? 2 : 1
      const clickValue = this.chimesPerClick * this.mvpBuffMultiplier
      const gain = clickValue * clickMultiplier
      this.chimes += gain
      this.chimesForNextUniverse += gain
      this.totalChimesEarned += gain
      this.chimesEarnedForLevel += gain
      this.totalClicks += 1
      // Caretaker's Ledger (Star Forge): ein Klick, der wenigstens verdoppelt
      // hat, kann zusätzlich Material lockern. Der Wurf hängt am TREFFER und
      // nicht am Klick — sonst hinge die Ausbeute an der Klickrate statt am
      // Ausbau des Baums, und ein Autoclicker wäre die beste Materialquelle im
      // Spiel. `tryDropMaterial` würfelt danach seine eigene Chance, das hier
      // ist nur das Tor davor.
      if (clickMultiplier > 1 && Math.random() < forge.clickMaterialChance) {
        useInventoryStore().tryDropMaterial(undefined, 'click')
      }
      // Traveler's Call (bard passive): the click builds resonance and takes a
      // slice off every running ability cooldown.
      useBardAbilityStore().registerClick()
      this.calculateLevel()
      this.checkPrestigeAvailability()
    },

    // Calculates the current level based on collected Chimes
    calculateLevel() {
      if (this.pendingAugmentChoice) return
      const exponent = this.activeModifier.levelExponent ?? LEVEL_EXPONENT
      // Resync chimesForNextLevel from formula — handles saves made before exponential scaling was added
      this.chimesForNextLevel = chimeThresholdForLevel(this.level, exponent)
      const spInterval = this.activeModifier.skillPointInterval ?? SKILL_POINT_LEVEL_INTERVAL
      const oldLevel = this.level

      // Relative threshold: how many Chimes are needed for THIS level
      const chimesNeededThisLevel =
        this.chimesForNextLevel - chimeThresholdForLevel(this.level - 1, exponent)

      if (this.chimesEarnedForLevel >= chimesNeededThisLevel) {
        this.level++
        this.chimesForNextLevel = chimeThresholdForLevel(this.level, exponent)
        // Transfer overflow into the new level (don't hard reset to 0!)
        this.chimesEarnedForLevel = Math.max(0, this.chimesEarnedForLevel - chimesNeededThisLevel)
        if (this.level % spInterval === 0) {
          this.skillPoints++
        }
        const augmentStore = useAugmentStore()
        augmentStore.onLevelUp(this.activeAugments)
        logger.info('Game', `Level up: ${oldLevel} -> ${this.level}`, {
          skillPoints: this.skillPoints,
        })
        // Nicht bei JEDEM Level — siehe AUGMENT_LEVEL_INTERVAL. Seit die
        // Exponentialbremse gedeckelt ist, fallen späte Level wieder schnell,
        // und ein Modal je Stufe wäre ein Hindernis statt eines Angebots.
        if (this.level % AUGMENT_LEVEL_INTERVAL === 0) {
          this.triggerAugmentSelection()
        }
      }
    },

    triggerAugmentSelection() {
      const remaining = [...AUGMENT_POOL]
      const picked: AugmentDefinition[] = []

      // Dreamer's Draw (Star Forge) hebt das Gewicht von allem ÜBER `common` —
      // die gewürfelten Karten bleiben dieselben, nur ihre Chancen verschieben
      // sich. Ein Ward, der stattdessen Commons aus dem Topf nähme, veränderte
      // den Katalog; einer, der die Gewichte dreht, verändert nur den Wurf.
      const luck = useStarForgeStore().augmentLuckMult
      const weightOf = (a: AugmentDefinition): number => {
        const raw = RARITY_WEIGHTS[a.rarity as AugmentRarity] ?? RARITY_WEIGHT_FALLBACK
        return a.rarity === 'common' ? raw : raw * luck
      }

      for (let i = 0; i < AUGMENT_CHOICE_COUNT && remaining.length > 0; i++) {
        const totalWeight = remaining.reduce((sum, a) => sum + weightOf(a), 0)
        let roll = Math.random() * totalWeight
        let chosen = remaining[remaining.length - 1]
        for (const aug of remaining) {
          roll -= weightOf(aug)
          if (roll <= 0) {
            chosen = aug
            break
          }
        }
        picked.push(chosen)
        remaining.splice(remaining.indexOf(chosen), 1)
      }

      // Auto-Pick greift vor allem anderen: kein Modal, keine Warteschlange —
      // eines der drei wird sofort gezogen und übernommen.
      if (this.autoPickAugments) {
        this._autoPick(picked.map((a) => a.id))
        return
      }

      if (this.isGamePaused || this.pendingAugmentChoice) {
        this.pendingAugmentSelections.push({ options: picked.map((a) => a.id) })
      } else {
        this.pendingAugmentOptions = picked.map((a) => a.id)
        this.pendingAugmentChoice = true
      }
    },

    /** Admin: set the level directly — each gained level grants an augment
     *  selection like a real level-up (capped so huge jumps don't queue dozens). */
    adminSetLevel(newLevel: number) {
      const gained = newLevel - this.level
      this.level = newLevel
      if (gained <= 0) return
      // Wie im echten Level-Up: eine Wahl je AUGMENT_LEVEL_INTERVAL Stufen.
      const earned = Math.floor(gained / AUGMENT_LEVEL_INTERVAL)
      const grants = Math.min(earned, ADMIN_LEVEL_AUGMENT_QUEUE_MAX)
      if (grants < earned) {
        logger.info('Game', `Admin level grant capped: ${gained} levels, ${grants} augment picks`)
      }
      const augmentStore = useAugmentStore()
      for (let i = 0; i < grants; i++) {
        augmentStore.onLevelUp(this.activeAugments)
        this.triggerAugmentSelection()
      }
    },

    _activateNextPendingSelection() {
      if (this.autoPickAugments) {
        this._drainAugmentQueue()
        return
      }
      const next = this.pendingAugmentSelections.shift()
      if (next) {
        this.pendingAugmentOptions = next.options
        this.pendingAugmentChoice = true
      }
    },

    resetPauseStats() {
      this.pauseStats.planetsCleared = 0
      this.pauseStats.starsRescued = 0
      this.pauseStats.galaxyBossesFelled = 0
      this.pauseStats.voidSlain = 0
      this.pauseStats.championKills = 0
      this.pauseStats.materialsEarned = {}
      this.pauseStats.battleWins = 0
      this.pauseStats.battleLosses = 0
      this.pauseStats.battleChimes = 0
      this.pauseStats.battleLp = 0
    },

    setPauseState(paused: boolean) {
      this.isGamePaused = paused
      if (paused) {
        this.resetPauseStats()
      } else {
        this._activateNextPendingSelection()
      }
    },

    chooseAugment(id: string) {
      if (!this.pendingAugmentOptions.includes(id)) return
      this._commitAugment(id)
      this._activateNextPendingSelection()
    },

    /**
     * Nimmt ein Augment in die aktive Liste auf und hält dabei
     * `AUGMENT_ACTIVE_CAP` ein: ist der Deckel erreicht, fällt das SCHWÄCHSTE
     * heraus — die häufigste Rarität zuerst, unter gleichen die älteste.
     *
     * Dass ein neues Common bei vollem Deckel sich selbst verdrängt, ist
     * gewollt: sonst könnte eine schwache Wahl ein Legendary hinauswerfen, und
     * die Entscheidung beim Level-Up wäre wieder folgenlos.
     */
    _addAugment(id: string) {
      this.activeAugments.push(id)
      if (this.activeAugments.length > AUGMENT_ACTIVE_CAP) {
        // Häufigkeitsgewicht als Stärkemaß — dieselbe Tabelle, aus der die
        // Angebote gezogen werden. Ein höheres Gewicht heißt „häufiger", also
        // schwächer.
        let dropIdx = 0
        let dropWeight = -1
        for (let i = 0; i < this.activeAugments.length; i++) {
          const aug = AUGMENTS.find((a) => a.id === this.activeAugments[i])
          const weight = aug ? (RARITY_WEIGHTS[aug.rarity] ?? RARITY_WEIGHT_FALLBACK) : Infinity
          if (weight > dropWeight) {
            dropWeight = weight
            dropIdx = i
          }
        }
        const dropped = this.activeAugments.splice(dropIdx, 1)[0]
        logger.info('Game', `Augment displaced by cap: ${dropped}`, {
          cap: AUGMENT_ACTIVE_CAP,
          added: id,
        })
      }

      // Die Meep-Untergrenze NACH der Verdrängung ziehen — siehe
      // `runMeepCostFloor`. Ein Augment, das sich selbst wieder verdrängt hat,
      // senkt sie damit richtigerweise nicht; eines, das später hinausfällt,
      // lässt seinen Rabatt für den Rest des Laufs stehen. Beides zusammen ist
      // der Grund, warum `pendingMeeps` nur durch einen Void-Frass sinken kann.
      this.runMeepCostFloor = Math.min(
        this.runMeepCostFloor,
        this.activeModifier.meepCostMultiplier ?? 1,
      )
    },

    /** Gemeinsamer Kern von Hand- und Auto-Wahl: übernehmen, registrieren, CPS/CPC neu. */
    _commitAugment(id: string) {
      this._addAugment(id)
      this.pendingAugmentChoice = false
      this.pendingAugmentOptions = []
      const augmentStore = useAugmentStore()
      augmentStore.registerAugment(id, this.activeAugments)
      logger.info('Game', `Augment chosen: ${id}`, { totalActive: this.activeAugments.length })
      const shopStore = useShopStore()
      this.chimesPerSecond = shopStore.calculateTotalCPS()
      this.chimesPerClick = shopStore.calculateTotalCPC()
    },

    /**
     * Auto-Pick an/aus. Beim Einschalten wird eine bereits offene Auswahl sofort
     * mit aufgelöst — sonst bliebe genau das Modal stehen, das der Spieler
     * gerade loswerden wollte.
     */
    setAutoPickAugments(on: boolean) {
      this.autoPickAugments = on
      logger.info('Game', `Auto-pick augments: ${on ? 'on' : 'off'}`)
      if (!on) return
      if (this.pendingAugmentChoice && this.pendingAugmentOptions.length > 0) {
        this._autoPick(this.pendingAugmentOptions)
      }
      this._drainAugmentQueue()
    },

    /**
     * Zieht zufällig eines der angebotenen Augments, übernimmt es und meldet es
     * über `lastAutoPick` nach außen (Toast + Eventlog lesen das).
     */
    _autoPick(options: string[]) {
      if (options.length === 0) return
      const id = options[Math.floor(Math.random() * options.length)]
      this._commitAugment(id)
      // Wanduhr: `at` ist ein Ereignisstempel für die Meldung, die Anzeige zählt
      // über `seq` und ihre eigene reale Standzeit.
      // eslint-disable-next-line no-restricted-syntax
      this.lastAutoPick = { id, at: Date.now(), seq: this.lastAutoPick.seq + 1 }
      const aug = AUGMENTS.find((a) => a.id === id)
      if (aug) logAugmentAutoPicked(aug.name, aug.effectLine)
    },

    /** Arbeitet aufgestaute Auswahlen ab, solange Auto-Pick läuft. */
    _drainAugmentQueue() {
      while (this.autoPickAugments && this.pendingAugmentSelections.length > 0) {
        const next = this.pendingAugmentSelections.shift()
        if (next) this._autoPick(next.options)
      }
    },

    skipAllAugments() {
      if (this.pendingAugmentOptions.length > 0) {
        const firstId = this.pendingAugmentOptions[0]
        if (!this.activeAugments.includes(firstId)) this._addAugment(firstId)
      }

      this.pendingAugmentChoice = false
      this.pendingAugmentOptions = []

      const exponent = this.activeModifier.levelExponent ?? LEVEL_EXPONENT
      const spInterval = this.activeModifier.skillPointInterval ?? SKILL_POINT_LEVEL_INTERVAL

      // Beide Enden derselben Achse: die Schwelle kommt IMMER aus
      // `chimeThresholdForLevel`. Stand hier die Formel nochmal ausgeschrieben,
      // fehlte ihr die Exponentialbremse — die Differenz zur gebremsten
      // Vorstufe wurde oberhalb von LEVEL_SCALING_THRESHOLD negativ, die
      // Schleifenbedingung damit immer wahr, und `chimesEarnedForLevel` wuchs
      // durch die Subtraktion sogar. „Skip all augments" hängte den Tab ab
      // Level 31 auf.
      let chimesNeededThisLevel =
        this.chimesForNextLevel - chimeThresholdForLevel(this.level - 1, exponent)

      while (this.chimesEarnedForLevel >= chimesNeededThisLevel) {
        this.level++
        this.chimesForNextLevel = chimeThresholdForLevel(this.level, exponent)
        this.chimesEarnedForLevel = Math.max(0, this.chimesEarnedForLevel - chimesNeededThisLevel)
        // Calculate new threshold for the next level
        chimesNeededThisLevel =
          this.chimesForNextLevel - chimeThresholdForLevel(this.level - 1, exponent)

        if (this.level % spInterval === 0) {
          this.skillPoints++
        }

        // Dasselbe Intervall wie in calculateLevel — sonst bekäme, wer die
        // Auswahl überspringt, doppelt so viele Augments wie jemand, der sie
        // durchklickt.
        if (this.level % AUGMENT_LEVEL_INTERVAL === 0) this.triggerAugmentSelection()
        if (this.pendingAugmentOptions.length > 0) {
          const firstId = this.pendingAugmentOptions[0]
          if (!this.activeAugments.includes(firstId)) this._addAugment(firstId)
        }
        this.pendingAugmentChoice = false
        this.pendingAugmentOptions = []
      }

      for (const pending of this.pendingAugmentSelections) {
        const id = pending.options[0]
        if (id && !this.activeAugments.includes(id)) this._addAugment(id)
      }
      this.pendingAugmentSelections = []

      const shopStore = useShopStore()
      this.chimesPerSecond = shopStore.calculateTotalCPS()
      this.chimesPerClick = shopStore.calculateTotalCPC()
    },

    // Unlocks an ability with Meeps (one-time, sequentially)
    // Increases an ability level when skill points are available
    upgradeAbility(index: number) {
      const maxLevel = this.activeModifier.maxAbilityLevel ?? MAX_ABILITY_LEVEL
      if (this.skillPoints > 0 && this.abilityLevels[index] < maxLevel) {
        this.abilityLevels[index]++
        this.skillPoints--
        const shopStore = useShopStore()
        this.chimesPerSecond = shopStore.calculateTotalCPS()
        this.chimesPerClick = shopStore.calculateTotalCPC()
      }
    },

    /**
     * Checks if Prestige is available.
     *
     * Die Schranke ist „es gibt ein ANDERES Universum", nicht „es gibt ein
     * höheres". Vorher stand hier `currentUniverse < totalUniverses`, und damit
     * war das letzte Universum eine Sackgasse: wer es wählte, konnte nie wieder
     * prestigen, obwohl `selectPrestigeUniverse` jedes andere Ziel längst
     * zuliess. Die Universen sind keine Leiter, sondern eine Auswahl — und seit
     * der Vorsehung gibt es einen Grund, dasselbe Universum ein zweites Mal zu
     * bereisen: gleiche Wirtschaft, anderer Kosmos.
     *
     * Sie zieht ausserdem das Angebot, aus dem im Firmament die drei Portale
     * werden — und zwar als BEDINGUNG, nicht im Moment des Kippens. Der
     * Unterschied traegt: das Admin-Panel setzt `prestigeAvailable` direkt und
     * liefe an einem Kipp-Zeitpunkt vorbei, der Spieler saesse dann vor einem
     * verfuegbaren Prestige ohne ein einziges Portal. So heilt sich jeder Pfad
     * von selbst — Admin-Sprung, Altstand, ein Reset, der das Angebot geraeumt
     * hat. `rollOffer` traegt den Riegel gegen das Neuwuerfeln, also ist das
     * hier ein `if` und keine Ziehung je Sekunde.
     */
    checkPrestigeAvailability() {
      if (
        !this.prestigeAvailable &&
        this.chimesForNextUniverse >= this.chimesToUniverseRescue &&
        this.totalUniverses > 1
      ) {
        this.prestigeAvailable = true
      }
      if (this.prestigeAvailable && this.totalUniverses > 1) {
        useProvidenceStore().rollOffer(this.currentUniverse)
      }
    },

    /**
     * Hält die Lebenszeit-Zähler fest, mit denen das aktuelle Universum
     * betreten wurde.
     *
     * Jeder „in diesem Universum"-Wert im Header-Tooltip ist eine Differenz
     * gegen diesen Stand. Das ist der Grund, warum kein einziger Store einen
     * zweiten, parallel gepflegten Zähler braucht, der beim Prestige mit
     * zurückgesetzt werden müsste — und warum ein neuer Wert im Tooltip nur
     * hier eine Zeile kostet, nicht im halben Projekt.
     */
    beginUniverseRun() {
      const galaxyStore = useGalaxyStore()
      const starGroupStore = useStarGroupStore()
      const planetBossStore = usePlanetBossStore()
      this.universeRun = {
        startedAtInGameTime: this.inGameTime,
        starsRescued: galaxyStore.totalStarsRescued,
        starsLost: galaxyStore.totalStarsLost,
        galaxiesFreed: galaxyStore.totalGalaxyBossesDefeated,
        planetsCleared: starGroupStore.totalPlanetsCleared,
        bossesFelled: planetBossStore.totalBossesDefeated,
        meepsEarned: this.totalMeepsEarned,
        materialsGathered: useInventoryStore().totalMaterialsCollected,
        clicks: this.totalClicks,
      }
    },

    /** Legt den laufenden Durchlauf ins Archiv — direkt vor dem Prestige-Reset,
     *  solange die Zähler des alten Universums noch stehen. */
    finishUniverseRun() {
      const stats = this.universeRunStats
      this.universeRuns.push({
        universe: this.currentUniverse,
        durationSeconds: stats.playedSeconds,
        starsRescued: stats.starsRescued,
        galaxiesFreed: stats.galaxiesFreed,
        chimes: this.chimesForNextUniverse,
        // Die Vorsehung gehoert zum verlassenen Lauf — sie wird beim naechsten
        // Aufbruch neu gezogen und waere danach nicht mehr zu erfahren.
        providence: useProvidenceStore().active?.name,
        // Wanduhr: Chronikstempel eines abgeschlossenen Universums-Durchlaufs.
        // eslint-disable-next-line no-restricted-syntax
        completedAt: Date.now(),
      })
      const overflow = this.universeRuns.length - UNIVERSE_RUN_HISTORY_LIMIT
      if (overflow > 0) this.universeRuns.splice(0, overflow)
      // Die Ratsche der Meep-Anforderung. Sie steht hier und nicht im Takt,
      // weil sie NUR beim Aufbruch steigen darf (siehe `bestUniverseRunChimes`).
      // Der Aufrufer muss den Lohn VORHER gelesen haben — ab dieser Zeile gilt
      // die neue Anforderung.
      this.bestUniverseRunChimes = Math.max(this.bestUniverseRunChimes, this.chimesForNextUniverse)
    },

    /**
     * Admin: die Aufbrüche nachtragen, die ein Sprung ins letzte Universum
     * überspringt — das Gegenstück zu `galaxyStore.adminBackfillArchive()` und
     * zwingend NACH ihm: die Tore der Firmament-Bahn sitzen auf den Stempeln,
     * die der Archiv-Nachtrag gerade vergeben hat.
     *
     * Sie steht hier und nicht in `maxEverything`, weil die fünf Felder EIN
     * Invariant sind: `finishUniverseRun` und `executePrestigeReset` setzen sie
     * zusammen, und wer ein sechstes an den Aufbruch hängt, fände sonst nur den
     * einen der beiden Orte.
     *
     * Jede Zuweisung über `Math.max` — der Knopf ist idempotent.
     */
    adminBackfillUniverseRuns(): number {
      const galaxyStore = useGalaxyStore()
      const records = [...galaxyStore.completedGalaxies].sort((a, b) => a.galaxy - b.galaxy)
      const added = buildBackfillUniverseRuns(records, this.currentUniverse, this.universeRuns)
      if (added.length > 0) {
        this.universeRuns.push(...added)
        this.universeRuns.sort((a, b) => a.completedAt - b.completedAt)
      }
      this.totalPrestiges = Math.max(this.totalPrestiges, this.universeRuns.length)
      // `overwrite`, weil die Grenzen gerade erst entstanden sind: ein Stempel
      // von vorher stünde quer zu Läufen, die es beim Setzen nicht gab.
      galaxyStore.completedGalaxies = assignRecordUniverses(
        galaxyStore.completedGalaxies,
        this.universeRuns,
        this.currentUniverse,
        this.totalPrestiges,
        { overwrite: true },
      )
      // Ohne die drei Zahlen behauptet das Wappenband „0 / 100k" neben neun
      // Aufbrüchen, während `prestigeAvailable` längst steht.
      this.chimesToUniverseRescue = Math.max(
        this.chimesToUniverseRescue,
        UNIVERSE_RESCUE_INITIAL_COST * UNIVERSE_RESCUE_COST_MULTIPLIER ** this.totalPrestiges,
      )
      this.chimesForNextUniverse = Math.max(this.chimesForNextUniverse, this.chimesToUniverseRescue)
      // Die Ratsche steigt NUR aus abgeschlossenen Läufen — `chimesForNextUniverse`
      // gehört dem laufenden und ist noch nicht gebucht. Sie muss aber stehen:
      // auf null bliebe der Anker `MEEP_RUN_BASE_MIN`, und der Nachtrag
      // verschenkte fünfstellig Meeps.
      this.bestUniverseRunChimes = Math.max(
        this.bestUniverseRunChimes,
        ...this.universeRuns.map((run) => run.chimes),
      )
      // Hier wird gerade angekommen, nicht gespielt: ohne diese Zeile misst
      // `universeRunStats` das ganze nachgetragene Archiv als „in diesem
      // Universum".
      this.beginUniverseRun()
      return added.length
    },

    // Executes the actual Prestige reset
    executePrestigeReset(targetUniverse?: number) {
      const nextUniverse = targetUniverse ?? this.currentUniverse + 1
      logger.info('Game', `Prestige reset -> Universe ${nextUniverse}`)
      // Der Lohn steht fest, BEVOR irgendetwas sich bewegt — und zwar aus zwei
      // Gründen, die beide in den nächsten Zeilen stehen. `finishUniverseRun()`
      // hebt `bestUniverseRunChimes` auf die Chimes dieses Laufs, womit die
      // Anforderung sofort nachzieht: danach gelesen zahlte der Aufbruch rund
      // ein Drittel weniger, als der Header eine Sekunde zuvor versprochen hat
      // (200k Chimes gegen 100k Bestwert: 45 versprochen, 32 gezahlt). Und
      // `chimesForNextUniverse = 0` weiter unten löscht ohnehin die Grundlage.
      const owed = this.pendingMeeps
      // Vor jeder Mutation: der Datensatz beschreibt das Universum, das gerade
      // verlassen wird, und liest dafür dessen noch unveränderte Zähler.
      this.finishUniverseRun()
      this.grantMeeps(owed)
      this.currentUniverse = nextUniverse
      this.totalPrestiges += 1
      this.chimesToUniverseRescue = Math.ceil(
        this.chimesToUniverseRescue * UNIVERSE_RESCUE_COST_MULTIPLIER,
      )
      this.chimesForNextUniverse = 0
      // Läuft mit den Laufchimes zusammen zurück: der neue Lauf startet ohne
      // Frass. `totalMeepsDevoured` bleibt stehen, es ist ein Lebenszeit-Zähler.
      this.meepsDevoured = 0
      this.prestigeAvailable = false
      // Das Angebot ist verbraucht. `choose()` leert es zwar selbst, aber es
      // liegt seit dem Fall des Modals im Spielstand und ueberlebt jeden Weg,
      // der nicht ueber `travelToUniverse` lief.
      useProvidenceStore().clearOffer()
      this.chimes = 0
      this.level = 1
      this.chimesForNextLevel = LEVEL_BASE
      this.chimesEarnedForLevel = 0
      this.skillPoints = 0
      this.abilityLevels = [0, 0, 0, 0]
      this.activeAugments = []
      // Mit den Augments fällt auch deren Rabatt-Untergrenze zurück.
      this.runMeepCostFloor = 1
      this.pendingAugmentChoice = false
      this.pendingAugmentOptions = []
      this.pendingAugmentSelections = []
      this.isGamePaused = false
      // totalChimesEarned & totalClicks persist across prestiges
      //
      // Der Meep-Baum bleibt STEHEN. Er wurde einmal hier zurückgesetzt, und
      // zusammen mit `meeps = 0` hiess das: der Spieler kaufte dieselben 25
      // Knoten in jedem Universum neu. Seit Meeps der Lohn des Aufbruchs sind,
      // wäre das ein Widerspruch in sich — man bekäme die Währung genau in dem
      // Moment, in dem das Gekaufte verschwindet. Der Baum ist jetzt die eine
      // Achse, die über Universen hinweg wächst.
      // Der Void reist nicht mit. Ein Wesen, das im Moment des Aufbruchs anflog,
      // gehört zum verlassenen Universum — und da das Level hier auf 1 fällt,
      // stünde es im neuen unter der Freischaltschwelle da: sichtbar, drosselnd
      // und ohne Weg, es loszuwerden. Auch die Nachbeben bleiben zurück.
      useVoidStore().clearAll()
      const augmentStore = useAugmentStore()
      augmentStore.$reset()
      const shopStore = useShopStore()
      this.chimesPerSecond = shopStore.calculateTotalCPS()
      this.chimesPerClick = shopStore.calculateTotalCPC()
      // Neue Basislinie: ab hier zählt der Tooltip wieder bei null.
      this.beginUniverseRun()

      // Die Ankunft ansagen lassen. Hier und nur hier ist `owed` noch bekannt —
      // `pendingMeeps` hängt an `chimesForNextUniverse`, und das steht seit
      // dreissig Zeilen auf null. Der Herold spielt es aus, sobald das Bild frei
      // ist: bei laufender Animation liegt sein Layer (9700) unter dem
      // Hyperspace (9999), eine Ansage von hier aus liefe im Weissblitz ab.
      //
      // Die Logzeile dagegen geht SOFORT — sie ist die Aufzeichnung, nicht der
      // Blitz, und dasselbe Muster („erst loggen, dann ansagen") tragen
      // missionStore, omenStore und achievementStore.
      const providence = useProvidenceStore().active
      logUniverseReached(universeLabel(nextUniverse), providence?.name ?? null)
      useUiStore().noteArrival(nextUniverse, owed)
    },

    /**
     * AUFBRECHEN — die eine Geste, die einen Durchlauf beendet.
     *
     * Sie sitzt an einem Portal im Firmament, und sie ist die EINZIGE Stelle,
     * an der die Reihenfolge steht: erst die Vorsehung antreten, dann reisen.
     * Andersherum liefe der neue Durchlauf fuer die Dauer der
     * Hyperspace-Animation noch unter der alten. Eine zweite Fassung dieser
     * Reihenfolge irgendwo anders ist genau der Fehler, gegen den sie hier
     * gebuendelt ist.
     *
     * Das Profil macht dabei zu: der Blitz gehoert auf die BUEHNE, und wer
     * gereist ist, will nicht im Reiter aufwachen. Dasselbe tut der galaxyStore
     * beim Galaxienwechsel, aus demselben Grund.
     */
    travelToUniverse(targetUniverse: number) {
      if (targetUniverse === this.currentUniverse) return
      if (this.isHyperspaceActive) return
      if (!useProvidenceStore().choose(targetUniverse)) return

      const ui = useUiStore()
      if (ui.bardActiveTab !== null) ui.closeBardModal()

      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        this.executePrestigeReset(targetUniverse)
        return
      }

      this.isHyperspaceActive = true
      gameTimeout(() => {
        this.executePrestigeReset(targetUniverse)
      }, HYPERSPACE_ANIM_START_MS)
      gameTimeout(() => {
        this.isHyperspaceActive = false
      }, HYPERSPACE_ANIM_END_MS)
    },

    // Processes passive income per second
    tick() {
      this.inGameTime++
      useSolarUpgradeStore().tickDwell()
      useStarForgeStore().tick()
      // Drifters: expire finished buffs, drop objects that flew past uncollected
      // and roll for the next spawn. Runs before production so a buff that ends
      // this second is already gone when the chimes below are credited.
      useDrifterStore().tick()
      // Bard abilities: expire the shrine/journey windows and carry a running
      // stasis forward. Same reasoning as the drifters above — a window that
      // closes this second must be gone before the chimes are credited.
      useBardAbilityStore().tick()
      // The Void: put the orbit's fire on the open rift, collapse it if its
      // time ran out, and roll for the next one. Runs here — after the stasis
      // above, before production below — for two reasons: a stasis started this
      // second must already hold the rift's clock, and the rift's drain has to
      // be on the books before the chimes are credited. Its own drain moves
      // every tick with the ramp, so it refreshes the cached rates itself.
      useVoidStore().tick()
      // Material intake window: slide the minute buckets forward even in a
      // minute where nothing dropped, so the header sparkline shows the gap
      // instead of an hour-old spike frozen at the right edge.
      useInventoryStore().advanceRateWindow()
      const cps = this.chimesPerSecond * this.mvpBuffMultiplier
      if (this.mvpBuffSecondsLeft > 0) this.mvpBuffSecondsLeft--
      if (cps > 0) {
        this.chimes += cps
        this.chimesForNextUniverse += cps
        this.totalChimesEarned += cps
        this.chimesEarnedForLevel += cps
        this.calculateLevel()
      }
      this.checkPrestigeAvailability()
      // Auto level-up runs AFTER production so the chimes earned this second are
      // already on the balance it pays from. Returns immediately while the
      // switch is off, which is the default.
      useChampionLevelStore().autoLevelTick()
      // Boss-Enrage und Champion-Reise. Beides lief bis hierher über einen
      // planetEventStore, der nichts anderes tat, als die zwei Aufrufe
      // weiterzureichen — Reihenfolge unverändert.
      const planetBossStore = usePlanetBossStore()
      const galaxyStore = useGalaxyStore()
      if (planetBossStore.isBossActive) {
        planetBossStore.checkEnrage()
      }
      galaxyStore.tickChampionTravel()
      const starGroupStore = useStarGroupStore()
      // Zufällig gestaffelte Resource-Star-Spawns; spawnResourceStar respektiert
      // das Concurrency-Limit selbst. Läuft auch während Pause weiter, damit
      // Sterne im Pause-Overlay erscheinen, bekämpft werden und despawnen.
      if (galaxyStore.tickResourceStar(GAME_TICK_INTERVAL_MS)) {
        starGroupStore.spawnResourceStar()
      }
      starGroupStore.tickResourceStars()
      starGroupStore.tickChampionStar()
      const roleBehaviorStore = useRoleBehaviorStore()
      roleBehaviorStore.tick()
      if (planetBossStore.isBossActive) {
        planetBossStore.applyPassiveDamage()
      }
      if (planetBossStore.cpsPenaltyActive && gameNow() >= planetBossStore.cpsPenaltyExpiresAt) {
        planetBossStore.clearPenalty()
      }
      const expeditionStore = useExpeditionStore()
      expeditionStore.checkExpeditions()
      expeditionStore.checkAvailability()
      const augmentStore = useAugmentStore()
      augmentStore.onTick()
      const planetShopStore = usePlanetShopStore()
      // turret_planet: automatic damage to active Boss — die Salve zählt den
      // geteilten Volley-Counter hoch (treibt Idle-Orbit-Schüsse + Star-Fight-
      // Planet-Battery), der Schaden landet erst beim Projektil-Einschlag.
      // Vordergrund-Gate: nur sichtbare Turrets feuern, und ein Boss hinter
      // der Sonne wird nicht beschossen (Salve setzt dann einen Takt aus)
      const autoAttackDPS = planetShopStore.foregroundAutoAttackDPS
      if (autoAttackDPS > 0 && planetBossStore.isBossActive) {
        const target = planetBossStore.activeBoss
        if (
          target &&
          !target.defeated &&
          !target.expired &&
          bossPlanetInForeground(target.planetId)
        ) {
          planetBossStore.turretVolleyCounter++
          gameTimeout(() => {
            if (target.defeated || target.expired) return
            planetBossStore.dealDamageToBoss(target, autoAttackDPS)
          }, TURRET_PROJECTILE_FLIGHT_MS)
        }
      }
      // Zerstörte Planeten nach Ablauf ihrer Ausfallzeit zurückholen
      planetShopStore.tickRespawn()
      // harvest_node: periodic material harvest
      planetShopStore.tickHarvest(this.inGameTime)
      const combatStore = useCombatStore()
      combatStore.tick()
      const playerStore = usePlayerStore()
      playerStore.regenTick()
      // Midas Overflow (Star-Forge-Krone): der Chime-Berg setzt Stardust ab.
      //
      // Steht NACH der Produktion und vor Omen und Chronik: der Getter liest
      // `this.chimes`, und gelesen vor der Gutschrift dieser Sekunde hinge die
      // Ausschüttung am Stand der vorigen. Er kostet nichts, solange die Krone
      // nicht steht — dann ist er ein Vergleich gegen `false`.
      const overflow = useStarForgeStore().chimeOverflowPerSec
      if (overflow > 0) {
        useInventoryStore().addMaterial(FORGE_CROWN_OVERFLOW_MATERIAL, 'drop', overflow)
      }
      // Skill-tree notifications: drop stale acknowledgements so a node that
      // became unaffordable re-notifies once the player can afford it again.
      useMeepTreeStore().syncAcknowledged()
      // Dasselbe für den Shop: ein Eintrag, der wieder zu teuer geworden ist,
      // verliert seine Quittung und meldet sich als neu, sobald er erneut
      // bezahlbar wird.
      useStarForgeStore().syncShopAcknowledged()
      // Omens directly before the chronicle, for the same reason and with the
      // same requirement: the running omen measures a DIFFERENCE against the
      // counters above, so it has to see them at their final value for this
      // second. Its own payout is a timed buff, which the chronicle does not
      // read — the order between these two is therefore free.
      useOmenStore().tick()
      // Der Wayfinder daneben, aus demselben Grund: seine Leiter misst eine
      // ABSOLUTE Zahl gegen dieselben Zähler und muss sie auf Endstand sehen.
      // Er zahlt selbst aus, VOR dem Chronicle — dessen Zähler sehen die
      // Gutschrift damit in derselben Sekunde. Die Reihenfolge zwischen Omen und
      // Wayfinder ist frei.
      useMissionStore().tick()
      // Chronicle last: every counter this second feeds it (chimes above,
      // bosses, stars, drifters), so a milestone announced here is one that was
      // just earned — not one from the previous tick.
      useAchievementStore().tick()

      // Ganz zuletzt, und aus demselben Grund wie der Chronicle: die Telemetrie
      // soll den ENDSTAND dieser Sekunde festhalten. Ausgeschaltet kostet der
      // Aufruf einen Boolean-Vergleich.
      recordTelemetry()
    },

    // Credits offline Chimes and closes the modal
    /** `multiplier` kommt aus „The Crossing" und ist ein Bruch (1 … 2). */
    claimOfflineReward(multiplier = 1) {
      const earned = Math.floor(this.offlineChimes * multiplier)
      this.chimes += earned
      this.chimesForNextUniverse += earned
      this.totalChimesEarned += earned
      this.chimesEarnedForLevel += earned
      this.offlineChimes = 0
      this.offlineSeconds = 0
      this.showOfflineModal = false
      this.calculateLevel()
    },

    // Sets the modal state for UI effects
    setCPSModalOpen(isOpen: boolean) {
      this.isCPSModalOpen = isOpen
    },

    setExpeditionModalOpen(isOpen: boolean) {
      this.isExpeditionModalOpen = isOpen
    },

    toggleEncyclopedia() {
      this.isEncyclopediaOpen = !this.isEncyclopediaOpen
    },

    // Sends Meeps on a portal expedition
    startExpedition(
      universeId: number,
      universeName: string,
      meepsSent: number,
      durationMs: number,
      reward: number,
    ) {
      if (this.activeExpedition || meepsSent < 1 || meepsSent > this.meeps) return
      this.meeps -= meepsSent
      this.activeExpedition = {
        universeId,
        universeName,
        meepsSent,
        startTime: gameNow(),
        durationMs,
        reward,
        collected: false,
      }
      logger.info('Game', `Expedition started: ${universeName}`, { meepsSent, durationMs, reward })
    },

    // Collects a completed expedition
    collectExpedition() {
      if (!this.activeExpedition) return
      if (gameNow() < this.activeExpedition.startTime + this.activeExpedition.durationMs) return
      const { reward, meepsSent } = this.activeExpedition
      this.chimes += reward
      this.chimesEarnedForLevel += reward
      this.meeps += meepsSent
      logger.info('Game', `Expedition collected: +${reward} chimes, ${meepsSent} meeps returned`)
      this.activeExpedition = null
      this.calculateLevel()
    },
  },

  getters: {
    combinedAugmentEffects(): AugmentEffects {
      const result: AugmentEffects = {}
      const additiveKeys: (keyof AugmentEffects)[] = [
        'abilityPowerPerLevel',
        'enemyMaxHPDrainPerSecond',
      ]
      for (const id of this.activeAugments) {
        const aug = AUGMENTS.find((a) => a.id === id)
        if (!aug) continue
        for (const [key, val] of Object.entries(aug.effects)) {
          const k = key as keyof AugmentEffects
          if (additiveKeys.includes(k)) {
            ;(result as Record<string, number>)[k] =
              ((result[k] as number | undefined) ?? 0) + (val as number)
          } else {
            ;(result as Record<string, number>)[k] =
              ((result[k] as number | undefined) ?? 1) * (val as number)
          }
        }
      }
      const augmentStore = useAugmentStore()
      const ksm = augmentStore.keyboardSmashModifiers
      for (const [key, val] of Object.entries(ksm)) {
        const k = key as keyof AugmentEffects
        ;(result as Record<string, number>)[k] =
          ((result[k] as number | undefined) ?? 1) * (val as number)
      }
      return result
    },

    /**
     * Die Effekte, unter denen dieser Durchlauf steht — Vorsehung mal Augments.
     *
     * Die Basis kam früher aus `universes[…].modifier`, also fest aus dem
     * Katalog. Seit Universum und Vorsehung beim Prestige ZUSAMMEN gezogen
     * werden, liefert die gewählte Vorsehung sie; das Universum trägt nur noch
     * Name und Wappen. Alle Lesestellen dieses Getters blieben dabei unverändert
     * — genau dafür ist er die eine Stelle, an der die Quelle steht.
     */
    activeModifier(): ModifierEffects {
      const base = useProvidenceStore().activeEffects
      const aug = this.combinedAugmentEffects
      return {
        cpsMultiplier: (base.cpsMultiplier ?? 1) * (aug.cpsMultiplier ?? 1),
        cpcMultiplier: (base.cpcMultiplier ?? 1) * (aug.cpcMultiplier ?? 1),
        buildingCostMultiplier:
          (base.buildingCostMultiplier ?? 1) * (aug.buildingCostMultiplier ?? 1),
        meepCostMultiplier: (base.meepCostMultiplier ?? 1) * (aug.meepCostMultiplier ?? 1),
        meepPowerMultiplier: (base.meepPowerMultiplier ?? 1) * (aug.meepPowerMultiplier ?? 1),
        expeditionRewardMultiplier:
          (base.expeditionRewardMultiplier ?? 1) * (aug.expeditionRewardMultiplier ?? 1),
        levelExponent: base.levelExponent,
        maxAbilityLevel: base.maxAbilityLevel,
        skillPointInterval: base.skillPointInterval,
        baseChimesPerClick: base.baseChimesPerClick,
        eloPowerMultiplier: base.eloPowerMultiplier,
        abilityCPSPerLevel: base.abilityCPSPerLevel,
        abilityCPCPerLevel: base.abilityCPCPerLevel,
        abilityMeepCostPerLevel: base.abilityMeepCostPerLevel,
        abilityPowerPerLevel:
          (base.abilityPowerPerLevel ?? ABILITY_POWER_PER_LEVEL_DEFAULT) +
          (aug.abilityPowerPerLevel ?? 0),
        cooldownMultiplier: aug.cooldownMultiplier,
        enemySpeedMultiplier: aug.enemySpeedMultiplier,
        enemyMaxHPDrainPerSecond: aug.enemyMaxHPDrainPerSecond,
      }
    },

    chimesToNextLevel(): number {
      return this.chimesForNextLevel - this.chimes
    },

    chimesAtLevelStart(): number {
      const exponent = this.activeModifier.levelExponent ?? LEVEL_EXPONENT
      return chimeThresholdForLevel(this.level - 1, exponent)
    },

    currentLevelChimes(): number {
      return this.chimesEarnedForLevel
    },

    totalChimesThisLevel(): number {
      return this.chimesForNextLevel - this.chimesAtLevelStart
    },

    levelProgress(): number {
      return clampPercent((this.currentLevelChimes / this.totalChimesThisLevel) * 100)
    },

    totalPower(): number {
      const meepPowerMod = this.activeModifier.meepPowerMultiplier ?? 1
      const eloPowerMod = this.activeModifier.eloPowerMultiplier ?? 1
      const itemPowerMul = useItemStore().totalPowerMultiplier
      const synergyPowerMul = useSynergyStore().powerSynergyMultiplier
      // VITALITY across the slotted main champions — champion levels tilt the
      // auto battle, not just planet boss damage.
      const championVitalityMul = useChampionLevelStore().teamVitalityMult
      const tree = useMeepTreeStore().fx
      return Math.floor(
        (this.meeps * MEEP_POWER_MULTIPLIER * meepPowerMod * tree.meepPowerMult +
          this.abilityPowerBonus +
          tree.powerBonus +
          // Hostcall — INNERHALB der Klammer, sonst traege er als einziger
          // Power-Term weder Elo- noch Item- noch Synergie-Faktor.
          useStarForgeStore().battlePowerBonus) *
          eloPowerMod *
          itemPowerMul *
          synergyPowerMul *
          championVitalityMul,
      )
    },

    abilityCPSMultiplier(): number {
      const perLevel = this.activeModifier.abilityCPSPerLevel ?? ABILITY_CPS_PER_LEVEL_DEFAULT
      return 1 + this.abilityLevels[0] * perLevel
    },
    abilityPowerBonus(): number {
      const perLevel = this.activeModifier.abilityPowerPerLevel ?? ABILITY_POWER_PER_LEVEL_DEFAULT
      return this.abilityLevels[1] * perLevel
    },
    abilityMeepCostMultiplier(): number {
      const perLevel =
        this.activeModifier.abilityMeepCostPerLevel ?? ABILITY_MEEP_COST_PER_LEVEL_DEFAULT
      return Math.max(ABILITY_MEEP_COST_MIN_MULTIPLIER, 1 - this.abilityLevels[2] * perLevel)
    },
    abilityCPCMultiplier(): number {
      const perLevel = this.activeModifier.abilityCPCPerLevel ?? ABILITY_CPC_PER_LEVEL_DEFAULT
      return 1 + this.abilityLevels[3] * perLevel
    },

    /** 2× while the MVP honor buff runs, otherwise 1. */
    mvpBuffMultiplier(): number {
      return this.mvpBuffSecondsLeft > 0 ? HONOR_MVP_BUFF_MULT : 1
    },

    universeRescueProgress(): number {
      return clampPercent((this.chimesForNextUniverse / this.chimesToUniverseRescue) * 100)
    },

    totalUniverses(): number {
      return universes.length
    },

    /** Was in diesem Universum passiert ist — Differenz gegen `universeRun`. */
    universeRunStats(): UniverseRunStats {
      const base = this.universeRun
      const galaxyStore = useGalaxyStore()
      const starGroupStore = useStarGroupStore()
      const planetBossStore = usePlanetBossStore()
      // Nie negativ: ein Speicherstand, dessen Basislinie beim Laden aus den
      // aktuellen Ständen gesetzt wurde, darf höchstens bei null anfangen.
      const since = (current: number, start: number) => Math.max(0, current - start)
      return {
        playedSeconds: since(this.inGameTime, base.startedAtInGameTime),
        starsRescued: since(galaxyStore.totalStarsRescued, base.starsRescued),
        starsLost: since(galaxyStore.totalStarsLost, base.starsLost),
        galaxiesFreed: since(galaxyStore.totalGalaxyBossesDefeated, base.galaxiesFreed),
        planetsCleared: since(starGroupStore.totalPlanetsCleared, base.planetsCleared),
        bossesFelled: since(planetBossStore.totalBossesDefeated, base.bossesFelled),
        meepsEarned: since(this.totalMeepsEarned, base.meepsEarned),
        materialsGathered: since(
          useInventoryStore().totalMaterialsCollected,
          base.materialsGathered,
        ),
        clicks: since(this.totalClicks, base.clicks),
      }
    },

    /** Chimes, die der Rettung dieses Universums noch fehlen. */
    universeRescueRemaining(): number {
      return Math.max(0, this.chimesToUniverseRescue - this.chimesForNextUniverse)
    },

    /**
     * Sekunden bis zur Rettung beim aktuellen Sekundenertrag — 0 wenn erreicht,
     * `Infinity` wenn nichts produziert wird.
     *
     * Bewusst nur die passive Produktion: Klicks, Bossbeute und Battle-Chimes
     * zahlen ebenfalls ein, lassen sich aber nicht vorhersagen. Die Schätzung
     * ist damit die Obergrenze, nicht der Erwartungswert.
     */
    universeRescueEtaSeconds(): number {
      if (this.universeRescueRemaining <= 0) return 0
      const rate = this.chimesPerSecond * this.mvpBuffMultiplier
      return rate > 0 ? this.universeRescueRemaining / rate : Infinity
    },

    /** Was das nächste Universum kosten wird — die Kurve hinter dem Balken. */
    nextUniverseRescueCost(): number {
      return Math.ceil(this.chimesToUniverseRescue * UNIVERSE_RESCUE_COST_MULTIPLIER)
    },

    /** Schnellster archivierter Durchlauf in Sekunden; 0 solange keiner steht. */
    fastestUniverseRunSeconds(): number {
      if (this.universeRuns.length === 0) return 0
      // Die Liste ist auf UNIVERSE_RUN_HISTORY_LIMIT gekappt — spread ist hier
      // eine Handvoll Werte, keine offene Liste.
      return Math.min(...this.universeRuns.map((run) => run.durationSeconds))
    },

    /** Dauer des zuletzt geretteten Universums in Sekunden; 0 solange keines. */
    lastUniverseRunSeconds(): number {
      return this.universeRuns[this.universeRuns.length - 1]?.durationSeconds ?? 0
    },

    /**
     * Schaden, den ein Klick am Planeten-Boss anrichtet.
     *
     * Das war einmal schlicht `max(1, chimesPerClick)` — der Klick richtete also
     * so viel Schaden an, wie er Chimes einbrachte. Zwei Grössen an einem Wert,
     * und eine davon ist eine reine Wirtschaftszahl: als der Klickwert von 20
     * auf 1 gesenkt wurde, fiel der Boss-Schaden um 95 %, die Boss-HP aber nur
     * um 44 %, weil `BOSS_BASE_HP` als Boden greift. Der erste Boss wäre von 18
     * auf 200 Klicks gegangen, bei 30 Sekunden Enrage-Uhr.
     *
     * Jetzt hat der Kampf seine eigene Basis. Der Solar-Zweig `chimesPerClick`
     * zahlt weiterhin ein — er heisst im Spiel „Chimes per Click" und darf beide
     * Seiten heben —, aber die Wirtschaft kann sich frei bewegen, ohne dass ein
     * Bosskampf sich mitverschiebt.
     *
     * Dieser Getter war lange tot: `planetBossStore` rechnete direkt mit
     * `chimesPerClick`, niemand las ihn. Er ist jetzt die Quelle für den
     * AUSGETEILTEN Schaden. In die HP-Schätzung geht er nur GEDÄMPFT ein — über
     * `expectedClickDamage()`, das geometrische Mittel aus ihm und der Basis;
     * ginge er voll ein, hübe jeder Punkt hier die Boss-HP um genau denselben
     * Betrag mit an und das Upgrade verpuffte.
     *
     * Der Solar-Beitrag ist ein FAKTOR, kein Summand. Additiv war er +2 auf
     * eine Basis von 20, also +10 %; auf der heutigen Basis von 1 wären
     * dieselben +2 eine Verdreifachung je Stufe — und zwar in Chime-Einheiten,
     * an einer Zahl, die keine Chimes mehr sind. `BOSS_CLICK_DAMAGE_CPC_BONUS`
     * hält die Wirkung des Zweigs bei exakt denselben +10 % je Stufe.
     */
    dmgPerClick(): number {
      const solar = useSolarUpgradeStore()
      return BOSS_CLICK_DAMAGE_BASE * (1 + solar.chimesPerClickLevel * BOSS_CLICK_DAMAGE_CPC_BONUS)
    },

    /**
     * Meeps, die der laufende Durchlauf beim Aufbruch einbringt.
     *
     * Ein reiner Getter, kein eigenes Feld: `chimesForNextUniverse` sammelt
     * bereits jeden Chime dieses Laufs und wird beim Prestige auf 0 gesetzt.
     * Ein zweiter Zähler daneben wäre eine zweite Quelle für dieselbe Zahl —
     * und zwei Quellen laufen auseinander, sobald jemand eine anfasst. So ist
     * die Ausbeute nebenbei reload-fest, ohne dass etwas zusätzlich gespeichert
     * werden müsste.
     *
     * Abgezogen wird, was der Void in diesem Lauf geholt hat (`meepsDevoured`).
     * Nie negativ: `devourMeeps` klemmt bereits auf den Bestand, das `max`
     * fängt nur den Randfall ab, dass `exactPendingMeeps` nachträglich fällt.
     */
    pendingMeeps(): number {
      return Math.max(0, Math.floor(this.exactPendingMeeps) - this.meepsDevoured)
    },

    /**
     * Die Chime-Anforderung je Meep — die Bezugsgröße der Wurzelformel.
     *
     * Der Anker ist der BESTE abgeschlossene Lauf des Spielers, mit einem Boden
     * für das erste Universum; die Herleitung beider Zahlen steht bei
     * `MEEP_RUN_BASE_MIN` / `MEEP_RUN_SHARE`. Weil `bestUniverseRunChimes` nur
     * beim Aufbruch steigt, steht diese Zahl während eines Laufs STILL.
     *
     * Drei Quellen SENKEN sie zusätzlich, alle mit Faktoren unter 1: der
     * Baumknoten `meepCostMult`, das Augment `meepCostMultiplier` (über
     * `activeModifier`, also auch die Vorsehung) und die dritte Bard-Fähigkeit.
     * Sie greifen bewusst an der BASIS und nicht am Ergebnis: die Wurzel
     * übersetzt eine halbierte Anforderung damit in das 1,41-Fache an Meeps
     * statt ins Doppelte — dieselbe Dämpfung, die auch längere Läufe erfahren.
     *
     * Der Augment-Anteil läuft über `runMeepCostFloor`, weil er als einziger
     * auch wieder STEIGEN könnte (der Augment-Deckel verdrängt) — und ein
     * steigender Faktor liesse `pendingMeeps` mitten im Lauf fallen.
     */
    meepChimeRequirement(): number {
      const anchor = Math.max(MEEP_RUN_BASE_MIN, this.bestUniverseRunChimes * MEEP_RUN_SHARE)
      const modifierMult = Math.min(
        this.runMeepCostFloor,
        this.activeModifier.meepCostMultiplier ?? 1,
      )
      const treeMult = useMeepTreeStore().fx.meepCostMult
      // Meep Shrine (Star Forge): senkt die ANFORDERUNG, nicht die Ausbeute —
      // die steht als Wurzel darauf. Braucht keinen Eintrag in
      // `runMeepCostFloor`: ein Relikt-Level kann nur steigen, der Faktor also
      // nur fallen, und die Monotonie der Anforderung bleibt von selbst heil.
      const forgeMult = useStarForgeStore().meepCostMult
      return Math.max(
        1,
        anchor * this.abilityMeepCostMultiplier * modifierMult * treeMult * forgeMult,
      )
    },

    /**
     * Ungerundete GESAMMELTE Ausbeute — vor dem Abzug des Voids. Die Quelle für
     * die ganze Zahl der Ausbeute; Füllstand und Restweg rechnen dagegen in
     * Chimes (siehe `pendingMeepFill`).
     */
    exactPendingMeeps(): number {
      return MEEP_RUN_FACTOR * Math.sqrt(this.chimesForNextUniverse / this.meepChimeRequirement)
    },

    /**
     * Fortschritt zum nächsten anstehenden Meep, 0..1 — der Ring der
     * Passiv-Kachel und der Prozentwert im Header-Tooltip.
     *
     * Gerechnet wird in CHIMES innerhalb des laufenden Schritts, nicht am
     * Nachkommaanteil von `exactPendingMeeps`. Der Unterschied ist der ganze
     * Punkt: die Wurzel ist innerhalb eines Schritts konkav, der Ring lief
     * deshalb vorn zu schnell und hinten zu langsam. Beim ERSTEN Meep stand er
     * bei der Hälfte der Strecke auf 70,7 % — und daneben die Zahl, die linear
     * in Klicks herunterzählt. Zwei Anzeigen derselben Strecke, zwei Kurven.
     *
     * Index und Formel sind bewusst dieselben wie in `chimesToNextMeep`: nur
     * so stimmen Ring und Zahl zwingend überein. `lower` ist die Chime-Marke,
     * bei der der Schritt begann, `span` seine Länge — und weil
     * `clicksToMeep = ⌈(upper − c) / Klickwert⌉` ist und die Klickzahl zu
     * Schrittbeginn `span / Klickwert`, kürzt sich der Klickwert weg. Steigt
     * er mitten im Schritt (Upgrade, MVP-Buff), steht der Ring still und nur
     * die Zahl springt herunter — der zurückgelegte Weg ist ja real.
     *
     * Wie zuvor misst er den WEG und nicht den Bestand, deshalb rührt ein
     * Void-Frass ihn nicht an: `meepsDevoured` zählt im Index mit, gefressen
     * wird die Ernte, nicht die Strecke.
     */
    pendingMeepFill(): number {
      const next = this.pendingMeeps + this.meepsDevoured + 1
      const req = this.meepChimeRequirement
      const upper = Math.pow(next / MEEP_RUN_FACTOR, 2) * req
      const lower = Math.pow((next - 1) / MEEP_RUN_FACTOR, 2) * req
      const span = upper - lower
      if (span <= 0) return 1
      return Math.min(1, Math.max(0, (this.chimesForNextUniverse - lower) / span))
    },

    /**
     * Chimes, die dem nächsten anstehenden Meep noch fehlen.
     *
     * Der Zielindex zählt den Frass MIT: gefressene Meeps sind gesammelt und
     * bezahlt, der nächste ist also der (gesammelt + 1)-te und nicht der
     * (gehaltene + 1)-te. Ohne diesen Term zeigte die Anzeige nach einem
     * Einschlag eine Strecke an, die längst zurückgelegt ist.
     */
    chimesToNextMeep(): number {
      const next = this.pendingMeeps + this.meepsDevoured + 1
      const needed = Math.pow(next / MEEP_RUN_FACTOR, 2) * this.meepChimeRequirement
      return Math.max(0, Math.ceil(needed - this.chimesForNextUniverse))
    },

    /**
     * Klicks, die bis zum nächsten Meep noch fehlen; 0, wenn er fällig ist.
     *
     * Bewusst NUR über den Klickwert gerechnet, obwohl die laufende Produktion
     * ebenfalls einzahlt: die Zahl beantwortet „wie oft muss ich noch drücken?",
     * und dafür ist die Produktion eine Zugabe, keine Größe der Rechnung.
     *
     * Sie steht an zwei Stellen — an der Passiv-Kachel im Orbit und im
     * Passive-Slot des Profil-Kopfs — und gehört deshalb hierher: zwei
     * Komponenten, die dieselbe Strecke aus je eigener Rechnung zeigen, laufen
     * über kurz oder lang auseinander.
     */
    clicksToNextMeep(): number {
      const remaining = this.chimesToNextMeep
      if (remaining <= 0) return 0
      const perClick = Math.max(1, this.chimesPerClick * this.mvpBuffMultiplier)
      return Math.ceil(remaining / perClick)
    },

    isExpeditionComplete(): boolean {
      if (!this.activeExpedition) return false
      return gameNow() >= this.activeExpedition.startTime + this.activeExpedition.durationMs
    },

    expeditionProgress(): number {
      if (!this.activeExpedition) return 0
      const elapsed = gameNow() - this.activeExpedition.startTime
      return clampPercent((elapsed / this.activeExpedition.durationMs) * 100)
    },
  },
})
