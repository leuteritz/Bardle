// ── Berührung zwischen Void-Wesen und Orbit-Körpern ─────────────────────────
//
// Reine Geometrie plus die Sperrzeiten. Was BEI einer Berührung passiert, steht
// im `voidStore` — hier wird nur beantwortet, wer wen anfasst und ob dieses Paar
// gerade wieder scharf ist.
//
// Der Modul-Zustand (die Sperrzeiten) liegt bewusst ausserhalb von Pinia, wie
// `_throttleMap` im roleBehaviorStore und `lastHits` im VoidLayer: er wird mit
// 60 Hz gelesen, geht nie in den Spielstand und darf kein Reaktivitäts-Update
// auslösen.
import { VOID_CONTACT_RADIUS_SCALE } from '@/config/constants'
import type { ChampionRole } from '@/types'
import { activeChampionBodies, activePlayerPlanetPositions } from '@/utils/orbit/liveState'

/** Woher ein berührter Körper stammt — entscheidet, welcher Effekt greift. */
export type ContactBodyKind = 'champion' | 'planet'

export interface ContactHit {
  kind: ContactBodyKind
  /** Rolle (Champion) bzw. Slot-Id (Planet). */
  key: string
  cx: number
  cy: number
}

/**
 * Berührungsradius eines Wesens aus seiner DARGESTELLTEN Grösse.
 *
 * Bewusst nicht `voidHitRadius` aus `voidPath`: der ist der grosszügige
 * Zielradius für die Maus (Faktor 0,62 samt Boden von 26 px, damit ein
 * wanderndes Ziel klickbar bleibt). Ein frisch aufgerissenes Wesen bei
 * `VOID_SPAWN_SCALE` (0,32) blockte damit einen Champion, den es sichtbar nicht
 * berührt. Hier zählt der Körper — kein Boden.
 */
export function voidContactRadius(sizePx: number, scale: number): number {
  return (sizePx / 2) * scale * VOID_CONTACT_RADIUS_SCALE
}

/**
 * Alle Orbit-Körper, die der Kreis (`mx`, `my`, `mr`) gerade schneidet.
 *
 * Schreibt in ein übergebenes Array statt eines zurückzugeben: der Aufrufer
 * ruft je Wesen und Frame, und zwei Dutzend Wegwerf-Arrays je Frame wären reine
 * Müllproduktion.
 *
 * Drei Dinge halten das billig, und alle drei sind Absicht:
 *   1. Quadrierter Abstand, nie `Math.hypot` — das ist variadisch und skaliert
 *      überlaufsicher, also rund eine Grössenordnung teurer. Der Klick-Hittest
 *      im VoidLayer darf `hypot` behalten, der läuft einmal je Klick.
 *   2. Achsenweise Vorabweisung vor dem Kreistest.
 *   3. Der Paar-Schlüssel entsteht ERST nach bestandenem Test. 24 Wesen × 11
 *      Körper sind 264 Paare je Frame; ein Template-Literal je Paar wären
 *      knapp 16 000 kurzlebige Strings je Sekunde, während echte Überlappungen
 *      ein paar je SEKUNDE sind.
 */
export function collectContacts(mx: number, my: number, mr: number, out: ContactHit[]): void {
  out.length = 0

  for (const [role, body] of activeChampionBodies) {
    // Hinter der Sonne wird nicht berührt — dort ist der Champion gedimmt und
    // durchscheinend, ein Kontaktblitz läse sich als Fehler. Dieselbe Regel wie
    // in `foregroundGate`, und sie halbiert nebenbei die Kandidatenzahl.
    if (!body.isForeground) continue
    const sum = mr + (body.r ?? 0)
    const dx = body.cx - mx
    if (dx > sum || dx < -sum) continue
    const dy = body.cy - my
    if (dy > sum || dy < -sum) continue
    if (dx * dx + dy * dy > sum * sum) continue
    out.push({ kind: 'champion', key: role, cx: body.cx, cy: body.cy })
  }

  // Zerstörte Planeten stehen gar nicht erst in der Map (PlanetOrbit löscht sie
  // dort) — sie fallen damit gratis aus der Berührung.
  for (const [slotId, body] of activePlayerPlanetPositions) {
    if (!body.isForeground) continue
    const sum = mr + (body.r ?? 0)
    const dx = body.cx - mx
    if (dx > sum || dx < -sum) continue
    const dy = body.cy - my
    if (dy > sum || dy < -sum) continue
    if (dx * dx + dy * dy > sum * sum) continue
    out.push({ kind: 'planet', key: slotId, cx: body.cx, cy: body.cy })
  }
}

/** Rolle eines Champion-Treffers — der Schlüssel IST die Rolle. */
export function contactRole(hit: ContactHit): ChampionRole {
  return hit.key as ChampionRole
}

// ── Sperrzeiten je Paar ─────────────────────────────────────────────────────
// Der Auflöser wird aus ZWEI Takten gerufen: aus der Frame-Schleife des
// VoidLayer (flüssig) und aus dem Sekunden-Tick des Stores (greift, wenn ein
// Modal den Layer verdeckt). Diese Map ist der Grund, warum das nicht doppelt
// zünden kann — wer zuerst kommt, stempelt im selben Aufruf, jeder Zweite im
// Fenster kehrt vor jedem Effekt um.
const armedUntil = new Map<string, number>()

/**
 * Ist dieses Paar wieder scharf? Bei `true` wird die Sperre GLEICH MIT gesetzt —
 * die Prüfung und das Stempeln dürfen nicht auseinanderfallen, sonst öffnet
 * sich genau dazwischen das Fenster für einen zweiten Aufrufer.
 */
export function armContact(uid: number, key: string, now: number, rearmMs: number): boolean {
  const pair = uid + '|' + key
  const until = armedUntil.get(pair)
  if (until !== undefined && until > now) return false
  armedUntil.set(pair, now + rearmMs)
  return true
}

/**
 * Sperrzeiten erlegter Wesen abräumen. Gehört in den Sekunden-Takt, nicht in
 * die Frame-Schleife — die Map ist klein, und eine Uid kommt nie wieder.
 */
export function pruneContactCooldowns(liveUids: Set<number>): void {
  if (armedUntil.size === 0) return
  for (const pair of armedUntil.keys()) {
    const uid = Number(pair.slice(0, pair.indexOf('|')))
    if (!liveUids.has(uid)) armedUntil.delete(pair)
  }
}

/** Nur für Tests: wie viele Sperren gerade gehalten werden. */
export function contactCooldownCount(): number {
  return armedUntil.size
}

/** Nur für Tests: alle Sperren fallen lassen. */
export function resetContactCooldowns(): void {
  armedUntil.clear()
}
