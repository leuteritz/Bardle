import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SKIN_ORIGINAL } from '@/config/constants'
import { getSkinImagePath, hasChampionSkin } from '@/utils/championSkins'

/**
 * Selected champion skins. Only non-default picks are stored — a champion
 * without an entry (or with SKIN_ORIGINAL) uses the classic look everywhere
 * (square icon from /img/champion/, exactly as before skins existed).
 */
export const useSkinStore = defineStore('skin', () => {
  /** championName → skin file basename (e.g. 'KDASkin'). */
  const selectedSkins = ref<Record<string, string>>({})

  function setSkin(championName: string, skin: string) {
    if (skin === SKIN_ORIGINAL || !hasChampionSkin(championName, skin)) {
      delete selectedSkins.value[championName]
    } else {
      selectedSkins.value[championName] = skin
    }
  }

  function getSelectedSkin(championName: string): string {
    return selectedSkins.value[championName] ?? SKIN_ORIGINAL
  }

  /** Splash-art URL of the selected skin, or null for the default look. */
  function getSkinImage(championName: string): string | null {
    const skin = selectedSkins.value[championName]
    if (!skin || skin === SKIN_ORIGINAL) return null
    if (!hasChampionSkin(championName, skin)) return null
    return getSkinImagePath(championName, skin)
  }

  function resetSkins() {
    selectedSkins.value = {}
  }

  return { selectedSkins, setSkin, getSelectedSkin, getSkinImage, resetSkins }
})
