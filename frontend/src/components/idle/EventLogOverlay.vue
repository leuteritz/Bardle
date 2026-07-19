<script setup lang="ts">
import { useEventLog } from '@/composables/useEventLog'
import { typeColor } from '@/config/eventLogTypes'

const { events } = useEventLog()
</script>

<template>
  <div class="event-log-overlay" aria-live="polite" aria-label="Game Events">
    <TransitionGroup name="log-entry" tag="div" class="event-log-inner">
      <div
        v-for="evt in events"
        :key="evt.id"
        class="log-entry"
        :style="{ '--entry-color': typeColor[evt.type] }"
      >
        <span class="log-time">[{{ evt.timeString }}]</span>
        <span class="log-msg">{{ evt.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.event-log-overlay {
  position: fixed;
  top: 0.45rem;
  right: 0.75rem;
  z-index: 9998;
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

.event-log-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 0;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  min-width: 0;
  max-height: 100%;
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

/* schmale Spalte (≤ 240px): kompakt */
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
}

@container (max-width: 175px) {
  /* sehr schmale Spalte: Zeitstempel opfern, Nachricht hat Vorrang */
  .log-time {
    display: none;
  }

  .log-msg {
    font-size: 0.64rem;
  }
}
</style>
