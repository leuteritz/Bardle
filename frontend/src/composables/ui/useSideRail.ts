import { onBeforeUnmount, ref, unref, watch, type Ref } from 'vue'

/**
 * Die Mechanik einer auf- und zuklappbaren Detailleiste — EINMAL fuer alle
 * vier Reiter (Skill Tree, Planets, Voyages, Universe).
 *
 * **Sie besitzt den Zustand NICHT.** Das ist kein Versehen: `detailsOpen` der
 * Forge lebt als Modul-Singleton in `useForgeDetailsPane` und muss den
 * Tabwechsel ueberleben, waehrend die drei anderen Reiter ein lokales `ref`
 * fuehren. Ein Composable, das den Zustand selbst haelt, muesste dieses
 * Singleton verdraengen oder doppelt fuehren.
 *
 * Geteilt ist deshalb nur, was ueberall gleich ist:
 *   - das um `slideMs` VERZOEGERTE `inert`
 *   - die Breitenmessung samt der Regel, die 0 eines versteckten Reiters zu
 *     verwerfen
 *
 * **Die Politik bleibt beim Aufrufer** und darf es auch: Voyages misst am
 * Atlas und startet OFFEN (ohne die Liste waehlt man keine Galaxie), die Forge
 * startet ZU (der Baum ist der Grund, den Reiter zu oeffnen), und Escape
 * oeffnet im einen Reiter, waehrend es im anderen schliesst. Wer das hier
 * vereinheitlicht, nimmt jedem Reiter seine Begruendung.
 */
export function useSideRail(opts: {
  /** Der Faltzustand des Aufrufers. Nur gelesen — hier wird nichts gesetzt. */
  folded: Ref<boolean> | (() => boolean)
  /** Die Fahrtdauer DIESES Reiters. Nicht geteilt: gleiche Herleitung, eigenes Budget. */
  slideMs: number
  /** Fehlt sie, misst der Reiter nicht — die Forge faltet sich nie selbst. */
  autofoldW?: number
  /** Wohin gemessen wird. Das Ref gehoert dem Reiter, weil sein `folded`
   *  daraus rechnet — es zurueckzugeben ergaebe einen Zirkel. */
  narrow?: Ref<boolean>
}): {
  /** Der Fokus, VERZOEGERT nachgezogen. Ans fahrende Panel binden. */
  inert: Ref<boolean>
  /** Den zu messenden Container anmelden — Voyages den Atlas, sonst die Wurzel.
   *  Idempotent: ein zweiter Aufruf legt keinen zweiten Beobachter an. */
  observe: (el: HTMLElement | null) => void
  /** Wieder abmelden. Die Reiter haengen die Messung an die SICHTBARKEIT,
   *  nicht ans Leben — ein versteckter Reiter soll nichts messen. */
  unobserve: () => void
} {
  // Der Startwert kommt aus dem Faltzustand selbst, nicht aus `false`: eine
  // Leiste, die eingeklappt startet, ist von der ersten Sekunde an unbedienbar
  // — sonst liefe die Tabulatorreihenfolge durch ein Dutzend Knoepfe, die
  // niemand sieht.
  const inert = ref(typeof opts.folded === 'function' ? opts.folded() : unref(opts.folded))

  /*
   * Den Fokus nimmt `inert`, aber VERZOEGERT: synchron gesetzt liegt seine
   * Arbeit im ersten Frame der Fahrt, und dort ist der Ruck am sichtbarsten
   * (im Skill Tree gemessen 39 gegen 25 ms laengster Einzelframe).
   */
  let timer: ReturnType<typeof setTimeout> | null = null
  // `immediate`, weil eine Leiste auch von AUSSEN aufgehen kann: der Sprung aus
  // dem Voyages-Reiter ruft `openDetails()`, bevor der Skill Tree ueberhaupt
  // montiert ist. Ein reiner Flankenwatcher liesse `inert` dann auf seinem
  // Startwert stehen, und die ausgefahrene Spalte waere vollstaendig unbedienbar.
  watch(
    opts.folded,
    (folded) => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        inert.value = folded
      }, opts.slideMs)
    },
    { immediate: true },
  )

  let observer: ResizeObserver | null = null
  function observe(el: HTMLElement | null): void {
    if (!el || observer || opts.autofoldW === undefined) return
    const threshold = opts.autofoldW
    observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      // Die 0 eines versteckten Reiters verwerfen — sonst spraenge die Leiste
      // beim Zurueckkehren einen Frame lang auf die eingeklappte Breite.
      if (w > 0 && opts.narrow) opts.narrow.value = w < threshold
    })
    observer.observe(el)
  }

  function unobserve(): void {
    observer?.disconnect()
    observer = null
  }

  onBeforeUnmount(() => {
    if (timer !== null) clearTimeout(timer)
    unobserve()
  })

  return { inert, observe, unobserve }
}
