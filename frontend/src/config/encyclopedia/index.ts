import { resourcesCategory, levelingCategory, buildingsCategory } from '@/config/encyclopedia/coreProgression'
import { sunForgeCategory, meepTreeCategory, planetSlotsCategory } from '@/config/encyclopedia/sunAndForge'
import { battleCategory, championsCategory } from '@/config/encyclopedia/battleAndChampions'
import { orbitCombatCategory, starFightsCategory, planetBossCategory } from '@/config/encyclopedia/combatAndStars'
import {
  galaxiesCategory,
  expeditionsCategory,
  itemsCategory,
  prestigeCategory,
} from '@/config/encyclopedia/worldAndMeta'
import type { EncyclopediaCategory } from '@/config/encyclopedia/types'

export type { EncyclopediaEntry, EncyclopediaCategory } from '@/config/encyclopedia/types'

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
