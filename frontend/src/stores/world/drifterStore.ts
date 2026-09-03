import { defineStore } from 'pinia'
import type {
  ActiveDrifter,
  DrifterActiveBuff,
  DrifterDef,
  DrifterOrbitStrike,
  DrifterRarity,
} from '@/types'
import { DRIFTERS, getDrifter } from '@/config/world/drifters'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { logger } from '@/utils/logger'
import { gameNow } from '@/utils/game/gameClock'
import {
  DRIFTER_SPAWN_INTERVAL_SEC,
  DRIFTER_FIRST_DELAY_SEC,
  DRIFTER_SPAWN_RETRY_SEC,
  DRIFTER_RARITY_ORDER,
  DRIFTER_MAX_CONCURRENT,
  GALAXY_INCIDENT_DRIFTER_MIN_RANK,
  DRIFTER_CHIME_REWARD_CAP_SEC,
  DRIFTER_CHIME_REWARD_MIN_CLICKS,
  DRIFTER_ROUTES,
  GAME_TICK_INTERVAL_MS,
} from '@/config/constants'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'

let uidCounter = 0

/** Every rarity that actually has drifters, rarest first — that is the order
 *  simultaneously due clocks are served in. */
const RARITIES = [...new Set(DRIFTERS.map((d) => d.rarity))].sort(
  (a, b) => DRIFTER_RARITY_ORDER[b] - DRIFTER_RARITY_ORDER[a],
)

function rollRange(range: [number, number] | undefined, fallback: number): number {
  if (!range) return fallback
  return range[0] + Math.random() * (range[1] - range[0])
}

/**
 * Der Abstand bis zum nächsten Drifter dieser Stufe.
 *
 * Hollow Tide (providence) greift HIER an und nicht an den beiden Aufrufstellen:
 * so bleibt es eine einzige Multiplikation, und eine dritte Stelle, die eine Uhr
 * neu stellt, bekommt den Faktor automatisch mit. Der Store-Zugriff ist an
 * dieser Stelle sicher — die Funktion läuft nur aus Actions heraus, nie aus dem
 * `state()`-Initializer (der benutzt `rollInitialCooldowns`).
 */
function rollIntervalSec(rarity: DrifterRarity): number {
  const base = rollRange(DRIFTER_SPAWN_INTERVAL_SEC[rarity], DRIFTER_SPAWN_RETRY_SEC)
  // Wanderer's Beacon (Star Forge) steht neben Hollow Tide und aus demselben
  // Grund an derselben Stelle: eine Multiplikation, alle Aufrufer erben sie.
  return (
    base * useProvidenceStore().drifterSpawnIntervalMult * useStarForgeStore().drifterIntervalMult
  )
}

/** Staggered opening delays, one clock per rarity. */
function rollInitialCooldowns(): Record<DrifterRarity, number> {
  const out = {} as Record<DrifterRarity, number>
  for (const rarity of RARITIES) {
    out[rarity] = rollRange(DRIFTER_FIRST_DELAY_SEC[rarity], DRIFTER_SPAWN_RETRY_SEC)
  }
  return out
}

/** Weighted pick WITHIN one rarity — `weight` now only decides which of the
 *  types on a given tier shows up, no longer how often that tier appears. */
function rollDrifterOfRarity(rarity: DrifterRarity): DrifterDef | null {
  const pool = DRIFTERS.filter((d) => d.rarity === rarity)
  if (pool.length === 0) return null
  const total = pool.reduce((sum, d) => sum + d.weight, 0)
  let roll = Math.random() * total
  for (const def of pool) {
    roll -= def.weight
    if (roll <= 0) return def
  }
  return pool[pool.length - 1]
}

/** Any drifter at all, weighted across the whole pool. Only used by the admin
 *  "spawn a random one" button — the game itself goes through the clocks. */
function rollAnyDrifter(): DrifterDef {
  const total = DRIFTERS.reduce((sum, d) => sum + d.weight, 0)
  let roll = Math.random() * total
  for (const def of DRIFTERS) {
    roll -= def.weight
    if (roll <= 0) return def
  }
  return DRIFTERS[0]
}

