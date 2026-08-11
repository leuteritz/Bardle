/**
 * Fortschritts-Telemetrie für Balancing-Läufe.
 *
 * Sie beantwortet die eine Frage, die man ohne Messung nur raten kann: WANN
 * passiert im Spiel was? Nach welcher Spielzeit steht Level 10, der erste
 * Champion, die zweite Galaxie, das erste Prestige — und wie sieht die
 * CpS-Kurve dazwischen aus.
 *
 * **Zwei Entscheidungen tragen das Ding:**
 *
 * 1. *Die x-Achse ist `inGameTime`, nicht die Wanduhr.* Damit ist eine Messung
 *    bei 50× Zeitraffer mit einer bei 1× direkt vergleichbar — und genau dafür
 *    existiert der Zeitraffer.
 * 2. *Meilensteine werden aus dem Zustand ABGELEITET, nicht gemeldet.* Der erste
 *    Champion ist der Takt, in dem `ownedChampions.length` von 0 auf 1 springt;
 *    kein Store muss dafür etwas rufen. Eine gemeldete Telemetrie driftet vom
 *    Spiel ab, sobald jemand einen Pfad hinzufügt und den Ruf vergisst — eine
 *    abgeleitete kann das nicht.
 *
 * Standardmäßig AUS. Der Haken sitzt an genau einer Stelle, am Ende von
 * `gameStore.tick()`.
 */

import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'

export interface TelemetryRow {
  /** Spielsekunden seit Spielbeginn — die x-Achse jeder Auswertung. */
  t: number
  level: number
  cps: number
  cpc: number
  chimes: number
  totalChimes: number
  meeps: number
  power: number
  universe: number
  galaxy: number
  starPhase: number
  /** Rekrutierte Champions (nicht nur freigeschaltete). */
  champions: number
  /** Summe aller Champion-Level — misst die Kader-Tiefe, nicht seine Breite. */
  championLevels: number
  materials: number
  starsRescued: number
  bosses: number
  battleWins: number
  prestiges: number
}

/** Meilenstein → Spielsekunde, in der er zum ersten Mal erreicht war. */
export type TelemetryFirsts = Record<string, number>

let enabled = false
let everySeconds = 60
let rows: TelemetryRow[] = []
let firsts: TelemetryFirsts = {}
let lastRow: TelemetryRow | null = null

/** Startet die Aufzeichnung neu. `everyGameSeconds` ist der Zeilenabstand. */
export function enableTelemetry(everyGameSeconds = 60): void {
  enabled = true
  everySeconds = Math.max(1, Math.floor(everyGameSeconds))
  rows = []
  firsts = {}
  lastRow = null
}

export function disableTelemetry(): void {
  enabled = false
}

export function isTelemetryEnabled(): boolean {
  return enabled
}

export function telemetryRows(): TelemetryRow[] {
  return rows
}

export function telemetryFirsts(): TelemetryFirsts {
  return firsts
}

/** Aktueller Stand der x-Achse — für `waitForFunction` in einem Treiber. */
export function telemetryElapsed(): number {
  return lastRow?.t ?? 0
}

function snapshot(): TelemetryRow {
  const game = useGameStore()
  const galaxy = useGalaxyStore()
  const battle = useBattleStore()
  const inventory = useInventoryStore()
  const solar = useSolarUpgradeStore()
  const boss = usePlanetBossStore()
  const levels = useChampionLevelStore()

  return {
    t: game.inGameTime,
    level: game.level,
    cps: game.chimesPerSecond,
    cpc: game.chimesPerClick,
    chimes: Math.floor(game.chimes),
    totalChimes: Math.floor(game.totalChimesEarned),
    meeps: game.meeps,
    power: game.totalPower,
    universe: game.currentUniverse,
    galaxy: galaxy.currentGalaxy,
    starPhase: solar.isCometState ? 0 : solar.starPhase + 1,
    champions: battle.ownedChampions.length,
    championLevels: Object.values(levels.progress).reduce(
      (sum, entry) => sum + (entry?.level ?? 0),
      0,
    ),
    materials: inventory.totalMaterialsCollected,
    starsRescued: galaxy.totalStarsRescued,
    bosses: boss.totalBossesDefeated,
    battleWins: battle.totalWins,
    prestiges: game.totalPrestiges,
  }
}

/**
 * Meilensteine als Schwellenübertritte. Die Liste ist bewusst kurz: sie nennt
 * nur, was ein Spieler als „jetzt hat etwas Neues angefangen" erlebt.
 */
const MILESTONES: Array<[string, (r: TelemetryRow) => boolean]> = [
  ['level_5', (r) => r.level >= 5],
  ['level_10', (r) => r.level >= 10],
  ['level_25', (r) => r.level >= 25],
  ['level_50', (r) => r.level >= 50],
  ['first_meep', (r) => r.meeps >= 1],
  ['first_champion', (r) => r.champions >= 1],
  ['full_roster', (r) => r.champions >= 5],
  ['first_star_rescued', (r) => r.starsRescued >= 1],
  ['first_boss', (r) => r.bosses >= 1],
  ['first_material', (r) => r.materials >= 1],
  ['sun_phase_2', (r) => r.starPhase >= 2],
  ['sun_phase_3', (r) => r.starPhase >= 3],
  ['sun_phase_4', (r) => r.starPhase >= 4],
  ['sun_phase_5', (r) => r.starPhase >= 5],
  ['sun_phase_6', (r) => r.starPhase >= 6],
  ['galaxy_2', (r) => r.galaxy >= 2],
  ['galaxy_3', (r) => r.galaxy >= 3],
  ['galaxy_5', (r) => r.galaxy >= 5],
  ['first_battle_win', (r) => r.battleWins >= 1],
  ['first_prestige', (r) => r.prestiges >= 1],
  ['chimes_1e6', (r) => r.totalChimes >= 1e6],
  ['chimes_1e9', (r) => r.totalChimes >= 1e9],
]

/** Haken am Ende von `gameStore.tick()`. Bei ausgeschalteter Telemetrie ein No-op. */
export function recordTelemetry(): void {
  if (!enabled) return
  const game = useGameStore()
  const t = game.inGameTime

  // Meilensteine JEDEN Takt prüfen, Zeilen nur im Raster: der Zeitpunkt eines
  // Übertritts ist die eigentliche Aussage, die Kurve dazwischen nur Kontext.
  const row = snapshot()
  for (const [key, reached] of MILESTONES) {
    if (firsts[key] === undefined && reached(row)) firsts[key] = t
  }
  lastRow = row

  if (rows.length === 0 || t - rows[rows.length - 1].t >= everySeconds) rows.push(row)
}

/** Alle Zeilen als CSV — direkt in eine Datei schreibbar. */
export function telemetryCsv(): string {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0]) as Array<keyof TelemetryRow>
  const head = keys.join(',')
  const body = rows.map((r) => keys.map((k) => r[k]).join(',')).join('\n')
  return `${head}\n${body}`
}
