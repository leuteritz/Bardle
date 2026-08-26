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

import {
  LANDFALL_REEF_BASE_SECONDS,
  LANDFALL_REEF_CLICK_SECONDS,
  LANDFALL_REEF_MAX_CLICKS,
  LANDFALL_GLOAMING_BASE_SECONDS,
  LANDFALL_OSSUARY_TAP_SECONDS,
  LANDFALL_OSSUARY_MATERIALS,
  LANDFALL_CONVOY_TAP_GOAL,
  LANDFALL_CONVOY_MATERIALS,
  LANDFALL_RUPTURE_TAP_GOAL,
  LANDFALL_RUPTURE_SEAL_SECONDS,
  LANDFALL_RUPTURE_BURST,
} from '@/config/constants'

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
    // Ausdauer: viele Griffe, jeder legt zu. Die Zahlen wohnen weiter in
    // `constants/landfalls.ts` — hier steht nur, welcher Ort sie trägt.
    gesture: 'gradient',
    tapCap: LANDFALL_REEF_MAX_CLICKS,
    baseSeconds: LANDFALL_REEF_BASE_SECONDS,
    tapSeconds: LANDFALL_REEF_CLICK_SECONDS,
  },
  {
    id: 'the_gloaming',
    name: 'The Gloaming',
    blurb: 'A slow tide of dust the ship simply drifts through.',
    icon: 'game-icons:fog',
    unlockGalaxy: 5,
    weight: 75,
    // Keine Geste. Er löst den vorhandenen Nebeldurchflug aus — nur diesmal,
    // weil das Schiff HIER ist, statt alle 30 bis 90 Sekunden aus dem Nichts.
    gesture: 'none',
    baseSeconds: LANDFALL_GLOAMING_BASE_SECONDS,
  },
  {
    id: 'sunken_ossuary',
    name: 'Sunken Ossuary',
    blurb: 'A sealed vault adrift since long before the Caretaker passed.',
    icon: 'game-icons:sarcophagus',
    unlockGalaxy: 8,
    weight: 45,
    // Eine Entscheidung, kein Ausdauerspiel: ein Griff öffnet ihn und schliesst
    // den Ort sofort. Ungeöffnet gibt er NICHTS — kein Sockel.
    gesture: 'single',
    tapCap: 1,
    tapSeconds: LANDFALL_OSSUARY_TAP_SECONDS,
    materials: LANDFALL_OSSUARY_MATERIALS,
  },
  {
    id: 'adrift_convoy',
    name: 'Adrift Convoy',
    blurb: 'A stalled column of wayfarers, signalling into the dark.',
    icon: 'game-icons:distress-signal',
    unlockGalaxy: 3,
    weight: 55,
    // Endspurt: die Leiste muss VOLL werden. Halb geschafft ist gar nicht
    // geschafft — der einzige Ort, der bei Misserfolg leer ausgeht.
    gesture: 'threshold',
    tapCap: LANDFALL_CONVOY_TAP_GOAL,
    materials: LANDFALL_CONVOY_MATERIALS,
  },
  {
    id: 'wayside_cairn',
    name: 'Wayside Cairn',
    blurb: 'Stones stacked by travellers who came this way before.',
    icon: 'game-icons:menhir',
    unlockGalaxy: 4,
    weight: 35,
    // Nachdenken: drei Angebote, eines wird genommen, und es trägt bis zum Ende
    // DIESER Galaxie. Kein Griff, keine Uhr über den Segen.
    gesture: 'choice',
  },
  {
    id: 'the_rupture',
    name: 'The Rupture',
    blurb: 'A seam in the dark, and something on the far side of it.',
    // Das Glyph des VOID, mit Absicht: eine Bedeutung, ein Glyph. Die Rupture
    // ist keine zweite Drohung, sie ist seine Vokabel auf der Etappe.
    icon: 'game-icons:vortex',
    unlockGalaxy: 6,
    weight: 30,
    // Eile: dieselbe Schwelle wie beim Konvoi, aber weniger Griffe — und die
    // Folge des Versäumens ist eine andere.
    gesture: 'threshold',
    tapCap: LANDFALL_RUPTURE_TAP_GOAL,
    tapSeconds: LANDFALL_RUPTURE_SEAL_SECONDS / LANDFALL_RUPTURE_TAP_GOAL,
    burst: LANDFALL_RUPTURE_BURST,
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
  the_gloaming: 'landfall-gloaming',
  sunken_ossuary: 'landfall-ossuary',
  adrift_convoy: 'landfall-convoy',
  wayside_cairn: 'landfall-cairn',
  the_rupture: 'landfall-rupture',
}
