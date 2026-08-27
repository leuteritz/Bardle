import { createApp, defineComponent, h, ref, type App } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useVoyageAtlas } from '@/composables/expedition/useVoyageAtlas'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { CHAMPION_DATA } from '@/config/champions/championData'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { FORGE_MASS_SEND_NODE } from '@/config/constants'

/**
 * Der Riegel gehört der AKTION, nicht dem Knopf. Die Kachel der Kopfleiste ist
 * heute ihr einziger Aufrufer — eine Regel, die nur dort steht, gilt aber nur
 * so lange, bis der zweite kommt.
 */
/** `onBeforeUnmount` im Atlas verlangt eine Instanz — sonst warnt Vue je Lauf. */
let app: App | null = null
function mountAtlas() {
  let out: ReturnType<typeof useVoyageAtlas> | null = null
  app = createApp(
    defineComponent({
      setup() {
        out = useVoyageAtlas(ref(false))
        return () => h('div')
      },
    }),
  )
  app.mount(document.createElement('div'))
  return out!
}

describe('useVoyageAtlas.sendAll — hinter „All Sails at Once"', () => {
  afterEach(() => {
    app?.unmount()
    app = null
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    useGalaxyStore().completedGalaxies.push({
      galaxy: 1,
      mapSeed: 1234,
      themeIndex: 0,
      attemptResults: ['rescued'],
      durationSeconds: 60,
      completedAt: 0,
    })
    // Ohne Kader bemannt `crewFor` nichts, und der Test prueft ins Leere.
    useBattleStore().ownedChampions.push(...Object.keys(CHAMPION_DATA))
  })

  it('startet ohne die Konstellation nichts und mit ihr alles Bemannte', () => {
    const expedition = useExpeditionStore()
    const forge = useStarForgeStore()
    // `isVisible` bleibt false: der Atlas darf hier keine Uhr starten.
    const atlas = mountAtlas()

    expedition.forceSpawn()
    const crewed = expedition.availableExpeditions.filter((o) =>
      expedition.crewFor(o).every((c) => !!c),
    )
    expect(crewed.length, 'ohne bemannten Vertrag prüft der Test nichts').toBeGreaterThan(0)

    atlas.sendAll()
    expect(expedition.activeExpeditions.length, 'gesperrt und trotzdem gestartet').toBe(0)

    forge.forgedConstellations.push(FORGE_MASS_SEND_NODE)
    atlas.sendAll()
    expect(expedition.activeExpeditions.length).toBeGreaterThan(0)
  })
})
