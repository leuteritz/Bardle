/* ── Archiv-Nachtrag für übersprungene Galaxien ───────────────────────────────
   Ein Admin-Sprung überspringt Läufe, die es nie gab. Hier entsteht für jeden
   ein glaubwürdiger `CompletedGalaxyRecord` — gerettete und verlorene Sterne,
   eigene Karte, eigene Laufzeit, und je Stern ein Manifest.

   Das Manifest war einmal ausgespart, mit dem Argument, ein erfundener Champion
   sei keine Lücke, sondern eine Falschaussage. Dagegen steht, was der Spieler
   sieht: eine Karte, die in nachgetragenen Galaxien stumm bleibt — und
   nachgetragen sind sie erst nach einem Admin-Sprung, „Max Everything" oder
   „Force Complete", also immer in einem Spielstand, den ohnehin ein Werkzeug
   gebaut hat. Der Nachtrag ist deshalb vollständig.

   Rein und ohne Store-Zugriff (der Record nur als Typ importiert), damit die
   Spec ohne Pinia läuft — dasselbe Muster wie `utils/fx/galaxySnapshot.ts`.
   Der Zufall kommt aus `seededRng` über die Galaxienummer: derselbe Sprung
   liefert immer dasselbe Archiv, und die Minimap wird daraus deterministisch
   nachgezeichnet. */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  ADMIN_ARCHIVE_SEED_SALT,
  ADMIN_ARCHIVE_CHIMES_PER_DEPTH,
  ADMIN_ARCHIVE_CHIMES_PER_WORLD,
  ADMIN_ARCHIVE_FAIL_RATE_MAX,
  ADMIN_ARCHIVE_FAIL_RAMP_GALAXIES,
  ADMIN_ARCHIVE_SECONDS_PER_STAR,
  ADMIN_ARCHIVE_DURATION_JITTER,
  DRIFTER_RARITY_ORDER,
  GALAXY_INCIDENT_BACKFILL_DRIFTER_MAX,
  GALAXY_INCIDENT_BACKFILL_DRIFTER_MIN,
  GALAXY_INCIDENT_BACKFILL_VOID_MAX,
  GALAXY_INCIDENT_DRIFTER_MIN_RANK,
  GALAXY_INCIDENT_MAX,
  CHAMPION_STAR_DURATION_MS,
  MS_PER_SECOND,
  STAR_EXTRA_PLANET_MIN,
  STAR_EXTRA_PLANET_RANGE,
} from '@/config/constants'
import { CHAMPION_ROLES } from '@/config/champions/championData'
import { VOID_RIFTS, VOID_RIFT_SEVERITIES } from '@/config/world/void'
import { DRIFTERS } from '@/config/world/drifters'
import { CHAMPION_HOME_PLANETS } from '@/config/champions/championHomePlanets'
import {
  getChampionStarLevel,
  unlockedChampionTierCount,
} from '@/config/champions/championTiers'
import { galaxyDepth } from '@/utils/game/galaxyDepth'
import { landfallsOfRun } from '@/utils/game/landfalls'
import { drawUnique } from '@/utils/game/voyageLegs'
import type { CompletedGalaxyRecord, StarAttemptResult } from '@/stores/world/galaxyStore'
import type { GalaxyIncident, LandfallOutcome, StarManifest } from '@/types'

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
 * Eigener rng-Strom für die Manifeste, aus demselben Grund wie bei den Orten:
 * ein gemeinsamer Strom liesse Sternpech, Ortspech und Championwahl im
 * Gleichschritt laufen. Ein Zug aus `backfillRng` wäre ausserdem teuer — er
 * verschiebt `mapSeed`, und daran hängen Kartengeometrie, Sternnamen und jede
 * Landfall-Lage.
 */
export function backfillManifestRng(galaxy: number): Rng {
  return seededRng(galaxy * ADMIN_ARCHIVE_SEED_SALT + 2311)
}

