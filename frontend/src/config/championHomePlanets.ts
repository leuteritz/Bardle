import type { PlanetType, ChimesTier } from '../types'
import { CHAMPION_DATA } from './championData'
import { CHIMES_PRICE_TIERS } from './constants'

export interface ChampionHomePlanetConfig {
  championName: string
  planetType: PlanetType
  materialCost: Record<string, number>
  chimesPrice: number
  priceTier: ChimesTier
  tierLabel: string
  tierBonusMultiplier: number // TODO: tierBonusMultiplier used for combat & material bonuses
}

export const CHAMPION_HOME_PLANETS: ChampionHomePlanetConfig[] = Object.entries(CHAMPION_DATA).map(
  ([name, d]) => {
    const tier = CHIMES_PRICE_TIERS[d.priceTier]
    return {
      championName: name,
      planetType: d.planetType,
      materialCost: d.materialCost,
      chimesPrice: tier.chimesPrice,
      priceTier: d.priceTier,
      tierLabel: tier.label,
      tierBonusMultiplier: tier.multiplier,
    }
  },
)

const homePlanetMap = new Map<string, ChampionHomePlanetConfig>()
for (const config of CHAMPION_HOME_PLANETS) {
  if (!homePlanetMap.has(config.championName)) {
    homePlanetMap.set(config.championName, config)
  }
}

export function getHomePlanetConfig(championName: string): ChampionHomePlanetConfig | undefined {
  return homePlanetMap.get(championName)
}
