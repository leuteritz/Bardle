<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useEventLog, type GameEvent } from '@/composables/ui/useEventLog'
import { useEventLogPane } from '@/composables/ui/useEventLogPane'
import { onKeybinding } from '@/composables/system/useKeybindings'
import { invalidateHudField } from '@/utils/ui/hudField'
import {
  typeColor,
  GROUP_OF_TYPE,
  EVENT_GROUPS,
  EVENT_GROUP_EMPTY,
  type EventTabId,
} from '@/config/ui/eventLog'
import { formatEventClock, formatEventLines } from '@/utils/ui/eventLogFormat'
import {
  EVENT_LOG_BAR_GAP,
  EVENT_LOG_BAR_H,
  EVENT_LOG_BAR_H_MID,
  EVENT_LOG_BAR_H_WIDE,
  EVENT_LOG_BAR_PAD,
  EVENT_LOG_COPY_FEEDBACK_MS,
  EVENT_LOG_PANEL_MAX_H,
  EVENT_LOG_PANEL_MAX_W,
  EVENT_LOG_PANEL_MIN_H,
  EVENT_LOG_PANEL_MIN_W,
  EVENT_LOG_PANEL_VH,
  EVENT_LOG_PANEL_VW,
  EVENT_LOG_TOOL_W,
  EVENT_LOG_TOOL_W_MID,
  EVENT_LOG_TOOL_W_WIDE,
  EVENT_LOG_TRAIL_FADE_PX,
  EVENT_LOG_TRAIL_FADE_TOP_PX,
  EVENT_LOG_TRAIL_MAX_ROWS,
  EVENT_LOG_TRAIL_MOVE_ROWS,
  EVENT_LOG_WHEEL_ANCESTOR_DEPTH,
} from '@/config/constants'

// Per v-bind statt beschreibend im CSS: eine Konstante, die nur beschreibt,
// driftet, und die Layout-Spec liest Zahlen, kein DOM. Die Schwellen der
// Container-Queries stehen dagegen fest im CSS — dort nimmt `v-bind` nichts an.
const boxW = `clamp(${EVENT_LOG_PANEL_MIN_W}px, ${EVENT_LOG_PANEL_VW}vw, ${EVENT_LOG_PANEL_MAX_W}px)`
const boxH = `clamp(${EVENT_LOG_PANEL_MIN_H}px, ${EVENT_LOG_PANEL_VH}vh, ${EVENT_LOG_PANEL_MAX_H}px)`
const barH = `${EVENT_LOG_BAR_H}px`
const barHMid = `${EVENT_LOG_BAR_H_MID}px`
const barHWide = `${EVENT_LOG_BAR_H_WIDE}px`
const barPad = `${EVENT_LOG_BAR_PAD}px`
const barGap = `${EVENT_LOG_BAR_GAP}px`
const toolW = `${EVENT_LOG_TOOL_W}px`
const toolWMid = `${EVENT_LOG_TOOL_W_MID}px`
const toolWWide = `${EVENT_LOG_TOOL_W_WIDE}px`
const fadeMask = `linear-gradient(to bottom, #000 calc(100% - ${EVENT_LOG_TRAIL_FADE_PX}px), transparent 100%)`
// Zurückgerollt blendet auch der Kopf aus: das ist das einzige Zeichen dafür,
// dass oben Neueres steht, und es kommt ohne Beschriftung aus.
const fadeMaskBoth = `linear-gradient(to bottom, transparent 0, #000 ${EVENT_LOG_TRAIL_FADE_TOP_PX}px, #000 calc(100% - ${EVENT_LOG_TRAIL_FADE_PX}px), transparent 100%)`

const uiStore = useUiStore()
const gameStore = useGameStore()
const starGroupStore = useStarGroupStore()
const { historyVersion, readHistory, clearEvents } = useEventLog()
const { folded, toggleFold } = useEventLogPane()

const shell = ref<HTMLElement | null>(null)
const trailGroup = ref<{ $el?: HTMLElement } | null>(null)
const activeTab = ref<EventTabId>('all')
const copied = ref(false)
const scrolled = ref(false)
/** Der eingefrorene Stand, solange zurückgerollt ist — sonst `null`. */
const frozenRows = ref<GameEvent[] | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const trailEl = () => trailGroup.value?.$el ?? null