/** In die Chronik der Galaxie — aber nur ab `rare`. `common` allein bringt
 *  rechnerisch rund fünfzig Objekte je Galaxie, und die Karte trägt neben
 *  Sternen, Orten, Häfen und Tor keine dritte Menge. */
function noteDrifterOnMap(defId: string, kind: 'drifter-caught' | 'drifter-missed'): void {
  const def = getDrifter(defId)
  if (!def) return
  if ((DRIFTER_RARITY_ORDER[def.rarity] ?? 0) < GALAXY_INCIDENT_DRIFTER_MIN_RANK) return
  useGalaxyStore().recordIncident({ kind, id: def.id })
}

/**
 * Drifters — clickable objects crossing the idle orbit view, and the timed
 * buffs they leave behind.
 *
 * The store owns only logical state. A drifter's position is derived from
 * `spawnedAt` by the rendering layer, so a throttled tab or a stuttering frame
 * loop can never desync it: it always sits where the wall clock says it should.
 */
export const useDrifterStore = defineStore('drifter', {
  state: () => ({
    active: [] as ActiveDrifter[],
    buffs: [] as DrifterActiveBuff[],
    /** Seconds until each rarity's next appearance. Counted down by the tick. */
    spawnCooldowns: rollInitialCooldowns(),
    /** Reactive clock for the buff getters — a raw gameNow() inside a getter
     *  would never re-evaluate. Advanced once per second by the game tick. */
    drifterNow: gameNow(),
    /** Suppresses spawning while an opaque overlay covers the idle layer: a
     *  drifter nobody can see would just expire unnoticed. Set by the layer. */
    spawningBlocked: false,
    /** Bumped on every collect so the UI can replay its burst — the same type
     *  collected twice in a row must still trigger the effect. */
    lastCollect: { defId: '', at: 0, x: 0, y: 0, seq: 0 },
    /** Bumped whenever a drifter left uncollected — the info card turns this
     *  into a "got away" state instead of just vanishing mid-countdown. */
    lastExpired: { defId: '', at: 0, seq: 0 },
    /** Tally of the last orbit-wide strike — drives the shockwave layer. */
    lastOrbitStrike: {
      seq: 0,
      at: 0,
      defId: '',
      planetsHit: 0,
      damage: 0,
      kills: 0,
    } as DrifterOrbitStrike,
    // ── Lifetime counters (Bard Stats catalog) ──
    totalDriftersSpawned: 0,
    totalDriftersCollected: 0,
    totalDriftersMissed: 0,
  }),

  getters: {
    /** Buffs still running right now, newest first. Drives the buff bar. */
    liveBuffs(state): DrifterActiveBuff[] {
      return state.buffs.filter((b) => b.expiresAt > state.drifterNow)
    },

    hasActiveDrifter(state): boolean {
      return state.active.length > 0
    },

    /**
     * Wie viele Drifter gleichzeitig am Himmel stehen dürfen.
     *
     * Twinned Sky (Konstellation) hebt die Zahl auf zwei. Ein PLATZ und keine
     * schnellere Uhr: der Spawn-Abstand laeuft gegen
     * `FORGE_MIN_DRIFTER_INTERVAL_MULT`, und ein zweiter Kauf auf dieselbe
     * Kappe waere einer zu viel.
     *
     * Als Getter und nicht als Konstante an zwei Stellen: `tickSpawnClocks` und
     * `spawnDrifter` pruefen beide dagegen, und zwei Fassungen liefen
     * auseinander, sobald jemand eine anfasst.
     */
    maxConcurrent(): number {
      return DRIFTER_MAX_CONCURRENT + useStarForgeStore().extraDrifterSlots
    },

    // ── Effect getters (one per integration point) ────────────────────────────
    /** Multiplier on total chimes per second. */
    cpsMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.cpsMult ?? 1), 1)
    },
    /** Multiplier on total chimes per click. */
    cpcMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.cpcMult ?? 1), 1)
    },
    /** Multiplier on orbiting champion DPS and turret volleys. */
    combatDpsMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.combatDpsMult ?? 1), 1)
    },
    /** Multiplier on the material drop chance. */
    materialDropMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.materialDropMult ?? 1), 1)
    },
    /** Multiplier on champion XP gains. */
    xpMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.xpMult ?? 1), 1)
    },
  },

  actions: {
    /** Called once per second from gameStore.tick(): advance the clock, expire
     *  finished buffs and roll for the next spawn. */
    tick(): void {
      this.drifterNow = gameNow()

      const before = this.buffs.length
      this.buffs = this.buffs.filter((b) => b.expiresAt > this.drifterNow)
      // A buff that just ended may have been holding a CPS/CPC multiplier —
      // both are cached values, so they have to be recomputed on the spot.
      if (this.buffs.length !== before) this.refreshRates()

      this.expireFlownDrifters()

      if (this.spawningBlocked) return
      this.tickSpawnClocks()
    },

    /**
     * One clock per rarity. Clocks that come due in the same tick are served
     * rarest first, and a tier that finds the sky full waits out a short retry
     * instead of forfeiting its turn — otherwise the common types, which tick
     * several times as often, would keep crowding the rare ones out.
     */
    tickSpawnClocks(): void {
      const delta = GAME_TICK_INTERVAL_MS / 1000
      const due: DrifterRarity[] = []
      for (const rarity of RARITIES) {
        this.spawnCooldowns[rarity] = (this.spawnCooldowns[rarity] ?? 0) - delta
        if (this.spawnCooldowns[rarity] <= 0) due.push(rarity)
      }
      // RARITIES is already ordered rarest first, so `due` inherits that order.
      for (const rarity of due) {
        if (this.active.length >= this.maxConcurrent) {
          this.spawnCooldowns[rarity] = DRIFTER_SPAWN_RETRY_SEC
          continue
        }
        const def = rollDrifterOfRarity(rarity)
        const spawned = def ? this.spawnDrifter(def.id) : null
        this.spawnCooldowns[rarity] = spawned ? rollIntervalSec(rarity) : DRIFTER_SPAWN_RETRY_SEC
      }
    },

    /** Drop drifters whose flight has finished without being collected. */
    expireFlownDrifters(): void {
      const now = this.drifterNow
      const gone = this.active.filter((d) => now >= d.spawnedAt + d.flightMs)
      if (gone.length === 0) return
      this.totalDriftersMissed += gone.length
      for (const d of gone) noteDrifterOnMap(d.defId, 'drifter-missed')
      this.active = this.active.filter((d) => now < d.spawnedAt + d.flightMs)
      const last = gone[gone.length - 1]
      this.lastExpired = {
        defId: last.defId,
        at: gameNow(),
        seq: this.lastExpired.seq + 1,
      }
    },

    /** Roll a type and send it on its way. Respects the concurrency cap. */
    spawnDrifter(defId?: string): ActiveDrifter | null {
      if (this.active.length >= this.maxConcurrent) return null
      const def = defId ? getDrifter(defId) : rollAnyDrifter()
      if (!def) return null

      const drifter: ActiveDrifter = {
        uid: ++uidCounter,
        defId: def.id,
        routeIndex: Math.floor(Math.random() * DRIFTER_ROUTES.length),
        mirrored: Math.random() < 0.5,
        spawnedAt: gameNow(),
        flightMs: def.flightMs,
        hitsLanded: 0,
      }
      this.active.push(drifter)
      this.totalDriftersSpawned++
      logger.debug('Drifter', `Spawned ${def.name}`, { uid: drifter.uid })
      return drifter
    },

    /**
     * Homeward Sky (Star-Forge-Krone): ein Drifter, der während der Abwesenheit
     * hinübergezogen ist, wartet auf die Rückkehr.
     *
     * Ein FENSTER und keine Rate — die Krone nennt eine ANZAHL
     * (`FORGE_CROWN_OFFLINE_DRIFTER_COUNT`), nicht eine Zahl je Stunde. Wer
     * drei Tage fortbleibt, findet denselben einen vor wie nach zwei Stunden;
     * die Achse kann damit nicht davonlaufen. Dasselbe Muster wie
     * `planetShopStore.catchUpHarvest`, das eine Zeile daneben aufgerufen wird.
     *
     * Er wird ganz normal GESPAWNT und nicht gutgeschrieben: der Spieler muss
     * ihn anklicken wie jeden anderen. Eine Auszahlung ohne Klick wäre eine
     * zweite Auszahlungsstelle neben `_applyReward` — genau die Art zweiter
     * Wahrheit, die der Baum sonst überall vermeidet.
     *
     * @param awaySeconds wie lange der Tab zu war.
     * @returns wie viele Drifter warten.
     */
    catchUpDrifter(awaySeconds: number): number {
      const wanted = useStarForgeStore().offlineDrifterCount
      if (wanted <= 0 || awaySeconds <= 0) return 0
      let spawned = 0
      for (let i = 0; i < wanted; i++) {
        if (this.spawnDrifter()) spawned++
      }
      return spawned
    },

    /**
     * Register a click on a drifter. Multi-hit types report progress and only
     * pay out on the final strike.
     *
     * @param x,y screen position of the hit — the collect burst plays there.
     * @returns the definition when this click collected the drifter, else null.
     */
    hitDrifter(uid: number, x = 0, y = 0): DrifterDef | null {
      const drifter = this.active.find((d) => d.uid === uid)
      if (!drifter) return null
      const def = getDrifter(drifter.defId)
      if (!def) return null

      drifter.hitsLanded++
      if (drifter.hitsLanded < def.hits) return null

      this.active = this.active.filter((d) => d.uid !== uid)
      this.totalDriftersCollected++
      noteDrifterOnMap(def.id, 'drifter-caught')
      this._applyReward(def)
      this.lastCollect = {
        defId: def.id,
        at: gameNow(),
        x,
        y,
        seq: this.lastCollect.seq + 1,
      }
      logger.info('Drifter', `Collected ${def.name}`, { effect: def.effectLine })
      return def
    },

    /** Pay out a drifter: instant rewards first, then start its buff. */
    _applyReward(def: DrifterDef): void {
      const gameStore = useGameStore()

      if (def.reward?.chimesFromCpsSeconds) {
        // Two floors so the reward is never a dead click: a fixed number of
        // clicks worth of chimes early on, the production window later.
        const fromCps = gameStore.chimesPerSecond * def.reward.chimesFromCpsSeconds
        const capped = Math.min(fromCps, gameStore.chimesPerSecond * DRIFTER_CHIME_REWARD_CAP_SEC)
        const floor = gameStore.chimesPerClick * DRIFTER_CHIME_REWARD_MIN_CLICKS
        // Drifter's Due (Bough): Faktor auf die AUSZAHLUNG. Er steht nach den
        // beiden Böden und nicht davor — die Böden sorgen dafür, dass ein
        // Fang nie ein toter Klick ist, und sollen nicht selbst mitwachsen.
        const gain = Math.max(capped, floor) * useStarForgeStore().drifterRewardMult
        gameStore.chimes += gain
        gameStore.chimesForNextUniverse += gain
        gameStore.totalChimesEarned += gain
        gameStore.chimesEarnedForLevel += gain
        gameStore.calculateLevel()
      }

      if (def.reward?.meeps) {
        // Der einzige Weg an einen Meep ausserhalb des Prestige — und genau
        // deshalb bleibt er: was sonst erst der Aufbruch auszahlt, findet man
        // hier unterwegs. Der Balken, den diese Stelle früher noch auffüllte,
        // existiert nicht mehr; Meeps haben keine laufende Schwelle.
        gameStore.grantMeeps(def.reward.meeps)
      }

      if (def.reward?.materials) {
        const inventory = useInventoryStore()
        for (let i = 0; i < def.reward.materials; i++) {
          inventory.tryDropMaterial(1, 'drifter')
        }
      }

      if (def.reward?.dwellSkipSeconds) {
        // Backdating the phase clock is exactly how the admin skip works —
        // the dwell getters read (now − phaseEnteredAt), nothing else.
        const solar = useSolarUpgradeStore()
        solar.skipDwell(def.reward.dwellSkipSeconds * 1000)
        solar.tickDwell()
      }

      if (def.reward?.starTimeSeconds) {
        const starGroup = useStarGroupStore()
        for (const star of starGroup.activeStars) {
          if (star.durationMs === undefined) continue
          star.durationMs += def.reward.starTimeSeconds * 1000
        }
      }

      if (def.reward?.orbitStrikeMaxHpPct) {
        this._applyOrbitStrike(def, def.reward.orbitStrikeMaxHpPct)
      }

      if (def.buff) {
        this.applyBuff(def)
      }
    },

    /**
     * Strike every living planet boss in the orbit at once, each for the same
     * share of its OWN maximum health.
     *
     * Deliberately not gated on `bossPlanetInForeground`: this is a wave through
     * the whole system, not a shot at one planet — a target that happens to be
     * behind the sun this second is still inside the orbit.
     *
     * Kills are not reported to `starGroupStore` from here. The boss watcher in
     * `useStarSystem` picks up every `defeated` flag and clears the star slot,
     * which is the same path a turret volley or a click kill takes.
     */
    _applyOrbitStrike(def: DrifterDef, maxHpPct: number): void {
      const bossStore = usePlanetBossStore()
      // Snapshot the list: `dealDamageToBoss` schedules removals, and a kill
      // must not shorten the very array being walked.
      const targets = bossStore.activeBosses.filter((b) => !b.defeated && !b.expired)

      let damage = 0
      let kills = 0
      for (const boss of targets) {
        // At least 1, so a boss with a tiny max HP is never a no-op hit.
        const amount = Math.max(1, Math.ceil(boss.maxHP * maxHpPct))
        const hpBefore = boss.currentHP
        const defeated = bossStore.dealDamageToBoss(boss, amount)
        // Read back what actually landed — boss damage multipliers raise it,
        // the last hit on a dying boss caps it at its remaining health.
        damage += hpBefore - boss.currentHP
        if (defeated) kills++
      }

      this.lastOrbitStrike = {
        seq: this.lastOrbitStrike.seq + 1,
        at: gameNow(),
        defId: def.id,
        planetsHit: targets.length,
        damage,
        kills,
      }
      logger.info('Drifter', `${def.name} struck the orbit`, {
        planets: targets.length,
        damage,
        kills,
      })
    },

    /** Start (or refresh) a drifter buff. Re-collecting a type restarts its
     *  timer instead of stacking a second copy of the same multiplier. */
    applyBuff(def: DrifterDef): void {
      if (!def.buff) return
      this.buffs = this.buffs.filter((b) => b.sourceId !== def.id)
      // Wanderer's Ear (chronicle): stretches the window. Stored as the buff's
      // own duration, not applied on read — the bar counts down against
      // `durationMs`, and a bonus earned mid-buff must not move its end.
      const durationMs = Math.round(
        def.buff.durationMs *
          useAchievementStore().drifterBuffDurationMult *
          // Hollow Tide (providence): häufiger, dafür kürzer
          useProvidenceStore().drifterBuffDurationMult *
          // Pilgrim's Reliquary (Star Forge): der einzige KAUF, der auf die
          // Bandzeile `boons` zahlt — sie trägt sonst nur, was der Zufall
          // gerade vorbeischickt.
          useStarForgeStore().boonDurationMult,
      )
      this.buffs.push({
        sourceId: def.id,
        expiresAt: gameNow() + durationMs,
        durationMs,
        effects: { ...def.buff.effects },
      })
      this.drifterNow = gameNow()
      this.refreshRates()
    },

    /** CPS and CPC are cached on the game store — recompute after any change to
     *  a multiplier that feeds them. The recomputation itself lives where the
     *  numbers are computed (`shopStore.refreshRates`); this stays as the name
     *  every caller in here already uses. */
    refreshRates(): void {
      useShopStore().refreshRates()
    },

    /** Called by the rendering layer while an opaque overlay hides the idle
     *  view — no spawning into a screen the player cannot reach. */
    setSpawningBlocked(blocked: boolean): void {
      this.spawningBlocked = blocked
    },

    /** Admin/testing: send a specific type out right now. */
    forceSpawn(defId?: string): void {
      // Clear the field first so the forced type is guaranteed to appear even
      // when a drifter is already mid-flight.
      this.active = []
      const spawned = this.spawnDrifter(defId)
      // Push that rarity's clock back so the forced one is not immediately
      // followed by the scheduled one of the same tier.
      if (spawned) {
        const def = getDrifter(spawned.defId)
        if (def) this.spawnCooldowns[def.rarity] = rollIntervalSec(def.rarity)
      }
    },

    clearAll(): void {
      this.active = []
      this.buffs = []
      this.spawnCooldowns = rollInitialCooldowns()
    },
  },
})
