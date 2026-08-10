import { defineStore } from 'pinia'
import type {
  ActiveVoidRift,
  VoidRiftDef,
  VoidRiftSeverity,
  VoidTideAftermath,
  VoidTideEffects,
  VoidTideOutcome,
} from '@/types'
import { VOID_RIFTS, getVoidRift, VOID_RIFT_SEVERITIES } from '@/config/world/voidTide'
import { logger } from '@/utils/logger'
import {
  rollVoidRiftPlacement,
  voidRiftScreenPos,
  voidRiftHalfExtent,
} from '@/utils/orbit/voidRiftPath'
import {
  VOID_TIDE_UNLOCK_LEVEL,
  VOID_RIFT_MAX_CONCURRENT,
  VOID_RIFT_SPAWN_INTERVAL_SEC,
  VOID_RIFT_FIRST_DELAY_SEC,
  VOID_RIFT_SPAWN_RETRY_SEC,
  VOID_RIFT_SEVERITY_ORDER,
  VOID_RIFT_HP_BASE,
  VOID_RIFT_HP_PER_GALAXY,
  VOID_RIFT_HP_SEVERITY_MULT,
  VOID_RIFT_LIFETIME_MS,
  VOID_RIFT_CLICK_DAMAGE_PCT,
  VOID_RIFT_DRAIN_RAMP_MIN,
  VOID_COLLAPSE_HP_LOSS,
  VOID_COLLAPSE_AFTERMATH_MS,
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
  (a, b) => VOID_RIFT_SEVERITY_ORDER[b] - VOID_RIFT_SEVERITY_ORDER[a],
)

function rollRange(range: [number, number] | undefined, fallback: number): number {
  if (!range) return fallback
  return range[0] + Math.random() * (range[1] - range[0])
}

/** Gestaffelte Startverzögerungen, eine Uhr je Schwere. */
function rollInitialCooldowns(): Record<VoidRiftSeverity, number> {
  const out = {} as Record<VoidRiftSeverity, number>
  for (const severity of SEVERITIES) {
    out[severity] = rollRange(VOID_RIFT_FIRST_DELAY_SEC[severity], VOID_RIFT_SPAWN_RETRY_SEC)
  }
  return out
}

/** Gewichtete Wahl INNERHALB einer Schwere — `weight` entscheidet nur, welcher
 *  Typ dieser Stufe aufreisst, nicht wie oft die Stufe drankommt. */