// Die Spur liegt unter Modalen und Profil-Tabs: verdeckt statt bedienbar wäre
// eine Leiste, die noch Fokus fängt.
const covered = computed(
  () =>
    uiStore.bardActiveTab !== null ||
    starGroupStore.starFightModalOpen ||
    gameStore.isEncyclopediaOpen,
)

function inTab(event: GameEvent, tab: EventTabId): boolean {
  return tab === 'all' || GROUP_OF_TYPE[event.type] === tab
}

/** Der Ringpuffer ist nicht reaktiv; hieran hängt die Neuberechnung. */
const history = computed<GameEvent[]>(() => {
  void historyVersion.value
  return readHistory()
})

/** Die ganze gefilterte Historie — davon liest Copy, nicht die Spur. */
const rows = computed(() => history.value.filter((e) => inTab(e, activeTab.value)))

const trailRows = computed(() => rows.value.slice(0, EVENT_LOG_TRAIL_MAX_ROWS))

/** Was die Spur zeigt: live — oder der Stand, an dem gerade gelesen wird. */
const displayRows = computed(() => frozenRows.value ?? trailRows.value)

const tabCounts = computed<Record<EventTabId, number>>(() => {
  const counts = { all: 0, combat: 0, cosmos: 0, progress: 0, system: 0 }
  for (const event of history.value) {
    counts.all++
    counts[GROUP_OF_TYPE[event.type]]++
  }
  return counts
})

// ── Die Kanten, die die HUD-Kontur liest ────────────────────────────────────
// Gemeldet wird die WURZEL: eingeklappt ist sie die Leiste, und `bottom` fällt
// von selbst auf deren Kante. Reine px-Zahlen, nie calc() — das löst
// getComputedStyle nicht auf. Die Höhe hängt bewusst NICHT am Inhalt: sonst
// schriebe jedes Ereignis eine Custom Property samt Style-Recalc.
function publishEdges() {
  const root = document.documentElement.style
  const rect = covered.value ? null : shell.value?.getBoundingClientRect()
  root.setProperty('--event-log-bottom', `${rect ? Math.round(rect.bottom) : 0}px`)
  root.setProperty('--event-log-left', `${rect ? Math.round(rect.left) : 0}px`)
  invalidateHudField()
}

let observer: ResizeObserver | null = null

function measure() {
  publishEdges()
}

// ── Rad-Scrollen durch die Historie ─────────────────────────────────────────
// Die Spur bleibt klickdurchlässig: `pointer-events: auto` trägt allein die
// Leiste. Das Rad findet sie deshalb über ihre KANTE, nicht über ein Element.

/** Eingefroren statt nachrutschend — neue Zeilen schieben nicht unterm Zeiger. */
function setScrolled(on: boolean) {
  if (on === scrolled.value) return
  scrolled.value = on
  frozenRows.value = on ? trailRows.value : null
}

function resetScroll() {
  const el = trailEl()
  if (el) el.scrollTop = 0
  setScrolled(false)
}

/** Kann etwas unter dem Zeiger selbst rollen, gehört das Rad ihm. */
function ancestorTakesWheel(target: EventTarget | null) {
  let el = target instanceof Element ? target : null
  for (let depth = 0; el && depth < EVENT_LOG_WHEEL_ANCESTOR_DEPTH; depth++) {
    if (el.scrollHeight - el.clientHeight > 1) {
      const overflow = getComputedStyle(el).overflowY
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}

function onWheel(event: WheelEvent) {
  const el = trailEl()
  if (!el || folded.value) return
  const box = el.getBoundingClientRect()
  if (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  ) {
    return
  }
  const max = el.scrollHeight - el.clientHeight
  if (max <= 0 || ancestorTakesWheel(event.target)) return
  event.preventDefault()
  const next = Math.min(Math.max(el.scrollTop + event.deltaY, 0), max)
  if (next === el.scrollTop) return
  el.scrollTop = next
  setScrolled(next > 0)
}

function selectTab(id: EventTabId) {
  activeTab.value = id
  resetScroll()
}

function clearAll() {
  clearEvents()
  resetScroll()
}

function copyRows() {
  try {
    navigator.clipboard?.writeText(formatEventLines(rows.value))
  } catch {
    /* clipboard unavailable — feedback still shows */
  }
  copied.value = true
  if (copyTimer !== null) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
    copyTimer = null
  }, EVENT_LOG_COPY_FEEDBACK_MS)
}

onKeybinding('eventLog', () => toggleFold())

