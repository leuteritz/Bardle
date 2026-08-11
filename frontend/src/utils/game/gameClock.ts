/**
 * Die Spieluhr — EINE Zeitachse für alles, was im Spiel eine Frist hat.
 *
 * Bardle mischt drei Zeit-Idiome: tick-gezählte Werte (`chimes += cps`,
 * `cooldownMs -= TICK_MS`), absolute Fristen (`boss.startTime + enrageTimerMs`)
 * und rAF-Integration (`angle += speed * dt`). Ein Zeitraffer, der nur eines
 * davon anfasst, zerreißt die anderen: Sterne despawnen dann nach Wanduhr,
 * während der Kader zehnmal so schnell feuert.
 *
 * Statt siebzig Dauern beim Setzen zu dividieren, läuft hier die UHR schneller.
 * Setzen und Prüfen einer Frist stehen dadurch immer in derselben Achse, und
 * KEINE Dauer-Konstante des Spiels wird angefasst — ein Spielstand, der bei 10×
 * entstand, trägt dieselben Zahlen wie einer aus dem Live-Lauf.
 *
 * **Die Regel, nach der ein Aufrufer wählt:**
 * `gameNow()`, wenn der Wert je mit einer Zahl verglichen oder von ihr
 * subtrahiert wird, die in einem Pinia-Store lebt.
 * `Date.now()`, wenn beide Enden des Vergleichs im selben Modul entstehen — oder
 * wenn ein Mensch die Zahl als Wanduhr-Datum liest (Rekordstempel, Autosave,
 * Offline-Ertrag, Zufallssaat).
 *
 * **Zwei Invarianten, an denen das ganze System hängt:**
 *
 * 1. *Bei Speed 1 passiert nichts.* `gameNow()` gibt dann wörtlich `Date.now()`
 *    zurück, ohne eine einzige Rechnung — sonst driftete das Live-Spiel um
 *    Rundungsreste, und die Specs, die `Date.now` stubben, verlören ihre Wirkung.
 * 2. *Die Uhr geht nie zurück.* Ein Sprung von 10× auf 1× friert den bis dahin
 *    angesammelten Vorlauf ein, statt ihn abzubauen. Täte sie das nicht, läge
 *    jede offene Frist der Welt plötzlich in der Zukunft und feuerte gleichzeitig.
 */

import {
  GAME_SPEED_DEFAULT,
  GAME_SPEED_MAX,
  GAME_SPEED_MIN,
  GAME_TICK_INTERVAL_MS,
  GAME_TICK_MIN_INTERVAL_MS,
} from '@/config/constants'

let speed = GAME_SPEED_DEFAULT
/** Stand der Spieluhr am letzten Ankerpunkt. */
let virtualBase = 0
/** Wanduhrzeit am letzten Ankerpunkt. */
let realBase = 0
/**
 * Solange wahr, ist die Spieluhr die Wanduhr — `gameNow()` rechnet dann gar
 * nicht. Das ist der Normalfall im Live-Spiel und der Grund, warum der
 * Zeitraffer dort messbar nichts kostet.
 */
let identity = true

/**
 * Wer einen Timer besitzt, dessen realer Abstand vom Faktor abhängt, meldet sich
 * hier an und startet ihn im Rückruf neu. Ein `setInterval` behält seinen Abstand
 * bis zum Löschen — ohne diese Meldung liefe der Haupttakt nach einem
 * Speed-Wechsel weiter im alten Rhythmus, während die Uhr schon schneller geht.
 *
 * Bewusst eine schlichte Liste und kein Vue-`watch`: `main.ts` hat keine
 * Komponente, an der ein Watcher hängen könnte.
 */
const speedListeners = new Set<() => void>()

/** Meldet einen Timer-Neustart an. Gibt die Abmeldefunktion zurück. */
export function onGameSpeedChange(listener: () => void): () => void {
  speedListeners.add(listener)
  return () => speedListeners.delete(listener)
}

/** Der aktuelle Zeitraffer-Faktor. 1 = Live-Spiel. */
export function getGameSpeed(): number {
  return speed
}

/** Läuft gerade ein Zeitraffer? (Auch eine Zeitlupe zählt als „nicht live".) */
export function isTimeWarped(): boolean {
  return speed !== GAME_SPEED_DEFAULT
}

/**
 * Die Spielzeit in Millisekunden. Monoton wachsend, bei Speed 1 identisch zur
 * Wanduhr, bei Speed 10 zehnmal so schnell wie sie.
 */
export function gameNow(): number {
  const real = Date.now()
  if (identity) return real
  return virtualBase + (real - realBase) * speed
}

