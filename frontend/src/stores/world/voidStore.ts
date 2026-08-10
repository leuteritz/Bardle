import { defineStore } from 'pinia'
import type {
  VoidMonster,
  VoidRiftDef,
  VoidRiftSeverity,
  VoidAftermath,
  VoidEffects,
  VoidOutcome,
} from '@/types'
import { VOID_RIFTS, getVoidRift, VOID_RIFT_SEVERITIES } from '@/config/world/void'
import { logger } from '@/utils/logger'
import { rollVoidApproach, voidPositionAt } from '@/utils/orbit/voidPath'
import {
  VOID_UNLOCK_LEVEL,
  VOID_MAX_CONCURRENT,
  VOID_SPAWN_INTERVAL_SEC,
  VOID_FIRST_DELAY_SEC,
  VOID_SPAWN_RETRY_SEC,
  VOID_SEVERITY_ORDER,
  VOID_HP_BASE,
  VOID_HP_PER_GALAXY,
  VOID_HP_SEVERITY_MULT,
  VOID_TRAVEL_MS,
  VOID_CLICK_DAMAGE_PCT,
  VOID_DRAIN_RAMP_MIN,
  VOID_DRAIN_FLOOR,
  VOID_IMPACT_HP_LOSS,
  VOID_IMPACT_AFTERMATH_MS,
  VOID_BOON_CHIME_CAP_SEC,
  VOID_BOON_CHIME_MIN_CLICKS,
  GAME_TICK_INTERVAL_MS,
} from '@/config/constants'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useCombatStore } from '@/stores/battle/combatStore'

let uidCounter = 0

/** Schweregrade, absteigend — die Reihenfolge, in der gleichzeitig fällige
 *  Uhren bedient werden. */
const SEVERITIES = [...VOID_RIFT_SEVERITIES].sort(
  (a, b) => VOID_SEVERITY_ORDER[b] - VOID_SEVERITY_ORDER[a],
)

function rollRange(range: [number, number] | undefined, fallback: number): number {
  if (!range) return fallback
  return range[0] + Math.random() * (range[1] - range[0])
}

/** Gestaffelte Startverzögerungen, eine Uhr je Schwere. */
function rollInitialCooldowns(): Record<VoidRiftSeverity, number> {
  const out = {} as Record<VoidRiftSeverity, number>
  for (const severity of SEVERITIES) {
    out[severity] = rollRange(VOID_FIRST_DELAY_SEC[severity], VOID_SPAWN_RETRY_SEC)
  }
  return out
}

/** Gewichtete Wahl INNERHALB einer Schwere — `weight` entscheidet nur, welcher
 *  Typ dieser Stufe kommt, nicht wie oft die Stufe drankommt. */
function rollOfSeverity(severity: VoidRiftSeverity): VoidRiftDef | null {
  const pool = VOID_RIFTS.filter((r) => r.severity === severity)
  if (pool.length === 0) return null
  const total = pool.reduce((sum, r) => sum + r.weight, 0)
  let roll = Math.random() * total
  for (const def of pool) {
    roll -= def.weight
    if (roll <= 0) return def
  }
  return pool[pool.length - 1]
}

/**
 * The Void — was aus der Leere auf die Sonne zukriecht.
 *
 * Ein Wesen reisst am Bildrand auf und wandert zur Sonne. Es hat keine Frist,
 * es hat einen WEG: seine Position ergibt sich aus `spawnedAt` und der Wanduhr
 * (`utils/orbit/voidPath.ts`), nie aus fortgeschriebenem Zustand — damit kann
 * ein gedrosselter Tab es nicht von der Logik abkoppeln.
 *
 * Der Store hält deshalb nur, WOHER ein Wesen kam, wie lange es braucht und wie
 * viel es noch aushält. Alles Räumliche rechnet der Pfad, alles Sichtbare
 * zeichnet der Layer — in EINEM Canvas für alle, weil hier zwei Dutzend
 * gleichzeitig unterwegs sein dürfen (Performance-Regel 4).
 */
