/**
 * Was an der Vorsehungs-Stelle des Kopfbands steht.
 *
 * Zwei Ablesungen oder EINE breite — nie eineinhalb: eine entfernte Achse
 * liesse `providenceEffectLines` eine Zeile aus, und die Reihe risse mitten
 * entzwei.
 *
 * Als reine Funktion aus demselben Grund wie `buildUniverseChronicle`: ein
 * Computed in der Ansicht laesst sich nicht binden, und der Reiter hat keine
 * Mount-Tests.
 */
import {
  PROVIDENCE_DOMAIN_LABELS,
  providenceAxisByName,
  providenceEffectLines,
} from '@/config/progression/providences'
import type { ProvidenceEffectLine, RolledProvidence } from '@/types'

export interface UniverseProvidenceInput {
  /** Der Wurf der GEZEIGTEN Bahn — der aktive aus dem Store oder der archivierte. */
  roll: RolledProvidence | null
  /** Ihr Name. Er ueberlebt auch dort, wo der Wurf fehlt. */
  name: string | null
  isHere: boolean
}

export interface UniverseProvidenceReading {
  /** Leer oder GENAU zwei. */
  lines: ProvidenceEffectLine[]
  /** Die breite Ablesung — steht genau dann, wenn `lines` leer ist. */
  fallback: { value: string; key: string } | null
}

export function universeProvidenceReading(
  input: UniverseProvidenceInput,
): UniverseProvidenceReading {
  const lines = input.roll ? providenceEffectLines(input.roll) : []
  if (lines.length === 2) return { lines, fallback: null }

  if (!input.name) {
    const key = input.isHere ? 'No providence drawn' : 'No providence recorded'
    return { lines: [], fallback: { value: '—', key } }
  }

  // Der Name haengt an der BUFF-Achse — ohne Zahlen sagt er wenigstens, worueber
  // diese Vorsehung regierte.
  const axis = providenceAxisByName(input.name)
  const key = axis ? `${PROVIDENCE_DOMAIN_LABELS[axis.domain]} providence` : 'Providence'
  return { lines: [], fallback: { value: input.name, key } }
}
