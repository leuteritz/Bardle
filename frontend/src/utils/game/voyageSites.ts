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
import { VOYAGE_BERTH_CANDIDATE_POOL, VOYAGE_SITE_SLOTS } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { AvailableExpeditionSlot, ExpeditionMission } from '@/types'

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
 * bei einer Klickfläche von VOYAGE_SITE_HIT_PX deckten sich zwei Häfen. Mehr
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
  const { dots } = generateGalaxyDots(record.mapSeed, attempts + 1)
  const history = dots.slice(0, attempts)

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
