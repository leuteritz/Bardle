// Geteilte Geometrie des herabhängenden Mittel-Ovals im Header.
//
// Gemessen wird sie dort, wo sie entsteht — im AppHeader, der das Panel rendert
// und ohnehin bei jedem Resize nachmisst. Gelesen wird sie von den
// Star-Timer-Bars, die darunter hängen und ihre Enden an die Bogenkante legen.
//
// Der Umweg über einen geteilten Ref statt einer CSS-Variablen ist nötig, weil
// die Bars nicht die Kante an EINER Stelle brauchen, sondern die Kurve: jede
// Zeile liegt tiefer und trifft den Bogen an einer anderen Breite. Das ist eine
// Wurzelrechnung, die in CSS nicht zuverlässig verfügbar ist.
import { shallowRef } from 'vue'
import type { HeaderCenterArc } from '@/utils/orbit/geometry'

const arc = shallowRef<HeaderCenterArc | null>(null)

function sameArc(a: HeaderCenterArc | null, b: HeaderCenterArc | null): boolean {
  if (a === null || b === null) return a === b
  return a.cx === b.cx && a.rx === b.rx && a.ry === b.ry && a.topOffset === b.topOffset
}

export function useHeaderCenterArc() {
  return {
    headerCenterArc: arc,
    /**
     * Unverändert gemessene Werte lösen bewusst kein Update aus: Ein
     * ResizeObserver feuert auch, wenn sich am Header nur die Position
     * verschoben hat, und jede Wertänderung zieht hier eine Neuberechnung
     * sämtlicher Balkenbreiten nach sich.
     */
    setHeaderCenterArc(next: HeaderCenterArc | null): void {
      if (!sameArc(arc.value, next)) arc.value = next
    },
  }
}
