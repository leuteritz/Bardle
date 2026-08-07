// Element-Register für Per-Frame-DOM-Updates am Vue-Rendering vorbei.
//
// Muster: Vue rendert nur bei STRUKTURELLEN Änderungen (Körper kommt/geht,
// Ebenenwechsel, Zustandsklasse wechselt). Die 60fps-Werte — transform und
// opacity — schreibt der rAF-Loop direkt auf die hier registrierten Elemente.
// Ohne das läuft pro Frame ein kompletter VNode-Diff samt Style-Patch über
// jeden Orbit-Körper und seinen Teilbaum; gemessen war das der größte Posten
// im Idle-Orbit (Style-Recalc über hunderte Elemente pro Frame, obwohl sich
// nur eine Handvoll Körper bewegt).
//
// Verwendet von StarSystemComponent, ChampionOrbit und PlanetOrbit.
import type { ComponentPublicInstance } from 'vue'

export type FrameElRef = Element | ComponentPublicInstance | null | undefined

/**
 * Registriert das Element eines `v-for`-Eintrags unter seiner ID.
 *
 * Beim Ebenenwechsel (vorne ↔ hinter der Sonne) feuert der alte null-Ref NACH
 * dem neuen Set-Ref — deshalb wird nur gelöscht, wenn das gespeicherte Element
 * wirklich aus dem Dokument verschwunden ist.
 */
export function setMapEl<T extends Element>(map: Map<string, T>, id: string, el: FrameElRef): void {
  if (el) {
    map.set(id, el as unknown as T)
  } else {
    const cur = map.get(id)
    if (cur && !cur.isConnected) map.delete(id)
  }
}

/**
 * Räumt Einträge auf, deren Element nicht mehr im Dokument hängt.
 *
 * Elemente in einer `<Transition>` bleiben beim Unmount kurz verbunden und
 * würden sonst als verwaiste Einträge liegen bleiben. Wird periodisch statt
 * pro Frame aufgerufen — siehe FRAME_EL_SWEEP_INTERVAL.
 */
export function sweepMapEls(maps: Map<string, Element>[]): void {
  for (const map of maps) {
    for (const [id, el] of map) {
      if (!el.isConnected) map.delete(id)
    }
  }
}
