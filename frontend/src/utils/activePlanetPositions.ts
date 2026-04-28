// Non-reactive Map updated at 60fps from useStarSystem / usePlanetOrbit.
// ChampionOrbit und PlanetOrbit (Turret) lesen daraus Ziel-Koordinaten für Projektile.
export const activePlanetPositions = new Map<
  string,
  { cx: number; cy: number; isForeground: boolean }
>()
