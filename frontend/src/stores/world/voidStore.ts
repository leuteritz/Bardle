import { defineStore } from 'pinia'
import type {
  VoidMonster,
  VoidRiftDef,
  VoidRiftSeverity,
  VoidAftermath,
  VoidEffects,
  VoidOutcome,
} from '@/types'
import type { ChampionRole } from '@/types'
import { VOID_RIFTS, getVoidRift, VOID_RIFT_SEVERITIES } from '@/config/world/void'
import { logger } from '@/utils/logger'
import { gameNow } from '@/utils/game/gameClock'
import { rollVoidApproach, voidPositionAt } from '@/utils/orbit/voidPath'
import type { ContactHit } from '@/utils/orbit/voidContact'
import {
  voidContactRadius,
  collectContacts,
  armContact,
  pruneContactCooldowns,
} from '@/utils/orbit/voidContact'
import { hudFieldMetrics } from '@/utils/ui/hudField'
import { useHeaderCenterArc } from '@/composables/ui/useHeaderCenterArc'
import { spawnFloat } from '@/utils/fx/damageFloats'
import { logVoidBlocked, logVoidCulled, logVoidWarded, logVoidBanished } from '@/config/ui/eventLog'
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
  VOID_IMPACT_MEEP_LOSS_PCT,
  VOID_IMPACT_MEEP_LOSS_MIN,
  VOID_BOON_CHIME_CAP_SEC,
  VOID_BOON_CHIME_MIN_CLICKS,
  VOID_CONTACT_REARM_MS,
  VOID_PLANET_CONTACT_REARM_MS,
  VOID_CONTACT_FLOAT_MAX_PER_TICK,
  VOID_ROLE_ABILITIES,
  VOID_TOP_BLOCK_MS,
  VOID_TOP_BLOCK_DAMAGE_PCT,
  VOID_JUNGLE_EXECUTE_PCT,
  VOID_JUNGLE_STRIKE_PCT,
  VOID_JUNGLE_CULL_COOLDOWN_MS,
  VOID_MID_CURSE_MS,
  VOID_MID_CURSE_AMP,
  VOID_MID_CURSE_SLOW,
  VOID_ADC_FOCUS_MS,
  VOID_SUPPORT_WARD_MS,
  VOID_PLANET_CONTACT_HP_FRAC,
  VOID_PLANET_STRIKE_PCT,
  VOID_PLANET_RIDER,
  VOID_PLANET_SPLASH_RADIUS_PX,
  VOID_PLANET_SPLASH_FRAC,
  VOID_PLANET_RELAY_BANISH_MS,
  VOID_PLANET_SLOW_MS,
  COMBAT_FLOAT_DURATION_MS,
  ROLE_INDEX_BY_KEY,
  ROLE_SUPPORT_HEAL_AMOUNT,
  ROLE_ADC_BURST_DAMAGE,
  PLANET_ROLES,
  GAME_TICK_INTERVAL_MS,
} from '@/config/constants'
import { useGameStore } from '@/stores/core/gameStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useRoleBehaviorStore } from '@/stores/battle/roleBehaviorStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
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
/** Wer die Rolle gerade spielt — für die Logzeilen. Bewusst hier nachgebaut
 *  statt aus dem roleBehaviorStore importiert: dort ist es ein privater Helfer,
 *  und ihn zu exportieren machte aus einer internen Bequemlichkeit eine API. */
function championNameByRole(role: ChampionRole): string {
  const idx = ROLE_INDEX_BY_KEY[role]
  return useBattleStore().headerSlots[idx] ?? role.toUpperCase()
}

// Wiederverwendete Puffer: der Auflöser läuft mit 60 Hz über bis zu zwei Dutzend
// Wesen. Neue Arrays je Frame wären reine Müllproduktion.
const contactBuf: ContactHit[] = []

