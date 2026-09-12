/**
 * Ob die Kurswahl schon offen steht — das Tor an Wayfinder-Stufe 2.
 *
 * Ein Util, kein galaxyStore-Getter: der Store soll den missionStore nicht
 * importieren (Zyklus über progressMetrics). Gegatet wird nur die Oberfläche;
 * `chartCourse()` selbst bleibt frei — der Wayfinder ist ein Zeiger, kein Tor.
 */
import { useMissionStore } from '@/stores/progression/missionStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { MISSION_INDEX } from '@/config/progression/missions'

export const COURSE_GATE_MISSION_ID = 'chartCourse'

export function courseUnlocked(): boolean {
  if (useGalaxyStore().totalCoursesCharted > 0) return true
  return useMissionStore().index >= (MISSION_INDEX[COURSE_GATE_MISSION_ID] ?? 0)
}
