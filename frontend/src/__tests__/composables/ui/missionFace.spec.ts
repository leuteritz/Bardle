import { setActivePinia, createPinia } from 'pinia'
import { effectScope, nextTick } from 'vue'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useMissionFace, type MissionFace } from '@/composables/ui/useMissionFace'
import { useMissionStore } from '@/stores/progression/missionStore'
import { MISSIONS, missionRewardLabel, missionRewardParts } from '@/config/progression/missions'
import { MISSION_CLAIM_FLASH_MS } from '@/config/constants'
import type { ComputedRef } from 'vue'

/**
 * Der Abschlussblitz hatte bisher keine Abdeckung — er lebte lokal in der
 * HUD-Karte. Seit die Wayfinder-Zeile im Pause-Overlay dasselbe Gesicht braucht
 * (dort ist der Blitz sogar das EINZIGE, was den Abschluss meldet: der Herold
 * liegt unter dem Overlay), ist es ein geteiltes Composable — und damit
 * prüfbar.
 */
describe('useMissionFace', () => {
  let scope: ReturnType<typeof effectScope>
  let face: ComputedRef<MissionFace | null>
  let flashing: ComputedRef<boolean>

  const mount = () => {
    scope = effectScope()
    scope.run(() => {
      const r = useMissionFace()
      face = r.face
      flashing = r.flashing
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    mount()
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  it('zeigt die laufende Stufe samt Kapitelziffer und Belohnung', () => {
    expect(face.value?.id).toBe(MISSIONS[0].id)
    expect(face.value?.chapterNumeral).toBe('I')
    expect(face.value?.rewardLabel).toBe(missionRewardLabel(MISSIONS[0]))
    // Die Plakette der HUD-Karte liest die Teile, nicht den String.
    expect(face.value?.rewardParts).toEqual(missionRewardParts(MISSIONS[0]))
    expect(flashing.value).toBe(false)
  })

  it('friert beim Einlösen auf der GEFALLENEN Stufe ein, nicht auf der nächsten', async () => {
    const store = useMissionStore()
    store.adminClaimNow()
    await nextTick()
    // Der Store ist bereits weiter — das Gesicht ist es nicht.
    expect(store.index).toBe(1)
    expect(face.value?.id).toBe(MISSIONS[0].id)
    expect(face.value?.ratio).toBe(1)
    expect(face.value?.progress).toBe(MISSIONS[0].target)
    expect(flashing.value).toBe(true)
  })

  it('gibt nach der Frist die nächste Stufe frei', async () => {
    useMissionStore().adminClaimNow()
    await nextTick()
    vi.advanceTimersByTime(MISSION_CLAIM_FLASH_MS + 1)
    await nextTick()
    expect(flashing.value).toBe(false)
    expect(face.value?.id).toBe(MISSIONS[1].id)
  })

  it('macht aus zwei Einlösungen zwei Blitze, nicht einen', async () => {
    const store = useMissionStore()
    store.adminClaimNow()
    await nextTick()
    vi.advanceTimersByTime(MISSION_CLAIM_FLASH_MS - 100)
    store.adminClaimNow()
    await nextTick()
    // Die Frist beginnt von vorn: nach der Restzeit des ersten Blitzes steht
    // immer noch die zweite Stufe.
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(flashing.value).toBe(true)
    expect(face.value?.id).toBe(MISSIONS[1].id)
    vi.advanceTimersByTime(MISSION_CLAIM_FLASH_MS)
    await nextTick()
    expect(flashing.value).toBe(false)
    expect(face.value?.id).toBe(MISSIONS[2].id)
  })

  it('liefert null, wenn die Leiter durch ist — die Zeile entscheidet selbst, was sie zeigt', async () => {
    const store = useMissionStore()
    store.index = MISSIONS.length
    await nextTick()
    expect(face.value).toBeNull()
  })
})
