// Non-reactive Map updated at 60fps by PlanetOrbit.vue.
// StarSystemComponent reads this for enemy projectile target selection.
export const activePlayerPlanetPositions = new Map<
  string,
  { cx: number; cy: number; isForeground: boolean }
>()
