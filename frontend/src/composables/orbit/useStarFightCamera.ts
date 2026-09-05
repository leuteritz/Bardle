/* ── Die Phasenmaschine der Star-Fight-Kamera ─────────────────────────────────
   fight → depart → travel → approach → fight je Planetenwechsel; outro am Ende.
   Taktgeber ist `transitionend` der nahen Ebene, Timer × NET_MUL nur als Netz.
   Wanduhr: nichts hier ändert Spielzustand, der Kampf läuft im Store weiter. */

import { ref, computed, watch, onScopeDispose, type Ref, type ComputedRef } from 'vue'
import {
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

export type CameraPhase = 'fight' | 'depart' | 'travel' | 'approach' | 'outro'

export interface StarFightCallout {
  id: number
  kind: 'freed' | 'final' | 'star'
  text: string
}

export interface StarFightCameraOptions {
  open: Ref<boolean>
  currentIndex: Ref<number>
  queue: Ref<readonly string[]>
  outro: Ref<boolean>
  reducedMotion: Ref<boolean>
  galaxyBossPlanetIds?: Ref<ReadonlySet<string>>
  onOutroDone: () => void
}

export interface StarFightCamera {
  phase: Ref<CameraPhase>
  targetPlanetId: Ref<string | null>
  prevPlanetId: Ref<string | null>
  travelling: ComputedRef<boolean>
  materializing: Ref<boolean>
  flash: Ref<boolean>
  callout: Ref<StarFightCallout | null>
  onNearTransitionEnd: () => void
}

type Timer = ReturnType<typeof setTimeout> | null

export function useStarFightCamera(opts: StarFightCameraOptions): StarFightCamera {
  const phase = ref<CameraPhase>('fight')
  const targetPlanetId = ref<string | null>(opts.queue.value[opts.currentIndex.value] ?? null)
  const prevPlanetId = ref<string | null>(null)
  const materializing = ref(false)
  const flash = ref(false)
  const callout = ref<StarFightCallout | null>(null)
  const travelling = computed(() => phase.value !== 'fight')

  let net: Timer = null
  let hold: Timer = null
  let materialize: Timer = null
  let calloutTimer: Timer = null
  let outroTimer: Timer = null
  let calloutId = 0

  function clear(t: Timer): null {
    if (t !== null) clearTimeout(t)
    return null
  }

  function clearFlight() {
    net = clear(net)
    hold = clear(hold)
    materialize = clear(materialize)
    materializing.value = false
  }

  function clearAll() {
    clearFlight()
    calloutTimer = clear(calloutTimer)
    outroTimer = clear(outroTimer)
  }

  function say(kind: StarFightCallout['kind'], text: string) {
    callout.value = { id: ++calloutId, kind, text }
    calloutTimer = clear(calloutTimer)
    calloutTimer = setTimeout(() => {
      calloutTimer = null
      callout.value = null
    }, STAR_FIGHT_CALLOUT_MS)
  }

  function toFight() {
    clearFlight()
    phase.value = 'fight'
    if (!opts.reducedMotion.value) {
      materializing.value = true
      materialize = setTimeout(() => {
        materialize = null
        materializing.value = false
      }, STAR_FIGHT_BOSS_MATERIALIZE_MS)
    }
  }

  function toApproach() {
    net = clear(net)
    hold = clear(hold)
    phase.value = 'approach'
    const ms = opts.reducedMotion.value
      ? STAR_FIGHT_CAM_RM_FADE_MS
      : STAR_FIGHT_CAM_APPROACH_MS * STAR_FIGHT_CAM_NET_MUL
    net = setTimeout(toFight, ms)
  }

  function toTravel() {
    net = clear(net)
    phase.value = 'travel'
    hold = setTimeout(toApproach, STAR_FIGHT_CAM_HOLD_MS)
  }

  function startDepart() {
    clearFlight()
    phase.value = 'depart'
    // Reduced motion: kein transitionend (transition: none) — die Blende taktet
    if (opts.reducedMotion.value) {
      net = setTimeout(toApproach, STAR_FIGHT_CAM_RM_FADE_MS)
      return
    }
    net = setTimeout(toTravel, STAR_FIGHT_CAM_DEPART_MS * STAR_FIGHT_CAM_NET_MUL)
  }

  function onNearTransitionEnd() {
    if (phase.value === 'depart') toTravel()
    else if (phase.value === 'approach') toFight()
    else if (phase.value === 'outro') flash.value = true
  }

  watch(opts.currentIndex, (idx, old) => {
    if (!opts.open.value || opts.outro.value) return
    const q = opts.queue.value
    const next = q[idx] ?? null
    if (next === null || idx <= (old ?? 0) || phase.value === 'outro') {
      targetPlanetId.value = next
      return
    }
    prevPlanetId.value = targetPlanetId.value ?? q[old ?? 0] ?? null
    targetPlanetId.value = next
    const isFinalGalaxy = opts.galaxyBossPlanetIds?.value.has(next) ?? false
    if (isFinalGalaxy && idx === q.length - 1) say('final', 'GALAXY CORE · FINAL')
    else say('freed', `PLANET FREED · ${idx} / ${q.length}`)
    startDepart()
  })

  watch(opts.outro, (on) => {
    if (!on || !opts.open.value) return
    clearAll()
    prevPlanetId.value = targetPlanetId.value
    phase.value = 'outro'
    const q = opts.queue.value
    say('star', `STAR FREED · ${q.length} / ${q.length}`)
    const rm = opts.reducedMotion.value
    if (!rm) {
      // Der Blitz kommt per transitionend; das Netz zündet ihn spätestens nach der Fahrt
      net = setTimeout(() => {
        net = null
        flash.value = true
      }, STAR_FIGHT_CAM_DEPART_MS)
    }
    outroTimer = setTimeout(
      () => {
        outroTimer = null
        opts.onOutroDone()
      },
      rm ? STAR_FIGHT_CAM_OUTRO_RM_MS : STAR_FIGHT_CAM_OUTRO_MS,
    )
  })

  watch(opts.open, (open) => {
    clearAll()
    phase.value = 'fight'
    prevPlanetId.value = null
    flash.value = false
    callout.value = null
    targetPlanetId.value = open ? (opts.queue.value[opts.currentIndex.value] ?? null) : null
  })

  onScopeDispose(clearAll)

  return { phase, targetPlanetId, prevPlanetId, travelling, materializing, flash, callout, onNearTransitionEnd }
}
