/**
 * Wie lange ein Stern noch steht — EINE Rechnung für alle Anzeigen.
 *
 * Ein Resource-Star hat zwei Uhren, und die kürzere gewinnt:
 *
 *  1. seine eigene Despawn-Frist (`spawnedAt + durationMs`,
 *     RESOURCE_STAR_DURATION_MS = 45 s) und
 *  2. die Enrage-Uhr der Bosse auf seinen Planeten (BOSS_ENRAGE_BASE_SECONDS =
 *     30 s, mit dem Bard-Level wachsend). Läuft sie ab, wird jeder Boss
 *     `expired`, der Watcher in `useStarSystem` meldet das als Fehlschlag an
 *     `starGroupStore.onBossResult`, damit sind alle Slots geräumt — und
 *     `tickResourceStars` nimmt den Stern aus der Bahn, lange bevor seine
 *     eigene Frist um ist.
 *
 * Genau daran ist die Anzeige im Pause-Overlay auseinandergelaufen: sie rechnete
 * nur mit Uhr 1 und zählte weiter, während der Stern schon verschwunden war. Die
 * Header-Bars rechneten von Anfang an richtig. Statt die Rechnung ein zweites Mal
 * zu schreiben, steht sie jetzt hier und wird von beiden Stellen aufgerufen —
 * eine dritte Anzeige kann so gar nicht erst abweichen.
 *
 * Die Boss-Zeiten kommen über einen Lookup herein statt aus dem Store: die
 * Header-Bars lesen bewusst aus einem ungetrackten Snapshot, damit sie nicht bei
 * jedem Schadensereignis neu rechnen. Diese Entscheidung bleibt beim Aufrufer.
 */

export interface StarBossTimer {
  /** Zeitstempel, ab dem die Enrage-Uhr des Bosses läuft. */
  startTime: number
  /** Laufzeit der Enrage-Uhr in ms. */
  enrageTimerMs: number
}

export interface StarLifetimeSource {
  planetSlots: { planetId: string; cleared: boolean }[]
  spawnedAt?: number
  durationMs?: number
}

/** Nachschlagefunktion für die Enrage-Uhr eines Planeten. */
export type StarBossTimerLookup = (planetId: string) => StarBossTimer | null | undefined

function openBossTimers(star: StarLifetimeSource, lookup: StarBossTimerLookup): StarBossTimer[] {
  const timers: StarBossTimer[] = []
  for (const slot of star.planetSlots) {
    if (slot.cleared) continue
    const timer = lookup(slot.planetId)
    if (timer) timers.push(timer)
  }
  return timers
}

/**
 * ABSOLUTER Zeitpunkt, an dem die maßgebliche Uhr abläuft — die früheste der
 * beiden. Solange noch Bosse leben, zählt deren Enrage-Uhr; erst wenn keiner
 * mehr eine hat, bleibt die eigene Despawn-Frist des Sterns.
 *
 * Der Zeitstempel ist die Grundform, die Restzeit nur seine Differenz zu
 * `now`. Eine Anzeige, die selbst weiterläuft (der Zeitbogen im Pause-Overlay
 * läuft als CSS-Animation), braucht genau diesen Fixpunkt: aus `now +
 * Restzeit` zurückgerechnet wackelte er mit jedem Abtastzeitpunkt um ein paar
 * Millisekunden — und jede Neuberechnung setzte die Animation zurück.
 */
export function starDeadlineAt(
  star: StarLifetimeSource,
  lookup: StarBossTimerLookup,
): number | null {
  const timers = openBossTimers(star, lookup)
  if (timers.length > 0) {
    return Math.min(...timers.map((t) => t.startTime + t.enrageTimerMs))
  }
  if (star.spawnedAt !== undefined && star.durationMs !== undefined) {
    return star.spawnedAt + star.durationMs
  }
  return null
}

/**
 * Frist eines CHAMPION-Sterns. Er hat nur EINE Uhr — seine eigene
 * (`spawnedAt + durationMs`, CHAMPION_STAR_DURATION_MS = 60 s). Die Enrage-Uhr
 * seiner Bosse zählt hier bewusst nicht: der Champion-Stern verschwindet erst
 * mit seiner eigenen Frist, ein rasender Boss verkürzt sie nicht.
 *
 * Die Formel stand ausgeschrieben in den Header-Bars und im Ankunfts-HUD der
 * Minimap. Beide zeigen denselben Stern, und sobald eine dritte Anzeige
 * dazukam, war das genau die Konstellation, an der `starRemainingMs` schon
 * einmal auseinandergelaufen ist — deshalb steht sie jetzt hier.
 */
export function championStarDeadlineAt(star: StarLifetimeSource): number | null {
  if (star.spawnedAt === undefined || star.durationMs === undefined) return null
  return star.spawnedAt + star.durationMs
}

/**
 * Restzeit des Sterns in ms — die früheste der beiden Uhren.
 */
export function starRemainingMs(
  star: StarLifetimeSource,
  now: number,
  lookup: StarBossTimerLookup,
): number {
  const deadline = starDeadlineAt(star, lookup)
  return deadline === null ? 0 : Math.max(0, deadline - now)
}

/**
 * Gesamtlaufzeit derselben Uhr — der Nenner für Balkenfüllung und Zeitbogen.
 * Ohne sie stünde eine 30-Sekunden-Restzeit auf einer 45-Sekunden-Skala und der
 * Balken startete bei zwei Dritteln.
 */
export function starTotalMs(star: StarLifetimeSource, lookup: StarBossTimerLookup): number {
  const timers = openBossTimers(star, lookup)
  const fromBoss = timers.find((t) => t.enrageTimerMs > 0)?.enrageTimerMs
  return fromBoss ?? star.durationMs ?? 0
}
