import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'

/**
 * Die Farbwelt der nächsten Galaxie wird beim AUFBRUCH gezogen, nicht erst beim
 * Schnitt: der Warp blendet über die zweite Hälfte des Flugs dorthin, und dafür
 * muss das Ziel zehn Sekunden früher feststehen. Zwei Würfe an zwei Zeitpunkten
 * hiessen: man fliegt in eine Farbe hinein und kommt in einer anderen an.
 */
function completeGalaxy(store: ReturnType<typeof useGalaxyStore>): void {
  store.starsRescued = store.starsRequired
  store.galaxyBossDefeated = true
  store.bossEscortsTotal = 0
  store.bossEscortsDefeated = 0
}

describe('Farbwelt-Übergabe beim Galaxienwechsel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('legt beim Aufbruch ein Ziel fest', () => {
    const store = useGalaxyStore()
    completeGalaxy(store)
    expect(store.pendingThemeIndex).toBeNull()
    store.requestTransition()
    expect(store.pendingTransition).toBe(true)
    expect(store.pendingThemeIndex).not.toBeNull()
    expect(store.pendingThemeIndex).toBeGreaterThanOrEqual(0)
    expect(store.pendingThemeIndex).toBeLessThan(GALAXY_THEMES.length)
    // Und es ist eine ANDERE Welt als die, aus der man aufbricht.
    expect(store.pendingThemeIndex).not.toBe(store.currentThemeIndex)
  })

  it('übernimmt am Schnitt genau dieses Ziel — kein zweiter Wurf', () => {
    const store = useGalaxyStore()
    completeGalaxy(store)
    store.requestTransition()
    const promised = store.pendingThemeIndex
    store.commitAdvance()
    expect(store.currentThemeIndex).toBe(promised)
    // Und das Versprechen ist eingelöst, nicht liegengeblieben.
    expect(store.pendingThemeIndex).toBeNull()
    expect(store.pendingUsedThemes).toBeNull()
    expect(store.usedThemeIndices).toContain(promised)
  })

  it('würfelt ohne Aufbruch weiterhin selbst', () => {
    // Der Rückfall trägt die Wege, die ohne Flug hier ankommen: reduzierte
    // Bewegung, der Waisen-Guard der Schleife, und die Specs, die direkt
    // `commitAdvance()` rufen.
    const store = useGalaxyStore()
    const before = store.currentThemeIndex
    store.commitAdvance()
    expect(store.currentThemeIndex).not.toBe(before)
    expect(store.pendingThemeIndex).toBeNull()
  })

  it('verwirft das Ziel beim Admin-Sprung — sonst klobbert es die nachgetragene Kette', () => {
    // Der Nachtrag schreibt `currentThemeIndex` und `usedThemeIndices` neu. Bliebe
    // ein Ziel aus einem angefangenen Aufbruch stehen, nähme `commitAdvance()`
    // es samt seinem VERALTETEN `used`-Schnappschuss und überschriebe die
    // gerade geschriebene Kette — mitsamt der Regel, dass keine zwei Farbwelten
    // aufeinander folgen.
    const store = useGalaxyStore()
    completeGalaxy(store)
    store.requestTransition()
    expect(store.pendingThemeIndex).not.toBeNull()
    store.adminJumpToGalaxy(9)
    expect(store.pendingThemeIndex).toBeNull()
    expect(store.pendingUsedThemes).toBeNull()
    const themes = store.completedGalaxies.map((r) => r.themeIndex)
    for (let i = 1; i < themes.length; i++) expect(themes[i]).not.toBe(themes[i - 1])
    expect(store.currentThemeIndex).not.toBe(themes[themes.length - 1])
  })

  it('wiederholt über viele Sprünge keine Farbwelt direkt hintereinander', () => {
    const store = useGalaxyStore()
    const seen: number[] = [store.currentThemeIndex]
    for (let i = 0; i < 12; i++) {
      completeGalaxy(store)
      store.requestTransition()
      store.commitAdvance()
      seen.push(store.currentThemeIndex)
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
  })
})
