<script lang="ts">
/* Module-wide coordinator: only ONE badge tooltip may be visible at a time.
   Opening a new tooltip instantly closes the previous one (no hide-delay,
   no lingering leave animation overlap), so hovering from badge to badge
   feels immediate. */
let closeActiveTooltip: (() => void) | null = null
</script>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import {
  BADGE_TOOLTIP_GAP_PX,
  BADGE_TOOLTIP_VIEWPORT_MARGIN_PX,
  BADGE_TOOLTIP_HIDE_DELAY_MS,
  BADGE_TOOLTIP_CARET_INSET_PX,
} from '@/config/constants'

/* Generic hover tooltip for notify badges. The default slot holds the anchor
   (badge/button) — the wrapper uses display:contents, so it never affects
   layout or absolute positioning of the anchor. The panel teleports to <body>
   (position:fixed), clamps to the viewport on every desktop resolution and
   flips above the anchor when there is no room below. Hovering the panel
   keeps it open, so slot content may be interactive. */
const props = defineProps<{
  disabled?: boolean
  /** anchor→panel gap in px — override when another element overlaps the
      default position (defaults to BADGE_TOOLTIP_GAP_PX) */
  gap?: number
  /** widen the panel past its 320px default — any CSS length, so callers can
      pass a clamp() that scales with the viewport. For tip content that is a
      small dashboard rather than a sentence (header material stats). */
  width?: string
  /** Selector of an ancestor whose edge the panel clears instead of the
      anchor's own. Needed where the anchor sits inside a dense block: the
      header material grid stacks two rows, so a panel that only cleared its
      own cell would land on top of the row below it. The caret still points
      at the anchor — only the vertical edge changes. */
  clearAncestor?: string
}>()

const wrapRef = ref<HTMLElement | null>(null)
const tipRef = ref<HTMLElement | null>(null)
const show = ref(false)
const placement = ref<'bottom' | 'top'>('bottom')
const tipStyle = ref<Record<string, string>>({ left: '-9999px', top: '0px' })
let hideTimer: ReturnType<typeof setTimeout> | null = null

/* Bound separately from tipStyle so the width is already applied when open()
   measures the panel — a width arriving with the final position would be
   measured one frame too late and the panel would sit off-centre. */
const widthStyle = computed<Record<string, string>>(() =>
  props.width
    ? {
        width: props.width,
        maxWidth: `calc(100vw - ${BADGE_TOOLTIP_VIEWPORT_MARGIN_PX * 2}px)`,
      }
    : {},
)

function clearHide() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function open() {
  if (props.disabled) return
  clearHide()
  const anchor = wrapRef.value?.firstElementChild as HTMLElement | null
  if (!anchor) return
  const r = anchor.getBoundingClientRect()
  if (!r.width && !r.height) return
  if (closeActiveTooltip && closeActiveTooltip !== close) closeActiveTooltip()
  closeActiveTooltip = close
  // start offscreen so the panel can be measured without a visible jump
  tipStyle.value = { left: '-9999px', top: '0px' }
  show.value = true
  nextTick(() => {
    const tip = tipRef.value
    if (!tip) return
    const tw = tip.offsetWidth
    const th = tip.offsetHeight
    const m = BADGE_TOOLTIP_VIEWPORT_MARGIN_PX
    const gap = props.gap ?? BADGE_TOOLTIP_GAP_PX
    // Horizontal placement always follows the anchor; only the edge the panel
    // has to clear may come from an ancestor.
    const host = props.clearAncestor
      ? (anchor.closest(props.clearAncestor) as HTMLElement | null)
      : null
    const clear = host ? host.getBoundingClientRect() : r
    let left = r.left + r.width / 2 - tw / 2
    left = Math.min(Math.max(left, m), window.innerWidth - tw - m)
    let top = clear.bottom + gap
    placement.value = 'bottom'
    if (top + th + m > window.innerHeight && clear.top - gap - th > m) {
      top = clear.top - gap - th
      placement.value = 'top'
    }
    const inset = BADGE_TOOLTIP_CARET_INSET_PX
    const caretX = Math.min(Math.max(r.left + r.width / 2 - left, inset), tw - inset)
    tipStyle.value = { left: `${left}px`, top: `${top}px`, '--caret-x': `${caretX}px` }
  })
}

function scheduleHide() {
  clearHide()
  hideTimer = setTimeout(close, BADGE_TOOLTIP_HIDE_DELAY_MS)
}

function close() {
  clearHide()
  show.value = false
  if (closeActiveTooltip === close) closeActiveTooltip = null
}

onUnmounted(() => {
  clearHide()
  if (closeActiveTooltip === close) closeActiveTooltip = null
})
</script>

<template>
  <span
    ref="wrapRef"
    class="rpg-btt-anchor"
    @mouseenter="open"
    @mouseleave="scheduleHide"
    @focusin="open"
    @focusout="scheduleHide"
  >
    <slot />
  </span>

  <Teleport to="body">
    <Transition name="rpg-btt">
      <div
        v-if="show"
        ref="tipRef"
        class="rpg-btt"
        :class="placement === 'top' ? 'rpg-btt--top' : ''"
        :style="[tipStyle, widthStyle]"
        role="tooltip"
        @mouseenter="clearHide"
        @mouseleave="scheduleHide"
      >
        <div class="rpg-btt__caret" />
        <slot name="tip" :close="close" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rpg-btt-anchor {
  display: contents;
}

.rpg-btt {
  position: fixed;
  z-index: 200;
  min-width: 200px;
  max-width: min(320px, calc(100vw - 16px));
  background: #111008;
  border: 3px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 12px 32px rgba(0, 0, 0, 0.9);
  pointer-events: auto;
}

.rpg-btt__caret {
  position: absolute;
  top: -6px;
  left: var(--caret-x, 20px);
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid #7a4e20;
}

.rpg-btt--top .rpg-btt__caret {
  top: auto;
  bottom: -6px;
  border-bottom: none;
  border-top: 6px solid #7a4e20;
}

.rpg-btt-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.rpg-btt-leave-active {
  transition:
    opacity 0.08s ease,
    transform 0.08s ease;
}

.rpg-btt-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.rpg-btt-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.rpg-btt--top.rpg-btt-enter-from {
  transform: translateY(6px);
}

.rpg-btt--top.rpg-btt-leave-to {
  transform: translateY(4px);
}
</style>
