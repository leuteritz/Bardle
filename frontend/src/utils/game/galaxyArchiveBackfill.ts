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
import type { CompletedGalaxyRecord, StarAttemptResult } from '@/stores/world/galaxyStore'

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

  return {
    galaxy,
    mapSeed: Math.floor(rng() * 0xffffffff),
    themeIndex,
    attemptResults,
    durationSeconds: Math.round(attemptResults.length * ADMIN_ARCHIVE_SECONDS_PER_STAR * jitter),
    completedAt,
  }
}
