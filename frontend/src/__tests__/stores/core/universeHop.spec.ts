import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useGameStore } from '@/stores/core/gameStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { getUniverse } from '@/config/progression/universes'

/**
 * Der Universumssprung als Store-Ablauf: der Klick beginnt nur die Zeremonie,
 * der Reset kommt auf der commit-Flanke der Sternschleife, das Ende auf done —
 * oder über das Netz des Schleiers. Keine Uhr im Store.
 */
function stubReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}

const originalMatchMedia = window.matchMedia

function seedOffer() {
  const game = useGameStore()
  const providence = useProvidenceStore()
  providence.rollOffer(game.currentUniverse)
  const target = providence.offer[0].universeId
  return { game, providence, target }
}

describe('Universumssprung — Store-Ablauf', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    stubReducedMotion(false)
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('beginnt die Zeremonie, setzt aber noch nicht zurück', () => {
    const { game, providence, target } = seedOffer()
    const ui = useUiStore()
    ui.setBardTab('universe')
    const before = game.currentUniverse

    game.travelToUniverse(target, { x: 300, y: 200 })

    expect(game.isHyperspaceActive).toBe(true)
    expect(game.hopTarget).toBe(target)
    expect(game.currentUniverse).toBe(before)
    expect(providence.active).not.toBeNull()
    expect(providence.offer).toEqual([])
    // Das Profil bleibt offen — der Schleier schliesst es, sobald er deckt.
    expect(ui.bardActiveTab).toBe('universe')
    expect(ui.universeHop).toEqual({
      target,
      x: 300,
      y: 200,
      accent: getUniverse(target)?.tint,
      phase: 'gate',
    })
  })

  it('beginnt auch ohne offenes Profil mit dem Gate — EINE Choreografie', () => {
    const { game, target } = seedOffer()
    game.travelToUniverse(target)
    expect(useUiStore().universeHop?.phase).toBe('gate')
  })

  it('ignoriert einen zweiten Aufruf, solange der Sprung läuft', () => {
    const { game, target } = seedOffer()
    game.travelToUniverse(target)
    const hop = useUiStore().universeHop
    game.travelToUniverse(target)
    expect(useUiStore().universeHop).toBe(hop)
  })

  it('bricht ab, solange ein Galaxien-Warp läuft', () => {
    const { game, target } = seedOffer()
    useGalaxyStore().setGalaxyTransitioning(true)
    game.travelToUniverse(target)
    expect(game.isHyperspaceActive).toBe(false)
    expect(useUiStore().universeHop).toBeNull()
  })

  it('setzt auf commit genau einmal zurück und sagt die Ankunft an', () => {
    const { game, target } = seedOffer()
    const ui = useUiStore()
    game.travelToUniverse(target)
    const prestiges = game.totalPrestiges

    game.commitUniverseHop()
    expect(game.currentUniverse).toBe(target)
    expect(game.hopTarget).toBeNull()
    expect(game.totalPrestiges).toBe(prestiges + 1)
    expect(ui.pendingArrival?.universe).toBe(target)
    // Das Flag steht noch — der Herold liest daran seine Verzögerung ab.
    expect(game.isHyperspaceActive).toBe(true)

    game.commitUniverseHop()
    expect(game.totalPrestiges).toBe(prestiges + 1)
  })

  it('räumt auf done ab und holt einen fehlenden commit nach', () => {
    const { game, target } = seedOffer()
    const ui = useUiStore()
    game.travelToUniverse(target)
    ui.setBardModalLocked(true)

    game.finishUniverseHop()
    expect(game.currentUniverse).toBe(target)
    expect(game.isHyperspaceActive).toBe(false)
    expect(game.hopTarget).toBeNull()
    expect(ui.bardModalLocked).toBe(false)
    expect(ui.universeHop).toBeNull()
  })

  it('setzt bei reduzierter Bewegung sofort zurück, ohne Zeremonie', () => {
    stubReducedMotion(true)
    const { game, target } = seedOffer()
    const ui = useUiStore()
    ui.setBardTab('universe')

    game.travelToUniverse(target)
    expect(game.currentUniverse).toBe(target)
    expect(game.isHyperspaceActive).toBe(false)
    expect(ui.universeHop).toBeNull()
    expect(ui.bardActiveTab).toBeNull()
  })

  it('lässt keinen Galaxien-Warp anlaufen, solange der Sprung läuft', () => {
    const { game, target } = seedOffer()
    game.travelToUniverse(target)
    const galaxy = useGalaxyStore()
    galaxy.requestTransition()
    expect(galaxy.pendingTransition).toBe(false)
  })

  it('schaltet die Phase nur, solange ein Sprung läuft', () => {
    const ui = useUiStore()
    ui.setUniverseHopPhase('arrive')
    expect(ui.universeHop).toBeNull()
    ui.beginUniverseHop({ target: 2, x: 0, y: 0, accent: '#fff', phase: 'gate' })
    ui.setUniverseHopPhase('threshold')
    expect(ui.universeHop?.phase).toBe('threshold')
    ui.closeBardModal()
    expect(ui.universeHop).not.toBeNull()
  })
})
