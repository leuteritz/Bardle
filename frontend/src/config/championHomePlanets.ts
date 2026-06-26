import type { PlanetType } from '../types'
import { CHAMPION_DATA } from './championData'
import { getChampionChimesPrice } from './cosmicTraits'

export interface ChampionHomePlanetConfig {
  championName: string
  planetType: PlanetType
  materialCost: Record<string, number>
  chimesPrice: number
}

export const CHAMPION_HOME_PLANETS: ChampionHomePlanetConfig[] = Object.entries(CHAMPION_DATA).map(
  ([name, d]) => ({
    championName: name,
    planetType: d.planetType,
    materialCost: d.materialCost,
    chimesPrice: getChampionChimesPrice(name),
  }),
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
