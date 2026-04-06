import type { BattleShopItem } from '../types'

export const BATTLE_SHOP_ITEMS: BattleShopItem[] = [
  // ── Temp Buffs (1 battle) ────────────────────────────────
  {
    id: 'first_strike',
    name: 'First Strike Rune',
    description: '+15% win chance for the next battle.',
    cost: 4,
    category: 'temp_buff',
    rarity: 'rare',
    effect: { type: 'winChanceBonus', value: 0.15 },
  },
  {
    id: 'double_down',
    name: 'Double Down',
    description: 'Next victory grants double LP.',
    cost: 6,
    category: 'temp_buff',
    rarity: 'rare',
    effect: { type: 'doubleLpOnWin', value: 1 },
  },

  // ── Team Upgrades (3 battles) ────────────────────────────
  {
    id: 'synergy_boost',
    name: 'Synergy Boost',
    description: 'All assigned champion slots grant +10% power for 3 battles.',
    cost: 5,
    category: 'team_upgrade',
    rarity: 'common',
    effect: { type: 'synergyPower', value: 0.1 },
  },
  {
    id: 'scout',
    name: 'Scout',
    description: "Reveals the next opponent's MMR before battle for 3 battles.",
    cost: 3,
    category: 'team_upgrade',
    rarity: 'common',
    effect: { type: 'scoutOpponent', value: 1 },
  },

  // ── Permanent Upgrades (persist forever) ─────────────────
  {
    id: 'veteran_bard',
    name: 'Veteran Bard',
    description: "Bard's base power +5%. Stackable up to 5 times.",
    cost: 8,
    category: 'permanent',
    rarity: 'epic',
    maxStacks: 5,
    effect: { type: 'bardBasePower', value: 0.05 },
  },
  {
    id: 'lucky_coin',
    name: 'Lucky Coin',
    description: 'Coin drop after defeats +1. Stackable up to 3 times.',
    cost: 5,
    category: 'permanent',
    rarity: 'common',
    maxStacks: 3,
    effect: { type: 'coinDropBonus', value: 1 },
  },
]

export const REROLL_COST = 3

/**
 * Returns `count` random items from the pool, excluding permanently maxed-out items.
 */
export function getRandomShopItems(
  permanentUpgrades: Record<string, number>,
  count = 3,
): BattleShopItem[] {
  const available = BATTLE_SHOP_ITEMS.filter((item) => {
    if (item.category !== 'permanent') return true
    const stacks = permanentUpgrades[item.id] ?? 0
    return stacks < (item.maxStacks ?? Infinity)
  })

  const shuffled = [...available].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
