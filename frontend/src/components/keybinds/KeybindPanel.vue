<template>
  <Teleport to="body">
    <Transition name="kb-panel-fade">
      <div
        v-if="uiStore.isControlsOpen"
        class="kb-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Controls"
        @click.self="uiStore.closeControls()"
      >
        <div class="kb-panel">
          <div class="kb-panel__gold" aria-hidden="true" />

          <header class="kb-panel__header">
            <Icon icon="lucide:keyboard" width="24" height="24" class="kb-panel__header-icon" aria-hidden="true" />
            <h2 class="kb-panel__title">Controls</h2>
            <span class="kb-panel__count">{{ KEYBINDINGS.length }} shortcuts</span>
            <button
              type="button"
              class="kb-panel__close"
              aria-label="Close controls"
              @click="uiStore.closeControls()"
            >
              <Icon icon="lucide:x" width="18" height="18" aria-hidden="true" />
            </button>
          </header>

          <div class="kb-panel__body">
            <section v-for="group in groups" :key="group.category.id" class="kb-group">
              <div class="kb-group__head">
                <Icon
                  :icon="group.category.icon"
                  width="16"
                  height="16"
                  class="kb-group__icon"
                  aria-hidden="true"
                />
                <span class="kb-group__label">{{ group.category.label }}</span>
                <span class="kb-group__rule" aria-hidden="true" />
              </div>

              <button
                v-for="bind in group.binds"
                :key="bind.id"
                type="button"
                class="kb-row"
                :class="{ 'kb-row--active': isActive(bind.id) }"
                @click="run(bind.id)"
              >
                <KeyCap
                  :cap="bind.cap"
                  size="lg"
                  :pressed="flashing === bind.id"
                  :lit="isActive(bind.id)"
                />
                <span class="kb-row__text">
                  <span class="kb-row__title">
                    <Icon :icon="bind.icon" width="16" height="16" class="kb-row__icon" aria-hidden="true" />
                    {{ bind.label }}
                    <span v-if="isActive(bind.id)" class="kb-row__state">active</span>
                  </span>
                  <span class="kb-row__desc">{{ bind.description }}</span>
                </span>
              </button>
            </section>
          </div>

          <footer class="kb-panel__footer">
            Shortcuts work anywhere in the game — except while you are typing.
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import KeyCap from './KeyCap.vue'
import { onKeybinding, triggerKeybind, useKeybindings } from '@/composables/system/useKeybindings'
import { useGamePause } from '@/composables/system/useGamePause'
import { useUiStore } from '@/stores/core/uiStore'
import { KEYBINDINGS, KEYBIND_CATEGORIES, KEYBIND_FLASH_MS } from '@/config/constants'
import type { KeybindId } from '@/types'

const uiStore = useUiStore()
const { isPaused } = useGamePause()
const { lastTriggered } = useKeybindings()

// Die Komponente bleibt immer montiert (nur der Inhalt hängt an v-if), damit
// dieses Kürzel auch bei geschlossenem Panel greift.
onKeybinding('controls', () => uiStore.toggleControls())

/** Leere Kategorien fallen raus — die Registry gibt die Reihenfolge vor. */
const groups = computed(() =>
  KEYBIND_CATEGORIES.map((category) => ({
    category,
    binds: KEYBINDINGS.filter((b) => b.category === category.id),
  })).filter((g) => g.binds.length > 0),
)

function isActive(id: KeybindId): boolean {
  return id === 'pause' && isPaused.value
}

function run(id: KeybindId) {
  triggerKeybind(id)
}

const flashing = ref<KeybindId | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null

watch(lastTriggered, (hit) => {
  if (!hit) return
  flashing.value = hit.id
  if (flashTimer !== null) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashing.value = null
    flashTimer = null
  }, KEYBIND_FLASH_MS)
})

// Escape schließt — bewusst kein Registry-Eintrag: die Taste schließt in
// diesem Spiel jedes Overlay und gehört keinem einzelnen Kürzel.
function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') uiStore.closeControls()
}

watch(
  () => uiStore.isControlsOpen,
  (open) => {
    if (open) window.addEventListener('keydown', onEscape)
    else window.removeEventListener('keydown', onEscape)
  },
)

onUnmounted(() => {
  window.removeEventListener('keydown', onEscape)
  if (flashTimer !== null) clearTimeout(flashTimer)
})
</script>

<style scoped>
/* Über dem Pause-Overlay (9998), unter der Bottom-Bar (10000): die Übersicht
   ist auch im pausierten Spiel erreichbar. Flache Abdunklung statt
   backdrop-filter. */
.kb-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(6, 4, 0, 0.86);
}

.kb-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(680px, 92vw);
  max-height: min(74vh, 760px);
  overflow: hidden;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 25px 60px rgba(0, 0, 0, 0.95);
}

.kb-panel__gold {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* ── Header ───────────────────────────────────────────── */
.kb-panel__header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 12px 14px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}
.kb-panel__header-icon {
  color: #e8c040;
}
.kb-panel__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f4e2a0;
}
.kb-panel__count {
  margin-left: auto;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.5);
}
.kb-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #141410;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #cbb98a;
  cursor: pointer;
  transition:
    color 140ms ease,
    border-color 140ms ease;
}
.kb-panel__close:hover {
  color: #cc6050;
  border-color: #cc6050;
}

/* ── Body ─────────────────────────────────────────────── */
.kb-panel__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 14px;
  background: #1a1008;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.kb-group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.kb-group__icon {
  color: #c89040;
}
.kb-group__label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(232, 216, 176, 0.75);
}
.kb-group__rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, #5c3310, transparent);
}

/* ── Zeile ────────────────────────────────────────────── */
.kb-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 11px 12px;
  text-align: left;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease;
}
.kb-row + .kb-row {
  margin-top: 7px;
}
.kb-row:hover {
  background: #221f18;
  border-color: #7a4e20;
}
.kb-row--active {
  border-color: #c89040;
}

.kb-row__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.kb-row__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.06em;
  color: #ece0c0;
}
.kb-row__icon {
  color: #c89040;
  flex-shrink: 0;
}
.kb-row__state {
  padding: 2px 6px;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #111008;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
}
.kb-row__desc {
  font-size: 0.82rem;
  line-height: 1.45;
  color: rgba(216, 200, 160, 0.62);
}

/* ── Footer ───────────────────────────────────────────── */
.kb-panel__footer {
  flex-shrink: 0;
  padding: 10px 14px;
  background: #1e1006;
  border-top: 2px solid #5c3310;
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  color: rgba(216, 200, 160, 0.5);
  text-align: center;
}

/* ── Transition ───────────────────────────────────────── */
.kb-panel-fade-enter-active,
.kb-panel-fade-leave-active {
  transition: opacity 200ms ease;
}
.kb-panel-fade-enter-active .kb-panel,
.kb-panel-fade-leave-active .kb-panel {
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}
.kb-panel-fade-enter-from,
.kb-panel-fade-leave-to {
  opacity: 0;
}
.kb-panel-fade-enter-from .kb-panel,
.kb-panel-fade-leave-to .kb-panel {
  transform: translateY(14px) scale(0.98);
}
</style>
