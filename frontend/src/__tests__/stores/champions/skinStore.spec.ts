import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useSkinStore } from '@/stores/champions/skinStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { SKIN_ORIGINAL } from '@/config/constants'
import {
  toSkinFolder,
  getChampionSkins,
  getSkinImagePath,
  getSkinArtPath,
  getChampionIconPath,
  getOriginalPreviewPath,
  withArtVariant,
  pickRandomSkin,
  formatSkinName,
} from '@/utils/game/champions'
import { CHAMPION_SKINS } from '@/config/champions/championSkins'
import { CHAMPION_DATA } from '@/config/champions/championData'

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

  describe('withArtVariant', () => {
    it('appends the pixel suffix of the requested downscale', () => {
      expect(withArtVariant('/img/skins/Ahri/KDASkin.jpg', 'sm')).toBe(
        '/img/skins/Ahri/KDASkin-128.jpg',
      )
      expect(withArtVariant('/img/skins/Ahri/KDASkin.jpg', 'md')).toBe(
        '/img/skins/Ahri/KDASkin-256.jpg',
      )
    })

    it('leaves the source untouched at full size (and by default)', () => {
      expect(withArtVariant('/img/skins/Ahri/KDASkin.jpg', 'full')).toBe(
        '/img/skins/Ahri/KDASkin.jpg',
      )
      expect(withArtVariant('/img/champion/Ahri.jpg')).toBe('/img/champion/Ahri.jpg')
    })

    it('only rewrites the extension, never a dot inside the name', () => {
      expect(withArtVariant('/img/skins/Gragas/Gragas,Esq.Skin.jpg', 'sm')).toBe(
        '/img/skins/Gragas/Gragas,Esq.Skin-128.jpg',
      )
    })
  })

  describe('art variants across the path helpers', () => {
    it('threads the size through skin, icon and preview paths', () => {
      expect(getSkinImagePath('Ahri', 'KDASkin', 'sm')).toBe('/img/skins/Ahri/KDASkin-128.jpg')
      expect(getChampionIconPath('Ahri', 'md')).toBe('/img/champion/Ahri-256.jpg')
      expect(getOriginalPreviewPath('Ahri', 'sm')).toBe('/img/skins/Ahri/OriginalSkin-128.jpg')
      // Aphelios has no OriginalSkin file — the icon variant stands in
      expect(getOriginalPreviewPath('Aphelios', 'sm')).toBe('/img/champion/Aphelios-128.jpg')
    })

    it('defaults to the full-size source everywhere', () => {
      expect(getSkinImagePath('Ahri', 'KDASkin')).toBe('/img/skins/Ahri/KDASkin.jpg')
      expect(getChampionIconPath('Ahri')).toBe('/img/champion/Ahri.jpg')
      expect(getSkinArtPath('Ahri', 'KDASkin')).toBe('/img/skins/Ahri/KDASkin.jpg')
    })
  })

  describe('getSkinArtPath', () => {
    it('returns the splash art of a bundled skin', () => {
      expect(getSkinArtPath('Ahri', 'KDASkin')).toBe('/img/skins/Ahri/KDASkin.jpg')
    })

    it('renders the default look as the OriginalSkin splash when bundled', () => {
      expect(getSkinArtPath('Ahri', SKIN_ORIGINAL)).toBe('/img/skins/Ahri/OriginalSkin.jpg')
    })

    it('falls back to the square icon when the skin file is missing', () => {
      // Aphelios only ships LunarBeastSkin — no OriginalSkin splash exists
      expect(getSkinArtPath('Aphelios', SKIN_ORIGINAL)).toBe('/img/champion/Aphelios.jpg')
      expect(getSkinArtPath('NotAChampion', SKIN_ORIGINAL)).toBe('/img/champion/NotAChampion.jpg')
    })
  })

  describe('pickRandomSkin', () => {
    it('only ever draws skins bundled for that champion', () => {
      const pool = getChampionSkins('Ahri')
      for (let i = 0; i < 50; i++) {
        expect(pool).toContain(pickRandomSkin('Ahri'))
      }
    })

    it('can draw the default look — it is part of the pool', () => {
      const draws = new Set(Array.from({ length: 200 }, () => pickRandomSkin('Ahri')))
      expect(draws.has(SKIN_ORIGINAL)).toBe(true)
      expect(draws.size).toBeGreaterThan(1)
    })

    it('falls back to the original skin for champions without a skin folder', () => {
      expect(pickRandomSkin('NotAChampion')).toBe(SKIN_ORIGINAL)
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

  it('getChampionImage with team 2 uses the enemy roster skin, not the player pick', () => {
    const skinStore = useSkinStore()
    const battleStore = useBattleStore()
    skinStore.setSkin('Ahri', 'KDASkin')
    battleStore.restoreTeams(
      [{ name: 'Ahri', role: 'mid' }],
      [{ name: 'Ahri', role: 'mid', skin: 'CovenSkin' }],
    )
    expect(battleStore.getChampionImage('Ahri', { team: 1 })).toBe('/img/skins/Ahri/KDASkin.jpg')
    expect(battleStore.getChampionImage('Ahri', { team: 2 })).toBe('/img/skins/Ahri/CovenSkin.jpg')
    // Bard is always the player — a team hint never changes that
    expect(battleStore.getChampionImage('Bard', { team: 2 })).toBe('/img/BardAbilities/Bard.png')
  })

  it('restoreTeams rolls a skin for enemies saved before skins existed', () => {
    const battleStore = useBattleStore()
    battleStore.restoreTeams([{ name: 'Ahri', role: 'mid' }], [{ name: 'Ahri', role: 'mid' }])
    expect(battleStore.team1[0].skin).toBeUndefined()
    expect(getChampionSkins('Ahri')).toContain(battleStore.team2[0].skin)
  })

  it('resetTeamStats keeps the enemy skins of the running battle', () => {
    const battleStore = useBattleStore()
    battleStore.restoreTeams([], [{ name: 'Ahri', role: 'mid', skin: 'CovenSkin' }])
    battleStore.resetTeamStats(battleStore.team2)
    expect(battleStore.team2[0].skin).toBe('CovenSkin')
  })

  it('getChampionImage loads the downscale a small slot asks for', () => {
    const skinStore = useSkinStore()
    const battleStore = useBattleStore()
    // no skin equipped → the classic icon, in the requested variant
    expect(battleStore.getChampionImage('Ahri', { size: 'sm' })).toBe('/img/champion/Ahri-128.jpg')
    skinStore.setSkin('Ahri', 'KDASkin')
    expect(battleStore.getChampionImage('Ahri', { size: 'sm' })).toBe(
      '/img/skins/Ahri/KDASkin-128.jpg',
    )
    expect(battleStore.getChampionImage('Ahri', { size: 'md' })).toBe(
      '/img/skins/Ahri/KDASkin-256.jpg',
    )
  })

  it('enemy portraits honour team and size together', () => {
    const battleStore = useBattleStore()
    battleStore.restoreTeams([], [{ name: 'Ahri', role: 'mid', skin: 'CovenSkin' }])
    expect(battleStore.getChampionImage('Ahri', { team: 2, size: 'sm' })).toBe(
      '/img/skins/Ahri/CovenSkin-128.jpg',
    )
    expect(battleStore.getChampionImage('Ahri', { team: 2 })).toBe('/img/skins/Ahri/CovenSkin.jpg')
  })
})
