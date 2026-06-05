<script setup lang="ts">
import { ref } from 'vue'
import { useEventLog } from '@/composables/useEventLog'
import { typeColor } from '@/config/eventLogTypes'

const { events } = useEventLog()
const isLogVisible = ref(true)
</script>

<template>
  <div class="event-log-overlay" aria-live="polite" aria-label="Spielereignisse">
    <button
      class="log-toggle-btn"
      @click="isLogVisible = !isLogVisible"
      :aria-label="isLogVisible ? 'Collapse log' : 'Expand log'"
    >
      <svg
        class="chevron-icon"
        :class="{ 'is-expanded': isLogVisible }"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline
          points="2,4 7,10 12,4"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <TransitionGroup v-show="isLogVisible" name="log-entry" tag="div" class="event-log-inner">
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
  width: clamp(260px, 19vw, 340px);
  max-height: clamp(280px, 38vh, 520px);
  overflow: hidden;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.log-toggle-btn {
  pointer-events: auto;
  padding: 5px 8px;
  line-height: 0;
  background: rgba(10, 7, 2, 0.9);
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(200, 160, 80, 0.75);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}
.log-toggle-btn:hover {
  border-color: #c89040;
  color: #e8c040;
}

.chevron-icon {
  display: block;
  transition: transform 0.2s ease;
}
.chevron-icon.is-expanded {
  transform: rotate(180deg);
}

.event-log-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 0;
  overflow-y: auto;
  width: 100%;
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
  border-radius: 8px;
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

/* ≤ 1024px: most compact — narrowest column, smallest text */
@media (max-width: 1024px) {
  .event-log-overlay {
    width: clamp(130px, 14vw, 170px);
    right: 0.4rem;
  }

  .log-toggle-btn {
    padding: 3px 6px;
  }

  .log-entry {
    padding: 3px 6px 3px 5px;
    gap: 4px;
  }

  .log-msg {
    font-size: clamp(0.58rem, 0.62vw, 0.68rem);
  }

  .log-time {
    font-size: clamp(0.48rem, 0.52vw, 0.58rem);
  }
}

/* 1024–1279px: compact mode */
@media (max-width: 1279px) {
  .event-log-overlay {
    width: clamp(180px, 17vw, 240px);
    right: 0.5rem;
  }

  .log-entry {
    padding: 5px 8px 5px 7px;
    gap: 5px;
  }

  .log-msg {
    font-size: clamp(0.65rem, 0.7vw, 0.78rem);
  }

  .log-time {
    font-size: clamp(0.55rem, 0.6vw, 0.68rem);
  }
}

/* 1280–1439px: medium mode */
@media (min-width: 1280px) and (max-width: 1439px) {
  .event-log-overlay {
    width: clamp(220px, 18vw, 280px);
  }

  .log-msg {
    font-size: clamp(0.72rem, 0.8vw, 0.86rem);
  }

  .log-time {
    font-size: clamp(0.62rem, 0.68vw, 0.74rem);
  }
}

/* 1440–1919px: standard mode (base styles apply, explicit for clarity) */
@media (min-width: 1440px) and (max-width: 1919px) {
  .event-log-overlay {
    width: clamp(260px, 19vw, 340px);
  }

  .log-msg {
    font-size: clamp(0.78rem, 0.85vw, 0.92rem);
  }

  .log-time {
    font-size: clamp(0.66rem, 0.72vw, 0.78rem);
  }
}

/* 1920px+: full display */
@media (min-width: 1920px) {
  .event-log-overlay {
    width: clamp(180px, 12.5vw, 240px);
  }

  .log-msg {
    font-size: clamp(0.84rem, 0.95vw, 1rem);
  }

  .log-time {
    font-size: clamp(0.7rem, 0.76vw, 0.8rem);
  }
}

/* 2560px+: ultra-wide */
@media (min-width: 2560px) {
  .event-log-overlay {
    right: 1.5rem;
    width: clamp(300px, 20vw, 520px);
  }

  .log-msg {
    font-size: clamp(0.95rem, 0.9vw, 1.1rem);
  }
}

/* mobile fallback (below desktop scope) */
@media (max-width: 900px) {
  .event-log-overlay {
    right: 0.5rem;
    width: min(320px, calc(100vw - 1rem));
  }

  .log-entry {
    padding: 6px 10px 6px 8px;
    gap: 6px;
  }

  .log-msg {
    font-size: clamp(0.8rem, 1vw, 0.92rem);
  }
}
</style>
