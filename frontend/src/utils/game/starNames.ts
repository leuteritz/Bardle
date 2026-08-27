/* ── Die Namen der Sterne einer Galaxie ───────────────────────────────────────
   Rein, ohne Store und ohne Uhr, damit die Specs es ohne Pinia pruefen — dasselbe
   Muster wie `voyageLegs.ts` und `voyageLog.ts`. Kein Speicherfeld, keine
   Migration: `mapSeed` und `attemptResults` liegen ohnehin im Spielstand, ein
   Archiv bekommt seine Namen rueckwirkend und behaelt sie.

   EIN Strom fuer die ganze Karte, KEIN Seed je Index. `seededRng` ist ein blanker
   LCG; die erste Ausgabe benachbarter Seeds marschiert in arithmetischer Folge
   durch den Pool (nachgerechnet mit `seed * salt + i * 271`: Bucket 2, 5, 7, 10,
   12, 15, 17, 20 bei 24 Eintraegen). Bei `cairnOffer` faellt das nicht auf — drei
   Ziehungen, danach dekorreliert der Strom. Ueber sechzehn Sterne waere es ein
   sichtbares Muster. Sequenziell aus EINEM Strom gezogen streut es sauber.

   Der Name haengt NICHT am Ausgang. Ein Stern steht auf der Karte, bevor er
   befreit oder verloren ist; zoege 'failed' aus einem anderen Vokabular,
   benennte sich dieselbe Marke um, sobald ein Rettungstimer ablaeuft, und das
   Archiv truege einen Namen, den es im Spiel nie gab.

   Prefix-stabil faellt dabei ab: ein verlorener Stern HAENGT AN `attemptResults`,
   und der Durchgang laeuft von vorn nach hinten — Stern 0..n-1 behalten ihre
   Namen, wenn Stern n dazukommt. Dieselbe Zusage wie `generateGalaxyDots`.

   Die Live-Minimap haelt mit `galaxyStore.mapSeed` und `galaxyStore.attemptResults`
   dieselben zwei Eingaben und koennte `galaxyStarMarksOf` unveraendert uebernehmen. */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { drawUnique } from '@/utils/game/voyageLegs'
import {
  GALAXY_STAR_NAME_ATTRIBUTES,
  GALAXY_STAR_NAME_NOUNS,
  GALAXY_STAR_NAME_SEED_SALT,
} from '@/config/constants'
import type { StarAttemptResult } from '@/stores/world/galaxyStore'

export interface GalaxyStarMark {
  /** Versuchsnummer, null-basiert — zugleich die Etappe und die Sprite-Variante. */
  index: number
  name: string
  outcome: StarAttemptResult
}

/**
 * Nur die Namen. Der Ausgang spielt hier bewusst keine Rolle — wer ihn braucht,
 * nimmt `galaxyStarMarksOf`.
 */
export function galaxyStarNamesOf(mapSeed: number, count: number): string[] {
  const rng = seededRng((mapSeed ^ GALAXY_STAR_NAME_SEED_SALT) >>> 0)
  // Zwei Merkmengen: Attribut und Substantiv erschoepfen sich getrennt, sonst
  // sperrte ein verbrauchtes Attribut das Substantiv gleich mit.
  const usedAttr = new Set<string>()
  const usedNoun = new Set<string>()
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const attr = drawUnique(GALAXY_STAR_NAME_ATTRIBUTES, usedAttr, rng)
    const noun = drawUnique(GALAXY_STAR_NAME_NOUNS, usedNoun, rng)
    out.push(`${attr} ${noun}`)
  }
  return out
}

/** Namen plus Ausgang, in Versuchsreihenfolge. */
export function galaxyStarMarksOf(
  mapSeed: number,
  results: readonly StarAttemptResult[],
): GalaxyStarMark[] {
  const names = galaxyStarNamesOf(mapSeed, results.length)
  return results.map((outcome, index) => ({ index, name: names[index], outcome }))
}
