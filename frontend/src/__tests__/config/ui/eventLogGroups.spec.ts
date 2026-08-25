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

  it('gibt jedem Tab einen Leerzustand', () => {
    expect(Object.keys(EVENT_GROUP_EMPTY).sort()).toEqual([...tabIds].sort())
    for (const text of Object.values(EVENT_GROUP_EMPTY)) {
      expect(text.length).toBeGreaterThan(0)
    }
  })

  it('nennt bei jedem Tab-Icon sein Set — ohne Präfix lädt Iconify nichts', () => {
    for (const group of EVENT_GROUPS) {
      expect(group.icon, `${group.id} trägt kein Set-Präfix`).toMatch(/^[a-z][a-z0-9-]*:[a-z0-9-]+$/)
    }
  })

  it('nutzt jedes Icon in der Leiste genau einmal', () => {
    const icons = EVENT_GROUPS.map((g) => g.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})
