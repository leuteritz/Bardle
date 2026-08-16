import { ref, readonly } from 'vue'
import { HERALD_DISPLAY_MS, HERALD_QUEUE_MAX } from '@/config/constants'

/** The milestone moments worth a large centered announcement — plus `ready`,
 *  the one ambient kind: a notify badge has just appeared somewhere in the
 *  chrome and says so once, compactly. */
export type HeraldKind = 'warp' | 'champion' | 'rankup' | 'chronicle' | 'omen' | 'ready'

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

function reset() {
  queue.value = []
  current.value = null
  if (displayTimer) {
    clearTimeout(displayTimer)
    displayTimer = null
  }
}

export function useHerald() {
  return { current: readonly(current), announce, announceAmbient, reset }
}
