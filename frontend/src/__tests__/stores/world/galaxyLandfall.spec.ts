import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { resetGameClock, gameNow } from '@/utils/game/gameClock'
import { landfallOnLeg, landfallWindowMs } from '@/utils/game/landfalls'
import {
  LANDFALL_REEF_BASE_SECONDS,
  LANDFALL_REEF_CLICK_SECONDS,
  LANDFALL_REEF_MAX_CLICKS,
  LANDFALL_REEF_CPS_FLOOR_CLICKS,
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

  /** Versetzt den Store in eine laufende Reise auf Etappe 0.
   *
   *  `championTravelStartTime` wird EXPLIZIT gesetzt: bei 0 verbraucht
   *  `tickChampionTravel` seinen ersten Aufruf damit, den Start zu stempeln, und
   *  jeder gerechnete Anteil wäre um diesen Tick verschoben. */
  function starteReise() {
    const store = useGalaxyStore()
    store.currentGalaxy = GALAXY
    store.starsRequired = 7
    store.mapSeed = SEED
    store.attemptResults = []
    store.landfallResults = []
    store.activeLandfall = null
    store._landfallLegDone = -1
    store.championTravelState = 'traveling'
    store.championTravelDurationMs = 100_000
    store.championTravelBaseDurationMs = 100_000
    store.championTravelStartTime = gameNow()
    return store
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
    const plan = landfallOnLeg(SEED, GALAXY, 0, store.plannedLegCount)
    expect(plan).not.toBeNull()

    // Kurz davor: nichts.
    tickeAuf(store, Math.max(0, plan!.t - 0.05))
    expect(store.activeLandfall).toBeNull()

    // Kurz danach: offen, und zwar genau dieser.
    tickeAuf(store, plan!.t + 0.01)
    expect(store.activeLandfall?.kind).toBe(plan!.kind)
    expect(store.activeLandfall?.taps).toBe(0)
  })

  it('zahlt einen Sockel, auch wenn niemand hinsieht', () => {
    // Der Unterschied zum Drifter: der verfällt ungeklickt. Ein ORT wird
    // durchflogen, ob man will oder nicht.
    const store = starteReise()
    const gameStore = useGameStore()
    gameStore.chimes = 0
    const plan = landfallOnLeg(SEED, GALAXY, 0, store.plannedLegCount)!

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
    const plan = landfallOnLeg(SEED, GALAXY, 0, store.plannedLegCount)!
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
    const plan = landfallOnLeg(SEED, GALAXY, 0, store.plannedLegCount)!
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
    const plan = landfallOnLeg(SEED, GALAXY, 0, store.plannedLegCount)!
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
    const plan = landfallOnLeg(SEED, GALAXY, 0, store.plannedLegCount)!
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
    const plan = landfallOnLeg(SEED, GALAXY, 0, store.plannedLegCount)!
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
    const plan = landfallOnLeg(SEED, GALAXY, 0, store.plannedLegCount)!
    tickeAuf(store, plan.t + 0.01)
    store.resolveLandfall(true)

    expect(gameStore.chimes).toBeGreaterThan(0)
    expect(gameStore.chimesForNextUniverse).toBe(gameStore.chimes)
    expect(gameStore.totalChimesEarned).toBe(gameStore.chimes)
  })

  it('der Warp räumt Chronik und offenen Ort ab', () => {
    const store = starteReise()
    const plan = landfallOnLeg(SEED, GALAXY, 0, store.plannedLegCount)!
    tickeAuf(store, plan.t + 0.01)
    store.landfallResults.push({ kind: 'chime_reef', cleared: true })

    store.commitAdvance()
    expect(store.landfallResults).toEqual([])
    expect(store.activeLandfall).toBeNull()
    expect(store._landfallLegDone).toBe(-1)
  })

  it('Galaxie 1 trägt keinen — der erste Lauf bleibt sauber', () => {
    const store = starteReise()
    store.currentGalaxy = 1
    store.starsRequired = 3
    for (const anteil of [0.2, 0.5, 0.8, 0.99]) tickeAuf(store, anteil)
    expect(store.activeLandfall).toBeNull()
    expect(store.landfallResults).toEqual([])
  })
})
