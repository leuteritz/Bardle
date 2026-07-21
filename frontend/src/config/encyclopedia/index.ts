import { resourcesCategory, levelingCategory, buildingsCategory } from './coreProgression'
import { sunForgeCategory, meepTreeCategory, planetSlotsCategory } from './sunAndForge'
import { battleCategory, championsCategory } from './battleAndChampions'
import { orbitCombatCategory, starFightsCategory, planetBossCategory } from './combatAndStars'
import {
  galaxiesCategory,
  expeditionsCategory,
  itemsCategory,
  prestigeCategory,
} from './worldAndMeta'
import type { EncyclopediaCategory } from './types'

export type { EncyclopediaEntry, EncyclopediaCategory } from './types'

export const encyclopediaData: EncyclopediaCategory[] = [
  resourcesCategory,
  levelingCategory,
  buildingsCategory,
  sunForgeCategory,
  meepTreeCategory,
  planetSlotsCategory,
  battleCategory,
  championsCategory,
  orbitCombatCategory,
  starFightsCategory,
  planetBossCategory,
  galaxiesCategory,
  expeditionsCategory,
  itemsCategory,
  prestigeCategory,
]
