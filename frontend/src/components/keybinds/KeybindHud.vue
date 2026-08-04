<template>
  <div ref="hudEl" class="kb-hud" :class="{ 'kb-hud--in': revealed }" aria-label="Keyboard shortcuts">
    <!-- Der Griff öffnet die vollständige Übersicht; die Keycaps daneben lösen
         ihr Kürzel direkt aus, damit die Leiste auch mit der Maus bedienbar
         bleibt. Deshalb NICHT ein Button um alles herum. -->
    <button
      type="button"
      class="kb-hud__handle"
      :aria-label="`Show all shortcuts (${controlsCap})`"
      @click="openControls"
    >
      <Icon icon="lucide:keyboard" width="18" height="18" aria-hidden="true" />
      <span class="kb-hud__handle-cap">{{ controlsCap }}</span>
    </button>

    <span class="kb-hud__rule" aria-hidden="true" />

    <button
      v-for="bind in hudBindings"
      :key="bind.id"
      type="button"
      class="kb-chip"
      :class="{ 'kb-chip--active': isActive(bind.id) }"
      :aria-label="`${labelFor(bind)} (${bind.cap})`"
      @click="triggerKeybind(bind.id)"
    >
      <KeyCap :cap="bind.cap" size="md" :pressed="flashing === bind.id" :lit="isActive(bind.id)" />
      <span class="kb-chip__label">{{ labelFor(bind) }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import KeyCap from './KeyCap.vue'
import { useKeybindings, triggerKeybind } from '@/composables/useKeybindings'
import { useGamePause } from '@/composables/useGamePause'
import { useUiStore } from '@/stores/uiStore'
import {
  KEYBINDINGS,
  KEYBIND_FLASH_MS,
  KEYBIND_HUD_REVEAL_MS,
  KEYBIND_RESUME_LABEL,
} from '@/config/constants'
import type { KeybindDef, KeybindId } from '@/types'

const uiStore = useUiStore()
const { isPaused } = useGamePause()
const { lastTriggered } = useKeybindings()

const hudBindings = computed(() => KEYBINDINGS.filter((b) => b.inHud))
const controlsCap = computed(() => KEYBINDINGS.find((b) => b.id === 'controls')?.cap ?? '?')

/**
 * Zustand einer Keycap: die Pause-Taste leuchtet, solange das Spiel steht —
 * gleich ob per Taste oder durch ein Fenster ohne Fokus.
 */
function isActive(id: KeybindId): boolean {
  return id === 'pause' && isPaused.value
}

function labelFor(bind: KeybindDef): string {
  return bind.id === 'pause' && isPaused.value ? KEYBIND_RESUME_LABEL : bind.label
}

// Ausgelöstes Kürzel lässt seine Keycap kurz einsinken — dieselbe Rückmeldung
// für Tastendruck und Mausklick, weil beide über triggerKeybind laufen.
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

// Die Leiste fährt erst herein, wenn der Spieler angekommen ist — beim Laden
// liegt ohnehin die Rollenwahl über dem Spiel.
const revealed = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Die Leiste belegt die Ankerlinie über dem Command Panel (dieselbe Höhe wie
 * die Signatur-Zeile links). Wer sonst noch dort sitzt, stapelt sich über ihr —
 * dafür veröffentlicht sie ihre gemessene Höhe als CSS-Variable, statt dass die
 * andere Stelle eine Zahl raten müsste. Fällt die Leiste weg, greift der
 * Default 0px und der Anker liegt wieder wie zuvor.
 */
const hudEl = ref<HTMLElement | null>(null)
let sizeObserver: ResizeObserver | null = null

function publishHeight(px: number) {
  document.documentElement.style.setProperty('--kb-hud-h', `${Math.round(px)}px`)
}

onMounted(() => {
  revealTimer = setTimeout(() => {
    revealed.value = true
    revealTimer = null
  }, KEYBIND_HUD_REVEAL_MS)

  if (hudEl.value) {
    publishHeight(hudEl.value.getBoundingClientRect().height)
    // Gemessen wird die Randbox, nicht contentRect: Innenabstand und Rahmen
    // gehören zur Höhe, an der sich die Nachbarn ausrichten.
    sizeObserver = new ResizeObserver(() => {
      if (hudEl.value) publishHeight(hudEl.value.getBoundingClientRect().height)
    })
    sizeObserver.observe(hudEl.value)
  }
})

onUnmounted(() => {
  if (flashTimer !== null) clearTimeout(flashTimer)
  if (revealTimer !== null) clearTimeout(revealTimer)
  sizeObserver?.disconnect()
  document.documentElement.style.removeProperty('--kb-hud-h')
})

function openControls() {
  uiStore.toggleControls()
}
</script>

<style scoped>
/* Spiegelbild der Signatur-Zeile unten links: gleiche Höhe über dem
   Bottom-Bar-Panel, gleicher Randabstand — die beiden Ecken tragen damit
   dasselbe Gewicht. z-index 45 wie Musik-Widget und Enzyklopädie-Reiter:
   jedes Modal legt sich darüber, ohne dass die Leiste sie einzeln kennen muss. */
.kb-hud {
  position: fixed;
  bottom: calc(var(--hud-panel-size, 330px) + 8px);
  right: 0.75rem;
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 8px 10px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 5px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  user-select: none;
  /* Einfahren: nur transform/opacity, kein Layout */
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 420ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.kb-hud--in {
  opacity: 1;
  transform: translateY(0);
}

/* Goldlinie an der Oberkante — dasselbe Zeichen wie an jedem Modal, nur
   schmaler, damit die Leiste als Teil derselben Oberfläche liest. */
.kb-hud::before {
  content: '';
  position: absolute;
  top: 0;
  left: 6px;
  right: 6px;
  height: 2px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #c89040, #5c3310);
  pointer-events: none;
}

/* ── Griff: öffnet die Übersicht ──────────────────────── */
.kb-hud__handle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #9a8656;
  cursor: pointer;
  transition:
    color 140ms ease,
    border-color 140ms ease;
}
.kb-hud__handle:hover {
  color: #e8c040;
  border-color: #5c3310;
}
.kb-hud__handle-cap {
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1;
}

.kb-hud__rule {
  width: 1px;
  align-self: stretch;
  background: #3e200a;
}

/* ── Kürzel-Chip ──────────────────────────────────────── */
.kb-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
.kb-chip:hover {
  transform: translateY(-1px);
}
.kb-chip__label {
  font-size: 1.06rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  color: #cbb98a;
  white-space: nowrap;
  transition: color 160ms ease;
}
.kb-chip:hover .kb-chip__label,
.kb-chip--active .kb-chip__label {
  color: #e8c040;
}

/* Full HD ist der flachste Viewport — dort rückt die Leiste enger zusammen,
   bleibt aber lesbar (nur Innenabstände und Schriftgrad geben nach). */
@media (max-height: 1100px) {
  .kb-hud {
    gap: 7px;
    padding: 6px 10px 6px 8px;
  }
  .kb-chip__label {
    font-size: 0.96rem;
  }
}
</style>
