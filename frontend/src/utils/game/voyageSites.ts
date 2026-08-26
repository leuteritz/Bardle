/* ── Ankerplätze einer befreiten Galaxie ──────────────────────────────────────
   Reine Funktionen ohne Store-Zugriff, damit die Specs sie ohne Pinia prüfen
   können — dasselbe Muster wie `config/economy/expeditionDestinations.ts`. */

import {
  armRadius,
  galaxyGeo,
  galaxyPlaneToWorld,
  generateGalaxyDots,
  seededRng,
} from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { landfallsOfRun, landfallWorldPos } from '@/utils/game/landfalls'
import {
  CORE_GATE_CROWN_SPAN,
  CORE_GATE_MOUTH_R,
  VOYAGE_BERTH_CANDIDATE_POOL,
  VOYAGE_GATE_GAP_PX,
  VOYAGE_GATE_MIN_PX,
  VOYAGE_SITE_DOT_RATIO,
  VOYAGE_SITE_HIT_GAP,
  VOYAGE_SITE_HIT_MAX,
  VOYAGE_SITE_HIT_MIN,
  VOYAGE_SITE_MAX_SPAN_FRACTION,
  VOYAGE_SITE_PLATE_INSET,
  VOYAGE_SITE_SLOTS,
} from '@/config/constants'
import { GALAXY_PLATE_REF_W } from '@/utils/fx/galaxyPlate'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { AvailableExpeditionSlot, ExpeditionMission, VoyageRoutePoint } from '@/types'

export interface VoyageBerth {
  /** Stabil über Re-Renders: `${galaxy}:${berth}`. */
  key: string
  berth: number
  /** Normalisiert 0..1 in der Fit-Box der Karte. */
  x: number
  y: number
}

/**
 * Die Ankerplätze einer Galaxie — freie Orte NEBEN ihrer Geschichte.
 *
 * Nicht aus `generateGalaxyDots` genommen, und das ist der Kern der Sache.
 * Dieser Zug strebt 0.085 Abstand an, GARANTIERT ihn aber nicht: er probiert
 * acht Kandidaten und nimmt danach den letzten, wie er fällt. In der dichtesten
 * Galaxie lagen zwei aufeinanderfolgende Punkte gemessen 25.5 px auseinander —
 * bei einer Klickfläche von VOYAGE_SITE_HIT_MIN deckten sich zwei Häfen. Mehr
 * Punkte anzufordern half nicht: die späteren werden in genau die engen Lücken
 * gedrückt, die schon voll sind.
 *
 * Stattdessen ein EIGENER Kandidatenpool auf derselben Scheibe, aus einem
 * eigenen Seed-Strom — der Zug der Geschichte wird nicht angefasst, archivierte
 * Karten ändern sich also nicht. Aus dem Pool wählt Farthest-Point-Sampling:
 * jeder neue Platz ist der Kandidat, der am weitesten vom nächsten schon
 * belegten Punkt liegt. Die GESCHICHTE ist die Startmenge, ein Hafen rückt also
 * auch keinem geretteten Stern auf den Leib.
 *
 * Deterministisch: nichts würfelt zur Anzeigezeit, Gleichstände entscheidet der
 * Index.
 */
