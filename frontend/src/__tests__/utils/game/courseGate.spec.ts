import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { courseUnlocked, COURSE_GATE_MISSION_ID } from '@/utils/game/courseGate'
import { useMissionStore } from '@/stores/progression/missionStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { MISSION_INDEX } from '@/config/progression/missions'

describe('courseGate', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('zeigt auf eine echte Stufe der Leiter', () => {
    expect(MISSION_INDEX[COURSE_GATE_MISSION_ID]).toBeGreaterThan(0)
  })

  it('ist auf Stufe 1 noch zu', () => {
    expect(courseUnlocked()).toBe(false)
  })

  it('öffnet mit der Kurs-Stufe des Wayfinders', () => {
    useMissionStore().index = MISSION_INDEX[COURSE_GATE_MISSION_ID]
    expect(courseUnlocked()).toBe(true)
    useMissionStore().index = MISSION_INDEX[COURSE_GATE_MISSION_ID] + 5
    expect(courseUnlocked()).toBe(true)
  })

  it('bleibt offen, sobald je ein Kurs gesetzt wurde', () => {
    useGalaxyStore().totalCoursesCharted = 1
    expect(courseUnlocked()).toBe(true)
  })
})
