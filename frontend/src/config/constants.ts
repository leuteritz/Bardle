// ELO rating system
export const ELO_K_FACTOR = 32
export const ELO_RATING_SCALE = 400
export const ELO_LUCK_FACTOR = 0.15

// Leveling formula: 10 * level^1.2
export const LEVEL_BASE = 10
export const LEVEL_EXPONENT = 1.2

// Meep cost formula: 20 * meeps^1.2
export const MEEP_BASE_COST = 20
export const MEEP_COST_EXPONENT = 1.2

// Auto-battle
export const AUTO_BATTLE_INTERVAL_MS = 10000
export const MMR_TO_POWER_MULTIPLIER = 1.5

// Star background (App.vue)
export const STAR_COUNT = 500
export const TITLE_MESSAGE_INTERVAL_MS = 5000

// Rank system
export const RANK_DIVISIONS = ['IV', 'III', 'II', 'I'] as const
export const RANK_TIERS = [
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Emerald',
  'Diamond',
  'Master',
  'Grandmaster',
  'Challenger',
] as const

// Abilities
export const MAX_ABILITY_LEVEL = 5

// Rank border image paths (eliminates duplication between useRankCalculations.ts and BattleResultComponent.vue)
export const RANK_BORDER_IMAGES: Record<string, string> = {
  Iron: '/img/RankBorder/RankIron.png',
  Bronze: '/img/RankBorder/RankBronze.png',
  Silver: '/img/RankBorder/RankSilver.png',
  Gold: '/img/RankBorder/RankGold.png',
  Platinum: '/img/RankBorder/RankPlatin.png',
  Emerald: '/img/RankBorder/RankEmerald.png',
  Diamond: '/img/RankBorder/RankDiamand.png',
  Master: '/img/RankBorder/RankMaster.png',
  Grandmaster: '/img/RankBorder/RankGrandMaster.png',
  Challenger: '/img/RankBorder/RankChallenger.png',
}
