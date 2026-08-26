/* ── Landfalls: wo auf der Reise ein Ort liegt ────────────────────────────────
   Rein und ohne Store-Zugriff, damit die Specs ohne Pinia laufen — dasselbe
   Muster wie `voyageSites.ts` und `voyageLegs.ts`.

   Position und Art sind ABGELEITET, nur der AUSGANG wird gespeichert. Der Seed
   ist `mapSeed` plus Etappennummer; `generateGalaxyDots` bleibt dabei
   unangetastet, weil seine rng-Aufrufreihenfolge byte-identisch bleiben muss —
   archivierte Galaxien spielen sie nach.

   Gerechnet wird JE ETAPPE, nicht global über die Galaxie. Der Grund ist ein
   verlorener Stern: er hängt eine zusätzliche Etappe an, und eine globale Liste
   fester Länge müsste dann entweder verrutschen oder die Zusatzetappe leer
   lassen. Je Etappe gewürfelt bekommt eine misslungene Galaxie schlicht mehr
   Orte — was richtig ist, denn sie ist auch länger unterwegs.                */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { unlockedLandfalls } from '@/config/world/landfalls'
import {
  LANDFALL_UNLOCK_GALAXY,
  LANDFALL_BASE,
  LANDFALL_EVERY,
  LANDFALL_MAX,
  LANDFALL_T_MIN,
  LANDFALL_T_MAX,
  LANDFALL_SEED_SALT,
  LANDFALL_SEED_OFFSET,
  LANDFALL_BOW_MIN,
  LANDFALL_BOW_MAX,
  LANDFALL_WINDOW_FRACTION,
  LANDFALL_WINDOW_MIN_MS,
  LANDFALL_WINDOW_MAX_MS,
} from '@/config/constants'
import type { LandfallPlan } from '@/types'

/** Wie viele Orte eine Galaxie tragen SOLL — das Ziel, gegen das die
 *  Etappenwahrscheinlichkeit gerechnet wird. */
export function landfallCountFor(galaxy: number): number {
  if (galaxy < LANDFALL_UNLOCK_GALAXY) return 0
  const gewachsen = LANDFALL_BASE + Math.floor((galaxy - LANDFALL_UNLOCK_GALAXY) / LANDFALL_EVERY)
  return Math.min(gewachsen, LANDFALL_MAX)
}

/**
 * Chance, dass eine einzelne Etappe einen Ort trägt.
 *
 * Der Nenner ist die GEPLANTE Etappenzahl (`starsRequired + 1`), nicht die
 * tatsächliche: sonst verdünnte jeder verlorene Stern die Orte, statt welche
 * hinzuzufügen. Spät steht die Chance auf 1 — dort trägt jede Etappe einen.
 */
export function landfallChanceFor(galaxy: number, plannedLegs: number): number {
  if (plannedLegs <= 0) return 0
  return Math.min(1, landfallCountFor(galaxy) / plannedLegs)
}

/**
 * Wie lange der Ort offen steht — gegen die TATSÄCHLICHE Etappendauer, also
 * nach `flightSpeedMultiplier` und Forge-Faktor.
 *
 * Es muss hinter `LANDFALL_T_MAX` noch hineinpassen, sonst steht der Ort noch
 * offen, wenn der Stern schon da ist. `landfalls.spec.ts` bindet das gegen die
 * kürzeste Etappe, die überhaupt einen Ort tragen kann.
 */
export function landfallWindowMs(legDurationMs: number): number {
  const roh = legDurationMs * LANDFALL_WINDOW_FRACTION
  return Math.round(Math.min(LANDFALL_WINDOW_MAX_MS, Math.max(LANDFALL_WINDOW_MIN_MS, roh)))
}

/** Ein Ort trägt höchstens EINE Etappe, also reicht ein Strom je Etappe. */
function legRng(mapSeed: number, leg: number) {
  return seededRng(mapSeed * LANDFALL_SEED_SALT + LANDFALL_SEED_OFFSET + leg * 137)
}

/**
 * Der Ort auf dieser Etappe — oder `null`.
 *
 * Die Ziehreihenfolge ist FEST und darf sich nicht verschieben: Wurf, Lage,
 * Bogen, Art. Dieselbe Disziplin wie im Voyage-Logbuch, aus demselben Grund —
 * eine eingeschobene Ziehung schreibt jede archivierte Galaxie um.
 */
export function landfallOnLeg(
  mapSeed: number,
  galaxy: number,
  leg: number,
  plannedLegs: number,
): LandfallPlan | null {
  const kandidaten = unlockedLandfalls(galaxy)
  if (!kandidaten.length) return null

  const rng = legRng(mapSeed, leg)
  if (rng() >= landfallChanceFor(galaxy, plannedLegs)) return null

  const t = LANDFALL_T_MIN + rng() * (LANDFALL_T_MAX - LANDFALL_T_MIN)
  const betrag = LANDFALL_BOW_MIN + rng() * (LANDFALL_BOW_MAX - LANDFALL_BOW_MIN)
  const bow = rng() < 0.5 ? -betrag : betrag

  const summe = kandidaten.reduce((s, d) => s + d.weight, 0)
  let wurf = rng() * summe
  let gewaehlt = kandidaten[kandidaten.length - 1]
  for (const d of kandidaten) {
    wurf -= d.weight
    if (wurf <= 0) {
      gewaehlt = d
      break
    }
  }

  return { kind: gewaehlt.id, leg, t, bow }
}

/** Alle Orte einer gelaufenen Galaxie, in Routenreihenfolge — für die Karte. */
export function landfallsOfRun(
  mapSeed: number,
  galaxy: number,
  plannedLegs: number,
  actualLegs: number,
): LandfallPlan[] {
  const out: LandfallPlan[] = []
  for (let leg = 0; leg < actualLegs; leg++) {
    const p = landfallOnLeg(mapSeed, galaxy, leg, plannedLegs)
    if (p) out.push(p)
  }
  return out
}

export interface LandfallPoint {
  x: number
  y: number
}

/**
 * Weltposition eines Ortes: auf der Sehne der Etappe, um `bow` seitlich
 * versetzt.
 *
 * Der Versatz ist kein Zierrat — ohne ihn läge die Marke exakt unter der
 * gezogenen Route und wäre von ihr gedeckt. Dieselbe Überlegung, aus der
 * `voyageGateExit` den Routenanfang NEBEN das Tor legt statt hinein.
 */
export function landfallWorldPos(
  von: LandfallPoint,
  nach: LandfallPoint,
  t: number,
  bow: number,
): LandfallPoint {
  const dx = nach.x - von.x
  const dy = nach.y - von.y
  const laenge = Math.hypot(dx, dy) || 1
  return {
    x: von.x + dx * t - (dy / laenge) * bow,
    y: von.y + dy * t + (dx / laenge) * bow,
  }
}
