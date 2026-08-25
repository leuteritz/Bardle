<script setup lang="ts">
import { computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import EventLogPanel from './EventLogPanel.vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useEventLog } from '@/composables/ui/useEventLog'
import { onKeybinding } from '@/composables/system/useKeybindings'
import { typeColor } from '@/config/ui/eventLog'
import { formatEventClock } from '@/utils/ui/eventLogFormat'

const uiStore = useUiStore()
const starGroupStore = useStarGroupStore()
const { events, historySize } = useEventLog()

// Diese Komponente bleibt immer montiert — das Panel hängt an v-if, und
// onKeybinding meldet erst beim Unmount ab.
onKeybinding('eventLog', () => uiStore.toggleEventLog())

// Das Panel liegt unter Modalen und Profil-Tabs: verdeckt statt bedienbar wäre
// ein Panel, das noch Fokus fängt.
const covered = computed(
  () => uiStore.bardActiveTab !== null || starGroupStore.starFightModalOpen,
)

watch(covered, (isCovered) => {
  if (isCovered) uiStore.closeEventLog()
})

function toggle() {
  uiStore.toggleEventLog()
}
</script>

<template>
  <div class="event-log-overlay" aria-live="polite" aria-label="Game Events">
    <button
      class="el-bar"
      type="button"
      :aria-expanded="uiStore.isEventLogOpen"
      aria-label="Open the full event log"
      @click="toggle"
    >
      <Icon icon="ph:scroll" width="13" height="13" class="el-bar-mark" />
      <span class="el-bar-label"><span class="el-bar-word">Event </span>Log</span>
      <span class="el-bar-count">{{ historySize }}</span>
      <Icon icon="lucide:chevrons-left-right" width="14" height="14" class="el-bar-open" />
    </button>

    <TransitionGroup name="log-entry" tag="div" class="event-log-inner">
      <div
        v-for="evt in events"
        :key="evt.id"
        class="log-entry"
        :style="{ '--entry-color': typeColor[evt.type] }"
      >
        <span class="log-time">[{{ formatEventClock(evt.timestamp) }}]</span>
        <span class="log-msg">{{ evt.message }}</span>
      </div>
    </TransitionGroup>
  </div>

  <EventLogPanel v-if="uiStore.isEventLogOpen" />
</template>

<style scoped>
.event-log-overlay {
  position: fixed;
  top: 0.45rem;
  right: 0.75rem;
  /* Unter dem Star-Fight-Modal (z-index 1000) — das Log darf den Bosskampf
     nie überlagern */
  z-index: 900;
  /* Breite = freie Spalte rechts neben dem zentrierten Header.
     --header-vp-right (Abstand Header-Rechtskante → Viewport-Rechtskante) wird
     vom Header per ResizeObserver aktuell gehalten; 1.25rem = right-Offset
     (0.75rem) + Gap zum Header (0.5rem), damit die linke Log-Kante nie über
     die Header-Rechtskante hinausragt.
     Floor 150px hält den Log bei untypisch schmalen Guttern nutzbar,
     Cap 500px begrenzt die Zeilenlänge auf Ultrawide-Auflösungen. */
  width: clamp(150px, calc(var(--header-vp-right, 22vw) - 1.25rem), 500px);
  max-height: clamp(280px, 38vh, 520px);
  overflow: hidden;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  container-type: inline-size;
}

/* Der einzige bedienbare Teil der Spur — die Zeilen darunter bleiben
   klickdurchlässig, damit die Bühne dahinter erreichbar ist. */
.el-bar {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  height: 24px;
  margin-bottom: 6px;
  padding: 0 7px;
  background: #1e1006;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #8a6030;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.el-bar:hover {
  background: #2a1c0c;
  color: #e8c040;
}

.el-bar-mark,
.el-bar-open {
  flex-shrink: 0;
}

.el-bar-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.el-bar-count {
  min-width: 22px;
  margin-left: auto;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid #3e200a;
  font-size: 10px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.event-log-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 0;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  min-width: 0;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 7px 12px 7px 10px;
  background: linear-gradient(90deg, rgba(6, 4, 14, 0.92) 0%, rgba(10, 6, 2, 0.86) 100%);
  border-left: 3px solid var(--entry-color, #c8b89a);
  border-top: 1px solid rgba(255, 200, 80, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.42);
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 200, 80, 0.04),
    0 2px 10px rgba(0, 0, 0, 0.6);
  line-height: 1.32;
}

.log-time {
  font-size: clamp(0.7rem, 0.76vw, 0.8rem);
  color: rgba(200, 160, 80, 0.45);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  margin-top: 0.12rem;
  white-space: nowrap;
}

.log-msg {
  font-size: clamp(0.84rem, 0.95vw, 1rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--entry-color, #c8b89a);
  text-shadow:
    0 0 6px color-mix(in oklab, var(--entry-color, #c8b89a) 60%, transparent),
    0 1px 3px rgba(0, 0, 0, 0.8);
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  max-width: 100%;
}

.log-entry-enter-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.log-entry-leave-active {
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
}

.log-entry-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.log-entry-leave-to {
  opacity: 0;
  transform: translateX(12px) scale(0.97);
}

.log-entry-move {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 2560px+: ultra-wide — etwas mehr Abstand zum Rand */
@media (min-width: 2560px) {
  .event-log-overlay {
    right: 1.5rem;
  }
}

/* mobile fallback (below desktop scope) */
@media (max-width: 900px) {
  .event-log-overlay {
    right: 0.5rem;
    /* auf mobile gibt es keine Gutter-Spalte neben dem Header —
       feste Breite statt Gutter-Kopplung */
    width: min(320px, calc(100vw - 1rem));
  }
}

/* ================================================================
   CONTAINER QUERIES — Typografie skaliert mit der TATSÄCHLICHEN
   Log-Breite (der Gutter-Spalte neben dem Header), nicht mit der
   Viewport-Breite. So bleibt der Inhalt auf jeder Desktop-Auflösung
   lesbar, egal wie schmal oder breit die freie Spalte ausfällt.
   ================================================================ */

/* breite Spalte (≥ 380px): komfortable Lesegröße */
@container (min-width: 380px) {
  .log-msg {
    font-size: 0.95rem;
  }

  .log-time {
    font-size: 0.78rem;
  }

  .log-entry {
    padding: 8px 14px 8px 11px;
  }
}

/* mittlere Spalte (261–299px): leicht reduziert */
@container (max-width: 300px) {
  .log-msg {
    font-size: 0.8rem;
  }

  .log-time {
    font-size: 0.66rem;
  }

  .log-entry {
    padding: 6px 10px 6px 8px;
    gap: 6px;
  }
}

/* schmale Spalte (≤ 240px): kompakt — das Wort „Event" fällt zuerst */
@container (max-width: 240px) {
  .log-entry {
    padding: 4px 7px 4px 6px;
    gap: 5px;
  }

  .log-msg {
    font-size: 0.7rem;
  }

  .log-time {
    font-size: 0.58rem;
  }

  .el-bar-word {
    display: none;
  }
}

@container (max-width: 175px) {
  /* sehr schmale Spalte: Zeitstempel opfern, Nachricht hat Vorrang */
  .log-time {
    display: none;
  }

  .log-msg {
    font-size: 0.64rem;
  }

  .el-bar-label,
  .el-bar-open {
    display: none;
  }
}
</style>
