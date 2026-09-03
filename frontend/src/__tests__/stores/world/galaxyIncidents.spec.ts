import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { VOID_RIFTS } from '@/config/world/void'
import { DRIFTERS } from '@/config/world/drifters'
import { GALAXY_INCIDENT_MAX } from '@/config/constants'

const VOID_ABYSSAL = VOID_RIFTS.filter((r) => r.severity === 'abyssal')[0]
const VOID_LESSER = VOID_RIFTS.filter((r) => r.severity === 'lesser')[0]
const DRIFTER_COMMON = DRIFTERS.filter((d) => d.rarity === 'common')[0]
const DRIFTER_RARE = DRIFTERS.filter((d) => d.rarity === 'rare')[0]
const DRIFTER_LEGENDARY = DRIFTERS.filter((d) => d.rarity === 'legendary')[0]

/**
 * Die Ereignis-Chronik ist die dritte gespeicherte Grösse einer Galaxie, nach
 * `attemptResults` und `landfallResults`. Anders als die beiden ist sie NICHT
 * index-parallel: es sind beliebig viele, und sie ist gedeckelt.
 */
describe('galaxyStore — die Ereignis-Chronik', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stempelt die Etappe selbst — nur der Store weiss, wo das Schiff steht', () => {
    const galaxy = useGalaxyStore()
    galaxy.attemptResults = ['rescued', 'failed', 'rescued']
    galaxy.recordIncident({ kind: 'void-impact', id: VOID_LESSER.id, hp: 6, meeps: 1 })
    expect(galaxy.incidentResults).toHaveLength(1)
    expect(galaxy.incidentResults[0].leg).toBe(3)
    expect(galaxy.incidentResults[0].hp).toBe(6)
  })

  it('bucht den Einschlag im Bosskampf auf die letzte Sehne, nicht daneben', () => {
    const galaxy = useGalaxyStore()
    galaxy.attemptResults = ['rescued', 'rescued']
    galaxy.recordIncident({ kind: 'void-impact', id: VOID_ABYSSAL.id })
    expect(galaxy.incidentResults[0].leg).toBe(galaxy.attemptResults.length)
  })

  /**
   * Der Deckel läuft je ART. Zusammengelegt verdrängte eine Serie von
   * Drifterfängen jeden Einschlag, und eine Galaxie voller abyssaler Treffer
   * sähe am Ende makellos aus.
   */
  it('deckelt Void und Drifter getrennt', () => {
    const galaxy = useGalaxyStore()
    for (let i = 0; i < GALAXY_INCIDENT_MAX + 5; i++) {
      galaxy.recordIncident({ kind: 'drifter-caught', id: DRIFTER_RARE.id })
    }
    expect(galaxy.incidentResults).toHaveLength(GALAXY_INCIDENT_MAX)

    galaxy.recordIncident({ kind: 'void-impact', id: VOID_LESSER.id })
    expect(galaxy.incidentResults).toHaveLength(GALAXY_INCIDENT_MAX + 1)
  })

  it('lässt beim Überlauf den höheren Rang gewinnen', () => {
    const galaxy = useGalaxyStore()
    for (let i = 0; i < GALAXY_INCIDENT_MAX; i++) {
      galaxy.recordIncident({ kind: 'void-impact', id: VOID_LESSER.id })
    }
    galaxy.recordIncident({ kind: 'void-impact', id: VOID_ABYSSAL.id })

    expect(galaxy.incidentResults).toHaveLength(GALAXY_INCIDENT_MAX)
    expect(galaxy.incidentResults.filter((e) => e.id === VOID_ABYSSAL.id)).toHaveLength(1)
  })

  it('verwirft den gleichrangigen Nachzügler, statt einen älteren zu verdrängen', () => {
    const galaxy = useGalaxyStore()
    for (let i = 0; i < GALAXY_INCIDENT_MAX; i++) {
      galaxy.recordIncident({ kind: 'void-impact', id: VOID_ABYSSAL.id, hp: 1 })
    }
    galaxy.recordIncident({ kind: 'void-impact', id: VOID_ABYSSAL.id, hp: 999 })
    expect(galaxy.incidentResults.filter((e) => e.hp === 999)).toHaveLength(0)
  })

  it('räumt die Chronik beim Galaxiewechsel — sie gehört DIESER Galaxie', () => {
    const galaxy = useGalaxyStore()
    galaxy.recordIncident({ kind: 'void-impact', id: VOID_LESSER.id })
    galaxy.commitAdvance()
    expect(galaxy.incidentResults).toEqual([])
  })

  it('legt sie beim Abschluss ins Archiv', () => {
    const galaxy = useGalaxyStore()
    galaxy.starsRequired = 1
    galaxy.starsRescued = 1
    galaxy.attemptResults = ['rescued']
    galaxy.galaxyBossDefeated = true
    galaxy.bossEscortsTotal = 0
    galaxy.bossEscortsDefeated = 0
    galaxy.recordIncident({ kind: 'void-impact', id: VOID_ABYSSAL.id, hp: 32, meeps: 4 })
    galaxy.maybeRecordCompletion()

    const record = galaxy.completedGalaxies[galaxy.completedGalaxies.length - 1]
    expect(record?.incidentResults).toHaveLength(1)
    expect(record?.incidentResults?.[0].id).toBe(VOID_ABYSSAL.id)
  })
})

/**
 * Gebucht wird nur, was Folgen hatte. Ein `common`-Drifter kommt alle 20 bis 30
 * Sekunden — als Marke wären das rund fünfzig je Galaxie.
 */
describe('drifterStore — nur die seltenen kommen auf die Karte', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('bucht einen gefangenen rare Drifter', () => {
    const drifter = useDrifterStore()
    const galaxy = useGalaxyStore()
    const d = drifter.spawnDrifter(DRIFTER_RARE.id)
    expect(d).not.toBeNull()
    drifter.hitDrifter(d!.uid)
    expect(galaxy.incidentResults).toHaveLength(1)
    expect(galaxy.incidentResults[0].kind).toBe('drifter-caught')
  })

  it('bucht einen common Drifter NICHT', () => {
    const drifter = useDrifterStore()
    const galaxy = useGalaxyStore()
    const d = drifter.spawnDrifter(DRIFTER_COMMON.id)
    drifter.hitDrifter(d!.uid)
    expect(galaxy.incidentResults).toEqual([])
  })

  it('bucht auch den verpassten legendary Drifter — die halbe Geschichte reicht nicht', () => {
    const drifter = useDrifterStore()
    const galaxy = useGalaxyStore()
    const d = drifter.spawnDrifter(DRIFTER_LEGENDARY.id)
    expect(d).not.toBeNull()
    // Die Flugzeit ist um: `expireFlownDrifters` liest `drifterNow`.
    drifter.drifterNow = d!.spawnedAt + d!.flightMs + 1
    drifter.expireFlownDrifters()
    expect(galaxy.incidentResults).toHaveLength(1)
    expect(galaxy.incidentResults[0].kind).toBe('drifter-missed')
  })
})
