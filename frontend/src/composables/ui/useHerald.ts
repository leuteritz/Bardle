import { ref, readonly } from 'vue'
import { HERALD_DISPLAY_MS, HERALD_QUEUE_MAX } from '@/config/constants'

/** The milestone moments worth a large centered announcement — plus the two
 *  small kinds: `ready` is ambient (a notify badge has just appeared and says so
 *  once), `forged` is a receipt (the player bought something in the Star Forge).
 *  Each has its own arrival rule, see announceAmbient / announceAction. */
export type HeraldKind = 'warp' | 'champion' | 'rankup' | 'chronicle' | 'omen' | 'ready' | 'forged'

/** Fully-resolved presentation payload — the composable stays purely mechanical
 *  (queue + preempt + timer); the caller supplies everything the banner shows. */
export interface HeraldPayload {
  kind: HeraldKind
  /** Small letter-spaced label above the headline (e.g. "WARP COMPLETE"). */
  eyebrow: string
  /** The big line (galaxy name / champion name / rank). */
  headline: string
  /** Muted line under the headline. */
  subline?: string
  /** Portrait or rank-emblem image path. */
  imageSrc?: string
  /** Iconify `game-icons:*` name, shown in a medallion when no image is given. */
  icon?: string
  /** Accent color as an "r, g, b" triple driving glow + hairlines. */
  accent: string
  /** Round the image (champion portrait) vs. contain it (rank emblem). */
  round?: boolean
  /** How long this banner holds, in ms. Defaults to HERALD_DISPLAY_MS — only
   *  the ambient `ready` kind shortens it. */
  holdMs?: number
}

interface HeraldItem extends HeraldPayload {
  id: number
}

// Module-global singleton state — one herald stream shared across the app,
// exactly like useActionToast / useEventLog.
const queue = ref<HeraldItem[]>([])
const current = ref<HeraldItem | null>(null)
let idCounter = 0
let displayTimer: ReturnType<typeof setTimeout> | null = null

function pump() {
  if (current.value || queue.value.length === 0) return
  current.value = queue.value.shift() ?? null
  if (!current.value) return
  displayTimer = setTimeout(() => {
    current.value = null
    displayTimer = null
    pump()
  }, current.value.holdMs ?? HERALD_DISPLAY_MS)
}

function announce(payload: HeraldPayload) {
  // Milestones play sequentially — each gets its full display window. A batch
  // flushed together (e.g. warp + newly-unlocked champion at a galaxy boundary)
  // queues in order instead of stomping one another; the oldest is dropped once
  // the queue is full so a burst can never grow unbounded.
  if (queue.value.length >= HERALD_QUEUE_MAX) queue.value.shift()
  queue.value.push({ ...payload, id: ++idCounter })
  pump()
}

/** A nudge, not a ceremony. An ambient herald never queues behind a milestone
 *  and never pushes one out of the buffer — is anything playing or waiting, it
 *  simply does not happen. The badge it speaks for stays on screen either way,
 *  so nothing is lost; a dropped WARP COMPLETE would be. */
function announceAmbient(payload: HeraldPayload) {
  if (current.value || queue.value.length > 0) return
  announce(payload)
}

/**
 * A receipt for something the player just did — a Star Forge purchase.
 *
 * It behaves like `useActionToast`: only the LATEST one matters. A second
 * receipt replaces the one on screen instead of queueing behind it, because a
 * queue would trail behind a player clicking through eight levels and still be
 * naming the first one when they stop.
 *
 * Against a MILESTONE it steps aside rather than over: it jumps to the head of
 * the queue and plays the moment the ceremony ends. Never dropped — the player
 * spent something and has to see what for.
 */
function announceAction(payload: HeraldPayload) {
  // At most one receipt anywhere: an older one is worthless the moment a newer
  // purchase happens.
  queue.value = queue.value.filter((i) => i.kind !== payload.kind)
  const busyWithOther = !!current.value && current.value.kind !== payload.kind
  const item = { ...payload, id: ++idCounter }
  if (busyWithOther) {
    queue.value.unshift(item)
  } else {
    // Take the screen now. The timer lives only in pump(), so it is cleared
    // here and set there — never in two places.
    if (displayTimer) {
      clearTimeout(displayTimer)
      displayTimer = null
    }
    current.value = null
    queue.value.unshift(item)
  }
  pump()
}

function reset() {
  queue.value = []
  current.value = null
  if (displayTimer) {
    clearTimeout(displayTimer)
    displayTimer = null
  }
}

export function useHerald() {
  return { current: readonly(current), announce, announceAmbient, announceAction, reset }
}
