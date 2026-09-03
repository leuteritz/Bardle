/* ── Die Ereignis-Chronik einer Galaxie ───────────────────────────────────────
   Void-Einschläge und seltene Drifter hinterlassen eine Marke auf der Karte.
   Beide sind ORTLOS, ihre Lage ist deshalb ABGELEITET wie bei den Landfalls
   (`utils/game/galaxyIncidents.ts`).

   Gebucht wird nur, was Folgen hatte: `VOID_MAX_CONCURRENT` ist 24 und ein
   `common`-Drifter kommt alle 20 bis 30 Sekunden — jeder Spawn als Marke wären
   hunderte je Galaxie.                                                       */

import type { VoidRiftSeverity } from '@/types'

/** Deckel je ART. Getrennt, sonst verdrängt eine Serie von Drifterfängen jeden
 *  Einschlag — eine gedeckelte Chronik darf keinen makellosen Lauf behaupten. */
export const GALAXY_INCIDENT_MAX = 12

/** Ab `rare` (`DRIFTER_RARITY_ORDER`). Darunter sind es rechnerisch rund fünfzig
 *  Objekte je Galaxie statt acht. */
export const GALAXY_INCIDENT_DRIFTER_MIN_RANK = 2

/** Eigener rng-Strom — `generateGalaxyDots` und `landfallOnLeg` dürfen sich
 *  nicht verschieben, archivierte Galaxien spielen sie nach. */
export const GALAXY_INCIDENT_SEED_SALT = 4271
export const GALAXY_INCIDENT_SEED_OFFSET = 613

/** Lage auf der Sehne. Breiter als die Spanne der Orte (0,18–0,68): ein Ereignis
 *  hat kein Fenster, das vor der Ankunft ablaufen müsste. */
export const GALAXY_INCIDENT_T_MIN = 0.14
export const GALAXY_INCIDENT_T_MAX = 0.86

/** Seitlicher Versatz JENSEITS von `LANDFALL_BOW_MAX` (0,052) — die beiden
 *  Chroniken kommen sich sonst ins Gehege. */
export const GALAXY_INCIDENT_BOW_MIN = 0.058
export const GALAXY_INCIDENT_BOW_MAX = 0.098

/** Mindestabstand zu jeder gesetzten Marke. Per Ablehnungspass ERZWUNGEN, nicht
 *  aus der Formel gefolgert, und in der MAXIMUMSNORM gemessen: der 0..1-Raum der
 *  Karte ist anisotrop. */
export const GALAXY_INCIDENT_MIN_GAP = 0.036
export const GALAXY_INCIDENT_PLACE_TRIES = 8

/** Radius der Marke in Referenzeinheiten gegen `GALAXY_PLATE_REF_W`.
 *
 *  Gleichauf mit `LANDFALL_MARK_R` (6), obwohl ein Ereignis häufiger kommt als
 *  ein Ort: ein STRICH belegt bei gleicher Kantenlänge deutlich weniger Fläche
 *  als eine Raute. Bei 5 war die Bahnspur im Browser gemessen nicht mehr von
 *  einem Armpartikel zu trennen. Die Trennung leistet die Form, nicht die
 *  Grösse. */
export const GALAXY_INCIDENT_MARK_R = 6

/** Der Rang wächst in die GRÖSSE, nicht in die Deckkraft. */
export const GALAXY_INCIDENT_RANK_SCALE = [1, 1.18, 1.4]

/** Darunter bleibt die Marke ein nackter Zug — die Leistenminiatur (4,5 px)
 *  trägt sie damit gar nicht erst. */
export const GALAXY_INCIDENT_MIN_R = 3.4

/** Der Kernfunke nennt die SCHWERE. Eigene Palette neben `VOID_RIFTS[].color`,
 *  im Muster von `LANDMARK_ROLE_CORE`: auf der Karte muss ein Ton gegen zwanzig
 *  Galaxie-Themen bestehen. */
export const GALAXY_INCIDENT_VOID_CORE: Record<VoidRiftSeverity, string> = {
  lesser: '#9a6fd0',
  greater: '#c04fd0',
  abyssal: '#e0409f',
}

/** Der Kernfunke als Anteil des Markenradius. Kleiner als beim befreiten Stern
 *  (0,34): dort füllt er einen Ring, hier sitzt er auf einem Kreuzungspunkt. */
export const GALAXY_INCIDENT_CORE_R_RATIO = 0.22
