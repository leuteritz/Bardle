import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePersistence } from '../../composables/usePersistence'
import { useGameStore } from '../../stores/gameStore'
import { useBattleStore } from '../../stores/battleStore'
import { useGalaxyStore } from '../../stores/galaxyStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useExpeditionStore } from '../../stores/expeditionStore'
import { usePlanetBossStore } from '../../stores/planetBossStore'
import { useStarGroupStore } from '../../stores/starGroupStore'
import { usePlayerStore } from '../../stores/playerStore'
import { SAVE_KEY } from '../../config/constants'

/** Die Test-Umgebung stellt kein globales localStorage bereit → In-Memory-Stub. */
function makeLocalStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

/** saveGame ausführen und einen Block des Spielstands gezielt patchen. */
function patchSave(mutate: (saved: Record<string, never>) => void) {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
  mutate(saved)
  localStorage.setItem(SAVE_KEY, JSON.stringify(saved))
}

describe('lifetime counters — save/load roundtrip', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  it('restores every catalog counter unchanged', () => {
    const { saveGame, loadGame } = usePersistence()

    useGameStore().totalMeepsEarned = 61
    useGameStore().totalMeepsSpent = 15
    useGameStore().totalPrestiges = 3
    useGameStore().totalOfflineChimes = 12_000
    useGameStore().totalOfflineSeconds = 900
    useBattleStore().peakMmr = 2260
    useBattleStore().totalLpGained = 8420
    useBattleStore().totalLpLost = 6110
    useGalaxyStore().totalStarsRescued = 38
    useGalaxyStore().totalStarsLost = 11
    useGalaxyStore().totalGalaxyBossesDefeated = 6
    useGalaxyStore().totalBossEscortsDefeated = 44
    useInventoryStore().totalMaterialsCollected = 980
    useInventoryStore().totalMaterialsSpent = 572
    useExpeditionStore().totalExpeditionsStarted = 96
    useExpeditionStore().totalExpeditionsSucceeded = 71
    useExpeditionStore().totalExpeditionsFailed = 25
    useExpeditionStore().totalExpeditionChimes = 420_000
    usePlanetBossStore().totalBossesDefeated = 148
    usePlanetBossStore().totalBossesLost = 29
    usePlanetBossStore().totalBossDamage = 94_000
    usePlanetBossStore().turretVolleyCounter = 21_400
    useStarGroupStore().totalStarsSpawned = 260
    useStarGroupStore().totalPlanetsCleared = 610
    usePlayerStore().totalDamageTaken = 41_200
    usePlayerStore().totalHpRegenerated = 38_900
    usePlayerStore().timesDowned = 7

    saveGame()
    setActivePinia(createPinia())
    loadGame()

    expect(useGameStore().totalMeepsEarned).toBe(61)
    expect(useGameStore().totalMeepsSpent).toBe(15)
    expect(useGameStore().totalPrestiges).toBe(3)
    expect(useGameStore().totalOfflineChimes).toBe(12_000)
    expect(useGameStore().totalOfflineSeconds).toBe(900)
    expect(useBattleStore().peakMmr).toBe(2260)
    expect(useBattleStore().totalLpGained).toBe(8420)
    expect(useBattleStore().totalLpLost).toBe(6110)
    expect(useGalaxyStore().totalStarsRescued).toBe(38)
    expect(useGalaxyStore().totalStarsLost).toBe(11)
    expect(useGalaxyStore().totalGalaxyBossesDefeated).toBe(6)
    expect(useGalaxyStore().totalBossEscortsDefeated).toBe(44)
    expect(useInventoryStore().totalMaterialsCollected).toBe(980)
    expect(useInventoryStore().totalMaterialsSpent).toBe(572)
    expect(useExpeditionStore().totalExpeditionsStarted).toBe(96)
    expect(useExpeditionStore().totalExpeditionsSucceeded).toBe(71)
    expect(useExpeditionStore().totalExpeditionsFailed).toBe(25)
    expect(useExpeditionStore().totalExpeditionChimes).toBe(420_000)
    expect(usePlanetBossStore().totalBossesDefeated).toBe(148)
    expect(usePlanetBossStore().totalBossesLost).toBe(29)
    expect(usePlanetBossStore().totalBossDamage).toBe(94_000)
    expect(usePlanetBossStore().turretVolleyCounter).toBe(21_400)
    expect(useStarGroupStore().totalStarsSpawned).toBe(260)
    expect(useStarGroupStore().totalPlanetsCleared).toBe(610)
    expect(usePlayerStore().totalDamageTaken).toBe(41_200)
    expect(usePlayerStore().totalHpRegenerated).toBe(38_900)
    expect(usePlayerStore().timesDowned).toBe(7)
  })

  it('seeds the counters from a legacy save that predates them', () => {
    const { saveGame, loadGame } = usePersistence()

    useGameStore().currentUniverse = 3
    useGameStore().meeps = 46
    useInventoryStore().collectedMaterials = { stardust: 40, moondust: 12 }
    useGalaxyStore().starsRescued = 4
    useGalaxyStore().completedGalaxies = [
      {
        galaxy: 1,
        mapSeed: 1,
        themeIndex: 0,
        attemptResults: ['rescued', 'failed', 'rescued'],
        durationSeconds: 100,
        completedAt: 1,
      },
    ]
    saveGame()

    // Alle neuen Felder aus dem Spielstand entfernen — so sieht ein alter Save aus
    patchSave((saved) => {
      const s = saved as Record<string, Record<string, unknown>>
      for (const key of [
        'totalMeepsEarned',
        'totalMeepsSpent',
        'totalPrestiges',
        'totalOfflineChimes',
        'totalOfflineSeconds',
      ]) {
        delete s.game[key]
      }
      for (const key of [
        'totalStarsRescued',
        'totalStarsLost',
        'totalGalaxyBossesDefeated',
        'totalBossEscortsDefeated',
      ]) {
        delete s.galaxy[key]
      }
      delete s.inventory.totalMaterialsCollected
      delete s.inventory.totalMaterialsSpent
      delete s.battle.peakMmr
    })

    setActivePinia(createPinia())
    loadGame()

    // Aus dem vorhandenen Spielstand rekonstruiert statt bei 0 zu starten
    expect(useGameStore().totalMeepsEarned).toBe(46)
    expect(useGameStore().totalPrestiges).toBe(2)
    expect(useInventoryStore().totalMaterialsCollected).toBe(52)
    expect(useGalaxyStore().totalStarsRescued).toBe(2 + 4)
    expect(useGalaxyStore().totalStarsLost).toBe(1)
    expect(useGalaxyStore().totalGalaxyBossesDefeated).toBe(1)
    // Peak MMR darf nie unter dem aktuellen MMR liegen
    expect(useBattleStore().peakMmr).toBe(useBattleStore().mmr)
  })
})