/**
 * Die Manifeste eines nachgetragenen Laufs — ein Eintrag je Versuch, gleiche
 * Länge, gleicher Index wie `attemptResults`. Genau diese Gleichheit ist der
 * Vertrag des Manifests.
 *
 * Der Champion kommt aus dem Kader, den die Galaxie damals überhaupt hergegeben
 * hätte (`unlockedChampionTierCount`) — ein Tier-6-Name in Galaxie 2 fällt sofort
 * als erfunden auf. Innerhalb EINES Laufs zieht `drawUnique` keinen zweimal;
 * über Galaxien hinweg schon, denn `buildBackfillRecord` ist rein und kennt die
 * Nachbarläufe nicht — der Kader reicht für fünfzig Galaxien nicht.
 *
 * `heldSec` ist beim verlorenen Stern KEINE Zufallszahl: ein Stern geht
 * verloren, WEIL sein Fenster abläuft. Alles andere wäre ein Widerspruch zur
 * eigenen Uhr, die die Karte daneben zeichnet.
 */
export function buildBackfillManifests(
  galaxy: number,
  results: readonly StarAttemptResult[],
  rng: Rng,
): StarManifest[] {
  const unlocked = unlockedChampionTierCount(galaxy)
  const pool = CHAMPION_HOME_PLANETS.filter(
    (c) => getChampionStarLevel(c.championName) <= unlocked,
  ).map((c) => c.championName)
  const used = new Set<string>()
  const windowSec = Math.round(CHAMPION_STAR_DURATION_MS / MS_PER_SECOND)
  const depthMult = 1 + galaxyDepth(galaxy) * ADMIN_ARCHIVE_CHIMES_PER_DEPTH

  return results.map((outcome) => {
    const champion = drawUnique(pool, used, rng)
    const planets = 1 + STAR_EXTRA_PLANET_MIN + Math.floor(rng() * STAR_EXTRA_PLANET_RANGE)
    const lost = outcome === 'failed'
    const cleared = lost ? 1 + Math.floor(rng() * (planets - 1)) : planets
    const jitter = 1 + (rng() * 2 - 1) * ADMIN_ARCHIVE_DURATION_JITTER
    return {
      champion,
      role: CHAMPION_ROLES[champion],
      planets,
      cleared,
      chimes: Math.max(
        1,
        Math.round(cleared * ADMIN_ARCHIVE_CHIMES_PER_WORLD * depthMult * jitter),
      ),
      // Gerettet: irgendwo im Fenster, nie ganz am Rand — ein Lauf, der auf die
      // Sekunde genau endete, ist die Ausnahme, nicht der Regelfall.
      heldSec: lost ? windowSec : Math.round(windowSec * (0.2 + rng() * 0.65)),
      windowSec,
    }
  })
}

/**
 * Eigener Strom für die Ereignisse, aus demselben Grund wie bei Orten und
 * Manifesten: ein gemeinsamer liesse Sternpech, Ortspech, Championwahl und
 * Void-Pech im Gleichschritt laufen.
 */
export function backfillIncidentRng(galaxy: number): Rng {
  return seededRng(galaxy * ADMIN_ARCHIVE_SEED_SALT + 3719)
}

/** Gewichtete Wahl aus einem Katalogausschnitt — dasselbe Verfahren, mit dem der
 *  `voidStore` innerhalb einer Schwere zieht. */
function pickWeighted<T extends { weight: number }>(pool: readonly T[], rng: Rng): T | null {
  if (!pool.length) return null
  const total = pool.reduce((sum, d) => sum + d.weight, 0)
  let roll = rng() * total
  for (const def of pool) {
    roll -= def.weight
    if (roll <= 0) return def
  }
  return pool[pool.length - 1]
}

