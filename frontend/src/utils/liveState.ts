// Gemeinsamer Ablageort für flüchtigen Laufzeit-Zustand, der pro Frame
// geschrieben und quer über Stores, Composables und Komponenten gelesen wird.
//
// Bewusst außerhalb von Pinia: diese Werte wandern nie in den Spielstand und
// sollen kein Reaktivitäts-Update pro Frame auslösen. Einzige Ausnahme ist
// `activeChampionBehindState`, dessen Ergebnis direkt das Rendering steuert.
import { reactive } from 'vue'
import type { MidCurseType } from '../types'

/** Bildschirmposition eines Orbit-Körpers — Ziel- bzw. Startpunkt für Projektile. */
export interface OrbitScreenPosition {
  cx: number
  cy: number
  isForeground: boolean
}

/** Champion-Name → steht der Champion gerade hinter der Sonne? Pro Frame von ChampionOrbit gesetzt. */
export const activeChampionBehindState = reactive<Record<string, boolean>>({})

/** Gegner-Planeten, mit 60fps aus useStarSystem / PlanetOrbit befüllt. Quelle für Projektil-Ziele. */
export const activePlanetPositions = new Map<string, OrbitScreenPosition>()

/** Spieler-Planeten, mit 60fps aus PlanetOrbit befüllt. Ziel-Auswahl für gegnerische Projektile. */
export const activePlayerPlanetPositions = new Map<string, OrbitScreenPosition>()

/** Aktiver Mid-Fluch — Typ und Ablaufzeitpunkt (ms-Timestamp). */
export const activeMidCurse: {
  type: MidCurseType | null
  activeUntil: number
} = { type: null, activeUntil: 0 }

// Von useStarSystem pro Frame gefüllt — auch dann, wenn der Idle-Layer gerade
// nichts zeichnet (Bard-Profil offen). Der Salven-Takt der Sterne in
// StarSystemComponent lief früher über die Render-Liste `starRenders` und stand
// damit still, sobald nicht gezeichnet wurde. Diese Map trägt genau die Felder,
// die der Kampf braucht, und entkoppelt ihn von der Ausgabe.
export interface StarCombatState {
  /** Bildschirmposition des Sterns — Startpunkt der Projektile. */
  x: number
  y: number
  /** Stern steht hinter der Sonne → feuert nicht. */
  isBehind: boolean
  /**
   * Fortschritt durch die laufende Verdeckung: 0 beim Eintauchen, 1 beim
   * Wiederauftauchen, -1 im Vordergrund. Aus dem Bahnwinkel abgeleitet und
   * damit unabhängig vom Tempo, das hinter der Sonne hochgelerpt wird.
   */
  eclipseProgress: number
  /** Verbleibende Dauer der Verdeckung in ms — 0, wenn der Stern sichtbar ist. */
  eclipseRemainingMs: number
  /** Noch nicht befreite, sichtbare Planeten — bestimmt die Schusszahl der Salve. */
  firablePlanets: number
}

export const activeStarCombatState = new Map<string, StarCombatState>()