export function voyageBerthsOf(record: CompletedGalaxyRecord): VoyageBerth[] {
  const attempts = record.attemptResults.length
  const geo = galaxyGeo(record.mapSeed)
  const { spawn, dots } = generateGalaxyDots(record.mapSeed, attempts + 1)
  // Die Startmenge des Farthest-Point-Sampling ist die GESCHICHTE der Galaxie —
  // seit es Landfalls gibt, gehören sie dazu. Ohne sie setzte ein Hafen sich auf
  // eine Ortsmarke, und `voyageMarkerSizeFor` misst nur Hafen gegen Hafen.
  const kette = [spawn, ...dots.slice(0, attempts), { x: 0.5, y: 0.5 }]
  const ortZahl = (record.landfallResults ?? []).length
  const orte = ortZahl
    ? landfallsOfRun(record.mapSeed, record.galaxy, attempts + 1, kette.length - 1)
        .slice(0, ortZahl)
        .map((plan) => landfallWorldPos(kette[plan.leg], kette[plan.leg + 1], plan.t, plan.bow))
    : []
  const history = [...dots.slice(0, attempts), ...orte]

  // Eigener Strom, damit kein Aufruf die Ziehreihenfolge der Geschichte berührt.
  const rng = seededRng(record.mapSeed * 7717 + 101)
  const rMin = armRadius(geo, BERTH_RADIUS_MIN_T)
  const rSpan = armRadius(geo, BERTH_RADIUS_MAX_T) - rMin

  const candidates: { x: number; y: number }[] = []
  for (let i = 0; i < VOYAGE_BERTH_CANDIDATE_POOL; i++) {
    // Wurzel auf den Radius: flächengleich verteilt statt zum Kern hin gehäuft.
    const r = rMin + Math.sqrt(rng()) * rSpan
    const p = galaxyPlaneToWorld(geo, rng() * Math.PI * 2, r)
    candidates.push({
      x: Math.min(0.94, Math.max(0.06, p.x)),
      y: Math.min(0.94, Math.max(0.06, p.y)),
    })
  }

  const nearest = candidates.map((c) =>
    history.reduce((min, h) => Math.min(min, distSq(c, h)), Number.POSITIVE_INFINITY),
  )
  const taken = new Array<boolean>(candidates.length).fill(false)
  const out: VoyageBerth[] = []

  for (let b = 0; b < VOYAGE_SITE_SLOTS && b < candidates.length; b++) {
    let best = -1
    for (let i = 0; i < candidates.length; i++) {
      if (taken[i]) continue
      if (best === -1 || nearest[i] > nearest[best]) best = i
    }
    if (best === -1) break
    taken[best] = true
    const dot = candidates[best]
    out.push({ key: `${record.galaxy}:${b}`, berth: b, x: dot.x, y: dot.y })
    for (let i = 0; i < candidates.length; i++) {
      if (!taken[i]) nearest[i] = Math.min(nearest[i], distSq(candidates[i], dot))
    }
  }
  return out
}

/**
 * Radiale Spanne der Ankerplätze, in `armRadius`-Einheiten.
 *
 * Der Kern bleibt frei — dort sitzt der befreite Bossstern samt Plakette. Nach
 * aussen wird NICHT beschnitten, obwohl die Plätze dadurch zum Rand hin
 * tendieren (gemessen 37 % jenseits von 0.40 Weltradius). Das ist der Preis
 * dafür, dass sie sich nicht drängen: zieht man die Spanne auf 0.92, fällt der
 * garantierte Abstand von 0.0756 auf 0.0621 — in Pixeln 32 gegen eine
 * Klickfläche von 34, also wieder Häfen, die sich decken.
 *
 * Und es liest sich gut: die Verträge rahmen die Galaxie, die Geschichte füllt
 * sie. Die beiden konkurrieren nie um dieselbe Stelle.
 */
const BERTH_RADIUS_MIN_T = 0.22
const BERTH_RADIUS_MAX_T = 1