interface VoidFieldEntry {
  m: VoidMonster
  def: VoidRiftDef
  x: number
  y: number
}
const fieldBuf: VoidFieldEntry[] = []
let fieldCount = 0

/**
 * Deckel auf Schadenszahlen je Auflösungslauf. `combatStore.damageFloats` wird
 * nur mit 1 Hz gefegt — ein Schwarm, der gleichzeitig berührt, füllte die Liste
 * sonst mit zwei Dutzend Zahlen, von denen keine mehr zu lesen wäre.
 */
let floatBudget = 0
function contactFloat(value: number, x: number, y: number, extra: Record<string, boolean>): void {
  if (floatBudget <= 0) return
  floatBudget--
  spawnFloat(Math.round(value), x, y, COMBAT_FLOAT_DURATION_MS, extra)
}

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
     *  gameNow() in einem Getter würde nie neu ausgewertet werden. */
    voidNow: gameNow(),
    /** Unterdrückt das Aufreissen, solange ein deckendes Overlay den Idle-Layer
     *  verbirgt: ein Wesen, das niemand sehen kann, liefe ungesehen durch. */
    spawningBlocked: false,
    /** Wann der Jungler wieder hinrichten darf. Rollen-eigene Abklingzeit ZUSÄTZLICH
     *  zur Paar-Sperre — ohne sie räumte ein einziger Durchlauf durch einen
     *  Schwarm alles Angeschlagene auf einmal ab. */
    jungleCullReadyAt: 0,
    /** Bilanz des letzten Ausgangs — der Layer spielt sich daran ab. */
    lastOutcome: {
      seq: 0,
      at: 0,
      defId: '',
      sealed: false,
      x: 0,
      y: 0,
      hpLost: 0,
      meepsLost: 0,
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
        // Supports Ward legt die Drossel EINES Wesens still, ohne es
        // aufzuhalten — es kommt weiter, es zieht nur nicht mehr. Die einzige
        // Rolle, die bei Berührung gar keinen Schaden macht.
        if (m.wardedUntil > state.voidNow) continue
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

    /** Wie viele Wesen gerade gewardet sind. Der Tick vergleicht die Zahl vor
     *  und nach dem Durchlauf: läuft der letzte Ward aus, während sonst nichts
     *  an den Raten zieht, bliebe die gecachte CpS auf dem stillgelegten Stand. */
    wardedCount(state): number {
      let n = 0
      for (const m of state.active) if (m.wardedUntil > state.voidNow) n++
      return n
    },
  },

  actions: {
    /**
     * Einmal pro Sekunde aus `gameStore.tick()`: Uhr stellen, Nachbeben
     * auslaufen lassen, den Orbit feuern lassen, Ankünfte abrechnen und für
     * Nachschub würfeln.
     */
    tick(): void {
      this.voidNow = gameNow()

      const before = this.aftermaths.length
      this.aftermaths = this.aftermaths.filter((a) => a.expiresAt > this.voidNow)
      const aftermathEnded = this.aftermaths.length !== before

      // Ein Ward legt die Drossel eines Wesens still. Läuft der letzte aus,
      // während `touchesRates` gerade falsch war, bliebe die gecachte CpS auf
      // dem stillgelegten Stand stehen — deshalb die Zahl vorher merken.
      const wardedBefore = this.wardedCount

      // Was schon unterwegs ist, wird IMMER zu Ende gerechnet — auch ohne
      // Freischaltung. Ein Prestige setzt das Level auf 1 zurück, und ein Wesen,
      // das in diesem Moment anflog, hing sonst für immer auf der Sonne fest:
      // unbesiegbar, nie einschlagend, mit voller Drossel auf den Büchern und
      // einer HUD-Karte, die bei null Sekunden stehenblieb. Freigeschaltet sein
      // muss nur, was NEU aufreisst.
      //
      // Die Reihenfolge trägt das ganze Berührungs-System: erst laufende Blocks
      // und Bremsen fortschreiben (sie verschieben `spawnedAt` und damit den
      // Fortschritt), dann NEUE Berührungen zünden lassen, dann den Pool feuern
      // — der zielt auf den Fortschritt, den die beiden Schritte davor gesetzt
      // haben —, und ganz zuletzt abrechnen, was angekommen ist. Ein Wesen, das
      // diese Sekunde geblockt oder erlegt wird, darf im selben Takt nicht mehr
      // einschlagen.
      this._tickContactHolds()
      this.resolveOrbitContacts(this.voidNow)
      this.applyOrbitPressure()
      this.resolveArrivals(this.voidNow)

      // Die Rampe verschiebt die Drossel in JEDEM Takt, nicht nur beim Wechsel —
      // deshalb hier und nicht nur bei einem Ereignis. Auch das gilt ohne
      // Freischaltung: sonst hinge nach einem Wipe ein Faktor fest, den niemand
      // mehr sieht.
      if (aftermathEnded || this.touchesRates || this.wardedCount !== wardedBefore) {
        this.refreshRates()
      }

      // Sperrzeiten erlegter Wesen abräumen — im Sekundentakt, nicht je Frame.
      // Eine Uid kommt nie wieder, die Map wüchse sonst über die Sitzung.
      pruneContactCooldowns(new Set(this.active.map((m) => m.uid)))

      if (!this.isUnlocked || this.spawningBlocked) return
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

      // Nach Nähe absteigend: das vorderste zuerst — es sei denn, die ADC hat
      // etwas markiert. Dann geht der ganze Pool zuerst dorthin; die Marke ist
      // genau das, was die ADC beisteuert, statt selbst Schaden draufzulegen.
      const now = this.voidNow
      const order = [...this.active].sort((a, b) => {
        const fa = a.focusedUntil > now ? 1 : 0
        const fb = b.focusedUntil > now ? 1 : 0
        if (fa !== fb) return fb - fa
        return (this.progressByUid.get(b.uid) ?? 0) - (this.progressByUid.get(a.uid) ?? 0)
      })
      for (const m of order) {
        if (pool <= 0) break
        // Die Deckelung rechnet auf dem ROHWERT, nicht auf den Trefferpunkten:
        // `damageMonster` verstärkt einen Fluch, und würde hier auf `currentHp`
        // gedeckelt, ginge der Überschuss, den das nächste Wesen bekommt, um
        // genau diesen Faktor daneben.
        const amp = this._curseAmp(m)
        const dealt = Math.min(pool, m.currentHp / amp)
        pool -= dealt
        this.damageMonster(m.uid, dealt)
      }
    },

    /** Faktor, mit dem ein verfluchtes Wesen Schaden nimmt. Sitzt an EINER
     *  Stelle, damit Klick, Orbit-Pool und Berührung ihn alle bekommen. */
    _curseAmp(m: VoidMonster): number {
      return m.cursedUntil > gameNow() ? VOID_MID_CURSE_AMP : 1
    },

    /**
     * Schaden auf ein bestimmtes Wesen. Stirbt es dabei, fällt sofort die Beute.
     *
     * @returns `true`, wenn dieser Treffer es erlegt hat.
     */
    damageMonster(uid: number, amount: number): boolean {
      const m = this.active.find((x) => x.uid === uid)
      if (!m || amount <= 0) return false

      m.currentHp = Math.max(0, m.currentHp - amount * this._curseAmp(m))
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

    // ── Berührung ───────────────────────────────────────────────────────────
    // Der Orbit steht dem Void körperlich im Weg. Welche Rolle was tut, steht
    // in `config/constants/void.ts`; hier steht, wann es zündet.

    /**
     * Laufende Blocks und Bremsen fortschreiben.
     *
     * Anhalten heisst `spawnedAt` im Takt der Uhr mitschieben — dasselbe Idiom
     * wie `bardAbilityStore.tickStasis`, und aus demselben Grund: der Weg misst
     * `(now − spawnedAt) / travelMs`, rückt die Startmarke mit, bleibt der Bruch
     * konstant, und damit Position, Grösse, Drossel, Führung und Ankunft
     * gleichzeitig. Ein `frozen`-Flag müsste an sechs Stellen geprüft werden,
     * und die siebte wäre vergessen.
     *
     * Die Nebenwirkung ist die halbe Miete: ein gehaltenes Wesen klettert nicht
     * weiter, verliert damit die Führung, und `leadMonster` reicht den gesamten
     * Orbit-Beschuss ohne eine Zeile Zusatzcode an das nächste weiter.
     */
    _tickContactHolds(): void {
      if (this.active.length === 0) return

      // Die Stase aus Bard R schiebt bereits JEDES `spawnedAt` um einen vollen
      // Takt — und sie läuft im selben `gameStore.tick()` VOR uns. Ein zweites
      // Schieben liesse ein gehaltenes Wesen rückwärts laufen.
      if (useBardAbilityStore().stasisActive) return

      const now = this.voidNow
      for (const m of this.active) {
        // Block und Bremse werden nie addiert — der Block ist bereits das
        // Maximum, mehr als die verstrichene Wanduhr schöbe den Fortschritt
        // ins Negative.
        let shift = 0
        if (m.blockedUntil > now) shift = GAME_TICK_INTERVAL_MS
        else if (m.slowedUntil > now) shift = GAME_TICK_INTERVAL_MS * VOID_MID_CURSE_SLOW
        if (shift <= 0) continue
        m.spawnedAt += Math.min(GAME_TICK_INTERVAL_MS, shift)
      }
    },

    /**
     * Wer berührt gerade wen — und was folgt daraus.
     *
     * Wird aus ZWEI Takten gerufen: aus der Frame-Schleife des `VoidLayer`
     * (flüssig, 60 Hz) und aus `tick()` (1 Hz, greift, wenn ein Modal den Layer
     * verdeckt). Genau die Doppelaufruf-Form, die `resolveArrivals` schon hat.
     *
     * Doppeltes Zünden ist konstruktiv unmöglich: `armContact` prüft und
     * stempelt die Paar-Sperre in EINEM Aufruf, und zwar vor jedem Effekt.
     *
     * Die Positionen werden hier selbst gerechnet, statt sie aus dem Layer
     * durchzureichen — eine Signatur heisst, dass die beiden Takte nicht
     * auseinanderlaufen können.
     */
    resolveOrbitContacts(now: number = gameNow()): void {
      if (this.active.length === 0) return

      const sunRadius = usePlanetShopStore().orbitSunRadius
      // Der GECACHTE Leser: er gibt dasselbe Objekt zurück, bis das Fenster
      // oder der Header-Bogen sich ändert. `readHudFieldMetrics` gehört nie in
      // eine Frame-Schleife.
      const metrics = hudFieldMetrics(useHeaderCenterArc().headerCenterArc.value ?? null)
      floatBudget = VOID_CONTACT_FLOAT_MAX_PER_TICK

      // Erst das ganze Feld einmessen — der Splash des Resonators braucht die
      // Nachbarn, und ein zweiter Positionslauf dafür wäre verschenkt.
      fieldCount = 0
      for (const m of this.active) {
        const def = getVoidRift(m.defId)
        if (!def) continue
        const pos = voidPositionAt(
          m,
          def.sizePx,
          sunRadius,
          now,
          metrics.viewportW,
          metrics.viewportH,
          metrics,
        )
        const entry = fieldBuf[fieldCount]
        if (entry) {
          entry.m = m
          entry.def = def
          entry.x = pos.x
          entry.y = pos.y
        } else {
          fieldBuf.push({ m, def, x: pos.x, y: pos.y })
        }
        fieldCount++

        // Der Berührungsradius hängt an der DARGESTELLTEN Grösse und wandert
        // daher mit `pos.scale` — ein frisch aufgerissenes Wesen ist ein
        // Drittel so gross wie eines an der Sonne.

        collectContacts(pos.x, pos.y, voidContactRadius(def.sizePx, pos.scale), contactBuf)
        if (contactBuf.length === 0) continue

        for (const hit of contactBuf) {
          // Ein Verb kann das Wesen erlegen (Cull, Turret-Volley). Danach darf
          // kein weiterer Körper es noch anfassen.
          if (!this.active.some((x) => x.uid === m.uid)) break
          const fired =
            hit.kind === 'champion'
              ? this._contactChampion(m, def, hit, pos.x, pos.y, now)
              : this._contactPlanet(m, def, hit, pos.x, pos.y, now)
          if (fired) m.lastContactAt = now
        }
      }
    },

    /** Verteilt auf das Verb der Rolle. Jedes prüft SEINE Bedingung selbst,
     *  BEVOR es die Paar-Sperre setzt — sonst verbrennt ein gescheiterter
     *  Versuch die Sperre und macht das Wesen für Sekunden unberührbar. */
    _contactChampion(
      m: VoidMonster,
      def: VoidRiftDef,
      hit: ContactHit,
      mx: number,
      my: number,
      now: number,
    ): boolean {
      const role = hit.key as ChampionRole
      switch (role) {
        case 'top':
          return this._contactTop(m, def, hit, mx, my, now)
        case 'jungle':
          return this._contactJungle(m, def, hit, now)
        case 'mid':
          return this._contactMid(m, hit, now)
        case 'adc':
          return this._contactAdc(m, hit, now)
        case 'support':
          return this._contactSupport(m, def, hit, now)
        default:
          return false
      }
    },

    /**
     * top · Aegis Wall — der Block.
     *
     * Die grösste Wiederverwendung des Systems: `triggerIntercept` löscht
     * bereits das Schild, armiert den Wiederaufbau, wirft die Schild-Zahl und
     * lässt den Champion nach vorn ausschlagen. Der Void-Block IST die
     * bestehende Aegis Wall — ausgelöst von einem Körper statt von einem Schuss.
     *
     * Selbstbegrenzend durch genau dieses Schild: EIN Wesen je Wiederaufbau,
     * egal wie viele kommen. Genau das ist „letzte Barriere" und nicht „Mauer,
     * die alles hält".
     */
    _contactTop(
      m: VoidMonster,
      def: VoidRiftDef,
      hit: ContactHit,
      mx: number,
      my: number,
      now: number,
    ): boolean {
      const rb = useRoleBehaviorStore()
      if (!rb.tankShieldActive) return false
      if (!armContact(m.uid, 'top', now, VOID_CONTACT_REARM_MS.top)) return false

      m.blockedUntil = now + VOID_TOP_BLOCK_MS

      // Ausschlagrichtung: der Champion wirft sich dem Wesen ENTGEGEN.
      const dx = mx - hit.cx
      const dy = my - hit.cy
      const len = Math.hypot(dx, dy) || 1
      rb.triggerIntercept(dx / len, dy / len, hit.cx, hit.cy, 'void')

      const dmg = m.maxHp * VOID_TOP_BLOCK_DAMAGE_PCT
      contactFloat(dmg, hit.cx, hit.cy, { voidFloat: true })
      this.damageMonster(m.uid, dmg)

      logVoidBlocked(championNameByRole('top'), VOID_ROLE_ABILITIES.top.name, def.name)
      return true
    },

    /** jungle · Cull — Hinrichtung unter der Schwelle, sonst ein Schlag. */
    _contactJungle(m: VoidMonster, def: VoidRiftDef, hit: ContactHit, now: number): boolean {
      const executes = m.currentHp <= m.maxHp * VOID_JUNGLE_EXECUTE_PCT
      // Die Hinrichtung hat eine eigene Rollen-Uhr; ein blosser Schlag nicht —
      // sonst stünde der Jungler in einem Schwarm die meiste Zeit untätig.
      if (executes && this.jungleCullReadyAt > now) return false
      if (!armContact(m.uid, 'jungle', now, VOID_CONTACT_REARM_MS.jungle)) return false

      if (executes) {
        this.jungleCullReadyAt = now + VOID_JUNGLE_CULL_COOLDOWN_MS
        contactFloat(m.currentHp, hit.cx, hit.cy, { voidFloat: true, crit: true })
        this.slayMonster(m)
        logVoidCulled(championNameByRole('jungle'), VOID_ROLE_ABILITIES.jungle.name, def.name)
        return true
      }

      const dmg = m.maxHp * VOID_JUNGLE_STRIKE_PCT
      contactFloat(dmg, hit.cx, hit.cy, { voidFloat: true })
      this.damageMonster(m.uid, dmg)
      return true
    },

    /** mid · Unravelling — der Fluch: alles trifft härter, der Anflug stockt. */
    _contactMid(m: VoidMonster, hit: ContactHit, now: number): boolean {
      if (!armContact(m.uid, 'mid', now, VOID_CONTACT_REARM_MS.mid)) return false
      m.cursedUntil = now + VOID_MID_CURSE_MS
      m.slowedUntil = Math.max(m.slowedUntil, now + VOID_MID_CURSE_MS)
      contactFloat(0, hit.cx, hit.cy, { curseFloat: true })
      return true
    },

    /** adc · Focus Mark — der Beschuss zielt um, statt dass noch eine Quelle
     *  dazukommt. Die Marke ist der Beitrag, nicht der Schaden. */
    _contactAdc(m: VoidMonster, hit: ContactHit, now: number): boolean {
      if (!armContact(m.uid, 'adc', now, VOID_CONTACT_REARM_MS.adc)) return false
      m.focusedUntil = now + VOID_ADC_FOCUS_MS
      contactFloat(ROLE_ADC_BURST_DAMAGE, hit.cx, hit.cy, { adcFloat: true })
      this.damageMonster(m.uid, ROLE_ADC_BURST_DAMAGE)
      return true
    },

    /** support · Warding Light — legt die Drossel still und heilt. Die einzige
     *  Rolle, die bei Berührung gar keinen Schaden macht. */
    _contactSupport(m: VoidMonster, def: VoidRiftDef, hit: ContactHit, now: number): boolean {
      if (!armContact(m.uid, 'support', now, VOID_CONTACT_REARM_MS.support)) return false

      m.wardedUntil = now + VOID_SUPPORT_WARD_MS
      this.refreshRates()

      const playerStore = usePlayerStore()
      if (playerStore.currentHP < playerStore.maxHP) {
        const healed = Math.min(ROLE_SUPPORT_HEAL_AMOUNT, playerStore.maxHP - playerStore.currentHP)
        playerStore.currentHP += healed
        contactFloat(healed, hit.cx, hit.cy, { healFloat: true })
      }

      logVoidWarded(
        championNameByRole('support'),
        VOID_ROLE_ABILITIES.support.name,
        def.name,
        Math.round(VOID_SUPPORT_WARD_MS / 1000),
      )
      return true
    },

    /**
     * Planeten — zweiseitig, aber nie tödlich.
     *
     * Der Planet schlägt zu und kassiert; sterben kann er daran nicht
     * (`takeVoidChip` hält bei 1 HP). Ein Rider je Planetenrolle, getippt als
     * `Record<PlanetRoleType, …>`, damit eine siebte Rolle ein Compile-Fehler
     * wird statt eines stillen Leerlaufs.
     */
    _contactPlanet(
      m: VoidMonster,
      def: VoidRiftDef,
      hit: ContactHit,
      mx: number,
      my: number,
      now: number,
    ): boolean {
      const shop = usePlanetShopStore()
      const slot = shop.getSlot(hit.key)
      if (!slot || !slot.role) return false
      const rider = VOID_PLANET_RIDER[slot.role]
      if (!armContact(m.uid, 'p:' + hit.key, now, VOID_PLANET_CONTACT_REARM_MS)) return false

      // Die Wand: teilt nichts aus, steckt nichts ein. Die Bau-Antwort des
      // Spielers auf ein Feld voller Wesen.
      if (rider.verb === 'absorb') return true

      if (rider.takesChip) {
        shop.takeVoidChip(slot.id, slot.maxHp * VOID_PLANET_CONTACT_HP_FRAC[def.severity])
      }

      switch (rider.verb) {
        case 'slow':
          m.slowedUntil = Math.max(m.slowedUntil, now + VOID_PLANET_SLOW_MS)
          break
        case 'scavenge':
          useInventoryStore().tryDropMaterial(1, 'void')
          break
        case 'banish':
          // Zurückwerfen als ZEIT, nicht als Strecke — die Bahn kennt nur
          // `spawnedAt`. Auf `now` geklemmt, sonst rutscht der Fortschritt
          // unter 0 und die Bahn läuft aus dem Bild.
          m.spawnedAt = Math.min(now, m.spawnedAt + VOID_PLANET_RELAY_BANISH_MS)
          logVoidBanished(
            PLANET_ROLES[slot.role].name,
            def.name,
            Math.round(VOID_PLANET_RELAY_BANISH_MS / 1000),
          )
          break
      }

      const dmg = m.maxHp * VOID_PLANET_STRIKE_PCT * rider.damageMult
      if (dmg <= 0) return true

      contactFloat(dmg, hit.cx, hit.cy, { voidFloat: true, planetFloat: true })

      // Der Resonator streut: die Nachbarn stehen bereits vermessen im Feld,
      // ein zweiter Positionslauf wäre verschenkt.
      if (rider.verb === 'splash') {
        const rr = VOID_PLANET_SPLASH_RADIUS_PX * VOID_PLANET_SPLASH_RADIUS_PX
        for (let i = 0; i < fieldCount; i++) {
          const other = fieldBuf[i]
          if (other.m.uid === m.uid) continue
          const dx = other.x - mx
          const dy = other.y - my
          if (dx * dx + dy * dy > rr) continue
          this.damageMonster(other.m.uid, dmg * VOID_PLANET_SPLASH_FRAC)
        }
      }

      this.damageMonster(m.uid, dmg)
      return true
    },

    /**
     * Alles, was seinen Weg vollendet hat, schlägt ein.
     *
     * Die Zeit kommt von aussen und wird NICHT nach `voidNow` geschrieben: der
     * Layer ruft das hier in dem Frame auf, in dem ein Wesen die Sonne berührt,
     * und `voidNow` speist die Drossel-Getter — es jeden Frame anzufassen
     * würde deren Verbraucher sechzigmal je Sekunde wecken. Schlägt wirklich
     * etwas ein, stellt `impactMonster` die Uhr selbst.
     */
    resolveArrivals(now: number = gameNow()): void {
      if (this.active.length === 0) return
      const arrived = this.active.filter((m) => now >= m.spawnedAt + m.travelMs)
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
      const now = gameNow()
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
        blockedUntil: 0,
        slowedUntil: 0,
        cursedUntil: 0,
        focusedUntil: 0,
        wardedUntil: 0,
        lastContactAt: 0,
      }
      this.active.push(monster)
      this.totalRiftsOpened++
      this.voidNow = now
      logger.info('Void', `${def.name} tore in`, { uid: monster.uid, maxHp })
      return monster
    },

    /**
     * Wesen erlegt: Beute auszahlen und die Bilanz melden.
     *
     * Der Vorher-Nachher-Vergleich ist Pflicht, seit der Auflöser aus zwei
     * Takten gerufen wird: eine Paar-Sperre begrenzt die RATE, sie macht einen
     * Effekt nicht doppelt anwendbar. Ohne die Prüfung zahlte ein zweiter Ruf
     * auf ein längst entferntes Wesen die Beute ein zweites Mal.
     */
    slayMonster(monster: VoidMonster): void {
      const def = getVoidRift(monster.defId)
      const before = this.active.length
      this.active = this.active.filter((m) => m.uid !== monster.uid)
      if (this.active.length === before) return
      this.totalRiftsSealed++
      if (!def) return

      this._applyBoon(def)
      this._recordOutcome(monster, def, true, 0, 0)
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
     *
     * Bezahlt wird in ZWEI Währungen. Sonnen-HP allein war kein Einsatz — sie
     * regenerieren von selbst, und 0 HP hat im Spiel keine Folge. Der Meep-Zoll
     * trifft dagegen das, worauf der ganze Lauf hinarbeitet.
     */
    impactMonster(monster: VoidMonster): void {
      const def = getVoidRift(monster.defId)
      const before = this.active.length
      this.active = this.active.filter((m) => m.uid !== monster.uid)
      if (this.active.length === before) return
      this.totalRiftsCollapsed++
      if (!def) return

      const hpLost = usePlayerStore().takeDamage(VOID_IMPACT_HP_LOSS[def.severity])
      this.totalVoidHpLost += hpLost

      // Nur was der Lauf schon gesammelt hat — `devourMeeps` klemmt auf
      // `pendingMeeps` und gibt 0 zurück, wenn nichts anstand.
      const meepsLost = useGameStore().devourMeeps(
        VOID_IMPACT_MEEP_LOSS_PCT[def.severity],
        VOID_IMPACT_MEEP_LOSS_MIN[def.severity],
      )

      const durationMs = VOID_IMPACT_AFTERMATH_MS[def.severity]
      this.aftermaths = this.aftermaths.filter((a) => a.sourceId !== def.id)
      this.aftermaths.push({
        sourceId: def.id,
        expiresAt: gameNow() + durationMs,
        durationMs,
        effects: { ...def.aftermath },
      })
      this.voidNow = gameNow()
      this.refreshRates()

      this._recordOutcome(monster, def, false, hpLost, meepsLost)
      logger.warn('Void', `${def.name} reached the sun`, {
        hpLost,
        meepsLost,
        severity: def.severity,
      })
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
        gameStore.chimesForNextUniverse += gain
        gameStore.totalChimesEarned += gain
        gameStore.chimesEarnedForLevel += gain
        gameStore.calculateLevel()
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
        expiresAt: gameNow() + def.boon.durationMs,
        durationMs: def.boon.durationMs,
        effects: { ...def.boon.effects },
      })
      this.voidNow = gameNow()
      this.refreshRates()
    },

    /** Ausgang festhalten, damit der Layer seinen Effekt an der richtigen
     *  Stelle spielt — auch bei einem erzwungenen Einschlag. */
    _recordOutcome(
      monster: VoidMonster,
      def: VoidRiftDef,
      sealed: boolean,
      hpLost: number,
      meepsLost: number,
    ): void {
      const sunRadius = usePlanetShopStore().orbitSunRadius
      const pos = voidPositionAt(monster, def.sizePx, sunRadius, gameNow())
      this.lastOutcome = {
        seq: this.lastOutcome.seq + 1,
        at: gameNow(),
        defId: def.id,
        sealed,
        x: pos.x,
        y: pos.y,
        hpLost,
        meepsLost,
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
      this.jungleCullReadyAt = 0
      // Die Sperrzeiten hängen an Uids, die es nicht mehr gibt — sie wären
      // sonst tote Einträge bis zum nächsten Sekundentakt.
      pruneContactCooldowns(new Set())
      this.refreshRates()
    },
  },
})
