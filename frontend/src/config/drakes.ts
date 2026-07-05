import {
  DRAKE_WIN_BONUS_MAJOR,
  DRAKE_WIN_BONUS_MINOR,
  DRAKE_WIN_BONUS_ELDER,
  DRAKE_MOUNTAIN_DPS_MULT,
  DRAKE_CHEMTECH_ENEMY_DPS_MULT,
  DRAKE_HEXTECH_CLICK_MULT,
  DRAKE_CLOUD_RESPAWN_MULT,
  DRAKE_OCEAN_LOSS_PENALTY_MULT,
  DRAKE_ELDER_LP_BONUS,
} from './constants'

export type DrakeTypeId =
  | 'chemtech'
  | 'cloud'
  | 'hextech'
  | 'infernal'
  | 'mountain'
  | 'ocean'
  | 'elder'

export interface DrakeTypeDef {
  id: DrakeTypeId
  /** Display name, e.g. "Infernal Drake" / "Elder Dragon" */
  label: string
  /** Main theme color (labels, modal title, HP segments) */
  color: string
  /** Darker shade for gradients */
  colorDark: string
  /** rgba() glow used for drop-shadows and text shadows */
  glow: string
  /** Symmetric win-chance shift when the drake is secured / lost */
  winDelta: number
  /** Secondary battle-scoped effect copy shown in the modal (empty = none) */
  effectText: string
}

export const DRAKE_TYPES: Record<DrakeTypeId, DrakeTypeDef> = {
  infernal: {
    id: 'infernal',
    label: 'Infernal Drake',
    color: '#ff6a3c',
    colorDark: '#a83a14',
    glow: 'rgba(255, 106, 60, 0.65)',
    winDelta: DRAKE_WIN_BONUS_MAJOR,
    effectText: '',
  },
  mountain: {
    id: 'mountain',
    label: 'Mountain Drake',
    color: '#c98d4b',
    colorDark: '#7a5024',
    glow: 'rgba(201, 141, 75, 0.55)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `Mountain's Strength: +${Math.round((DRAKE_MOUNTAIN_DPS_MULT - 1) * 100)}% team DPS in later objective fights`,
  },
  chemtech: {
    id: 'chemtech',
    label: 'Chemtech Drake',
    color: '#a3e635',
    colorDark: '#4d7c0f',
    glow: 'rgba(163, 230, 53, 0.6)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `Chem-Fumes: -${Math.round((1 - DRAKE_CHEMTECH_ENEMY_DPS_MULT) * 100)}% enemy DPS in later objective fights`,
  },
  hextech: {
    id: 'hextech',
    label: 'Hextech Drake',
    color: '#22d3ee',
    colorDark: '#0e7490',
    glow: 'rgba(34, 211, 238, 0.6)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `Hexcharge: x${DRAKE_HEXTECH_CLICK_MULT} click damage in later objective fights`,
  },
  cloud: {
    id: 'cloud',
    label: 'Cloud Drake',
    color: '#aebfd4',
    colorDark: '#5c6b80',
    glow: 'rgba(174, 191, 212, 0.55)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `Zephyr's Haste: allies respawn ${Math.round((1 - DRAKE_CLOUD_RESPAWN_MULT) * 100)}% faster this battle`,
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean Drake',
    color: '#2dd4bf',
    colorDark: '#0f766e',
    glow: 'rgba(45, 212, 191, 0.6)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `Tidal Renewal: losing later objectives costs only ${Math.round(DRAKE_OCEAN_LOSS_PENALTY_MULT * 100)}% win chance`,
  },
  elder: {
    id: 'elder',
    label: 'Elder Dragon',
    color: '#f4ead2',
    colorDark: '#b09a5e',
    glow: 'rgba(244, 234, 210, 0.75)',
    winDelta: DRAKE_WIN_BONUS_ELDER,
    effectText: `Elder Ascension: +${DRAKE_ELDER_LP_BONUS} bonus LP if the battle is won`,
  },
}

/** Basic pool the timeline draws from without replacement — stable order matters for rng determinism. */
export const BASIC_DRAKE_TYPES: DrakeTypeId[] = [
  'chemtech',
  'cloud',
  'hextech',
  'infernal',
  'mountain',
  'ocean',
]