/**
 * Der Vorlauf der Spieluhr gegenüber der Wanduhr. Das ist der einzige Wert, den
 * ein Spielstand braucht, um seine gespeicherten Fristen wieder gültig zu machen
 * — sie stammen aus der Spielachse einer früheren Sitzung, die beliebig weit
 * vorausgelaufen sein kann.
 */
export function gameClockOffset(): number {
  return gameNow() - Date.now()
}

/**
 * Setzt die Spieluhr auf `Wanduhr + offsetMs`. Beim Laden eines Spielstands als
 * ALLERERSTES aufrufen, vor jedem Store-Restore — danach vergleicht jeder
 * geladene Zeitstempel wieder gegen die Achse, aus der er stammt.
 */
export function anchorGameClock(offsetMs: number): void {
  const real = Date.now()
  virtualBase = real + offsetMs
  realBase = real
  identity = speed === GAME_SPEED_DEFAULT && offsetMs === 0
}

/**
 * Stellt den Zeitraffer. Verankert die Uhr neu, damit die bisher vergangene
 * Spielzeit erhalten bleibt — der Wechsel verschiebt nur, wie schnell es ab
 * jetzt weitergeht, nie wo wir gerade stehen.
 *
 * Gibt den tatsächlich gesetzten (geklemmten) Faktor zurück.
 */
export function setGameSpeed(next: number): number {
  const clamped = Number.isFinite(next)
    ? Math.min(GAME_SPEED_MAX, Math.max(GAME_SPEED_MIN, next))
    : GAME_SPEED_DEFAULT
  if (clamped === speed) return speed

  const real = Date.now()
  virtualBase = gameNow()
  realBase = real
  speed = clamped
  identity = speed === GAME_SPEED_DEFAULT && virtualBase === real
  // Über eine KOPIE: ein Rückruf, der sich ab- und neu anmeldet (so macht es
  // jeder, der seinen Timer neu stellt), fügt sonst mitten in der Iteration ein
  // neues Element ein — `Set.forEach` besucht das und die Schleife läuft ewig.
  ;[...speedListeners].forEach((listener) => listener())
  return speed
}

/** Setzt Uhr und Faktor auf den Auslieferungszustand. Nur für Tests und Reset. */
export function resetGameClock(): void {
  speed = GAME_SPEED_DEFAULT
  virtualBase = 0
  realBase = 0
  identity = true
}

/**
 * Wie der Haupttakt bei diesem Faktor zu fahren ist.
 *
 * Kurze Intervalle klemmen Browser weg, deshalb wird unterhalb von
 * `GAME_TICK_MIN_INTERVAL_MS` nicht der Timer schneller gestellt, sondern je
 * Feuern mehrfach getickt. `interval` ist bewusst ein exaktes Vielfaches des
 * Soll-Abstands: nur so kommen bei Speed 50 auch wirklich 50 Ticks je realer
 * Sekunde heraus, und nur dann bleibt „ein Tick = 1000 Spielmillisekunden".
 */
export function gameTickPlan(factor: number = speed): { interval: number; catchUp: number } {
  const target = GAME_TICK_INTERVAL_MS / factor
  const catchUp = Math.max(1, Math.ceil(GAME_TICK_MIN_INTERVAL_MS / target))
  return { interval: target * catchUp, catchUp }
}

/**
 * Rechnet einen gewünschten Spielzeit-Abstand in den realen Timer-Abstand um.
 * Für `setInterval`-Takte, die Spielzustand fortschreiben.
 */
export function gameIntervalMs(gameMs: number): number {
  return speed === GAME_SPEED_DEFAULT ? gameMs : gameMs / speed
}

/**
 * `setTimeout` in Spielzeit. Pflicht für jede Verzögerung, deren Callback
 * Spielzustand ÄNDERT — Turret- und Striker-Geschosse tragen ihren Schaden erst
 * nach 420 bzw. 550 ms aus und verwerfen ihn, wenn das Ziel inzwischen gefallen
 * ist. Bliebe das real, wären bei 10× zehnmal so viele Geschosse gleichzeitig
 * unterwegs, wenn ein Boss stirbt — der effektive Boss-Schaden SÄNKE mit der
 * Geschwindigkeit, also genau die Größe, die gemessen werden soll.
 *
 * Rein visuelle Verzögerungen (Partikel aufräumen, Blitz ausblenden) bleiben
 * `setTimeout`: sie hängen am Auge des Spielers, nicht an der Spielzeit.
 */
export function gameTimeout(fn: () => void, gameMs: number): ReturnType<typeof setTimeout> {
  if (speed === GAME_SPEED_DEFAULT) return setTimeout(fn, gameMs)
  return setTimeout(fn, gameMs / speed)
}
