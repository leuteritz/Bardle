export interface ExpeditionConfig {
  universeId: number
  name: string
  durationMs: number
  multiplier: number
}

export const EXPEDITION_CONFIGS: ExpeditionConfig[] = [
  { universeId: 1, name: 'Runeterra Prime', durationMs: 60_000, multiplier: 1 },
  { universeId: 2, name: 'Void Nexus', durationMs: 180_000, multiplier: 2 },
  { universeId: 4, name: 'Shadow Isles', durationMs: 300_000, multiplier: 3 },
  { universeId: 5, name: 'Freljord', durationMs: 600_000, multiplier: 5 },
  { universeId: 6, name: 'Shurima', durationMs: 1_200_000, multiplier: 8 },
  { universeId: 7, name: 'Ionia', durationMs: 1_800_000, multiplier: 12 },
  { universeId: 8, name: 'Noxus', durationMs: 2_700_000, multiplier: 17 },
  { universeId: 9, name: 'Demacia', durationMs: 3_600_000, multiplier: 25 },
  { universeId: 3, name: 'Celestial Realm', durationMs: 5_400_000, multiplier: 40 },
  { universeId: 10, name: 'Piltover', durationMs: 7_200_000, multiplier: 60 },
]
