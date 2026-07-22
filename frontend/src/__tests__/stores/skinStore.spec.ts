import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useSkinStore } from '../../stores/skinStore'
import { useBattleStore } from '../../stores/battleStore'
import { SKIN_ORIGINAL } from '../../config/constants'
import {
  toSkinFolder,
  getChampionSkins,
  getSkinImagePath,
  formatSkinName,
} from '../../utils/championSkins'
import { CHAMPION_SKINS } from '../../config/championSkins'
import { CHAMPION_DATA } from '../../config/championData'

describe('championSkins utils', () => {
  describe('toSkinFolder', () => {
    it('strips spaces, dots and apostrophes', () => {
      expect(toSkinFolder('Aurelion Sol')).toBe('AurelionSol')
      expect(toSkinFolder("Kai'sa")).toBe('Kaisa')
      expect(toSkinFolder('Dr. Mundo')).toBe('DrMundo')
      expect(toSkinFolder('Nunu A. Willump')).toBe('NunuAWillump')
      expect(toSkinFolder('Ahri')).toBe('Ahri')
    })

    it('maps every champion in CHAMPION_DATA to an existing skin folder', () => {
      for (const name of Object.keys(CHAMPION_DATA)) {
        expect(CHAMPION_SKINS[toSkinFolder(name)], `missing folder for ${name}`).toBeDefined()
      }
    })
  })

  describe('getChampionSkins', () => {
    it('returns bundled skins for a known champion', () => {
      expect(getChampionSkins('Ahri')).toContain('KDASkin')
    })

    it('returns an empty array for unknown champions', () => {
      expect(getChampionSkins('NotAChampion')).toEqual([])
    })
  })

  describe('getSkinImagePath', () => {
    it('builds the /img/skins path with the normalized folder', () => {
      expect(getSkinImagePath("Kai'sa", 'KDASkin')).toBe('/img/skins/Kaisa/KDASkin.jpg')
    })
  })

  describe('formatSkinName', () => {
    it('maps the default skin to "Original"', () => {
      expect(formatSkinName(SKIN_ORIGINAL)).toBe('Original')
    })

    it('splits camel case and keeps acronyms intact', () => {
      expect(formatSkinName('StarGuardianSkin')).toBe('Star Guardian')
      expect(formatSkinName('KDASkin')).toBe('KDA')
      expect(formatSkinName('PrestigeTrueDamageSkin')).toBe('Prestige True Damage')
      expect(formatSkinName('PROJECTSkin')).toBe('PROJECT')
    })
  })
})

describe('skinStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults every champion to the original skin', () => {
    const store = useSkinStore()
    expect(store.getSelectedSkin('Ahri')).toBe(SKIN_ORIGINAL)
    expect(store.getSkinImage('Ahri')).toBeNull()
  })

  it('setSkin equips a bundled skin and getSkinImage returns its splash path', () => {
    const store = useSkinStore()
    store.setSkin('Ahri', 'KDASkin')
    expect(store.getSelectedSkin('Ahri')).toBe('KDASkin')
    expect(store.getSkinImage('Ahri')).toBe('/img/skins/Ahri/KDASkin.jpg')
  })

  it('setSkin with the original skin clears the stored entry', () => {
    const store = useSkinStore()
    store.setSkin('Ahri', 'KDASkin')
    store.setSkin('Ahri', SKIN_ORIGINAL)
    expect(store.selectedSkins['Ahri']).toBeUndefined()
    expect(store.getSkinImage('Ahri')).toBeNull()
  })

  it('setSkin ignores skins that are not bundled for the champion', () => {
    const store = useSkinStore()
    store.setSkin('Ahri', 'DoesNotExistSkin')
    expect(store.getSelectedSkin('Ahri')).toBe(SKIN_ORIGINAL)
  })

  it('resetSkins clears all selections', () => {
    const store = useSkinStore()
    store.setSkin('Ahri', 'KDASkin')
    store.resetSkins()
    expect(store.selectedSkins).toEqual({})
  })

  it('battleStore.getChampionImage resolves the equipped skin', () => {
    const skinStore = useSkinStore()
    const battleStore = useBattleStore()
    expect(battleStore.getChampionImage('Ahri')).toBe('/img/champion/Ahri.jpg')
    skinStore.setSkin('Ahri', 'KDASkin')
    expect(battleStore.getChampionImage('Ahri')).toBe('/img/skins/Ahri/KDASkin.jpg')
    expect(battleStore.getChampionImage('Bard')).toBe('/img/BardAbilities/Bard.png')
  })
})
