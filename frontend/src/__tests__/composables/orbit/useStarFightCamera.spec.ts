import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, effectScope, nextTick, type EffectScope } from 'vue'
import { useStarFightCamera, type StarFightCamera } from '@/composables/orbit/useStarFightCamera'
import {
  STAR_FIGHT_CAM_INTRO_HOLD_MS,
  STAR_FIGHT_CAM_DEPART_MS,
  STAR_FIGHT_CAM_HOLD_MS,
  STAR_FIGHT_CAM_APPROACH_MS,
  STAR_FIGHT_CAM_OUTRO_MS,
  STAR_FIGHT_CAM_OUTRO_RM_MS,
  STAR_FIGHT_CAM_RM_FADE_MS,
  STAR_FIGHT_CAM_NET_MUL,
  STAR_FIGHT_BOSS_MATERIALIZE_MS,
  STAR_FIGHT_CALLOUT_MS,
} from '@/config/constants'

function harness(rm = false, galaxy: string[] = [], openAtStart = true) {
  const open = ref(openAtStart)
  const currentIndex = ref(0)
  const queue = ref<readonly string[]>(['a', 'b', 'c'])
  const outro = ref(false)
  const reducedMotion = ref(rm)
  const galaxyBossPlanetIds = ref<ReadonlySet<string>>(new Set(galaxy))
  const onOutroDone = vi.fn()
  const scope: EffectScope = effectScope()
  const cam = scope.run(() =>
    useStarFightCamera({ open, currentIndex, queue, outro, reducedMotion, galaxyBossPlanetIds, onOutroDone }),
  ) as StarFightCamera
  return { open, currentIndex, queue, outro, reducedMotion, onOutroDone, cam, scope }
}

type Harness = ReturnType<typeof harness>

async function advance(idx: { value: number }, to: number) {
  idx.value = to
  await nextTick()
}

