// ─── Types ────────────────────────────────────────────────────────────────────

export type StarItem = {
  id: number
  angle: number // Winkel vom Bildschirmzentrum (radians)
  dist: number // Aktuelle Distanz vom Zentrum
  baseSpeed: number // Zufälliger Basis-Geschwindigkeitsmultiplikator (0.5–1.5)
  r: number
  g: number
  b: number
  twinklePhase: number
  twinkleSpeed: number
}

export type GalaxyItem = {
  el: SVGSVGElement
  x: number
  y: number
  scale: number
  maxScale: number
  lifetime: number
  elapsed: number
  rot: number
}

export type GalaxyType =
  | 'spiral'
  | 'barred-spiral'
  | 'elliptical'
  | 'globular'
  | 'irregular'
  | 'ring'
  | 'lenticular'
  | 'starburst'

export type GalaxyPalette = {
  center: string
  mid: string
  outer: string
  arm?: string
}

export type GalaxyTypeConfig = {
  type: GalaxyType
  sizeMin: number
  sizeMax: number
  speedMin: number
  speedMax: number
  lifetime: number
  rotRange: [number, number]
  weight: number
}

export type DustPatch = {
  angle: number // polar angle from screen center
  dist: number // current distance from center
  baseSpeed: number
  rx: number // half-width in px (base size)
  ry: number
  rotation: number
  opacity: number
  r: number
  g: number
  b: number
}

export type StarCluster = {
  angle: number // polar angle from screen center
  dist: number // current distance from center
  baseSpeed: number
  stars: Array<{ dx: number; dy: number; r: number; g: number; b: number; brightness: number }>
  twinklePhase: number
}

export type NebulaMovingItem = {
  el: SVGSVGElement
  angle: number // polar angle from screen center
  dist: number // current distance from center
  baseSpeed: number
  scale: number
  maxScale: number
  size: number // SVG element size in px
}

// ─── Emission Nebula / Ion Cloud constants ───────────────────────────────────

export const EMISSION_MAX_COUNT = 4
export const EMISSION_SPAWN_MIN = 8_000
export const EMISSION_SPAWN_MAX = 18_000
export const CLUSTER_COUNT = 10
export const DUST_PATCH_COUNT = 7

// ─── Emission Nebula palettes ─────────────────────────────────────────────────

export type EmissionType = 'emission-nebula' | 'ion-cloud'

export type EmissionPalette = {
  core: string
  mid: string
  outer: string
  glow: string
}

export const EMISSION_NEBULA_PALETTES: EmissionPalette[] = [
  // Orion-style: blue-white
  { core: '#c8e8ff', mid: '#5599dd', outer: '#1a3a7a', glow: '#aaccff' },
  // Lagoon-style: red-pink
  { core: '#ffcccc', mid: '#dd4466', outer: '#7a1a2a', glow: '#ffaacc' },
  // Crab-style: blue-green
  { core: '#ccffee', mid: '#22aa88', outer: '#0a4a30', glow: '#88ffcc' },
  // Trifid-style: red-blue
  { core: '#eeccff', mid: '#8844cc', outer: '#2a0a5a', glow: '#ddaaff' },
  // Eagle-style: warm gold
  { core: '#fff0cc', mid: '#dd9922', outer: '#6a3a00', glow: '#ffdd88' },
  // Rosette-style: pink-red
  { core: '#ffddee', mid: '#ee4488', outer: '#660022', glow: '#ffaabb' },
]

export const ION_CLOUD_PALETTES: EmissionPalette[] = [
  { core: '#88eeff', mid: '#0088cc', outer: '#002244', glow: '#44ccff' },
  { core: '#cc88ff', mid: '#8822cc', outer: '#220044', glow: '#aa55ff' },
  { core: '#88ffcc', mid: '#00aa66', outer: '#002211', glow: '#55ffaa' },
  { core: '#ffaa88', mid: '#cc5500', outer: '#441100', glow: '#ff8844' },
  { core: '#aaffee', mid: '#00ccaa', outer: '#004433', glow: '#55ffdd' },
  { core: '#ffccff', mid: '#cc44cc', outer: '#440044', glow: '#ff88ff' },
]

export const GALAXY_TYPE_CONFIGS: GalaxyTypeConfig[] = [
  {
    type: 'elliptical',
    sizeMin: 160,
    sizeMax: 300,
    speedMin: 0.2,
    speedMax: 0.8,
    lifetime: 25_000,
    rotRange: [3, 15],
    weight: 2,
  },
  {
    type: 'globular',
    sizeMin: 60,
    sizeMax: 110,
    speedMin: 0.8,
    speedMax: 2.5,
    lifetime: 12_000,
    rotRange: [0, 8],
    weight: 2,
  },
  {
    type: 'irregular',
    sizeMin: 100,
    sizeMax: 180,
    speedMin: 0.6,
    speedMax: 2.0,
    lifetime: 14_000,
    rotRange: [10, 60],
    weight: 2,
  },
  {
    type: 'starburst',
    sizeMin: 80,
    sizeMax: 150,
    speedMin: 0.8,
    speedMax: 2.5,
    lifetime: 14_000,
    rotRange: [30, 90],
    weight: 2,
  },
]

