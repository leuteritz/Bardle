// Non-reactive Map, von useStarSystem pro Frame gefüllt — auch dann, wenn der
// Idle-Layer gerade nichts zeichnet (Bard-Profil offen).
//
// Der Salven-Takt der Sterne in StarSystemComponent lief früher über die
// Render-Liste `starRenders` und stand damit still, sobald nicht gezeichnet
// wurde. Diese Map trägt genau die Felder, die der Kampf braucht, und
// entkoppelt ihn von der Ausgabe.
export interface StarCombatState {
  /** Bildschirmposition des Sterns — Startpunkt der Projektile. */
  x: number
  y: number
  /** Stern steht hinter der Sonne → feuert nicht. */
  isBehind: boolean
  /** Noch nicht befreite, sichtbare Planeten — bestimmt die Schusszahl der Salve. */
  firablePlanets: number
}

export const activeStarCombatState = new Map<string, StarCombatState>()
