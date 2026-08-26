// Katalog der Landfalls — der Orte, die auf einer Reiseetappe liegen.
//
// Der Katalog WÄCHST. Jeder Eintrag nennt seine Freischalt-Galaxie selbst; die
// Auswahl zieht gewichtet aus allem, was bei dieser Galaxie schon offen ist.
//
// Zwei Regeln, die den Katalog gegen die bestehenden Systeme abgrenzen:
//
// - Ein Landfall zahlt NIE einen befristeten Buff, der schon woanders wohnt.
//   Drifter zahlen Zeitbuffs, Omen zahlen eine befristete Wahl, der Codex zahlt
//   Dauerprozente. Ein Ort zahlt entweder sofort, oder für den Rest DIESER
//   Galaxie.
// - Ein Landfall erzeugt keine zweite Drohung. Der Void ist das einzige System,
//   das gegen den Spieler drängt; ein Ort, der bedroht, tut das MIT dem Void und
//   dessen eigenen Wesen, nicht neben ihm.

import type { LandfallDef, LandfallKindId } from '@/types'
import type { LandfallLandmarkKind } from '@/utils/fx/galaxyLandmarks'

export const LANDFALLS: LandfallDef[] = [
  {
    id: 'chime_reef',
    name: 'Chime Reef',
    blurb: 'A shoal of loose chimes drifting between the stars.',
    icon: 'game-icons:coral',
    unlockGalaxy: 2,
    weight: 100,
  },
]

const BY_ID = new Map<LandfallKindId, LandfallDef>(LANDFALLS.map((d) => [d.id, d]))

export function getLandfall(id: LandfallKindId): LandfallDef | undefined {
  return BY_ID.get(id)
}

/** Alles, was bei dieser Galaxie offen ist — in Katalogreihenfolge. */
export function unlockedLandfalls(galaxy: number): LandfallDef[] {
  return LANDFALLS.filter((d) => galaxy >= d.unlockGalaxy)
}

/**
 * Ort → Landmarke. Die EINE Stelle, die den Katalog an die Zeichenschicht
 * bindet; als `Record` prüft TypeScript die Vollständigkeit, ein neuer Ort ohne
 * Marke compiliert nicht.
 */
export const LANDFALL_LANDMARK_KIND: Record<LandfallKindId, LandfallLandmarkKind> = {
  chime_reef: 'landfall-reef',
}