export const GALAXY_PALETTES_BY_TYPE: Record<GalaxyType, GalaxyPalette[]> = {
  spiral: [
    { center: '#ffffff', mid: '#8b5cf6', outer: '#3b82f6', arm: '#a78bfa' },
    { center: '#ffffff', mid: '#06b6d4', outer: '#6366f1', arm: '#67e8f9' },
    { center: '#ffffff', mid: '#ec4899', outer: '#8b5cf6', arm: '#f9a8d4' },
    { center: '#e0f2fe', mid: '#38bdf8', outer: '#0369a1', arm: '#7dd3fc' },
    { center: '#ffffff', mid: '#14b8a6', outer: '#d97706', arm: '#5eead4' },
    { center: '#fff1f2', mid: '#fb7185', outer: '#f59e0b', arm: '#fda4af' },
    { center: '#f0fdf4', mid: '#84cc16', outer: '#059669', arm: '#bef264' },
    { center: '#e0f7ff', mid: '#7dd3fc', outer: '#bfdbfe', arm: '#bae6fd' },
  ],
  'barred-spiral': [
    { center: '#fff7ed', mid: '#f59e0b', outer: '#ef4444', arm: '#fcd34d' },
    { center: '#fef3c7', mid: '#f97316', outer: '#dc2626', arm: '#fde68a' },
    { center: '#ffffff', mid: '#fb923c', outer: '#9333ea', arm: '#fdba74' },
    { center: '#f0f9ff', mid: '#38bdf8', outer: '#14b8a6', arm: '#7dd3fc' },
    { center: '#f0fdf4', mid: '#4ade80', outer: '#d97706', arm: '#86efac' },
    { center: '#fff1f2', mid: '#fb7185', outer: '#dc2626', arm: '#fda4af' },
  ],
  elliptical: [
    { center: '#fff7ed', mid: '#fbbf24', outer: '#d97706' },
    { center: '#fef9ee', mid: '#f59e0b', outer: '#b45309' },
    { center: '#ffffff', mid: '#fde68a', outer: '#f59e0b' },
    { center: '#fdf4ff', mid: '#e9d5ff', outer: '#a855f7' },
    { center: '#7f1d1d', mid: '#dc2626', outer: '#450a0a' },
    { center: '#f8fafc', mid: '#cbd5e1', outer: '#94a3b8' },
    { center: '#eff6ff', mid: '#bfdbfe', outer: '#93c5fd' },
  ],
  globular: [
    { center: '#fffbeb', mid: '#fef08a', outer: '#fbbf24' },
    { center: '#ffffff', mid: '#e0f2fe', outer: '#7dd3fc' },
    { center: '#f0fdf4', mid: '#bbf7d0', outer: '#4ade80' },
    { center: '#fdf2f8', mid: '#fbcfe8', outer: '#db2777' },
    { center: '#fff7ed', mid: '#fdba74', outer: '#d97706' },
    { center: '#faf5ff', mid: '#c4b5fd', outer: '#6d28d9' },
    { center: '#ecfeff', mid: '#99f6e4', outer: '#0d9488' },
  ],
  irregular: [
    { center: '#eff6ff', mid: '#60a5fa', outer: '#2563eb' },
    { center: '#fdf4ff', mid: '#e879f9', outer: '#a855f7' },
    { center: '#ecfdf5', mid: '#34d399', outer: '#059669' },
    { center: '#fff1f2', mid: '#fda4af', outer: '#e11d48' },
    { center: '#fff7ed', mid: '#fb923c', outer: '#b45309' },
    { center: '#ecfeff', mid: '#22d3ee', outer: '#0e7490' },
    { center: '#fdf2f8', mid: '#f0abfc', outer: '#a21caf' },
  ],
  ring: [
    { center: '#ecfeff', mid: '#22d3ee', outer: '#0891b2' },
    { center: '#f0f9ff', mid: '#38bdf8', outer: '#0284c7' },
    { center: '#fdf4ff', mid: '#c084fc', outer: '#7c3aed' },
    { center: '#fff7ed', mid: '#fed7aa', outer: '#ea580c' },
    { center: '#fffbeb', mid: '#fcd34d', outer: '#b45309' },
    { center: '#f0fdf4', mid: '#86efac', outer: '#4d7c0f' },
    { center: '#fdf2f8', mid: '#f0abfc', outer: '#7e22ce' },
  ],
  lenticular: [
    { center: '#fffbeb', mid: '#fde68a', outer: '#d97706' },
    { center: '#fff7ed', mid: '#fdba74', outer: '#c2410c' },
    { center: '#f8fafc', mid: '#cbd5e1', outer: '#64748b' },
    { center: '#fdf4ff', mid: '#e9d5ff', outer: '#7c3aed' },
    { center: '#eff6ff', mid: '#bfdbfe', outer: '#3b82f6' },
    { center: '#f0fdf4', mid: '#bbf7d0', outer: '#059669' },
  ],
  starburst: [
    { center: '#ffffff', mid: '#fef08a', outer: '#f59e0b' },
    { center: '#ffffff', mid: '#fbcfe8', outer: '#ec4899' },
    { center: '#ffffff', mid: '#a5f3fc', outer: '#06b6d4' },
    { center: '#ffffff', mid: '#bbf7d0', outer: '#10b981' },
    { center: '#ffffff', mid: '#ddd6fe', outer: '#8b5cf6' },
    { center: '#ffffff', mid: '#fed7aa', outer: '#f97316' },
  ],
}
