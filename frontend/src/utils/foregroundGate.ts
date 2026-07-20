// ── Vordergrund-Gate für Kampf-Interaktionen ────────────────────────────────
// Kampf passiert nur im Sonnen-Vordergrund: Objekte hinter der Sonne greifen
// nicht an und werden nicht getroffen. Cooldowns laufen normal weiter — eine
// bei 0 angekommene Fähigkeit WARTET, bis Akteur und Ziel wieder sichtbar
// sind. Das gilt auch bei offenem Star-Fight-Modal — der Idle-Layer läuft
// dort weiter. Nur wenn er wirklich pausiert ist (Profil offen, Tab im
// Hintergrund), gelten alle Objekte als im Vordergrund, damit eingefrorene
// Orbit-Positionen den Kampf nicht blockieren.
import { activeChampionBehindState } from './activeChampionBehindState'
import { activePlayerPlanetPositions } from './activePlayerPlanetPositions'
import { activePlanetPositions } from './activePlanetPositions'
import { useRenderingPaused } from '@/composables/useRenderingPaused'

function idleOrbitLive(): boolean {
  const { isIdleRenderingPaused } = useRenderingPaused()
  return !isIdleRenderingPaused.value
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
