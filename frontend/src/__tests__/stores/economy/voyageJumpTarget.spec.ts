import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { ExpeditionMission, ExpeditionStatus } from '@/types'

/*
 * Der Sprung von aussen in den Voyages-Atlas. Er bindet die Ordnung des
 * Fleet-Bands: wer sie dort ändert, muss sie hier mitziehen — sonst landet der
 * Klick auf der Minimap woanders als auf der ersten Karte des Bands.
 */

function freed(galaxy: number): CompletedGalaxyRecord {
  return {
    galaxy,
    mapSeed: galaxy * 104729,
    themeIndex: galaxy % 20,
    attemptResults: ['rescued', 'rescued'],
    durationSeconds: 90,
    completedAt: 0,
  }
}

function mission(
  configId: string,
  galaxy: number,
  status: ExpeditionStatus = 'success',
): ExpeditionMission {
  return {
    id: `run-${configId}`,
    configId,
    name: 'Silent Drift Survey',
    description: '',
    icon: 'game-icons:caravel',
    requiredRoles: [],
    assignedChampions: [],
    durationSeconds: 60,
    startTime: 0,
    baseReward: 100,
    successChance: 0.5,
    status,
    reward: 100,
    galaxy,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('voyageJumpTarget', () => {
  it('bleibt null, solange keine Galaxie befreit ist', () => {
    expect(useExpeditionStore().voyageJumpTarget).toBeNull()
  })

  it('nennt ohne wartende Crew die jüngste befreite Galaxie, ohne Marke', () => {
    useGalaxyStore().completedGalaxies.push(freed(2), freed(7), freed(4))
    expect(useExpeditionStore().voyageJumpTarget).toEqual({ galaxy: 7, pinKey: null })
  })

  it('springt auf die wartende Crew und wählt ihre Marke', () => {
    useGalaxyStore().completedGalaxies.push(freed(3), freed(9))
    const store = useExpeditionStore()
    store.activeExpeditions.push(mission('drift-survey', 3))
    expect(store.voyageJumpTarget).toEqual({ galaxy: 3, pinKey: 'drift-survey' })
  })

  it('ignoriert Crews, die noch unterwegs sind', () => {
    useGalaxyStore().completedGalaxies.push(freed(3), freed(9))
    const store = useExpeditionStore()
    store.activeExpeditions.push(mission('drift-survey', 3, 'active'))
    expect(store.voyageJumpTarget).toEqual({ galaxy: 9, pinKey: null })
  })

  // Zweitschlüssel des Fleet-Bands: Galaxie absteigend.
  it('nimmt bei zwei wartenden Crews die höhere Galaxie', () => {
    useGalaxyStore().completedGalaxies.push(freed(3), freed(9))
    const store = useExpeditionStore()
    store.activeExpeditions.push(mission('low-run', 3), mission('high-run', 9))
    expect(store.voyageJumpTarget).toEqual({ galaxy: 9, pinKey: 'high-run' })
  })

  // Drittschlüssel: pinKey aufsteigend — gleiche Eingabe, gleiche Reihenfolge.
  it('trennt zwei Crews derselben Galaxie über den pinKey', () => {
    useGalaxyStore().completedGalaxies.push(freed(5))
    const store = useExpeditionStore()
    store.activeExpeditions.push(mission('zeta-run', 5), mission('alpha-run', 5))
    expect(store.voyageJumpTarget).toEqual({ galaxy: 5, pinKey: 'alpha-run' })
  })

  // Eine gescheiterte Mission will genauso eingesammelt werden wie eine
  // geglückte — im Fleet-Band teilen sie sich denselben Rang.
  it('behandelt eine gescheiterte Crew wie eine geglückte', () => {
    useGalaxyStore().completedGalaxies.push(freed(4), freed(8))
    const store = useExpeditionStore()
    store.activeExpeditions.push(mission('lost-run', 4, 'failed'))
    expect(store.voyageJumpTarget).toEqual({ galaxy: 4, pinKey: 'lost-run' })
  })

  it('überspringt eine Crew, deren Galaxie nicht befreit ist', () => {
    useGalaxyStore().completedGalaxies.push(freed(6))
    const store = useExpeditionStore()
    store.activeExpeditions.push(mission('ghost-run', 99))
    expect(store.voyageJumpTarget).toEqual({ galaxy: 6, pinKey: null })
  })
})
