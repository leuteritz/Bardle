<script lang="ts">
/* Module-wide coordinator: only ONE badge tooltip may be visible at a time.
   Opening a new tooltip instantly closes the previous one (no hide-delay,
   no lingering leave animation overlap), so hovering from badge to badge
   feels immediate. */
let closeActiveTooltip: (() => void) | null = null
</script>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { placeTip } from '@/utils/ui/tipAnchor'
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
  /** Vorzugsseite. Default 'bottom' — die Gegenseite nur, wenn dort Platz ist. */
  prefer?: 'top' | 'bottom'
  /** Das Panel fängt den Zeiger nicht: es liegt über anderen Ankern (Karte). */
  passive?: boolean
  /** Hover-Absicht in ms. Nur der ERSTE Tooltip wartet, der Wechsel nicht. */
  openDelay?: number
  /** Zugehörigkeitsfarbe der Sprache (`--tip-color`) — Akzentleiste und
      Pfeil nehmen sie. Ohne sie Gold. */
  accent?: string
}>()

const wrapRef = ref<HTMLElement | null>(null)
const tipRef = ref<HTMLElement | null>(null)
const show = ref(false)
const placement = ref<'bottom' | 'top'>('bottom')
const tipStyle = ref<Record<string, string>>({ left: '-9999px', top: '0px' })
let hideTimer: ReturnType<typeof setTimeout> | null = null
let openTimer: ReturnType<typeof setTimeout> | null = null

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

/* Getrennt von `tipStyle` gebunden: die Farbe steht fest, die Lage wechselt
   bei jedem Öffnen — zusammen würde sie bei jeder Messung mitgeschrieben. */
const accentStyle = computed<Record<string, string>>(() =>
  props.accent ? { '--tip-color': props.accent } : {},
)

function clearHide() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function clearOpen() {
  if (openTimer) {
    clearTimeout(openTimer)
    openTimer = null
  }
}

/* Steht schon ein Tooltip, wird sofort umgeschaltet — die Verzögerung soll den
   Zeigerstrich über dichte Anker abfangen, nicht den Wechsel bremsen. */
function requestOpen() {
  if (props.disabled) return
  clearHide()
  const delay = props.openDelay ?? 0
  if (!delay || closeActiveTooltip) {
    open()
    return
  }
  clearOpen()
  openTimer = setTimeout(() => {
    openTimer = null
    open()
  }, delay)
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
    // Nur die Kante, die das Panel räumt, darf von einem Vorfahren kommen —
    // waagerecht folgt es immer seinem eigenen Anker.
    const host = props.clearAncestor
      ? (anchor.closest(props.clearAncestor) as HTMLElement | null)
      : null
    const p = placeTip({
      anchor: r,
      clear: host ? host.getBoundingClientRect() : undefined,
      tipW: tip.offsetWidth,
      tipH: tip.offsetHeight,
      gap: props.gap ?? BADGE_TOOLTIP_GAP_PX,
      margin: BADGE_TOOLTIP_VIEWPORT_MARGIN_PX,
      caretInset: BADGE_TOOLTIP_CARET_INSET_PX,
      prefer: props.prefer,
    })
    placement.value = p.placement
    tipStyle.value = { left: `${p.left}px`, top: `${p.top}px`, '--caret-x': `${p.caretX}px` }
  })
}

function scheduleHide() {
  clearOpen()
  clearHide()
  hideTimer = setTimeout(close, BADGE_TOOLTIP_HIDE_DELAY_MS)
}

function close() {
  clearOpen()
  clearHide()
  show.value = false
  if (closeActiveTooltip === close) closeActiveTooltip = null
}

/* Ein passives Panel hält sich nicht selbst offen — es liegt über anderen
   Ankern und dürfte deren Hover nicht schlucken. */
function panelEnter() {
  if (!props.passive) clearHide()
}
function panelLeave() {
  if (!props.passive) scheduleHide()
}

onUnmounted(() => {
  clearOpen()
  clearHide()
  if (closeActiveTooltip === close) closeActiveTooltip = null
})
</script>

<template>
  <span
    ref="wrapRef"
    class="rpg-btt-anchor"
    @mouseenter="requestOpen"
    @mouseleave="scheduleHide"
    @focusin="requestOpen"
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
        :class="[placement === 'top' ? 'rpg-btt--top' : '', { 'rpg-btt--passive': passive }]"
        :style="[tipStyle, widthStyle, accentStyle]"
        role="tooltip"
        @mouseenter="panelEnter"
        @mouseleave="panelLeave"
      >
        <div class="rpg-btt__caret" />
        <span class="tip-accent" aria-hidden="true" />
        <slot name="tip" :close="close" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rpg-btt-anchor {
  display: contents;
}

/* Fläche, Rand und Schrift kommen aus der Tooltip-Sprache (`.tip-*` in
   `rpg-theme.css`) — dieselbe Karte wie im Skill Tree. Hier steht nur, was
   allein die Hülle weiß: Lage, Stapelhöhe, Grenzen und der Pfeil.

   Die Maße hängen an `--tip-u`, damit das Panel auf 2K/4K mitwächst; die
   Rahmenstärke und der Radius NICHT — beide sind Designkonstanten. */
.rpg-btt {
  position: fixed;
  /* Über der Bottom-Bar (z-index 10000, dem obersten dauerhaften Layer): die
     Header-Panels sind hoch genug, um bis in die Kommandozeile hinunterzu-
     reichen, und wurden dort vom Champion-Rail überdeckt. Ein Tooltip ist ein
     flüchtiger Zeigerzustand — er gehört immer nach ganz oben, sonst hängt
     seine Lesbarkeit davon ab, wie lang sein Inhalt gerade ist. */
  z-index: 10001;
  font-size: var(--tip-u);
  color: var(--tip-text);
  line-height: 1.35;
  min-width: 16.5em;
  max-width: min(26.4em, calc(100vw - 16px));
  background: var(--tip-surface);
  border: 2px solid var(--tip-border);
  border-radius: 4px;
  box-shadow: var(--tip-shadow);
  pointer-events: auto;
}

/* Die Leiste gehört der HÜLLE, nicht dem Inhalt — sie ist Teil des Rahmens.
   Eigener Radius statt `overflow: hidden` am Panel: das schnitte den Pfeil ab,
   der aussen sitzt. */
.rpg-btt .tip-accent {
  border-radius: 2px 2px 0 0;
}

.rpg-btt--passive {
  pointer-events: none;
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
  border-bottom: 6px solid var(--tip-color, var(--tip-border));
}

.rpg-btt--top .rpg-btt__caret {
  top: auto;
  bottom: -6px;
  border-bottom: none;
  border-top: 6px solid var(--tip-color, var(--tip-border));
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
