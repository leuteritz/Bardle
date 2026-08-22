/**
 * Ein Text, zerlegt in Treffer und Nicht-Treffer.
 *
 * Stand als lokale Funktion in `EncyclopediaPanel.vue`, solange es genau ein
 * Suchfeld mit Hervorhebung gab. Die Forge-Suche stellt dieselbe Frage an
 * dieselbe Art Text — zwei Fassungen liefen beim ersten Feinschliff (Groß-/
 * Kleinschreibung, leere Query) auseinander.
 */
export interface TextSegment {
  text: string
  hit: boolean
}

/** `query` wird als bereits normalisiert (klein, getrimmt) erwartet. */
export function highlightSegments(text: string, query: string): TextSegment[] {
  if (!query) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const segments: TextSegment[] = []
  let index = 0
  while (index < text.length) {
    const found = lower.indexOf(query, index)
    if (found < 0) {
      segments.push({ text: text.slice(index), hit: false })
      break
    }
    if (found > index) segments.push({ text: text.slice(index, found), hit: false })
    segments.push({ text: text.slice(found, found + query.length), hit: true })
    index = found + query.length
  }
  return segments
}