export const useVoidStore = defineStore('void', {
  state: () => ({
    active: [] as VoidMonster[],
    aftermaths: [] as VoidAftermath[],
    /** Sekunden bis zum nächsten Wesen je Schwere. Vom Tick heruntergezählt. */
    spawnCooldowns: rollInitialCooldowns(),
    /** Reaktive Uhr für die Drossel- und Nachbeben-Getter — ein rohes
     *  Date.now() in einem Getter würde nie neu ausgewertet werden. */
    voidNow: Date.now(),
    /** Unterdrückt das Aufreissen, solange ein deckendes Overlay den Idle-Layer
     *  verbirgt: ein Wesen, das niemand sehen kann, liefe ungesehen durch. */
    spawningBlocked: false,
    /** Bilanz des letzten Ausgangs — der Layer spielt sich daran ab. */
    lastOutcome: {
      seq: 0,
      at: 0,
      defId: '',
      sealed: false,
      x: 0,
      y: 0,
      hpLost: 0,
    } as VoidOutcome,
    // ── Lifetime counters (Bard Stats catalog) ──
    totalRiftsOpened: 0,
    totalRiftsSealed: 0,
    totalRiftsCollapsed: 0,
    /** Sonnen-HP, die Einschläge insgesamt gekostet haben. */
    totalVoidHpLost: 0,
  }),

  getters: {
    /** Der Void beginnt erst, wenn ein Kader dasteht, der ihn aufhalten kann —
     *  vorher wäre die Strafe Willkür statt Entscheidung. */
    isUnlocked(): boolean {
      return useGameStore().level >= VOID_UNLOCK_LEVEL
    },

    hasActive(state): boolean {
      return state.active.length > 0
    },

    /** Nachbeben, die gerade noch laufen. */
    liveAftermaths(state): VoidAftermath[] {
      return state.aftermaths.filter((a) => a.expiresAt > state.voidNow)
    },

    /**
     * Wie weit jedes Wesen auf seinem Weg ist, 0..1. Einmal gerechnet, weil
     * gleich drei Dinge daran hängen: Drossel, Zielwahl des Orbits und die
     * HUD-Karte.
     */
    progressByUid(state): Map<number, number> {
      const out = new Map<number, number>()
      for (const m of state.active) {
        const span = Math.max(1, m.travelMs)
        out.set(m.uid, Math.min(1, Math.max(0, (state.voidNow - m.spawnedAt) / span)))
      }
      return out
    },

    /**
     * Das Wesen, das der Sonne am nächsten ist.
     *
     * Es ist das Ziel des gesamten Orbit-Beschusses und der Kopf der HUD-Karte.
     * Der Orbit verteidigt die Sonne, also schiesst er auf das, was sie zuerst
     * erreicht — Streufeuer über alle hätte bei zwei Dutzend Wesen zur Folge,
     * dass keines rechtzeitig fällt und alle ankommen.
     */
    leadMonster(state): VoidMonster | null {
      let lead: VoidMonster | null = null
      let best = -1
      for (const m of state.active) {
        const t = this.progressByUid.get(m.uid) ?? 0
        if (t > best) {
          best = t
          lead = m
        }
      }
      return lead
    },

    /**
     * Was der Void GERADE zieht, über alle Wesen zusammen.
     *
     * Je Wesen läuft die Wirkung mit der Nähe hoch (`VOID_DRAIN_RAMP_MIN` am
     * Rand, voll an der Sonne) — ein Wesen weit draussen ist eine Ankündigung,
     * eines kurz vor der Sonne ein Notfall. Gerechnet wird auf dem ABSTAND zu 1:
     * aus 0,7 wird bei halber Rampe 0,85 und nicht 0,35, sonst wäre ein frisches
     * Wesen härter als ein nahes.
     *
     * Der Deckel `VOID_DRAIN_FLOOR` ist Pflicht, kein Feinschliff: zwei Dutzend
     * Faktoren unter 1 multiplizieren sich sonst gegen null, und eine Wirtschaft
     * bei 2 % ist kein Druck mehr, sondern ein Abbruch.
     */
    drainEffects(state): VoidEffects {
      const out: VoidEffects = {}
      for (const m of state.active) {
        const def = getVoidRift(m.defId)
        if (!def) continue
        const t = this.progressByUid.get(m.uid) ?? 0
        const ramp = VOID_DRAIN_RAMP_MIN + (1 - VOID_DRAIN_RAMP_MIN) * t
        for (const [key, value] of Object.entries(def.drain) as [keyof VoidEffects, number][]) {
          const scaled = 1 - (1 - value) * ramp
          out[key] = (out[key] ?? 1) * scaled
        }
      }
      for (const key of Object.keys(out) as (keyof VoidEffects)[]) {
        out[key] = Math.max(VOID_DRAIN_FLOOR, out[key] ?? 1)
      }
      return out
    },

    /** Alles, was gerade zieht: die Wanderer und jedes laufende Nachbeben. */
    activeEffects(): VoidEffects[] {
      return [this.drainEffects, ...this.liveAftermaths.map((a) => a.effects)]
    },

    // ── Effekt-Getter (je einer pro Einbaustelle) ─────────────────────────────
    /** Faktor auf die gesamten Chimes pro Sekunde. */
    cpsMult(): number {
      return this.activeEffects.reduce((m, e) => m * (e.cpsMult ?? 1), 1)
    },
    /** Faktor auf die gesamten Chimes pro Klick. */
    cpcMult(): number {
      return this.activeEffects.reduce((m, e) => m * (e.cpcMult ?? 1), 1)
    },
    /** Faktor auf Champion-DPS im Orbit und Turret-Salven. */
    combatDpsMult(): number {
      return this.activeEffects.reduce((m, e) => m * (e.combatDpsMult ?? 1), 1)
    },
    /** Faktor auf die Material-Dropchance. */
    materialDropMult(): number {
      return this.activeEffects.reduce((m, e) => m * (e.materialDropMult ?? 1), 1)
    },
    /** Faktor auf den Champion-XP-Gewinn. */
    xpMult(): number {
      return this.activeEffects.reduce((m, e) => m * (e.xpMult ?? 1), 1)
    },

    /**
     * Trägt gerade irgendetwas einen CpS- oder CpC-Faktor? Beide Werte sind im
     * gameStore gecacht, und die Drossel wandert mit jedem Wesen jede Sekunde —
     * ohne diese Prüfung müsste der Tick blind bei jedem Durchlauf neu rechnen.
     */
    touchesRates(): boolean {
      return this.cpsMult !== 1 || this.cpcMult !== 1
    },
  },

  actions: {
    /**
     * Einmal pro Sekunde aus `gameStore.tick()`: Uhr stellen, Nachbeben
     * auslaufen lassen, den Orbit feuern lassen, Ankünfte abrechnen und für
     * Nachschub würfeln.
     */
    tick(): void {
      this.voidNow = Date.now()

      const before = this.aftermaths.length
      this.aftermaths = this.aftermaths.filter((a) => a.expiresAt > this.voidNow)
      const aftermathEnded = this.aftermaths.length !== before

      if (!this.isUnlocked) {
        // Ein noch laufendes Nachbeben darf trotzdem sauber auslaufen — sonst
        // hinge nach einem Wipe ein Faktor fest, den niemand mehr sieht.
        if (aftermathEnded) this.refreshRates()
        return
      }

      this.applyOrbitPressure()
      this.resolveArrivals()

      // Die Rampe verschiebt die Drossel in JEDEM Takt, nicht nur beim Wechsel —
      // deshalb hier und nicht nur bei einem Ereignis.
      if (aftermathEnded || this.touchesRates) this.refreshRates()

      if (this.spawningBlocked) return
      this.tickSpawnClocks()
    },

    /**
     * Eine Uhr je Schwere. Gleichzeitig fällige werden vom Schwersten her
     * bedient, und eine Stufe, die das Feld voll findet, wartet nur kurz und
     * versucht es erneut — sonst verdrängt das häufige kleine Wesen regelmässig
     * das, auf das es ankommt.
     */
    tickSpawnClocks(): void {
      const delta = GAME_TICK_INTERVAL_MS / 1000
      const due: VoidRiftSeverity[] = []
      for (const severity of SEVERITIES) {
        this.spawnCooldowns[severity] = (this.spawnCooldowns[severity] ?? 0) - delta
        if (this.spawnCooldowns[severity] <= 0) due.push(severity)
      }
      for (const severity of due) {
        if (this.active.length >= VOID_MAX_CONCURRENT) {
          this.spawnCooldowns[severity] = VOID_SPAWN_RETRY_SEC
          continue
        }
        const def = rollOfSeverity(severity)
        const spawned = def ? this.spawnMonster(def.id) : null
        this.spawnCooldowns[severity] = spawned
          ? rollRange(VOID_SPAWN_INTERVAL_SEC[severity], VOID_SPAWN_RETRY_SEC)
          : VOID_SPAWN_RETRY_SEC
      }
    },

    /**
     * Der Beschuss, der ohne Zutun des Spielers läuft — gebündelt auf das
     * vorderste Wesen.
     *
     * Beide Quellen zählen den GANZEN Orbit, nicht nur den Sonnen-Vordergrund
     * (anders als `foregroundAutoAttackDPS`): ein Void-Wesen ist kein Planet auf
     * einer Bahn, es kommt quer durchs System. Was diese Sekunde hinter der
     * Sonne steht, feuert trotzdem.
     *
     * Überschuss wird weitergereicht: fällt das vorderste, trifft der Rest das
     * nächste. Ohne das verpufft bei einem Dutzend schwacher Wesen fast der
     * ganze Schaden am ersten.
     */
    applyOrbitPressure(): void {
      if (this.active.length === 0) return
      const fromChampions = useCombatStore().fullOrbitDps()
      const fromTurrets = usePlanetShopStore().riftAutoAttackDPS
      let pool = fromChampions + fromTurrets
      if (pool <= 0) return

      // Nach Nähe absteigend: das vorderste zuerst.
      const order = [...this.active].sort(
        (a, b) => (this.progressByUid.get(b.uid) ?? 0) - (this.progressByUid.get(a.uid) ?? 0),
      )
      for (const m of order) {
        if (pool <= 0) break
        const dealt = Math.min(pool, m.currentHp)
        pool -= dealt
        this.damageMonster(m.uid, dealt)
      }
    },

    /**
     * Schaden auf ein bestimmtes Wesen. Stirbt es dabei, fällt sofort die Beute.
     *
     * @returns `true`, wenn dieser Treffer es erlegt hat.
     */
    damageMonster(uid: number, amount: number): boolean {
      const m = this.active.find((x) => x.uid === uid)
      if (!m || amount <= 0) return false

      m.currentHp = Math.max(0, m.currentHp - amount)
      if (m.currentHp > 0) return false

      this.slayMonster(m)
      return true
    },

    /**
     * Ein Klick auf ein Wesen. Der Betrag hängt an seinen EIGENEN maximalen
     * Trefferpunkten, damit ein Klick in Galaxie 12 nicht zur Geste verkommt.
     *
     * @returns `true`, wenn dieser Klick es erlegt hat.
     */
    hitMonster(uid: number): boolean {
      const m = this.active.find((x) => x.uid === uid)
      if (!m) return false
      m.hitsLanded++
      return this.damageMonster(uid, m.maxHp * VOID_CLICK_DAMAGE_PCT)
    },

    /** Alles, was seinen Weg vollendet hat, schlägt ein. */
    resolveArrivals(): void {
      if (this.active.length === 0) return
      const arrived = this.active.filter((m) => this.voidNow >= m.spawnedAt + m.travelMs)
      for (const m of arrived) this.impactMonster(m)
    },

    /**
     * Ein Wesen aufreissen lassen. Zähigkeit und Reisedauer stehen im Moment des
     * Erscheinens fest — eine Galaxie, die während der Reise wechselt, darf das
     * Ziel nicht unter dem Spieler wegziehen.
     */
    spawnMonster(defId?: string): VoidMonster | null {
      if (this.active.length >= VOID_MAX_CONCURRENT) return null
      const def = defId ? getVoidRift(defId) : rollOfSeverity(SEVERITIES[0])
      if (!def) return null

      const galaxy = useGalaxyStore().currentGalaxy
      const maxHp = Math.round(
        VOID_HP_BASE *
          VOID_HP_SEVERITY_MULT[def.severity] *
          (1 + Math.max(0, galaxy - 1) * VOID_HP_PER_GALAXY),
      )
      const now = Date.now()
      const approach = rollVoidApproach()

      const monster: VoidMonster = {
        uid: ++uidCounter,
        defId: def.id,
        angle: approach.angle,
        drift: approach.drift,
        spawnedAt: now,
        travelMs: VOID_TRAVEL_MS[def.severity],
        maxHp,
        currentHp: maxHp,
        hitsLanded: 0,
      }
      this.active.push(monster)
      this.totalRiftsOpened++
      this.voidNow = now
      logger.info('Void', `${def.name} tore in`, { uid: monster.uid, maxHp })
      return monster
    },

    /** Wesen erlegt: Beute auszahlen und die Bilanz melden. */
    slayMonster(monster: VoidMonster): void {
      const def = getVoidRift(monster.defId)
      this.active = this.active.filter((m) => m.uid !== monster.uid)
      this.totalRiftsSealed++
      if (!def) return

      this._applyBoon(def)
      this._recordOutcome(monster, def, true, 0)
      logger.info('Void', `${def.name} slain`, { boon: def.boonLine })
    },

    /**
     * Ein Wesen hat die Sonne erreicht: sie zahlt.
     *
     * Der Schaden ist NICHT nach Restleben gestaffelt — anders als beim früheren
     * Riss, und das ist der Punkt: was ankommt, kommt ganz an. Angefangene
     * Arbeit zählt trotzdem, sie zählt nur an anderer Stelle — ein Wesen, das
     * man auf ein Viertel heruntergeprügelt hat, fällt dem Orbit-Beschuss
     * unterwegs viel eher zum Opfer und kommt gar nicht erst an.
     */
    impactMonster(monster: VoidMonster): void {
      const def = getVoidRift(monster.defId)
      this.active = this.active.filter((m) => m.uid !== monster.uid)
      this.totalRiftsCollapsed++
      if (!def) return

      const hpLost = usePlayerStore().takeDamage(VOID_IMPACT_HP_LOSS[def.severity])
      this.totalVoidHpLost += hpLost

      const durationMs = VOID_IMPACT_AFTERMATH_MS[def.severity]
      this.aftermaths = this.aftermaths.filter((a) => a.sourceId !== def.id)
      this.aftermaths.push({
        sourceId: def.id,
        expiresAt: Date.now() + durationMs,
        durationMs,
        effects: { ...def.aftermath },
      })
      this.voidNow = Date.now()
      this.refreshRates()

      this._recordOutcome(monster, def, false, hpLost)
      logger.warn('Void', `${def.name} reached the sun`, { hpLost, severity: def.severity })
    },

    /** Die Beute eines erlegten Wesens. */
    _applyBoon(def: VoidRiftDef): void {
      const gameStore = useGameStore()

      if (def.boon.chimesFromCpsSeconds) {
        // Zwei Böden, wie beim Drifter: ein Vielfaches des Klickwerts früh,
        // das Produktionsfenster später — sonst wäre der Abschluss in der
        // Frühphase reine Mühe ohne Ertrag.
        const fromCps = gameStore.chimesPerSecond * def.boon.chimesFromCpsSeconds
        const capped = Math.min(fromCps, gameStore.chimesPerSecond * VOID_BOON_CHIME_CAP_SEC)
        const floor = gameStore.chimesPerClick * VOID_BOON_CHIME_MIN_CLICKS
        const gain = Math.max(capped, floor)
        gameStore.chimes += gain
        gameStore.chimesForMeep += gain
        gameStore.chimesForNextUniverse += gain
        gameStore.totalChimesEarned += gain
        gameStore.chimesEarnedForLevel += gain
        gameStore.calculateLevel()
        gameStore.addMeep()
      }

      if (def.boon.materials) {
        const inventory = useInventoryStore()
        for (let i = 0; i < def.boon.materials; i++) {
          inventory.tryDropMaterial(1, 'void')
        }
      }

      // Der Buff läuft über dieselbe Nachbeben-Liste wie die Strafe — es ist
      // dieselbe Struktur, nur über 1 statt darunter. Zwei Listen zu führen
      // hiesse, jede Achse zweimal zusammenzurechnen.
      this.aftermaths = this.aftermaths.filter((a) => a.sourceId !== def.id)
      this.aftermaths.push({
        sourceId: def.id,
        expiresAt: Date.now() + def.boon.durationMs,
        durationMs: def.boon.durationMs,
        effects: { ...def.boon.effects },
      })
      this.voidNow = Date.now()
      this.refreshRates()
    },

    /** Ausgang festhalten, damit der Layer seinen Effekt an der richtigen
     *  Stelle spielt — auch bei einem erzwungenen Einschlag. */
    _recordOutcome(monster: VoidMonster, def: VoidRiftDef, sealed: boolean, hpLost: number): void {
      const sunRadius = usePlanetShopStore().orbitSunRadius
      const pos = voidPositionAt(monster, def.sizePx, sunRadius, Date.now())
      this.lastOutcome = {
        seq: this.lastOutcome.seq + 1,
        at: Date.now(),
        defId: def.id,
        sealed,
        x: pos.x,
        y: pos.y,
        hpLost,
      }
    },

    /** CpS und CpC liegen gecacht im gameStore — nach jeder Änderung an einem
     *  Faktor, der sie speist, neu rechnen. Gerechnet wird dort, wo gerechnet
     *  wird (`shopStore.refreshRates`); das hier bleibt der Name, den die
     *  Aufrufer in diesem Store schon benutzen. */
    refreshRates(): void {
      useShopStore().refreshRates()
    },

    /** Vom Renderer gesetzt, solange ein deckendes Overlay den Idle-Layer
     *  verbirgt — kein Aufreissen in einen Bildschirm, den niemand sieht. */
    setSpawningBlocked(blocked: boolean): void {
      this.spawningBlocked = blocked
    },

    /** Admin/Test: sofort ein bestimmtes Wesen schicken. */
    forceSpawn(defId?: string): void {
      const spawned = this.spawnMonster(defId)
      if (spawned) {
        const def = getVoidRift(spawned.defId)
        if (def) {
          this.spawnCooldowns[def.severity] = rollRange(
            VOID_SPAWN_INTERVAL_SEC[def.severity],
            VOID_SPAWN_RETRY_SEC,
          )
        }
      }
    },

    /** Admin/Test: das vorderste Wesen sofort einschlagen lassen. */
    forceImpact(): void {
      const lead = this.leadMonster
      if (lead) this.impactMonster(lead)
    },

    clearAll(): void {
      this.active = []
      this.aftermaths = []
      this.spawnCooldowns = rollInitialCooldowns()
      this.refreshRates()
    },
  },
})
