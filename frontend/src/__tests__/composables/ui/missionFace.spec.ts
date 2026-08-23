import { setActivePinia, createPinia } from 'pinia'
import { effectScope, nextTick } from 'vue'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  useMissionFace,
  type MissionChapterView,
  type MissionFace,
} from '@/composables/ui/useMissionFace'
import { useMissionStore } from '@/stores/progression/missionStore'
import {
  MISSIONS,
  MISSION_CHAPTERS,
  MISSION_CHAPTER_SIZES,
  MISSION_CHAPTER_STARTS,
  missionRewardLabel,
  missionRewardParts,
} from '@/config/progression/missions'
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
  let chapters: ComputedRef<MissionChapterView[]>

  const mount = () => {
    scope = effectScope()
    scope.run(() => {
      const r = useMissionFace()
      face = r.face
      flashing = r.flashing
      chapters = r.chapters
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

  /**
   * Die sieben Etappen tragen das Pause-Band UND das Stats-Panel. Eine zweite,
   * parallel gepflegte Rechnung liefe beim ersten Nachjustieren auseinander —
   * deshalb steht sie hier und nicht in einer der beiden Komponenten.
   */
  describe('chapters', () => {
    it('steht am Anfang im ersten Kapitel, alle anderen leer', () => {
      const first = MISSION_CHAPTERS[0]
      expect(chapters.value).toHaveLength(MISSION_CHAPTERS.length)
      expect(chapters.value[0]).toMatchObject({
        id: first.id,
        numeral: 'I',
        color: first.color,
        done: 0,
        running: true,
        complete: false,
      })
      expect(chapters.value.slice(1).every((c) => c.done === 0 && !c.running)).toBe(true)
    })

    it('zählt das laufende Kapitel mit und schließt die davor ab', async () => {
      const store = useMissionStore()
      const second = MISSION_CHAPTERS[1]
      store.index = MISSION_CHAPTER_STARTS[second.id] + 2
      await nextTick()
      expect(chapters.value[0].complete).toBe(true)
      expect(chapters.value[0].ratio).toBe(1)
      expect(chapters.value[1]).toMatchObject({ done: 2, running: true, complete: false })
      expect(chapters.value[1].ratio).toBeCloseTo(2 / MISSION_CHAPTER_SIZES[second.id])
      expect(chapters.value[2].done).toBe(0)
    })

    /** Ist die Leiter durch, steht kein Kapitel mehr auf `running` — sonst
     *  blinkte die Etappenleiste am Ende weiter, als ginge es noch weiter. */
    it('schließt am Ende alle Etappen und lässt keine laufen', async () => {
      const store = useMissionStore()
      store.index = MISSIONS.length
      await nextTick()
      expect(chapters.value.every((c) => c.complete && c.ratio === 1)).toBe(true)
      expect(chapters.value.some((c) => c.running)).toBe(false)
    })

    /** Der Weg zählt, was eingelöst IST — auch während der Blitz noch die eben
     *  gefallene Stufe zeigt. */
    it('rückt beim Einlösen sofort weiter, obwohl das Gesicht noch steht', async () => {
      const store = useMissionStore()
      store.adminClaimNow()
      await nextTick()
      expect(flashing.value).toBe(true)
      expect(face.value?.id).toBe(MISSIONS[0].id)
      expect(chapters.value[0].done).toBe(1)
    })
  })
})
