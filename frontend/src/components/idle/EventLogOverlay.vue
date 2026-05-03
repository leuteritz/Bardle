<script setup lang="ts">
import { ref } from 'vue'
import { useEventLog } from '@/composables/useEventLog'
import { typeIcon, typeColor } from '@/config/eventLogTypes'

const { events } = useEventLog()
const isLogVisible = ref(true)
</script>

<template>
  <div class="event-log-overlay" aria-live="polite" aria-label="Spielereignisse">
    <button class="log-toggle-btn" @click="isLogVisible = !isLogVisible">
      📜 {{ isLogVisible ? 'Log verbergen' : 'Log anzeigen' }}
    </button>
    <TransitionGroup v-show="isLogVisible" name="log-entry" tag="div" class="event-log-inner">
      <div
        v-for="evt in events"
        :key="evt.id"
        class="log-entry"
        :style="{ '--entry-color': typeColor[evt.type] }"
      >
        <span class="log-time">[{{ evt.timeString }}]</span>
        <span class="log-icon">{{ typeIcon[evt.type] ?? '📜' }}</span>
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
  width: clamp(300px, 26vw, 420px);
  max-height: 320px;
  overflow: hidden;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.log-toggle-btn {
  pointer-events: auto;
  padding: 3px 10px;
  background: rgba(10, 7, 2, 0.9);
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(200, 160, 80, 0.75);
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}
.log-toggle-btn:hover {
  border-color: #c89040;
  color: #e8c040;
}

.event-log-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 0;
  overflow: hidden;
  width: 100%;
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
  font-family: 'Cinzel', 'Palatino Linotype', serif;
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

.log-icon {
  font-size: clamp(0.95rem, 1vw, 1.08rem);
  flex-shrink: 0;
  line-height: 1.1;
  margin-top: 0.08rem;
  filter: drop-shadow(0 0 3px var(--entry-color, #c8b89a));
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

@media (max-width: 900px) {
  .event-log-overlay {
    top: 0.6rem;
    right: 0.5rem;
    width: min(320px, calc(100vw - 1rem));
    max-height: 280px;
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
