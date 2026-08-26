import { defineStore } from 'pinia'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useUiStore } from '@/stores/core/uiStore'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import { unlockedChampionTierCount } from '@/config/champions/championTiers'
import type { ChampionRole, ActiveLandfall, LandfallOutcome } from '@/types'
import { clampPercent } from '@/utils/orbit/geometry'
import { gameNow, gameTimeout } from '@/utils/game/gameClock'
import { galaxyDepth } from '@/utils/game/galaxyDepth'
import { landfallOnLeg, landfallWindowMs } from '@/utils/game/landfalls'
import { buildBackfillRecord, backfillThemeRng } from '@/utils/game/galaxyArchiveBackfill'
import {
  CHAMPION_TRAVEL_BASE_MS,
  CHAMPION_TRAVEL_SCALE_MS,
  CHAMPION_TRAVEL_MAX_MS,
  RESOURCE_STAR_INTERVAL_MIN_MS,
  RESOURCE_STAR_INTERVAL_MAX_MS,
  LANDFALL_REEF_BASE_SECONDS,
  LANDFALL_REEF_CLICK_SECONDS,
  LANDFALL_REEF_MAX_CLICKS,
  LANDFALL_REEF_CPS_FLOOR_CLICKS,
  GALAXY_STARS_BASE_REQUIRED,
  GALAXY_STARS_MAX,
  GALAXIES_PER_TIER,
  GALAXY_CHAMPION_ARRIVAL_SIGNAL_MS,
  GALAXY_STAR_FAILED_SIGNAL_MS,
  GALAXY_BOSS_SPAWN_ANIM_MS,
  GALAXY_BOSS_ESCORT_BASE,
  GALAXY_BOSS_ESCORT_PER_GALAXY,
  GALAXY_BOSS_ESCORT_MAX,
  GALAXY_BOSS_WAVE_SIZE,
  RESCUE_ROTATION_DURATION_MS,
  GALAXY_TRANS_WARP_MS,
  GALAXY_TRANS_DECEL_MS,
  MAX_STAR_LEVEL,
  TIER_UNLOCK_CHIMES_BASE,
  TIER_UNLOCK_CHIMES_GROWTH,
  TIER_UNLOCK_MATERIAL_GROWTH,
  TIER_UNLOCK_MATERIAL_BASE,
  TIER_UNLOCK_MATERIAL_LATE,
  TIER_UNLOCK_LATE_FROM_TIER,
  TIER_UNLOCK_COST_CAP_TIER,
  MIN_THEME_HUE_DISTANCE,
  ADMIN_ARCHIVE_RECENT_GAP_MS,
  ADMIN_ARCHIVE_GAP_MS,
} from '@/config/constants'

export type ChampionTravelState = 'idle' | 'traveling' | 'champion_available' | 'champion_spawned'

export type StarAttemptResult = 'rescued' | 'failed'

/** Archived record of a completed galaxy — everything the Bard-Stats
 *  "Galaxy Archive" needs to re-render the minimap exactly as it was played
 *  (the snapshot renderer is deterministic in mapSeed + attemptResults). */
export interface CompletedGalaxyRecord {
  galaxy: number
  mapSeed: number
  themeIndex: number
  attemptResults: StarAttemptResult[]
  /** Die Orte, die auf den Reiseetappen lagen — in Routenreihenfolge.
   *  OPTIONAL: Spielstände von vor den Landfalls laden ohne Migration und zeigen
   *  keine. Das ist wahr, nicht gelogen — es gab dort keine. */
  landfallResults?: LandfallOutcome[]
  /** In-game seconds spent from entering the galaxy until the core was freed. */
  durationSeconds: number
  /** Wall-clock timestamp of the completion. */
  completedAt: number
}

export interface TierUnlockCost {
  chimes: number
  material: Record<string, number>
}

/**
 * Sterne, die eine Galaxie verlangt: `3 + (g−1)`, gedeckelt bei
 * `GALAXY_STARS_MAX` — also 3/4/5/6/7/7/7…
 *
 * Warum die Sternzahl und nicht die Reisedauer: beides streckt die Achse, aber
 * ein Stern ist eine Schleife aus Rollenwahl, Reise, Ankunft und Bosskampf,
 * eine längere Reise dagegen nichts als Warten. Warum der Deckel dann bei 7 und
 * nicht bei 36 steht, steht bei der Konstante.
 */
export function computeRequired(galaxy: number): number {
  return Math.min(GALAXY_STARS_BASE_REQUIRED + (galaxy - 1), GALAXY_STARS_MAX)
}

// Eskorten-Sterne, die zusammen mit dem Galaxieboss auftauchen — frühe
// Galaxien wenige, später mehr (exportiert für Tests).
export function computeBossEscortCount(galaxy: number): number {
  return Math.min(
    Math.round(GALAXY_BOSS_ESCORT_BASE + galaxyDepth(galaxy) * GALAXY_BOSS_ESCORT_PER_GALAXY),
    GALAXY_BOSS_ESCORT_MAX,
  )
}

