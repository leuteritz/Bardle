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
import { unlockedLandfalls, getLandfall } from '@/config/world/landfalls'
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
  LANDFALL_CAIRN_OFFERS,
  LANDFALL_CAIRN_SEED_SALT,
  LANDFALL_CORE_CLEARANCE,
} from '@/config/constants'
import { LANDFALL_BOONS } from '@/config/world/landfallBoons'
import type {
  ActiveLandfall,
  LandfallBoonId,
  LandfallDef,
  LandfallKindId,
  LandfallPlan,
} from '@/types'

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

/**
 * Gilt der Ort als geschafft?
 *
 * Das hing bis dahin an drei Aufrufstellen als `taps > 0` — also am RIFF, nicht
 * am Ort. Mit sechs Gesten ist das eine eigene Frage: der Konvoi will sein Ziel
 * erreicht sehen, der Cairn eine getroffene Wahl, und das Gloaming will gar
 * nichts und gilt trotzdem.
 *
 * Rein, damit die Specs sie ohne Pinia prüfen können — und damit der Store sie
 * nicht ein zweites Mal beantwortet.
 */
export function landfallCleared(active: ActiveLandfall): boolean {
  const def = getLandfall(active.kind)
  if (!def) return active.taps > 0
  switch (def.gesture) {
    case 'none':
      // Er zahlt beim Vorbeifliegen. Ihn als versäumt zu buchen hiesse, dem
      // Spieler etwas vorzuwerfen, wofür es keine Geste gibt.
      return true
    case 'choice':
      return active.choice != null
    case 'single':
      return active.taps > 0
    case 'threshold':
      return active.taps >= (def.tapCap ?? 1)
    case 'gradient':
    default:
      return active.taps > 0
  }
}

/**
 * Zählt ein weiterer Griff noch? Der Deckel steht am Def; ohne ihn wäre ein Ort
 * ein Autoklicker-Fenster.
 *
 * `'none'` und `'choice'` nehmen keine Griffe — bei ihnen ist die Karte kein
 * Knopf, sondern Anzeige beziehungsweise Auswahl.
 */
export function landfallAcceptsTap(def: LandfallDef | undefined, taps: number): boolean {
  if (!def) return false
  if (def.gesture === 'none' || def.gesture === 'choice') return false
  return taps < (def.tapCap ?? 1)
}

/**
 * Die drei Angebote eines Cairn — deterministisch aus `mapSeed` und Etappe.
 *
 * EIGENER Strom (`LANDFALL_CAIRN_SEED_SALT`): würde er die Ziehung der Orte
 * mitbenutzen, verschöbe jede Änderung an der Zahl der Angebote rückwirkend
 * jede archivierte Galaxie. Dieselbe Disziplin wie bei `voyageBerthsOf`.
 *
 * Abgeleitet statt gespeichert — der offene Ort überlebt ohnehin keinen Reload,
 * und ein Feld für drei Vorschläge wäre Zustand, den niemand braucht.
 */
export function cairnOffer(mapSeed: number, leg: number): LandfallBoonId[] {
  const rng = seededRng(mapSeed * LANDFALL_CAIRN_SEED_SALT + leg * 271 + 7)
  const pool = LANDFALL_BOONS.map((b) => b.id)
  // Fisher-Yates, dann abschneiden: ohne Zurücklegen, sonst stünde derselbe
  // Segen zweimal am Stein.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.min(LANDFALL_CAIRN_OFFERS, pool.length))
}

export interface LandfallPoint {
  x: number
  y: number
}

export interface LandfallMark {
  kind: LandfallKindId
  cleared: boolean
  x: number
  y: number
}

/**
 * Die Marken einer gelaufenen Galaxie — die EINE Paarung von Lage und Art, für
 * beide Kartenpfade (`galaxyPlate` und die Live-Minimap).
 *
 * Und die Stelle, an der eine Regel eingehalten wird, die sonst zweimal
 * gebrochen wurde: **die ART kommt aus dem GESPEICHERTEN Ausgang, nur die LAGE
 * aus dem abgeleiteten Plan.**
 *
 * Genau dafür wird die Art überhaupt gespeichert. Zöge die Karte sie aus dem
 * Plan, würde jeder neue Ort im Katalog die Ziehung verschieben und damit jede
 * archivierte Galaxie rückwirkend umetikettieren — ein Riff von gestern wäre
 * morgen ein Riss. Beim zweiten und dritten Katalogeintrag ist genau das
 * passiert, unbemerkt, bis sechs Orte im Bild standen.
 */
export function landfallMarks(
  mapSeed: number,
  galaxy: number,
  spawn: LandfallPoint,
  dots: LandfallPoint[],
  attempts: number,
  results: readonly { kind: LandfallKindId; cleared: boolean }[],
  /** Halbkanten der Sperrzone um den Kern, normalisiert. Ohne Angabe rund. */
  clearance: LandfallPoint = { x: LANDFALL_CORE_CLEARANCE, y: LANDFALL_CORE_CLEARANCE },
): LandfallMark[] {
  if (!results.length) return []
  const kette = [spawn, ...dots.slice(0, attempts), { x: 0.5, y: 0.5 }]
  const plaene = landfallsOfRun(mapSeed, galaxy, attempts + 1, kette.length - 1)
  const out: LandfallMark[] = []
  for (let i = 0; i < plaene.length && i < results.length; i++) {
    const plan = plaene[i]
    const pos = clearCore(
      landfallWorldPos(kette[plan.leg], kette[plan.leg + 1], plan.t, plan.bow),
      clearance,
    )
    out.push({ kind: results[i].kind, cleared: results[i].cleared, x: pos.x, y: pos.y })
  }
  return out
}

/**
 * Schiebt eine Marke aus dem Kern heraus. Der Kern gehört dem Tor.
 *
 * In der MAXIMUMSNORM gegen zwei Halbkanten, nicht euklidisch gegen einen
 * Radius: der 0..1-Raum der Karte ist anisotrop, und das Tor ist ein
 * achsenparalleles Quadrat in Pixeln. Ein runder Abstand ist dort senkrecht
 * schmaler als waagerecht — gemessen blieb eine Marke 58 px vom Kern unter
 * einem Tor von 124 px Kantenlänge liegen. Dieselbe Falle, die schon
 * `voyageGateSizeFor` beschreibt.
 *
 * Nach aussen entlang der eigenen Richtung: so behält die Marke die Richtung,
 * aus der die Route sie gebracht hat, und rückt nur so weit wie nötig. Ein Ort
 * GENAU in der Mitte bekommt eine feste Richtung, sonst teilte die Rechnung
 * durch null.
 */
function clearCore(p: LandfallPoint, c: LandfallPoint): LandfallPoint {
  // Halbkante 0 heisst „keine Sperrzone" — die Live-Minimap malt kein Tor.
  if (c.x <= 0 || c.y <= 0) return p
  const dx = p.x - 0.5
  const dy = p.y - 0.5
  const norm = Math.max(Math.abs(dx) / c.x, Math.abs(dy) / c.y)
  if (norm >= 1) return p
  if (norm < 1e-6) return { x: 0.5 + c.x, y: 0.5 }
  const k = 1 / norm
  return { x: 0.5 + dx * k, y: 0.5 + dy * k }
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
