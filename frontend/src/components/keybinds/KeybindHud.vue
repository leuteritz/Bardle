<template>
  <!-- Der Eckblock unten links: Zeile 1 die Keycaps, Zeile 2 die Signatur, die
       App.vue in den Slot reicht. EIN Anker über der Minimap — die Nachbarn
       (Admin-Knopf, Zeitraffer-Pille) stapeln sich über die gemessene Höhe. -->
  <div ref="hudEl" class="kb-hud" aria-label="Keyboard shortcuts">
    <div class="kb-hud__row" :class="{ 'kb-hud__row--in': revealed }">
      <!-- Der Griff öffnet die vollständige Übersicht; die Keycaps daneben lösen
           ihr Kürzel direkt aus, damit die Leiste auch mit der Maus bedienbar
           bleibt. Deshalb NICHT ein Button um alles herum. -->
      <button
        type="button"
        class="kb-hud__handle"
        :aria-label="`Show all shortcuts (${controlsCap})`"
        @click="openControls"
      >
        <Icon icon="lucide:keyboard" width="16" height="16" aria-hidden="true" />
        <span class="kb-hud__handle-cap">{{ controlsCap }}</span>
      </button>

      <span class="kb-hud__rule" aria-hidden="true" />

      <KeybindChip
        v-for="bind in hudBindings"
        :id="bind.id"
        :key="bind.id"
        :label="labelFor(bind)"
        :lit="isActive(bind.id)"
      />
    </div>

    <div class="kb-hud__sig">
      <slot name="sig" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import KeybindChip from './KeybindChip.vue'
import { useGamePause } from '@/composables/system/useGamePause'
import { useUiStore } from '@/stores/core/uiStore'
import { KEYBINDINGS, KEYBIND_HUD_REVEAL_MS, KEYBIND_RESUME_LABEL } from '@/config/constants'
import type { KeybindDef, KeybindId } from '@/types'
import { invalidateHudField } from '@/utils/ui/hudField'

const uiStore = useUiStore()
const { isPaused } = useGamePause()

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

// Die Leiste fährt erst herein, wenn der Spieler angekommen ist — beim Laden
// liegt ohnehin die Rollenwahl über dem Spiel.
const revealed = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Der Block belegt die Ankerlinie über der Minimap. Wer sonst noch dort sitzt,
 * stapelt sich über ihm — dafür veröffentlicht er seine gemessene Höhe als
 * CSS-Variable, statt dass die andere Stelle eine Zahl raten müsste. Fällt er
 * weg, greift der Default 0px und der Anker liegt wieder wie zuvor.
 */
const hudEl = ref<HTMLElement | null>(null)
let sizeObserver: ResizeObserver | null = null

/**
 * Höhe UND Reichweite. Der Block ist breiter als das Panel, über dem er sitzt
 * (gemessen ~385 px gegen 290 auf Full HD) — ohne die zweite Zahl endet die
 * Panel-Zone der Kontur an der Panelbreite und der Streifen daneben meldet
 * freies Feld, in dem die Keycaps stehen. Gemessen von der LINKEN Bildkante.
 */
function publishBox() {
  const el = hudEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const root = document.documentElement.style
  root.setProperty('--kb-hud-h', `${Math.round(r.height)}px`)
  root.setProperty('--kb-hud-reach', `${Math.round(Math.max(0, r.right))}px`)
  // Die Reichweite hängt am Inhalt, nicht am Viewport — der Cache-Schlüssel der
  // Kontur sähe eine Änderung sonst nicht.
  invalidateHudField()
}

onMounted(() => {
  revealTimer = setTimeout(() => {
    revealed.value = true
    revealTimer = null
  }, KEYBIND_HUD_REVEAL_MS)

  if (hudEl.value) {
    publishBox()
    // Gemessen wird die Randbox, nicht contentRect: Innenabstand und Rahmen
    // gehören zur Höhe, an der sich die Nachbarn ausrichten.
    sizeObserver = new ResizeObserver(publishBox)
    sizeObserver.observe(hudEl.value)
    window.addEventListener('resize', publishBox)
  }
})

onUnmounted(() => {
  if (revealTimer !== null) clearTimeout(revealTimer)
  sizeObserver?.disconnect()
  window.removeEventListener('resize', publishBox)
  document.documentElement.style.removeProperty('--kb-hud-h')
  document.documentElement.style.removeProperty('--kb-hud-reach')
  invalidateHudField()
})

function openControls() {
  uiStore.toggleControls()
}
</script>

<style scoped>
/* Unten links über der Minimap, ohne Kasten und Rahmen: ein zweiter gerahmter
   Block direkt über der Bar-Silhouette hätte wie ein weiteres Panel gelesen.
   Der Chip selbst steht in `KeybindChip.vue` — dieselbe Darstellung trägt die
   Kürzel-Zeile unten links im Forge-Graphen.

   z-index 45 wie Musik-Widget und Enzyklopädie-Reiter: jedes Modal legt sich
   darüber, ohne dass der Block sie einzeln kennen muss. */
.kb-hud {
  position: fixed;
  bottom: calc(var(--hud-panel-size, 330px) + 8px);
  left: 0.75rem;
  z-index: 45;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  user-select: none;
}

/* Nur die Keycap-Zeile fährt ein und tritt beim Darüberfahren nach vorn;
   die Signatur darunter steht immer. */
.kb-hud__row {
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 300ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.kb-hud__row--in {
  opacity: 0.62;
  transform: translateY(0);
}
.kb-hud__row--in:hover {
  opacity: 1;
}

/* Signatur und FPS auf EINER Grundlinie und in EINER Größe, ganz gleich wie
   der clamp() bei welcher Auflösung ausfällt. */
.kb-hud__sig {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  pointer-events: none;
  font-size: clamp(0.72rem, 0.9vw, 1rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* ── Griff: öffnet die Übersicht ──────────────────────── */
.kb-hud__handle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  background: transparent;
  border: none;
  color: #8a7a52;
  cursor: pointer;
  transition: color 140ms ease;
}
.kb-hud__handle:hover {
  color: #e8c040;
}
.kb-hud__handle-cap {
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
}

.kb-hud__rule {
  width: 1px;
  height: 14px;
  background: rgba(122, 78, 32, 0.6);
}

/* Full HD ist der flachste Viewport — dort rückt die Zeile enger zusammen
   (der Schriftgrad der Chips gibt in `KeybindChip.vue` nach). */
@media (max-height: 1100px) {
  .kb-hud__row {
    gap: 8px;
  }
}
</style>
