// ── Vordergrund-Gate für Kampf-Interaktionen ────────────────────────────────
// Kampf passiert nur im Sonnen-Vordergrund: Objekte hinter der Sonne greifen
// nicht an und werden nicht getroffen. Cooldowns laufen normal weiter — eine
// bei 0 angekommene Fähigkeit WARTET, bis Akteur und Ziel wieder sichtbar
// sind. Das gilt auch bei offenem Star-Fight-Modal und bei offenem Bard-Profil:
// die Orbit-Simulation läuft dort weiter (nur das Zeichnen ruht), die Positionen
// sind also aktuell und das Gate greift wie im sichtbaren Zustand.
//
// Nur bei echtem Stillstand — Tab im Hintergrund, Fenster ohne Fokus, Spiel
// pausiert — gelten alle Objekte als im Vordergrund: dort stehen die
// Orbit-Positionen still und dürften den Kampf nicht dauerhaft blockieren.
import {
  activeChampionBehindState,
  activePlayerPlanetPositions,
  activePlanetPositions,
  activeStarCombatState,
} from './liveState'
import { useRenderingPaused } from '@/composables/useRenderingPaused'

function idleOrbitLive(): boolean {
  const { isIdleSimulationPaused } = useRenderingPaused()
  return !isIdleSimulationPaused.value
}

/** Orbit-Champion sichtbar? (true auch ohne Tracking-Eintrag/Namen) */
export function championInForeground(name: string | null | undefined): boolean {
  if (!name || !idleOrbitLive()) return true
  return !activeChampionBehindState[name]
}

/** Spieler-Planet-Slot sichtbar? (true, wenn keine Position getrackt ist) */
export function playerSlotInForeground(slotId: string): boolean {
  if (!idleOrbitLive()) return true
  const pos = activePlayerPlanetPositions.get(slotId)
  return pos ? pos.isForeground : true
}

/** Boss-Planet (Stern-Planet) sichtbar? (true ohne Tracking-Eintrag) */
export function bossPlanetInForeground(planetId: string): boolean {
  if (!idleOrbitLive()) return true
  const pos = activePlanetPositions.get(planetId)
  return pos ? pos.isForeground : true
}

/**
 * Stern sichtbar? Der Stern ist die Gate-Ebene ÜBER seinen Planeten: fliegt er
 * hinter der Sonne, gelten alle seine Planeten als verdeckt (siehe
 * `useStarSystem`, wo `isForeground` der Planeten aus `sIsBehind` des Sterns
 * abgeleitet wird). Für Anzeigen, die einen ganzen Stern als Einheit zeigen —
 * etwa eine Timer-Bar — ist das der richtige Abgriff statt eines Planeten.
 */
export function starInForeground(starId: string): boolean {
  if (!idleOrbitLive()) return true
  const state = activeStarCombatState.get(starId)
  return state ? !state.isBehind : true
}
