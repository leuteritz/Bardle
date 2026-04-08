// Non-reactive Map updated at 60fps from usePlanetBackground.ts animation loop.
// combatStore reads this to determine planet proximity for champion approach logic.
export const activePlanetPositions = new Map<string, { cx: number; cy: number }>()
