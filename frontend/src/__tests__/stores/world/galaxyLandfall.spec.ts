import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { resetGameClock, gameNow } from '@/utils/game/gameClock'
import { landfallOnLeg, landfallWindowMs, landfallsOfRun } from '@/utils/game/landfalls'
import { getLandfall, LANDFALLS } from '@/config/world/landfalls'
import { LANDFALL_BOONS } from '@/config/world/landfallBoons'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useLandfallStore } from '@/stores/world/landfallStore'
import { useVoidStore } from '@/stores/world/voidStore'
import type { LandfallKindId, LandfallPlan } from '@/types'
import {
  LANDFALL_REEF_BASE_SECONDS,
  LANDFALL_REEF_CLICK_SECONDS,
  LANDFALL_REEF_MAX_CLICKS,
  LANDFALL_REEF_CPS_FLOOR_CLICKS,
  LANDFALL_GLOAMING_BASE_SECONDS,
  LANDFALL_OSSUARY_TAP_SECONDS,
  LANDFALL_CONVOY_TAP_GOAL,
  LANDFALL_CAIRN_OFFERS,
  LANDFALL_CAIRN_BOON_MULT,
  LANDFALL_RUPTURE_TAP_GOAL,
  LANDFALL_RUPTURE_BURST,
  LANDFALL_RUPTURE_BURST_DEF,
  VOID_UNLOCK_LEVEL,
} from '@/config/constants'

/**
 * Ein Landfall hat KEINE eigene Uhr — der Etappen-Tick entscheidet, wann er
 * fällig wird und wann sein Fenster durch ist. Diese Datei hält die Übergänge
 * fest, weil sie im laufenden Spiel nur schwer zu sehen sind.
 *
 * Die Galaxie ist überall 30: dort steht die Ortsdichte auf 1, jede Etappe trägt
 * also sicher einen. Gegen eine Galaxie mit Chance < 1 zu testen hiesse, die
 * Ziehung nachzubauen.
 */
