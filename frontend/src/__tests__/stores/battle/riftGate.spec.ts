import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useBattleStore } from '@/stores/battle/battleStore'
import { BATTLE_ROLES } from '@/utils/battle/timeline'

/** Das Tor des Rift-Reiters: Leiste, Sperrpanel und START-Knopf lesen NUR
 *  diese Getter — eine zweite Kopie der Regel wäre der Fehler. */
describe('rift gate', () => {
  beforeEach(() => setActivePinia(createPinia()))

  /** Besetzt die ersten `n` Hauptplätze. */
  function seat(store: ReturnType<typeof useBattleStore>, n: number) {
    store.headerSlots = store.headerSlots.map((_, i) => (i < n ? `Champ${i}` : null))
  }

  it('counts against headerSlots, not a hard-coded five', () => {
    const store = useBattleStore()
    expect(store.headerSlots.length).toBe(BATTLE_ROLES.length)
    seat(store, 0)
    expect(store.filledRoleSeats + store.openRoleSeats).toBe(store.headerSlots.length)
  })

  it('holds shut on an empty board', () => {
    const store = useBattleStore()
    seat(store, 0)
    expect(store.isRiftReady).toBe(false)
    expect(store.openRoleSeats).toBe(store.headerSlots.length)
    expect(store.firstOpenRoleSeat).toBe(0)
  })

  it('still holds shut one seat short', () => {
    const store = useBattleStore()
    seat(store, store.headerSlots.length - 1)
    expect(store.isRiftReady).toBe(false)
    expect(store.openRoleSeats).toBe(1)
    expect(store.firstOpenRoleSeat).toBe(store.headerSlots.length - 1)
  })

  it('opens on a full board', () => {
    const store = useBattleStore()
    seat(store, store.headerSlots.length)
    expect(store.isRiftReady).toBe(true)
    expect(store.openRoleSeats).toBe(0)
    expect(store.firstOpenRoleSeat).toBe(-1)
  })

  it('stays open while a battle runs, however many seats were cleared', () => {
    const store = useBattleStore()
    seat(store, 3)
    store.isAutoBattleInitialized = true
    expect(store.isRiftReady).toBe(true)
    expect(store.openRoleSeats).toBe(store.headerSlots.length - 3)
  })

  it('reports the first gap, not the last', () => {
    const store = useBattleStore()
    store.headerSlots = store.headerSlots.map((_, i) => (i === 0 || i === 4 ? null : `Champ${i}`))
    expect(store.firstOpenRoleSeat).toBe(0)
    expect(store.openRoleSeats).toBe(2)
  })
})