// ── Galaxy Tier helpers (pure, exported for tests) ──────────────────────────
// Tier 1 = G1-2, danach spannt jedes Tier GALAXIES_PER_TIER Galaxien.
export function tierOf(galaxy: number): number {
  return galaxy <= 2 ? 1 : 2 + Math.floor((galaxy - 3) / GALAXIES_PER_TIER)
}

export function firstGalaxyOfTier(tier: number): number {
  return tier <= 1 ? 1 : 3 + (tier - 2) * GALAXIES_PER_TIER
}

// Galaxy N targets star level N, clamped to the finite champion pool ceiling.
export function starLevelForGalaxy(galaxy: number): number {
  return Math.min(Math.max(1, galaxy), MAX_STAR_LEVEL)
}

// Tier 1 is free. From tier 2 up, Chimes + Material grow geometrically.
export function computeTierUnlockCost(tier: number): TierUnlockCost {
  if (tier <= 1) return { chimes: 0, material: {} }
  // Jenseits des letzten INHALTS-Tiers hört das Wachstum auf.
  //
  // Galaxien laufen unbegrenzt weiter, neuer Inhalt gibt es aber nur bis zum
  // letzten Champion-Tier. Wächst die Sperre danach weiter, bremst sie nichts
  // mehr, sondern mauert bloss Zahlen zu: gemessen brauchte Tier 15 schon 2647
  // nebula_quartz, Tier 16 wären 4288 — die Galaxie-Achse stand über zehn
  // Spielstunden an einem Tor, hinter dem gar nichts Neues mehr lag.
  const exp = Math.min(tier, TIER_UNLOCK_COST_CAP_TIER) - 2
  const chimes = Math.ceil(TIER_UNLOCK_CHIMES_BASE * Math.pow(TIER_UNLOCK_CHIMES_GROWTH, exp))
  const material: Record<string, number> = {}
  for (const [id, base] of Object.entries(TIER_UNLOCK_MATERIAL_BASE)) {
    material[id] = Math.ceil(base * Math.pow(TIER_UNLOCK_MATERIAL_GROWTH, exp))
  }
  // Die zweite Rezeptur steigt erst spät ein und rechnet mit eigenem Exponenten
  // — sonst stünde sie bei Tier 14 auf demselben Vielfachen wie die erste und
  // wäre nur „dieselbe Wand in einer anderen Farbe".
  if (tier >= TIER_UNLOCK_LATE_FROM_TIER) {
    const lateExp = Math.min(tier, TIER_UNLOCK_COST_CAP_TIER) - TIER_UNLOCK_LATE_FROM_TIER
    for (const [id, base] of Object.entries(TIER_UNLOCK_MATERIAL_LATE)) {
      material[id] = Math.ceil(base * Math.pow(TIER_UNLOCK_MATERIAL_GROWTH, lateExp))
    }
  }
  return { chimes, material }
}

// Theme 0 (Blue Veil) ist fest für Galaxie 1 reserviert — jede weitere Galaxie
// zieht zufällig aus den noch nicht besuchten Themes, damit sich innerhalb
// eines Durchlaufs keine Galaxiefarbe wiederholt.
function allNonHomeThemeIndices(): number[] {
  return GALAXY_THEMES.map((_, i) => i).filter((i) => i !== 0)
}

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return (h * 60 + 360) % 360
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function themeHue(index: number): number {
  return hexToHue(GALAXY_THEMES[index].accentColor)
}

/**
 * Die Farbwelt der nächsten Galaxie. Rein — der Archiv-Nachtrag zieht die
 * Kette 1 → 2 → … mit demselben Verfahren, mit dem `commitAdvance()` sie im
 * Spiel weiterschreibt; zwei Verfahren liefen hier auseinander.
 */
export function pickThemeIndex(
  galaxy: number,
  currentThemeIndex: number,
  used: number[],
  rng: () => number = Math.random,
): { themeIndex: number; used: number[] } {
  // Galaxie 1 ist immer das vertraute Blau (Blue Veil).
  if (galaxy === 1) return { themeIndex: 0, used: [0] }

  let nextUsed = [...used]
  let available = allNonHomeThemeIndices().filter((i) => !nextUsed.includes(i))
  if (available.length === 0) {
    // Alle Themes gesehen → Zyklus neu starten, aber ohne direkte Wiederholung.
    nextUsed = [0]
    available = allNonHomeThemeIndices().filter((i) => i !== currentThemeIndex)
  }
  // Deutlich anders als die Vorgänger-Galaxie: nur Themes mit genug
  // Farbton-Abstand zulassen — falls keins übrig ist, Regel lockern.
  const currentHue = themeHue(currentThemeIndex)
  const contrasting = available.filter(
    (i) => hueDistance(themeHue(i), currentHue) >= MIN_THEME_HUE_DISTANCE,
  )
  if (contrasting.length > 0) available = contrasting
  const themeIndex = available[Math.floor(rng() * available.length)]
  nextUsed.push(themeIndex)
  return { themeIndex, used: nextUsed }
}

