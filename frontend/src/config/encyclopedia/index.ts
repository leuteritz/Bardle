import { resourcesCategory, levelingCategory } from './resourcesAndLeveling'
import { buildingsCategory, permanentUpgradesCategory, abilitiesCategory } from './buildingsAndUpgrades'
import { augmentsCategory, battleCategory, championsCategory } from './augmentsAndBattle'
import { planetEventsCategory, planetBossCategory, expeditionsCategory } from './planetsAndExpeditions'
import { materialsCategory, itemsCategory } from './materialsAndItems'
import { universesCategory, constantsCategory } from './universesAndConstants'
import type { EncyclopediaCategory } from './types'

export type { EncyclopediaEntry, EncyclopediaCategory } from './types'

export const encyclopediaData: EncyclopediaCategory[] = [
  resourcesCategory,
  levelingCategory,
  buildingsCategory,
  permanentUpgradesCategory,
  abilitiesCategory,
  augmentsCategory,
  battleCategory,
  championsCategory,
  planetEventsCategory,
  planetBossCategory,
  expeditionsCategory,
  materialsCategory,
  itemsCategory,
  universesCategory,
  constantsCategory,
]
