// Die Segen des Wayside Cairn.
//
// Vier Achsen, EIN Betrag: die Wahl geht darum, WELCHE Achse gerade zählt, nicht
// wie viel sie bringt. Drei davon werden je Cairn angeboten.
//
// Warum genau diese vier: es sind die nicht sättigenden Achsen von
// `TimedBuffEffects`. Die fünfte, `materialDropMult`, fällt aus —
// `tryDropMaterial` vergleicht gegen `Math.random()`, eine Chance über 1 bringt
// nichts, und ein Segen, der ab einem gewissen Ausbaustand wirkungslos ist, wäre
// eine Falle. Wer Material will, nimmt den Konvoi.
//
// Die Regel aus `types/core.ts`: „Eine NEUE Achse hier heißt immer auch: ein
// Getter je Quelle und eine Multiplikation an der Zielstelle." Deshalb keine
// neue Achse — die vier vorhandenen tragen.

import { LANDFALL_CAIRN_BOON_MULT } from '@/config/constants'
import type { LandfallBoonDef, LandfallBoonId } from '@/types'

export const LANDFALL_BOONS: LandfallBoonDef[] = [
  {
    id: 'keptChimes',
    name: 'Kept Chimes',
    line: `+${Math.round((LANDFALL_CAIRN_BOON_MULT - 1) * 100)}% chimes per second`,
    icon: 'game-icons:gong',
    axis: 'cpsMult',
  },
  {
    id: 'sureFooting',
    name: 'Sure Footing',
    line: `+${Math.round((LANDFALL_CAIRN_BOON_MULT - 1) * 100)}% chimes per click`,
    icon: 'game-icons:boot-prints',
    axis: 'cpcMult',
  },
  {
    id: 'watchfulSky',
    name: 'Watchful Sky',
    line: `+${Math.round((LANDFALL_CAIRN_BOON_MULT - 1) * 100)}% champion damage`,
    icon: 'game-icons:star-swirl',
    axis: 'combatDpsMult',
  },
  {
    id: 'longSight',
    name: 'Long Sight',
    line: `+${Math.round((LANDFALL_CAIRN_BOON_MULT - 1) * 100)}% champion XP`,
    icon: 'game-icons:spyglass',
    axis: 'xpMult',
  },
]

const BY_ID = new Map<LandfallBoonId, LandfallBoonDef>(LANDFALL_BOONS.map((b) => [b.id, b]))

export function getLandfallBoon(id: LandfallBoonId): LandfallBoonDef | undefined {
  return BY_ID.get(id)
}