/** Das Intro zu Ende: Hold, Anflug übers Netz, Materialisieren, Ansage weg. */
function arrive(h: Harness) {
  vi.advanceTimersByTime(
    STAR_FIGHT_CAM_INTRO_HOLD_MS + STAR_FIGHT_CAM_APPROACH_MS * STAR_FIGHT_CAM_NET_MUL + STAR_FIGHT_BOSS_MATERIALIZE_MS,
  )
  expect(h.cam.phase.value).toBe('fight')
  expect(h.cam.travelling.value).toBe(false)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useStarFightCamera — Intro', () => {
  it('öffnet in der Systemansicht und rastet auf das erste Ziel ein', () => {
    const h = harness()
    expect(h.cam.phase.value).toBe('intro')
    expect(h.cam.targetPlanetId.value).toBe('a')
    expect(h.cam.prevPlanetId.value).toBeNull()
    expect(h.cam.travelling.value).toBe(true)
    expect(h.cam.callout.value).toMatchObject({ kind: 'intro', text: 'COURSE SET · 1 / 3' })
    h.scope.stop()
  })

  it('fliegt aus dem Intro über das Netz in den Kampf', () => {
    const h = harness()
    vi.advanceTimersByTime(STAR_FIGHT_CAM_INTRO_HOLD_MS)
    expect(h.cam.phase.value).toBe('approach')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_APPROACH_MS * STAR_FIGHT_CAM_NET_MUL)
    expect(h.cam.phase.value).toBe('fight')
    expect(h.cam.materializing.value).toBe(true)
    vi.advanceTimersByTime(STAR_FIGHT_BOSS_MATERIALIZE_MS)
    expect(h.cam.materializing.value).toBe(false)
    expect(h.cam.callout.value).toBeNull()
    h.scope.stop()
  })

  it('die Ansage des Intros ist weg, bevor der Anflug endet', () => {
    expect(STAR_FIGHT_CALLOUT_MS).toBeLessThan(STAR_FIGHT_CAM_INTRO_HOLD_MS + STAR_FIGHT_CAM_APPROACH_MS)
  })

  it('transitionend zählt erst im Anflug, und das Netz schaltet danach nicht mehr', () => {
    const h = harness()
    h.cam.onNearTransitionEnd()
    expect(h.cam.phase.value).toBe('intro')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_INTRO_HOLD_MS)
    expect(h.cam.phase.value).toBe('approach')
    h.cam.onNearTransitionEnd()
    expect(h.cam.phase.value).toBe('fight')
    expect(h.cam.materializing.value).toBe(true)
    vi.advanceTimersByTime(STAR_FIGHT_BOSS_MATERIALIZE_MS)
    expect(h.cam.materializing.value).toBe(false)
    vi.advanceTimersByTime(STAR_FIGHT_CAM_APPROACH_MS * STAR_FIGHT_CAM_NET_MUL)
    expect(h.cam.phase.value).toBe('fight')
    expect(h.cam.materializing.value).toBe(false)
    h.scope.stop()
  })

  it('reduced motion: kein Intro, sofort die Kampfansicht', () => {
    const h = harness(true)
    expect(h.cam.phase.value).toBe('fight')
    expect(h.cam.targetPlanetId.value).toBe('a')
    expect(h.cam.callout.value).toBeNull()
    expect(h.cam.materializing.value).toBe(false)
    h.scope.stop()
  })

  it('open = false im Intro räumt alles, kein Timer zündet danach', async () => {
    const h = harness()
    h.open.value = false
    await nextTick()
    expect(h.cam.phase.value).toBe('fight')
    expect(h.cam.targetPlanetId.value).toBeNull()
    expect(h.cam.callout.value).toBeNull()
    vi.advanceTimersByTime(STAR_FIGHT_CAM_INTRO_HOLD_MS * 4)
    expect(h.cam.phase.value).toBe('fight')
    h.scope.stop()
  })

  it('ein Wiederöffnen fährt das Intro erneut', async () => {
    const h = harness()
    arrive(h)
    h.open.value = false
    await nextTick()
    h.open.value = true
    await nextTick()
    expect(h.cam.phase.value).toBe('intro')
    expect(h.cam.callout.value?.kind).toBe('intro')
    h.scope.stop()
  })

  it('ein Outro unter dem Ladeschleier wird beim Sichtbarwerden nachgeholt', async () => {
    const h = harness(false, [], false)
    h.outro.value = true
    await nextTick()
    expect(h.cam.phase.value).toBe('fight')
    h.open.value = true
    await nextTick()
    expect(h.cam.phase.value).toBe('outro')
    expect(h.cam.callout.value?.kind).toBe('star')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_OUTRO_MS)
    expect(h.onOutroDone).toHaveBeenCalledTimes(1)
    h.scope.stop()
  })

  it('ein Planetenwechsel im Intro bricht zum Aufbruch auf', async () => {
    const h = harness()
    await advance(h.currentIndex, 1)
    expect(h.cam.phase.value).toBe('depart')
    expect(h.cam.prevPlanetId.value).toBe('a')
    expect(h.cam.targetPlanetId.value).toBe('b')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_INTRO_HOLD_MS)
    expect(h.cam.phase.value).toBe('depart')
    h.scope.stop()
  })
})

