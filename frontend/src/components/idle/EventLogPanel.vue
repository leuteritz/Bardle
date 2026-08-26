<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import RpgSearchBar from '@/components/ui/RpgSearchBar.vue'
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
  EVENT_LOG_COPY_FEEDBACK_MS,
  EVENT_LOG_SCROLL_TOP_STICK_PX,
  EVENT_LOG_FLASH_MS,
  EVENT_LOG_RENDER_CHUNK,
  EVENT_LOG_LOAD_MORE_PX,
} from '@/config/constants'

const uiStore = useUiStore()
const gameStore = useGameStore()
const starGroupStore = useStarGroupStore()
const { historyVersion, historySize, freshIds, readHistory, clearEvents } = useEventLog()
const { folded, toggleFold } = useEventLogPane()

const shell = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const activeTab = ref<EventTabId>('all')
const query = ref('')
const copied = ref(false)
const visibleCount = ref(EVENT_LOG_RENDER_CHUNK)
let copyTimer: ReturnType<typeof setTimeout> | null = null

// Das Panel liegt unter Modalen und Profil-Tabs: verdeckt statt bedienbar wäre
// ein Panel, das noch Fokus fängt.
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

const matchingQuery = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return history.value
  return history.value.filter(
    (e) => e.message.toLowerCase().includes(needle) || e.type.includes(needle),
  )
})

const rows = computed(() => matchingQuery.value.filter((e) => inTab(e, activeTab.value)))

// Gefiltert wird über die ganze Historie, gerendert nur das Fenster: 300 Zeilen
// dauerhaft im DOM sind der teure Teil, nicht die Rechnung darüber.
const visibleRows = computed(() => rows.value.slice(0, visibleCount.value))

// Zählt die Treffer UNTER dem laufenden Filter — sonst verspricht ein Tab
// Zeilen, die er nach dem Wechsel nicht zeigt.
const tabCounts = computed<Record<EventTabId, number>>(() => {
  const counts = { all: 0, combat: 0, cosmos: 0, progress: 0, system: 0 }
  for (const event of matchingQuery.value) {
    counts.all++
    counts[GROUP_OF_TYPE[event.type]]++
  }
  return counts
})

// ── Das Aufblitzen neuer Zeilen ─────────────────────────────────────────────
// Ein Set statt eines Timers je Zeile: bei Kampfspam liefen sonst Dutzende
// gleichzeitig. Der eine ausstehende Timer prunt nach Alter.
const fresh = ref(new Set<number>())
let freshTimer: ReturnType<typeof setTimeout> | null = null
const freshUntil = new Map<number, number>()

function pruneFresh() {
  freshTimer = null
  const now = performance.now()
  let next = 0
  for (const [id, until] of freshUntil) {
    if (until <= now) {
      freshUntil.delete(id)
      fresh.value.delete(id)
    } else if (!next || until < next) next = until
  }
  fresh.value = new Set(fresh.value)
  if (next) freshTimer = setTimeout(pruneFresh, Math.max(16, next - now))
}

watch(freshIds, (ids) => {
  if (!ids.length || folded.value || covered.value) return
  const until = performance.now() + EVENT_LOG_FLASH_MS
  for (const id of ids) {
    fresh.value.add(id)
    freshUntil.set(id, until)
  }
  fresh.value = new Set(fresh.value)
  // Rein visuell, also reale Zeit — kein gameTimeout.
  if (!freshTimer) freshTimer = setTimeout(pruneFresh, EVENT_LOG_FLASH_MS)
})

// ── Die Kanten, die die HUD-Kontur liest ────────────────────────────────────
// Gemeldet wird die WURZEL: eingeklappt ist sie die Kopfzeile, und `bottom`
// fällt von selbst auf deren Kante. Reine px-Zahlen, nie calc() — das löst
// getComputedStyle nicht auf.
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

function selectTab(id: EventTabId) {
  const list = listRef.value
  const atTop = !list || list.scrollTop <= EVENT_LOG_SCROLL_TOP_STICK_PX
  activeTab.value = id
  visibleCount.value = EVENT_LOG_RENDER_CHUNK
  if (atTop && list) list.scrollTop = 0
}

function onScroll() {
  const list = listRef.value
  if (!list || visibleCount.value >= rows.value.length) return
  if (list.scrollHeight - list.scrollTop - list.clientHeight < EVENT_LOG_LOAD_MORE_PX) {
    visibleCount.value += EVENT_LOG_RENDER_CHUNK
  }
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

function clearQuery() {
  query.value = ''
}

function wipe() {
  clearEvents()
  visibleCount.value = EVENT_LOG_RENDER_CHUNK
}

// Escape wickelt genau EINE Stufe ab: den Filter. Die zweite (schliessen) ist
// mit dem Dauer-HUD entfallen — Escape schliesst in diesem Spiel Overlays, und
// das Log ist keines mehr. Bei leerem Feld läuft die Taste durch.
function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || covered.value || !query.value) return
  clearQuery()
}

