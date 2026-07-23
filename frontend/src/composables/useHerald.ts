import { ref, readonly } from 'vue'
import { HERALD_DISPLAY_MS, HERALD_QUEUE_MAX } from '@/config/constants'

/** The three milestone moments worth a large centered announcement. */
export type HeraldKind = 'warp' | 'champion' | 'rankup'

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
  }, HERALD_DISPLAY_MS)
}

function announce(payload: HeraldPayload) {
  if (queue.value.length >= HERALD_QUEUE_MAX) queue.value.shift()
  queue.value.push({ ...payload, id: ++idCounter })
  // A fresh milestone preempts the banner on screen: drop the current one so the
  // new one spawns centered instead of waiting behind a stale message.
  if (current.value) {
    if (displayTimer) {
      clearTimeout(displayTimer)
      displayTimer = null
    }
    current.value = null
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
  return { current: readonly(current), announce, reset }
}
