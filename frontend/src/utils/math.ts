/** Clamps a percentage value to the 0–100 range. */
export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}
