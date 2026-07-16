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
  DRAKE_INFERNAL_BURN_DPS,
  BARON_LP_LOSS_SHIELD_MULT,
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
  /** Battle-scoped effect, title-free and as short as possible — shown in the
   * modal header, the post-fight summary and the badges (empty = none) */
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
    effectText: `auto-attacks drakes & baron with ${DRAKE_INFERNAL_BURN_DPS} damage per second`,
  },
  mountain: {
    id: 'mountain',
    label: 'Mountain Drake',
    color: '#c98d4b',
    colorDark: '#7a5024',
    glow: 'rgba(201, 141, 75, 0.55)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `your team deals +${Math.round((DRAKE_MOUNTAIN_DPS_MULT - 1) * 100)}% damage vs drakes & baron`,
  },
  chemtech: {
    id: 'chemtech',
    label: 'Chemtech Drake',
    color: '#a3e635',
    colorDark: '#4d7c0f',
    glow: 'rgba(163, 230, 53, 0.6)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `enemy team deals -${Math.round((1 - DRAKE_CHEMTECH_ENEMY_DPS_MULT) * 100)}% damage vs drakes & baron`,
  },
  hextech: {
    id: 'hextech',
    label: 'Hextech Drake',
    color: '#22d3ee',
    colorDark: '#0e7490',
    glow: 'rgba(34, 211, 238, 0.6)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `your clicks deal x${DRAKE_HEXTECH_CLICK_MULT} damage`,
  },
  cloud: {
    id: 'cloud',
    label: 'Cloud Drake',
    color: '#aebfd4',
    colorDark: '#5c6b80',
    glow: 'rgba(174, 191, 212, 0.55)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `dead allies revive ${Math.round((1 - DRAKE_CLOUD_RESPAWN_MULT) * 100)}% faster`,
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean Drake',
    color: '#2dd4bf',
    colorDark: '#0f766e',
    glow: 'rgba(45, 212, 191, 0.6)',
    winDelta: DRAKE_WIN_BONUS_MINOR,
    effectText: `losing an objective costs ${Math.round((1 - DRAKE_OCEAN_LOSS_PENALTY_MULT) * 100)}% less win chance`,
  },
  elder: {
    id: 'elder',
    label: 'Elder Dragon',
    color: '#f4ead2',
    colorDark: '#b09a5e',
    glow: 'rgba(244, 234, 210, 0.75)',
    winDelta: DRAKE_WIN_BONUS_ELDER,
    effectText: `+${DRAKE_ELDER_LP_BONUS} bonus LP for winning the battle`,
  },
}

/**
 * Hand of Baron — battle-scoped buff for the team that slays the baron.
 * Styled like a DrakeTypeDef so the badge/modal UI can render it the same way;
 * the win-chance swing itself stays OBJECTIVE_BARON_WIN_BONUS.
 */
export const BARON_BUFF = {
  id: 'baron' as const,
  label: 'Hand of Baron',
  color: '#a855f7',
  colorDark: '#5c2a90',
  glow: 'rgba(168, 85, 247, 0.6)',
  effectText: `bonus chimes after the battle · defeat costs ${Math.round((1 - BARON_LP_LOSS_SHIELD_MULT) * 100)}% less LP`,
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