describe('galaxyStore — Landfalls', () => {
  const GALAXY = 30
  const SEED = 4242

  const T0 = 1_000_000

  const PLANNED_LEGS = 8

  /**
   * Die erste Etappe, auf der GENAU dieser Ort gezogen wird.
   *
   * Ohne das hinge jeder Test daran, was der Katalog beim Seed 4242 auf Etappe 0
   * gerade auswirft — und jeder neue Ort verschöbe ihn. Genau das ist beim
   * zweiten und dritten Eintrag passiert.
   */
  function legDrawing(kind: LandfallKindId): LandfallPlan {
    for (let leg = 0; leg < 200; leg++) {
      const p = landfallOnLeg(SEED, GALAXY, leg, PLANNED_LEGS)
      if (p?.kind === kind) return p
    }
    throw new Error(`keine Etappe zieht ${kind}`)
  }

  /** Versetzt den Store in eine laufende Reise auf der Etappe, die `kind` zieht.
   *
   *  `championTravelStartTime` wird EXPLIZIT gesetzt: bei 0 verbraucht
   *  `tickChampionTravel` seinen ersten Aufruf damit, den Start zu stempeln, und
   *  jeder gerechnete Anteil wäre um diesen Tick verschoben. */
  function starteReise(kind: LandfallKindId = 'chime_reef') {
    const plan = legDrawing(kind)
    const store = useGalaxyStore()
    store.currentGalaxy = GALAXY
    store.starsRequired = 7
    store.mapSeed = SEED
    // Die Etappennummer ergibt sich aus der Zahl der Versuche — so steht das
    // Schiff auf genau der Etappe, die diesen Ort trägt.
    store.attemptResults = Array.from({ length: plan.leg }, () => 'rescued')
    store.landfallResults = []
    store.activeLandfall = null
    store._landfallLegDone = -1
    store.championTravelState = 'traveling'
    store.championTravelDurationMs = 100_000
    store.championTravelBaseDurationMs = 100_000
    store.championTravelStartTime = gameNow()
    return store
  }

  /** Der Plan der Etappe, auf der der Store gerade steht. */
  function planFor(store: ReturnType<typeof useGalaxyStore>): LandfallPlan {
    const p = landfallOnLeg(SEED, GALAXY, store.currentLegIndex, PLANNED_LEGS)
    if (!p) throw new Error('diese Etappe trägt keinen Ort')
    return p
  }

  /** Treibt den Etappen-Tick auf einen Anteil der Reise. */
  function tickeAuf(store: ReturnType<typeof useGalaxyStore>, anteil: number) {
    vi.setSystemTime(new Date(T0 + store.effectiveTravelDurationMs * anteil))
    store.tickChampionTravel()
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    resetGameClock()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(T0))
  })

  afterEach(() => {
    vi.useRealTimers()
    resetGameClock()
  })

  it('öffnet den Ort, wenn das Schiff seine Stelle passiert — nicht davor', () => {
    const store = starteReise()
    const plan = planFor(store)
    expect(plan).not.toBeNull()

    // Kurz davor: nichts.
    tickeAuf(store, Math.max(0, plan.t - 0.05))
    expect(store.activeLandfall).toBeNull()

    // Kurz danach: offen, und zwar genau dieser.
    tickeAuf(store, plan.t + 0.01)
    expect(store.activeLandfall?.kind).toBe(plan.kind)
    expect(store.activeLandfall?.taps).toBe(0)
  })

  it('zahlt einen Sockel, auch wenn niemand hinsieht', () => {
    // Der Unterschied zum Drifter: der verfällt ungeklickt. Ein ORT wird
    // durchflogen, ob man will oder nicht.
    const store = starteReise()
    const gameStore = useGameStore()
    gameStore.chimes = 0
    const plan = planFor(store)

    tickeAuf(store, plan.t + 0.01)
    const jeSekunde = Math.max(
      gameStore.chimesPerSecond,
      gameStore.chimesPerClick * LANDFALL_REEF_CPS_FLOOR_CLICKS,
    )
    expect(store.landfallYield).toBeCloseTo(jeSekunde * LANDFALL_REEF_BASE_SECONDS, 6)
  })

  it('zahlt auch bei CpS null — der erste Ort darf kein Nichts sein', () => {
    // Ein frischer Spielstand in Galaxie 2 hat CpS nahe null. Ohne Boden zahlte
    // ausgerechnet der ERSTE Ort, den ein Spieler je sieht, gar nichts.
    const store = starteReise()
    const gameStore = useGameStore()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    expect(gameStore.chimesPerSecond).toBe(0)
    expect(store.landfallYield).toBeGreaterThan(0)

    // Und jeder Griff trägt, statt unter dem Boden zu verschwinden.
    const vorher = store.landfallYield
    store.tapLandfall()
    expect(store.landfallYield).toBeGreaterThan(vorher)
  })

  it('jeder Griff legt zu — bis zum Deckel', () => {
    const store = starteReise()
    const gameStore = useGameStore()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    const jeSekunde = Math.max(
      gameStore.chimesPerSecond,
      gameStore.chimesPerClick * LANDFALL_REEF_CPS_FLOOR_CLICKS,
    )
    const sockel = store.landfallYield
    expect(store.tapLandfall()).toBe(true)
    expect(store.landfallYield).toBeCloseTo(sockel + jeSekunde * LANDFALL_REEF_CLICK_SECONDS, 6)

    // Ohne Deckel wäre der Ort ein Autoklicker-Fenster.
    for (let i = 1; i < LANDFALL_REEF_MAX_CLICKS; i++) expect(store.tapLandfall()).toBe(true)
    expect(store.tapLandfall()).toBe(false)
    expect(store.activeLandfall?.taps).toBe(LANDFALL_REEF_MAX_CLICKS)
  })

  it('schliesst nach dem Fenster und schreibt genau EINEN Eintrag', () => {
    const store = starteReise()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)
    expect(store.activeLandfall).not.toBeNull()

    const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
    const nachFenster = plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs
    tickeAuf(store, nachFenster)

    expect(store.activeLandfall).toBeNull()
    expect(store.landfallResults).toHaveLength(1)
    expect(store.landfallResults[0].kind).toBe(plan.kind)
    expect(store.landfallResults[0].cleared).toBe(false)

    // Und er geht auf DERSELBEN Etappe nicht wieder auf.
    tickeAuf(store, nachFenster + 0.02)
    expect(store.activeLandfall).toBeNull()
    expect(store.landfallResults).toHaveLength(1)
  })

  it('angefasst heisst cleared', () => {
    const store = starteReise()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)
    store.tapLandfall()

    const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
    tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)
    expect(store.landfallResults[0].cleared).toBe(true)
  })

  it('die Ankunft rechnet den offenen Ort ab — der Stern gewinnt', () => {
    const store = starteReise()
    const gameStore = useGameStore()
    gameStore.chimes = 0
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)
    expect(store.activeLandfall).not.toBeNull()

    tickeAuf(store, 1.01)
    expect(store.activeLandfall).toBeNull()
    expect(store.landfallResults).toHaveLength(1)
    expect(store.championTravelState).toBe('champion_available')
    expect(gameStore.chimes).toBeGreaterThan(0)
  })

  it('der Ertrag landet in ALLEN Chime-Zählern, nicht nur im Guthaben', () => {
    // Ein Zugang, der `chimesForNextUniverse` auslässt, verschiebt still den
    // Prestige-Anker.
    const store = starteReise()
    const gameStore = useGameStore()
    gameStore.chimes = 0
    gameStore.chimesForNextUniverse = 0
    gameStore.totalChimesEarned = 0
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)
    store.resolveLandfall(true)

    expect(gameStore.chimes).toBeGreaterThan(0)
    expect(gameStore.chimesForNextUniverse).toBe(gameStore.chimes)
    expect(gameStore.totalChimesEarned).toBe(gameStore.chimes)
  })

  it('der Warp räumt Chronik und offenen Ort ab', () => {
    const store = starteReise()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)
    store.landfallResults.push({ kind: 'chime_reef', cleared: true })

    store.commitAdvance()
    expect(store.landfallResults).toEqual([])
    expect(store.activeLandfall).toBeNull()
    expect(store._landfallLegDone).toBe(-1)
  })

  /* ── The Gloaming: der EINE Ort ohne Geste ────────────────────────────── */

  it('das Gloaming zahlt beim Vorbeifliegen und gilt immer als geschafft', () => {
    const store = starteReise('the_gloaming')
    const gameStore = useGameStore()
    gameStore.chimes = 0
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    // Es nimmt keinen Griff an — die Karte ist dort kein Knopf.
    expect(store.tapLandfall()).toBe(false)
    expect(store.landfallYield).toBeCloseTo(
      Math.max(gameStore.chimesPerSecond, gameStore.chimesPerClick * LANDFALL_REEF_CPS_FLOOR_CLICKS) *
        LANDFALL_GLOAMING_BASE_SECONDS,
      6,
    )

    const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
    tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)

    expect(gameStore.chimes).toBeGreaterThan(0)
    // Ihn als versäumt zu buchen hiesse, dem Spieler etwas vorzuwerfen, wofür es
    // keine Geste gibt.
    expect(store.landfallResults[0]).toEqual({ kind: 'the_gloaming', cleared: true })
  })

  /* ── Sunken Ossuary: EIN Griff, sonst nichts ──────────────────────────── */

  it('das Ossuar schliesst sich mit dem einen Griff sofort', () => {
    const store = starteReise('sunken_ossuary')
    const gameStore = useGameStore()
    gameStore.chimes = 0
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)
    expect(store.activeLandfall).not.toBeNull()

    expect(store.tapLandfall()).toBe(true)
    // Ein Ort, der nach der Entscheidung noch sekundenlang dastünde und nichts
    // täte, wäre kein „ein Griff genügt".
    expect(store.activeLandfall).toBeNull()
    expect(store.landfallResults[0]).toEqual({ kind: 'sunken_ossuary', cleared: true })
    expect(gameStore.chimes).toBeGreaterThan(0)
  })

  it('ein ungeöffnetes Ossuar gibt NICHTS her', () => {
    // Die Gegenprobe zum Riff, dessen Sockel auch dem zufällt, der wegsieht.
    // Dürften die Orte sich darin nicht unterscheiden, wäre die Geste Zierrat.
    const store = starteReise('sunken_ossuary')
    const gameStore = useGameStore()
    gameStore.chimes = 0
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
    tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)

    expect(gameStore.chimes).toBe(0)
    expect(store.landfallResults[0]).toEqual({ kind: 'sunken_ossuary', cleared: false })
  })

  it('die Karte zeigt am Ossuar das VERSPRECHEN, nicht die Null', () => {
    // Stünde vor dem Griff eine 0, wüsste niemand, wofür der Griff gut wäre.
    const store = starteReise('sunken_ossuary')
    const gameStore = useGameStore()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    expect(store.activeLandfall?.taps).toBe(0)
    expect(store.landfallYield).toBeCloseTo(
      Math.max(gameStore.chimesPerSecond, gameStore.chimesPerClick * LANDFALL_REEF_CPS_FLOOR_CLICKS) *
        LANDFALL_OSSUARY_TAP_SECONDS,
      6,
    )
  })

  /* ── Adrift Convoy: Schwelle statt Verlauf ───────────────────────────── */

  it('der Konvoi zahlt erst, wenn die Leiste VOLL ist', () => {
    const store = starteReise('adrift_convoy')
    const inventory = useInventoryStore()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    // Einen Griff unter dem Ziel: nichts.
    for (let i = 0; i < LANDFALL_CONVOY_TAP_GOAL - 1; i++) expect(store.tapLandfall()).toBe(true)
    const vorher = inventory.totalMaterialsCollected
    const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
    tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)

    expect(store.landfallResults[0]).toEqual({ kind: 'adrift_convoy', cleared: false })
    expect(inventory.totalMaterialsCollected).toBe(vorher)
  })

  it('der volle Konvoi wirft Material ab', () => {
    const store = starteReise('adrift_convoy')
    const gameStore = useGameStore()
    gameStore.chimes = 0
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    for (let i = 0; i < LANDFALL_CONVOY_TAP_GOAL; i++) expect(store.tapLandfall()).toBe(true)
    // Über dem Ziel zählt kein Griff mehr — sonst wäre er ein Autoklicker-Fenster.
    expect(store.tapLandfall()).toBe(false)

    const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
    tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)

    expect(store.landfallResults[0]).toEqual({ kind: 'adrift_convoy', cleared: true })
    // Er zahlt MATERIAL, keine Chimes — der Unterschied zum Riff ist die Ware,
    // nicht nur die Kurve.
    expect(gameStore.chimes).toBe(0)
  })

  it('kein Ort zahlt Meeps — die bleiben dem Prestige und dem Lost Meep', () => {
    // `lostMeep` ist im Drifter-Katalog ausdrücklich als EINZIGER Weg an einen
    // Meep ausserhalb des Prestige begründet, und `meepEconomy.spec.ts` rechnet
    // den ganzen Meep-Baum gegen genau diesen Zufluss.
    const gameStore = useGameStore()
    const vorher = gameStore.totalMeepsEarned
    for (const kind of ['chime_reef', 'the_gloaming', 'sunken_ossuary', 'adrift_convoy'] as const) {
      const store = starteReise(kind)
      const plan = planFor(store)
      tickeAuf(store, plan.t + 0.01)
      for (let i = 0; i < 10; i++) store.tapLandfall()
      const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
      tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)
    }
    expect(gameStore.totalMeepsEarned).toBe(vorher)
  })

  /* ── Wayside Cairn: die Wahl, die eine Galaxie lang trägt ────────────── */

  it('bietet drei verschiedene Segen an, immer dieselben drei', () => {
    const store = starteReise('wayside_cairn')
    const landfall = useLandfallStore()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    const angebot = landfall.offerFor(store.activeLandfall)
    expect(angebot).toHaveLength(LANDFALL_CAIRN_OFFERS)
    // Ohne Zurücklegen — derselbe Segen zweimal am Stein wäre keine Wahl.
    expect(new Set(angebot).size).toBe(angebot.length)
    // Abgeleitet, nicht gewürfelt: zweimal fragen gibt zweimal dasselbe.
    expect(landfall.offerFor(store.activeLandfall)).toEqual(angebot)
  })

  it('die Wahl schliesst den Stein und setzt den Segen', () => {
    const store = starteReise('wayside_cairn')
    const landfall = useLandfallStore()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    const [erster] = landfall.offerFor(store.activeLandfall)
    expect(landfall.takeBoon(erster)).toBe(true)

    expect(landfall.boon).toBe(erster)
    expect(landfall.boonGalaxy).toBe(GALAXY)
    // Ein Stein, an dem die Wahl getroffen ist, hat nichts mehr zu bieten.
    expect(store.activeLandfall).toBeNull()
    expect(store.landfallResults[0]).toEqual({ kind: 'wayside_cairn', cleared: true })
  })

  it('nimmt nur an, was auch angeboten wurde', () => {
    const store = starteReise('wayside_cairn')
    const landfall = useLandfallStore()
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    const angebot = landfall.offerFor(store.activeLandfall)
    const nichtImAngebot = LANDFALL_BOONS.map((b) => b.id).find((id) => !angebot.includes(id))
    if (nichtImAngebot) expect(landfall.takeBoon(nichtImAngebot)).toBe(false)
    expect(landfall.boon).toBeNull()
  })

  it('der Segen zieht an GENAU einer Achse', () => {
    const landfall = useLandfallStore()
    for (const def of LANDFALL_BOONS) {
      landfall.boon = def.id
      const achsen = {
        cpsMult: landfall.cpsMult,
        cpcMult: landfall.cpcMult,
        combatDpsMult: landfall.combatDpsMult,
        xpMult: landfall.xpMult,
      }
      expect(achsen[def.axis]).toBe(LANDFALL_CAIRN_BOON_MULT)
      const uebrige = Object.entries(achsen).filter(([k]) => k !== def.axis)
      for (const [, v] of uebrige) expect(v).toBe(1)
    }
  })

  it('ein zweiter Stein ERSETZT den Segen, er stapelt nicht', () => {
    // Acht Cairns je Galaxie, die sich stapeln, wären genau die geschlossene
    // Rückkopplung, gegen die AUGMENT_ACTIVE_CAP und der Overclock-Filter stehen.
    const landfall = useLandfallStore()
    landfall.boon = 'keptChimes'
    landfall.boonGalaxy = GALAXY
    expect(landfall.cpsMult).toBe(LANDFALL_CAIRN_BOON_MULT)
    landfall.boon = 'longSight'
    expect(landfall.cpsMult).toBe(1)
    expect(landfall.xpMult).toBe(LANDFALL_CAIRN_BOON_MULT)
  })

  it('der Warp räumt den Segen ab — er galt für DIESE Galaxie', () => {
    const store = starteReise('wayside_cairn')
    const landfall = useLandfallStore()
    landfall.boon = 'keptChimes'
    landfall.boonGalaxy = GALAXY

    store.commitAdvance()
    expect(landfall.boon).toBeNull()
    expect(landfall.cpsMult).toBe(1)
  })

  /* ── The Rupture: der einzige Ort, der etwas kostet ──────────────────── */

  /** Der Void spawnt erst ab VOID_UNLOCK_LEVEL — sonst verfällt die Rupture
   *  folgenlos, und der Test prüfte nichts. */
  function mitOffenemVoid() {
    const gameStore = useGameStore()
    gameStore.level = VOID_UNLOCK_LEVEL
    return useVoidStore()
  }

  it('die versäumte Rupture lässt genau BURST Wesen los — und zwar lesser', () => {
    const voidStore = mitOffenemVoid()
    voidStore.active = []
    const store = starteReise('the_rupture')
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
    tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)

    expect(store.landfallResults[0]).toEqual({ kind: 'the_rupture', cleared: false })
    expect(voidStore.active).toHaveLength(LANDFALL_RUPTURE_BURST)
    // Ohne ausdrückliche ID zöge `spawnMonster()` SEVERITIES[0] — und die Liste
    // ist absteigend sortiert, das wäre abyssal.
    for (const m of voidStore.active) expect(m.defId).toBe(LANDFALL_RUPTURE_BURST_DEF)
  })

  it('die versiegelte Rupture lässt NICHTS los und zahlt', () => {
    const voidStore = mitOffenemVoid()
    voidStore.active = []
    const store = starteReise('the_rupture')
    const gameStore = useGameStore()
    gameStore.chimes = 0
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    for (let i = 0; i < LANDFALL_RUPTURE_TAP_GOAL; i++) expect(store.tapLandfall()).toBe(true)
    const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
    tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)

    expect(store.landfallResults[0]).toEqual({ kind: 'the_rupture', cleared: true })
    expect(voidStore.active).toHaveLength(0)
    expect(gameStore.chimes).toBeGreaterThan(0)
  })

  it('unter dem Void-Unlock verfällt sie folgenlos', () => {
    // Der Kind-Wurf darf NICHT am Level hängen — `landfallsOfRun` wird für jede
    // archivierte Galaxie nachgespielt, und ein Prestige setzt das Level auf 1.
    // Der Riegel steht deshalb beim Ausbruch, nicht bei der Ziehung.
    const gameStore = useGameStore()
    gameStore.level = 1
    const voidStore = useVoidStore()
    voidStore.active = []
    const store = starteReise('the_rupture')
    const plan = planFor(store)
    tickeAuf(store, plan.t + 0.01)

    // Gezogen wird sie trotzdem — die Chronik bleibt stabil.
    expect(store.activeLandfall?.kind).toBe('the_rupture')

    const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
    tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)
    expect(voidStore.active).toHaveLength(0)
  })

  it('nur die Rupture kostet etwas — kein anderer Ort ruft den Void', () => {
    const voidStore = mitOffenemVoid()
    for (const def of LANDFALLS.filter((d) => d.id !== 'the_rupture')) {
      voidStore.active = []
      const store = starteReise(def.id)
      const plan = planFor(store)
      tickeAuf(store, plan.t + 0.01)
      const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
      tickeAuf(store, plan.t + 0.01 + (fenster + 1000) / store.effectiveTravelDurationMs)
      expect(voidStore.active, `${def.id} hat Wesen losgelassen`).toHaveLength(0)
    }
  })

  /* ── Admin: die Knöpfe des Landfall-Panels ───────────────────────────── */

  describe('forceLandfall', () => {
    it('verweigert ausserhalb einer Reise — und sagt es', () => {
      // `_tickLandfall` läuft ausschliesslich aus `tickChampionTravel`. Ein Ort
      // ausserhalb hätte kein Fenster, das abläuft, und einen Balken, der
      // stillsteht — ein Zustand, den es im echten Spiel nicht gibt.
      const store = starteReise()
      store.championTravelState = 'idle'
      expect(store.forceLandfall('chime_reef')).toBe(false)
      expect(store.activeLandfall).toBeNull()
    })

    it('verweigert, solange einer offen steht', () => {
      const store = starteReise()
      expect(store.forceLandfall('chime_reef')).toBe(true)
      expect(store.forceLandfall('the_rupture')).toBe(false)
      expect(store.activeLandfall?.kind).toBe('chime_reef')
    })

    it('öffnet JEDE Art — auch eine, die hier noch gar nicht freigeschaltet wäre', () => {
      // Der Sinn des Knopfes. Eine Rupture (ab Galaxie 6) in Galaxie 2 zu
      // verweigern hiesse, genau das nicht prüfen zu können, wofür er da ist.
      const store = starteReise()
      store.currentGalaxy = 2
      for (const def of LANDFALLS) {
        store.activeLandfall = null
        expect(store.forceLandfall(def.id), def.id).toBe(true)
        expect(store.activeLandfall?.kind).toBe(def.id)
      }
    })

    it('ohne Vorgabe kommt irgendeiner aus dem Katalog', () => {
      const store = starteReise()
      const ids = new Set(LANDFALLS.map((d) => d.id))
      for (let i = 0; i < 40; i++) {
        store.activeLandfall = null
        expect(store.forceLandfall()).toBe(true)
        expect(ids.has(store.activeLandfall!.kind)).toBe(true)
      }
    })

    it('der erzwungene Ort verhält sich wie ein echter', () => {
      // Ein Spawn, der sich anders verhielte als das Echte, prüfte das Echte
      // nicht: Fenster läuft ab, er zahlt, er landet in der Chronik, er zählt.
      const store = starteReise()
      const gameStore = useGameStore()
      gameStore.chimes = 0
      const vorher = store.totalLandfallsCleared

      expect(store.forceLandfall('chime_reef')).toBe(true)
      store.tapLandfall()

      const fenster = landfallWindowMs(store.effectiveTravelDurationMs)
      const auf = (store.activeLandfall!.openedAt - store.championTravelStartTime) /
        store.effectiveTravelDurationMs
      tickeAuf(store, auf + (fenster + 1000) / store.effectiveTravelDurationMs)

      expect(store.activeLandfall).toBeNull()
      expect(store.landfallResults.at(-1)).toEqual({ kind: 'chime_reef', cleared: true })
      expect(store.totalLandfallsCleared).toBe(vorher + 1)
      expect(gameStore.chimes).toBeGreaterThan(0)
    })
  })

  describe('adminFillLandfallChronicle', () => {
    it('erzeugt genau so viele Einträge, wie der Seed Orte zieht', () => {
      // `landfallMarks` paart Chronik und Pläne eins zu eins. Eine Chronik mit
      // mehr Einträgen als Plänen zeichnete weniger Marken, als sie behauptet.
      const store = starteReise()
      store.attemptResults = Array.from({ length: 6 }, () => 'rescued')
      const n = store.adminFillLandfallChronicle()

      const plaene = landfallsOfRun(store.mapSeed, store.currentGalaxy, store.plannedLegCount, 7)
      expect(n).toBe(plaene.length)
      expect(store.landfallResults).toHaveLength(plaene.length)
      store.landfallResults.forEach((r, i) => expect(r.kind).toBe(plaene[i].kind))
    })

    it('das Leeren führt auf eine saubere Karte zurück', () => {
      const store = starteReise()
      store.adminFillLandfallChronicle()
      store.forceLandfall('the_gloaming')
      store.adminClearLandfallChronicle()
      expect(store.landfallResults).toEqual([])
      expect(store.activeLandfall).toBeNull()
      expect(store._landfallLegDone).toBe(-1)
    })
  })

  describe('adminSetBoon', () => {
    it('bewegt genau eine Achse, und null räumt sie ab', () => {
      const landfall = useLandfallStore()
      for (const def of LANDFALL_BOONS) {
        landfall.adminSetBoon(def.id)
        const achsen = {
          cpsMult: landfall.cpsMult,
          cpcMult: landfall.cpcMult,
          combatDpsMult: landfall.combatDpsMult,
          xpMult: landfall.xpMult,
        }
        expect(achsen[def.axis]).toBe(LANDFALL_CAIRN_BOON_MULT)
        for (const [k, v] of Object.entries(achsen)) {
          if (k !== def.axis) expect(v).toBe(1)
        }
      }
      landfall.adminSetBoon(null)
      expect(landfall.boon).toBeNull()
      expect(landfall.boonGalaxy).toBe(0)
      expect(landfall.cpsMult).toBe(1)
    })
  })

  it('jeder Ort im Katalog ist über irgendeine Etappe erreichbar', () => {
    // Ein Ort, den die Ziehung nie ausgibt, ist ein toter Datensatz.
    for (const def of LANDFALLS) {
      expect(getLandfall(def.id)).toBeDefined()
      expect(() => legDrawing(def.id)).not.toThrow()
    }
  })

  it('Galaxie 1 trägt keinen — der erste Lauf bleibt sauber', () => {
    const store = starteReise()
    store.currentGalaxy = 1
    store.starsRequired = 3
    store.attemptResults = []
    store._landfallLegDone = -1
    for (const anteil of [0.2, 0.5, 0.8, 0.99]) tickeAuf(store, anteil)
    expect(store.activeLandfall).toBeNull()
    expect(store.landfallResults).toEqual([])
  })
})