watch([covered, folded], () => {
  setScrolled(false)
  // Ein Frame später: eingeklappt hat die Wurzel ihre neue Höhe erst nach dem
  // Patch, und der ResizeObserver käme mit derselben Zahl ein zweites Mal.
  requestAnimationFrame(measure)
})

onMounted(() => {
  window.addEventListener('resize', measure)
  window.addEventListener('wheel', onWheel, { passive: false })
  if (typeof ResizeObserver === 'function' && shell.value) {
    observer = new ResizeObserver(measure)
    observer.observe(shell.value)
  }
  measure()
})

onUnmounted(() => {
  window.removeEventListener('resize', measure)
  window.removeEventListener('wheel', onWheel)
  observer?.disconnect()
  if (copyTimer !== null) clearTimeout(copyTimer)
  const root = document.documentElement.style
  root.setProperty('--event-log-bottom', '0px')
  root.setProperty('--event-log-left', '0px')
  invalidateHudField()
})
</script>

<template>
  <section
    v-if="!covered"
    ref="shell"
    class="elp"
    :class="{ 'elp--folded': folded }"
    aria-label="Event log"
  >
    <div class="elp-bar">
      <div class="elp-tabs" role="tablist" aria-label="Event categories">
        <button
          v-for="group in EVENT_GROUPS"
          :key="group.id"
          class="elp-tab"
          :class="{ 'elp-tab--active': activeTab === group.id }"
          type="button"
          role="tab"
          :aria-selected="activeTab === group.id"
          :aria-label="`${group.label} — ${tabCounts[group.id]}`"
          :title="`${group.label} — ${tabCounts[group.id]}`"
          @click="selectTab(group.id)"
        >
          <Icon :icon="group.icon" width="18" height="18" />
          <span class="elp-tab-label">{{ group.label }}</span>
          <span class="elp-tab-count">{{ tabCounts[group.id] }}</span>
        </button>
      </div>

      <button
        class="elp-tool"
        :class="{ 'elp-tool--done': copied }"
        type="button"
        :aria-label="`Copy ${rows.length} lines to the clipboard`"
        :title="`Copy ${rows.length} lines`"
        @click="copyRows"
      >
        <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" width="18" height="18" />
      </button>
      <button
        class="elp-tool"
        type="button"
        aria-label="Clear the log"
        title="Clear the log"
        @click="clearAll"
      >
        <Icon icon="lucide:eraser" width="18" height="18" />
      </button>
      <button
        class="elp-tool elp-fold"
        type="button"
        :aria-expanded="!folded"
        aria-controls="event-log-trail"
        :title="folded ? 'Unfold the event log' : 'Fold the event log'"
        @click="toggleFold"
      >
        <Icon icon="lucide:chevron-down" width="18" height="18" />
      </button>
    </div>

    <TransitionGroup
      v-if="!folded"
      id="event-log-trail"
      ref="trailGroup"
      name="elp-row"
      tag="div"
      class="elp-trail"
      :class="{ 'elp-trail--scrolled': scrolled }"
      role="log"
    >
      <p v-if="!rows.length" key="empty" class="elp-empty">
        {{ EVENT_GROUP_EMPTY[activeTab] }}
      </p>
      <div
        v-for="(event, index) in displayRows"
        :key="event.id"
        class="elp-row"
        :class="{ 'elp-row--still': index >= EVENT_LOG_TRAIL_MOVE_ROWS }"
        :style="{ '--row-color': typeColor[event.type] }"
      >
        <span class="elp-time">{{ formatEventClock(event.timestamp, true) }}</span>
        <span class="elp-msg">{{ event.message }}</span>
      </div>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.elp {
  position: fixed;
  right: var(--hud-col-edge);
  top: calc(var(--header-total-height, 118px) + 8px);
  width: v-bind(boxW);
  height: v-bind(boxH);
  /* Nie tiefer als das freie Band zwischen Header und erhobener Bottom-Bar.
     46px = Keycap-Leiste plus der temporäre Admin-Knopf (z-index 9999). */
  max-height: calc(
    100vh - var(--header-total-height, 118px) - var(--hud-panel-size, 330px) -
      var(--kb-hud-h, 0px) - 46px
  );
  /* Über der Missionskarte (899), unter dem Codex-Drawer (950) und allem,
     was darüber aufgeht. */
  z-index: 910;
  display: flex;
  flex-direction: column;
  /* Rahmenlos, und nur die Leiste ist bedienbar — die Zeilen bleiben
     klickdurchlässig, damit die Bühne dahinter erreichbar ist. */
  pointer-events: none;
  overflow: clip;
  container-type: inline-size;
}

