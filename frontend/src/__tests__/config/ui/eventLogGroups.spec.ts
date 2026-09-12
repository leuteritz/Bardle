import { describe, it, expect } from 'vitest'
import {
  typeColor,
  GROUP_OF_TYPE,
  EVENT_GROUPS,
  EVENT_GROUP_EMPTY,
  type EventGroupId,
} from '@/config/ui/eventLog'

/**
 * Die Gruppen sind die Tab-Leiste des Eventlog-Panels. Fällt ein Ereignistyp
 * aus der Zuordnung, verschwindet er lautlos aus JEDEM Tab außer „All" — im
 * Code sieht man das nicht, im Spiel erst, wenn jemand einen Tab vermisst.
 */
describe('Eventlog-Gruppen', () => {
  const tabIds = EVENT_GROUPS.map((g) => g.id)
  const filterIds = tabIds.filter((id) => id !== 'all') as EventGroupId[]

  it('deckt jeden Ereignistyp genau einmal ab', () => {
    expect(Object.keys(GROUP_OF_TYPE).sort()).toEqual(Object.keys(typeColor).sort())
  })

  it('kennt nur Gruppen, die auch einen Tab haben', () => {
    for (const [type, group] of Object.entries(GROUP_OF_TYPE)) {
      expect(filterIds, `${type} zeigt auf die unbekannte Gruppe "${group}"`).toContain(group)
    }
  })

  it('lässt keinen Tab leer ausgehen', () => {
    for (const group of filterIds) {
      expect(
        Object.values(GROUP_OF_TYPE).includes(group),
        `Tab "${group}" hat keinen einzigen Ereignistyp`,
      ).toBe(true)
    }
  })

  it('hält „all" aus der Zuordnung heraus — es filtert nicht, es zeigt alles', () => {
    expect(Object.values(GROUP_OF_TYPE)).not.toContain('all')
    expect(tabIds[0]).toBe('all')
  })

  /**
   * Fehler und Warnungen gehören in den System-Tab und nirgendwo sonst. Ein
   * sechster Tab dafür ist keine Option: `eventLogLayout.spec.ts` rechnet das
   * Breitenbudget der Leiste über `EVENT_GROUPS.length`, und auf Full HD liefe
   * sie damit über.
   */
  it('führt Laufzeitmeldungen unter „System"', () => {
    expect(GROUP_OF_TYPE.error).toBe('system')
    expect(GROUP_OF_TYPE.warning).toBe('system')
    expect(EVENT_GROUPS).toHaveLength(5)
  })

  it('gibt jedem Tab einen beschreibenden Leerzustand', () => {
    expect(Object.keys(EVENT_GROUP_EMPTY).sort()).toEqual([...tabIds].sort())
    const states = Object.values(EVENT_GROUP_EMPTY)
    expect(new Set(states.map((state) => state.title)).size).toBe(states.length)
    for (const state of states) {
      expect(state.title.length).toBeGreaterThan(0)
      expect(state.icon).toMatch(/^[a-z][a-z0-9-]*:[a-z0-9-]+$/)
      expect(state.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('nennt bei jedem Tab-Icon sein Set — ohne Präfix lädt Iconify nichts', () => {
    for (const group of EVENT_GROUPS) {
      expect(group.icon, `${group.id} trägt kein Set-Präfix`).toMatch(
        /^[a-z][a-z0-9-]*:[a-z0-9-]+$/,
      )
    }
  })

  it('nutzt jedes Icon in der Leiste genau einmal', () => {
    const icons = EVENT_GROUPS.map((g) => g.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})