function rollRiftOfSeverity(severity: VoidRiftSeverity): VoidRiftDef | null {
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
 * Eine Achse aus mehreren Quellen zusammenrechnen.
 *
 * `1` heisst „unberührt" — deshalb ist das Produkt der richtige Weg und nicht
 * die Summe: zwei Quellen, die je auf 0,7 ziehen, ergeben 0,49 und nicht 0,4.
 */
function multiplyAxis(sources: VoidTideEffects[], key: keyof VoidTideEffects): number {
  return sources.reduce((m, e) => m * (e[key] ?? 1), 1)
}

/**
 * Void Tide — die Risse, die den Orbit von aussen aufziehen.
 *
 * Das einzige System in Bardle, dessen Uhr GEGEN den Spieler läuft. Ein Riss
 * steht am Bildrand, zieht an einer Achse der laufenden Wirtschaft und wird
 * dabei stetig stärker; geschlossen wird er von dem, was ohnehin im Orbit
 * steht (Kader und Turrets feuern von selbst, Klicks beschleunigen). Wer ihn
 * stehen lässt, zahlt mit Sonnen-HP und einer Minute Nachbeben.
 *
 * Wie beim `drifterStore` hält der Store nur logischen Zustand: Lage und
 * Wachstum leitet der Renderer aus `openedAt` ab, damit ein gedrosselter Tab
 * sie nicht desynchronisieren kann.
 */
export const useVoidTideStore = defineStore('voidTide', {
  state: () => ({
    active: [] as ActiveVoidRift[],
    aftermaths: [] as VoidTideAftermath[],
    /** Sekunden bis zum nächsten Riss je Schwere. Vom Tick heruntergezählt. */
    spawnCooldowns: rollInitialCooldowns(),
    /** Reaktive Uhr für die Drossel- und Nachbeben-Getter — ein rohes
     *  Date.now() in einem Getter würde nie neu ausgewertet werden. */
    voidNow: Date.now(),
    /** Unterdrückt das Aufreissen, solange ein deckendes Overlay den Idle-Layer
     *  verbirgt: ein Riss, den niemand sehen kann, wäre eine Strafe für das
     *  Öffnen eines Menüs. Wird vom Layer gesetzt. */
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
    } as VoidTideOutcome,
    // ── Lifetime counters (Bard Stats catalog) ──
    totalRiftsOpened: 0,
    totalRiftsSealed: 0,
    totalRiftsCollapsed: 0,
    /** Sonnen-HP, die Kollapse insgesamt gekostet haben. */
    totalVoidHpLost: 0,
  }),

  getters: {
    /** Die Tide beginnt erst, wenn ein Kader dasteht, der einen Riss auch
     *  schliessen kann — vorher wäre die Strafe Willkür statt Entscheidung. */
    isUnlocked(): boolean {
      return useGameStore().level >= VOID_TIDE_UNLOCK_LEVEL
    },

    /** Der eine offene Riss, oder `null`. */
    activeRift(state): ActiveVoidRift | null {
      return state.active[0] ?? null
    },

    hasActiveRift(state): boolean {
      return state.active.length > 0
    },

    /** Nachbeben, die gerade noch laufen. */
    liveAftermaths(state): VoidTideAftermath[] {
      return state.aftermaths.filter((a) => a.expiresAt > state.voidNow)
    },

    /**
     * Wie weit der offene Riss aufgezogen ist — 0 beim Aufreissen, 1 im Moment
     * des Kollaps. Treibt sowohl die Drossel-Rampe als auch die Grösse im
     * Layer, damit sichtbares Wachstum und spürbare Wirkung dasselbe erzählen.
     */
    riftProgress(state): number {
      const rift = state.active[0]
      if (!rift) return 0
      const span = rift.collapseAt - rift.openedAt
      if (span <= 0) return 1
      return Math.min(1, Math.max(0, (state.voidNow - rift.openedAt) / span))
    },

    /**
     * Was der offene Riss GERADE zieht, mit eingerechneter Rampe.
     *
     * Ein frisch geöffneter Riss wirkt nur zu `VOID_RIFT_DRAIN_RAMP_MIN`, ein
     * kurz vor dem Kollaps stehender voll. Gerechnet wird auf dem ABSTAND zu 1:
     * aus 0,7 wird bei halber Rampe nicht 0,35, sondern 0,85 — sonst wäre ein
     * junger Riss härter als ein alter.
     */
    drainEffects(): VoidTideEffects {
      const rift = this.activeRift
      if (!rift) return {}
      const def = getVoidRift(rift.defId)
      if (!def) return {}

      const ramp = VOID_RIFT_DRAIN_RAMP_MIN + (1 - VOID_RIFT_DRAIN_RAMP_MIN) * this.riftProgress
      const out: VoidTideEffects = {}
      for (const [key, value] of Object.entries(def.drain) as [keyof VoidTideEffects, number][]) {
        out[key] = 1 - (1 - value) * ramp
      }
      return out
    },

    /** Alles, was gerade zieht: der offene Riss und jedes laufende Nachbeben. */
    activeEffects(): VoidTideEffects[] {
      return [this.drainEffects, ...this.liveAftermaths.map((a) => a.effects)]
    },

    // ── Effekt-Getter (je einer pro Einbaustelle) ─────────────────────────────
    /** Faktor auf die gesamten Chimes pro Sekunde. */
    cpsMult(): number {
      return multiplyAxis(this.activeEffects, 'cpsMult')
    },
    /** Faktor auf die gesamten Chimes pro Klick. */
    cpcMult(): number {
      return multiplyAxis(this.activeEffects, 'cpcMult')
    },
    /** Faktor auf Champion-DPS im Orbit und Turret-Salven. */
    combatDpsMult(): number {
      return multiplyAxis(this.activeEffects, 'combatDpsMult')
    },
    /** Faktor auf die Material-Dropchance. */
    materialDropMult(): number {
      return multiplyAxis(this.activeEffects, 'materialDropMult')
    },
    /** Faktor auf den Champion-XP-Gewinn. */
    xpMult(): number {
      return multiplyAxis(this.activeEffects, 'xpMult')
    },

    /**
     * Trägt gerade irgendetwas einen CpS- oder CpC-Faktor? Beide Werte sind im
     * gameStore gecacht, und die Drossel wandert mit der Rampe jede Sekunde —
     * ohne diese Prüfung müsste der Tick blind bei jedem Durchlauf neu rechnen.
     */
    touchesRates(): boolean {
      return this.cpsMult !== 1 || this.cpcMult !== 1
    },
  },

  actions: {
    /**
     * Einmal pro Sekunde aus `gameStore.tick()`: Uhr stellen, Nachbeben
     * auslaufen lassen, den offenen Riss unter Beschuss nehmen und, wenn keiner
     * steht, für den nächsten würfeln.
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
      this.checkCollapse()

      // Die Rampe verschiebt die Drossel in JEDEM Takt, nicht nur beim Wechsel —
      // deshalb hier und nicht nur bei einem Ereignis.
      if (aftermathEnded || this.touchesRates) this.refreshRates()

      if (this.spawningBlocked) return
      this.tickSpawnClocks()
    },

    /**
     * Eine Uhr je Schwere. Gleichzeitig fällige werden vom Schwersten her
     * bedient, und eine Stufe, die das Feld belegt findet, wartet nur kurz und
     * versucht es erneut — sonst verdrängt der häufige kleine Riss regelmässig
     * den, auf den es ankommt.
     */
    tickSpawnClocks(): void {
      const delta = GAME_TICK_INTERVAL_MS / 1000
      const due: VoidRiftSeverity[] = []
      for (const severity of SEVERITIES) {
        this.spawnCooldowns[severity] = (this.spawnCooldowns[severity] ?? 0) - delta
        if (this.spawnCooldowns[severity] <= 0) due.push(severity)
      }
      // SEVERITIES steht bereits schwerste-zuerst, `due` erbt die Reihenfolge.
      for (const severity of due) {
        if (this.active.length >= VOID_RIFT_MAX_CONCURRENT) {
          this.spawnCooldowns[severity] = VOID_RIFT_SPAWN_RETRY_SEC
          continue
        }
        const def = rollRiftOfSeverity(severity)
        const opened = def ? this.openRift(def.id) : null
        this.spawnCooldowns[severity] = opened
          ? rollRange(VOID_RIFT_SPAWN_INTERVAL_SEC[severity], VOID_RIFT_SPAWN_RETRY_SEC)
          : VOID_RIFT_SPAWN_RETRY_SEC
      }
    },

    /**
     * Der Beschuss, der ohne Zutun des Spielers läuft: alles, was im Orbit
     * steht, feuert auf den Riss.
     *
     * Beide Quellen zählen den GANZEN Orbit, nicht nur den Sonnen-Vordergrund
     * (anders als `foregroundAutoAttackDPS`): ein Riss ist kein Planet auf
     * einer Bahn, er klafft im ganzen System. Was diese Sekunde hinter der
     * Sonne steht, feuert trotzdem hinein.
     */
    applyOrbitPressure(): void {
      const rift = this.activeRift
      if (!rift) return

      const fromChampions = useCombatStore().fullOrbitDps()
      const fromTurrets = usePlanetShopStore().riftAutoAttackDPS
      const total = fromChampions + fromTurrets
      if (total <= 0) return

      this.damageRift(total)
    },

    /**
     * Schaden auf den offenen Riss. Schliesst er sich dadurch, wird die Beute
     * sofort ausgezahlt.
     *
     * @returns `true`, wenn dieser Treffer den Riss geschlossen hat.
     */
    damageRift(amount: number): boolean {
      const rift = this.activeRift
      if (!rift || amount <= 0) return false

      rift.currentHp = Math.max(0, rift.currentHp - amount)
      if (rift.currentHp > 0) return false

      this.sealRift(rift)
      return true
    },

    /**
     * Ein Klick auf den Riss. Der Betrag hängt an seinen EIGENEN maximalen
     * Trefferpunkten, damit ein Klick in Galaxie 12 nicht zur Geste verkommt.
     *
     * @returns `true`, wenn dieser Klick den Riss geschlossen hat.
     */
    hitRift(uid: number): boolean {
      const rift = this.active.find((r) => r.uid === uid)
      if (!rift) return false
      rift.hitsLanded++
      return this.damageRift(rift.maxHp * VOID_RIFT_CLICK_DAMAGE_PCT)
    },

    /** Steht der Riss nach Ablauf seiner Frist noch, kollabiert er. */
    checkCollapse(): void {
      const rift = this.activeRift
      if (!rift) return
      if (this.voidNow < rift.collapseAt) return
      this.collapseRift(rift)
    },

    /**
     * Einen Riss aufreissen. Zähigkeit und Frist stehen im Moment des Öffnens
     * fest — eine Galaxie, die während des Kampfes wechselt, darf das Ziel
     * nicht unter dem Spieler wegziehen.
     */
    openRift(defId?: string): ActiveVoidRift | null {
      if (this.active.length >= VOID_RIFT_MAX_CONCURRENT) return null
      const def = defId ? getVoidRift(defId) : rollRiftOfSeverity(SEVERITIES[0])
      if (!def) return null

      const galaxy = useGalaxyStore().currentGalaxy
      const maxHp = Math.round(
        VOID_RIFT_HP_BASE *
          VOID_RIFT_HP_SEVERITY_MULT[def.severity] *
          (1 + Math.max(0, galaxy - 1) * VOID_RIFT_HP_PER_GALAXY),
      )
      const now = Date.now()
      // Die Lage wird gegen die HUD-Panels geprüft, und zwar mit der VOLLEN
      // Grösse des Typs: der Riss wächst, und einer, der klein aufgeht und
      // später unter die Bottom-Bar rutscht, wäre genau dann unklickbar, wenn
      // es darauf ankommt.
      const placement = rollVoidRiftPlacement(voidRiftHalfExtent(def.sizePx))

      const rift: ActiveVoidRift = {
        uid: ++uidCounter,
        defId: def.id,
        angle: placement.angle,
        radiusFrac: placement.radiusFrac,
        openedAt: now,
        collapseAt: now + VOID_RIFT_LIFETIME_MS[def.severity],
        maxHp,
        currentHp: maxHp,
        hitsLanded: 0,
      }
      this.active.push(rift)
      this.totalRiftsOpened++
      this.voidNow = now
      logger.info('VoidTide', `${def.name} tore open`, { uid: rift.uid, maxHp })
      return rift
    },

    /** Riss geschlossen: Beute auszahlen und die Bilanz melden. */
    sealRift(rift: ActiveVoidRift): void {
      const def = getVoidRift(rift.defId)
      this.active = this.active.filter((r) => r.uid !== rift.uid)
      this.totalRiftsSealed++
      if (!def) return

      this._applyBoon(def)
      this._recordOutcome(rift, def, true, 0)
      logger.info('VoidTide', `${def.name} sealed`, { boon: def.boonLine })
    },

    /**
     * Riss kollabiert: die Sonne zahlt.
     *
     * Der Schaden skaliert mit den VERBLIEBENEN Trefferpunkten — wer ihn halb
     * weggedrückt hat, zahlt die Hälfte. Ohne das wäre angefangene Arbeit
     * wertlos, und die beste Antwort auf einen Riss, den man nicht schafft,
     * wäre ihn gar nicht erst anzugehen.
     */
    collapseRift(rift: ActiveVoidRift): void {
      const def = getVoidRift(rift.defId)
      this.active = this.active.filter((r) => r.uid !== rift.uid)
      this.totalRiftsCollapsed++
      if (!def) return

      const remaining = rift.maxHp > 0 ? rift.currentHp / rift.maxHp : 1
      const raw = VOID_COLLAPSE_HP_LOSS[def.severity] * remaining
      // Mindestens 1, sonst ist ein fast geschlossener Riss ein Freifahrtschein.
      const hpLost = usePlayerStore().takeDamage(Math.max(1, Math.round(raw)))
      this.totalVoidHpLost += hpLost

      this.aftermaths.push({
        sourceId: def.id,
        expiresAt: Date.now() + VOID_COLLAPSE_AFTERMATH_MS,
        durationMs: VOID_COLLAPSE_AFTERMATH_MS,
        effects: { ...def.aftermath },
      })
      this.voidNow = Date.now()
      this.refreshRates()

      this._recordOutcome(rift, def, false, hpLost)
      logger.warn('VoidTide', `${def.name} collapsed`, { hpLost, remaining })
    },

    /** Die Beute eines geschlossenen Risses. */
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
          inventory.tryDropMaterial(1, 'voidTide')
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
     *  Stelle spielt — auch bei einem erzwungenen Kollaps. */
    _recordOutcome(rift: ActiveVoidRift, def: VoidRiftDef, sealed: boolean, hpLost: number): void {
      const pos = voidRiftScreenPos(rift, voidRiftHalfExtent(def.sizePx))
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

    /** Admin/Test: sofort einen bestimmten Typ aufreissen lassen. */
    forceOpen(defId?: string): void {
      this.active = []
      const opened = this.openRift(defId)
      if (opened) {
        const def = getVoidRift(opened.defId)
        if (def) {
          this.spawnCooldowns[def.severity] = rollRange(
            VOID_RIFT_SPAWN_INTERVAL_SEC[def.severity],
            VOID_RIFT_SPAWN_RETRY_SEC,
          )
        }
      }
    },

    /** Admin/Test: den offenen Riss sofort kollabieren lassen. */
    forceCollapse(): void {
      const rift = this.activeRift
      if (rift) this.collapseRift(rift)
    },

    clearAll(): void {
      this.active = []
      this.aftermaths = []
      this.spawnCooldowns = rollInitialCooldowns()
      this.refreshRates()
    },
  },
})