export const useGalaxyStore = defineStore('galaxy', {
  state: () => ({
    currentGalaxy: 1,
    starsRescued: 0,
    starsRequired: GALAXY_STARS_BASE_REQUIRED,
    // Chronological outcome of every champion-star attempt this galaxy —
    // drives the minimap (rescued ✦ / failed ✕ markers, next-target position).
    attemptResults: [] as StarAttemptResult[],
    /** Ausgang jedes Ortes dieser Galaxie, in Routenreihenfolge — das Gegenstück
     *  zu `attemptResults`. Lage und Art sind ABGELEITET (`utils/game/landfalls.ts`),
     *  gespeichert wird nur, was daraus wurde. */
    landfallResults: [] as LandfallOutcome[],
    /** Der eine Ort, der GERADE offen steht. Nicht persistiert — dieselbe Regel
     *  wie bei Void-Wesen unterwegs: er käme mit halb abgelaufenem Fenster
     *  zurück, und die Zeit hat der Spieler nicht gehabt. */
    activeLandfall: null as ActiveLandfall | null,
    starJustFailed: false, // transient → minimap "Star Lost" flash
    // Fresh random seed per galaxy run: spawn point + star placement differ
    // every playthrough (persisted so the layout survives a reload).
    mapSeed: Math.floor(Math.random() * 0xffffffff),
    // ── Galaxy history (Bard-Stats "Galaxy Archive") ──
    // gameStore.inGameTime (seconds) at the moment this galaxy was entered —
    // basis for the per-galaxy completion time.
    galaxyStartedAtInGameTime: 0,
    completedGalaxies: [] as CompletedGalaxyRecord[],
    // ── Galaxy Tier system ──
    unlockedTier: 1, // highest tier the player has paid to unlock
    tierJustUnlocked: false, // transient flag → UI plays the unlock celebration, then resets
    galaxyBossDefeated: false,
    pendingGalaxyBoss: false,
    // ── Boss-Eskorten-Wellen ──
    // Beim Erreichen des Galaxiekerns initialisiert; die Eskorten spawnen in
    // Wellen à GALAXY_BOSS_WAVE_SIZE (siehe starGroupStore.spawnBossEscortWave).
    bossEscortsTotal: 0,
    bossEscortsDefeated: 0,
    // After the last champion star: the ship flies to the FIXED boss star at
    // the galaxy core (same travel flow as a champion star). Replaces the old
    // random boss-search phase.
    travelingToGalaxyBoss: false,
    pendingTransition: false,
    isGalaxyTransitioning: false,
    currentThemeIndex: 0,
    // Alle in diesem Durchlauf bereits verwendeten Theme-Indizes — verhindert,
    // dass sich eine Galaxiefarbe wiederholt, bevor alle Themes durch sind.
    usedThemeIndices: [0] as number[],
    // Role selection modal
    pendingRoleSelection: true,
    nextStarRole: null as ChampionRole | null,
    // Champion travel state machine
    championTravelState: 'idle' as ChampionTravelState,
    championTravelStartTime: 0,
    championTravelDurationMs: CHAMPION_TRAVEL_BASE_MS,
    championTravelBaseDurationMs: CHAMPION_TRAVEL_BASE_MS,
    _travelTickMs: 0,
    /** Etappe, deren Ort schon abgehandelt ist (offen ODER erledigt). Verhindert,
     *  dass derselbe Ort nach dem Schliessen sofort wieder aufgeht. −1 = keine. */
    _landfallLegDone: -1,
    // Champion-Ankunfts-Signal
    championJustArrived: false,
    galaxyBossJustSpawned: false,
    // Ressourcen-Stern Flyby — Scheduler feuert zufällig gestaffelte Spawns,
    // bis zu RESOURCE_STAR_MAX_CONCURRENT Sterne existieren gleichzeitig.
    resourceStarElapsedMs: 0,
    resourceStarNextIntervalMs: 0,
    pendingChampionStar: false,
    // Champion-Rettungs-Rotationsanimation
    rescueRotationPhase: 'idle' as 'idle' | 'rotating',
    rescueRotationStartTime: 0,
    rescueRotationDirection: 1 as 1 | -1,
    rescueBurstAngleDeg: 0,
    travelPendingAfterRotation: false,
    // ── Lifetime counters (Bard Stats catalog) ──
    // starsRescued/attemptResults reset with every galaxy; these never do.
    totalStarsRescued: 0,
    totalStarsLost: 0,
    /** Galaxy bosses ever slain — one per freed galaxy, kept across prestige. */
    totalGalaxyBossesDefeated: 0,
    /** Boss escort stars ever destroyed at a galaxy core. */
    totalBossEscortsDefeated: 0,
  }),

  getters: {
    isComplete(): boolean {
      return (
        this.starsRescued >= this.starsRequired &&
        this.galaxyBossDefeated &&
        this.bossEscortsDefeated >= this.bossEscortsTotal
      )
    },

    bossEscortsRemaining(): number {
      return Math.max(0, this.bossEscortsTotal - this.bossEscortsDefeated)
    },

    // Aktive Endkampf-Phase am Galaxiekern: vom Boss-Spawn bis Boss UND alle
    // Eskorten besiegt sind. Deckt auch den Zwischenzustand "Boss tot, aber
    // Eskorten leben noch" ab (dort ist pendingGalaxyBoss bereits false).
    bossPhaseActive(): boolean {
      return (
        (this.pendingGalaxyBoss || this.galaxyBossDefeated) &&
        this.starsRescued >= this.starsRequired &&
        !this.isComplete
      )
    },

    bossWavesTotal(): number {
      return Math.ceil(this.bossEscortsTotal / GALAXY_BOSS_WAVE_SIZE)
    },

    currentBossWave(): number {
      if (this.bossEscortsTotal <= 0) return 0
      return Math.min(
        this.bossWavesTotal,
        Math.floor(this.bossEscortsDefeated / GALAXY_BOSS_WAVE_SIZE) + 1,
      )
    },

    // ── Galaxy Tier getters ──
    currentTier(): number {
      return tierOf(this.currentGalaxy)
    },

    nextTier(): number {
      return tierOf(this.currentGalaxy + 1)
    },

    // Highest Champion Tier unlocked at the current galaxy (tiers spawn cumulatively).
    // Drives the Shop "unlocked" styling and the spawn-weight row.
    requiredStarLevel(): number {
      return unlockedChampionTierCount(this.currentGalaxy)
    },

    // True when warping to the next galaxy would cross into a tier the player
    // has not yet paid to unlock.
    nextTierLocked(): boolean {
      return this.nextTier > this.currentTier && this.nextTier > this.unlockedTier
    },

    // Cost to unlock the next (locked) tier.
    tierUnlockCost(): TierUnlockCost {
      return computeTierUnlockCost(this.nextTier)
    },

    // Galaxy is complete AND the next tier (if any) is unlocked.
    canAdvance(): boolean {
      return this.isComplete && !this.nextTierLocked
    },

    /** Auf welcher Etappe das Schiff gerade ist: 0 = Abflugportal → erster Stern.
     *  Verlorene Sterne hängen Etappen an, also zählt die Versuchsreihe. */
    currentLegIndex(): number {
      return this.attemptResults.length
    },

    /** Die Etappenzahl, gegen die die Ortsdichte gerechnet wird — die GEPLANTE,
     *  nicht die tatsächliche (siehe `landfallChanceFor`). */
    plannedLegCount(): number {
      return this.starsRequired + 1
    },

    /** Anteil des Fensters, der schon verstrichen ist (0..1). */
    landfallProgress(): number {
      const a = this.activeLandfall
      if (!a) return 0
      const spanne = landfallWindowMs(this.effectiveTravelDurationMs)
      if (spanne <= 0) return 1
      return clampPercent(((this._travelTickMs - a.openedAt) / spanne) * 100) / 100
    },

    /**
     * Was der Ort einbringt, wenn er JETZT aufgelöst würde — in Chimes.
     *
     * Der Sockel fällt auch dem zu, der nicht hinsieht; das ist der Unterschied
     * zum Drifter, der ungeklickt verfällt. Ein Ort ist ein ORT: man fliegt
     * hindurch, ob man will oder nicht. Geklickt wird daraus das Vielfache.
     */
    landfallYield(): number {
      const a = this.activeLandfall
      if (!a) return 0
      const gameStore = useGameStore()
      // Boden an der SEKUNDE, nicht an der Summe — sonst verschwinden früh alle
      // Griffe darunter und acht Klicks zeigen dieselbe Zahl.
      const jeSekunde = Math.max(
        gameStore.chimesPerSecond,
        gameStore.chimesPerClick * LANDFALL_REEF_CPS_FLOOR_CLICKS,
      )
      const sekunden = LANDFALL_REEF_BASE_SECONDS + a.taps * LANDFALL_REEF_CLICK_SECONDS
      return jeSekunde * sekunden
    },

    needsFinalBoss(): boolean {
      return this.starsRescued >= this.starsRequired && !this.galaxyBossDefeated
    },

    isRescueRotating(): boolean {
      return this.rescueRotationPhase === 'rotating'
    },

    effectiveTravelDurationMs(): number {
      const base =
        this.championTravelBaseDurationMs > 0
          ? this.championTravelBaseDurationMs
          : this.championTravelDurationMs
      // Starroad Pact als eigener Faktor NEBEN dem Strahl: der Strahl teilt
      // (ein Tempo), der Pakt multipliziert (eine Dauer). Zusammengefasst wäre
      // die eine Zahl ein Tempo und die andere keins — und die Reisedauer ist
      // im Spätspiel der Taktgeber der Galaxie-Achse (docs/balance.md), also
      // die Stelle, an der eine unklare Rechnung am teuersten wäre.
      const flight = base / useSolarUpgradeStore().flightSpeedMultiplier
      return Math.max(1000, Math.round(flight * useStarForgeStore().championTravelMult))
    },

    travelProgressPercent(): number {
      void this._travelTickMs
      if (this.championTravelState !== 'traveling') return 0
      const dur = this.effectiveTravelDurationMs
      if (dur <= 0 || this.championTravelStartTime === 0) return 0
      const elapsed = gameNow() - this.championTravelStartTime
      return clampPercent((elapsed / dur) * 100)
    },

    travelRemainingMs(): number {
      void this._travelTickMs
      if (this.championTravelState !== 'traveling') return 0
      if (this.championTravelStartTime === 0) return this.effectiveTravelDurationMs
      const elapsed = gameNow() - this.championTravelStartTime
      return Math.max(0, this.effectiveTravelDurationMs - elapsed)
    },

    starsBackgroundPaused(): boolean {
      if (this.rescueRotationPhase === 'rotating') return false
      // Auch der komplette Endkampf am Galaxiekern (Eskorten-Wellen + Boss)
      // friert den Hintergrund ein — wie bei einem erreichten Champion-Stern.
      return (
        this.pendingRoleSelection ||
        this.championTravelState === 'champion_spawned' ||
        this.bossPhaseActive
      )
    },
  },

  actions: {
    requestRoleSelection() {
      this.nextStarRole = null
      this.pendingRoleSelection = true
    },

    confirmRoleSelection(role: ChampionRole) {
      this.nextStarRole = role
      this.pendingRoleSelection = false
      this.travelPendingAfterRotation = true
      this.startRescueRotation()
    },

    startChampionTravel() {
      // Gedeckelt: die Reise wuchs linear und ungedeckelt, ihre Gegenkraft
      // (flightSpeedMultiplier) endet bei ×1,6 — ab Galaxie 13 wurde daraus das
      // Tempolimit des ganzen Spiels. Ab dem Deckel wächst nur noch die ANZAHL
      // der Sterne je Galaxie.
      const baseDuration = Math.min(
        CHAMPION_TRAVEL_MAX_MS,
        CHAMPION_TRAVEL_BASE_MS + galaxyDepth(this.currentGalaxy) * CHAMPION_TRAVEL_SCALE_MS,
      )
      this.championTravelBaseDurationMs = baseDuration
      this.championTravelState = 'traveling'
      this.championTravelStartTime = gameNow()
      this.championTravelDurationMs = Math.round(
        baseDuration / useSolarUpgradeStore().flightSpeedMultiplier,
      )
    },

    tickChampionTravel() {
      // Safety net: the rotation is normally ended by the orbit rAF loop,
      // which pauses while the Bard profile is open or the tab is hidden —
      // end an expired rotation here so the departure never stalls.
      if (
        this.rescueRotationPhase === 'rotating' &&
        gameNow() - this.rescueRotationStartTime >= RESCUE_ROTATION_DURATION_MS
      ) {
        this.endRescueRotation()
      }
      if (this.championTravelState !== 'traveling') return
      const now = gameNow()
      this._travelTickMs = now
      if (this.championTravelStartTime === 0) {
        this.championTravelStartTime = now
        return
      }
      const elapsed = now - this.championTravelStartTime
      this._tickLandfall(now, elapsed)
      if (elapsed >= this.effectiveTravelDurationMs) {
        // Ein Ort, der die Ankunft erlebt, wird abgerechnet — der Stern gewinnt
        // die Aufmerksamkeit, aber der Sockel ist verdient.
        if (this.activeLandfall) this.resolveLandfall(this.activeLandfall.taps > 0)
        if (this.travelingToGalaxyBoss) {
          // Reached the galaxy core → the boss star spawns right there
          this.travelingToGalaxyBoss = false
          this.championTravelState = 'idle'
          this.initBossWave()
          this.pendingGalaxyBoss = true
          this.galaxyBossJustSpawned = true
          gameTimeout(() => {
            this.galaxyBossJustSpawned = false
          }, GALAXY_BOSS_SPAWN_ANIM_MS)
          return
        }
        this.championTravelState = 'champion_available'
        this.championJustArrived = true
        gameTimeout(() => {
          this.championJustArrived = false
        }, GALAXY_CHAMPION_ARRIVAL_SIGNAL_MS)
      }
    },

    /**
     * Öffnet den Ort dieser Etappe, sobald das Schiff seine Stelle passiert, und
     * schliesst ihn, wenn das Fenster abläuft.
     *
     * KEIN eigener Timer und kein eigenes Intervall — der Etappen-Tick weiss
     * ohnehin, wo das Schiff steht, und `gameNow()` trägt den Zeitraffer mit.
     */
    _tickLandfall(now: number, elapsed: number) {
      const dauer = this.effectiveTravelDurationMs
      if (dauer <= 0) return

      if (this.activeLandfall) {
        if (now - this.activeLandfall.openedAt >= landfallWindowMs(dauer)) {
          // Abgelaufen: der Sockel fällt trotzdem, angefasst wurde er nicht.
          this.resolveLandfall(this.activeLandfall.taps > 0)
        }
        return
      }

      // Höchstens EIN Ort je Etappe, und je Etappe genau ein Eintrag in der
      // Ergebnisreihe — daran hängt, ob dieser hier schon abgehandelt ist.
      const leg = this.currentLegIndex
      if (this._landfallLegDone === leg) return

      const plan = landfallOnLeg(this.mapSeed, this.currentGalaxy, leg, this.plannedLegCount)
      if (!plan) {
        this._landfallLegDone = leg
        return
      }
      if (elapsed / dauer < plan.t) return

      this.activeLandfall = { ...plan, openedAt: now, taps: 0 }
    },

    /** Schliesst den offenen Ort und schreibt seinen Ausgang in die Chronik. */
    _closeLandfall(cleared: boolean) {
      const a = this.activeLandfall
      if (!a) return
      this.landfallResults.push({ kind: a.kind, cleared })
      this._landfallLegDone = a.leg
      this.activeLandfall = null
    },

    /**
     * Der Spieler fasst den Ort an. Gibt zurück, ob der Griff gezählt hat.
     *
     * Gedeckelt: ohne Deckel wäre ein Ort ein Autoklicker-Fenster, und der
     * Ertrag hinge an der Mausfrequenz statt an der Aufmerksamkeit.
     */
    tapLandfall(): boolean {
      const a = this.activeLandfall
      if (!a || a.taps >= LANDFALL_REEF_MAX_CLICKS) return false
      a.taps++
      return true
    },

    /**
     * Der Ort ist abgehandelt — vom Spieler oder weil das Fenster ablief.
     *
     * Ausgezahlt wird VOR dem Schliessen, weil `landfallYield` am offenen Ort
     * hängt. `cleared` sagt nur, ob der Spieler ihn angefasst hat; bezahlt wird
     * so oder so.
     */
    resolveLandfall(cleared: boolean) {
      const gewinn = this.landfallYield
      if (gewinn > 0) {
        const gameStore = useGameStore()
        gameStore.chimes += gewinn
        gameStore.chimesForNextUniverse += gewinn
        gameStore.totalChimesEarned += gewinn
        gameStore.chimesEarnedForLevel += gewinn
        gameStore.calculateLevel()
      }
      this._closeLandfall(cleared)
    },

    _rollResourceStarInterval(): number {
      // Starwarden's Lantern kürzt den Abstand. Er ist der ehrliche Weg zu mehr
      // Material: die FALLCHANCE sättigt (`tryDropMaterial` vergleicht gegen
      // `Math.random()`), die Zahl der Gelegenheiten nicht (docs/balance.md).
      return (
        (RESOURCE_STAR_INTERVAL_MIN_MS +
          Math.random() * (RESOURCE_STAR_INTERVAL_MAX_MS - RESOURCE_STAR_INTERVAL_MIN_MS)) *
        useStarForgeStore().resourceStarIntervalMult
      )
    },

    // Läuft im 1s-Game-Tick (auch während Pause). Gibt `true` zurück, sobald das
    // zufällig gestaffelte Intervall abgelaufen ist und ein neuer Resource-Star
    // gespawnt werden soll. Der Aufrufer (gameStore.tick) respektiert dabei das
    // Concurrency-Limit. Nur während der Champion-Reise aktiv.
    tickResourceStar(deltaMs: number): boolean {
      if (this.championTravelState !== 'traveling') return false
      if (this.resourceStarNextIntervalMs <= 0) {
        this.resourceStarNextIntervalMs = this._rollResourceStarInterval()
      }
      this.resourceStarElapsedMs += deltaMs
      if (this.resourceStarElapsedMs >= this.resourceStarNextIntervalMs) {
        this.resourceStarElapsedMs = 0
        this.resourceStarNextIntervalMs = this._rollResourceStarInterval()
        return true
      }
      return false
    },

    startRescueRotation() {
      this.rescueRotationPhase = 'rotating'
      this.rescueRotationStartTime = gameNow()
      this.rescueRotationDirection = Math.random() < 0.5 ? 1 : -1
      this.rescueBurstAngleDeg = Math.random() * 360
    },

    endRescueRotation() {
      this.rescueRotationPhase = 'idle'
      this.rescueRotationStartTime = 0
      if (this.travelPendingAfterRotation) {
        this.travelPendingAfterRotation = false
        this.startChampionTravel()
      }
    },

    onChampionStarRescued() {
      if (this.starsRescued >= this.starsRequired) return
      this.starsRescued++
      this.totalStarsRescued++
      this.attemptResults.push('rescued')
      if (this.starsRescued >= this.starsRequired && !this.galaxyBossDefeated) {
        // Last star saved → fly to the boss star waiting at the galaxy core,
        // with the same travel flow as a champion star (route, comet, zoom).
        this.travelingToGalaxyBoss = true
        this.startChampionTravel()
      } else {
        this.requestRoleSelection()
      }
    },

    onChampionStarExpired() {
      // Failed rescue: the chosen role stays locked in — no new role selection.
      // A fresh star with the same role appears and the ship departs for it;
      // the lost star stays on the minimap as a failed marker.
      if (!this.nextStarRole) {
        this.requestRoleSelection()
        return
      }
      this.attemptResults.push('failed')
      this.totalStarsLost++
      this.starJustFailed = true
      gameTimeout(() => {
        this.starJustFailed = false
      }, GALAXY_STAR_FAILED_SIGNAL_MS)
      // Depart straight from the lost star — no rescue rotation (that
      // animation launches from the map center and reads like a jump back
      // to the previous star). The ship stays put and flies on from here.
      this.travelPendingAfterRotation = false
      this.startChampionTravel()
    },

    onGalaxyBossDefeated() {
      if (!this.galaxyBossDefeated) this.totalGalaxyBossesDefeated++
      this.galaxyBossDefeated = true
      this.pendingGalaxyBoss = false
      this.maybeRecordCompletion()
    },

    // Archive the finished galaxy the moment isComplete flips to true (boss AND
    // all escorts down). Idempotent — commitAdvance calls it again as a safety
    // net for legacy saves that load in an already-complete state.
    maybeRecordCompletion() {
      if (!this.isComplete) return
      // One record per galaxy number; a same-run re-call keeps the identical
      // record, an admin-replay of the galaxy replaces it with the fresh run.
      const existing = this.completedGalaxies.findIndex((r) => r.galaxy === this.currentGalaxy)
      if (existing >= 0 && this.completedGalaxies[existing].mapSeed === this.mapSeed) return
      const inGameTime = useGameStore().inGameTime
      if (existing >= 0) this.completedGalaxies.splice(existing, 1)
      this.completedGalaxies.push({
        galaxy: this.currentGalaxy,
        mapSeed: this.mapSeed,
        themeIndex: this.currentThemeIndex,
        attemptResults: [...this.attemptResults],
        landfallResults: [...this.landfallResults],
        durationSeconds: Math.max(0, inGameTime - this.galaxyStartedAtInGameTime),
        // Wanduhr: Chronikstempel, wird im Galaxy-Archiv als Datum gelesen und
        // nie gegen eine Frist geprüft.
        // eslint-disable-next-line no-restricted-syntax
        completedAt: Date.now(),
      })
    },

    initBossWave() {
      this.bossEscortsTotal = computeBossEscortCount(this.currentGalaxy)
      this.bossEscortsDefeated = 0
    },

    onBossEscortDefeated() {
      if (this.bossEscortsDefeated < this.bossEscortsTotal) {
        this.bossEscortsDefeated++
        this.totalBossEscortsDefeated++
      }
      this.maybeRecordCompletion()
    },

    setGalaxyTransitioning(val: boolean) {
      this.isGalaxyTransitioning = val
    },

    requestTransition() {
      // Block the warp while the next tier is still locked — the player must pay
      // the tier-unlock cost first (see unlockNextTier / TierUnlockPanel).
      if (!this.isComplete || this.pendingTransition || this.nextTierLocked) return
      this.pendingTransition = true
      // If the Bard profile is open, close it first so the hyperspace warp
      // plays in full view: the orbit-background rAF loop (paused while the
      // profile is open) resumes on close and drives the transition from the
      // pendingTransition flag.
      const ui = useUiStore()
      if (ui.bardActiveTab !== null) ui.closeBardModal()
      // Bei reduzierter Bewegung gibt es die Hintergrundschleife GAR NICHT:
      // `useStarBackground` kapselt ihren kompletten Aufbau in
      // `if (!prefersReducedMotion)`. Dann treibt niemand den Warp, und weil
      // `pendingTransition` gesetzt bleibt, kehrt jeder weitere Aufruf oben
      // sofort zurück — die Galaxie wäre dauerhaft verriegelt.
      //
      // Dieser Ersatzpfad hing früher INNERHALB des `bardActiveTab`-Zweigs und
      // griff damit nur, wenn zufällig das Bard-Profil offen war. Wer die
      // Galaxie mit geschlossenem Profil abschloss, sass fest. Die Bedingung
      // gehört an die Bewegungseinstellung, nicht an ein offenes Modal.
      //
      // Doppelter Warp ist ausgeschlossen: die Schleife läuft hier nicht, und
      // ihre Bedingung verlangt ohnehin `!isGalaxyTransitioning`.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.setGalaxyTransitioning(true)
        gameTimeout(() => this.commitAdvance(), GALAXY_TRANS_WARP_MS)
        gameTimeout(
          () => this.setGalaxyTransitioning(false),
          GALAXY_TRANS_WARP_MS + GALAXY_TRANS_DECEL_MS,
        )
      }
    },

    // Pay the Chimes + Material cost to unlock the next tier. Returns true on success.
    unlockNextTier(): boolean {
      if (!this.nextTierLocked) return false
      const cost = this.tierUnlockCost
      const gameStore = useGameStore()
      const inventoryStore = useInventoryStore()
      if (gameStore.chimes < cost.chimes) return false
      if (!inventoryStore.hasMaterials(cost.material)) return false

      gameStore.chimes -= cost.chimes
      inventoryStore.removeMaterials(cost.material, 'tier')
      this.unlockedTier = this.nextTier
      this.tierJustUnlocked = true
      return true
    },

    commitAdvance() {
      // Safety net: archive the outgoing galaxy if the completion moment itself
      // wasn't captured (e.g. legacy save loaded in an already-complete state).
      this.maybeRecordCompletion()
      this.currentGalaxy++
      this.galaxyStartedAtInGameTime = useGameStore().inGameTime
      this.starsRescued = 0
      this.starsRequired = computeRequired(this.currentGalaxy)
      this.attemptResults = []
      this.landfallResults = []
      this.activeLandfall = null
      this._landfallLegDone = -1
      this.starJustFailed = false
      this.mapSeed = Math.floor(Math.random() * 0xffffffff)
      this.galaxyBossDefeated = false
      this.pendingGalaxyBoss = false
      this.bossEscortsTotal = 0
      this.bossEscortsDefeated = 0
      this.travelingToGalaxyBoss = false
      this.pendingTransition = false
      this.pendingRoleSelection = false
      this.galaxyBossJustSpawned = false
      this.resourceStarElapsedMs = 0
      this.resourceStarNextIntervalMs = 0
      this.pendingChampionStar = false
      const theme = pickThemeIndex(
        this.currentGalaxy,
        this.currentThemeIndex,
        this.usedThemeIndices,
      )
      this.currentThemeIndex = theme.themeIndex
      this.usedThemeIndices = theme.used
      this.requestRoleSelection()
    },

    /**
     * Admin-only: die übersprungenen Läufe 1…upto ins Archiv nachtragen.
     *
     * Ohne das bleibt `completedGalaxies` nach einem Sprung leer — und damit
     * nicht nur die Archivspalte, sondern auch Voyages, deren EINZIGE Quelle
     * dieses Array ist (Tor, Zielliste, Name, Skala, Ziehungsgewicht).
     *
     * Bestehende Einträge bleiben unangetastet — ein echt gespielter Lauf
     * überlebt jeden Sprung, auch einen zurück. Gibt zurück, wie viele
     * Galaxien nachgetragen wurden.
     */
    adminBackfillArchive(upto: number): number {
      const last = Math.floor(upto)
      if (last < 1) return 0

      const byGalaxy = new Map<number, CompletedGalaxyRecord>(
        this.completedGalaxies.map((r) => [r.galaxy, r]),
      )
      if (Array.from({ length: last }, (_, i) => i + 1).every((g) => byGalaxy.has(g))) return 0

      let themeIndex = this.currentThemeIndex
      let used = [...this.usedThemeIndices]
      const added: CompletedGalaxyRecord[] = []

      for (let g = 1; g <= last; g++) {
        const existing = byGalaxy.get(g)
        if (existing) {
          // Ein echt gespielter Lauf ist das nächste Glied der Farbkette.
          themeIndex = existing.themeIndex
          if (!used.includes(themeIndex)) used.push(themeIndex)
          continue
        }
        const theme = pickThemeIndex(g, themeIndex, used, backfillThemeRng(g))
        themeIndex = theme.themeIndex
        used = theme.used
        added.push(buildBackfillRecord(g, computeRequired(g), themeIndex, 0))
      }

      // Stempel rückwärts vergeben, damit die Archivkarten aufsteigende Daten
      // tragen. Wanduhr ist hier richtig: der Stempel wird als Datum gerendert
      // und nie gegen eine Frist geprüft.
      // eslint-disable-next-line no-restricted-syntax
      let stamp = Date.now() - ADMIN_ARCHIVE_RECENT_GAP_MS
      for (let i = added.length - 1; i >= 0; i--) {
        added[i].completedAt = stamp
        stamp -= added[i].durationSeconds * 1000 + ADMIN_ARCHIVE_GAP_MS
      }

      for (const record of added) {
        this.completedGalaxies.push(record)
        this.totalStarsRescued += record.attemptResults.filter((r) => r === 'rescued').length
        this.totalStarsLost += record.attemptResults.filter((r) => r === 'failed').length
        this.totalGalaxyBossesDefeated++
        this.totalBossEscortsDefeated += computeBossEscortCount(record.galaxy)
      }
      this.completedGalaxies.sort((a, b) => a.galaxy - b.galaxy)
      this.currentThemeIndex = themeIndex
      this.usedThemeIndices = used
      return added.length
    },

    // Admin-only: teleport straight to galaxy N. Reuses commitAdvance() so the
    // resulting state is identical to legitimately entering galaxy N (stars reset,
    // starsRequired recomputed, champion pool re-rolled, theme + role-selection set).
    // unlockedTier is raised so later legit advances aren't blocked at a tier gate.
    // Der Nachtrag läuft VOR commitAdvance(): der wählt danach die Farbwelt für
    // N im Kontrast zu N−1, und die Kette bleibt lückenlos.
    adminJumpToGalaxy(target: number): number {
      const n = Math.max(1, Math.floor(target))
      // Die laufende Galaxie noch unter IHRER Nummer archivieren, falls sie
      // fertig ist — danach die Bossmarke löschen, sonst schriebe das
      // Sicherheitsnetz in commitAdvance() denselben Lauf ein zweites Mal, dann
      // aber unter der Nummer n−1 und über den Nachtrag hinweg.
      this.maybeRecordCompletion()
      this.galaxyBossDefeated = false
      const filled = this.adminBackfillArchive(n - 1)
      this.currentGalaxy = n - 1
      this.unlockedTier = Math.max(this.unlockedTier, tierOf(n))
      this.commitAdvance()
      return filled
    },
  },
})
