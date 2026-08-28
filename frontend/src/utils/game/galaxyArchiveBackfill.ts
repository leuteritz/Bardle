/* ── Archiv-Nachtrag für übersprungene Galaxien ───────────────────────────────
   Ein Admin-Sprung überspringt Läufe, die es nie gab. Hier entsteht für jeden
   ein glaubwürdiger `CompletedGalaxyRecord` — gerettete und verlorene Sterne,
   eigene Karte, eigene Laufzeit.

   Rein und ohne Store-Zugriff (der Record nur als Typ importiert), damit die
   Spec ohne Pinia läuft — dasselbe Muster wie `utils/fx/galaxySnapshot.ts`.
   Der Zufall kommt aus `seededRng` über die Galaxienummer: derselbe Sprung
   liefert immer dasselbe Archiv, und die Minimap wird daraus deterministisch
   nachgezeichnet. */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  ADMIN_ARCHIVE_SEED_SALT,
  ADMIN_ARCHIVE_FAIL_RATE_MAX,
  ADMIN_ARCHIVE_FAIL_RAMP_GALAXIES,
  ADMIN_ARCHIVE_SECONDS_PER_STAR,
  ADMIN_ARCHIVE_DURATION_JITTER,
} from '@/config/constants'
import { landfallsOfRun } from '@/utils/game/landfalls'
import type { CompletedGalaxyRecord, StarAttemptResult } from '@/stores/world/galaxyStore'
import type { LandfallOutcome } from '@/types'

type Rng = () => number

/** Der RNG eines nachgetragenen Laufs — allein aus der Galaxienummer. */
export function backfillRng(galaxy: number): Rng {
  return seededRng(galaxy * ADMIN_ARCHIVE_SEED_SALT + 1)
}

/** Eigener Strom für die Farbwahl, sonst hängen Thema und Verlustzahl aneinander. */
export function backfillThemeRng(galaxy: number): Rng {
  return seededRng(galaxy * ADMIN_ARCHIVE_SEED_SALT + 977)
}

/**
 * Wie viele Sterne dieser Lauf verloren hat. Galaxie 1 keinen — der erste Lauf
 * soll sich im Archiv wie ein sauberer Anfang lesen —, danach steigt der Anteil
 * bis zur Rampe und sättigt.
 */
export function backfillFailCount(galaxy: number, starsRequired: number, rng: Rng): number {
  if (galaxy <= 1) return 0
  const ramp = Math.min(1, (galaxy - 1) / ADMIN_ARCHIVE_FAIL_RAMP_GALAXIES)
  const rate = ADMIN_ARCHIVE_FAIL_RATE_MAX * ramp * (0.4 + rng() * 1.2)
  return Math.max(0, Math.min(starsRequired, Math.round(starsRequired * rate)))
}

/**
 * Die Versuchsreihe eines Laufs. Der LETZTE Eintrag ist immer `'rescued'` — ein
 * Lauf endet auf dem Stern, der die Galaxie abschließt, und die Route im
 * Snapshot läuft von dort zum Kern.
 */
function buildAttempts(rescued: number, failed: number, rng: Rng): StarAttemptResult[] {
  const head: StarAttemptResult[] = [
    ...Array.from({ length: rescued - 1 }, () => 'rescued' as const),
    ...Array.from({ length: failed }, () => 'failed' as const),
  ]
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[head[i], head[j]] = [head[j], head[i]]
  }
  return [...head, 'rescued']
}

/**
 * Eigener rng-Strom für die Orte. Hinge ihr Ausgang am selben Strom wie die
 * Verlustzahl, liefen Sternpech und Ortspech im Gleichschritt — derselbe Fehler,
 * den `backfillThemeRng` schon einmal behoben hat.
 */
export function backfillLandfallRng(galaxy: number): Rng {
  return seededRng(galaxy * ADMIN_ARCHIVE_SEED_SALT + 1523)
}

/**
 * Die Orte eines nachgetragenen Laufs. LAGE und ART kommen aus derselben
 * abgeleiteten Rechnung wie im echten Spiel (`landfallsOfRun` über `mapSeed`);
 * gewürfelt wird hier nur der AUSGANG, mit demselben Fehlanteil wie bei den
 * Sternen — ein Archiv, in dem jeder Ort geglückt ist, liest sich falsch.
 */
export function buildBackfillLandfalls(
  galaxy: number,
  mapSeed: number,
  starsRequired: number,
  actualLegs: number,
  rng: Rng,
): LandfallOutcome[] {
  const geplant = starsRequired + 1
  const ramp = Math.min(1, Math.max(0, galaxy - 1) / ADMIN_ARCHIVE_FAIL_RAMP_GALAXIES)
  const missRate = ADMIN_ARCHIVE_FAIL_RATE_MAX * ramp
  return landfallsOfRun(mapSeed, galaxy, geplant, actualLegs).map((p) => ({
    kind: p.kind,
    cleared: rng() >= missRate,
  }))
}

/**
 * KEIN `starManifests` — und das ist die Aussage, nicht die Lücke.
 *
 * Der Nachtrag erfindet plausible Läufe. Ein erfundener Champion an einem Stern,
 * den nie jemand geflogen ist, wäre keine fehlende Angabe, sondern eine falsche:
 * der Spieler suchte ihn im Shop. Nachgetragene Galaxien fallen deshalb auf
 * dieselbe Karte zurück wie jeder Altbestand — Kopf und Chips, kein Manifest.
 */
export function buildBackfillRecord(
  galaxy: number,
  starsRequired: number,
  themeIndex: number,
  completedAt: number,
): CompletedGalaxyRecord {
  const rng = backfillRng(galaxy)
  const failed = backfillFailCount(galaxy, starsRequired, rng)
  const attemptResults = buildAttempts(starsRequired, failed, rng)
  const jitter = 1 + (rng() * 2 - 1) * ADMIN_ARCHIVE_DURATION_JITTER
  // Die Reihenfolge der Ziehungen aus `rng` ist FEST — `mapSeed` muss vor den
  // Orten fallen, weil ihre Lage daran hängt.
  const mapSeed = Math.floor(rng() * 0xffffffff)

  return {
    galaxy,
    mapSeed,
    themeIndex,
    attemptResults,
    landfallResults: buildBackfillLandfalls(
      galaxy,
      mapSeed,
      starsRequired,
      attemptResults.length + 1,
      backfillLandfallRng(galaxy),
    ),
    durationSeconds: Math.round(attemptResults.length * ADMIN_ARCHIVE_SECONDS_PER_STAR * jitter),
    completedAt,
  }
}