/* Eingeklappt trägt die Wurzel nur die Leiste — und meldet genau das an die
   Kontur. Keine Höhenanimation: sie weckte den ResizeObserver in jedem Frame. */
.elp--folded {
  height: auto;
  min-height: 0;
}

/* Die EINE gefasste Fläche des Logs. */
.elp-bar {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: v-bind(barGap);
  flex-shrink: 0;
  height: v-bind(barH);
  padding: 0 v-bind(barPad);
  background: #16120a;
  border: 1px solid #5c3310;
  border-radius: 4px;
}

.elp-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-right: auto;
}

/* Kein Name am aktiven Tab: er wog 80 px in einer Reihe von 352, und die drei
   Werkzeuge rechts wollen auch stehen. Der Name steht im title. */
.elp-tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 20px;
  padding: 0 6px;
  background: none;
  border: none;
  border-radius: 3px;
  color: #8a6030;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.elp-tab:hover {
  background: #201a10;
  color: #c89040;
}

.elp-tab--active {
  background: #2a1c0c;
  color: #e8c040;
}

.elp-tab-count {
  font-variant-numeric: tabular-nums;
}

/* Der Name steht IMMER im DOM — eine Container-Query kann kein `v-if`. Schmal
   traegt das Icon allein, ab 480 der aktive Tab seinen Namen, ab 540 alle. */
.elp-tab-label {
  display: none;
}

/* Icon-Groesse gehoert ins CSS: die scoped Regel gewinnt ohnehin gegen das
   Attribut, und drei Attributwerte waeren drei Quellen. */
.elp-tab svg,
.elp-tool svg {
  width: 14px;
  height: 14px;
}

.elp-tool {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: v-bind(toolW);
  height: 20px;
  flex-shrink: 0;
  background: none;
  border: none;
  border-radius: 3px;
  color: #8a6030;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.elp-tool:hover {
  background: #2a1c0c;
  color: #e8c040;
}

.elp-tool--done {
  color: #52b830;
}

.elp-fold {
  transition: transform 0.15s ease;
}

.elp--folded .elp-fold {
  transform: rotate(-90deg);
}

/* Was nicht in die Höhe passt, fällt unten heraus, und die Maske blendet die
   unterste Zeile aus, statt sie abzuschneiden. Die Spur füllt dafür den
   Restraum — inhaltshoch endete die Maske am letzten Eintrag und blendete ihn
   auch dann aus, wenn darunter noch Platz war. */
.elp-trail {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 6px;
  /* Der Abstand haengt an der Spur, nicht an der Leiste: eingeklappt meldet die
     Wurzel sonst 6 px Nichts an die Kontur. */
  margin-top: 6px;
  min-height: 0;
  /* Scrollport, kein `clip`: das Rad setzt `scrollTop`, und `clip` liesse das
     nicht zu. Keine Leiste — bedienbar wäre sie ohnehin nicht. */
  overflow: hidden;
  overscroll-behavior: contain;
  -webkit-mask-image: v-bind(fadeMask);
  mask-image: v-bind(fadeMask);
}

.elp-trail--scrolled {
  -webkit-mask-image: v-bind(fadeMaskBoth);
  mask-image: v-bind(fadeMaskBoth);
}