function distSq(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export interface VoyageMarkerSize {
  /** Klickquadrat des Hafens in Pixeln. */
  hit: number
  /** Sichtbare Platte — immer INNERHALB von `hit`. */
  plate: number
  /** Blanker Hafen ohne Vertrag. */
  dot: number
}

/* ── Caretaker's Gate ─────────────────────────────────────────────────────────
   Der Ort, an dem der Galaxieboss sass. Ist die Galaxie befreit — und nur solche
   zeigt der Atlas —, ist er der Hafen der Galaxie: jede Crew bricht von dort auf
   und kehrt dorthin zurueck.

   Kein eigener Seed, keine eigene Geometrie: der Kern IST der Ursprung des
   Kartenraums (`galaxyPlaneToWorld`), und `generateGalaxyDots` haelt ihn
   ausdruecklich frei, damit der Boss allein dort steht. */

/** Der befreite Kern, normalisiert 0..1 — derselbe Punkt in jeder Galaxie. */
export const VOYAGE_GATE_POS: VoyageRoutePoint = { x: 0.5, y: 0.5 }

export interface VoyageGateSize {
  /** Klickfläche des Tores in Pixeln. */
  size: number
  /** Radius, auf dem eine Route beginnt und endet — knapp ausserhalb der Marke. */
  exit: number
  /** Trägt das Tor seinen Rückkehr-Ring, ohne durch die Krone zu laufen? */
  showArc: boolean
}

/**
 * Wie gross das Tor auf DIESER Karte sein darf.
 *
 * Es misst sich am CANVAS, nicht mehr an der Hafenplatte: die sichtbare Marke
 * malt `paintGalaxy` (`core-gate` samt zersprungener Krone), das DOM legt nur
 * noch den Zustand darauf. Was das DOM beiträgt, muss die Marke also
 * umschliessen — und die skaliert mit `k`, dem Massstab der Platte.
 *
 * Der Deckel kommt weiterhin vom naechsten Hafen, und das ist kein
 * Vorsichtsmass: die Ankerplaetze halten nur `BERTH_RADIUS_MIN_T` vom Kern
 * Abstand, in der Scheibenebene. Der Squash der Scheibe und das
 * Seitenverhaeltnis-Band der Fit-Box druecken das in Pixeln weiter zusammen —
 * gemessen ueber 400 Seeds liegt der naechste Platz im Median 42, im fuenften
 * Perzentil 27 und im schlechtesten Fall 15 Referenzeinheiten entfernt.
 *
 * Gemessen wird in der MAXIMUMSNORM und gegen `hit`, nicht euklidisch gegen
 * `plate` — aus demselben Grund wie bei `voyageMarkerSizeFor`: beide Flaechen
 * sind achsenparallele Quadrate, und die decken sich genau dann, wenn BEIDE
 * Achsabstaende kleiner sind als die halbe Summe der Seiten. Euklidisch
 * gerechnet ging ein diagonaler Nachbar durch — im Browser gemessen deckten
 * sich Tor und Hafen dann um 3 px.
 *
 * `exit` haengt bewusst NICHT an `size`: der Routenanfang muss die MARKE
 * umgehen, nicht die Klickflaeche. Eine Linie deckt nichts zu, sie darf also
 * auch dann aussen beginnen, wenn der Deckel die Klickflaeche geschrumpft hat.
 */
export function voyageGateSizeFor(
  sites: readonly { x: number; y: number }[],
  box: { w: number; h: number },
  marker: VoyageMarkerSize,
): VoyageGateSize {
  const k = box.w / GALAXY_PLATE_REF_W
  /** Aussenkante der gemalten Marke: der Torschlund plus die Krone darum. */
  const markR = CORE_GATE_MOUTH_R * CORE_GATE_CROWN_SPAN * k

  let nearest = Number.POSITIVE_INFINITY
  for (const s of sites) {
    const dx = Math.abs(s.x - 0.5) * box.w
    const dy = Math.abs(s.y - 0.5) * box.h
    nearest = Math.min(nearest, Math.max(dx, dy))
  }
  const cap = 2 * (nearest - marker.hit / 2 - VOYAGE_GATE_GAP_PX)
  const exit = markR + VOYAGE_GATE_GAP_PX
  // KEIN absoluter Pixeldeckel mehr. Er stammt aus der Zeit, als das Tor seinen
  // eigenen Ring malte; jetzt umschliesst es die Canvas-Marke, und die wächst
  // mit `k`. Ein fester Deckel schnitte auf 2K und 4K genau den Ring weg, den
  // das Tor tragen soll — gemessen: auf 2560×1440 griff er in JEDER Galaxie.
  const size = Math.round(Math.max(VOYAGE_GATE_MIN_PX, Math.min(2 * exit, cap)))
  // Drueckt ein Vertrag dicht am Kern den Deckel unter die Krone, liefe der Ring
  // quer durch sie. Dann traegt die Pille die Zeit allein.
  return { size, exit, showArc: size / 2 >= markR }
}

/**
 * Wo eine Route zum Hafen `target` das Tor verlaesst.
 *
 * Der Kreis wird in PIXELN gezogen und erst dann normalisiert zurueckgerechnet.
 * Ein fester Abstand im 0..1-Raum waere auf einer Fit-Box mit
 * `VOYAGE_MAP_ASPECT_MAX` in der Senkrechten fast halb so gross wie in der
 * Waagerechten — die Route begaenne dort im Tor statt daneben.
 */
export function voyageGateExit(
  target: { x: number; y: number },
  box: { w: number; h: number },
  radius: number,
): VoyageRoutePoint {
  const dx = (target.x - 0.5) * box.w
  const dy = (target.y - 0.5) * box.h
  const len = Math.hypot(dx, dy) || 1
  return {
    x: 0.5 + ((dx / len) * radius) / Math.max(1, box.w),
    y: 0.5 + ((dy / len) * radius) / Math.max(1, box.h),
  }
}

/**
 * Der Seed, der den Bogen einer Route streut. Hin- und Rueckweg eines Hafens
 * teilen ihn — die Crew kommt auf demselben Bogen heim, auf dem sie ging.
 */
export function voyageBowSeed(site: { x: number; y: number; berth: number }): number {
  return Math.round(site.x * 9973 + site.y * 7919) + site.berth * 131
}

/**
 * Wie gross ein Hafen auf DIESER Karte mit DIESEN Haefen sein darf.
 *
 * Vorher war das eine feste Zahl, bemessen am dichtesten denkbaren Fall — zehn
 * Haefen in einer Galaxie auf Full HD. Der tritt fast nie ein: der Normalfall
 * sind ein bis drei Vertraege, und dort stand die Marke mit 34 px auf einer
 * Karte, die 300 px Platz zwischen zwei Haefen hatte. Auf 2K und 4K war sie
 * selbst bei vollem Deckel nur die Haelfte bzw. ein Drittel des Erlaubten.
 *
 * Gemessen wird deshalb der kleinste TATSAECHLICHE Abstand der gesetzten
 * Haefen. Zehn Punkte sind 45 Vergleiche, gerechnet einmal je
 * Platzierungswechsel — nichts, was in eine Frame-Schleife gehoert.
 *
 * Und zwar in der MAXIMUMSNORM, nicht euklidisch: die Klickflaeche ist ein
 * achsenparalleles Quadrat, zwei davon decken sich genau dann, wenn BEIDE
 * Achsabstaende kleiner sind als die Seite. Gemessen auf 2K mit zehn Haefen
 * lagen zwei Mittelpunkte 116 px auseinander (dx 80, dy 84) — euklidisch reichte
 * das fuer 96 px Seite, in Wirklichkeit deckten sich die beiden.
 *
 * Zwei Deckel darueber:
 *   • `VOYAGE_SITE_HIT_MAX` — sonst stuenden auf 4K 180-px-Marken.
 *   • `VOYAGE_SITE_MAX_SPAN_FRACTION x box.h` — bindet, wenn nur EIN Hafen da
 *     ist und es gar keinen Abstand zu messen gibt.
 *
 * Und ein Boden: `VOYAGE_SITE_HIT_MIN` ist der bisherige feste Wert. Die
 * dichteste Galaxie steht damit nie schlechter da als vorher —
 * `voyagesAtlasLayout.spec.ts` bindet diesen Boden an den garantierten
 * Hafenabstand aus `voyageBerthsOf`.
 */
export function voyageMarkerSizeFor(
  sites: readonly { x: number; y: number }[],
  box: { w: number; h: number },
): VoyageMarkerSize {
  let closest = Number.POSITIVE_INFINITY
  for (let i = 0; i < sites.length; i++) {
    for (let j = i + 1; j < sites.length; j++) {
      const dx = Math.abs(sites[i].x - sites[j].x) * box.w
      const dy = Math.abs(sites[i].y - sites[j].y) * box.h
      closest = Math.min(closest, Math.max(dx, dy))
    }
  }

  const span = Math.min(closest, box.h * VOYAGE_SITE_MAX_SPAN_FRACTION)
  const hit = Math.round(
    Math.min(VOYAGE_SITE_HIT_MAX, Math.max(VOYAGE_SITE_HIT_MIN, span - VOYAGE_SITE_HIT_GAP)),
  )
  const plate = hit - VOYAGE_SITE_PLATE_INSET
  return { hit, plate, dot: Math.round(plate * VOYAGE_SITE_DOT_RATIO) }
}

/**
 * Immer die ID des VERTRAGS, nie die der Mission: `startExpedition` trägt die
 * Slot-ID als `configId` weiter. Eine Marke, die vom Vertrag zur laufenden
 * Mission wird, behält damit Schlüssel, Rang und Platz — sie ändert ihr
 * Aussehen, nicht ihren Ort.
 */
export function pinKeyOf(entry: AvailableExpeditionSlot | ExpeditionMission): string {
  return 'configId' in entry && entry.configId ? entry.configId : entry.id
}

/**
 * Auslegezeit aus `avail-${tier}-${now}-${rand}` (siehe `_spawnOneExpedition`).
 *
 * Das Muster wird GANZ geprüft, nicht nur Segment 2 herausgeschnitten: eine
 * Badge-Lab-Mission heisst `badgelab-exp-<now>-<i>` und lieferte dort sonst
 * ihren Laufindex als Zeitstempel — also eine 1, die vor jedem echten Vertrag
 * sortiert.
 *
 * Was nicht wie eine Slot-ID aussieht, gilt als ZULETZT ausgelegt. `assignVoyage-
 * Berths` vergibt von innen nach aussen; wer vorn sortiert, verdraengt alle
 * anderen um einen Platz. Ganz hinten verdraengt niemand.
 */
const SLOT_ID_RE = /^avail-[a-z]+-(\d+)-\d+$/

export function pinStampOf(pinKey: string): number {
  const match = SLOT_ID_RE.exec(pinKey)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

export interface VoyagePinEntry {
  pinKey: string
  stamp: number
}

/**
 * Deterministisch, kollisionsfrei und — die Eigenschaft, auf die es ankommt —
 * MONOTON: der Platz eines Eintrags haengt nur von Eintraegen ab, die VOR ihm
 * ausgelegt wurden.
 *
 * Vergeben wird nach Auslegezeit auf den NIEDRIGSTEN freien Platz, nicht auf
 * einen aus der ID gestreuten. `voyageBerthsOf` liefert die Plaetze per
 * Farthest-Point-Sampling, also nach Isoliertheit sortiert: Platz 0 ist der
 * einsamste. Wer streut, verschenkt genau das — mit zwei Vertraegen laegen sie
 * womoeglich nebeneinander, obwohl die halbe Galaxie frei ist.
 *
 * Ohne die Sortierung nach Auslegezeit waere die Monotonie falsch. Die
 * Reihenfolge in `availableExpeditions` ist keine Garantie, und ein neuer
 * Vertrag, der die Plaetze der bestehenden umwuerfelt, liesse die halbe Karte
 * huepfen.
 */
export function assignVoyageBerths(
  entries: VoyagePinEntry[],
  slots: number = VOYAGE_SITE_SLOTS,
): Map<string, number> {
  const out = new Map<string, number>()
  if (slots <= 0) return out

  const order = [...entries].sort(
    (a, b) => a.stamp - b.stamp || (a.pinKey < b.pinKey ? -1 : a.pinKey > b.pinKey ? 1 : 0),
  )
  const taken = new Set<number>()
  let overflow = 0
  for (const entry of order) {
    let berth = -1
    for (let i = 0; i < slots; i++) {
      if (!taken.has(i)) {
        berth = i
        break
      }
    }
    // Ueberzaehlig. Im Spiel unerreichbar — `slots` IST der Rang-Deckel (5
    // Angebote + 5 Missionen, EXPEDITION_LEDGER_RANKS) —, aber ein Admin-Panel
    // oder eine spaetere Rangstufe koennte es. Dann reihum verteilen statt
    // alles auf denselben Platz zu stapeln: sichtbar ueberlappen ist ein
    // Fehler, den man sieht, ein Stapel sieht aus wie ein verlorener Vertrag.
    if (berth < 0) berth = overflow++ % slots
    taken.add(berth)
    out.set(entry.pinKey, berth)
  }
  return out
}
