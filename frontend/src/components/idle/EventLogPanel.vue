<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import RpgSearchBar from '@/components/ui/RpgSearchBar.vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useEventLog, type GameEvent } from '@/composables/ui/useEventLog'
import {
  typeColor,
  GROUP_OF_TYPE,
  EVENT_GROUPS,
  EVENT_GROUP_EMPTY,
  type EventTabId,
} from '@/config/ui/eventLog'
import { formatEventClock, formatEventLines } from '@/utils/ui/eventLogFormat'
import { EVENT_LOG_COPY_FEEDBACK_MS, EVENT_LOG_SCROLL_TOP_STICK_PX } from '@/config/constants'

const uiStore = useUiStore()
const { historyVersion, historySize, readHistory, clearEvents } = useEventLog()

const activeTab = ref<EventTabId>('all')
const query = ref('')
const copied = ref(false)
const listRef = ref<HTMLElement | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | null = null

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

function selectTab(id: EventTabId) {
  const list = listRef.value
  const atTop = !list || list.scrollTop <= EVENT_LOG_SCROLL_TOP_STICK_PX
  activeTab.value = id
  if (atTop && list) list.scrollTop = 0
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

function close() {
  uiStore.closeEventLog()
}

// Escape schließt — bewusst kein Registry-Eintrag: die Taste schließt in diesem
// Spiel jedes Overlay und gehört keinem einzelnen Kürzel. Zwei Stufen, und
// deshalb wickelt sie NUR dieser Listener ab: liesse man daneben auch das
// Suchfeld auf Escape hören, fielen beide Stufen in denselben Tastendruck.
function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (query.value) clearQuery()
  else close()
}

onMounted(() => window.addEventListener('keydown', onEscape))

onUnmounted(() => {
  window.removeEventListener('keydown', onEscape)
  if (copyTimer !== null) clearTimeout(copyTimer)
})
</script>

<template>
  <Teleport to="body">
    <div class="elp" role="dialog" aria-label="Event log">
      <header class="elp-head">
        <Icon icon="game-icons:scroll-quill" width="22" height="22" class="elp-head-mark" />
        <h2 class="elp-title">Event Log</h2>
        <span class="elp-total">{{ historySize }}</span>
        <div class="elp-tools">
          <button
            class="elp-tool"
            :class="{ 'elp-tool--done': copied }"
            type="button"
            :aria-label="`Copy ${rows.length} lines to the clipboard`"
            @click="copyRows"
          >
            <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" width="15" height="15" />
            <span>{{ copied ? 'Copied' : 'Copy' }}</span>
          </button>
          <button
            class="elp-tool elp-tool--icon"
            type="button"
            aria-label="Clear the log"
            @click="clearEvents"
          >
            <Icon icon="lucide:eraser" width="15" height="15" />
          </button>
          <button
            class="elp-tool elp-tool--icon"
            type="button"
            aria-label="Close the log"
            @click="close"
          >
            <Icon icon="lucide:x" width="15" height="15" />
          </button>
        </div>
      </header>

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
            @click="selectTab(group.id)"
          >
            <Icon :icon="group.icon" width="13" height="13" />
            <span class="elp-tab-label">{{ group.label }}</span>
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

      <div ref="listRef" class="elp-list" role="log">
        <p v-if="!rows.length" class="elp-empty">
          <Icon icon="game-icons:telescope" width="30" height="30" />
          <span>{{ query.trim() ? 'Nothing matches that.' : EVENT_GROUP_EMPTY[activeTab] }}</span>
        </p>
        <div
          v-for="event in rows"
          :key="event.id"
          class="elp-row"
          :style="{ '--row-color': typeColor[event.type] }"
        >
          <span class="elp-time">{{ formatEventClock(event.timestamp, true) }}</span>
          <span class="elp-dot" :title="event.type" />
          <span class="elp-msg">{{ event.message }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.elp {
  position: fixed;
  right: 0.75rem;
  /* Die drei Variablen halten das Panel zwischen Header und erhobener
     Bottom-Bar — eigene Pixelzahlen wären eine zweite Quelle für deren Maße. */
  top: calc(var(--header-total-height, 118px) + 8px);
  /* 46px = die Keycap-Leiste plus der temporäre Admin-Knopf, der sich mit
     z-index 9999 darüber stapelt (`.cmd-admin-cd-btn`). Faellt der Knopf weg,
     darf die Zahl wieder auf 14px. */
  bottom: calc(var(--hud-panel-size, 330px) + var(--kb-hud-h, 0px) + 46px);
  width: clamp(520px, 34vw, 780px);
  /* Unter dem Star-Fight-Modal (1000); was darüber aufgeht, schließt es. */
  z-index: 950;
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
  animation: elp-in 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes elp-in {
  from {
    opacity: 0;
    transform: translateX(18px);
  }
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
  gap: 9px;
  flex-shrink: 0;
  height: 40px;
  padding: 0 10px 0 12px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
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

.elp-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
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

/* Zwei Zeilen, nicht eine: fünf Tabs mit Zähler füllen die Panelbreite schon
   allein aus — daneben bliebe dem Feld null Breite. */
.elp-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  padding: 9px 12px;
  background: #16120a;
  border-bottom: 1px solid #3e200a;
}

.elp-tabs {
  display: flex;
  border: 1px solid #5c3310;
  border-radius: 4px;
  overflow: hidden;
}

.elp-tab {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;
  background: #16120a;
  border: none;
  color: #8a6030;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
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

.elp-tab-count {
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
  display: grid;
  grid-template-columns: 64px 8px 1fr;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  padding: 3px 12px;
  /* Die Zeilenhöhe ist bekannt, also kostet alles außerhalb des Scrollfensters
     weder Layout noch Paint — und der Balken springt trotzdem nicht. */
  content-visibility: auto;
  contain-intrinsic-size: 0 24px;
}

.elp-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.018);
}

.elp-row:hover {
  background: rgba(232, 192, 64, 0.05);
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

@media (max-height: 1100px) {
  .elp-head {
    height: 34px;
  }

  .elp-controls {
    padding: 7px 12px;
  }

  .elp-tab {
    padding: 5px 10px;
  }

  .elp-row {
    min-height: 22px;
    contain-intrinsic-size: 0 22px;
  }
}
</style>
