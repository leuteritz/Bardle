// ── Vordergrund-Gate für Kampf-Interaktionen ────────────────────────────────
// Kampf passiert nur im Sonnen-Vordergrund: Objekte hinter der Sonne greifen
// nicht an und werden nicht getroffen. Cooldowns laufen normal weiter — eine
// bei 0 angekommene Fähigkeit WARTET, bis Akteur und Ziel wieder sichtbar
// sind. Ist der Idle-Layer pausiert (Star-Fight-Modal/Profil offen), gelten
// alle Objekte als im Vordergrund — die eingefrorenen Orbit-Positionen dürfen
// den Kampf im Modal nicht blockieren.
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
