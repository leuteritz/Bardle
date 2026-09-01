import { getUniverse } from '@/config/progression/universes'
import {
  providenceEffectLines,
  PROVIDENCE_DOMAIN_LABELS,
} from '@/config/progression/providences'
import { HERALD_ARRIVAL_HOLD_MS, HERALD_ACCENT_WARP } from '@/config/constants'
import { universeLabel, hexToRgbTriple } from '@/utils/ui/format'
import type { HeraldPayload } from '@/composables/ui/useHerald'
import type { RolledProvidence } from '@/types'

/**
 * Was der Herold ansagt, wenn ein Aufbruch vollzogen ist.
 *
 * Rein und ZEITFREI, ohne Store — deshalb testbar, waehrend `HeraldOverlay.vue`
 * als Komponente es nicht ist. Dieselbe Trennung wie bei
 * `utils/ui/firmamentChronicle.ts` und `utils/game/voyageTip.ts`.
 *
 * Die Karte beantwortet die zwei Fragen, die nach einem Sprung offen sind: WO
 * man ist (Nummer, Scheibe, Farbton) und WORUNTER man spielt (Vorsehung samt
 * ihren beiden Wirkungen). Was der Durchlauf eingebracht hat, ist die dritte —
 * sie geht als Quittung in die Nebenspur, weil sie ein Ertrag ist und kein Ort.
 */
export function buildArrivalHerald(
  universeId: number,
  providence: RolledProvidence | null,
): HeraldPayload {
  const universe = getUniverse(universeId)
  const lines = providence ? providenceEffectLines(providence) : []

  return {
    kind: 'universe',
    // Nicht `ARRIVAL`: das Wort meint im ganzen Code die Ankunft an einem
    // STERN (Minimap-Kameradock, Void-Anflug, Voyage-Etappe). Zwei Bedeutungen
    // fuer dasselbe Wort sind im Log und in der Suche nicht mehr zu trennen.
    eyebrow: 'NEW UNIVERSE',
    headline: universeLabel(universeId),
    subline: providence
      ? `${providence.name} · ${PROVIDENCE_DOMAIN_LABELS[providence.domain]}`
      : undefined,
    // Der Ton des Universums traegt die Karte — derselbe, in dem seine Scheibe
    // im Firmament steht. Ohne Eintrag (kann nur ein Datenfehler sein) faellt
    // sie auf den Warp-Akzent zurueck, statt mit einem leeren `--ac` jedes
    // `rgba()` im Banner zu brechen.
    accent: universe ? hexToRgbTriple(universe.tint) : HERALD_ACCENT_WARP,
    universe: universeId,
    // `positive` kommt aus dem ROLL, nicht aus dem Vorzeichen — eine Achse mit
    // `higherIsBetter: false` traegt als Gewinn ein Minus.
    readouts: lines.map((line) => ({
      value: line.value,
      label: line.label,
      positive: line.positive,
    })),
    holdMs: HERALD_ARRIVAL_HOLD_MS,
  }
}