.elp-row {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  flex-shrink: 0;
  padding: 6px 11px 6px 9px;
  background: linear-gradient(90deg, rgba(6, 4, 14, 0.92) 0%, rgba(10, 6, 2, 0.86) 100%);
  border-left: 3px solid var(--row-color, #c8b89a);
  border-top: 1px solid rgba(255, 200, 80, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.42);
  border-radius: 5px;
  line-height: 1.32;
}

.elp-time {
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: rgba(200, 160, 80, 0.45);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

/* Die Farbe trägt hier der Text mit — es sind höchstens
   EVENT_LOG_TRAIL_MAX_ROWS Zeilen, keine 300. */
.elp-msg {
  color: var(--row-color, #c8b89a);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-shadow:
    0 0 6px color-mix(in oklab, var(--row-color, #c8b89a) 55%, transparent),
    0 1px 3px rgba(0, 0, 0, 0.8);
  overflow-wrap: anywhere;
}

.elp-empty {
  padding: 4px 11px;
  color: #6d5a3a;
  font-size: 12px;
}

.elp-row-enter-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.elp-row-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.elp-row-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.elp-row-leave-to {
  opacity: 0;
  transform: translateX(12px) scale(0.97);
}

.elp-row-move {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Was unterhalb der Spur liegt, rückt ohne Animation nach — sonst trüge jede
   der gerenderten Zeilen je Ereignis eine FLIP-Transition. Die Klasse hängt am
   INDEX, nicht an `nth-child`: Vue prüft die Move-Transition an einem Klon des
   ERSTEN Kindes und hängt ihn ans Ende der Liste. */
.elp-row--still.elp-row-move {
  transition: none;
}

/* Ab hier trägt die Gasse neben dem Header die Spur (Full HD: Gasse 404
   gegen 384 + 12 Rand + 8 Lücke) — sie rückt aus der Header-Unterkante
   heraus auf dessen Höhe. Darunter bleibt sie darunter stehen: der Header
   steht dort auf seinem Boden und die Gasse fällt mit dem Fenster. Die
   Zahl bindet eventLogLayout.spec.ts. */
@media (min-width: 1850px) {
  .elp {
    top: 0.5rem;
    /* Neben dem Header traegt die Spur die Spaltenbreite — dieselbe Formel wie
       die Kartenspalte links, damit beide Kanten auf einer Linie enden. */
    width: var(--hud-col-w);
    max-height: calc(100vh - 0.5rem - var(--hud-panel-size, 330px) - var(--kb-hud-h, 0px) - 46px);
  }
}

/* Der flache Viewport bekommt nur weniger Polster — die Höhe selbst ist ein
   clamp und bleibt davon unberührt. */
@media (max-height: 1100px) {
  .elp-trail {
    gap: 5px;
  }

  .elp-row {
    padding: 5px 10px 5px 8px;
  }
}

/* ── Die Stufen ───────────────────────────────────────────────────────────
   Gemessen wird die SPURBREITE, nicht der Viewport: die Spur ist die Gasse,
   und die haengt am Header. Full HD trifft die schmale Stufe (380), 2K die
   Namensstufe (548), 4K die breite (860). Die beiden GROESSEN-Stufen liegen
   bei 480 und 760, die NAMENS-Schwelle dazwischen bei 540. */
@container (min-width: 480px) {
  .elp-bar {
    height: v-bind(barHMid);
    gap: 4px;
    padding: 0 6px;
  }

  .elp-tab {
    height: 26px;
    padding: 0 7px;
    gap: 5px;
    font-size: 11px;
  }

  .elp-tab svg,
  .elp-tool svg {
    width: 16px;
    height: 16px;
  }

  .elp-tool {
    width: v-bind(toolWMid);
    height: 26px;
  }

  .elp-tab--active .elp-tab-label {
    display: inline;
  }

  .elp-msg {
    font-size: 15px;
  }

  .elp-time {
    font-size: 12px;
  }
}

/* Ab hier traegt JEDER Tab seinen Namen — und die Zahl weicht ihm an den
   inaktiven: fuenf Namen samt fuenf Zaehlern wiegen 610 px in einem Innenraum
   von 534. Sie steht weiter im `title` und im `aria-label`, und auf der
   breiten Stufe kommt sie zurueck. */
@container (min-width: 540px) {
  .elp-tab-label {
    display: inline;
  }

  .elp-tab:not(.elp-tab--active) .elp-tab-count {
    display: none;
  }
}

@container (min-width: 760px) {
  .elp-bar {
    height: v-bind(barHWide);
    gap: 5px;
    padding: 0 8px;
  }

  .elp-tab {
    height: 30px;
    padding: 0 8px;
    font-size: 12px;
  }

  .elp-tab svg,
  .elp-tool svg {
    width: 18px;
    height: 18px;
  }

  .elp-tool {
    width: v-bind(toolWWide);
    height: 30px;
  }

  /* Derselbe Selektor wie auf der Namensstufe, damit er ihn ueberstimmt: hier
     ist Platz fuer Namen UND Zaehler. */
  .elp-tab:not(.elp-tab--active) .elp-tab-count {
    display: inline;
  }

  .elp-msg {
    font-size: 16px;
  }

  .elp-time {
    font-size: 12.5px;
  }

  .elp-row {
    padding: 7px 13px 7px 10px;
  }
}
</style>