onKeybinding('eventLog', () => toggleFold())

watch(query, () => {
  visibleCount.value = EVENT_LOG_RENDER_CHUNK
})

watch([covered, folded], () => {
  // Ein Frame später: eingeklappt hat die Wurzel ihre neue Höhe erst nach dem
  // Patch, und der ResizeObserver käme mit derselben Zahl ein zweites Mal.
  requestAnimationFrame(measure)
})

onMounted(() => {
  window.addEventListener('keydown', onEscape)
  window.addEventListener('resize', measure)
  if (typeof ResizeObserver === 'function' && shell.value) {
    observer = new ResizeObserver(measure)
    observer.observe(shell.value)
  }
  measure()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onEscape)
  window.removeEventListener('resize', measure)
  observer?.disconnect()
  if (copyTimer !== null) clearTimeout(copyTimer)
  if (freshTimer !== null) clearTimeout(freshTimer)
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
    <header class="elp-head">
      <button
        class="elp-fold"
        type="button"
        :aria-expanded="!folded"
        aria-controls="event-log-body"
        :title="folded ? 'Unfold the event log' : 'Fold the event log'"
        @click="toggleFold"
      >
        <Icon icon="game-icons:scroll-quill" width="20" height="20" class="elp-head-mark" />
        <span class="elp-title">Event Log</span>
        <span class="elp-total">{{ historySize }}</span>
        <Icon icon="lucide:chevron-down" width="15" height="15" class="elp-chevron" />
      </button>
      <div class="elp-tools">
        <button
          class="elp-tool"
          :class="{ 'elp-tool--done': copied }"
          type="button"
          :aria-label="`Copy ${rows.length} lines to the clipboard`"
          @click="copyRows"
        >
          <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" width="15" height="15" />
          <span class="elp-tool-word">{{ copied ? 'Copied' : 'Copy' }}</span>
        </button>
        <button
          class="elp-tool elp-tool--icon"
          type="button"
          aria-label="Clear the log"
          @click="wipe"
        >
          <Icon icon="lucide:eraser" width="15" height="15" />
        </button>
      </div>
    </header>

    <div v-if="!folded" id="event-log-body" class="elp-body">
      <div class="elp-controls">
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
            <Icon :icon="group.icon" width="14" height="14" />
            <span v-if="activeTab === group.id" class="elp-tab-label">{{ group.label }}</span>
            <span class="elp-tab-count">{{ tabCounts[group.id] }}</span>
          </button>
        </div>
        <RpgSearchBar
          v-model="query"
          size="sm"
          placeholder="Filter events…"
          aria-label="Filter events"
          class="elp-search"
        />
      </div>

      <div ref="listRef" class="elp-list" role="log" @scroll.passive="onScroll">
        <p v-if="!rows.length" class="elp-empty">
          <Icon icon="game-icons:telescope" width="30" height="30" />
          <span>{{ query.trim() ? 'Nothing matches that.' : EVENT_GROUP_EMPTY[activeTab] }}</span>
        </p>
        <div
          v-for="event in visibleRows"
          :key="event.id"
          class="elp-row"
          :class="{ 'elp-row--fresh': fresh.has(event.id) }"
          :style="{ '--row-color': typeColor[event.type] }"
        >
          <span class="elp-time">{{ formatEventClock(event.timestamp, true) }}</span>
          <span class="elp-dot" :title="event.type" />
          <span class="elp-msg">{{ event.message }}</span>
        </div>
        <p v-if="rows.length > visibleRows.length" class="elp-more">
          {{ rows.length - visibleRows.length }} older
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.elp {
  position: fixed;
  right: 0.75rem;
  top: calc(var(--header-total-height, 118px) + 8px);
  width: clamp(360px, 20vw, 500px);
  height: clamp(280px, 45vh, 860px);
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
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 14px 40px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

/* Eingeklappt trägt die Wurzel nur die Kopfzeile — und meldet genau das an die
   Kontur. Keine Höhenanimation: sie weckte den ResizeObserver in jedem Frame. */
.elp--folded {
  height: auto;
  min-height: 0;
}

.elp::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  z-index: 2;
}

.elp-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 34px;
  padding: 0 8px 0 0;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.elp-fold {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
  padding: 0 6px 0 11px;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.elp-fold:hover {
  background: #2a1c0c;
}

.elp-head-mark {
  color: #e8c040;
  flex-shrink: 0;
}

.elp-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.elp-total {
  min-width: 22px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid #3e200a;
  color: #8a6030;
  font-size: 10.5px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.elp-chevron {
  margin-left: auto;
  flex-shrink: 0;
  color: #8a6030;
  transition: transform 0.15s ease;
}

.elp--folded .elp-chevron {
  transform: rotate(-90deg);
}

.elp-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.elp-tool {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  background: #16120a;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #c89040;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.elp-tool--icon {
  padding: 5px 6px;
}

.elp-tool:hover {
  background: #2a1c0c;
  color: #e8c040;
}

.elp-tool--done {
  color: #52b830;
}

.elp-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Zwei Zeilen, nicht eine: fünf Tabs mit Zähler füllen die Panelbreite schon
   allein aus — daneben bliebe dem Feld null Breite. */
.elp-controls {
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex-shrink: 0;
  padding: 8px 10px;
  background: #16120a;
  border-bottom: 1px solid #3e200a;
}

.elp-tabs {
  display: flex;
  border: 1px solid #5c3310;
  border-radius: 4px;
  overflow: hidden;
}

/* Der aktive Tab NIMMT sich die Breite für seinen Namen, die vier anderen
   geben sie her — deshalb `flex: 0 1 auto` statt gleicher Teilung. So trägt
   jede Panelbreite dieselbe Darstellung: fünf Zahlen und ein Name. */
.elp-tab {
  display: inline-flex;
  flex: 0 1 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  padding: 6px;
  background: #16120a;
  border: none;
  color: #8a6030;
  /* Gemessen: „Progress" wog bei 11 px und 0,09em Sperrung 57,6 px und stand in
     einem 93-px-Tab am Anschlag. */
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.elp-tab--active {
  flex: 1 1 auto;
  gap: 6px;
  padding: 6px 8px;
}

.elp-tab + .elp-tab {
  border-left: 1px solid #3e200a;
}

.elp-tab:hover {
  background: #201a10;
  color: #c89040;
}

.elp-tab--active {
  background: #2a1c0c;
  color: #e8c040;
}

/* Der aktive Name darf beschnitten werden, die Zahl daneben nie. */
.elp-tab--active .elp-tab-label {
  min-width: 0;
}

.elp-tab-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.elp-tab-count {
  flex-shrink: 0;
  min-width: 20px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid #3e200a;
  font-size: 10px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.elp-tab--active .elp-tab-count {
  border-color: #7a4e20;
  color: #e8c060;
}

.elp-search {
  width: 100%;
}

.elp-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0 8px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.elp-row {
  position: relative;
  display: grid;
  /* 52px trägt „09:46:32" ungekürzt — die kurze Fassung sparte 20 px und
     kostete die Sekunden, die im Kampf den Unterschied machen. */
  grid-template-columns: 52px 8px 1fr;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  padding: 3px 10px;
  /* Die Zeilen sind nicht mehr garantiert einzeilig; `auto` merkt sich die
     zuletzt gemessene Höhe, damit der Rollbalken nicht lügt. */
  content-visibility: auto;
  contain-intrinsic-size: auto 34px;
}

.elp-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.018);
}

.elp-row:hover {
  background: rgba(232, 192, 64, 0.05);
}

/* Eigene Ebene mit statischem Schein — animiert wird allein die Deckkraft.
   Ein box-shadow oder border-color rasterte jeden Frame die Box neu. */
.elp-row::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(
    90deg,
    color-mix(in oklab, var(--row-color, #c8b89a) 26%, transparent) 0%,
    transparent 70%
  );
}

.elp-row--fresh::after {
  animation: elp-flash 1s linear forwards;
}

@keyframes elp-flash {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.elp-time {
  font-size: 11px;
  color: #6d5a3a;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
}

/* Die Farbe trägt der Punkt, nicht der Text: 300 farbige Zeilen liest niemand. */
.elp-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--row-color, #c8b89a);
}

.elp-msg {
  font-size: 12.5px;
  color: #cfc0a4;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.elp-more {
  padding: 6px 12px 2px;
  color: #6d5a3a;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  text-align: center;
}

.elp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 160px;
  color: #6d5a3a;
  font-size: 12px;
}

.elp-empty svg {
  color: #3e200a;
}

@media (min-width: 2560px) {
  .elp {
    right: 1.5rem;
  }
}

/* Der flache Viewport bekommt nur weniger Chrome — die Höhe selbst ist ein
   clamp und bleibt davon unberührt. */
@media (max-height: 1100px) {
  .elp-head {
    height: 30px;
  }

  .elp-controls {
    padding: 7px 10px;
  }

  .elp-row {
    min-height: 22px;
  }
}
</style>