describe('useStarFightCamera — Planetenwechsel', () => {
  it('läuft depart → travel → approach → fight über das Netz', async () => {
    const h = harness()
    arrive(h)
    await advance(h.currentIndex, 1)
    expect(h.cam.phase.value).toBe('depart')
    expect(h.cam.prevPlanetId.value).toBe('a')
    expect(h.cam.targetPlanetId.value).toBe('b')
    expect(h.cam.travelling.value).toBe(true)
    expect(h.cam.callout.value?.text).toBe('PLANET FREED · 1 / 3')

    vi.advanceTimersByTime(STAR_FIGHT_CAM_DEPART_MS * STAR_FIGHT_CAM_NET_MUL)
    expect(h.cam.phase.value).toBe('travel')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_HOLD_MS)
    expect(h.cam.phase.value).toBe('approach')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_APPROACH_MS * STAR_FIGHT_CAM_NET_MUL)
    expect(h.cam.phase.value).toBe('fight')
    expect(h.cam.materializing.value).toBe(true)
    vi.advanceTimersByTime(STAR_FIGHT_BOSS_MATERIALIZE_MS)
    expect(h.cam.materializing.value).toBe(false)
    vi.advanceTimersByTime(STAR_FIGHT_CALLOUT_MS)
    expect(h.cam.callout.value).toBeNull()
    h.scope.stop()
  })

  it('schaltet auf transitionend früher als das Netz', async () => {
    const h = harness()
    arrive(h)
    await advance(h.currentIndex, 1)
    h.cam.onNearTransitionEnd()
    expect(h.cam.phase.value).toBe('travel')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_HOLD_MS)
    expect(h.cam.phase.value).toBe('approach')
    h.cam.onNearTransitionEnd()
    expect(h.cam.phase.value).toBe('fight')
    // Das Netz darf danach nichts mehr umschalten
    vi.advanceTimersByTime(STAR_FIGHT_CAM_APPROACH_MS * STAR_FIGHT_CAM_NET_MUL)
    expect(h.cam.phase.value).toBe('fight')
    h.scope.stop()
  })

  it('startet bei einem zweiten Wechsel während approach sauber neu', async () => {
    const h = harness()
    arrive(h)
    await advance(h.currentIndex, 1)
    h.cam.onNearTransitionEnd()
    vi.advanceTimersByTime(STAR_FIGHT_CAM_HOLD_MS)
    expect(h.cam.phase.value).toBe('approach')
    await advance(h.currentIndex, 2)
    expect(h.cam.phase.value).toBe('depart')
    expect(h.cam.prevPlanetId.value).toBe('b')
    expect(h.cam.targetPlanetId.value).toBe('c')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_DEPART_MS * STAR_FIGHT_CAM_NET_MUL)
    expect(h.cam.phase.value).toBe('travel')
    h.scope.stop()
  })

  it('nennt das Finale des Galaxieboss-Sterns beim Namen', async () => {
    const h = harness(false, ['c'])
    arrive(h)
    await advance(h.currentIndex, 2)
    expect(h.cam.callout.value?.kind).toBe('final')
    expect(h.cam.callout.value?.text).toBe('GALAXY CORE · FINAL')
    h.scope.stop()
  })

  it('reduced motion: kein Flug, nur Blende und Schnitt', async () => {
    const h = harness(true)
    await advance(h.currentIndex, 1)
    expect(h.cam.phase.value).toBe('depart')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_RM_FADE_MS)
    expect(h.cam.phase.value).toBe('approach')
    vi.advanceTimersByTime(STAR_FIGHT_CAM_RM_FADE_MS)
    expect(h.cam.phase.value).toBe('fight')
    expect(h.cam.materializing.value).toBe(false)
    h.scope.stop()
  })
})

describe('useStarFightCamera — Outro und Schliessen', () => {
  it('fährt heraus, blitzt und meldet das Ende nach OUTRO_MS', async () => {
    const h = harness()
    arrive(h)
    await advance(h.currentIndex, 2)
    vi.advanceTimersByTime(5000)
    h.outro.value = true
    await nextTick()
    expect(h.cam.phase.value).toBe('outro')
    expect(h.cam.prevPlanetId.value).toBe('c')
    expect(h.cam.travelling.value).toBe(true)
    expect(h.cam.callout.value?.kind).toBe('star')
    expect(h.cam.flash.value).toBe(false)
    h.cam.onNearTransitionEnd()
    expect(h.cam.flash.value).toBe(true)
    expect(h.onOutroDone).not.toHaveBeenCalled()
    vi.advanceTimersByTime(STAR_FIGHT_CAM_OUTRO_MS)
    expect(h.onOutroDone).toHaveBeenCalledTimes(1)
    h.scope.stop()
  })

  it('reduced motion: schliesst nach OUTRO_RM_MS ohne Blitz', async () => {
    const h = harness(true)
    h.outro.value = true
    await nextTick()
    vi.advanceTimersByTime(STAR_FIGHT_CAM_OUTRO_RM_MS)
    expect(h.onOutroDone).toHaveBeenCalledTimes(1)
    expect(h.cam.flash.value).toBe(false)
    h.scope.stop()
  })

  it('open = false räumt alles und meldet nichts mehr', async () => {
    const h = harness()
    arrive(h)
    await advance(h.currentIndex, 1)
    h.outro.value = true
    await nextTick()
    h.open.value = false
    await nextTick()
    expect(h.cam.phase.value).toBe('fight')
    expect(h.cam.targetPlanetId.value).toBeNull()
    expect(h.cam.callout.value).toBeNull()
    vi.advanceTimersByTime(STAR_FIGHT_CAM_OUTRO_MS * 2)
    expect(h.onOutroDone).not.toHaveBeenCalled()
    h.scope.stop()
  })

  it('ein Rücksprung des Index bei offener Bühne fährt nicht', async () => {
    const h = harness()
    arrive(h)
    await advance(h.currentIndex, 2)
    vi.advanceTimersByTime(5000)
    await advance(h.currentIndex, 0)
    expect(h.cam.phase.value).toBe('fight')
    expect(h.cam.targetPlanetId.value).toBe('a')
    h.scope.stop()
  })
})