/**
 * Die Ereignis-Chronik eines nachgetragenen Laufs.
 *
 * Nachgetragen wird nur, was NIE gebucht wurde — ein leeres `incidentResults`
 * ist eine Aussage („nichts kam durch") und bleibt leer; die Entscheidung
 * darüber trifft der Aufrufer.
 *
 * Die Ziehreihenfolge ist FEST: Zahl der Einschläge, je Einschlag Etappe /
 * Schwere / Typ, dann Zahl der Drifter, je Drifter Etappe / Typ / Ausgang. Eine
 * eingeschobene Ziehung schreibt jede nachgetragene Galaxie um.
 *
 * `hp` und `meeps` bleiben leer: eine erfundene Zahl behauptet mehr, als der
 * Nachtrag wissen kann — die Hover-Karte lässt die Chips dann weg.
 */
export function buildBackfillIncidents(
  galaxy: number,
  results: readonly StarAttemptResult[],
  rng: Rng,
): GalaxyIncident[] {
  const ramp = Math.min(1, Math.max(0, galaxy - 1) / ADMIN_ARCHIVE_FAIL_RAMP_GALAXIES)
  const legs = results.length
  const out: GalaxyIncident[] = []

  // Galaxie 1 bekommt keinen Einschlag: dort ist der Void noch gar nicht
  // freigeschaltet, und `backfillFailCount` setzt aus demselben Grund 0.
  const voidCount =
    galaxy <= 1
      ? 0
      : Math.min(
          GALAXY_INCIDENT_MAX,
          Math.round(GALAXY_INCIDENT_BACKFILL_VOID_MAX * ramp * (0.4 + rng() * 1.2)),
        )
  // Die Schwere wächst mit: früh nur `lesser`, erst spät bis `abyssal`. Ein
  // abyssaler Einschlag in Galaxie 2 fällt sofort als erfunden auf — dasselbe
  // Argument, mit dem der Manifest-Nachtrag seinen Kader klemmt.
  const maxSeverity = Math.floor(ramp * (VOID_RIFT_SEVERITIES.length - 1) + 1e-9)
  const riftPool = VOID_RIFTS.filter(
    (r) => VOID_RIFT_SEVERITIES.indexOf(r.severity) <= maxSeverity,
  )
  for (let i = 0; i < voidCount; i++) {
    const leg = Math.floor(rng() * (legs + 1))
    const severity = VOID_RIFT_SEVERITIES[Math.floor(rng() * (maxSeverity + 1))]
    const def = pickWeighted(
      riftPool.filter((r) => r.severity === severity),
      rng,
    )
    if (def) out.push({ kind: 'void-impact', leg, id: def.id })
  }

  const drifterPool = DRIFTERS.filter(
    (d) => (DRIFTER_RARITY_ORDER[d.rarity] ?? 0) >= GALAXY_INCIDENT_DRIFTER_MIN_RANK,
  )
  const span = GALAXY_INCIDENT_BACKFILL_DRIFTER_MAX - GALAXY_INCIDENT_BACKFILL_DRIFTER_MIN
  const drifterCount = Math.min(
    GALAXY_INCIDENT_MAX,
    GALAXY_INCIDENT_BACKFILL_DRIFTER_MIN + Math.round(span * ramp * (0.5 + rng())),
  )
  // Verpasst mit derselben Fehlerrate wie die Orte — ein Archiv, in dem jeder
  // Drifter gefangen wurde, liest sich falsch.
  const missRate = ADMIN_ARCHIVE_FAIL_RATE_MAX * ramp
  for (let i = 0; i < drifterCount; i++) {
    const leg = Math.floor(rng() * (legs + 1))
    const def = pickWeighted(drifterPool, rng)
    const missed = rng() < missRate
    if (def) out.push({ kind: missed ? 'drifter-missed' : 'drifter-caught', leg, id: def.id })
  }

  // Chronologisch, so wie sie im echten Spiel entsteht.
  return out.sort((a, b) => a.leg - b.leg)
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
    incidentResults: buildBackfillIncidents(
      galaxy,
      attemptResults,
      backfillIncidentRng(galaxy),
    ),
    starManifests: buildBackfillManifests(galaxy, attemptResults, backfillManifestRng(galaxy)),
    durationSeconds: Math.round(attemptResults.length * ADMIN_ARCHIVE_SECONDS_PER_STAR * jitter),
    completedAt,
  }
}
